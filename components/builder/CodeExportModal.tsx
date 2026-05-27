"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getVsCodeApi } from "@/lib/builder/vscode";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  Download,
  Copy,
  Check,
  X,
  Terminal,
  ChevronRight,
  Folder,
  FolderOpen,
  Package,
  ArrowUpRight,
  FileText,
} from "lucide-react";

interface Props {
  files: Record<string, string>;
  onClose: () => void;
}

const PROJECT_NAME = "my-layoutica-site";
const NEXT_VERSION = "15.0.0";
const REACT_VERSION = "^19";
const TAILWIND_VERSION = "^3.4.1";

const codeTheme: Record<string, React.CSSProperties> = {
  'code[class*="language-"]': {
    color: "#cbd5e1",
    background: "none",
    fontSize: 12.5,
    lineHeight: "1.75",
    whiteSpace: "pre",
  },
  'pre[class*="language-"]': {
    color: "#cbd5e1",
    background: "none",
    margin: 0,
    padding: 0,
  },
  comment: { color: "#64748b", fontStyle: "italic" },
  prolog: { color: "#64748b" },
  doctype: { color: "#64748b" },
  cdata: { color: "#64748b" },
  punctuation: { color: "#94a3b8" },
  property: { color: "#7dd3fc" },
  tag: { color: "#7dd3fc" },
  boolean: { color: "#f87171" },
  number: { color: "#fb923c" },
  constant: { color: "#fb923c" },
  symbol: { color: "#fb923c" },
  selector: { color: "#86efac" },
  "attr-name": { color: "#93c5fd" },
  string: { color: "#86efac" },
  char: { color: "#86efac" },
  builtin: { color: "#67e8f9" },
  operator: { color: "#94a3b8" },
  entity: { color: "#94a3b8", cursor: "help" },
  url: { color: "#86efac" },
  variable: { color: "#cbd5e1" },
  inserted: { color: "#86efac" },
  atrule: { color: "#93c5fd" },
  "attr-value": { color: "#86efac" },
  keyword: { color: "#c084fc" },
  function: { color: "#67e8f9" },
  "class-name": { color: "#93c5fd" },
  regex: { color: "#86efac" },
  important: { color: "#f87171", fontWeight: "bold" },
  deleted: { color: "#f87171" },
};

function buildBoilerplate(): Record<string, string> {
  const pkg = {
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
      "react-dom": REACT_VERSION,
      "react-syntax-highlighter": "^15.5.0",
    },
    devDependencies: {
      "@types/node": "^20",
      "@types/react": "^19",
      "@types/react-dom": "^19",
      autoprefixer: "^10.0.1",
      postcss: "^8",
      tailwindcss: TAILWIND_VERSION,
      typescript: "^5",
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
    "package.json": JSON.stringify(pkg, null, 2),
    "tsconfig.json": JSON.stringify(tsconfig, null, 2),
    "next.config.ts": `import type { NextConfig } from "next";\n\nconst nextConfig: NextConfig = {};\n\nexport default nextConfig;\n`,
    "postcss.config.js": `module.exports = {\n  plugins: { tailwindcss: {}, autoprefixer: {} },\n};\n`,
    "tailwind.config.ts": `import type { Config } from "tailwindcss";\n\nexport default {\n  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],\n  theme: { extend: {} },\n  plugins: [],\n} satisfies Config;\n`,
    ".gitignore": `/node_modules\n/.next/\n/out/\n.DS_Store\n*.pem\n.env*.local\n.vercel\n*.tsbuildinfo\nnext-env.d.ts\n`,
  };
}

function formatBytes(str: string): string {
  const bytes = new Blob([str]).size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function totalSize(files: Record<string, string>): string {
  const bytes = Object.values(files).reduce(
    (a, v) => a + new Blob([v]).size,
    0,
  );
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

function getLanguage(path: string): string {
  if (path.endsWith(".tsx") || path.endsWith(".ts")) return "tsx";
  if (path.endsWith(".js") || path.endsWith(".mjs")) return "javascript";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".css")) return "css";
  return "typescript";
}

