"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useBuilderStore } from "@/lib/builder/frontend/store";
import { useBackendStore } from "@/lib/builder/backend/store";
import { generateAllPages } from "@/lib/builder/frontend/codeGenerator";
import { ProjectSaverLoader } from "@/lib/builder/frontend/projectSaverLoader";
import CodeExportModal from "./CodeExportModal";
import {
  Undo2,
  Redo2,
  Share,
  Palette,
  Save,
  FolderOpen,
  Grid3X3,
  Square,
  BoxSelect,
  Trash2,
  Crop,
  ChevronDown,
  Search,
  Server,
  Database,
  GripVertical,
  Sparkles,
  FileCode,
  Layers,
  Route,
  ArrowLeftRight,
  Shield,
  Settings,
  Home,
  X,
  Folder,
  FileText,
} from "lucide-react";
import DesignTokensPanel from "./DesignTokensPanel";
import { CanvasBackground, CanvasBreakpoint, CanvasElement } from "@/lib/builder/frontend/types";
import { DEVICE_PRESETS, resolveDeviceDimensions } from "@/lib/builder/frontend/devices";

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
    mode, 
    setMode,
    undo: backendUndo,
    redo: backendRedo,
    undoable: backendUndoable,
    redoable: backendRedoable,
    activeFolderPath,
    navigateToFolder,
    nodes,
    selectNode,
    organizeWorkspaceGrid,
  } = useBackendStore();

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

  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Breadcrumbs computation
  const breadcrumbs = activeFolderPath ? activeFolderPath.split("/") : [];

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      navigateToFolder("");
    } else {
      const newPath = breadcrumbs.slice(0, index + 1).join("/");
      navigateToFolder(newPath);
    }
    selectNode(null);
  };

  // Helper to extract folders from backend nodes path
  const allFolders = useMemo(() => {
    const folders = new Set<string>();
    nodes.forEach((n) => {
      if (n.path) {
        const parts = n.path.split("/");
        for (let i = 1; i <= parts.length; i++) {
          folders.add(parts.slice(0, i).join("/"));
        }
      }
    });
    return Array.from(folders).map((f) => {
      const parts = f.split("/");
      return {
        type: "folder" as const,
        id: `folder-${f}`,
        name: parts[parts.length - 1],
        path: f,
      };
    });
  }, [nodes]);

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

  // Combined search results ( AutoCAD-style search over folders, files, pages, and elements )
  const searchResults = useMemo(() => {
    if (!globalSearchQuery) return [];
    const query = globalSearchQuery.toLowerCase();

    if (mode === "backend") {
      const fileResults = nodes
        .filter(
          (n) =>
            n.name.toLowerCase().includes(query) ||
            n.path.toLowerCase().includes(query)
        )
        .map((n) => ({
          type: "file" as const,
          id: n.id,
          name: n.name,
          extension: n.extension || "ts",
          path: n.path,
        }));

      const folderResults = allFolders
        .filter(
          (f) =>
            f.name.toLowerCase().includes(query) ||
            f.path.toLowerCase().includes(query)
        )
        .map((f) => ({
          type: "folder" as const,
          id: f.id,
          name: f.name,
          path: f.path,
        }));

      return [...fileResults, ...folderResults];
    } else {
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
    }
  }, [mode, globalSearchQuery, nodes, allFolders, pages]);

  // Execute result activation
  const executeSearchAction = (result: any) => {
    if (result.type === "file") {
      navigateToFolder(result.path);
      selectNode(result.id);
      window.dispatchEvent(new CustomEvent("center-on-node", { detail: { nodeId: result.id } }));
    } else if (result.type === "folder") {
      navigateToFolder(result.path);
      selectNode(null);
    } else if (result.type === "page") {
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

      // Ignore modifier keys
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Only capture printable alphanumeric keys
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

  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);
  const templatesDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (templatesDropdownRef.current && !templatesDropdownRef.current.contains(event.target as Node)) {
        setShowTemplatesDropdown(false);
      }
    }
    if (showTemplatesDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showTemplatesDropdown]);

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


  return (
    <>
      <div className="h-12 border-b border-panel-border bg-panel-bg flex items-center justify-between px-4 shrink-0 select-none gap-3">
        {/* ── LEFT ── */}
        <div className="flex items-center gap-3 shrink-0">

          {/* Mode Switcher */}
          <div className="flex items-center bg-white/4 p-0.5 rounded-lg border border-white/5 shrink-0 h-8 mr-2 select-none">
            <button
              onClick={() => setMode("frontend")}
              className={`px-3 h-7 text-[11px] font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                mode === "frontend"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              <Sparkles size={11} />
              Frontend
            </button>
            <button
              onClick={() => setMode("backend")}
              className={`px-3 h-7 text-[11px] font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                mode === "backend"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              <Server size={11} />
              Backend
            </button>
          </div>

          <div className="flex items-center gap-1">
            <ToolbarBtn
              onClick={() => {
                if (mode === "frontend" && undoable) undo();
                if (mode === "backend" && backendUndoable) backendUndo();
              }}
              title="Undo (⌘Z)"
              disabled={mode === "frontend" ? !undoable : !backendUndoable}
            >
              <Undo2 size={15} strokeWidth={2} />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => {
                if (mode === "frontend" && redoable) redo();
                if (mode === "backend" && backendRedoable) backendRedo();
              }}
              title="Redo (⌘Y)"
              disabled={mode === "frontend" ? !redoable : !backendRedoable}
            >
              <Redo2 size={15} strokeWidth={2} />
            </ToolbarBtn>
          </div>
        </div>

        {/* ── CENTER ── */}
        <div className="flex items-center gap-1.5 flex-1 justify-center min-w-0">
          {mode === "backend" ? (
            <div className="flex items-center gap-3">
              {/* Breadcrumbs */}
              <div className="flex items-center gap-1 bg-white/4 px-2 py-1 rounded-lg border border-white/5 max-w-[280px] overflow-hidden truncate h-8 shrink-0">
                <button
                  onClick={() => handleBreadcrumbClick(-1)}
                  className="flex items-center gap-1 text-[11px] text-white/45 hover:text-white/80 transition-colors cursor-pointer"
                >
                  <Home size={11} />
                  <span>root</span>
                </button>
                {breadcrumbs.map((crumb, idx) => (
                  <span key={idx} className="flex items-center">
                    <span className="text-white/20 mx-1 text-[10px]">/</span>
                    <button
                      onClick={() => handleBreadcrumbClick(idx)}
                      className={`text-[11px] transition-colors cursor-pointer ${
                        idx === breadcrumbs.length - 1
                          ? "text-white font-medium"
                          : "text-white/45 hover:text-white/85"
                      }`}
                    >
                      {crumb}
                    </button>
                  </span>
                ))}
              </div>

              <div className="relative select-none" ref={templatesDropdownRef}>
                <button
                  onClick={() => setShowTemplatesDropdown(!showTemplatesDropdown)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all cursor-pointer text-xs font-semibold h-8"
                >
                  <FileCode size={13} className="text-violet-400" />
                  <span>File Templates</span>
                  <ChevronDown size={12} className={`opacity-60 transition-transform ${showTemplatesDropdown ? "rotate-180" : ""}`} />
                </button>

                {showTemplatesDropdown && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-52 flex flex-col bg-[#18181b] border border-zinc-800 rounded-lg z-[100] p-1 animate-in fade-in slide-in-from-top-1 duration-150 select-none">
                    <div className="px-3 py-1.5 text-[9px] font-bold text-white/30 uppercase tracking-widest select-none border-b border-white/5 mb-1">
                      Drag to Canvas
                    </div>
                    {[
                      { name: "db.ts", icon: Database, color: "text-emerald-400" },
                      { name: "store.ts", icon: Layers, color: "text-blue-400" },
                      { name: "route.ts", icon: Route, color: "text-violet-400" },
                      { name: "middleware.ts", icon: ArrowLeftRight, color: "text-amber-400" },
                      { name: "auth.ts", icon: Shield, color: "text-rose-400" },
                      { name: "config.ts", icon: Settings, color: "text-zinc-400" },
                      { name: "generic.ts", label: "file.ts", icon: FileCode, color: "text-teal-400" },
                    ].map((template) => {
                      const TemplateIcon = template.icon;
                      const dragVal = template.name === "generic.ts" ? "generic" : template.name;
                      const label = template.label || template.name;
                      return (
                        <div
                          key={template.name}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", dragVal);
                            // Close dropdown after short delay to let drag start successfully
                            setTimeout(() => setShowTemplatesDropdown(false), 200);
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/5 rounded-md cursor-grab active:cursor-grabbing select-none"
                        >
                          <GripVertical size={11} className="text-white/20" />
                          <TemplateIcon size={12} className={template.color} />
                          <span className="font-medium">{label}</span>
                        </div>
                      );
                    })}
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
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* ── RIGHT ── */}
        <div className="flex items-center gap-2 shrink-0">
          {mode === "backend" ? (
            <div className="flex items-center gap-2 select-none">
              {/* Clean Layout */}
              <button
                onClick={organizeWorkspaceGrid}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/4 hover:bg-white/10 border border-white/5 hover:border-white/20 text-white/60 hover:text-white transition-colors text-xs font-semibold cursor-pointer h-8 shrink-0"
                title="Clean Layout (Topological Connection-based Grid Layout)"
              >
                <Route size={12} className="text-violet-400" />
                <span>Clean Layout</span>
              </button>
            </div>
          ) : (
            <>
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
            </>
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
                placeholder={
                  mode === "backend"
                    ? "Search workspace files and folders..."
                    : "Search page elements and site pages..."
                }
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
                    let IconComp = FileCode;
                    let iconColor = "text-violet-400";
                    let typeLabel = "";

                    if (res.type === "folder") {
                      IconComp = Folder;
                      iconColor = "text-amber-400";
                      typeLabel = "Folder";
                    } else if (res.type === "file") {
                      IconComp = Database;
                      iconColor = "text-blue-400";
                      typeLabel = `File (.${(res as any).extension})`;
                    } else if (res.type === "page") {
                      IconComp = FileText;
                      iconColor = "text-emerald-400";
                      typeLabel = "Page";
                    } else if (res.type === "element") {
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
                                : res.path || "root"}
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
                      : "Type keywords to search files, folders, pages, and canvas elements."}
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
