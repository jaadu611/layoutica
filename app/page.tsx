"use client";

import { useEffect, useRef, useState } from "react";
import Toolbar from "@/components/builder/Toolbar";
import Sidebar from "@/components/builder/Sidebar";
import Canvas from "@/components/builder/Canvas";
import PropertiesPanel from "@/components/builder/PropertiesPanel";
import { useBuilderStore } from "@/lib/builder/store";
import { getVsCodeApi } from "@/lib/builder/vscode";
import { generateAllPages } from "@/lib/builder/codeGenerator";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Terminal,
} from "lucide-react";

export default function BuilderPage() {
  const {
    rightPanelCollapsed,
    setRightPanelCollapsed,
    leftSidebarCollapsed,
    setLeftSidebarCollapsed,
    pages,
    components,
    exportMode,
    setExportMode,
  } = useBuilderStore();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    // If not in VS Code, auto-default to export mode
    if (typeof window !== "undefined" && !window.acquireVsCodeApi) {
      setExportMode("export");
    }
  }, []);

  // Sync workspace files live if exportMode === 'live'
  useEffect(() => {
    if (exportMode === "live") {
      const vscode = getVsCodeApi();
      if (vscode) {
        const files = generateAllPages(pages, components);
        vscode.postMessage({
          type: "writeWorkspaceFiles",
          payload: { files },
        });
      }
    }
  }, [pages, components, exportMode]);

  // Use a ref for the sidebar to avoid unnecessary re-renders, but we'll use state-driven styles for the animation
  // Actually, we'll just use the store values directly in the render logic with CSS transitions.

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-app-bg">
      {mounted && exportMode === null && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md select-none">
          <div className="bg-[#18181b] border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.9)] rounded-2xl p-8 max-w-[500px] w-full mx-4 flex flex-col gap-6 text-center">
            <div className="flex flex-col gap-2">
              <span className="text-xl font-bold text-white tracking-tight">
                Choose Builder Mode
              </span>
              <span className="text-xs text-white/50 leading-relaxed px-4">
                How would you like to manage the generated code for your website design?
              </span>
            </div>

            <div className="flex flex-col gap-3 mt-2">
              {/* Option 1: Live Mode */}
              <button
                onClick={() => setExportMode("live")}
                className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-accent-blue/40 text-left transition-all duration-200 cursor-pointer group"
              >
                <div className="p-2 rounded-lg bg-accent-blue/10 text-accent-blue mt-0.5 group-hover:scale-105 transition-transform duration-200">
                  <Sparkles size={18} />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-sm font-semibold text-white group-hover:text-accent-blue transition-colors">
                    Live Workspace Sync (Recommended)
                  </span>
                  <span className="text-[11px] text-white/40 leading-normal">
                    Files are updated directly in your workspace folder in real-time as you edit. No manual exporting needed.
                  </span>
                </div>
              </button>

              {/* Option 2: Export at the end */}
              <button
                onClick={() => setExportMode("export")}
                className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20 text-left transition-all duration-200 cursor-pointer group"
              >
                <div className="p-2 rounded-lg bg-white/5 text-white/60 mt-0.5 group-hover:scale-105 transition-transform duration-200">
                  <Terminal size={18} />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-sm font-semibold text-white">
                    Manual Export at the End
                  </span>
                  <span className="text-[11px] text-white/40 leading-normal">
                    Design first, and manually download your fully structured codebase as a ZIP archive when finished.
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      <Toolbar />
      <div className="flex flex-1 overflow-hidden relative bg-app-bg">
        <Canvas />

        {/* Floating Sidebar Section */}
        <div
          className="absolute left-8 top-6 z-40 flex flex-col gap-2"
          style={{ width: 230 }}
        >
          {/* Main Sidebar Box — no inline height, GSAP owns it after mount */}
          <div
            className={`flex flex-col overflow-hidden bg-panel-bg shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl pointer-events-auto origin-top transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
              leftSidebarCollapsed || !mounted
                ? "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                : "opacity-100 scale-100 translate-y-0"
            }`}
            style={{
              height: leftSidebarCollapsed || !mounted ? 0 : "64vh",
              border:
                leftSidebarCollapsed || !mounted
                  ? "none"
                  : "1px solid var(--panel-border)",
            }}
          >
            <div className="flex-1 flex flex-col min-h-0 bg-panel-bg/95 backdrop-blur-3xl">
              {mounted && <Sidebar />}
            </div>
          </div>

          {/* Compact Toggle Button */}
          <button
            onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
            className="w-full h-8 bg-panel-bg/80 backdrop-blur-xl border border-panel-border rounded-xl flex items-center justify-center text-white/20 hover:text-white/60 transition-all cursor-pointer group shadow-lg pointer-events-auto relative z-50 overflow-hidden"
            style={{ outline: "none" }}
          >
            <div className="flex items-center gap-2 transition-transform duration-200 active:scale-95">
              {leftSidebarCollapsed ? (
                <>
                  <ChevronDown size={12} className="opacity-40" />
                  <span className="text-[9px] uppercase tracking-widest font-bold">
                    Panels
                  </span>
                  <ChevronDown size={12} className="opacity-40" />
                </>
              ) : (
                <ChevronUp size={14} />
              )}
            </div>
            <div className="absolute inset-x-0 top-0 h-px bg-white/5 pointer-events-none" />
          </button>
        </div>

        {/* Collapsible Right Panel */}
        <div
          className={`relative z-40 flex h-full transition-all duration-500 cubic-bezier bg-panel-bg border-l border-panel-border ${
            rightPanelCollapsed ? "w-0" : ""
          }`}
        >
          {/* Right Toggle Button */}
          <button
            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            className="absolute top-1/2 -left-6 -translate-y-1/2 w-6 h-16 bg-panel-bg/95 border border-panel-border border-r-0 rounded-l-xl flex items-center justify-center text-white/10 hover:text-white/80 transition-all cursor-pointer group z-50 shadow-2xl backdrop-blur-md"
          >
            <div className="group-hover:scale-110 transition-transform">
              {rightPanelCollapsed ? (
                <ChevronLeft size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </div>
          </button>

          <div
            className={`h-full overflow-hidden transition-all duration-300 ${
              rightPanelCollapsed
                ? "opacity-0 invisible pointer-events-none"
                : "opacity-100 visible"
            }`}
          >
            <PropertiesPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