function getFileAccent(path: string): string {
  if (path.startsWith("src/components/")) return "#c084fc";
  if (path.startsWith("src/app/") && path.endsWith(".tsx")) return "#60a5fa";
  if (path.endsWith(".css")) return "#86efac";
  if (path.endsWith(".json")) return "#67e8f9";
  return "rgba(255,255,255,0.4)";
}

function getFileType(path: string): string {
  if (path.endsWith(".tsx")) return "TSX";
  if (path.endsWith(".ts")) return "TS";
  if (path.endsWith(".json")) return "JSON";
  if (path.endsWith(".css")) return "CSS";
  if (path.endsWith(".js")) return "JS";
  if (path.endsWith(".gitignore")) return "GIT";
  return "TXT";
}

async function downloadZip(allFiles: Record<string, string>, name: string) {
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

  const vscode = getVsCodeApi();
  if (vscode) {
    const base64 = await zip.generateAsync({ type: "base64" });
    const filename = `${name.toLowerCase().replace(/[^a-z0-9]/gi, "-")}.zip`;
    vscode.postMessage({
      type: "exportZip",
      payload: {
        base64,
        filename,
      },
    });
    return;
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.toLowerCase().replace(/[^a-z0-9]/gi, "-")}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
}

function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const path of paths) {
    const parts = path.split("/");
    let nodes = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isDir = i < parts.length - 1;
      let node = nodes.find((n) => n.name === name);
      if (!node) {
        node = {
          name,
          path: parts.slice(0, i + 1).join("/"),
          isDir,
          children: [],
        };
        nodes.push(node);
      }
      nodes = node.children;
    }
  }
  return root;
}

function TreeItem({
  node,
  depth,
  activeFile,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  activeFile: string;
  onSelect: (p: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const isActive = activeFile === node.path;
  const accent = getFileAccent(node.path);

  if (node.isDir) {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="cem-tree-dir w-full flex items-center gap-1.5 cursor-pointer rounded"
          style={{
            padding: "4px 8px",
            paddingLeft: depth * 14 + 8,
            border: "none",
            background: "transparent",
          }}
        >
          {open ? (
            <FolderOpen
              size={11}
              style={{ color: "#60a5fa", opacity: 0.7, flexShrink: 0 }}
            />
          ) : (
            <Folder
              size={11}
              style={{ color: "#60a5fa", opacity: 0.5, flexShrink: 0 }}
            />
          )}
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,0.55)",
              whiteSpace: "nowrap",
            }}
          >
            {node.name}
          </span>
        </button>
        {open &&
          node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              activeFile={activeFile}
              onSelect={onSelect}
            />
          ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node.path)}
      className="cem-tree-file w-full flex items-center gap-2 cursor-pointer rounded"
      style={{
        padding: "4px 8px",
        paddingLeft: depth * 14 + 8,
        border: "none",
        textAlign: "left",
        background: isActive ? "rgba(96,165,250,0.1)" : "transparent",
      }}
    >
      <span
        style={{
          width: 2,
          height: 12,
          borderRadius: 1,
          flexShrink: 0,
          background: isActive ? accent : "rgba(255,255,255,0.15)",
          transition: "background 0.12s",
        }}
      />
      <span
        style={{
          fontSize: 11,
          fontWeight: isActive ? 600 : 400,
          color: isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.55)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
          transition: "color 0.12s",
        }}
      >
        {node.name}
      </span>
      {isActive && (
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: accent,
            background: "rgba(255,255,255,0.06)",
            padding: "1px 4px",
            borderRadius: 3,
            flexShrink: 0,
          }}
        >
          {getFileType(node.path)}
        </span>
      )}
    </button>
  );
}

