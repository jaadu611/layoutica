"use client";

import { useState } from "react";

interface Props {
  files: Record<string, string>;
  onClose: () => void;
}

export default function CodeExportModal({ files, onClose }: Props) {
  const fileNames = Object.keys(files);
  const [activeFile, setActiveFile] = useState(fileNames[0] || "");
  const [copied, setCopied] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  if (fileNames.length === 0) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(files[activeFile] || "").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyAll = () => {
    const all = fileNames
      .map((f) => `// ===== ${f} =====\n\n${files[f]}`)
      .join("\n\n\n");
    navigator.clipboard.writeText(all).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    });
  };

  const activeCode = files[activeFile] || "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      <div
        className="flex flex-col overflow-hidden rounded-xl shadow-2xl"
        style={{
          background: "#141414",
          border: "1px solid #2a2a2a",
          width: "min(900px, 95vw)",
          maxHeight: "88vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid #2a2a2a" }}
        >
          <div>
            <h2
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "rgba(255,255,255,0.8)",
              }}
            >
              Export Code
            </h2>
            <p
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.3)",
                marginTop: 2,
              }}
            >
              React + Tailwind CSS · {fileNames.length} file
              {fileNames.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAll}
              style={{
                fontSize: 11,
                color: copiedAll ? "#4ade80" : "rgba(255,255,255,0.45)",
                background: "transparent",
                border: "1px solid #333",
                borderRadius: 5,
                padding: "5px 12px",
                cursor: "pointer",
                transition: "color 0.15s",
              }}
            >
              {copiedAll ? "✓ All copied" : "Copy all files"}
            </button>
            <button
              onClick={handleCopy}
              style={{
                fontSize: 11,
                color: copied ? "#111" : "#111",
                background: copied ? "#4ade80" : "#fff",
                border: "none",
                borderRadius: 5,
                padding: "5px 12px",
                cursor: "pointer",
                fontWeight: 600,
                transition: "background 0.15s",
              }}
            >
              {copied ? "✓ Copied" : "Copy file"}
            </button>
            <button
              onClick={onClose}
              style={{
                fontSize: 16,
                color: "rgba(255,255,255,0.3)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                lineHeight: 1,
                padding: "0 4px",
                marginLeft: 4,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          <div
            className="overflow-y-auto shrink-0"
            style={{
              width: 176,
              borderRight: "1px solid #2a2a2a",
              background: "#111",
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {fileNames.map((name) => {
              const isActive = activeFile === name;
              return (
                <button
                  key={name}
                  onClick={() => setActiveFile(name)}
                  title={name}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "7px 10px",
                    borderRadius: 5,
                    background: isActive
                      ? "rgba(255,255,255,0.1)"
                      : "transparent",
                    border: "none",
                    cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(255,255,255,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "transparent";
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: isActive ? "#fff" : "rgba(255,255,255,0.4)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {name.split("/").pop()}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "rgba(255,255,255,0.2)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      marginTop: 2,
                    }}
                  >
                    {name}
                  </div>
                </button>
              );
            })}
          </div>

          <div
            className="flex-1 overflow-auto"
            style={{ background: "#0d0d0d" }}
          >
            <pre
              style={{
                fontSize: 11,
                color: "#a8c4a2",
                padding: "20px 24px",
                fontFamily:
                  "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                lineHeight: 1.65,
                whiteSpace: "pre",
                margin: 0,
              }}
            >
              {activeCode}
            </pre>
          </div>
        </div>

        <div
          className="flex items-center justify-between px-5 py-2"
          style={{
            borderTop: "1px solid #2a2a2a",
            background: "#111",
          }}
        >
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
            Copy files into a new Next.js project
          </p>
          <p
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.2)",
              fontFamily: "monospace",
            }}
          >
            npm run dev
          </p>
        </div>
      </div>
    </div>
  );
}
