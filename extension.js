import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { fileURLToPath } from "url";

import { exec } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nodeFilePaths = new Map();
let activeLayouticaDir = null;
let activePanel = null;

function getNodePath(workspacePath, node) {
  let filename = node.name;
  const extSuffix = `.${node.extension}`;
  if (!filename.endsWith(extSuffix)) {
    filename = filename + extSuffix;
  }
  const nodeDir = node.path ? path.resolve(workspacePath, node.path) : workspacePath;
  return path.join(nodeDir, filename);
}

function parseHeaderComments(content) {
  const lines = content.split("\n");
  let description = "";
  let imports = [];
  let exports = [];

  for (const line of lines) {
    if (line.trim().startsWith("// Description:")) {
      description = line.substring(line.indexOf("// Description:") + "// Description:".length).trim();
    } else if (line.trim().startsWith("// Imports:")) {
      const parts = line.substring(line.indexOf("// Imports:") + "// Imports:".length).trim();
      if (parts) {
        imports = parts.split(",").map(p => p.trim()).filter(Boolean);
      }
    } else if (line.trim().startsWith("// Exports:")) {
      const parts = line.substring(line.indexOf("// Exports:") + "// Exports:".length).trim();
      if (parts) {
        exports = parts.split(",").map(p => p.trim()).filter(Boolean);
      }
    }
  }

  return { description, imports, exports };
}

function scanDirectoryForNodes(dirPath, workspacePath, existingPaths) {
  let results = [];
  let entries = [];
  try {
    if (!fs.existsSync(dirPath)) return results;
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (err) {
    console.error("[Layoutica Host] Failed to read directory for scanning:", dirPath, err);
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === "dist" ||
        entry.name === "build" ||
        entry.name === "out" ||
        entry.name === "public" ||
        entry.name === "app"
      ) {
        continue;
      }
      results = results.concat(scanDirectoryForNodes(fullPath, workspacePath, existingPaths));
    } else {
      if (dirPath === workspacePath) {
        continue;
      }
      if (
        entry.name === "package.json" ||
        entry.name === "package-lock.json" ||
        entry.name === "tsconfig.json" ||
        entry.name === "tsconfig.tsbuildinfo" ||
        entry.name === "vite.config.ts" ||
        entry.name === "next.config.js" ||
        entry.name === "next.config.mjs" ||
        entry.name === "postcss.config.js" ||
        entry.name === "postcss.config.mjs" ||
        entry.name === "eslint.config.js" ||
        entry.name === "eslint.config.mjs" ||
        entry.name === "tailwind.config.js" ||
        entry.name === "tailwind.config.ts" ||
        entry.name === "index.html" ||
        entry.name === "README.md" ||
        entry.name === "extension.js" ||
        entry.name === "main.tsx" ||
        entry.name === "vite-env.d.ts"
      ) {
        continue;
      }

      const ext = path.extname(entry.name).slice(1);
      if (!["ts", "tsx", "js", "jsx", "css", "json", "md"].includes(ext)) {
        continue;
      }

      const relativeFilePath = path.relative(workspacePath, fullPath).replace(/\\/g, "/");
      const relativeDirPath = path.dirname(relativeFilePath).replace(/\\/g, "/");
      
      const cleanDirPath = relativeDirPath === "." ? "" : relativeDirPath;
      const baseName = path.basename(entry.name, `.${ext}`);

      const normalizedPath = path.resolve(fullPath);
      if (!existingPaths.has(normalizedPath)) {
        results.push({
          fullPath,
          name: baseName,
          extension: ext,
          path: cleanDirPath,
        });
      }
    }
  }

  return results;
}

