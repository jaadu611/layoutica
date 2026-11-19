"use client";

import { useEffect, useState } from "react";
import Toolbar from "@/components/builder/frontend/Toolbar";
import Sidebar from "@/components/builder/frontend/Sidebar";
import Canvas from "@/components/builder/frontend/Canvas";
import PropertiesPanel from "@/components/builder/frontend/PropertiesPanel";
import { useBuilderStore } from "@/lib/builder/frontend/store";
import { getVsCodeApi } from "@/lib/builder/frontend/vscode";
import { DEFAULT_MOCK_PAGES } from "@/lib/builder/frontend/mockData";
import { extractDesignTokens } from "@/lib/builder/frontend/tokenExtractor";
import { generateAllPages } from "@/lib/builder/frontend/codeGenerator";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Terminal,
  Layers,
  ExternalLink,
} from "lucide-react";

import { UILayoutSnapshot } from "@/lib/builder/frontend/types";

export default function BuilderPage() {
  const {
    rightPanelCollapsed,
    setRightPanelCollapsed,
    leftSidebarCollapsed,
    setLeftSidebarCollapsed,
    pages,
    components,
    designTokens,
    exportMode,
    setExportMode,
    loadProject,
    activePageId,
    isLayersDetached,
    setLayersDetached,
  } = useBuilderStore();

  const [mounted, setMounted] = useState(false);
  const [initStatus, setInitStatus] = useState<"idle" | "initializing" | "success" | "error">("idle");
  const [initError, setInitError] = useState<string | null>(null);
  const [hydrationChecked, setHydrationChecked] = useState(false);

  useEffect(() => {
    setMounted(true);
    // If not in VS Code, auto-default to export mode
    if (typeof window !== "undefined" && !window.acquireVsCodeApi) {
      // Check localStorage for existing layout
      const stored = localStorage.getItem("layoutica_ui_layout");
      if (stored) {
        try {
          const parsed: UILayoutSnapshot = JSON.parse(stored);
          if (parsed?.data?.pages?.length) {
            // Already hydrated via store on creation, mark done
            setHydrationChecked(true);
            return;
          }
        } catch {}
      }
      setExportMode("export");
      setHydrationChecked(true);
    } else {
      const vscode = getVsCodeApi();
      if (vscode) {
        // Request UI layout snapshot
        vscode.postMessage({ type: "loadUILayout" });
      } else {
        setHydrationChecked(true);
      }
    }
  }, []);

  // Listen for loadUILayoutResponse from VS Code to hydrate existing UI layout
  useEffect(() => {
    if (!hydrationChecked) {
      const timer = setTimeout(() => {
        setHydrationChecked(true);
      }, 2000); // fallback: show modal after 2s if no response
      return () => clearTimeout(timer);
    }
  }, [hydrationChecked]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === "loadUILayoutResponse") {
        setHydrationChecked(true);
        if (message.payload?.json) {
          try {
            const parsed: UILayoutSnapshot = JSON.parse(message.payload.json);
            const totalElements = parsed?.data?.pages?.reduce((acc, p) => acc + (p.elements?.length || 0), 0) || 0;
            if (parsed?.data?.pages?.length && totalElements > 0) {
              loadProject(
                parsed.data.pages,
                parsed.data.savedComponents ?? [],
                parsed.data.designTokens ?? { colors: [], typography: [] },
              );
              if (parsed.metadata?.exportMode) {
                setExportMode(parsed.metadata.exportMode);
              }
              if (parsed.data.viewSettings?.leftSidebarCollapsed !== undefined) {
                setLeftSidebarCollapsed(parsed.data.viewSettings.leftSidebarCollapsed);
              }
              if (parsed.data.viewSettings?.rightPanelCollapsed !== undefined) {
                setRightPanelCollapsed(parsed.data.viewSettings.rightPanelCollapsed);
              }
              if (parsed.data.viewSettings?.activePageId) {
                useBuilderStore.getState().setActivePage(parsed.data.viewSettings.activePageId);
              }
              return;
            }
          } catch {}
        }
        // If empty or first-time open, load the rich mock website with extracted design tokens!
        const initialTokens = extractDesignTokens(DEFAULT_MOCK_PAGES);
        loadProject(DEFAULT_MOCK_PAGES, [], initialTokens);
        useBuilderStore.getState().setActivePage("page-default-home");
        setExportMode("live");
      } else if (message.type === "nextAppInitStatus") {
        setInitStatus(message.payload.status);
        if (message.payload.error) {
          console.error("[Layoutica Webview] Initialization error details:", message.payload.error);
          setInitError(message.payload.error);
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Sync workspace files live if exportMode === 'live'
  useEffect(() => {
    if (!hydrationChecked) return;
    if (initStatus === "initializing") return;
    if (exportMode === "live") {
      const vscode = getVsCodeApi();
      if (vscode) {
        const files = generateAllPages(pages, components, designTokens);
        vscode.postMessage({
          type: "writeWorkspaceFiles",
          payload: { files },
        });
      }
    }
  }, [pages, components, designTokens, exportMode, hydrationChecked, initStatus]);

  // Auto-save UI layout state to ui_layout.json
  useEffect(() => {
    if (!hydrationChecked) return;
    if (exportMode === null) return;
    if (initStatus === "initializing") return;
    const vscode = getVsCodeApi();
    if (vscode && (pages.length > 0 || components.length > 0)) {
      const snapshot: UILayoutSnapshot = {
        metadata: {
          name: "Layoutica Project",
          version: "1.0.0",
          lastUpdated: new Date().toISOString(),
          pageCount: pages.length,
          exportMode,
        },
        data: {
          pages,
          savedComponents: components,
          designTokens,
          viewSettings: {
            activePageId,
            leftSidebarCollapsed,
            rightPanelCollapsed,
          },
        },
      };
      vscode.postMessage({
        type: "saveUILayout",
        payload: {
          json: JSON.stringify(snapshot, null, 2),
        },
      });
    }
  }, [pages, components, designTokens, exportMode, activePageId, leftSidebarCollapsed, rightPanelCollapsed, hydrationChecked, initStatus]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-app-bg">
      {mounted && initStatus === "initializing" && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 backdrop-blur-md select-none">
          <div className="bg-[#18181b] border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.9)] rounded-2xl p-8 max-w-[400px] w-full mx-4 flex flex-col items-center gap-6 text-center">
            {/* Spinning Loader Ring */}
            <div className="w-10 h-10 border-2 border-white/10 border-t-accent-blue rounded-full animate-spin" />
            <div className="flex flex-col gap-2">
              <span className="text-md font-bold text-white tracking-tight">
                Initializing Next.js Project
              </span>
              <span className="text-xs text-white/40 leading-relaxed px-2">
                Running <code className="text-accent-blue bg-white/5 px-1.5 py-0.5 rounded font-mono text-[10px]">create-next-app</code> to set up the workspace. This may take up to a minute...
              </span>
            </div>
          </div>
        </div>
      )}

      {mounted && initStatus === "error" && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 backdrop-blur-md select-none">
          <div className="bg-[#18181b] border border-red-500/25 shadow-[0_32px_80px_rgba(0,0,0,0.9)] rounded-2xl p-8 max-w-[420px] w-full mx-4 flex flex-col items-center gap-5 text-center">
            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 font-bold text-lg">
              !
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-md font-bold text-white tracking-tight">
                Initialization Failed
              </span>
              <p className="text-xs text-white/40 leading-relaxed max-h-[120px] overflow-y-auto px-2 font-mono text-left bg-black/25 rounded border border-white/5 p-2 w-full">
                {initError || "An unknown error occurred during create-next-app execution."}
              </p>
            </div>
            <button
              onClick={() => {
                setInitStatus("idle");
              }}
              className="mt-2 text-xs bg-white/10 hover:bg-white/15 text-white/90 font-medium px-4 py-2 rounded-lg cursor-pointer transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      )}

      <Toolbar />
      <div className="flex flex-1 overflow-hidden relative bg-app-bg">
        <div className="flex-1 flex flex-col min-w-0">
          <Canvas />
        </div>

        {/* Floating Sidebar Section */}
        <div
          className="absolute left-8 top-6 z-40 flex flex-col gap-2 items-start transition-all duration-300 ease-in-out"
          style={{ width: isLayersDetached && !leftSidebarCollapsed ? 472 : 230 }}
        >
          {/* Compact Toggle Button */}
          <button
            onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
            className="w-[230px] h-8 bg-panel-bg/80 backdrop-blur-xl border border-panel-border rounded-xl flex items-center justify-center text-white/20 hover:text-white/60 transition-all cursor-pointer group shadow-lg pointer-events-auto relative z-50 overflow-hidden"
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

          {/* Side-by-side Panels Wrapper */}
          <div className="flex gap-3 items-start pointer-events-none w-full">
            {/* Main Sidebar Box */}
            <div
              className={`flex flex-col overflow-hidden bg-panel-bg shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl pointer-events-auto origin-top transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                leftSidebarCollapsed || !mounted
                  ? "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                  : "opacity-100 scale-100 translate-y-0"
              }`}
              style={{
                width: 230,
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

            {/* Detached Layers Panel */}
            {isLayersDetached && (
              <div
                className={`flex flex-col overflow-hidden bg-panel-bg shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl pointer-events-auto origin-top transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                  leftSidebarCollapsed || !mounted
                    ? "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                    : "opacity-100 scale-100 translate-y-0"
                }`}
                style={{
                  width: 230,
                  height: leftSidebarCollapsed || !mounted ? 0 : "64vh",
                  border:
                    leftSidebarCollapsed || !mounted
                      ? "none"
                      : "1px solid var(--panel-border)",
                }}
              >
                <div className="flex-1 flex flex-col min-h-0 bg-panel-bg/95 backdrop-blur-3xl">
                  {/* Detached Panel Header */}
                  <div className="flex items-center justify-between h-11 px-3 border-b border-panel-border shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Layers size={12} className="text-white/40" />
                      <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest font-sans">
                        Layers
                      </span>
                    </div>
                    <button
                      onClick={() => setLayersDetached(false)}
                      className="p-0.5 h-5 w-5 flex items-center justify-center bg-white/4 hover:bg-white/10 rounded text-white/45 hover:text-white transition-colors cursor-pointer shrink-0 border border-white/5"
                      title="Reattach to Sidebar"
                    >
                      <ExternalLink size={9} className="rotate-180" />
                    </button>
                  </div>
                  {/* Content */}
                  <div className="flex-1 flex flex-col min-h-0">
                    <Sidebar detachedOnly={true} />
                  </div>
                </div>
              </div>
            )}
          </div>
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
