import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { fileURLToPath } from "url";

import { exec } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nodeFilePaths = new Map();
let activeWorkspaceJsonPath = null;
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
  const workspaceJsonPath = activeWorkspaceJsonPath || path.join(workspacePath, ".layoutica", "workspace.json");
  const targetWorkspaceDir = path.dirname(path.dirname(workspaceJsonPath));

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

  // 3. Write workspace.json
  try {
    const dir = path.dirname(workspaceJsonPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(workspaceJsonPath, JSON.stringify(outputNodes, null, 2), "utf8");
    console.log(`[Layoutica Host] Synced workspace.json successfully`);
  } catch (err) {
    console.error(`[Layoutica Host] Failed to write workspace.json`, err);
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

              let workspaceJsonPath = null;
              try {
                const files = await vscode.workspace.findFiles("**/.layoutica/workspace.json", "**/node_modules/**", 1);
                if (files && files.length > 0) {
                  workspaceJsonPath = files[0].fsPath;
                }
              } catch (err) {
                console.error("[Layoutica Host] Error searching for workspace.json:", err);
              }

              if (!workspaceJsonPath) {
                workspaceJsonPath = path.join(workspaceFolder.uri.fsPath, ".layoutica", "workspace.json");
              }

              activeWorkspaceJsonPath = workspaceJsonPath;
              const targetWorkspaceDir = path.dirname(path.dirname(workspaceJsonPath));
              const layoutJsonPath = path.join(path.dirname(workspaceJsonPath), "layout.json");

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
              const layoutJsonPath = activeWorkspaceJsonPath
                ? path.join(path.dirname(activeWorkspaceJsonPath), "layout.json")
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
              const uiLayoutJsonPath = activeWorkspaceJsonPath
                ? path.join(path.dirname(activeWorkspaceJsonPath), "ui_layout.json")
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
              let workspaceJsonPath = null;
              try {
                const files = await vscode.workspace.findFiles("**/.layoutica/workspace.json", "**/node_modules/**", 1);
                if (files && files.length > 0) {
                  workspaceJsonPath = files[0].fsPath;
                }
              } catch (err) {
                console.error("[Layoutica Host] Error searching for workspace.json:", err);
              }
              const targetDir = workspaceJsonPath ? path.dirname(workspaceJsonPath) : path.join(workspaceFolder.uri.fsPath, ".layoutica");
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

  function parseHeaderComments(content) {
    const lines = content.split("\n");
    let description = "";
    let imports = [];
    let exports = [];

    for (const line of lines) {
      if (line.startsWith("// Description:")) {
        description = line.substring("// Description:".length).trim();
      } else if (line.startsWith("// Imports:")) {
        const parts = line.substring("// Imports:".length).trim();
        if (parts) {
          imports = parts.split(",").map(p => p.trim()).filter(Boolean);
        }
      } else if (line.startsWith("// Exports:")) {
        const parts = line.substring("// Exports:".length).trim();
        if (parts) {
          exports = parts.split(",").map(p => p.trim()).filter(Boolean);
        }
      }
    }

    return { description, imports, exports };
  }

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      const filePath = document.uri.fsPath;
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

  context.subscriptions.push(openCommand);
}

export function deactivate() {}
