import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { fileURLToPath, URL } from "url";
import http from "http";
import https from "https";

import { exec, execSync } from "child_process";

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

// ─── Antigravity Language Server RPC Integration ─────────────────────────────
let cachedWorkingEndpoint = null;
let cachedEndpointExpiry = 0;
const ENDPOINT_TTL = 30 * 1000; // 30 seconds

async function discoverLS() {
  try {
    const psOutput = execSync('ps -ax -o pid=,command=', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    const lines = psOutput.split('\n');
    
    let lsLine = lines.find(l => l.includes('language_server') && l.includes('antigravity') && l.includes('--standalone'));
    if (!lsLine) {
      lsLine = lines.find(l => l.includes('language_server') && l.includes('antigravity'));
    }
    if (!lsLine) return null;

    const pid = lsLine.trim().split(' ')[0];
    const csrfToken = lsLine.match(/--csrf_token\s+([a-f0-9-]+)/)?.[1];
    if (!pid || !csrfToken) return null;

    let ports = [];
    try {
      const ss = execSync(`ss -lntp 2>/dev/null | grep "pid=${pid},"` , { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const matches = ss.match(/127\.0\.0\.1:(\d+)/g) || [];
      ports = [...new Set(matches.map(m => m.split(':')[1]))].filter(Boolean);
    } catch {
      try {
        const ss = execSync(`ss -tunlp 2>/dev/null | grep "pid=${pid}"`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        const matches = ss.match(/127\.0\.0\.1:(\d+)/g) || [];
        ports = [...new Set(matches.map(m => m.split(':')[1]))].filter(Boolean);
      } catch {
        ports = ['41833', '41107', '34805', '45151', '40853'];
      }
    }

    return { pid, csrfToken, ports };
  } catch (err) {
    console.error('[Layoutica Host] LS Discovery failed:', err);
    return null;
  }
}

async function secureRPCRequest(url, options) {
  const u = new URL(url);
  const protocol = u.protocol === 'https:' ? https : http;
  
  const requestOptions = {
    hostname: u.hostname,
    port: u.port,
    path: u.pathname + u.search,
    method: options.method || 'GET',
    headers: options.headers || {},
    rejectUnauthorized: false
  };

  return new Promise((resolve, reject) => {
    const req = protocol.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: async () => JSON.parse(data),
          text: async () => data
        });
      });
    });

    req.on('error', (err) => reject(err));
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function getWorkingLSEndpoint(ls) {
  if (cachedWorkingEndpoint && Date.now() < cachedEndpointExpiry) {
    return cachedWorkingEndpoint;
  }

  const metadata = { ideName: 'antigravity', extensionName: 'layoutica', ideVersion: vscode.version, locale: 'en' };
  const endpoint = '/exa.language_server_pb.LanguageServerService/GetUserStatus';

  for (const port of ls.ports) {
    for (const proto of ['https', 'http']) {
      try {
        const res = await secureRPCRequest(`${proto}://127.0.0.1:${port}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Connect-Protocol-Version': '1',
            'x-codeium-csrf-token': ls.csrfToken
          },
          body: JSON.stringify({ metadata })
        });
        if (res.ok) {
          cachedWorkingEndpoint = { protocol: proto, port };
          cachedEndpointExpiry = Date.now() + ENDPOINT_TTL;
          return cachedWorkingEndpoint;
        }
      } catch {
        continue;
      }
    }
  }
  return null;
}

async function bypassConfirmation() {
  console.log(`[Layoutica Executor] Triggering auto-approval bypass sequence...`);
  const totalBypasses = 5;
  const delayBetweenBypasses = 500;

  const sendBypassSequence = async (index) => {
    if (index >= totalBypasses) return;

    console.log(`[Layoutica Executor] Programmatically accepting agent step: Sequence ${index + 1}/${totalBypasses}`);
    
    try {
      await vscode.commands.executeCommand('antigravity.agentSidePanel.focus');
    } catch (focusErr) {}

    try {
      await vscode.commands.executeCommand('antigravity.acceptAgentStep');
    } catch (err) {}

    try {
      await vscode.commands.executeCommand('chatEditing.acceptAllFiles');
    } catch (err) {}

    try {
      await vscode.commands.executeCommand('chatEditor.action.acceptAllEdits');
    } catch (err) {}

    try {
      await vscode.commands.executeCommand('chatEditing.multidiff.acceptAllFiles');
    } catch (err) {}

    try {
      await vscode.commands.executeCommand('workbench.action.chat.acceptTool');
    } catch (err) {}

    try {
      await vscode.commands.executeCommand('workbench.action.chat.acceptElicitation');
    } catch (err) {}

    try {
      await vscode.commands.executeCommand('inlineChat2.keep');
    } catch (err) {}

    try {
      await vscode.commands.executeCommand('notification.acceptPrimaryAction');
    } catch (err) {}

    try {
      await vscode.commands.executeCommand('inlineChat.acceptChanges');
    } catch (err) {}

    try {
      await vscode.commands.executeCommand('antigravity.prioritized.agentAcceptAllInFile');
    } catch (err) {}

    try {
      await vscode.commands.executeCommand('notebook.inlineChat.acceptChangesAndRun');
    } catch (err) {}

    setTimeout(() => {
      sendBypassSequence(index + 1);
    }, delayBetweenBypasses);
  };

  setTimeout(() => {
    sendBypassSequence(0);
  }, 250);
}

let activeCascadeId = null;
const approvedCallIdsMap = new Map();
const approvedInteractionKeysMap = new Map();

async function runAntigravityTask(query, onUpdate) {
  const ls = await discoverLS();
  if (!ls) throw new Error('Antigravity Language Server not discovered. Make sure the background agent is running.');

  const working = await getWorkingLSEndpoint(ls);
  if (!working) throw new Error('No working Language Server endpoint found');

  const metadata = { ideName: 'antigravity', extensionName: 'layoutica', ideVersion: vscode.version, locale: 'en' };
  const port = working.port;
  const protocol = working.protocol;

  const workspaceUris = vscode.workspace.workspaceFolders?.map(f => f.uri.toString()) || [];

  const startNewCascade = async () => {
    const startBody = { 
      metadata, 
      source: 1,
      workspaceUris
    };

    const startRes = await secureRPCRequest(`${protocol}://127.0.0.1:${port}/exa.language_server_pb.LanguageServerService/StartCascade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Connect-Protocol-Version': '1',
        'x-codeium-csrf-token': ls.csrfToken
      },
      body: JSON.stringify(startBody)
    });

    if (!startRes.ok) {
      const errorText = await startRes.text();
      throw new Error(`StartCascade failed: ${startRes.status} - ${errorText}`);
    }
    const data = await startRes.json();
    if (!data.cascadeId) throw new Error('No cascadeId returned');
    return data.cascadeId;
  };

  if (!activeCascadeId) {
    activeCascadeId = await startNewCascade();
  }

  const sendMessage = async (cid) => {
    return await secureRPCRequest(`${protocol}://127.0.0.1:${port}/exa.language_server_pb.LanguageServerService/SendUserCascadeMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Connect-Protocol-Version': '1',
        'x-codeium-csrf-token': ls.csrfToken
      },
      body: JSON.stringify({
        metadata,
        cascadeId: cid,
        items: [{ text: query }],
        clientType: 1,
        messageOrigin: 1,
        cascadeConfig: {
          plannerConfig: {
            conversational: { agenticMode: true }, 
            toolConfig: {
              allowAllTools: true,
              autoRun: true
            }
          }
        }
      })
    });
  };

  let sendRes = await sendMessage(activeCascadeId);
  
  if (!sendRes.ok) {
    console.log(`[Layoutica] Previous cascade ${activeCascadeId} send failed. Starting new cascade session...`);
    try {
      activeCascadeId = await startNewCascade();
      sendRes = await sendMessage(activeCascadeId);
    } catch (newCascadeErr) {
      throw new Error(`Failed to restart cascade session: ${newCascadeErr.message}`);
    }
  }

  if (!sendRes.ok) {
    const errText = await sendRes.text();
    throw new Error(`SendMessage failed: ${sendRes.status} - ${errText}`);
  }

  let lastText = '';
  let pollCount = 0;
  
  while (true) {
    pollCount++;
    await new Promise(r => setTimeout(r, 1000));
    try {
      const trajRes = await secureRPCRequest(`${protocol}://127.0.0.1:${port}/exa.language_server_pb.LanguageServerService/GetCascadeTrajectory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Connect-Protocol-Version': '1',
          'x-codeium-csrf-token': ls.csrfToken
        },
        body: JSON.stringify({ metadata, cascadeId: activeCascadeId })
      });
      
      if (trajRes.ok) {
        const data = await trajRes.json();
        const steps = data.trajectory?.steps || [];
        const status = data.status;
        
        for (const s of steps) {
          const toolCalls = s.plannerResponse?.toolCalls || [];
          for (const tc of toolCalls) {
            const callId = tc.id;
            if (callId) {
              let approvedData = approvedCallIdsMap.get(callId);
              let shouldBypass = false;

              if (!approvedData) {
                approvedData = { attempts: 1, lastRunTime: Date.now() };
                approvedCallIdsMap.set(callId, approvedData);
                shouldBypass = true;
              } else if (approvedData.attempts < 3 && Date.now() - approvedData.lastRunTime > 5000) {
                approvedData.attempts++;
                approvedData.lastRunTime = Date.now();
                shouldBypass = true;
              }

              if (shouldBypass) {
                bypassConfirmation();
              }
            }
          }
        }

        for (const s of steps) {
          const info = s.metadata?.sourceTrajectoryStepInfo || s.metadata?.source_trajectory_step_info;
          const trajectoryId = info?.trajectoryId || info?.trajectory_id;
          const stepIndex = info?.stepIndex !== undefined ? info.stepIndex : info?.step_index;

          if (trajectoryId && stepIndex !== undefined) {
            const key = `${trajectoryId}_${stepIndex}`;
            const reqInt = s.requestedInteraction || s.requested_interaction;
            const hasRequestedInt = reqInt && (reqInt.interaction || Object.keys(reqInt).length > 0);
            const isWaiting = s.status === 3 || s.status === 'WAITING' || s.status === 'CASCADE_STEP_STATUS_WAITING' || hasRequestedInt;

            const approvedData = approvedInteractionKeysMap.get(key);
            const isFirstTime = !approvedData;
            const isStuck = approvedData && approvedData.attempts < 3 && (Date.now() - approvedData.lastRunTime > 5000);

            if (isWaiting && (isFirstTime || isStuck)) {
              let interactionValue = null;
              let interactionCase = null;

              let stepCase = '';
              let stepValue = null;
              if (s.step) {
                if (s.step.case && s.step.value) {
                  stepCase = s.step.case;
                  stepValue = s.step.value;
                } else {
                  const keys = Object.keys(s.step);
                  if (keys.length > 0) {
                    stepCase = keys[0];
                    stepValue = s.step[keys[0]];
                  }
                }
              }

              let intCase = '';
              if (reqInt) {
                const intObj = reqInt.interaction || reqInt;
                if (intObj.case && intObj.value) {
                  intCase = intObj.case;
                } else {
                  const keys = Object.keys(intObj);
                  if (keys.length > 0) {
                    intCase = keys[0];
                  }
                }
              }

              let filePermissionUri = '';
              const filePermReq = s.step?.value?.filePermissionRequest || s.step?.value?.file_permission_request ||
                                  stepValue?.filePermissionRequest || stepValue?.file_permission_request ||
                                  s.filePermissionRequest || s.file_permission_request;
              if (filePermReq) {
                filePermissionUri = filePermReq.absolutePathUri || filePermReq.absolute_path_uri || '';
              }

              if (filePermissionUri) {
                interactionCase = 'filePermission';
                interactionValue = {
                  allow: true,
                  scope: 1,
                  absolutePathUri: filePermissionUri,
                  absolute_path_uri: filePermissionUri
                };
              } else if (intCase) {
                interactionCase = intCase;
                switch (intCase) {
                  case 'runCommand':
                  case 'run_command':
                    const cmd = stepCase === 'runCommand' || stepCase === 'run_command'
                      ? (stepValue?.commandLine || stepValue?.command_line || '')
                      : '';
                    interactionValue = {
                      confirm: true,
                      proposedCommandLine: cmd,
                      proposed_command_line: cmd,
                      submittedCommandLine: cmd,
                      submitted_command_line: cmd
                    };
                    break;
                  case 'openBrowserUrl':
                  case 'open_browser_url':
                  case 'captureBrowserScreenshot':
                  case 'capture_browser_screenshot':
                  case 'executeBrowserJavascript':
                  case 'execute_browser_javascript':
                  case 'mcp':
                  case 'readUrlContent':
                  case 'read_url_content':
                    interactionValue = { confirm: true };
                    break;
                  case 'permission':
                    interactionValue = { allow: true, scope: 2 };
                    break;
                }
              }

              if (interactionCase && interactionValue) {
                delete interactionValue.cascadeId;
                delete interactionValue.cascade_id;
                delete interactionValue.trajectoryId;
                delete interactionValue.trajectory_id;

                bypassConfirmation();

                let normalizedCase = interactionCase;
                if (interactionCase === 'run_command') normalizedCase = 'runCommand';
                else if (interactionCase === 'file_permission') normalizedCase = 'filePermission';
                else if (interactionCase === 'open_browser_url') normalizedCase = 'openBrowserUrl';
                else if (interactionCase === 'capture_browser_screenshot') normalizedCase = 'captureBrowserScreenshot';
                else if (interactionCase === 'execute_browser_javascript') normalizedCase = 'executeBrowserJavascript';
                else if (interactionCase === 'read_url_content') normalizedCase = 'readUrlContent';

                let anySuccess = false;
                const indicesToSend = [];
                if (stepIndex !== undefined) {
                  indicesToSend.push(stepIndex);
                  if (stepIndex > 0) indicesToSend.push(stepIndex - 1);
                  indicesToSend.push(stepIndex + 1);
                }
                for (let i = 0; i < steps.length; i++) {
                  if (!indicesToSend.includes(i)) indicesToSend.push(i);
                }
                if (!indicesToSend.includes(steps.length)) indicesToSend.push(steps.length);

                for (const idx of indicesToSend) {
                  try {
                    const res = await secureRPCRequest(`${protocol}://127.0.0.1:${port}/exa.language_server_pb.LanguageServerService/HandleCascadeUserInteraction`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Connect-Protocol-Version': '1',
                        'x-codeium-csrf-token': ls.csrfToken
                      },
                      body: JSON.stringify({
                        metadata,
                        cascadeId: activeCascadeId,
                        interaction: {
                          trajectoryId,
                          stepIndex: idx,
                          [normalizedCase]: interactionValue
                        }
                      })
                    });

                    if (res.ok) {
                      anySuccess = true;
                      break;
                    }
                  } catch (e) {}
                }

                if (anySuccess) {
                  if (isFirstTime) {
                    approvedInteractionKeysMap.set(key, { attempts: 1, lastRunTime: Date.now() });
                  } else if (approvedData) {
                    approvedData.attempts++;
                    approvedData.lastRunTime = Date.now();
                  }
                }
              } else {
                bypassConfirmation();
                if (isFirstTime) {
                  approvedInteractionKeysMap.set(key, { attempts: 1, lastRunTime: Date.now() });
                } else if (approvedData) {
                  approvedData.attempts++;
                  approvedData.lastRunTime = Date.now();
                }
              }
            }
          }
        }

        const plannerStep = [...steps].reverse().find(s => s.type === 'CORTEX_STEP_TYPE_PLANNER_RESPONSE');
        if (plannerStep) {
          const pr = plannerStep.plannerResponse;
          const text = pr?.modifiedResponse || pr?.response || pr?.content || '';
          if (text && text !== lastText) {
            lastText = text;
          }
        }

        if (onUpdate) {
          onUpdate({ text: lastText, steps, status });
        }

        if ((status === 'CASCADE_RUN_STATUS_IDLE' || status === 2) && lastText) {
          return lastText;
        }
        
        if (steps.some(s => s.type === 'CORTEX_STEP_TYPE_ERROR_MESSAGE')) {
          const errStep = steps.find(s => s.type === 'CORTEX_STEP_TYPE_ERROR_MESSAGE');
          const errorMsg = errStep?.errorMessage?.error?.userErrorMessage || 
                           errStep?.errorMessage?.error?.shortError ||
                           errStep?.errorMessage?.message || 
                           'Cascade encountered an error';
          throw new Error(errorMsg);
        }
      }
    } catch (pollErr) {
      if (pollErr.message.includes('exhausted') || pollErr.message.includes('quota') || pollErr.message.includes('capacity')) {
        throw pollErr;
      }
    }
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

            case "runAIPipeline": {
              const { nodes, connections } = message.payload;
              const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
              if (!workspaceFolder) {
                vscode.window.showErrorMessage("No workspace open to run pipeline.");
                break;
              }

              (async () => {
                try {
                  const tiers = {};
                  nodes.forEach(n => { tiers[n.id] = 1; });
                  
                  let changed = true;
                  let iterations = 0;
                  const maxIterations = nodes.length + 2;
                  while (changed && iterations < maxIterations) {
                    changed = false;
                    iterations++;
                    connections.forEach(conn => {
                      const sourceTier = tiers[conn.sourceId] || 1;
                      const targetTier = tiers[conn.targetId] || 1;
                      if (targetTier <= sourceTier) {
                        tiers[conn.targetId] = sourceTier + 1;
                        changed = true;
                      }
                    });
                  }

                  const nodesByTier = {};
                  nodes.forEach(n => {
                    const t = tiers[n.id] || 1;
                    if (!nodesByTier[t]) nodesByTier[t] = [];
                    nodesByTier[t].push(n);
                  });

                  const activeTiers = Object.keys(nodesByTier).map(Number).sort((a, b) => a - b);
                  const steps = [];
                  
                  activeTiers.forEach(t => {
                    nodesByTier[t].forEach(node => {
                      steps.push({ node, tier: t, phase: 1 });
                    });
                  });

                  activeTiers.forEach(t => {
                    nodesByTier[t].forEach(node => {
                      steps.push({ node, tier: t, phase: 2 });
                    });
                  });

                  const runReport = [
                    `# AI Feeder Pipeline Antigravity Run`,
                    `Executed At: ${new Date().toLocaleString()}`,
                    `Total Nodes: ${nodes.length}`,
                    `Total Connection Wires: ${connections.length}`,
                    `Tiers Detected: ${activeTiers.join(", ")}`,
                    `---`,
                    ``
                  ];

                  const logs = [];
                  const timestampStart = new Date().toLocaleTimeString();
                  logs.push(`[${timestampStart}] Initializing Antigravity Agent Feeder Pipeline...`);
                  logs.push(`[${timestampStart}] Discovered ${activeTiers.length} tier(s). Preparing ${steps.length} sequential execution stages.`);

                  panel.webview.postMessage({
                    type: "pipelineProgressUpdate",
                    payload: {
                      currentPhase: "Phase 1: Design Specs",
                      currentFile: steps[0].node.name,
                      currentTier: steps[0].tier,
                      stepIndex: 0,
                      totalSteps: steps.length,
                      log: [...logs],
                      trajectorySteps: []
                    }
                  });

                  for (let i = 0; i < steps.length; i++) {
                    const { node, tier, phase } = steps[i];
                    const nodeImports = connections
                      .filter(c => c.targetId === node.id)
                      .map(c => {
                        const s = nodes.find(n => n.id === c.sourceId);
                        return s ? `/${s.path ? s.path + "/" : ""}${s.name}.${s.extension}` : null;
                      }).filter(Boolean);

                    const nodeExports = connections
                      .filter(c => c.sourceId === node.id)
                      .map(c => {
                        const t = nodes.find(n => n.id === c.targetId);
                        return t ? `/${t.path ? t.path + "/" : ""}${t.name}.${t.extension}` : null;
                      }).filter(Boolean);

                    const phaseName = phase === 1 ? "Phase 1: Design Specs" : "Phase 2: Coder Implementation";
                    const fileWithExt = `${node.name}.${node.extension}`;
                    const relativePath = `/${node.path ? node.path + "/" : ""}${fileWithExt}`;
                    
                    const logTimestamp = new Date().toLocaleTimeString();
                    logs.push(`[${logTimestamp}] [Tier ${tier}] Initiating ${phaseName} on '${relativePath}' via Antigravity...`);

                    panel.webview.postMessage({
                      type: "pipelineProgressUpdate",
                      payload: {
                        currentPhase: phaseName,
                        currentFile: fileWithExt,
                        currentTier: tier,
                        stepIndex: i,
                        totalSteps: steps.length,
                        log: [...logs],
                        trajectorySteps: []
                      }
                    });

                    let prompt = "";
                    if (phase === 1) {
                      prompt = `You are a specialized Software Architecture Agent. Your role is to read developer specifications and construct a formal design structure/JSON specification for:
Target File: ${relativePath}
Description/Notes: "${node.description || "No description provided."}"
Imports (incoming dependencies): [${nodeImports.join(", ")}]
Exports (outgoing dependencies): [${nodeExports.join(", ")}]

Please:
1. Examine the imports and existing project structure.
2. Formulate a comprehensive design specification detailing functions, properties, signatures, and logic flow.
3. Save/update a JSON specification containing these details inside the project space (e.g. under a directory like \`.layoutica/specs/${node.name}.json\`). Do not block for human approval; write the file directly.`;
                    } else {
                      prompt = `You are a senior Software Engineer agent. Your task is to write clean, warning-free, and type-safe code matching a detailed layout specification:
Target File: ${relativePath}
Description/Notes: "${node.description || "No description provided."}"
Imports (incoming dependencies): [${nodeImports.join(", ")}]
Exports (outgoing dependencies): [${nodeExports.join(", ")}]

Please:
1. Read the specification under \`.layoutica/specs/${node.name}.json\` if available, or infer the layout logic based on developer notes and imports/exports.
2. Implement the full TypeScript code for ${relativePath}. Ensure the file imports functions properly and exports required handlers.
3. Save the code directly to: \`${path.join(workspaceFolder.uri.fsPath, node.path || "", fileWithExt)}\`.
4. Run a verification check (e.g., \`npm run build\` or typescript compilation) using command execution tools to prove your implementation compiles without warnings or errors. If there are compilation issues, repair them.`;
                    }

                    runReport.push(`\n### Step ${i + 1}: ${phaseName} for \`${relativePath}\` [Tier ${tier}]`);
                    runReport.push(`* **Prompt Sent**: ${prompt}`);

                    try {
                      const responseText = await runAntigravityTask(prompt, (update) => {
                        panel.webview.postMessage({
                          type: "pipelineProgressUpdate",
                          payload: {
                            currentPhase: phaseName,
                            currentFile: fileWithExt,
                            currentTier: tier,
                            stepIndex: i,
                            totalSteps: steps.length,
                            log: [...logs],
                            trajectorySteps: update.steps || []
                          }
                        });
                      });

                      const finishTimestamp = new Date().toLocaleTimeString();
                      logs.push(`[${finishTimestamp}] Successfully completed '${fileWithExt}' phase ${phase}.`);
                      runReport.push(`* **Response/Result**:\n${responseText}`);
                    } catch (taskErr) {
                      const errTimestamp = new Date().toLocaleTimeString();
                      logs.push(`[${errTimestamp}] Error in ${phaseName} on '${fileWithExt}': ${taskErr.message}`);
                      runReport.push(`* **Error**: ${taskErr.message}`);
                    }
                  }

                  const pipelineDir = path.join(workspaceFolder.uri.fsPath, ".layoutica", "ai_pipeline");
                  if (!fs.existsSync(pipelineDir)) {
                    fs.mkdirSync(pipelineDir, { recursive: true });
                  }
                  fs.writeFileSync(path.join(pipelineDir, "debug_run.md"), runReport.join("\n"), "utf8");

                  const endTimestamp = new Date().toLocaleTimeString();
                  logs.push(`[${endTimestamp}] Pipeline run finished. Report written to .layoutica/ai_pipeline/debug_run.md.`);

                  panel.webview.postMessage({
                    type: "pipelineProgressUpdate",
                    payload: {
                      currentPhase: "complete",
                      currentFile: "",
                      currentTier: 0,
                      stepIndex: steps.length,
                      totalSteps: steps.length,
                      log: [...logs],
                      trajectorySteps: []
                    }
                  });
                } catch (pipelineErr) {
                  vscode.window.showErrorMessage(`Pipeline Run Failed: ${pipelineErr.message}`);
                }
              })();
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
