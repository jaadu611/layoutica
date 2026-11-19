// Description: Frontend Canvas Toolbar

"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useBuilderStore } from "@/lib/builder/frontend/store";
import { generateAllPages } from "@/lib/builder/frontend/codeGenerator";
import { ProjectSaverLoader } from "@/lib/builder/frontend/projectSaverLoader";
import CodeExportModal from "./CodeExportModal";
import ReflowSimulatorModal from "./ReflowSimulatorModal";
import {
  Undo2,
  Redo2,
  Share,
  Palette,
  Activity,
  Sparkles,
  Grid3X3,
  Square,
  BoxSelect,
  Trash2,
  Crop,
  ChevronDown,
  Search,
  FileText,
  Save,
  FolderOpen,
  Play,
  ExternalLink,
  SlidersHorizontal,
} from "lucide-react";
import DesignTokensPanel from "./DesignTokensPanel";
import { CanvasBackground, CanvasBreakpoint, CanvasElement } from "@/lib/builder/frontend/types";
import { DEVICE_PRESETS, resolveDeviceDimensions } from "@/lib/builder/frontend/devices";
import { openPreviewInBrowser } from "@/lib/builder/frontend/preview";

export interface CanvasViewSettings {
  breakpoint: CanvasBreakpoint;
  background: CanvasBackground;
  showGrid: boolean;
  showPadding: boolean;
  showMargin: boolean;
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
    loadProject,
    setActivePage,
    canvasBreakpoint,
    customWidth,
    customHeight,
    viewportClip,
    showGrid,
    showPadding,
    showMargin,
    zoom,
    setZoom,
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

  const [projectName, setProjectName] = useState("untitled-project");
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activePage = useMemo(() => {
    return pages.find((p) => p.id === activePageId) || pages[0];
  }, [pages, activePageId]);

