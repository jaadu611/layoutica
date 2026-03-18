"use client";

import { useState, useEffect } from "react";
import { useBuilderStore } from "@/lib/builder/store";
import { generateAllPages } from "@/lib/builder/codeGenerator";
import CodeExportModal from "./CodeExportModal";
import { Undo2, Redo2 } from "lucide-react";

export default function Toolbar() {
  const { pages, undo, redo, canUndo, canRedo } = useBuilderStore();
  const [showExport, setShowExport] = useState(false);
  const [exportFiles, setExportFiles] = useState<Record<string, string>>({});

  const handleExport = () => {
    const files = generateAllPages(pages);
    setExportFiles(files);
    setShowExport(true);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) undo();
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        if (canRedo()) redo();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [undo, redo, canUndo, canRedo]);

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

        <div className="flex items-center gap-1">
          <button
            onClick={() => canUndo() && undo()}
            disabled={!canUndo()}
            title="Undo (⌘Z)"
            className={`flex items-center justify-center w-7 h-7 rounded transition-colors ${
              canUndo()
                ? "text-white/50 hover:text-white/90 hover:bg-white/8 cursor-pointer"
                : "text-white/15 cursor-not-allowed"
            }`}
          >
            <Undo2 size={13} />
          </button>
          <button
            onClick={() => canRedo() && redo()}
            disabled={!canRedo()}
            title="Redo (⌘⇧Z)"
            className={`flex items-center justify-center w-7 h-7 rounded transition-colors ${
              canRedo()
                ? "text-white/50 hover:text-white/90 hover:bg-white/8 cursor-pointer"
                : "text-white/15 cursor-not-allowed"
            }`}
          >
            <Redo2 size={13} />
          </button>

          <div className="w-px h-4 bg-white/10 mx-1" />

          <div className="flex items-center gap-1.5 bg-white/5 rounded px-2.5 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
            <span className="text-[10px] text-white/40">
              {pages.length} page{pages.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            className="text-[11px] text-white/40 hover:text-white/70 px-3 py-1.5 rounded hover:bg-white/5 transition-colors cursor-pointer"
            onClick={() => alert("Preview coming soon!")}
          >
            Preview
          </button>
          <button
            onClick={handleExport}
            className="text-[11px] bg-white text-[#0a0a0a] px-3 py-1.5 rounded font-semibold hover:bg-white/90 transition-colors cursor-pointer"
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
