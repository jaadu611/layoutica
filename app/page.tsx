"use client";

import Toolbar from "@/components/builder/Toolbar";
import Sidebar from "@/components/builder/Sidebar";
import Canvas from "@/components/builder/Canvas";
import PropertiesPanel from "@/components/builder/PropertiesPanel";

export default function BuilderPage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#1e1e1e]">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <Canvas />
        <PropertiesPanel />
      </div>
    </div>
  );
}