function synchronizePhysicalFilesWithNodes(targetWorkspaceDir, nodes, layouticaDir, connections) {
  let nodesChanged = false;
  const activeNodes = [];
  const missingNodes = [];
  const currentConnections = [...connections];

  // Separate nodes into active and missing
  for (const node of nodes) {
    const resolvedPath = getNodePath(targetWorkspaceDir, node);
    if (fs.existsSync(resolvedPath)) {
      activeNodes.push(node);
      nodeFilePaths.set(node.id, resolvedPath);
    } else {
      missingNodes.push(node);
    }
  }

  // Gather all unmapped physical files on disk
  const activePaths = new Set();
  activeNodes.forEach(n => {
    activePaths.add(path.resolve(getNodePath(targetWorkspaceDir, n)));
  });
  const unmappedFiles = scanDirectoryForNodes(targetWorkspaceDir, targetWorkspaceDir, activePaths);

  // Match missing nodes with unmapped files (by name + extension)
  const matchedNodeIds = new Set();
  const matchedFilePaths = new Set();

  for (const missingNode of missingNodes) {
    const matchingFileIndex = unmappedFiles.findIndex(
      f => f.name === missingNode.name && f.extension === missingNode.extension && !matchedFilePaths.has(f.fullPath)
    );

    if (matchingFileIndex !== -1) {
      const matchedFile = unmappedFiles[matchingFileIndex];
      // Update path of existing node to its new moved path
      missingNode.path = matchedFile.path;
      activeNodes.push(missingNode);
      nodeFilePaths.set(missingNode.id, matchedFile.fullPath);
      matchedNodeIds.add(missingNode.id);
      matchedFilePaths.add(matchedFile.fullPath);
      nodesChanged = true;
      console.log(`[Layoutica Host] Detected manually moved file: ${missingNode.name}.${missingNode.extension} moved to ${matchedFile.path}`);
    }
  }

  // Remove actual deleted nodes (those that were missing and not matched)
  for (const missingNode of missingNodes) {
    if (matchedNodeIds.has(missingNode.id)) {
      continue;
    }
    console.log(`[Layoutica Host] Physical file for node ${missingNode.name} not found. Removing node.`);
    nodesChanged = true;
    nodeFilePaths.delete(missingNode.id);
    for (let i = currentConnections.length - 1; i >= 0; i--) {
      if (currentConnections[i].sourceId === missingNode.id || currentConnections[i].targetId === missingNode.id) {
        currentConnections.splice(i, 1);
      }
    }
  }

  // Register brand new nodes for remaining unmatched files
  for (const scanned of unmappedFiles) {
    if (matchedFilePaths.has(scanned.fullPath)) {
      continue;
    }

    let description = "";
    let imports = [];
    let exports = [];
    try {
      const content = fs.readFileSync(scanned.fullPath, "utf8");
      const parsed = parseHeaderComments(content);
      description = parsed.description;
      imports = parsed.imports;
      exports = parsed.exports;
    } catch (err) {
      console.error("[Layoutica Host] Failed to read manually created file:", scanned.fullPath, err);
    }

    const id = `node-${Math.random().toString(36).substr(2, 9)}`;
    const newNode = {
      id,
      name: scanned.name,
      extension: scanned.extension,
      path: scanned.path,
      description: description || "",
      x: 100 + Math.floor(Math.random() * 200),
      y: 100 + Math.floor(Math.random() * 200),
      isExpanded: false
    };

    activeNodes.push(newNode);
    nodeFilePaths.set(id, scanned.fullPath);
    nodesChanged = true;
    console.log(`[Layoutica Host] Registered new physical file: ${scanned.path}/${scanned.name}.${scanned.extension}`);
  }

  // Assign the finalized nodes to currentNodes for writing
  const currentNodes = activeNodes;

  if (!nodesChanged) {
    return { nodesChanged: false, updatedNodes: nodes, updatedConnections: connections };
  }

  const layoutJsonPath = path.join(layouticaDir, "layout.json");
  if (fs.existsSync(layoutJsonPath)) {
    try {
      const data = fs.readFileSync(layoutJsonPath, "utf8");
      const parsed = JSON.parse(data);
      parsed.nodes = currentNodes;
      parsed.connections = currentConnections;
      fs.writeFileSync(layoutJsonPath, JSON.stringify(parsed, null, 2), "utf8");
    } catch (err) {
      console.error("[Layoutica Host] Failed to auto-save synced nodes to layout.json:", err);
    }
  } else {
    try {
      const dir = path.dirname(layoutJsonPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(layoutJsonPath, JSON.stringify({
        nodes: currentNodes,
        connections: currentConnections,
        pinnedNodes: [],
        activeGhostNodes: []
      }, null, 2), "utf8");
    } catch (err) {
      console.error("[Layoutica Host] Failed to initialize layout.json:", err);
    }
  }

  const packageJsonPath = path.join(targetWorkspaceDir, "package.json");
  if (!isInitializingNextApp && fs.existsSync(packageJsonPath)) {
    const nodesWithConnections = currentNodes.map(node => {
      const nodeImports = currentConnections
        .filter(c => c.targetId === node.id)
        .map(c => {
          const source = currentNodes.find(n => n.id === c.sourceId);
          return source ? `/${source.path ? source.path + '/' : ''}${source.name}.${source.extension}` : null;
        }).filter(Boolean);
        
      const nodeExports = currentConnections
        .filter(c => c.sourceId === node.id)
        .map(c => {
          const target = currentNodes.find(n => n.id === c.targetId);
          return target ? `/${target.path ? target.path + '/' : ''}${target.name}.${target.extension}` : null;
        }).filter(Boolean);

      return {
        ...node,
        imports: nodeImports,
        exports: nodeExports
      };
    });
    syncBackendFiles(targetWorkspaceDir, nodesWithConnections);
  }

  return { nodesChanged: true, updatedNodes: currentNodes, updatedConnections: currentConnections };
}

function removeEmptyDirs(dirPath, workspacePath) {
  if (dirPath === workspacePath || !dirPath.startsWith(workspacePath)) return;
  try {
    if (fs.existsSync(dirPath)) {
      const children = fs.readdirSync(dirPath);
      if (children.length === 0) {
        fs.rmdirSync(dirPath);
        console.log(`[Layoutica Host] Removed empty directory: ${dirPath}`);
        removeEmptyDirs(path.dirname(dirPath), workspacePath);
      }
    }
  } catch (e) {
    console.error("[Layoutica Host] Failed to remove empty dir:", dirPath, e);
  }
}

function writeFiles(workspacePath, files) {
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(workspacePath, relativePath);
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(filePath, content, "utf8");
  }
}

