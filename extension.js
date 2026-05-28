import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

import { exec } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        (message) => {
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
          }
        },
        undefined,
        context.subscriptions
      );
    }
  );

  context.subscriptions.push(openCommand);
}

export function deactivate() {}
