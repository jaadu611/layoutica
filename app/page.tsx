"use client";

import { useEffect, useRef } from "react";
import Toolbar from "@/components/builder/Toolbar";
import Sidebar from "@/components/builder/Sidebar";
import Canvas from "@/components/builder/Canvas";
import PropertiesPanel from "@/components/builder/PropertiesPanel";
import { useBuilderStore } from "@/lib/builder/store";
import gsap from "gsap";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

const SIDEBAR_HEIGHT = "64vh";

export default function BuilderPage() {
  const {
    rightPanelCollapsed,
    setRightPanelCollapsed,
    leftSidebarCollapsed,
    setLeftSidebarCollapsed,
  } = useBuilderStore();

  const sidebarRef = useRef<HTMLDivElement>(null);
  // Track whether this is the very first render so we skip the open animation
  const isFirstRender = useRef(true);

  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;

    // On first render: set the correct initial state instantly with no animation
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (leftSidebarCollapsed) {
        gsap.set(el, { height: 0, opacity: 0, y: -5 });
        el.style.visibility = "hidden";
        el.style.border = "none";
      } else {
        gsap.set(el, { height: SIDEBAR_HEIGHT, opacity: 1, y: 0 });
        el.style.visibility = "visible";
        el.style.border = "1px solid rgba(255,255,255,0.05)";
      }
      return;
    }

    if (leftSidebarCollapsed) {
      // Collapse: animate height → 0, then hide
      gsap.to(el, {
        height: 0,
        opacity: 0,
        y: -5,
        duration: 0.4,
        ease: "power2.inOut",
        onComplete: () => {
          if (sidebarRef.current) {
            sidebarRef.current.style.visibility = "hidden";
            sidebarRef.current.style.border = "none";
          }
        },
      });
    } else {
      // Expand: show first, then animate height back (same property as collapse)
      el.style.visibility = "visible";
      el.style.border = "1px solid rgba(255,255,255,0.05)";
      gsap.to(el, {
        height: SIDEBAR_HEIGHT, // ← was "maxHeight" before — mismatch with collapse
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: "power3.out",
      });
    }
  }, [leftSidebarCollapsed]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0a0a0a]">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden relative bg-[#0a0a0a]">
        <Canvas />

        {/* Floating Sidebar Section */}
        <div
          className="absolute left-8 top-6 z-40 flex flex-col gap-2"
          style={{ width: 230 }}
        >
          {/* Main Sidebar Box — no inline height, GSAP owns it after mount */}
          <div
            ref={sidebarRef}
            className="flex flex-col overflow-hidden bg-[#1a1a1a]/95 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl pointer-events-auto origin-top"
            style={{ border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <Sidebar />
          </div>

          {/* Compact Toggle Button */}
          <button
            onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
            className="w-full h-8 bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/5 rounded-xl flex items-center justify-center text-white/20 hover:text-white/60 transition-all cursor-pointer group shadow-lg pointer-events-auto relative z-50 overflow-hidden"
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
          className={`relative z-40 flex h-full transition-all duration-500 cubic-bezier bg-[#1a1a1a] border-l border-white/5 ${
            rightPanelCollapsed ? "w-0" : ""
          }`}
        >
          {/* Right Toggle Button */}
          <button
            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            className="absolute top-1/2 -left-6 -translate-y-1/2 w-6 h-16 bg-[#1a1a1a]/95 border border-white/5 border-r-0 rounded-l-xl flex items-center justify-center text-white/10 hover:text-white/80 transition-all cursor-pointer group z-50 shadow-2xl backdrop-blur-md"
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
