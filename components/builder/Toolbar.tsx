"use client";

import { useState, useEffect } from "react";
import { useBuilderStore } from "@/lib/builder/store";
import { generateAllPages } from "@/lib/builder/codeGenerator";
import CodeExportModal from "./CodeExportModal";
import { Undo2, Redo2, Share, Play } from "lucide-react";

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
      <div className="h-12 border-b border-[#383838] bg-[#2c2c2c] flex items-center justify-between px-4 shrink-0 select-none">
        
        {/* Left Section (Logo, Menu, Undo/Redo) */}
        <div className="flex items-center w-1/3">
          <div className="flex items-center gap-3 pr-4 border-r border-[#444] mr-4">
            <div className="w-5 h-5 flex items-center justify-center text-white/90">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 0C3.134 0 0 3.134 0 7V14H7C10.866 14 14 10.866 14 7C14 3.134 10.866 0 7 0Z" fill="#F24E1E"/>
                <path d="M0 0H7V7H0V0Z" fill="#FF7262"/>
                <path d="M0 7H7V14H0V7Z" fill="#1ABCFE"/>
                <path d="M7 7H14V14H7V7Z" fill="#0ACF83"/>
                <path d="M7 0H14V7H7V0Z" fill="#A259FF"/>
              </svg>
            </div>
            <span className="text-[13px] font-medium text-white/90 tracking-wide">
              layoutica
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => canUndo() && undo()}
              disabled={!canUndo()}
              className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
                canUndo()
                  ? "text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
                  : "text-white/20 cursor-not-allowed"
              }`}
            >
              <Undo2 size={16} strokeWidth={2} />
            </button>
            <button
              onClick={() => canRedo() && redo()}
              disabled={!canRedo()}
              className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
                canRedo()
                  ? "text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
                  : "text-white/20 cursor-not-allowed"
              }`}
            >
              <Redo2 size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Right Section (Preview, Export) */}
        <div className="flex items-center justify-end w-1/3 gap-2">
          <button
            className="flex items-center gap-1.5 text-[12px] font-medium text-white/90 hover:bg-white/10 px-3 py-1.5 rounded transition-colors cursor-pointer"
            onClick={() => alert("Preview coming soon!")}
          >
            <Play size={14} fill="currentColor" />
            Preview
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 text-[12px] bg-[#0d99ff] hover:bg-[#0b8ae6] text-white px-3 py-1.5 rounded-[5px] font-medium transition-colors cursor-pointer"
          >
            <Share size={12} />
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
