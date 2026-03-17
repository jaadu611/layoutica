"use client";

import { useState } from "react";
import { useBuilderStore } from "@/lib/builder/store";
import { generateAllPages } from "@/lib/builder/codeGenerator";
import CodeExportModal from "./CodeExportModal";

export default function Toolbar() {
  const { pages } = useBuilderStore();
  const [showExport, setShowExport] = useState(false);
  const [exportFiles, setExportFiles] = useState<Record<string, string>>({});

  const handleExport = () => {
    const files = generateAllPages(pages);
    setExportFiles(files);
    setShowExport(true);
  };

  return (
    <>
      <div className="h-11 border-b border-[#2a2a2a] bg-[#141414] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-sm flex items-center justify-center bg-white/10">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="1" width="4" height="4" fill="white" />
              <rect
                x="7"
                y="1"
                width="4"
                height="4"
                fill="white"
                opacity="0.5"
              />
              <rect
                x="1"
                y="7"
                width="4"
                height="4"
                fill="white"
                opacity="0.5"
              />
              <rect
                x="7"
                y="7"
                width="4"
                height="4"
                fill="white"
                opacity="0.25"
              />
            </svg>
          </div>
          <span className="text-xs font-semibold text-white/80 tracking-tight">
            Buildify
          </span>
          <span className="text-[10px] text-white/20 font-mono">v0.1</span>
        </div>

        <div className="flex items-center gap-1.5 bg-white/5 rounded px-2.5 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
          <span className="text-[10px] text-white/40">
            {pages.length} page{pages.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            className="text-[11px] text-white/40 hover:text-white/70 px-3 py-1.5 rounded hover:bg-white/5 transition-colors"
            onClick={() => alert("Preview coming soon!")}
          >
            Preview
          </button>
          <button
            onClick={handleExport}
            className="text-[11px] bg-white text-[#0a0a0a] px-3 py-1.5 rounded font-semibold hover:bg-white/90 transition-colors"
          >
            Export Code
          </button>
        </div>
      </div>

      {showExport && (
        <CodeExportModal
          files={exportFiles}
          onClose={() => setShowExport(false)}
        />
      )}
    </>
  );
}