function pruneDeletedPages(workspacePath, files) {
  const appPath = path.join(workspacePath, "src", "app");
  if (!fs.existsSync(appPath)) return;

  function removeEmptyDirs(dirPath) {
    if (dirPath === appPath) return;
    try {
      if (fs.existsSync(dirPath)) {
        const children = fs.readdirSync(dirPath);
        if (children.length === 0) {
          fs.rmdirSync(dirPath);
          removeEmptyDirs(path.dirname(dirPath));
        }
      }
    } catch (e) {
      console.error("[Layoutica Host] Failed to remove empty dir:", dirPath, e);
    }
  }

  function scan(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (e) {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.name === "page.tsx") {
        const relativePath = path.relative(workspacePath, fullPath).replace(/\\/g, "/");
        if (!files[relativePath]) {
          try {
            fs.unlinkSync(fullPath);
            console.log(`[Layoutica Host] Pruned deleted page file: ${relativePath}`);
            removeEmptyDirs(path.dirname(fullPath));
          } catch (e) {
            console.error(`[Layoutica Host] Failed to delete file: ${fullPath}`, e);
          }
        }
      }
    }
  }

  scan(appPath);
}

function syncBackendFiles(workspacePath, nodes) {
  const layouticaDir = activeLayouticaDir || path.join(workspacePath, ".layoutica");
  const targetWorkspaceDir = path.dirname(layouticaDir);

  function getFormattedPath(node) {
    const ext = node.extension || "ts";
    let filename = node.name;
    if (!filename.endsWith(`.${ext}`)) {
      filename = `${filename}.${ext}`;
    }
    const p = node.path ? `${node.path}/${filename}` : filename;
    return '/' + p.replace(/\\/g, '/').replace(/^\/+/, '');
  }

  function writeFileWithDescription(filePath, description, imports, exports) {
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    let headerComments = `// Description: ${description || ""}\n`;
    if (imports && imports.length > 0) {
      headerComments += `// Imports: ${imports.join(", ")}\n`;
    }
    if (exports && exports.length > 0) {
      headerComments += `// Exports: ${exports.join(", ")}\n`;
    }
    
    let content = "";
    if (fs.existsSync(filePath)) {
      const currentContent = fs.readFileSync(filePath, "utf8");
      const lines = currentContent.split("\n");
      let dataStartIndex = 0;
      while (
        dataStartIndex < lines.length && 
        (lines[dataStartIndex].startsWith("// Description:") || 
         lines[dataStartIndex].startsWith("// Imports:") || 
         lines[dataStartIndex].startsWith("// Exports:"))
      ) {
        dataStartIndex++;
      }
      const dataContent = lines.slice(dataStartIndex).join("\n").replace(/^\n+/, "");
      content = headerComments + "\n" + dataContent;
    } else {
      content = headerComments + "\n";
    }
    fs.writeFileSync(filePath, content, "utf8");
  }

  // 1. Delete physical files for nodes that were deleted on canvas
  const incomingIds = new Set(nodes.map(n => n.id));
  for (const [id, oldPath] of nodeFilePaths.entries()) {
    if (!incomingIds.has(id)) {
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
          console.log(`[Layoutica Host] Deleted backend file: ${oldPath}`);
          removeEmptyDirs(path.dirname(oldPath), targetWorkspaceDir);
        } catch (err) {
          console.error(`[Layoutica Host] Failed to delete file: ${oldPath}`, err);
        }
      }
      nodeFilePaths.delete(id);
    }
  }

  // 2. Process active nodes (moves and writes)
  const outputNodes = [];

  for (const node of nodes) {
    const newPath = getNodePath(targetWorkspaceDir, node);
    const oldPath = nodeFilePaths.get(node.id);

    if (oldPath && oldPath !== newPath) {
      if (fs.existsSync(oldPath)) {
        try {
          const newDir = path.dirname(newPath);
          if (!fs.existsSync(newDir)) {
            fs.mkdirSync(newDir, { recursive: true });
          }
          fs.renameSync(oldPath, newPath);
          console.log(`[Layoutica Host] Moved file from ${oldPath} to ${newPath}`);
          removeEmptyDirs(path.dirname(oldPath), targetWorkspaceDir);
        } catch (err) {
          console.error(`[Layoutica Host] Failed to move file: ${oldPath} -> ${newPath}`, err);
        }
      }
    }

    nodeFilePaths.set(node.id, newPath);

    let formattedImports = [];
    let formattedExports = [];
    if (node.connections) {
      node.connections.forEach(conn => {
        if (conn.type === "import") {
          const sourceNode = nodes.find(n => n.id === conn.sourceId);
          if (sourceNode) formattedImports.push(getFormattedPath(sourceNode));
        } else if (conn.type === "export") {
          const targetNode = nodes.find(n => n.id === conn.targetId);
          if (targetNode) formattedExports.push(getFormattedPath(targetNode));
        }
      });
    } else {
      if (node.imports) formattedImports = node.imports;
      if (node.exports) formattedExports = node.exports;
    }

    try {
      writeFileWithDescription(newPath, node.description, formattedImports, formattedExports);
    } catch (err) {
      console.error(`[Layoutica Host] Failed to write backend file: ${newPath}`, err);
    }

    const { id, x, y, isExpanded, connections, ...rest } = node;
    const outNode = { ...rest };
    if (formattedImports.length > 0) outNode.imports = formattedImports;
    if (formattedExports.length > 0) outNode.exports = formattedExports;
    
    // We retain connections if they exist so the canvas can render them when reloaded
    if (connections) outNode.connections = connections;
    outNode.id = id;

    outputNodes.push(outNode);
  }

  // 3. Write tiered files and delete workspace.json
  try {
    const tiersDir = path.join(layouticaDir, "tiers");
    if (!fs.existsSync(tiersDir)) {
      fs.mkdirSync(tiersDir, { recursive: true });
    }

    // A. Compute tiers
    const nodeMap = new Map();
    outputNodes.forEach(node => {
      const pathVal = getFormattedPath(node);
      nodeMap.set(pathVal, node);
    });

    const tiers = {}; // nodeId -> tier (1-based)
    const visiting = new Set();

    function getTier(node) {
      if (tiers[node.id] !== undefined) return tiers[node.id];
      if (visiting.has(node.id)) {
        return 1; // Break cycle
      }
      visiting.add(node.id);

      if (!node.imports || node.imports.length === 0) {
        visiting.delete(node.id);
        tiers[node.id] = 1;
        return 1;
      }

      let maxImportTier = 0;
      for (const impPath of node.imports) {
        const importedNode = nodeMap.get(impPath);
        if (importedNode) {
          maxImportTier = Math.max(maxImportTier, getTier(importedNode));
        }
      }

      visiting.delete(node.id);
      tiers[node.id] = maxImportTier + 1;
      return tiers[node.id];
    }

    outputNodes.forEach(node => {
      getTier(node);
    });

    // B. Group outputNodes by tier
    const tieredNodes = {}; // tier -> Array of nodes
    let maxTier = 0;
    outputNodes.forEach(node => {
      const t = tiers[node.id] || 1;
      if (!tieredNodes[t]) tieredNodes[t] = [];
      tieredNodes[t].push(node);
      if (t > maxTier) maxTier = t;
    });

    // C. Write each tier file
    for (let t = 1; t <= maxTier; t++) {
      const tierFilePath = path.join(tiersDir, `tier_${t}.json`);
      const nodesInTier = tieredNodes[t] || [];
      fs.writeFileSync(tierFilePath, JSON.stringify(nodesInTier, null, 2), "utf8");
    }

    // D. Clean up any extra tier files (e.g. if maxTier decreased)
    if (fs.existsSync(tiersDir)) {
      const existingFiles = fs.readdirSync(tiersDir);
      for (const file of existingFiles) {
        if (file.startsWith("tier_") && file.endsWith(".json")) {
          const fileTier = parseInt(file.replace("tier_", "").replace(".json", ""), 10);
          if (isNaN(fileTier) || fileTier > maxTier) {
            try {
              fs.unlinkSync(path.join(tiersDir, file));
              console.log(`[Layoutica Host] Deleted obsolete tier file: ${file}`);
            } catch (err) {
              console.error(`[Layoutica Host] Failed to delete obsolete tier file: ${file}`, err);
            }
          }
        }
      }
    }

    // E. Remove workspace.json if it exists
    const workspaceJsonPath = path.join(layouticaDir, "workspace.json");
    if (fs.existsSync(workspaceJsonPath)) {
      try {
        fs.unlinkSync(workspaceJsonPath);
        console.log(`[Layoutica Host] Removed workspace.json successfully`);
      } catch (err) {
        console.error(`[Layoutica Host] Failed to remove workspace.json`, err);
      }
    }

    console.log(`[Layoutica Host] Synced tiered files successfully`);
  } catch (err) {
    console.error(`[Layoutica Host] Failed to write tiered files`, err);
  }
}

