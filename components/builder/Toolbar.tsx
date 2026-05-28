"use client";

import { useState, useEffect, useRef } from "react";
import { useBuilderStore } from "@/lib/builder/store";
import { generateAllPages } from "@/lib/builder/codeGenerator";
import { ProjectSaverLoader } from "@/lib/builder/projectSaverLoader";
import CodeExportModal from "./CodeExportModal";
import {
  Undo2,
  Redo2,
  Share,
  Palette,
  Save,
  FolderOpen,
  Monitor,
  Tablet,
  Smartphone,
  Grid3X3,
  Square,
  BoxSelect,
  Trash2,
  Maximize2,
  Crop,
  ChevronDown,
  Search,
  Scan,
} from "lucide-react";
import DesignTokensPanel from "./DesignTokensPanel";
import { CanvasBackground, CanvasBreakpoint } from "@/lib/builder/types";
import { DEVICE_PRESETS, resolveDeviceDimensions } from "@/lib/builder/devices";

export interface CanvasViewSettings {
  breakpoint: CanvasBreakpoint;
  background: CanvasBackground;
  showGrid: boolean;
  showPadding: boolean;
  showMargin: boolean;
}



function ToolbarDivider() {
  return <div className="w-px h-5 bg-panel-border shrink-0" />;
}

