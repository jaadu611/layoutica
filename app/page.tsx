"use client";

import { useEffect, useState } from "react";
import Toolbar from "@/components/builder/frontend/Toolbar";
import Sidebar from "@/components/builder/frontend/Sidebar";
import Canvas from "@/components/builder/frontend/Canvas";
import PropertiesPanel from "@/components/builder/frontend/PropertiesPanel";
import { useBuilderStore } from "@/lib/builder/frontend/store";
import { getVsCodeApi } from "@/lib/builder/frontend/vscode";
import { generateAllPages } from "@/lib/builder/frontend/codeGenerator";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Terminal,
} from "lucide-react";

import { useBackendStore } from "@/lib/builder/backend/store";
import BackendCanvas from "@/components/builder/backend/Canvas";
import { UILayoutSnapshot } from "@/lib/builder/frontend/types";

export default function BuilderPage() {
  const { mode } = useBackendStore();
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
        vscode.postMessage({ type: "getBackendState" });
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
            if (parsed?.data?.pages?.length) {
              loadProject(
                parsed.data.pages,
                parsed.data.savedComponents ?? [],
                parsed.data.designTokens ?? { colors: [], typography: [] },
              );
              if (parsed.metadata?.exportMode) {
                setExportMode(parsed.metadata.exportMode);
              }
              if (parsed.data.viewSettings?.leftSidebarCollapsed) {
                setLeftSidebarCollapsed(parsed.data.viewSettings.leftSidebarCollapsed);
              }
              if (parsed.data.viewSettings?.rightPanelCollapsed) {
                setRightPanelCollapsed(parsed.data.viewSettings.rightPanelCollapsed);
              }
              if (parsed.data.viewSettings?.activePageId) {
                useBuilderStore.getState().setActivePage(parsed.data.viewSettings.activePageId);
              }
              return;
            }
          } catch {}
        }
        // No valid layout found, show modal
        setExportMode(null);
      } else if (message.type === "nextAppInitStatus") {
        setInitStatus(message.payload.status);
        if (message.payload.error) {
          console.error("[Layoutica Webview] Initialization error details:", message.payload.error);
          setInitError(message.payload.error);
        }
      } else if (message.type === "getBackendStateResponse") {
        const store = useBackendStore.getState();
        store.setNodes(message.payload.nodes || []);
        if (message.payload.connections?.length) {
          message.payload.connections.forEach((c: { id: string; sourceId: string; targetId: string; type: "import" | "export" }) => {
            useBackendStore.setState(s => ({
              connections: s.connections.some(e => e.id === c.id) ? s.connections : [...s.connections, c]
            }));
          });
        }
        if (message.payload.pinnedNodes?.length) {
          useBackendStore.setState({ pinnedNodes: message.payload.pinnedNodes });
        }
        if (message.payload.activeGhostNodes?.length) {
          useBackendStore.setState({ activeGhostNodes: message.payload.activeGhostNodes });
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Sync workspace files live if exportMode === 'live'
  useEffect(() => {
    if (!hydrationChecked) return;
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
  }, [pages, components, designTokens, exportMode, hydrationChecked]);

  // Auto-save UI layout state to ui_layout.json
  useEffect(() => {
    if (!hydrationChecked) return;
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
  }, [pages, components, designTokens, exportMode, activePageId, leftSidebarCollapsed, rightPanelCollapsed, hydrationChecked]);

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
                setExportMode(null); // Let them choose mode or retry
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
        {mode === "backend" ? <BackendCanvas /> : <Canvas />}

        {/* Floating Sidebar Section */}
        {mode === "frontend" && (
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
        )}

        {/* Collapsible Right Panel */}
        {mode === "frontend" && (
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
        )}
      </div>
    </div>
  );
}