let isInitializingNextApp = false;

export function activate(context) {
  const openCommand = vscode.commands.registerCommand(
    "layoutica.open",
    () => {
      if (
        !vscode.workspace.workspaceFolders ||
        vscode.workspace.workspaceFolders.length === 0
      ) {
        vscode.window.showWarningMessage(
          "Layoutica Builder requires an open workspace folder. Please open a folder and try again."
        );
        return;
      }

      const panel = vscode.window.createWebviewPanel(
        "layouticaBuilder",
        "Layoutica Builder",
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [
            vscode.Uri.file(path.join(__dirname, "dist")),
          ],
        }
      );

      activePanel = panel;
      panel.onDidDispose(() => {
        if (activePanel === panel) activePanel = null;
      });

      const distPath = path.join(__dirname, "dist");
      const htmlPath = path.join(distPath, "index.html");

      if (!fs.existsSync(htmlPath)) {
        vscode.window.showErrorMessage(
          "Layoutica build files not found. Please build the project (npm run build) before running the extension."
        );
        return;
      }

      let html = fs.readFileSync(htmlPath, "utf8");

      // Replace relative paths with Webview URIs using regex
      html = html.replace(
        /(href|src)="(\.\/[^"]*)"/g,
        (match, attribute, relativePath) => {
          const cleanPath = relativePath.replace(/^\.\//, "");
          const fileUri = vscode.Uri.file(path.join(distPath, cleanPath));
          const webviewUri = panel.webview.asWebviewUri(fileUri);
          return `${attribute}="${webviewUri}"`;
        }
      );

      panel.webview.html = html;

      // Handle messages from Webview
      panel.webview.onDidReceiveMessage(
        async (message) => {
          switch (message.type) {
            case "writeWorkspaceFiles": {
              const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
              if (!workspaceFolder) {
                console.warn("[Layoutica Host] Cancelled writeWorkspaceFiles: No open workspace folders");
                return;
              }
              const files = message.payload.files;

              const packageJsonPath = path.join(
                workspaceFolder.uri.fsPath,
                "package.json"
              );
              if (!fs.existsSync(packageJsonPath)) {
                isInitializingNextApp = true;
                
                panel.webview.postMessage({
                  type: "nextAppInitStatus",
                  payload: { status: "initializing" },
                });

                vscode.window.withProgress(
                  {
                    location: vscode.ProgressLocation.Notification,
                    title: "Initializing Next.js Project",
                    cancellable: false,
                  },
                  async (progress) => {
                    progress.report({
                      message:
                        "Running create-next-app (this may take a few seconds)...",
                    });

                    const cmd = 'npx -y create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm';
                    
                    const layouticaPath = path.join(workspaceFolder.uri.fsPath, ".layoutica");
                    let layouticaBackupPath = null;
                    if (fs.existsSync(layouticaPath)) {
                      layouticaBackupPath = path.join(os.tmpdir(), `layoutica-backup-${Date.now()}`);
                      try {
                        fs.renameSync(layouticaPath, layouticaBackupPath);
                      } catch (err) {
                        console.error("[Layoutica Host] Failed to backup .layoutica:", err);
                      }
                    }

                    const execPromise = new Promise((resolve, reject) => {
                      exec(
                        cmd,
                        { cwd: workspaceFolder.uri.fsPath },
                        (error, stdout, stderr) => {
                          if (error) {
                            console.error("[Layoutica Host] command failed with error:", error);
                            reject(error);
                          } else {
                            resolve(true);
                          }
                        }
                      );
                    });

                    try {
                      await execPromise;

                      // Clear globals.css except for standard tailwind directives
                      const cssPath = path.join(
                        workspaceFolder.uri.fsPath,
                        "src",
                        "app",
                        "globals.css"
                      );
                      if (fs.existsSync(cssPath)) {
                        const content = fs.readFileSync(cssPath, "utf8");
                        const lines = content.split("\n");
                        const topImports = lines.filter(
                          (line) =>
                            line.trim().startsWith("@import") ||
                            line.trim().startsWith("@tailwind") ||
                            line.trim().startsWith("@theme")
                        );
                        fs.writeFileSync(
                          cssPath,
                          topImports.join("\n") + "\n",
                          "utf8"
                        );
                      }

                      // Write layout files
                      pruneDeletedPages(workspaceFolder.uri.fsPath, files);
                      writeFiles(workspaceFolder.uri.fsPath, files);
                      
                      vscode.window.showInformationMessage(
                        "Next.js project successfully initialized and synced!"
                      );
                      panel.webview.postMessage({
                        type: "nextAppInitStatus",
                        payload: { status: "success" },
                      });
                    } catch (err) {
                      console.error("[Layoutica Host] Error during initialization:", err);
                      vscode.window.showErrorMessage(
                        `Failed to initialize Next.js app: ${
                          err.message || String(err)
                        }`
                      );
                      panel.webview.postMessage({
                        type: "nextAppInitStatus",
                        payload: { status: "error", error: err.message || String(err) },
                      });
                    } finally {
                      if (layouticaBackupPath && fs.existsSync(layouticaBackupPath)) {
                        try {
                          if (fs.existsSync(layouticaPath)) {
                            fs.rmSync(layouticaPath, { recursive: true, force: true });
                          }
                          fs.renameSync(layouticaBackupPath, layouticaPath);
                        } catch (err) {
                          console.error("[Layoutica Host] Failed to restore .layoutica:", err);
                        }
                      }
                      isInitializingNextApp = false;
                    }
                  }
                );
                return;
              }

              try {
                pruneDeletedPages(workspaceFolder.uri.fsPath, files);
                writeFiles(workspaceFolder.uri.fsPath, files);
              } catch (err) {
                console.error("[Layoutica Host] Direct write failed:", err);
                vscode.window.showErrorMessage(
                  `Failed to sync files: ${err.message || String(err)}`
                );
              }
              break;
            }

            case "saveProject": {
              const options = {
                defaultUri: vscode.workspace.workspaceFolders?.[0]
                  ? vscode.Uri.joinPath(
                      vscode.workspace.workspaceFolders[0].uri,
                      message.payload.filename
                    )
                  : undefined,
                filters: {
                  "Layoutica Files": ["ltica"],
                  "JSON Files": ["json"],
                },
              };

              vscode.window
                .showSaveDialog(options)
                .then((fileUri) => {
                  if (fileUri) {
                    fs.writeFileSync(
                      fileUri.fsPath,
                      message.payload.json,
                      "utf8"
                    );
                    vscode.window.showInformationMessage(
                      `Project saved successfully to ${path.basename(fileUri.fsPath)}`
                    );
                  }
                })
                .catch((err) => {
                  vscode.window.showErrorMessage(
                    `Failed to save project: ${err.message || String(err)}`
                  );
                });
              break;
            }

            case "openFile": {
              const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
              if (workspaceFolder && message.payload.path && message.payload.name && message.payload.extension) {
                const targetPath = path.join(
                  workspaceFolder.uri.fsPath,
                  message.payload.path,
                  `${message.payload.name}.${message.payload.extension}`
                );
                if (fs.existsSync(targetPath)) {
                  vscode.workspace.openTextDocument(vscode.Uri.file(targetPath)).then((doc) => {
                    vscode.window.showTextDocument(doc, { preserveFocus: true, preview: false });
                  });
                }
              }
              break;
            }

            case "loadProject": {
              const options = {
                canSelectMany: false,
                filters: {
                  "Layoutica Files": ["ltica", "json"],
                },
              };

              vscode.window
                .showOpenDialog(options)
                .then((fileUris) => {
                  if (fileUris && fileUris[0]) {
                    const content = fs.readFileSync(
                      fileUris[0].fsPath,
                      "utf8"
                    );
                    panel.webview.postMessage({
                      type: "loadProjectResponse",
                      payload: {
                        json: content,
                      },
                    });
                  } else {
                    panel.webview.postMessage({
                      type: "loadProjectResponse",
                      payload: {
                        cancelled: true,
                      },
                    });
                  }
                })
                .catch((err) => {
                  panel.webview.postMessage({
                    type: "loadProjectResponse",
                    payload: {
                      error: err.message || String(err),
                    },
                  });
                });
              break;
            }

            case "exportZip": {
              const options = {
                defaultUri: vscode.workspace.workspaceFolders?.[0]
                  ? vscode.Uri.joinPath(
                      vscode.workspace.workspaceFolders[0].uri,
                      message.payload.filename
                    )
                  : undefined,
                filters: {
                  "ZIP Archives": ["zip"],
                },
              };

              vscode.window
                .showSaveDialog(options)
                .then((fileUri) => {
                  if (fileUri) {
                    const buffer = Buffer.from(
                      message.payload.base64,
                      "base64"
                    );
                    fs.writeFileSync(fileUri.fsPath, buffer);
                    vscode.window.showInformationMessage(
                      `Code exported successfully to ${path.basename(fileUri.fsPath)}`
                    );
                  }
                })
                .catch((err) => {
                  vscode.window.showErrorMessage(
                    `Failed to export code: ${err.message || String(err)}`
                  );
                });
              break;
            }

            case "getBackendState": {
              const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
              if (!workspaceFolder) {
                console.warn("[Layoutica Host] Cancelled getBackendState: No open workspace folders");
                return;
              }

              let layouticaDir = null;
              try {
                const files = await vscode.workspace.findFiles("**/.layoutica/{layout.json,ui_layout.json,workspace.json}", "**/node_modules/**", 1);
                if (files && files.length > 0) {
                  layouticaDir = path.dirname(files[0].fsPath);
                }
              } catch (err) {
                console.error("[Layoutica Host] Error searching for .layoutica files:", err);
              }

              if (!layouticaDir) {
                layouticaDir = path.join(workspaceFolder.uri.fsPath, ".layoutica");
              }

              activeLayouticaDir = layouticaDir;
              const targetWorkspaceDir = path.dirname(layouticaDir);
              const layoutJsonPath = path.join(layouticaDir, "layout.json");
              const workspaceJsonPath = path.join(layouticaDir, "workspace.json");
              const tiersDir = path.join(layouticaDir, "tiers");

              let nodes = [];
              let pinnedNodes = [];
              let connections = [];
              let activeGhostNodes = [];

              if (fs.existsSync(layoutJsonPath)) {
                try {
                  const data = fs.readFileSync(layoutJsonPath, "utf8");
                  const parsed = JSON.parse(data);
                  nodeFilePaths.clear();
                  nodes = (parsed.nodes || []).map((n) => {
                    nodeFilePaths.set(n.id, getNodePath(targetWorkspaceDir, n));
                    return n;
                  });
                  pinnedNodes = parsed.pinnedNodes || [];
                  connections = parsed.connections || [];
                  activeGhostNodes = parsed.activeGhostNodes || [];
                } catch (err) {
                  console.error("[Layoutica Host] Failed to read layout.json:", err);
                }
              } else if (fs.existsSync(tiersDir)) {
                try {
                  const files = fs.readdirSync(tiersDir);
                  let combinedNodes = [];
                  const tierFiles = files
                    .filter(file => file.startsWith("tier_") && file.endsWith(".json"))
                    .sort((a, b) => {
                      const numA = parseInt(a.replace("tier_", "").replace(".json", ""), 10);
                      const numB = parseInt(b.replace("tier_", "").replace(".json", ""), 10);
                      return numA - numB;
                    });
                  for (const file of tierFiles) {
                    const filePath = path.join(tiersDir, file);
                    const data = fs.readFileSync(filePath, "utf8");
                    const tierNodes = JSON.parse(data);
                    if (Array.isArray(tierNodes)) {
                      combinedNodes = combinedNodes.concat(tierNodes);
                    }
                  }
                  nodeFilePaths.clear();
                  nodes = combinedNodes.map((n, i) => {
                    const id = n.id || `node-${Math.random().toString(36).substr(2, 9)}`;
                    const node = {
                      ...n,
                      id,
                      x: n.x ?? (10 + (i * 20)),
                      y: n.y ?? (10 + (i * 20)),
                      isExpanded: n.isExpanded ?? false
                    };
                    nodeFilePaths.set(id, getNodePath(targetWorkspaceDir, node));
                    return node;
                  });
                } catch (err) {
                  console.error("[Layoutica Host] Failed to read tiers directory:", err);
                }
              } else if (fs.existsSync(workspaceJsonPath)) {
                try {
                  const data = fs.readFileSync(workspaceJsonPath, "utf8");
                  const parsed = JSON.parse(data);
                  nodeFilePaths.clear();
                  nodes = parsed.map((n, i) => {
                    const id = n.id || `node-${Math.random().toString(36).substr(2, 9)}`;
                    const node = {
                      ...n,
                      id,
                      x: n.x ?? (10 + (i * 20)),
                      y: n.y ?? (10 + (i * 20)),
                      isExpanded: n.isExpanded ?? false
                    };
                    nodeFilePaths.set(id, getNodePath(targetWorkspaceDir, node));
                    return node;
                  });
                } catch (err) {
                  console.error("[Layoutica Host] Failed to read workspace.json:", err);
                }
              }

              const syncResult = synchronizePhysicalFilesWithNodes(
                targetWorkspaceDir,
                nodes,
                layouticaDir,
                connections
              );
              nodes = syncResult.updatedNodes;
              connections = syncResult.updatedConnections;

              panel.webview.postMessage({
                type: "getBackendStateResponse",
                payload: { nodes, pinnedNodes, connections, activeGhostNodes }
              });
              break;
            }

            case "syncLayoutState": {
              const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
              if (!workspaceFolder) return;
              const packageJsonPath = path.join(workspaceFolder.uri.fsPath, "package.json");
              if (isInitializingNextApp || !fs.existsSync(packageJsonPath)) return;
              const layoutJsonPath = activeLayouticaDir
                ? path.join(activeLayouticaDir, "layout.json")
                : path.join(workspaceFolder.uri.fsPath, ".layoutica", "layout.json");
              try {
                const dir = path.dirname(layoutJsonPath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(layoutJsonPath, JSON.stringify(message.payload, null, 2), "utf8");
              } catch (err) {
                console.error("[Layoutica Host] Failed to write layout.json:", err);
              }
              break;
            }

            case "saveUILayout": {
              const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
              if (!workspaceFolder) return;
              const packageJsonPath = path.join(workspaceFolder.uri.fsPath, "package.json");
              if (isInitializingNextApp || !fs.existsSync(packageJsonPath)) return;
              const uiLayoutJsonPath = activeLayouticaDir
                ? path.join(activeLayouticaDir, "ui_layout.json")
                : path.join(workspaceFolder.uri.fsPath, ".layoutica", "ui_layout.json");
              try {
                const dir = path.dirname(uiLayoutJsonPath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(uiLayoutJsonPath, message.payload.json, "utf8");
              } catch (err) {
                console.error("[Layoutica Host] Failed to write ui_layout.json:", err);
              }
              break;
            }

            case "loadUILayout": {
              const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
              if (!workspaceFolder) {
                panel.webview.postMessage({
                  type: "loadUILayoutResponse",
                  payload: { error: "No open workspace" }
                });
                return;
              }
              let layouticaDir = null;
              try {
                const files = await vscode.workspace.findFiles("**/.layoutica/{layout.json,ui_layout.json,workspace.json}", "**/node_modules/**", 1);
                if (files && files.length > 0) {
                  layouticaDir = path.dirname(files[0].fsPath);
                }
              } catch (err) {
                console.error("[Layoutica Host] Error searching for .layoutica files:", err);
              }
              const targetDir = layouticaDir || path.join(workspaceFolder.uri.fsPath, ".layoutica");
              const uiLayoutJsonPath = path.join(targetDir, "ui_layout.json");
              if (fs.existsSync(uiLayoutJsonPath)) {
                try {
                  const content = fs.readFileSync(uiLayoutJsonPath, "utf8");
                  panel.webview.postMessage({
                    type: "loadUILayoutResponse",
                    payload: { json: content }
                  });
                  return;
                } catch (err) {
                  console.error("[Layoutica Host] Failed to read ui_layout.json:", err);
                }
              }
              panel.webview.postMessage({
                type: "loadUILayoutResponse",
                payload: { json: null }
              });
              break;
            }

            case "syncBackendState": {
              const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
              if (!workspaceFolder) {
                console.warn("[Layoutica Host] Cancelled syncBackendState: No open workspace folders");
                return;
              }
              const packageJsonPath = path.join(workspaceFolder.uri.fsPath, "package.json");
              if (isInitializingNextApp || !fs.existsSync(packageJsonPath)) return;
              const nodes = message.payload.nodes || [];
              syncBackendFiles(workspaceFolder.uri.fsPath, nodes);
              break;
            }
          }
        },
        undefined,
        context.subscriptions
      );
    }
  );



  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      const filePath = document.uri.fsPath;
      const fileName = path.basename(filePath);
      if ((fileName === "layout.json" || (fileName.startsWith("tier_") && fileName.endsWith(".json"))) && activePanel) {
        await reloadBackendStateFromFiles(activePanel);
        return;
      }

      let matchedNodeId = null;
      for (const [id, pathVal] of nodeFilePaths.entries()) {
        if (path.resolve(pathVal) === path.resolve(filePath)) {
          matchedNodeId = id;
          break;
        }
      }

      if (matchedNodeId && activePanel) {
        try {
          const content = fs.readFileSync(filePath, "utf8");
          const parsed = parseHeaderComments(content);
          activePanel.webview.postMessage({
            type: "fileSavedSync",
            payload: {
              nodeId: matchedNodeId,
              description: parsed.description,
              imports: parsed.imports,
              exports: parsed.exports
            }
          });
        } catch (err) {
          console.error("[Layoutica Host] Error handling save sync:", err);
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidCreateFiles(async () => {
      if (activePanel) {
        await reloadBackendStateFromFiles(activePanel);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidDeleteFiles(async () => {
      if (activePanel) {
        await reloadBackendStateFromFiles(activePanel);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidRenameFiles(async () => {
      if (activePanel) {
        await reloadBackendStateFromFiles(activePanel);
      }
    })
  );

  context.subscriptions.push(openCommand);
}

export function deactivate() {}

async function reloadBackendStateFromFiles(panel) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) return;

  let layouticaDir = activeLayouticaDir;
  if (!layouticaDir) {
    try {
      const files = await vscode.workspace.findFiles("**/.layoutica/{layout.json,ui_layout.json,workspace.json}", "**/node_modules/**", 1);
      if (files && files.length > 0) {
        layouticaDir = path.dirname(files[0].fsPath);
      }
    } catch (err) {
      console.error("[Layoutica Host] Error searching for .layoutica files:", err);
    }
  }
  if (!layouticaDir) {
    layouticaDir = path.join(workspaceFolder.uri.fsPath, ".layoutica");
  }

  activeLayouticaDir = layouticaDir;
  const targetWorkspaceDir = path.dirname(layouticaDir);
  const layoutJsonPath = path.join(layouticaDir, "layout.json");
  const workspaceJsonPath = path.join(layouticaDir, "workspace.json");
  const tiersDir = path.join(layouticaDir, "tiers");

  let nodes = [];
  let pinnedNodes = [];
  let connections = [];
  let activeGhostNodes = [];

  if (fs.existsSync(layoutJsonPath)) {
    try {
      const data = fs.readFileSync(layoutJsonPath, "utf8");
      const parsed = JSON.parse(data);
      nodeFilePaths.clear();
      nodes = (parsed.nodes || []).map((n) => {
        nodeFilePaths.set(n.id, getNodePath(targetWorkspaceDir, n));
        return n;
      });
      pinnedNodes = parsed.pinnedNodes || [];
      connections = parsed.connections || [];
      activeGhostNodes = parsed.activeGhostNodes || [];
    } catch (err) {
      console.error("[Layoutica Host] Failed to read layout.json:", err);
    }
  } else if (fs.existsSync(tiersDir)) {
    try {
      const files = fs.readdirSync(tiersDir);
      let combinedNodes = [];
      const tierFiles = files
        .filter(file => file.startsWith("tier_") && file.endsWith(".json"))
        .sort((a, b) => {
          const numA = parseInt(a.replace("tier_", "").replace(".json", ""), 10);
          const numB = parseInt(b.replace("tier_", "").replace(".json", ""), 10);
          return numA - numB;
        });
      for (const file of tierFiles) {
        const filePath = path.join(tiersDir, file);
        const data = fs.readFileSync(filePath, "utf8");
        const tierNodes = JSON.parse(data);
        if (Array.isArray(tierNodes)) {
          combinedNodes = combinedNodes.concat(tierNodes);
        }
      }
      nodeFilePaths.clear();
      nodes = combinedNodes.map((n, i) => {
        const id = n.id || `node-${Math.random().toString(36).substr(2, 9)}`;
        const node = {
          ...n,
          id,
          x: n.x ?? (10 + (i * 20)),
          y: n.y ?? (10 + (i * 20)),
          isExpanded: n.isExpanded ?? false
        };
        nodeFilePaths.set(id, getNodePath(targetWorkspaceDir, node));
        return node;
      });
    } catch (err) {
      console.error("[Layoutica Host] Failed to read tiers directory:", err);
    }
  } else if (fs.existsSync(workspaceJsonPath)) {
    try {
      const data = fs.readFileSync(workspaceJsonPath, "utf8");
      const parsed = JSON.parse(data);
      nodeFilePaths.clear();
      nodes = parsed.map((n, i) => {
        const id = n.id || `node-${Math.random().toString(36).substr(2, 9)}`;
        const node = {
          ...n,
          id,
          x: n.x ?? (10 + (i * 20)),
          y: n.y ?? (10 + (i * 20)),
          isExpanded: n.isExpanded ?? false
        };
        nodeFilePaths.set(id, getNodePath(targetWorkspaceDir, node));
        return node;
      });
    } catch (err) {
      console.error("[Layoutica Host] Failed to read workspace.json:", err);
    }
  }

  const syncResult = synchronizePhysicalFilesWithNodes(
    targetWorkspaceDir,
    nodes,
    layouticaDir,
    connections
  );
  nodes = syncResult.updatedNodes;
  connections = syncResult.updatedConnections;

  panel.webview.postMessage({
    type: "getBackendStateResponse",
    payload: { nodes, pinnedNodes, connections, activeGhostNodes }
  });

  const nodesWithConnections = nodes.map(node => {
    const imports = connections
      .filter(c => c.targetId === node.id)
      .map(c => {
        const source = nodes.find(n => n.id === c.sourceId);
        return source ? `/${source.path ? source.path + '/' : ''}${source.name}.${source.extension}` : null;
      }).filter(Boolean);
      
    const exports = connections
      .filter(c => c.sourceId === node.id)
      .map(c => {
        const target = nodes.find(n => n.id === c.targetId);
        return target ? `/${target.path ? target.path + '/' : ''}${target.name}.${target.extension}` : null;
      }).filter(Boolean);

    return {
      ...node,
      imports,
      exports
    };
  });

  const packageJsonPath = path.join(workspaceFolder.uri.fsPath, "package.json");
  if (!isInitializingNextApp && fs.existsSync(packageJsonPath)) {
    syncBackendFiles(workspaceFolder.uri.fsPath, nodesWithConnections);
  }
}