function ToolbarBtn({
  onClick,
  title,
  active = false,
  disabled = false,
  children,
  activeColor = "text-white bg-white/12",
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  activeColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex items-center justify-center w-8 h-8 rounded transition-all cursor-pointer shrink-0 ${disabled
        ? "text-white/20 cursor-not-allowed"
        : active
          ? `${activeColor}`
          : "text-white/50 hover:text-white hover:bg-white/8"
        }`}
    >
      {children}
    </button>
  );
}

export default function Toolbar() {
  const {
    pages,
    components,
    designTokens,
    activePageId,
    undo,
    redo,
    getActivePage,
    loadProject,
    setActivePage,
    canvasBreakpoint,
    customWidth,
    customHeight,
    viewportClip,
    showGrid,
    showPadding,
    showMargin,
    exportMode,
    setCanvasBreakpoint,
    setCustomWidth,
    setCustomHeight,
    setViewportClip,
    setShowGrid,
    setShowPadding,
    setShowMargin,
    clearCanvas,
  } = useBuilderStore();

  const undoable = useBuilderStore((s) => s.past.length > 0);
  const redoable = useBuilderStore((s) => s.future.length > 0);

  const [projectName, setProjectName] = useState("untitled-project");
  const [showExport, setShowExport] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [exportFiles, setExportFiles] = useState<Record<string, string>>({});

  // NEW DROPDOWN & DIMENSIONS STATE
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const activePreset = DEVICE_PRESETS.find((d) => d.id === canvasBreakpoint);
  const activeLabel = activePreset ? activePreset.name : "Custom Size";

  const filteredPresets = DEVICE_PRESETS.filter((device) =>
    device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.type.toLowerCase().includes(searchQuery.toLowerCase())
  );



  const handleExport = () => {
    const files = generateAllPages(pages, components, designTokens);
    setExportFiles(files);
    setShowExport(true);
  };

  const handleSaveProject = () => {
    ProjectSaverLoader.save(
      projectName,
      pages,
      components,
      designTokens,
      activePageId,
    );
  };

  const handleLoadProject = async () => {
    try {
      const project = await ProjectSaverLoader.load();
      loadProject(
        project.data.pages,
        project.data.savedComponents,
        project.data.designTokens,
      );
      setProjectName(project.metadata.name);
      if (project.data.viewSettings?.activePageId) {
        setActivePage(project.data.viewSettings.activePageId);
      }
    } catch (err) {
      if (err !== "cancelled") console.error(err);
    }
  };

  const activePage = getActivePage();
  const initialSlug = activePage?.slug ?? "/";

  return (
    <>
      <div className="h-12 border-b border-panel-border bg-panel-bg flex items-center justify-between px-4 shrink-0 select-none gap-3">
        {/* ── LEFT ── */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 border-r border-panel-border pr-4">
            <ToolbarBtn
              onClick={handleSaveProject}
              title="Save project (.ltica)"
            >
              <Save size={15} />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={handleLoadProject}
              title="Load project (.ltica)"
            >
              <FolderOpen size={15} />
            </ToolbarBtn>
          </div>

          <div className="flex items-center gap-1">
            <ToolbarBtn
              onClick={() => undoable && undo()}
              title="Undo (⌘Z)"
              disabled={!undoable}
            >
              <Undo2 size={15} strokeWidth={2} />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => redoable && redo()}
              title="Redo (⌘Y)"
              disabled={!redoable}
            >
              <Redo2 size={15} strokeWidth={2} />
            </ToolbarBtn>
          </div>
        </div>

        {/* ── CENTER ── */}
        <div className="flex items-center gap-1.5 flex-1 justify-center">
          {/* Device Selection Dropdown & Dimensions */}
          <div className="flex items-center gap-1.5 shrink-0 select-none">
            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                onClick={() => {
                  setShowDropdown(!showDropdown);
                  setSearchQuery("");
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/8 hover:bg-white/12 border border-white/10 text-white/80 hover:text-white transition-all cursor-pointer text-xs font-medium shrink-0 h-8"
              >
                <span className="truncate max-w-[120px]">{activeLabel}</span>
                <ChevronDown size={12} className={`opacity-60 transition-transform shrink-0 ${showDropdown ? "rotate-180" : ""}`} />
              </button>

              {showDropdown && (
                <div className="absolute top-full left-0 mt-1.5 w-64 max-h-[380px] overflow-hidden flex flex-col bg-[#18181b] border border-white/10 rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.5)] z-[100] animate-in fade-in slide-in-from-top-1 duration-150">
                  {/* Search Bar */}
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-white/2 shrink-0">
                    <Search size={12} className="text-white/40" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search devices..."
                      className="bg-transparent border-0 text-xs text-white placeholder-white/30 focus:outline-none w-full"
                    />
                  </div>

                  {/* Scrollable List */}
                  <div className="overflow-y-auto flex-1 p-1 py-1.5 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded">
                    {/* Custom option */}
                    {searchQuery === "" && (
                      <button
                        onClick={() => {
                          setCanvasBreakpoint("custom");
                          setShowDropdown(false);
                        }}
                        className={`flex items-center justify-between w-full text-left px-3 py-2 text-xs rounded-md transition-colors cursor-pointer ${
                          canvasBreakpoint === "custom"
                            ? "bg-white/12 text-white font-medium"
                            : "text-white/70 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <span>Custom Dimensions</span>
                        <span className="text-[10px] text-white/40 font-mono">
                          {customWidth} × {customHeight}
                        </span>
                      </button>
                    )}

                    {/* Categorized presets */}
                    {(["Mobile", "Tablet", "Desktop"] as const).map((category) => {
                      const devicesInCategory = filteredPresets.filter(
                        (d) => d.type === category
                      );
                      if (devicesInCategory.length === 0) return null;

                      return (
                        <div key={category} className="mt-2 first:mt-0">
                          <div className="px-3 py-1 text-[9px] font-bold text-white/30 uppercase tracking-wider select-none">
                            {category}
                          </div>
                          {devicesInCategory.map((device) => (
                            <button
                              key={device.id}
                              onClick={() => {
                                setCanvasBreakpoint(device.id);
                                setShowDropdown(false);
                              }}
                              className={`flex items-center justify-between w-full text-left px-3 py-2 text-xs rounded-md transition-colors cursor-pointer ${
                                canvasBreakpoint === device.id
                                  ? "bg-white/12 text-white font-medium"
                                  : "text-white/70 hover:text-white hover:bg-white/5"
                              }`}
                            >
                              <span className="truncate max-w-[130px]">{device.name}</span>
                              <span className="text-[10px] text-white/40 font-mono shrink-0">
                                {device.width} × {device.height}
                              </span>
                            </button>
                          ))}
                        </div>
                      );
                    })}

                    {filteredPresets.length === 0 && searchQuery !== "" && (
                      <div className="px-3 py-4 text-xs text-white/40 text-center select-none">
                        No devices found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Width Input */}
            <div className="flex items-center gap-0.5 bg-white/4 px-1.5 py-0.5 rounded-md border border-white/5 shrink-0 h-8">
              <span className="text-[10px] text-white/35 font-sans select-none pl-0.5">w</span>
              <input
                type="number"
                value={
                  canvasBreakpoint === "custom"
                    ? (customWidth || "")
                    : resolveDeviceDimensions(canvasBreakpoint, customWidth, customHeight).width
                }
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  const cleanVal = isNaN(val) ? 0 : val;
                  if (canvasBreakpoint !== "custom") {
                    const dims = resolveDeviceDimensions(canvasBreakpoint, customWidth, customHeight);
                    setCustomHeight(dims.height);
                    setCanvasBreakpoint("custom");
                  }
                  setCustomWidth(cleanVal);
                }}
                onBlur={() => {
                  if (customWidth < 200) {
                    setCustomWidth(200);
                  }
                }}
                className="w-10 h-6 text-[11px] bg-transparent text-white/90 border-0 focus:outline-none font-mono text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="Width"
                title="Canvas width in pixels"
              />
            </div>

            {/* Height Input */}
            <div className="flex items-center gap-0.5 bg-white/4 px-1.5 py-0.5 rounded-md border border-white/5 shrink-0 h-8">
              <span className="text-[10px] text-white/35 font-sans select-none pl-0.5">h</span>
              <input
                type="number"
                value={
                  canvasBreakpoint === "custom"
                    ? (customHeight || "")
                    : resolveDeviceDimensions(canvasBreakpoint, customWidth, customHeight).height
                }
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  const cleanVal = isNaN(val) ? 0 : val;
                  if (canvasBreakpoint !== "custom") {
                    const dims = resolveDeviceDimensions(canvasBreakpoint, customWidth, customHeight);
                    setCustomWidth(dims.width);
                    setCanvasBreakpoint("custom");
                  }
                  setCustomHeight(cleanVal);
                }}
                onBlur={() => {
                  if (customHeight < 200) {
                    setCustomHeight(200);
                  }
                }}
                className="w-10 h-6 text-[11px] bg-transparent text-white/90 border-0 focus:outline-none font-mono text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="Height"
                title="Canvas height in pixels"
              />
            </div>
          </div>

          {/* Grid */}
          <ToolbarBtn
            onClick={() => setShowGrid(!showGrid)}
            title={showGrid ? "Hide grid" : "Show grid"}
            active={showGrid}
            activeColor="text-violet-300 bg-violet-500/15"
          >
            <Grid3X3 size={14} />
          </ToolbarBtn>

          {/* Viewport Clip Mode */}
          <ToolbarBtn
            onClick={() => setViewportClip(!viewportClip)}
            title={viewportClip ? "Disable Viewport Clip Mode" : "Enable Viewport Clip Mode (fit simulated height)"}
            active={viewportClip}
            activeColor="text-pink-300 bg-pink-500/15"
          >
            <Crop size={14} />
          </ToolbarBtn>
          {/* Padding */}
          <ToolbarBtn
            onClick={() => setShowPadding(!showPadding)}
            title={
              showPadding ? "Hide padding overlay" : "Show padding overlay"
            }
            active={showPadding}
            activeColor="text-emerald-300 bg-emerald-500/15"
          >
            <Square size={14} />
          </ToolbarBtn>

          {/* Margin */}
          <ToolbarBtn
            onClick={() => setShowMargin(!showMargin)}
            title={showMargin ? "Hide margin overlay" : "Show margin overlay"}
            active={showMargin}
            activeColor="text-amber-300 bg-amber-500/15"
          >
            <BoxSelect size={14} />
          </ToolbarBtn>

          <ToolbarBtn
            onClick={() => setShowClearConfirm(true)}
            title="Clear all elements"
          >
            <Trash2 size={14} className="text-red-400/80 hover:text-red-400" />
          </ToolbarBtn>
        </div>

        {/* ── RIGHT ── */}
        <div className="flex items-center gap-2 shrink-0">
          <ToolbarBtn
            onClick={() => setShowTokens((v) => !v)}
            title="Design tokens"
            active={showTokens}
          >
            <Palette size={15} />
          </ToolbarBtn>
          {exportMode === "live" ? (
            <div
              className="flex items-center gap-1.5 text-[11px] text-[#22c55e] border border-[#22c55e]/20 rounded-[5px] px-3 py-1.5 font-medium select-none bg-[#22c55e]/5"
              style={{ fontFamily: "sans-serif" }}
            >
              Live Synced
            </div>
          ) : (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 text-[12px] bg-accent-blue hover:bg-accent-blue-hover text-white px-3 py-1.5 rounded-[5px] font-medium transition-colors cursor-pointer"
            >
              <Share size={12} />
              Export Code
            </button>
          )}
        </div>
      </div>

      {showTokens && (
        <DesignTokensPanel floating onClose={() => setShowTokens(false)} />
      )}
      {showExport && (
        <CodeExportModal
          files={exportFiles}
          onClose={() => setShowExport(false)}
        />
      )}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm select-none">
          <div className="bg-[#18181b] border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.8)] rounded-2xl p-6 max-w-[340px] w-full mx-4 flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-white">Clear canvas?</span>
              <span className="text-xs text-white/50 leading-relaxed">
                This will delete all elements from this page. This action cannot be undone.
              </span>
            </div>
            <div className="flex items-center gap-2 justify-end mt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearCanvas();
                  setShowClearConfirm(false);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500 hover:bg-red-600 text-white transition-colors cursor-pointer"
              >
                Clear Page
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
