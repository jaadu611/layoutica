"use client";

import { useEffect, useRef, useState } from "react";
import Toolbar from "@/components/builder/Toolbar";
import Sidebar from "@/components/builder/Sidebar";
import Canvas from "@/components/builder/Canvas";
import PropertiesPanel from "@/components/builder/PropertiesPanel";
import { useBuilderStore } from "@/lib/builder/store";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

export default function BuilderPage() {
  const {
    rightPanelCollapsed,
    setRightPanelCollapsed,
    leftSidebarCollapsed,
    setLeftSidebarCollapsed,
  } = useBuilderStore();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use a ref for the sidebar to avoid unnecessary re-renders, but we'll use state-driven styles for the animation
  // Actually, we'll just use the store values directly in the render logic with CSS transitions.

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-app-bg">
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

      <style jsx global>{`
        .cubic-bezier {
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
}