function Breadcrumb({ path }: { path: string }) {
  const parts = path.split("/");
  return (
    <div className="flex items-center gap-1 min-w-0 overflow-hidden">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1 min-w-0">
          {i > 0 && (
            <ChevronRight
              size={9}
              style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0 }}
            />
          )}
          <span
            style={{
              fontSize: 11,
              fontWeight: i === parts.length - 1 ? 600 : 400,
              color:
                i === parts.length - 1
                  ? "rgba(255,255,255,0.75)"
                  : "rgba(255,255,255,0.4)",
              whiteSpace: "nowrap",
              fontFamily: "monospace",
              overflow: i === parts.length - 1 ? "hidden" : "visible",
              textOverflow: "ellipsis",
            }}
          >
            {part}
          </span>
        </span>
      ))}
    </div>
  );
}

export default function CodeExportModal({ files, onClose }: Props) {
  const [tab, setTab] = useState<"download" | "browse">("download");
  const [activeFile, setActiveFile] = useState(Object.keys(files)[0] ?? "");
  const [copied, setCopied] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [dlError, setDlError] = useState<string | null>(null);

  const BOILERPLATE = useMemo(() => buildBoilerplate(), []);
  const allFiles = useMemo(
    () => ({ ...BOILERPLATE, ...files }),
    [BOILERPLATE, files],
  );
  const generatedPaths = Object.keys(files);
  const componentCount = generatedPaths.filter((f) =>
    f.startsWith("src/components/"),
  ).length;
  const pageCount = generatedPaths.filter(
    (f) => f.startsWith("src/app/") && f.endsWith(".tsx"),
  ).length;
  const totalSizeStr = totalSize(allFiles);
  const tree = useMemo(() => buildTree(generatedPaths), [generatedPaths]);
  const activeContent = allFiles[activeFile] ?? "";
  const lineCount = activeContent.split("\n").length;
  const language = getLanguage(activeFile);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  useEffect(() => {
    if (tab === "browse" && !files[activeFile] && generatedPaths.length > 0)
      setActiveFile(generatedPaths[0]);
  }, [tab]);

  const copy = useCallback((key: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);

  const copyAll = useCallback(() => {
    // Copy without file headers so the output can be pasted directly
    const text = generatedPaths.map((f) => files[f]).join("\n\n");
    copy("__all__", text);
  }, [generatedPaths, files, copy]);

  const handleDownload = async () => {
    setDownloading(true);
    setDlError(null);
    try {
      await downloadZip(allFiles, PROJECT_NAME);
    } catch (e: any) {
      setDlError(e.message ?? "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes cem-in { from { opacity:0; transform:translateY(8px) scale(0.985) } to { opacity:1; transform:none } }
        .cem-overlay { animation: cem-in 0.2s cubic-bezier(0.16,1,0.3,1) }
        .cem-tree-dir:hover { background: rgba(255,255,255,0.05) !important }
        .cem-tree-file:hover { background: rgba(96,165,250,0.07) !important }
        .cem-file-row:hover { background: rgba(255,255,255,0.05) !important; border-color: rgba(255,255,255,0.1) !important }
        .cem-tab:hover:not(.cem-tab-active) { color: rgba(255,255,255,0.65) !important; background: rgba(255,255,255,0.05) !important }
        .cem-btn-ghost:hover { background: rgba(255,255,255,0.08) !important; color: rgba(255,255,255,0.7) !important }
        .cem-btn-outline:hover { background: rgba(255,255,255,0.07) !important; border-color: rgba(255,255,255,0.2) !important; color: rgba(255,255,255,0.75) !important }
        .cem-btn-primary:hover { opacity: 0.88 }
        ::-webkit-scrollbar { width: 4px; height: 4px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.18) }
      `}</style>

      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)" }}
        onClick={onClose}
      >
        <div
          className="cem-overlay flex overflow-hidden"
          style={{
            background: "var(--panel-bg)",
            border: "1px solid var(--panel-border)",
            borderRadius: 16,
            boxShadow: "0 40px 100px rgba(0,0,0,0.8)",
            width: "min(1020px, 96vw)",
            height: "min(640px, 90vh)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sidebar */}
          <div
            className="flex flex-col shrink-0"
            style={{
              width: 210,
              borderRight: "1px solid var(--panel-border)",
              background: "var(--app-bg)",
            }}
          >
            <div
              style={{
                padding: "16px 14px 12px",
                borderBottom: "1px solid var(--panel-border)",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    flexShrink: 0,
                    background: "rgba(96,165,250,0.12)",
                    border: "1px solid rgba(96,165,250,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Package size={12} style={{ color: "#60a5fa" }} />
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.8)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Export
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {pageCount > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#60a5fa",
                      background: "rgba(96,165,250,0.1)",
                      border: "1px solid rgba(96,165,250,0.2)",
                      padding: "2px 7px",
                      borderRadius: 5,
                    }}
                  >
                    {pageCount} {pageCount === 1 ? "Page" : "Pages"}
                  </span>
                )}
                {componentCount > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#c084fc",
                      background: "rgba(192,132,252,0.1)",
                      border: "1px solid rgba(192,132,252,0.2)",
                      padding: "2px 7px",
                      borderRadius: 5,
                    }}
                  >
                    {componentCount}{" "}
                    {componentCount === 1 ? "Component" : "Components"}
                  </span>
                )}
              </div>
            </div>

            <div style={{ padding: "8px 8px 4px" }}>
              {(["download", "browse"] as const).map((id) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`cem-tab ${tab === id ? "cem-tab-active" : ""} w-full flex items-center gap-2 cursor-pointer transition-all rounded-lg`}
                  style={{
                    padding: "7px 10px",
                    border: "none",
                    marginBottom: 5,
                    background:
                      tab === id ? "rgba(96,165,250,0.1)" : "transparent",
                    color:
                      tab === id
                        ? "rgba(255,255,255,0.88)"
                        : "rgba(255,255,255,0.45)",
                    borderBottom:
                      tab === id
                        ? "2px solid rgba(96,165,250,0.6)"
                        : "2px solid transparent",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      opacity: tab === id ? 1 : 0.5,
                      color: tab === id ? "#60a5fa" : "inherit",
                    }}
                  >
                    {id === "download" ? (
                      <Download size={11} />
                    ) : (
                      <FileText size={11} />
                    )}
                  </span>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: tab === id ? 600 : 400,
                    }}
                  >
                    {id === "download" ? "Download" : "Browse files"}
                  </span>
                </button>
              ))}
            </div>

            {tab === "browse" && (
              <div
                className="flex-1 overflow-y-auto min-h-0"
                style={{ padding: "4px 6px 16px" }}
              >
                {tree.map((node) => (
                  <TreeItem
                    key={node.path}
                    node={node}
                    depth={0}
                    activeFile={activeFile}
                    onSelect={setActiveFile}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Main pane */}
          <div className="flex flex-col flex-1 min-w-0">
            <div
              className="flex items-center shrink-0 gap-3"
              style={{
                padding: "10px 18px",
                borderBottom: "1px solid var(--panel-border)",
                minHeight: 50,
              }}
            >
              <div className="flex-1 min-w-0">
                {tab === "download" ? (
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.8)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Download project
                  </p>
                ) : (
                  <Breadcrumb path={activeFile || "—"} />
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {tab === "browse" && activeContent && (
                  <>
                    <span
                      style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,0.35)",
                        fontFamily: "monospace",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {lineCount}L · {formatBytes(activeContent)}
                    </span>
                    <div
                      style={{
                        width: 1,
                        height: 14,
                        background: "rgba(255,255,255,0.1)",
                      }}
                    />
                    <button
                      onClick={copyAll}
                      className="cem-btn-outline flex items-center gap-1.5 cursor-pointer transition-all"
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        padding: "4px 10px",
                        borderRadius: 6,
                        color:
                          copied === "__all__"
                            ? "#86efac"
                            : "rgba(255,255,255,0.5)",
                        background: "transparent",
                        border: `1px solid ${copied === "__all__" ? "rgba(134,239,172,0.25)" : "rgba(255,255,255,0.12)"}`,
                      }}
                    >
                      {copied === "__all__" ? (
                        <Check size={10} />
                      ) : (
                        <Copy size={10} />
                      )}
                      Copy all
                    </button>
                    <button
                      onClick={() => copy(activeFile, activeContent)}
                      className="cem-btn-primary flex items-center gap-1.5 cursor-pointer transition-all"
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "4px 12px",
                        borderRadius: 6,
                        border: "none",
                        background:
                          copied === activeFile ? "#86efac" : "#3b82f6",
                        color: copied === activeFile ? "#0c0d0f" : "#fff",
                      }}
                    >
                      {copied === activeFile ? (
                        <Check size={10} />
                      ) : (
                        <Copy size={10} />
                      )}
                      {copied === activeFile ? "Copied!" : "Copy"}
                    </button>
                  </>
                )}
                {tab === "download" && (
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="cem-btn-primary flex items-center gap-1.5 cursor-pointer transition-all"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "4px 14px",
                      borderRadius: 6,
                      border: "none",
                      background: downloading
                        ? "rgba(255,255,255,0.07)"
                        : "#3b82f6",
                      color: downloading ? "rgba(255,255,255,0.35)" : "#fff",
                    }}
                  >
                    <Download size={11} />
                    {downloading ? "Zipping…" : "Download .zip"}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="cem-btn-ghost flex items-center justify-center cursor-pointer transition-all"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "transparent",
                    color: "rgba(255,255,255,0.35)",
                  }}
                  title="Close (Esc)"
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            <div
              className="flex-1 overflow-auto min-h-0"
              style={{ background: tab === "browse" ? "var(--app-bg)" : "var(--panel-bg)" }}
            >
              {tab === "browse" &&
                (activeContent ? (
                  <div
                    style={{
                      display: "flex",
                      minHeight: "100%",
                      padding: "18px 0",
                    }}
                  >
                    <div
                      style={{
                        userSelect: "none",
                        flexShrink: 0,
                        padding: "0 14px 0 20px",
                        textAlign: "right",
                        borderRight: "1px solid var(--panel-border)",
                      }}
                    >
                      {activeContent.split("\n").map((_, i) => (
                        <div
                          key={i}
                          style={{
                            fontSize: 12,
                            lineHeight: "1.75",
                            color: "rgba(255,255,255,0.2)",
                            fontFamily: "monospace",
                          }}
                        >
                          {i + 1}
                        </div>
                      ))}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        paddingLeft: 18,
                        paddingRight: 24,
                        overflow: "auto",
                      }}
                    >
                      <SyntaxHighlighter
                        language={language}
                        style={codeTheme}
                        customStyle={{
                          background: "none",
                          margin: 0,
                          padding: 0,
                          fontSize: 12.5,
                          lineHeight: "1.75",
                          fontFamily: "'JetBrains Mono','Fira Code',monospace",
                        }}
                        wrapLongLines={false}
                        showLineNumbers={false}
                        PreTag="div"
                      >
                        {activeContent}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex flex-col items-center justify-center h-full gap-2"
                    style={{ color: "rgba(255,255,255,0.25)" }}
                  >
                    <FileText size={24} style={{ opacity: 0.4 }} />
                    <p style={{ fontSize: 12 }}>Select a file</p>
                  </div>
                ))}

              {tab === "download" && (
                <div
                  style={{
                    padding: "22px 24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      background: "rgba(59,130,246,0.08)",
                      border: "1px solid rgba(59,130,246,0.22)",
                      borderRadius: 12,
                      padding: "18px 20px",
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "rgba(255,255,255,0.85)",
                            letterSpacing: "-0.02em",
                            marginBottom: 5,
                          }}
                        >
                          {PROJECT_NAME}.zip
                        </p>
                        <p
                          style={{
                            fontSize: 11,
                            color: "rgba(255,255,255,0.45)",
                            lineHeight: 1.6,
                          }}
                        >
                          Next.js {NEXT_VERSION} · React {REACT_VERSION} ·
                          Tailwind {TAILWIND_VERSION} · TypeScript
                        </p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#60a5fa",
                            fontFamily: "monospace",
                          }}
                        >
                          {totalSizeStr}
                        </p>
                        <p
                          style={{
                            fontSize: 10,
                            color: "rgba(255,255,255,0.35)",
                            marginTop: 2,
                          }}
                        >
                          {Object.keys(allFiles).length} files
                        </p>
                      </div>
                    </div>
                    {dlError && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#f87171",
                          background: "rgba(248,113,113,0.07)",
                          border: "1px solid rgba(248,113,113,0.18)",
                          padding: "7px 11px",
                          borderRadius: 7,
                          marginTop: 12,
                        }}
                      >
                        ⚠ {dlError}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid #383838",
                        borderRadius: 12,
                        padding: "16px 18px",
                      }}
                    >
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "rgba(255,255,255,0.4)",
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
                          gap: 11,
                        }}
                      >
                        {[
                          { n: 1, text: "Unzip the project folder" },
                          { n: 2, text: "Open in VS Code or Cursor" },
                          { n: 3, cmd: "npm install" },
                          { n: 4, cmd: "npm run dev" },
                          { n: 5, text: "Open localhost:3000" },
                        ].map(({ n, text, cmd }) => (
                          <div key={n} className="flex items-center gap-3">
                            <span
                              style={{
                                width: 17,
                                height: 17,
                                borderRadius: 5,
                                flexShrink: 0,
                                background: "rgba(96,165,250,0.09)",
                                border: "1px solid rgba(96,165,250,0.2)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 9,
                                fontWeight: 700,
                                color: "rgba(96,165,250,0.7)",
                                fontFamily: "monospace",
                              }}
                            >
                              {n}
                            </span>
                            {cmd ? (
                              <div className="flex items-center gap-1.5">
                                <Terminal
                                  size={10}
                                  style={{
                                    color: "rgba(103,232,249,0.55)",
                                    flexShrink: 0,
                                  }}
                                />
                                <code
                                  style={{
                                    fontSize: 11.5,
                                    color: "#67e8f9",
                                    background: "rgba(103,232,249,0.07)",
                                    padding: "2px 7px",
                                    borderRadius: 5,
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {cmd}
                                </code>
                              </div>
                            ) : (
                              <span
                                style={{
                                  fontSize: 11,
                                  color: "rgba(255,255,255,0.6)",
                                }}
                              >
                                {text}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid #383838",
                        borderRadius: 12,
                        padding: "16px 14px",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "rgba(255,255,255,0.4)",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          marginBottom: 10,
                          paddingLeft: 4,
                        }}
                      >
                        Generated files
                      </p>
                      <div
                        className="flex-1 overflow-y-auto"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 1,
                        }}
                      >
                        {generatedPaths.map((path) => (
                          <button
                            key={path}
                            onClick={() => {
                              setTab("browse");
                              setActiveFile(path);
                            }}
                            className="cem-file-row flex items-center gap-2 cursor-pointer transition-all w-full text-left rounded-lg"
                            style={{
                              padding: "5px 8px",
                              background: "transparent",
                              border: "1px solid transparent",
                            }}
                          >
                            <span
                              style={{
                                width: 3,
                                height: 3,
                                borderRadius: 2,
                                background: getFileAccent(path),
                                opacity: 0.8,
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                fontSize: 10.5,
                                color: "rgba(255,255,255,0.6)",
                                fontFamily: "monospace",
                                flex: 1,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {path.split("/").pop()}
                            </span>
                            <span
                              style={{
                                fontSize: 9,
                                color: "rgba(255,255,255,0.3)",
                                flexShrink: 0,
                                fontFamily: "monospace",
                              }}
                            >
                              {formatBytes(files[path] ?? "")}
                            </span>
                            <ArrowUpRight
                              size={9}
                              style={{
                                color: "rgba(255,255,255,0.25)",
                                flexShrink: 0,
                              }}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              className="flex items-center justify-between shrink-0"
              style={{
                padding: "5px 18px",
                borderTop: "1px solid #383838",
                background: "#262626",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.3)",
                  fontFamily: "monospace",
                }}
              >
                Node.js 18+
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.3)",
                  fontFamily: "monospace",
                }}
              >
                {tab === "browse" && activeFile
                  ? `${lineCount}L · ${language.toUpperCase()}`
                  : `${generatedPaths.length} files · ${totalSizeStr}`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
