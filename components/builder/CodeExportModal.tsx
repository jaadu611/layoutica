"use client";

import { useState } from "react";
import { Download, Copy, Check, FileCode, X } from "lucide-react";

interface Props {
  files: Record<string, string>;
  onClose: () => void;
}

const PROJECT_NAME = "my-layoutica-site";
const NEXT_VERSION = "16.0.0";
const REACT_VERSION = "^19";
const REACT_DOM_VERSION = "^19";
const TAILWIND_VERSION = "^3.4.1";
const TYPESCRIPT_VERSION = "^5";

function buildBoilerplate(
  generatedFiles: Record<string, string>,
): Record<string, string> {
  const packageJson = {
    name: PROJECT_NAME,
    version: "0.1.0",
    private: true,
    scripts: {
      dev: "next dev",
      build: "next build",
      start: "next start",
      lint: "next lint",
    },
    dependencies: {
      next: NEXT_VERSION,
      react: REACT_VERSION,
      "react-dom": REACT_DOM_VERSION,
    },
    devDependencies: {
      "@types/node": "^20",
      "@types/react": "^19",
      "@types/react-dom": "^19",
      autoprefixer: "^10.0.1",
      postcss: "^8",
      tailwindcss: TAILWIND_VERSION,
      typescript: TYPESCRIPT_VERSION,
    },
  };
  const tsconfig = {
    compilerOptions: {
      target: "ES2017",
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "preserve",
      incremental: true,
      plugins: [{ name: "next" }],
      paths: { "@/*": ["./src/*"] },
    },
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    exclude: ["node_modules"],
  };
  return {
    "package.json": JSON.stringify(packageJson, null, 2),
    "tsconfig.json": JSON.stringify(tsconfig, null, 2),
    "next.config.ts": `import type { NextConfig } from "next";\n\nconst nextConfig: NextConfig = {};\n\nexport default nextConfig;\n`,
    "postcss.config.js": `module.exports = {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n};\n`,
    ".gitignore": `/node_modules\n/.next/\n/out/\n/build\n.DS_Store\n*.pem\nnpm-debug.log*\n.env*.local\n.vercel\n*.tsbuildinfo\nnext-env.d.ts\n`,
  };
}