  // Zoom dropdown state
  const [showZoomDropdown, setShowZoomDropdown] = useState(false);
  const zoomDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (zoomDropdownRef.current && !zoomDropdownRef.current.contains(event.target as Node)) {
        setShowZoomDropdown(false);
      }
    }
    if (showZoomDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showZoomDropdown]);

  // Recursively flatten frontend elements
  const flattenElements = (
    elements: CanvasElement[],
    pageId: string,
    pageName: string,
    results: any[] = []
  ): any[] => {
    elements.forEach((el) => {
      const name = el.metadata?.name || el.content?.slice(0, 22) || el.type.replace(/([A-Z])/g, " $1").trim();
      results.push({
        type: "element",
        id: el.id,
        name,
        elementType: el.type,
        pageId,
        pageName,
      });
      if (el.children?.length) {
        flattenElements(el.children, pageId, pageName, results);
      }
    });
    return results;
  };

  // Search results over pages and canvas elements
  const searchResults = useMemo(() => {
    if (!globalSearchQuery) return [];
    const query = globalSearchQuery.toLowerCase();

    // Pages search
    const pageResults = pages
      .filter((p) => p.name.toLowerCase().includes(query))
      .map((p) => ({
        type: "page" as const,
        id: p.id,
        name: p.name,
        pageId: p.id,
      }));

    // Elements search
    const elementResults: any[] = [];
    pages.forEach((page) => {
      flattenElements(page.elements || [], page.id, page.name, elementResults);
    });

    const filteredElements = elementResults.filter(
      (res) =>
        res.name.toLowerCase().includes(query) ||
        res.elementType.toLowerCase().includes(query) ||
        res.pageName.toLowerCase().includes(query)
    );

    return [...pageResults, ...filteredElements];
  }, [globalSearchQuery, pages]);

  // Execute result activation
  const executeSearchAction = (result: any) => {
    if (result.type === "page") {
      setActivePage(result.pageId);
    } else if (result.type === "element") {
      setActivePage(result.pageId);
      useBuilderStore.getState().selectElement(result.id);
      useBuilderStore.getState().setStylingState("default");
    }
    setIsGlobalSearchOpen(false);
    setGlobalSearchQuery("");
  };

  // Reset selected index on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [globalSearchQuery, searchResults]);

  // Handle keyboard keys in open search dialog
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        searchResults.length > 0 ? (prev + 1) % searchResults.length : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        searchResults.length > 0
          ? (prev - 1 + searchResults.length) % searchResults.length
          : 0
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (searchResults[selectedIndex]) {
        executeSearchAction(searchResults[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsGlobalSearchOpen(false);
      setGlobalSearchQuery("");
    }
  };

  // AutoCAD-style Key Listener (Start typing anywhere to search)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable);
      if (isInput) return;

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key.length === 1 && /^[a-zA-Z0-9]$/.test(e.key)) {
        e.preventDefault();
        setGlobalSearchQuery(e.key);
        setIsGlobalSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isGlobalSearchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isGlobalSearchOpen]);

  // Listen for clicks outside global search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
        setIsGlobalSearchOpen(false);
        setGlobalSearchQuery("");
      }
    }
    if (isGlobalSearchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isGlobalSearchOpen]);

  const undoable = useBuilderStore((s) => s.past.length > 0);
  const redoable = useBuilderStore((s) => s.future.length > 0);

  const [showExport, setShowExport] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const [showReflow, setShowReflow] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [exportFiles, setExportFiles] = useState<Record<string, string>>({});

  // Device dropdown state
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
  const activeLabel =
    canvasBreakpoint === "custom"
      ? "Custom Size"
      : activePreset
        ? activePreset.name
        : "Custom Size";

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

  return (
    <>
      <div className="h-12 border-b border-panel-border bg-panel-bg relative flex items-center justify-between px-4 shrink-0 select-none">
        {/* ── LEFT (Project, Save/Open, Undo/Redo, Page Breadcrumb) ── */}
        <div className="flex items-center gap-2 z-10 min-w-0">
          {/* Project Name editable input */}
          <div className="flex items-center gap-1.5 bg-white/4 hover:bg-white/6 px-2.5 py-1 rounded-lg border border-white/5 focus-within:border-white/20 transition-all h-8">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="bg-transparent text-xs text-white/90 font-medium focus:outline-none w-24 truncate placeholder-white/30"
              placeholder="Project Name"
              title="Project Name (editable)"
            />
          </div>

          {/* Save & Open */}
          <div className="flex items-center gap-0.5">
            <ToolbarBtn
              onClick={handleSaveProject}
              title="Save project (.ltica)"
            >
              <Save size={14} />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={handleLoadProject}
              title="Open / Load project (.ltica)"
            >
              <FolderOpen size={14} />
            </ToolbarBtn>
          </div>

          <div className="w-px h-4 bg-white/10 mx-0.5" />

          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5">
            <ToolbarBtn
              onClick={undo}
              title="Undo (⌘Z)"
              disabled={!undoable}
            >
              <Undo2 size={14} strokeWidth={2} />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={redo}
              title="Redo (⌘Y)"
              disabled={!redoable}
            >
              <Redo2 size={14} strokeWidth={2} />
            </ToolbarBtn>
          </div>
        </div>

        {/* ── CENTER (Viewport, Zoom & Guides — Dead-Center) ── */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 pointer-events-auto z-20">
          {/* Device Selection Dropdown & Dimensions */}
          <div className="flex items-center gap-1.5 shrink-0 select-none">
            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                onClick={() => {
                  setShowDropdown(!showDropdown);
                  setSearchQuery("");
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/4 hover:bg-white/8 border border-white/5 text-white/80 hover:text-white transition-all cursor-pointer text-xs font-medium shrink-0 h-8"
              >
                <span className="truncate max-w-[140px]">{activeLabel}</span>
                <ChevronDown size={12} className={`opacity-60 transition-transform shrink-0 ${showDropdown ? "rotate-180" : ""}`} />
              </button>

              {showDropdown && (
                <div className="absolute top-full left-0 mt-1.5 w-64 max-h-[380px] overflow-hidden flex flex-col bg-[#18181b] border border-white/10 rounded-xl shadow-[0_16px_36px_rgba(0,0,0,0.6)] z-[100] animate-in fade-in slide-in-from-top-1 duration-150">
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
                    {searchQuery === "" && (
                      <button
                        onClick={() => {
                          if (canvasBreakpoint !== "custom") {
                            const dims = resolveDeviceDimensions(canvasBreakpoint, customWidth, customHeight);
                            setCustomWidth(dims.width);
                            setCustomHeight(dims.height);
                          }
                          setCanvasBreakpoint("custom");
                          setShowDropdown(false);
                        }}
                        className={`flex items-center justify-between w-full text-left px-3 py-2 text-xs rounded-md transition-colors cursor-pointer ${
                          canvasBreakpoint === "custom"
                            ? "bg-white/12 text-white font-medium"
                            : "text-white/70 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <SlidersHorizontal size={12} className="text-white/40" />
                          <span>Custom Dimensions</span>
                        </div>
                        <span className="text-[10px] text-white/40 font-mono">
                          {customWidth} × {customHeight}
                        </span>
                      </button>
                    )}

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
                                setCustomWidth(device.width);
                                setCustomHeight(device.height);
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
                  const val = parseInt(e.target.value, 10);
                  const cleanVal = isNaN(val) ? 0 : val;
                  if (canvasBreakpoint !== "custom") {
                    const dims = resolveDeviceDimensions(canvasBreakpoint, customWidth, customHeight);
                    setCustomHeight(dims.height);
                    setCanvasBreakpoint("custom");
                  }
                  setCustomWidth(cleanVal);
                }}
                onBlur={() => {
                  if (!customWidth || customWidth < 200) {
                    setCustomWidth(200);
                  }
                }}
                className="w-12 h-6 text-[11px] bg-transparent text-white/90 border-0 focus:outline-none font-mono text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                  const val = parseInt(e.target.value, 10);
                  const cleanVal = isNaN(val) ? 0 : val;
                  if (canvasBreakpoint !== "custom") {
                    const dims = resolveDeviceDimensions(canvasBreakpoint, customWidth, customHeight);
                    setCustomWidth(dims.width);
                    setCanvasBreakpoint("custom");
                  }
                  setCustomHeight(cleanVal);
                }}
                onBlur={() => {
                  if (!customHeight || customHeight < 200) {
                    setCustomHeight(200);
                  }
                }}
                className="w-12 h-6 text-[11px] bg-transparent text-white/90 border-0 focus:outline-none font-mono text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="Height"
                title="Canvas height in pixels"
              />
            </div>
          </div>

          {/* ── Zoom Percentage Dropdown ── */}
          <div className="relative shrink-0 select-none" ref={zoomDropdownRef}>
            <button
              onClick={() => setShowZoomDropdown(!showZoomDropdown)}
              className="flex items-center gap-1 px-2.5 h-8 rounded-lg bg-white/4 hover:bg-white/8 border border-white/5 text-white/80 hover:text-white transition-all text-xs font-mono font-medium cursor-pointer"
              title="Canvas Zoom Level"
            >
              <span>{Math.round(zoom * 100)}%</span>
              <ChevronDown size={11} className={`opacity-50 transition-transform ${showZoomDropdown ? "rotate-180" : ""}`} />
            </button>

            {showZoomDropdown && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-36 flex flex-col bg-[#18181b] border border-white/10 rounded-xl shadow-[0_16px_36px_rgba(0,0,0,0.6)] z-[100] p-1 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-2.5 py-1 text-[9px] font-bold text-white/30 uppercase tracking-wider border-b border-white/5 mb-1">
                  Zoom
                </div>
                {[50, 75, 100, 125, 150, 200].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => {
                      setZoom(pct / 100);
                      setShowZoomDropdown(false);
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                      Math.round(zoom * 100) === pct
                        ? "bg-white/10 text-white font-bold"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span>{pct}%</span>
                    {pct === 100 && <span className="text-[9px] text-white/30 font-sans">⌘0</span>}
                  </button>
                ))}
                <div className="my-1 border-t border-white/5" />
                <button
                  onClick={() => {
                    setZoom((z) => Math.min(4.0, z + 0.1));
                    setShowZoomDropdown(false);
                  }}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <span>Zoom In</span>
                  <span className="text-[9px] text-white/30 font-sans">⌘+</span>
                </button>
                <button
                  onClick={() => {
                    setZoom((z) => Math.max(0.15, z - 0.1));
                    setShowZoomDropdown(false);
                  }}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <span>Zoom Out</span>
                  <span className="text-[9px] text-white/30 font-sans">⌘-</span>
                </button>
                <button
                  onClick={() => {
                    setZoom(1);
                    setShowZoomDropdown(false);
                  }}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <span>Reset 100%</span>
                  <span className="text-[9px] text-white/30 font-sans">100%</span>
                </button>
              </div>
            )}
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

        {/* ── RIGHT (Reflow, Tokens, Live Preview, Export) ── */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Responsive Reflow Simulator */}
          <ToolbarBtn
            onClick={() => setShowReflow((v) => !v)}
            title="Responsive Reflow Simulator (Detect Broken Breakpoints)"
            active={showReflow}
          >
            <Activity size={15} />
          </ToolbarBtn>

          {/* Design Tokens */}
          <ToolbarBtn
            onClick={() => setShowTokens((v) => !v)}
            title="Design tokens"
            active={showTokens}
          >
            <Palette size={15} />
          </ToolbarBtn>

          {/* Clean Website Preview Button */}
          <button
            onClick={() => openPreviewInBrowser(pages, components, activePage?.slug || "/")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/80 hover:text-white transition-all text-xs font-semibold cursor-pointer h-8"
            title="Preview Live Website in Browser"
          >
            <ExternalLink size={12} className="text-white/70" />
            <span>Preview</span>
          </button>

          {/* Clean Neutral Live Synced Badge */}
          {exportMode === "live" ? (
            <div
              className="flex items-center text-[11px] text-white/70 bg-white/4 border border-white/10 rounded-lg px-2.5 py-1.5 font-medium select-none h-8"
              title="Live workspace file sync is active"
            >
              <span>Live Synced</span>
            </div>
          ) : (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 text-[12px] bg-accent-blue hover:bg-accent-blue-hover text-white px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer h-8 border border-accent-blue/30"
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
      {showReflow && (
        <ReflowSimulatorModal onClose={() => setShowReflow(false)} />
      )}
      {showExport && (
        <CodeExportModal
          files={exportFiles}
          onClose={() => setShowExport(false)}
        />
      )}
      {isGlobalSearchOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[499]"
            onClick={() => {
              setIsGlobalSearchOpen(false);
              setGlobalSearchQuery("");
            }}
          />

          {/* Command Palette */}
          <div
            ref={searchDropdownRef}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-[500px] bg-zinc-950/95 border border-zinc-800 rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.85)] z-[500] p-3 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
          >
            {/* Input Header */}
            <div className="flex items-center gap-3 px-3 py-1 bg-white/[0.02] border border-white/5 rounded-xl">
              <Search size={16} className="text-white/30 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search page elements and site pages..."
                className="flex-1 bg-transparent text-xs text-white placeholder-white/30 focus:outline-none py-2.5 font-medium"
              />
              <div className="flex items-center gap-1.5 shrink-0 select-none">
                <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 font-sans border border-white/5">ESC</kbd>
              </div>
            </div>

            {/* Results List */}
            <div className="flex flex-col max-h-[280px] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent] pr-1">
              {searchResults.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {searchResults.map((res, idx) => {
                    const isSelected = idx === selectedIndex;
                    let IconComp = FileText;
                    let iconColor = "text-emerald-400";
                    let typeLabel = "Page";

                    if (res.type === "element") {
                      IconComp = BoxSelect;
                      iconColor = "text-pink-400";
                      typeLabel = `${(res as any).elementType}`;
                    }

                    return (
                      <button
                        key={res.id}
                        onClick={() => executeSearchAction(res)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-left cursor-pointer transition-all border ${
                          isSelected
                            ? "bg-white/8 border-white/10 text-white"
                            : "bg-transparent border-transparent text-white/60 hover:bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <IconComp size={15} className={`${iconColor} shrink-0`} />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold truncate">
                              {res.name}
                            </span>
                            <span className="text-[10px] text-white/30 truncate mt-0.5">
                              {res.type === "element"
                                ? `Page: ${(res as any).pageName}`
                                : "Page"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 select-none">
                          <span className="text-[9px] uppercase tracking-wider text-white/20 font-bold font-sans">
                            {typeLabel}
                          </span>
                          {isSelected && (
                            <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/80 font-sans border border-white/10">⏎ Enter</kbd>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-xs text-white/30 select-none flex flex-col items-center gap-1.5">
                  <Search size={20} className="opacity-20" />
                  <span>
                    {globalSearchQuery
                      ? "No search results found"
                      : "Type keywords to search pages and canvas elements."}
                  </span>
                </div>
              )}
            </div>
          </div>
        </>
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
