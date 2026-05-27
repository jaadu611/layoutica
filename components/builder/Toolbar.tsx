"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import DesignTokensPanel from "./DesignTokensPanel";
import { CanvasBackground, CanvasBreakpoint } from "@/lib/builder/types";

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
      className={`flex items-center justify-center w-8 h-8 rounded transition-all cursor-pointer shrink-0 ${
        disabled
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
    showGrid,
    showPadding,
    showMargin,
    setCanvasBreakpoint,
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



  const handleExport = () => {
    const files = generateAllPages(pages, components);
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
          <div className="flex items-center gap-3 pr-4 border-r border-panel-border">
            <div className="w-5 h-5 flex items-center justify-center text-white/90 shrink-0">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 0C3.134 0 0 3.134 0 7V14H7C10.866 14 14 10.866 14 7C14 3.134 10.866 0 7 0Z"
                  fill="#F24E1E"
                />
                <path d="M0 0H7V7H0V0Z" fill="#FF7262" />
                <path d="M0 7H7V14H0V7Z" fill="#1ABCFE" />
                <path d="M7 7H14V14H7V7Z" fill="#0ACF83" />
                <path d="M7 0H14V7H7V0Z" fill="#A259FF" />
              </svg>
            </div>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="bg-transparent text-[13px] font-medium text-white/90 tracking-wide focus:outline-none hover:bg-white/5 px-1 rounded transition-colors w-32 truncate"
              placeholder="Project Name"
            />
          </div>

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
          {/* Breakpoint */}
          <div
            className="flex items-center p-0.5 rounded-lg shrink-0"
            style={{ background: "var(--active-bg)" }}
          >
            {(
              [
                { id: "desktop", icon: Monitor, label: "Desktop" },
                { id: "tablet", icon: Tablet, label: "Tablet (768px)" },
                { id: "mobile", icon: Smartphone, label: "Mobile (390px)" },
              ] as const
            ).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setCanvasBreakpoint(id)}
                title={label}
                className={`flex items-center justify-center w-7 h-7 rounded-md transition-all cursor-pointer ${
                  canvasBreakpoint === id
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-white/35 hover:text-white/70"
                }`}
              >
                <Icon size={13} />
              </button>
            ))}
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
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 text-[12px] bg-accent-blue hover:bg-accent-blue-hover text-white px-3 py-1.5 rounded-[5px] font-medium transition-colors cursor-pointer"
          >
            <Share size={12} />
            Export Code
          </button>
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