function formatBytes(str: string) {
  const bytes = new Blob([str]).size;
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

interface FileGroup {
  label: string;
  files: string[];
  color: string;
}

function groupFiles(generatedFiles: string[]): FileGroup[] {
  const components = generatedFiles.filter((f) =>
    f.startsWith("src/components/"),
  );
  const pages = generatedFiles.filter(
    (f) => f.startsWith("src/app/") && f.endsWith(".tsx"),
  );
  const groups: FileGroup[] = [];
  if (components.length > 0)
    groups.push({ label: "Components", files: components, color: "#a78bfa" });
  if (pages.length > 0)
    groups.push({ label: "Pages", files: pages, color: "#60a5fa" });
  return groups;
}

async function downloadZip(allFiles: Record<string, string>) {
  await new Promise<void>((resolve, reject) => {
    if ((window as any).JSZip) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load JSZip"));
    document.head.appendChild(s);
  });
  const zip = new (window as any).JSZip();
  for (const [path, content] of Object.entries(allFiles))
    zip.file(path, content);
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${PROJECT_NAME}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CodeExportModal({ files, onClose }: Props) {
  const [tab, setTab] = useState<"download" | "browse">("download");
  const [activeFile, setActiveFile] = useState(Object.keys(files)[0] || "");
  const [copied, setCopied] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [dlError, setDlError] = useState<string | null>(null);

  const generatedFiles = Object.keys(files);
  const BOILERPLATE = buildBoilerplate(files);
  const allFiles = { ...BOILERPLATE, ...files };

  const componentCount = generatedFiles.filter((f) =>
    f.startsWith("src/components/"),
  ).length;
  const pageCount = generatedFiles.filter(
    (f) => f.startsWith("src/app/") && f.endsWith(".tsx"),
  ).length;
  const fileGroups = groupFiles(generatedFiles);

  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const copyAll = () => {
    const text = generatedFiles
      .map((f) => `// ===== ${f} =====\n\n${files[f]}`)
      .join("\n\n\n");
    copy("__all__", text);
  };

  const handleDownload = async () => {
    setDownloading(true);
    setDlError(null);
    try {
      await downloadZip(allFiles);
    } catch (e: any) {
      setDlError(e.message || "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="flex overflow-hidden"
        style={{
          background: "#0e0e0e",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 16,
          boxShadow: "0 40px 100px rgba(0,0,0,0.7)",
          width: "min(920px, 95vw)",
          height: "min(600px, 88vh)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── SIDEBAR ── */}
        <div
          className="flex flex-col shrink-0"
          style={{
            width: 196,
            borderRight: "1px solid rgba(255,255,255,0.055)",
            background: "#080808",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 16px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.055)",
            }}
          >
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(255,255,255,0.7)",
                letterSpacing: "-0.01em",
              }}
            >
              Export Project
            </p>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {pageCount > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    color: "rgba(96,165,250,0.65)",
                    background: "rgba(96,165,250,0.08)",
                    padding: "2px 7px",
                    borderRadius: 4,
                    fontWeight: 500,
                  }}
                >
                  {pageCount} {pageCount === 1 ? "page" : "pages"}
                </span>
              )}
              {componentCount > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    color: "rgba(167,139,250,0.65)",
                    background: "rgba(167,139,250,0.08)",
                    padding: "2px 7px",
                    borderRadius: 4,
                    fontWeight: 500,
                  }}
                >
                  {componentCount}{" "}
                  {componentCount === 1 ? "component" : "components"}
                </span>
              )}
            </div>
          </div>

          {/* Tab nav */}
          <div
            style={{
              padding: 8,
              borderBottom: "1px solid rgba(255,255,255,0.055)",
            }}
          >
            {[
              {
                id: "download" as const,
                icon: <Download size={12} />,
                label: "Download",
              },
              {
                id: "browse" as const,
                icon: <FileCode size={12} />,
                label: "Browse files",
              },
            ].map(({ id, icon, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="w-full flex items-center gap-2.5 cursor-pointer transition-colors"
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "none",
                  background:
                    tab === id ? "rgba(255,255,255,0.07)" : "transparent",
                  color:
                    tab === id
                      ? "rgba(255,255,255,0.8)"
                      : "rgba(255,255,255,0.28)",
                  marginBottom: 2,
                }}
              >
                <span
                  style={{ opacity: tab === id ? 0.9 : 0.45, display: "flex" }}
                >
                  {icon}
                </span>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>
              </button>
            ))}
          </div>

          {/* File tree */}
          {tab === "browse" && (
            <div
              className="flex-1 overflow-y-auto min-h-0"
              style={{ padding: "8px 8px 12px" }}
            >
              {fileGroups.length === 0 ? (
                <p
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.2)",
                    padding: "12px 8px",
                  }}
                >
                  No files generated.
                </p>
              ) : (
                fileGroups.map((group) => (
                  <div key={group.label} style={{ marginBottom: 12 }}>
                    <p
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: group.color,
                        opacity: 0.45,
                        padding: "4px 8px 6px",
                      }}
                    >
                      {group.label}
                    </p>
                    {group.files.map((name) => {
                      const isActive = activeFile === name;
                      const shortName = name.split("/").pop() ?? name;
                      return (
                        <button
                          key={name}
                          onClick={() => setActiveFile(name)}
                          className="w-full flex items-center gap-2.5 cursor-pointer transition-all"
                          style={{
                            padding: "7px 10px",
                            borderRadius: 7,
                            border: "none",
                            background: isActive
                              ? "rgba(255,255,255,0.07)"
                              : "transparent",
                            marginBottom: 1,
                            textAlign: "left",
                          }}
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: 2,
                              flexShrink: 0,
                              background: isActive
                                ? group.color
                                : "rgba(255,255,255,0.12)",
                              transition: "background 0.15s",
                            }}
                          />
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 500,
                              color: isActive
                                ? "rgba(255,255,255,0.8)"
                                : "rgba(255,255,255,0.38)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              flex: 1,
                            }}
                          >
                            {shortName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <div
            className="flex items-center justify-between shrink-0"
            style={{
              padding: "11px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.055)",
            }}
          >
            <div className="min-w-0 flex-1">
              {tab === "download" ? (
                <>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.75)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Download Project
                  </p>
                  <p
                    style={{
                      fontSize: 10,
                      color: "rgba(255,255,255,0.22)",
                      marginTop: 2,
                    }}
                  >
                    Next.js {NEXT_VERSION} · React {REACT_VERSION} · Tailwind
                    CSS
                  </p>
                </>
              ) : (
                <>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.75)",
                      letterSpacing: "-0.01em",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {activeFile.split("/").pop() || "—"}
                  </p>
                  <p
                    style={{
                      fontSize: 10,
                      color: "rgba(255,255,255,0.2)",
                      marginTop: 2,
                      fontFamily: "monospace",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {activeFile}
                    {files[activeFile] && (
                      <span
                        style={{
                          marginLeft: 8,
                          color: "rgba(255,255,255,0.13)",
                        }}
                      >
                        · {formatBytes(files[activeFile])}
                      </span>
                    )}
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-4">
              {tab === "browse" && (
                <>
                  <button
                    onClick={copyAll}
                    className="flex items-center gap-1.5 cursor-pointer"
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color:
                        copied === "__all__"
                          ? "#4ade80"
                          : "rgba(255,255,255,0.32)",
                      background:
                        copied === "__all__"
                          ? "rgba(74,222,128,0.08)"
                          : "rgba(255,255,255,0.05)",
                      border: `1px solid ${copied === "__all__" ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.07)"}`,
                      padding: "5px 11px",
                      borderRadius: 7,
                    }}
                  >
                    {copied === "__all__" ? (
                      <Check size={11} />
                    ) : (
                      <Copy size={11} />
                    )}
                    {copied === "__all__" ? "Copied" : "Copy all"}
                  </button>
                  <button
                    onClick={() => copy(activeFile, files[activeFile] || "")}
                    className="flex items-center gap-1.5 cursor-pointer"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      background:
                        copied === activeFile
                          ? "#4ade80"
                          : "rgba(255,255,255,0.9)",
                      color: "#0e0e0e",
                      padding: "5px 12px",
                      borderRadius: 7,
                      border: "none",
                    }}
                  >
                    {copied === activeFile ? (
                      <Check size={11} />
                    ) : (
                      <Copy size={11} />
                    )}
                    {copied === activeFile ? "Copied!" : "Copy file"}
                  </button>
                </>
              )}
              {tab === "download" && (
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="flex items-center gap-1.5 cursor-pointer"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    background: downloading
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(255,255,255,0.9)",
                    color: downloading ? "rgba(255,255,255,0.25)" : "#0e0e0e",
                    padding: "5px 14px",
                    borderRadius: 7,
                    border: downloading
                      ? "1px solid rgba(255,255,255,0.07)"
                      : "none",
                  }}
                >
                  <Download size={11} />
                  {downloading ? "Zipping…" : "Download .zip"}
                </button>
              )}
              <button
                onClick={onClose}
                className="flex items-center justify-center cursor-pointer"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.22)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.07)";
                  (e.currentTarget as HTMLElement).style.color =
                    "rgba(255,255,255,0.55)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
                  (e.currentTarget as HTMLElement).style.color =
                    "rgba(255,255,255,0.22)";
                }}
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto min-h-0">
            {tab === "browse" ? (
              <pre
                style={{
                  fontSize: 12,
                  color: "#9ec49a",
                  padding: "24px 28px",
                  fontFamily:
                    "'JetBrains Mono','Fira Code','Cascadia Code',monospace",
                  lineHeight: 1.7,
                  whiteSpace: "pre",
                  margin: 0,
                }}
              >
                {files[activeFile] || "— select a file —"}
              </pre>
            ) : (
              <div style={{ padding: "24px 28px" }} className="space-y-5">
                {/* Steps card */}
                <div
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.065)",
                    borderRadius: 12,
                    padding: "18px 20px",
                  }}
                >
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.35)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: 14,
                    }}
                  >
                    Getting started
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {[
                      { label: "Unzip the downloaded project" },
                      { label: "Open in VS Code or Cursor" },
                      { label: "npm install", code: true },
                      { label: "npm run dev", code: true },
                      { label: "Open localhost:3000" },
                    ].map(({ label, code }, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span
                          style={{
                            fontSize: 10,
                            color: "rgba(255,255,255,0.13)",
                            fontFamily: "monospace",
                            width: 14,
                            textAlign: "right",
                            flexShrink: 0,
                          }}
                        >
                          {i + 1}
                        </span>
                        {code ? (
                          <code
                            style={{
                              fontSize: 11,
                              color: "#93c5fd",
                              background: "rgba(96,165,250,0.07)",
                              padding: "2px 8px",
                              borderRadius: 5,
                              fontFamily: "monospace",
                            }}
                          >
                            {label}
                          </code>
                        ) : (
                          <span
                            style={{
                              fontSize: 11,
                              color: "rgba(255,255,255,0.38)",
                            }}
                          >
                            {label}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Generated files */}
                {fileGroups.length > 0 && (
                  <div>
                    <p
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.18)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        marginBottom: 12,
                      }}
                    >
                      Generated files
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      {fileGroups.map((group) => (
                        <div key={group.label}>
                          <p
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              color: group.color,
                              opacity: 0.45,
                              marginBottom: 6,
                            }}
                          >
                            {group.label}
                          </p>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 2,
                            }}
                          >
                            {group.files.map((name) => (
                              <div
                                key={name}
                                className="flex items-center gap-3"
                                style={{
                                  padding: "7px 12px",
                                  background: "rgba(255,255,255,0.025)",
                                  borderRadius: 8,
                                }}
                              >
                                <span
                                  style={{
                                    width: 4,
                                    height: 4,
                                    borderRadius: 2,
                                    background: group.color,
                                    opacity: 0.45,
                                    flexShrink: 0,
                                  }}
                                />
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: "rgba(255,255,255,0.5)",
                                    fontFamily: "monospace",
                                    flex: 1,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {name}
                                </span>
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: "rgba(255,255,255,0.18)",
                                    flexShrink: 0,
                                  }}
                                >
                                  {formatBytes(files[name] ?? "")}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {dlError && (
                  <p
                    style={{
                      fontSize: 11,
                      color: "#f87171",
                      background: "rgba(248,113,113,0.06)",
                      border: "1px solid rgba(248,113,113,0.18)",
                      padding: "8px 12px",
                      borderRadius: 8,
                    }}
                  >
                    {dlError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between shrink-0"
            style={{
              padding: "7px 20px",
              borderTop: "1px solid rgba(255,255,255,0.055)",
              background: "#080808",
            }}
          >
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.14)" }}>
              {tab === "download"
                ? "Node.js 18+ required"
                : "next/font/google · Tailwind CSS"}
            </p>
            <p
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.14)",
                fontFamily: "monospace",
              }}
            >
              {tab === "download"
                ? "npm install && npm run dev"
                : `${pageCount}p · ${componentCount}c`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
