import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import * as http from "http";
import { fileURLToPath } from "url";
import { exec } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let isInitializingNextApp = false;
let activeLayouticaDir = null;

let previewServer = null;
let previewPort = 0;
const previewPagesMap = new Map();

function getPreviewServer() {
  if (previewServer && previewPort > 0) {
    return Promise.resolve(previewPort);
  }
  return new Promise((resolve) => {
    const candidatePorts = [34111, 34112, 34113, 34114, 34115];
    let candidateIndex = 0;

    const tryNext = () => {
      const targetPort = candidatePorts[candidateIndex] !== undefined ? candidatePorts[candidateIndex] : 0;
      const srv = http.createServer((req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Type", "text/html; charset=utf-8");

        const urlObj = new URL(req.url, "http://127.0.0.1");
        let pathname = decodeURIComponent(urlObj.pathname);
        if (pathname.length > 1 && pathname.endsWith("/")) {
          pathname = pathname.slice(0, -1);
        }

        if (pathname === "/favicon.ico") {
          res.writeHead(204);
          res.end();
          return;
        }

        let html = previewPagesMap.get(pathname);
        if (!html && pathname !== "/") {
          html = previewPagesMap.get("/" + pathname) || previewPagesMap.get(pathname.replace(/^\//, ""));
        }
        if (!html) {
          html = previewPagesMap.get("/") || previewPagesMap.get("");
        }

        // Check fallback preview file if map is empty
        if (!html) {
          try {
            const fallbackPath = path.join(os.tmpdir(), "layoutica_preview.html");
            if (fs.existsSync(fallbackPath)) {
              html = fs.readFileSync(fallbackPath, "utf8");
            }
          } catch (e) {}
        }

        if (html) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(html);
        } else {
          res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<html><body style='font-family:sans-serif;background:#09090b;color:#fff;padding:40px;text-align:center;'><h2>Page not found</h2><p><a href='/' style='color:#a78bfa;'>Go to Home</a></p></body></html>");
        }
      });

      srv.once("error", (err) => {
        try { srv.close(); } catch (e) {}
        candidateIndex++;
        if (candidateIndex <= candidatePorts.length) {
          console.warn(`[Layoutica Preview Server] Port ${targetPort} busy, trying next port...`);
          tryNext();
        } else {
          console.error("[Layoutica Preview Server] All candidate ports busy:", err);
          resolve(0);
        }
      });

      srv.listen(targetPort, "127.0.0.1", () => {
        previewServer = srv;
        const addr = srv.address();
        previewPort = typeof addr === "object" && addr ? addr.port : targetPort;
        console.log(`[Layoutica Preview Server] Running at http://127.0.0.1:${previewPort}`);
        try {
          fs.writeFileSync(path.join(os.tmpdir(), "layoutica_preview_port.txt"), String(previewPort), "utf8");
        } catch (e) {}
        resolve(previewPort);
      });
    };

    tryNext();
  });
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
                const files = await vscode.workspace.findFiles("**/.layoutica/ui_layout.json", "**/node_modules/**", 1);
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

            case "openPreviewInBrowser": {
              const { pages = [], slug = "/" } = message.payload || {};
              previewPagesMap.clear();
              for (const p of pages) {
                let s = p.slug || "/";
                if (!s.startsWith("/")) s = "/" + s;
                if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
                previewPagesMap.set(s, p.html);
              }
              try {
                const port = await getPreviewServer();
                let targetPath = slug || "/";
                if (!targetPath.startsWith("/")) targetPath = "/" + targetPath;
                const previewUrl = `http://127.0.0.1:${port}${targetPath === "/" ? "" : targetPath}`;
                await vscode.env.openExternal(vscode.Uri.parse(previewUrl));
              } catch (err) {
                console.error("[Layoutica Preview] Failed to open external preview:", err);
                vscode.window.showErrorMessage(`Failed to open preview in browser: ${err.message}`);
              }
              break;
            }
          }
        },
        undefined,
        context.subscriptions
      );
    }
  );

  context.subscriptions.push(openCommand);
}

export function deactivate() {
  if (previewServer) {
    try {
      previewServer.close();
    } catch (e) {}
  }
}
