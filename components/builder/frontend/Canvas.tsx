"use client";

import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useBuilderStore } from "@/lib/builder/frontend/store";
import { ElementType, CanvasElement } from "@/lib/builder/frontend/types";
import { resolveDeviceDimensions, DEVICE_PRESETS } from "@/lib/builder/frontend/devices";
import { defaultElement } from "./Sidebar";
import * as LucideIcons from "lucide-react";

const { ArrowUp, ArrowDown, Trash2, Copy, Plus, Bookmark, X, Minus, Palette, Grid3X3, Square, BoxSelect } = LucideIcons;

const TEXT_TYPES = new Set([
  "heading",
  "heading2",
  "heading3",
  "heading4",
  "heading5",
  "heading6",
  "paragraph",
  "text",
  "span",
  "link",
  "button",
  "badge",
  "blockquote",
  "code",
  "pre",
  "footer",
  "navbar",
  "label",
  "legend",
]);

const STYLE_SKIP = new Set([
  "gradientType",
  "gradientAngle",
  "gradientStartColor",
  "gradientEndColor",
  "lineClamp",
  "tableStripe",
  "tableHeaderBackground",
  "tableCellPadding",
]);

function styleObjToDeclarations(styles: Record<string, any>): string {
  const lines: string[] = [];
  for (const [key, val] of Object.entries(styles)) {
    if (val === undefined || val === "" || STYLE_SKIP.has(key)) continue;
    const cssKey = key.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`);
    lines.push(`  ${cssKey}: ${val} !important;`);
  }
  if (
    styles.gradientType === "linear" &&
    styles.gradientStartColor &&
    styles.gradientEndColor
  )
    lines.push(
      `  background-image: linear-gradient(${styles.gradientAngle ?? 135}deg, ${styles.gradientStartColor}, ${styles.gradientEndColor}) !important;`,
    );
  if (styles.lineClamp)
    lines.push(
      `  display: -webkit-box !important;`,
      `  -webkit-line-clamp: ${styles.lineClamp} !important;`,
      `  -webkit-box-orient: vertical !important;`,
      `  overflow: hidden !important;`,
    );
  return lines.join("\n");
}

function buildStateCSS(elements: CanvasElement[]): string {
  const rules: string[] = [];
  function walk(el: CanvasElement) {
    const hasHover = el.hoverStyles && Object.keys(el.hoverStyles).length > 0;
    const hasActive =
      el.activeStyles && Object.keys(el.activeStyles).length > 0;
    const hasFocus = el.focusStyles && Object.keys(el.focusStyles).length > 0;
    if ((hasHover || hasActive || hasFocus) && el.styles.transition)
      rules.push(
        `[data-bid="${el.id}"] {\n  transition: ${el.styles.transition};\n}`,
      );
    if (hasHover) {
      const d = styleObjToDeclarations(el.hoverStyles as Record<string, any>);
      if (d) rules.push(`[data-bid="${el.id}"]:hover {\n${d}\n}`);
    }
    if (hasActive) {
      const d = styleObjToDeclarations(el.activeStyles as Record<string, any>);
      if (d) rules.push(`[data-bid="${el.id}"]:active {\n${d}\n}`);
    }
    if (hasFocus) {
      const d = styleObjToDeclarations(el.focusStyles as Record<string, any>);
      if (d) rules.push(`[data-bid="${el.id}"]:focus {\n${d}\n}`);
    }
    for (const child of el.children || []) walk(child);
  }
  for (const el of elements) walk(el);
  return rules.join("\n\n");
}

function HoverActiveStyleSheet() {
  const pages = useBuilderStore((s) => s.pages);
  const activePageId = useBuilderStore((s) => s.activePageId);
  const designTokens = useBuilderStore((s) => s.designTokens);
  const activePage = pages.find((p) => p.id === activePageId);
  useEffect(() => {
    const css = activePage ? buildStateCSS(activePage.elements) : "";
    const id = "builder-hover-active-styles";
    let tag = document.getElementById(id) as HTMLStyleElement | null;
    if (!tag) {
      tag = document.createElement("style");
      tag.id = id;
      document.head.appendChild(tag);
    }
    let tokenCss = "";
    if (designTokens && designTokens.colors) {
      const varLines = designTokens.colors.map(
        (c) => `--color-${c.name.toLowerCase().replace(/[^a-z0-9]/gi, "-")}: ${c.value};`
      );
      tokenCss = `:root {\n${varLines.map((l) => `  ${l}`).join("\n")}\n}\n\n`;
    }
    tag.textContent = tokenCss + css;
  });
  return null;
}



function ContextMenu({
  x,
  y,
  elId,
  onClose,
  onClearCanvas,
  isolatedPageId,
  setIsolatedPageId,
}: {
  x: number;
  y: number;
  elId: string;
  onClose: () => void;
  onClearCanvas?: () => void;
  isolatedPageId: string | null;
  setIsolatedPageId: (id: string | null) => void;
}) {
  const {
    moveElement,
    deleteElement,
    duplicateElement,
    saveComponent,
    getActivePage,
    designTokens,
    setDesignTokens,
    showGrid,
    showPadding,
    showMargin,
    setShowGrid,
    setShowPadding,
    setShowMargin,
    pages,
    setActivePage,
  } = useBuilderStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState("");

  const page = getActivePage();

  const el = React.useMemo(() => {
    if (!page) return undefined;
    const find = (els: CanvasElement[]): CanvasElement | undefined => {
      for (const item of els) {
        if (item.id === elId) return item;
        if (item.children) {
          const f = find(item.children);
          if (f) return f;
        }
      }
    };
    return find(page.elements);
  }, [page, elId]);

  useLayoutEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      setPos({
        left:
          x + rect.width > window.innerWidth ? Math.max(0, x - rect.width) : x,
        top:
          y + rect.height > window.innerHeight
            ? Math.max(0, y - rect.height)
            : y,
      });
    }
  }, [x, y]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        onClose();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  if (elId === "canvas") {
    return (
      <div
        ref={menuRef}
        className="fixed z-10000 bg-panel-bg border border-panel-border rounded-lg shadow-2xl py-1.5 min-w-[180px]"
        style={{ left: pos.left, top: pos.top }}
        onClick={(e) => e.stopPropagation()}
      >
        {isolatedPageId && (
          <>
            <button
              onClick={() => {
                setIsolatedPageId(null);
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-white/70 hover:bg-white/5 hover:text-white transition-colors"
            >
              <Grid3X3 size={12} className="text-white/30" /> Show All Pages
            </button>
            <div className="my-1 border-t border-panel-border" />
          </>
        )}
        <div className="px-3 py-1.5 mb-1 border-b border-panel-border">
          <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
            Canvas Settings
          </span>
        </div>
        <button
          onClick={() => {
            setShowGrid(!showGrid);
            onClose();
          }}
          className="w-full flex items-center justify-between px-3 py-2 text-[11px] text-white/70 hover:bg-white/5 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Grid3X3 size={12} className="text-white/30" /> Grid
          </div>
          <span className="text-[10px] text-white/40">{showGrid ? "On" : "Off"}</span>
        </button>
        <button
          onClick={() => {
            setShowPadding(!showPadding);
            onClose();
          }}
          className="w-full flex items-center justify-between px-3 py-2 text-[11px] text-white/70 hover:bg-white/5 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Square size={12} className="text-white/30" /> Padding Overlay
          </div>
          <span className="text-[10px] text-white/40">{showPadding ? "On" : "Off"}</span>
        </button>
        <button
          onClick={() => {
            setShowMargin(!showMargin);
            onClose();
          }}
          className="w-full flex items-center justify-between px-3 py-2 text-[11px] text-white/70 hover:bg-white/5 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <BoxSelect size={12} className="text-white/30" /> Margin Overlay
          </div>
          <span className="text-[10px] text-white/40">{showMargin ? "On" : "Off"}</span>
        </button>
        <div className="my-1 border-t border-panel-border" />
        <button
          onClick={() => {
            if (onClearCanvas) onClearCanvas();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 size={12} /> Clear Canvas
        </button>
      </div>
    );
  }

  const handleSave = () => {
    if (!el) return;
    saveComponent(saveName.trim() || el.type, el);
    onClose();
  };

  const handleCreateColorVariable = () => {
    if (!el) return;
    const colorVal = el.styles?.backgroundColor || el.styles?.color;
    const finalColor = (colorVal && colorVal.startsWith("#")) ? colorVal : "#6366f1";

    const nextId = `c-${Math.random().toString(36).substr(2, 9)}`;
    const newColorToken = { id: nextId, name: finalColor, value: finalColor };

    const currentColors = designTokens?.colors || [];
    const currentTypography = designTokens?.typography || [];

    const updated = {
      colors: [...currentColors, newColorToken],
      typography: currentTypography,
    };

    setDesignTokens(updated);
    onClose();
  };

  const pgOfElement = React.useMemo(() => {
    for (const p of pages) {
      if (p.id === elId) return p;
      const find = (els: CanvasElement[]): CanvasElement | undefined => {
        for (const item of els) {
          if (item.id === elId) return item;
          if (item.children) {
            const f = find(item.children);
            if (f) return f;
          }
        }
      };
      if (find(p.elements)) return p;
    }
    return undefined;
  }, [pages, elId]);

  return (
    <div
      ref={menuRef}
      className="fixed z-10000 bg-panel-bg border border-panel-border rounded-lg shadow-2xl py-1.5 min-w-[180px]"
      style={{ left: pos.left, top: pos.top }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1.5 mb-1 border-b border-panel-border">
        <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
          Element
        </span>
      </div>
      {pgOfElement && (
        <>
          {isolatedPageId === pgOfElement.id ? (
            <button
              onClick={() => {
                setIsolatedPageId(null);
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-white/70 hover:bg-white/5 hover:text-white transition-colors"
            >
              <Grid3X3 size={12} className="text-white/30" /> Show All Pages
            </button>
          ) : (
            <button
              onClick={() => {
                setIsolatedPageId(pgOfElement.id);
                setActivePage(pgOfElement.id);
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-white/70 hover:bg-white/5 hover:text-white transition-colors"
            >
              <BoxSelect size={12} className="text-white/30" /> Focus Page
            </button>
          )}
          <div className="my-1 border-t border-panel-border" />
        </>
      )}
      {[
        {
          label: "Move Up",
          icon: <ArrowUp size={12} className="text-white/30" />,
          action: () => {
            moveElement(elId, "up");
            onClose();
          },
        },
        {
          label: "Move Down",
          icon: <ArrowDown size={12} className="text-white/30" />,
          action: () => {
            moveElement(elId, "down");
            onClose();
          },
        },
      ].map(({ label, icon, action }) => (
        <button
          key={label}
          onClick={action}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-white/70 hover:bg-white/5 hover:text-white transition-colors"
        >
          {icon} {label}
        </button>
      ))}
      <div className="my-1 border-t border-panel-border" />
      <button
        onClick={() => {
          duplicateElement(elId);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-white/70 hover:bg-white/5 hover:text-white transition-colors"
      >
        <Copy size={12} className="text-white/30" /> Duplicate
      </button>
      <div className="my-1 border-t border-panel-border" />
      <button
        onClick={handleCreateColorVariable}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-white/70 hover:bg-white/5 hover:text-white transition-colors"
      >
        <Palette size={12} className="text-white/30" /> Create Color Variable
      </button>
      <div className="my-1 border-t border-panel-border" />
      {saving ? (
        <div className="px-3 py-2 flex gap-1.5">
          <input
            autoFocus
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") setSaving(false);
            }}
            placeholder="Component name..."
            className="flex-1 text-[11px] bg-white/5 border border-white/10 rounded px-2 py-1 outline-none focus:border-blue-500/50 text-white placeholder-white/25"
          />
          <button
            onClick={handleSave}
            className="text-[11px] bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
          >
            Save
          </button>
        </div>
      ) : (
        <button
          onClick={() => setSaving(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-white/70 hover:bg-white/5 hover:text-white transition-colors"
        >
          <Bookmark size={12} className="text-white/30" /> Save as Component
        </button>
      )}
      <div className="my-1 border-t border-panel-border" />
      <button
        onClick={() => {
          deleteElement(elId);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-red-400 hover:bg-red-500/10 transition-colors"
      >
        <Trash2 size={12} /> Delete
      </button>
    </div>
  );
}
function InlineEditor({
  el,
  onCommit,
  onCancel,
}: {
  el: CanvasElement;
  onCommit: (val: string) => void;
  onCancel: () => void;
}) {
  const isMultiline = [
    "paragraph",
    "text",
    "blockquote",
    "pre",
    "footer",
    "code",
  ].includes(el.type);
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, []);
  const {
    gradientType,
    gradientAngle,
    gradientStartColor,
    gradientEndColor,
    lineClamp,
    ...restStyles
  } = el.styles as any;
  const sharedStyle: React.CSSProperties = {
    ...restStyles,
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    background: "transparent",
    border: "none",
    outline: "2px solid #0d99ff",
    outlineOffset: "-2px",
    padding: "inherit",
    margin: 0,
    font: "inherit",
    color: "inherit",
    lineHeight: "inherit",
    letterSpacing: "inherit",
    textAlign: (restStyles.textAlign as any) || "inherit",
    resize: "none",
    zIndex: 200,
    cursor: "text",
    borderRadius: (restStyles.borderRadius as any) || 0,
    boxSizing: "border-box",
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
    if (e.key === "Enter" && !isMultiline) {
      e.preventDefault();
      onCommit((e.target as HTMLInputElement).value);
    }
    if (e.key === "Enter" && e.metaKey) {
      e.preventDefault();
      onCommit((e.target as HTMLTextAreaElement).value);
    }
    e.stopPropagation();
  };
  if (isMultiline)
    return (
      <textarea
        ref={ref as any}
        defaultValue={el.content || ""}
        style={sharedStyle}
        onKeyDown={handleKeyDown}
        onBlur={(e) => onCommit(e.target.value)}
        onClick={(e) => e.stopPropagation()}
      />
    );
  return (
    <input
      ref={ref as any}
      type="text"
      defaultValue={el.content || ""}
      style={sharedStyle}
      onKeyDown={handleKeyDown}
      onBlur={(e) => onCommit(e.target.value)}
      onClick={(e) => e.stopPropagation()}
    />
  );
}
interface RenderElementProps {
  el: CanvasElement;
  index: number;
  parentId?: string;
  pageId: string;
  zoom: number;
  onReorderDragStart: (e: React.DragEvent, id: string) => void;
  onReorderDragOver: (
    e: React.DragEvent,
    id: string,
    index: number,
    parentId: string | undefined,
    parentIsHorizontal: boolean,
    canHaveChildren: boolean,
  ) => void;
  onReorderDrop: (
    e: React.DragEvent,
    targetId: string,
    targetIndex: number,
    targetParentId: string | undefined,
  ) => void;
  draggingId: string | null;
  dropTargetId: string | null;
  dropPos: "top" | "bottom" | "left" | "right" | "inside";
  parentIsHorizontal: boolean;
  onContextMenu: (e: React.MouseEvent, elId: string) => void;
  editingId: string | null;
  onStartEdit: (id: string) => void;
  onCommitEdit: (id: string, val: string) => void;
  onCancelEdit: () => void;
}
function RenderElement({
  el,
  index,
  parentId,
  pageId,
  zoom,
  onReorderDragStart,
  onReorderDragOver,
  onReorderDrop,
  draggingId,
  dropTargetId,
  dropPos,
  parentIsHorizontal,
  onContextMenu,
  editingId,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
}: RenderElementProps) {
  const {
    selectedElementId,
    selectedElementIds,
    hoveredElementId,
    selectElement,
    toggleSelectElement,
    setHoveredElement,
    updateElement,
    activePageId,
    setActivePage,
    canvasBreakpoint,
    customWidth,
    customHeight,
  } = useBuilderStore();

  const preset = DEVICE_PRESETS.find((d) => d.id === canvasBreakpoint);
  let activeCategory: "Desktop" | "Tablet" | "Mobile" = "Desktop";
  if (preset) {
    activeCategory = preset.type;
  } else if (canvasBreakpoint === "desktop") {
    activeCategory = "Desktop";
  } else if (canvasBreakpoint === "tablet") {
    activeCategory = "Tablet";
  } else if (canvasBreakpoint === "mobile") {
    activeCategory = "Mobile";
  } else {
    const width = resolveDeviceDimensions(canvasBreakpoint, customWidth, customHeight).width;
    if (width < 768) activeCategory = "Mobile";
    else if (width < 1024) activeCategory = "Tablet";
    else activeCategory = "Desktop";
  }

  const showOnCurrentBreakpoint = (() => {
    const showDesktop = el.responsiveVisibility?.desktop ?? true;
    const showTablet = el.responsiveVisibility?.tablet ?? true;
    const showMobile = el.responsiveVisibility?.mobile ?? true;
    if (activeCategory === "Desktop") return showDesktop;
    if (activeCategory === "Tablet") return showTablet;
    return showMobile;
  })();

  const isSelected = selectedElementId === el.id;
  const isMultiSelected = (selectedElementIds ?? []).includes(el.id);
  const isAnySelected = isSelected || isMultiSelected;
  const isHovered = hoveredElementId === el.id && !isAnySelected;
  const isEditing = editingId === el.id;
  const isTarget = dropTargetId === el.id && draggingId !== el.id;
  const isHorizontal =
    el.styles.display === "flex" && el.styles.flexDirection !== "column";
  const canHaveChildren = [
    "div",
    "section",
    "article",
    "aside",
    "main",
    "header",
    "footer",
    "nav",
    "form",
    "navbar",
    "card",
    "figure",
  ].includes(el.type);
  const isTextType = TEXT_TYPES.has(el.type);
  const isHidden = !!el.metadata?.isHidden || !showOnCurrentBreakpoint;
  const isLocked = !!el.metadata?.isLocked;
  const isResizing = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startSize = useRef({ width: 0, height: 0 });
  const isDraggingFree = useRef(false);
  const startElPos = useRef({ top: 0, left: 0 });

  const onFreeDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (isEditing || isLocked) return;
      const pos = el.styles.position;
      if (pos !== "absolute" && pos !== "fixed") return;
      e.preventDefault();
      e.stopPropagation();
      isDraggingFree.current = true;
      if (activePageId !== pageId) {
        setActivePage(pageId);
      }
      selectElement(el.id);
      const node = e.currentTarget as HTMLElement;
      const offsetParent =
        (node.offsetParent as HTMLElement) || document.documentElement;
      const parentRect = offsetParent.getBoundingClientRect();
      const nodeRect = node.getBoundingClientRect();
      const actualTop = nodeRect.top - parentRect.top + offsetParent.scrollTop;
      const actualLeft =
        nodeRect.left - parentRect.left + offsetParent.scrollLeft;
      startElPos.current = { top: actualTop, left: actualLeft };
      startPos.current = {
        x: e.clientX,
        y: e.clientY,
      };
      updateElement(el.id, {
        styles: {
          top: `${Math.round(actualTop)}px`,
          left: `${Math.round(actualLeft)}px`,
        },
      });
      const onMove = (mv: MouseEvent) => {
        if (!isDraggingFree.current) return;
        const dx = (mv.clientX - startPos.current.x) / zoom;
        const dy = (mv.clientY - startPos.current.y) / zoom;
        updateElement(el.id, {
          styles: {
            top: `${Math.round(startElPos.current.top + dy)}px`,
            left: `${Math.round(startElPos.current.left + dx)}px`,
          },
        });
      };
      const onUp = () => {
        isDraggingFree.current = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [el.id, el.styles, isEditing, isLocked, selectElement, updateElement, zoom, activePageId, setActivePage, pageId],
  );

  const onResizeStart = useCallback(
    (direction: "right" | "bottom" | "both") => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isResizing.current = true;
      startPos.current = { x: e.clientX, y: e.clientY };

      const handleEl = e.currentTarget as HTMLElement;
      const artboardEl = handleEl.closest('[data-artboard="true"]') as HTMLElement | null;
      const startScrollTop = artboardEl ? artboardEl.scrollTop : 0;

      let currentMouseX = e.clientX;
      let currentMouseY = e.clientY;

      const rect = handleEl.parentElement?.getBoundingClientRect();
      if (rect) {
        startSize.current = {
          width: rect.width / zoom,
          height: rect.height / zoom,
        };
      }

      const updateResize = (mouseX: number, mouseY: number, scrollDeltaVal: number) => {
        const dx = (mouseX - startPos.current.x) / zoom;
        const dy = (mouseY - startPos.current.y) / zoom;
        const updates: any = {};
        if (direction === "right" || direction === "both") {
          updates.width = `${Math.max(40, startSize.current.width + dx)}px`;
        }
        if (direction === "bottom" || direction === "both") {
          updates.height = `${Math.max(20, startSize.current.height + dy + scrollDeltaVal)}px`;
        }
        updateElement(el.id, {
          styles: {
            ...el.styles,
            ...updates,
          },
        });
      };

      let animationFrameId: number | null = null;
      let lastTime = performance.now();

      const scrollLoop = () => {
        if (!isResizing.current || !artboardEl) return;

        const now = performance.now();
        const dt = now - lastTime;
        lastTime = now;

        const artboardRect = artboardEl.getBoundingClientRect();
        const threshold = 40; // px in screen space
        const maxScrollSpeed = 0.4; // CSS px per ms

        let scrollSpeed = 0;
        if (currentMouseY > artboardRect.bottom - threshold && currentMouseY < artboardRect.bottom + 20) {
          const ratio = Math.min(1, (currentMouseY - (artboardRect.bottom - threshold)) / threshold);
          scrollSpeed = ratio * maxScrollSpeed;
        } else if (currentMouseY < artboardRect.top + threshold && currentMouseY > artboardRect.top - 20) {
          const ratio = Math.min(1, ((artboardRect.top + threshold) - currentMouseY) / threshold);
          scrollSpeed = -ratio * maxScrollSpeed;
        }

        if (scrollSpeed !== 0) {
          artboardEl.scrollTop = Math.max(
            0,
            Math.min(artboardEl.scrollHeight - artboardEl.clientHeight, artboardEl.scrollTop + scrollSpeed * dt)
          );
          const scrollDeltaVal = artboardEl.scrollTop - startScrollTop;
          updateResize(currentMouseX, currentMouseY, scrollDeltaVal);
        }

        animationFrameId = requestAnimationFrame(scrollLoop);
      };

      if (artboardEl) {
        animationFrameId = requestAnimationFrame(scrollLoop);
      }

      const onMove = (mv: MouseEvent) => {
        if (!isResizing.current) return;
        currentMouseX = mv.clientX;
        currentMouseY = mv.clientY;
        const scrollDeltaVal = artboardEl ? artboardEl.scrollTop - startScrollTop : 0;
        updateResize(currentMouseX, currentMouseY, scrollDeltaVal);
      };

      const onUp = () => {
        isResizing.current = false;
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
        }
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [el.id, el.styles, updateElement, zoom],
  );

  const {
    gradientType,
    gradientAngle,
    gradientStartColor,
    gradientEndColor,
    lineClamp,
    ...restStyles
  } = el.styles as any;
  const isAbsolute =
    el.styles.position === "absolute" || el.styles.position === "fixed";

  const finalStyles = { ...restStyles };
  if (finalStyles.height && finalStyles.height !== "auto" && finalStyles.flex === "1") {
    finalStyles.flex = "none";
  }
  if (finalStyles.width && finalStyles.width !== "auto" && finalStyles.flex === "1") {
    finalStyles.flex = "none";
  }

  const wrapperStyle: React.CSSProperties = {
    position: (finalStyles.position as any) || "relative",
    cursor: isEditing
      ? "text"
      : isLocked
        ? "not-allowed"
        : isAbsolute
          ? "move"
          : "grab",
    opacity:
      draggingId === el.id ? 0.3 : isHidden ? 0.25 : (finalStyles.opacity ?? 1),
    overflow: (finalStyles.overflow as any) || undefined,
    boxSizing: "border-box",
    ...finalStyles,
    flexShrink: finalStyles.flexShrink !== undefined ? (finalStyles.flexShrink as any) : (parentId === undefined ? 0 : undefined),
    outline: isEditing
      ? "2px solid #0d99ff"
      : isSelected
        ? isLocked
          ? "2px dotted #f59e0b"
          : "2px dotted #0d99ff"
        : isMultiSelected
          ? "2px dotted #a78bfa"
          : isHovered
            ? isLocked
              ? "2px dotted rgba(245,158,11,0.6)"
              : "2px dotted rgba(13,153,255,0.8)"
            : isTarget && dropPos === "inside"
              ? "2px dashed #0d99ff"
              : "none",
    outlineOffset: "-2px",
    zIndex: isAnySelected ? 2 : isHovered ? 1 : (restStyles.zIndex as any),
    ...(isHidden
      ? {
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(148,163,184,0.08) 0px, rgba(148,163,184,0.08) 1px, transparent 1px, transparent 8px)",
          backgroundBlendMode: "overlay",
        }
      : {}),
    ...(gradientType === "linear" && gradientStartColor && gradientEndColor
      ? {
          backgroundImage: `linear-gradient(${gradientAngle ?? 135}deg, ${gradientStartColor}, ${gradientEndColor})`,
        }
      : {}),
    ...(lineClamp
      ? {
          display: "-webkit-box",
          WebkitLineClamp: Number(lineClamp),
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }
      : {}),
  };

  const TAG_MAP: Record<string, string> = {
    div: "div",
    section: "section",
    article: "article",
    aside: "aside",
    main: "main",
    header: "header",
    nav: "nav",
    form: "form",
    footer: "footer",
    heading: "h1",
    heading2: "h2",
    heading3: "h3",
    heading4: "h4",
    heading5: "h5",
    heading6: "h6",
    paragraph: "p",
    text: "p",
    span: "span",
    link: "a",
    blockquote: "blockquote",
    code: "code",
    badge: "span",
    button: "button",
    label: "label",
    legend: "legend",
    fieldset: "fieldset",
  };
  const htmlTag = el.htmlTag || (el.type === "button" && el.href ? "a" : TAG_MAP[el.type]) || "div";

  const wrapperProps: any = {
    "data-bid": el.id,
    style: wrapperStyle,
    onClick: (e: React.MouseEvent) => {
      if (el.type === "button" && el.href) {
        e.preventDefault();
      }
      e.stopPropagation();
      if (isEditing) return;
      if (activePageId !== pageId) {
        setActivePage(pageId);
      }
      if (e.shiftKey) toggleSelectElement(el.id);
      else selectElement(el.id);
    },
    onDoubleClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isLocked) return;
      if (activePageId !== pageId) {
        setActivePage(pageId);
      }
      selectElement(el.id);
      if (isTextType) onStartEdit(el.id);
    },
    onMouseEnter: (e: React.MouseEvent) => {
      e.stopPropagation();
      setHoveredElement(el.id);
    },
    onMouseLeave: () => setHoveredElement(null),
    draggable: !isEditing && !isLocked && !isAbsolute,
    onMouseDown: isAbsolute ? onFreeDragStart : undefined,
    onDragStart: (e: React.DragEvent) => {
      if (isEditing || isLocked || isAbsolute) {
        e.preventDefault();
        return;
      }
      e.stopPropagation();
      e.dataTransfer.setData("sourceElementId", el.id);
      onReorderDragStart(e, el.id);
    },
    onDragOver: (e: React.DragEvent) =>
      onReorderDragOver(
        e,
        el.id,
        index,
        parentId,
        parentIsHorizontal,
        canHaveChildren,
      ),
    onDrop: (e: React.DragEvent) => onReorderDrop(e, el.id, index, parentId),
    onContextMenu: (e: React.MouseEvent) => {
      if (isEditing) return;
      onContextMenu(e, el.id);
    },
  };
  if (htmlTag === "a" || (el.type === "button" && el.href)) {
    wrapperProps.href = el.href || "#";
  }
  const renderContent = () => {
    if (isEditing && isTextType)
      return (
        <>
          <span style={{ pointerEvents: "none", opacity: 0.2 }}>
            {el.content || ""}
          </span>
          <InlineEditor
            el={el}
            onCommit={(val) => onCommitEdit(el.id, val)}
            onCancel={onCancelEdit}
          />
        </>
      );
    if (el.type === "image")
      return (
        <img
          src={
            el.src || "https://placehold.co/800x400/f3f4f6/9ca3af?text=Image"
          }
          alt={el.alt || "image"}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            pointerEvents: "none",
          }}
        />
      );
    if (el.type === "video")
      return (
        <video
          src={el.videoSrc}
          poster={el.videoPoster}
          controls={el.controls}
          autoPlay={el.autoPlay}
          muted={el.muted}
          loop={el.loop}
          className="w-full h-full object-cover pointer-events-none"
          style={{ backgroundColor: "#000" }}
        />
      );
    if (el.type === "audio")
      return (
        <div className="w-full p-2 bg-gray-50 rounded-lg flex items-center gap-2">
          <audio
            src={el.src}
            controls={el.controls}
            autoPlay={el.autoPlay}
            loop={el.loop}
            className="w-full h-8 pointer-events-none"
          />
        </div>
      );
    if (el.type === "iframe")
      return (
        <div
          style={{
            pointerEvents: "none",
            width: "100%",
            minHeight: 80,
            background: "#f3f4f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 4,
          }}
        >
          <span style={{ fontSize: 12, color: "#9ca3af" }}>⬜ iFrame</span>
        </div>
      );
    if (el.type === "divider")
      return (
        <hr
          style={{
            pointerEvents: "none",
            border: "none",
            borderTop:
              (el.styles as any).border ||
              el.styles.borderTop ||
              "1px solid #e5e7eb",
            width: el.styles.width || "100%",
            marginTop: el.styles.marginTop,
            marginBottom: el.styles.marginBottom,
          }}
        />
      );
    if (el.type === "spacer")
      return (
        <div
          style={{
            pointerEvents: "none",
            width: el.styles.width || "100%",
            height: el.styles.height || "48px",
            background:
              "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(148,163,184,0.15) 4px, rgba(148,163,184,0.15) 8px)",
          }}
        />
      );
    if (el.type === "list")
      return (
        <ul
          style={{
            pointerEvents: "none",
            paddingLeft: el.styles.paddingLeft || "20px",
            listStyleType: el.styles.listStyleType || "disc",
            fontSize: el.styles.fontSize,
            color: el.styles.color,
            lineHeight: el.styles.lineHeight,
          }}
        >
          {(el.listItems || ["Item 1", "Item 2"]).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    if (el.type === "orderedList")
      return (
        <ol
          style={{
            pointerEvents: "none",
            paddingLeft: el.styles.paddingLeft || "20px",
            listStyleType: el.styles.listStyleType || "decimal",
            fontSize: el.styles.fontSize,
            color: el.styles.color,
            lineHeight: el.styles.lineHeight,
          }}
        >
          {(el.listItems || ["Item 1", "Item 2"]).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      );
    if (el.type === "table") {
      const td = el.tableData || {
        headers: ["H1", "H2", "H3"],
        rows: [
          ["", "", ""],
          ["", "", ""],
        ],
      };
      return (
        <table
          style={{
            pointerEvents: "none",
            width: "100%",
            borderCollapse: el.styles.borderCollapse || "collapse",
            fontSize: 13,
          }}
        >
          <thead
            style={{
              backgroundColor: el.styles.tableHeaderBackground || "#f9fafb",
            }}
          >
            <tr>
              {td.headers.map((h: string, i: number) => (
                <th
                  key={i}
                  style={{
                    padding: el.styles.tableCellPadding || "6px 12px",
                    textAlign: "left",
                    border: "1px solid #e5e7eb",
                    fontWeight: 600,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {td.rows.map((row: string[], ri: number) => (
              <tr
                key={ri}
                style={{
                  backgroundColor:
                    el.styles.tableStripe && ri % 2 === 1 ? "#f9fafb" : "white",
                }}
              >
                {row.map((cell: string, ci: number) => (
                  <td
                    key={ci}
                    style={{
                      padding: el.styles.tableCellPadding || "6px 12px",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    if (el.type === "checkbox")
      return (
        <label
          style={{
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <input
            type="checkbox"
            readOnly
            checked={!!el.checked}
            style={{ pointerEvents: "none" }}
          />
          <span>{el.content || "Checkbox"}</span>
        </label>
      );
    if (el.type === "radio")
      return (
        <label
          style={{
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <input
            type="radio"
            readOnly
            name={el.fieldName || undefined}
            style={{ pointerEvents: "none" }}
          />
          <span>{el.content || "Option"}</span>
        </label>
      );
    if (el.type === "select")
      return (
        <select
          disabled
          style={{
            pointerEvents: "none",
            width: "100%",
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #d1d5db",
            fontSize: 14,
          }}
        >
          {(el.selectOptions || ["Option 1", "Option 2"]).map((o, i) => (
            <option key={i}>{o}</option>
          ))}
        </select>
      );
    if (el.type === "input")
      return (
        <input
          readOnly
          placeholder={el.placeholder || "Input"}
          style={{
            pointerEvents: "none",
            width: "100%",
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #d1d5db",
            fontSize: 14,
            color: "#9ca3af",
            backgroundColor: "#fff",
            boxSizing: "border-box",
          }}
        />
      );
    if (el.type === "textarea")
      return (
        <textarea
          readOnly
          placeholder={el.placeholder || "Textarea"}
          style={{
            pointerEvents: "none",
            width: "100%",
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #d1d5db",
            fontSize: 14,
            color: "#9ca3af",
            backgroundColor: "#fff",
            minHeight: 80,
            resize: "none",
            boxSizing: "border-box",
          }}
        />
      );
    if (el.type === "badge")
      return (
        <span
          style={{
            pointerEvents: "none",
            display: el.styles.display || "inline-block",
            backgroundColor: el.styles.backgroundColor,
            color: el.styles.color,
            fontSize: el.styles.fontSize,
            fontWeight: el.styles.fontWeight,
            padding: el.styles.padding,
            borderRadius: el.styles.borderRadius,
          }}
        >
          {el.content || "Badge"}
        </span>
      );
    if (el.type === "time")
      return (
        <time
          dateTime={el.dateTime}
          style={{
            pointerEvents: "none",
            fontSize: el.styles.fontSize,
            color: el.styles.color,
            ...(el.styles as any),
          }}
        >
          {el.content || "January 1, 2025"}
        </time>
      );
    if (el.type === "progress")
      return (
        <div style={{ pointerEvents: "none", width: "100%" }}>
          <progress
            value={el.progressValue ?? 60}
            max={el.progressMax ?? 100}
            style={{ width: "100%", height: el.styles.height || "8px" }}
          />
        </div>
      );
    if (el.type === "meter")
      return (
        <div style={{ pointerEvents: "none", width: "100%" }}>
          <meter
            value={el.progressValue ?? 0.6}
            min={0}
            max={el.progressMax ?? 1}
            style={{ width: "100%", height: el.styles.height || "20px" }}
          />
        </div>
      );
    if (el.type === "details")
      return (
        <div style={{ pointerEvents: "none" }}>
          <details open={!!el.open}>
            <summary style={{ cursor: "pointer", fontWeight: 500 }}>
              {el.content || "Click to expand"}
            </summary>
            <div style={{ paddingTop: 8, color: "#6b7280", fontSize: 14 }}>
              Content goes here.
            </div>
          </details>
        </div>
      );
    if (el.type === "dialog") {
      return (
        <dialog
          open={true}
          style={{
            pointerEvents: "none",
            display: "block",
            position: "static",
            color: "inherit",
            backgroundColor: "inherit",
            border: "none",
            padding: 0,
            margin: 0,
            width: "100%",
            height: "100%",
          }}
        >
          {el.children && el.children.length === 0 && (
            <div
              style={{
                pointerEvents: "none",
                padding: "16px",
                textAlign: "center",
                color: "rgba(148,163,184,0.5)",
                fontSize: 11,
                border: "1px dashed rgba(148,163,184,0.2)",
                borderRadius: 4,
                userSelect: "none",
              }}
            >
              dialog — drop elements here
            </div>
          )}
          {el.children?.map((child, childIndex) => (
            <RenderElement
              key={child.id}
              el={child}
              index={childIndex}
              parentId={el.id}
              pageId={pageId}
              zoom={zoom}
              onContextMenu={onContextMenu}
              onReorderDragStart={onReorderDragStart}
              onReorderDragOver={onReorderDragOver}
              onReorderDrop={onReorderDrop}
              draggingId={draggingId}
              dropTargetId={dropTargetId}
              dropPos={dropPos}
              parentIsHorizontal={isHorizontal}
              editingId={editingId}
              onStartEdit={onStartEdit}
              onCommitEdit={onCommitEdit}
              onCancelEdit={onCancelEdit}
            />
          ))}
        </dialog>
      );
    }
    if (el.type === "canvas") {
      return (
        <canvas
          style={{
            pointerEvents: "none",
            width: "100%",
            height: "100%",
            display: "block",
          }}
        />
      );
    }
    if (el.type === "alert") {
      const v = (
        {
          info: {
            bg: "#eff6ff",
            border: "#bfdbfe",
            color: "#1d4ed8",
            icon: "ℹ",
          },
          success: {
            bg: "#f0fdf4",
            border: "#bbf7d0",
            color: "#15803d",
            icon: "✓",
          },
          warning: {
            bg: "#fffbeb",
            border: "#fde68a",
            color: "#b45309",
            icon: "⚠",
          },
          error: {
            bg: "#fef2f2",
            border: "#fecaca",
            color: "#b91c1c",
            icon: "✕",
          },
        } as any
      )[el.alertVariant || "info"];
      return (
        <div
          style={{
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
            backgroundColor: v.bg,
            border: `1px solid ${v.border}`,
            color: v.color,
            padding: "12px 16px",
            borderRadius: 8,
            fontSize: 14,
          }}
        >
          <span style={{ fontWeight: 700, flexShrink: 0 }}>{v.icon}</span>
          <span>{el.content || "This is an alert message."}</span>
        </div>
      );
    }
    if (el.type === "avatar") {
      if (el.avatarSrc)
        return (
          <img
            src={el.avatarSrc}
            alt={el.avatarInitials || "avatar"}
            style={{
              pointerEvents: "none",
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: "9999px",
              display: "block",
            }}
          />
        );
      return (
        <span
          style={{
            pointerEvents: "none",
            fontSize: el.styles.fontSize || "16px",
            fontWeight: 600,
          }}
        >
          {el.avatarInitials || "AB"}
        </span>
      );
    }
    if (el.type === "icon") {
      const name = el.iconName || "Sparkles";
      const normalized = name
        .split(/[-_\s]+/)
        .map(
          (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
        )
        .join("");
      const Icon = (LucideIcons as any)[normalized];
      if (!Icon)
        return (
          <span style={{ pointerEvents: "none" }}>{el.content || "★"}</span>
        );
      return (
        <Icon
          size={el.styles.fontSize ? parseInt(el.styles.fontSize) : 24}
          color={el.styles.color || "currentColor"}
          style={{ pointerEvents: "none" }}
        />
      );
    }
    if (el.type === "code")
      return (
        <code
          style={{
            pointerEvents: "none",
            display: "inline-block",
            fontFamily: "'JetBrains Mono','Fira Code',monospace",
            fontSize: el.styles.fontSize || "13px",
            backgroundColor: el.styles.backgroundColor || "#1e1e2e",
            color: el.styles.color || "#cdd6f4",
            padding: el.styles.padding || "2px 8px",
            borderRadius: el.styles.borderRadius || "4px",
            ...(el.styles as any),
          }}
        >
          {el.content || "const hello = 'world';"}
        </code>
      );
    if (el.type === "pre") {
      const code = el.content || "// code block\nconst x = 1;\nconsole.log(x);";
      return (
        <div
          style={{
            pointerEvents: "none",
            position: "relative",
            borderRadius: el.styles.borderRadius || "8px",
            overflow: "hidden",
          }}
        >
          <button
            style={{
              pointerEvents: "auto",
              position: "absolute",
              top: 10,
              right: 10,
              zIndex: 10,
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 6,
              color: "#fff",
              fontSize: 11,
              padding: "3px 9px",
              cursor: "pointer",
            }}
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(code);
            }}
          >
            Copy
          </button>
          <SyntaxHighlighter
            language="typescript"
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              borderRadius: el.styles.borderRadius || "8px",
              fontSize: el.styles.fontSize || "13px",
              lineHeight: el.styles.lineHeight || "1.7",
            }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      );
    }
    if (el.type === "blockquote")
      return (
        <blockquote
          style={{
            pointerEvents: "none",
            margin: 0,
            borderLeft: el.styles.borderLeft || "4px solid #3b82f6",
            paddingLeft: el.styles.paddingLeft || "16px",
            color: el.styles.color || "#4b5563",
            fontStyle: el.styles.fontStyle || "italic",
            fontSize: el.styles.fontSize || "16px",
            ...(el.styles as any),
          }}
        >
          {el.content || "A quote worth remembering."}
        </blockquote>
      );
    if (el.type === "mark")
      return (
        <mark
          style={{
            pointerEvents: "none",
            backgroundColor: el.styles.backgroundColor || "#fef08a",
            color: el.styles.color || "#111827",
            padding: el.styles.padding || "0 2px",
            borderRadius: el.styles.borderRadius || "2px",
            ...(el.styles as any),
          }}
        >
          {el.content || "highlighted text"}
        </mark>
      );
    if (el.type === "kbd")
      return (
        <kbd
          style={{
            pointerEvents: "none",
            fontFamily: "monospace",
            fontSize: el.styles.fontSize || "12px",
            backgroundColor: el.styles.backgroundColor || "#f3f4f6",
            color: el.styles.color || "#111827",
            padding: el.styles.padding || "2px 6px",
            borderRadius: el.styles.borderRadius || "4px",
            border: (el.styles as any).border || "1px solid #d1d5db",
            display: "inline-block",
            ...(el.styles as any),
          }}
        >
          {el.content || "⌘K"}
        </kbd>
      );
    return (
      <>
        {el.content ? (
          <span style={{ pointerEvents: "none" }}>{el.content}</span>
        ) : (
          el.children &&
          el.children.length === 0 && (
            <span
              style={{
                pointerEvents: "none",
                padding: "16px",
                textAlign: "center",
                color: "rgba(148,163,184,0.5)",
                fontSize: 11,
                border: "1px dashed rgba(148,163,184,0.2)",
                borderRadius: 4,
                userSelect: "none",
                display: "block",
              }}
            >
              {el.type} — drop elements here
            </span>
          )
        )}
        {el.children?.map((child, childIndex) => (
          <RenderElement
            key={child.id}
            el={child}
            index={childIndex}
            parentId={el.id}
            pageId={pageId}
            zoom={zoom}
            onContextMenu={onContextMenu}
            onReorderDragStart={onReorderDragStart}
            onReorderDragOver={onReorderDragOver}
            onReorderDrop={onReorderDrop}
            draggingId={draggingId}
            dropTargetId={dropTargetId}
            dropPos={dropPos}
            parentIsHorizontal={isHorizontal}
            editingId={editingId}
            onStartEdit={onStartEdit}
            onCommitEdit={onCommitEdit}
            onCancelEdit={onCancelEdit}
          />
        ))}
      </>
    );
  };

  return React.createElement(
    htmlTag,
    wrapperProps,
    <>
      {isTarget && dropPos !== "inside" && (
        <span
          className="absolute bg-blue-500 pointer-events-none rounded-full"
          style={{
            zIndex: 10,
            ...(dropPos === "top"
              ? { top: 0, left: 0, right: 0, height: 2 }
              : {}),
            ...(dropPos === "bottom"
              ? { bottom: 0, left: 0, right: 0, height: 2 }
              : {}),
            ...(dropPos === "left"
              ? { left: 0, top: 0, bottom: 0, width: 2 }
              : {}),
            ...(dropPos === "right"
              ? { right: 0, top: 0, bottom: 0, width: 2 }
              : {}),
          }}
        />
      )}
      {isSelected && !isEditing && (
        <>
          {/* Right edge handle */}
          <span
            data-resize-handle="right"
            onMouseDown={onResizeStart("right")}
            style={{
              position: "absolute",
              top: "50%",
              right: -4,
              transform: "translateY(-50%)",
              width: 8,
              height: 8,
              backgroundColor: "#fff",
              border: "1.5px solid #0d99ff",
              borderRadius: "1px",
              cursor: "ew-resize",
              zIndex: 10,
              pointerEvents: "auto",
            }}
          />
          {/* Bottom edge handle */}
          <span
            data-resize-handle="bottom"
            onMouseDown={onResizeStart("bottom")}
            style={{
              position: "absolute",
              bottom: -4,
              left: "50%",
              transform: "translateX(-50%)",
              width: 8,
              height: 8,
              backgroundColor: "#fff",
              border: "1.5px solid #0d99ff",
              borderRadius: "1px",
              cursor: "ns-resize",
              zIndex: 10,
              pointerEvents: "auto",
            }}
          />
          {/* Bottom-right corner handle */}
          <span
            data-resize-handle="both"
            onMouseDown={onResizeStart("both")}
            style={{
              position: "absolute",
              bottom: -4,
              right: -4,
              width: 8,
              height: 8,
              backgroundColor: "#fff",
              border: "1.5px solid #0d99ff",
              borderRadius: "1px",
              cursor: "nwse-resize",
              zIndex: 10,
              pointerEvents: "auto",
            }}
          />
        </>
      )}
      {isSelected && !isEditing && isTextType && (
        <span
          style={{
            position: "absolute",
            top: -20,
            left: 0,
            fontSize: 9,
            color: "#0d99ff",
            background: "rgba(13,153,255,0.1)",
            padding: "2px 6px",
            borderRadius: 3,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 10,
            display: "inline-block",
          }}
        >
          {el.type}
        </span>
      )}
      {renderContent()}
    </>,
  );
}

// ─── Spacing overlay (PATCH 3) ────────────────────────────────────────────────

function SpacingOverlay({ mode }: { mode: "padding" | "margin" }) {
  const pages = useBuilderStore((s) => s.pages);
  const activePageId = useBuilderStore((s) => s.activePageId);
  const [rects, setRects] = useState<
    { id: string; top: number; left: number; width: number; height: number }[]
  >([]);

  useEffect(() => {
    const activePage = pages.find((p) => p.id === activePageId);
    if (!activePage) return;

    const artboardNode = document.querySelector(`[data-artboard-id="${activePageId}"]`) || document.querySelector('[data-artboard="true"]');
    if (!artboardNode) return;
    const artboardRect = artboardNode.getBoundingClientRect();

    const designWidth = artboardNode.clientWidth;
    const currentScale = designWidth > 0 ? artboardRect.width / designWidth : 1;

    const collect = (els: CanvasElement[]): CanvasElement[] =>
      els.flatMap((el) => [el, ...collect(el.children || [])]);
    const computed: typeof rects = [];

    for (const el of collect(activePage.elements)) {
      const node = document.querySelector(`[data-bid="${el.id}"]`);
      if (!node) continue;
      const r = node.getBoundingClientRect();
      const cs = window.getComputedStyle(node);
      const t =
        parseFloat(cs[mode === "padding" ? "paddingTop" : "marginTop"]) || 0;
      const ri =
        parseFloat(cs[mode === "padding" ? "paddingRight" : "marginRight"]) ||
        0;
      const b =
        parseFloat(cs[mode === "padding" ? "paddingBottom" : "marginBottom"]) ||
        0;
      const l =
        parseFloat(cs[mode === "padding" ? "paddingLeft" : "marginLeft"]) || 0;
      if (!t && !ri && !b && !l) continue;

      const scale = currentScale || 1;
      const relativeTop = (r.top - artboardRect.top) / scale + artboardNode.scrollTop;
      const relativeLeft = (r.left - artboardRect.left) / scale + artboardNode.scrollLeft;
      const relativeWidth = r.width / scale;
      const relativeHeight = r.height / scale;

      computed.push(
        mode === "padding"
          ? {
              id: el.id,
              top: relativeTop,
              left: relativeLeft,
              width: relativeWidth,
              height: relativeHeight,
            }
          : {
              id: el.id,
              top: relativeTop - t / scale,
              left: relativeLeft - l / scale,
              width: relativeWidth + (l + ri) / scale,
              height: relativeHeight + (t + b) / scale,
            },
      );
    }
    setRects(computed);
  }, [pages, activePageId, mode]);

  const c =
    mode === "padding"
      ? { bg: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.4)" }
      : {
          bg: "rgba(251,191,36,0.08)",
          border: "1px solid rgba(251,191,36,0.4)",
        };

  return (
    <>
      {rects.map((r) => (
        <div
          key={r.id}
          style={{
            position: "absolute",
            top: r.top,
            left: r.left,
            width: r.width,
            height: r.height,
            background: c.bg,
            border: c.border,
            pointerEvents: "none",
            zIndex: 8999,
            boxSizing: "border-box",
          }}
        />
      ))}
    </>
  );
}

// ─── Clipboard ────────────────────────────────────────────────────────────────

let memoryClipboard: CanvasElement[] = [];
function readClipboard(): CanvasElement[] {
  return memoryClipboard;
}
function writeClipboard(els: CanvasElement[]) {
  memoryClipboard = els;
}
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}
function deepCloneWithNewIds(el: CanvasElement): CanvasElement {
  return {
    ...el,
    id: `el-${generateId()}`,
    children: el.children?.map(deepCloneWithNewIds),
  };
}

function ShortcutToast({
  message,
  visible,
}: {
  message: string;
  visible: boolean;
}) {
  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white/70 border border-white/10 pointer-events-none transition-all duration-200"
      style={{
        background: "#1a1a1a",
        opacity: visible ? 1 : 0,
        transform: `translateX(-50%) translateY(${visible ? 0 : 6}px)`,
      }}
    >
      {message}
    </div>
  );
}

// ─── Canvas ───────────────────────────────────────────────────────────────────

export default function Canvas() {
  const {
    getActivePage,
    addElement,
    selectElement,
    toggleSelectElement,
    clearSelection,
    reorderElement,
    insertComponent,
    deleteElement,
    duplicateElement,
    updateElement,
    undo,
    redo,
    selectedElementId,
    selectedElementIds,
    editingElementId,
    setEditingElement,
    clearCanvas,
    pages,
    activePageId,
    setActivePage,
  } = useBuilderStore();
  const undoable = useBuilderStore((s) => s.past.length > 0);
  const redoable = useBuilderStore((s) => s.future.length > 0);

  const [isolatedPageId, setIsolatedPageId] = useState<string | null>(null);

  useEffect(() => {
    if (isolatedPageId && !pages.some((p) => p.id === isolatedPageId)) {
      setIsolatedPageId(null);
    }
  }, [pages, isolatedPageId]);



  // PATCH 1: read canvas view settings from store
  const canvasBreakpoint = useBuilderStore((s) => s.canvasBreakpoint);
  const customWidth = useBuilderStore((s) => s.customWidth);
  const customHeight = useBuilderStore((s) => s.customHeight);
  const viewportClip = useBuilderStore((s) => s.viewportClip);
  const showGrid = useBuilderStore((s) => s.showGrid);
  const showPadding = useBuilderStore((s) => s.showPadding);
  const showMargin = useBuilderStore((s) => s.showMargin);
  const leftSidebarCollapsed = useBuilderStore((s) => s.leftSidebarCollapsed);
  const rightPanelCollapsed = useBuilderStore((s) => s.rightPanelCollapsed);

  const page = getActivePage();

  const [zoom, setZoom] = useState(1);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [animateTransform, setAnimateTransform] = useState(false);
  const [isDraggingOverVoid, setIsDraggingOverVoid] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPos, setDropPos] = useState<
    "top" | "bottom" | "left" | "right" | "inside"
  >("inside");
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    elId: string;
  } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    setAnimateTransform(true);
    const timer = setTimeout(() => setAnimateTransform(false), 350);
    return () => clearTimeout(timer);
  }, [canvasBreakpoint, leftSidebarCollapsed, rightPanelCollapsed]);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragStartPanRef = useRef({ x: 0, y: 0 });

  const handleStartEdit = useCallback(
    (id: string) => setEditingElement(id),
    [setEditingElement],
  );
  const handleCommitEdit = useCallback(
    (id: string, val: string) => {
      updateElement(id, { content: val });
      setEditingElement(null);
    },
    [updateElement, setEditingElement],
  );
  const handleCancelEdit = useCallback(
    () => setEditingElement(null),
    [setEditingElement],
  );

  const [toast, setToast] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 1800);
  }, []);

  const getAllSelected = useCallback(() => {
    return [
      ...(selectedElementIds ?? []),
      ...(selectedElementId &&
      !(selectedElementIds ?? []).includes(selectedElementId)
        ? [selectedElementId]
        : []),
    ];
  }, [selectedElementId, selectedElementIds]);

  const findElement = useCallback(
    (id: string): CanvasElement | undefined => {
      const pg = getActivePage();
      if (!pg) return undefined;
      const search = (els: CanvasElement[]): CanvasElement | undefined => {
        for (const el of els) {
          if (el.id === id) return el;
          if (el.children) {
            const f = search(el.children);
            if (f) return f;
          }
        }
      };
      return search(pg.elements);
    },
    [getActivePage],
  );

  const fitArtboard = useCallback(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const activeIndex = pages.findIndex((p) => p.id === activePageId);
    const idx = !isolatedPageId && activeIndex >= 0 ? activeIndex : 0;
    const { width: resolvedWidth, height: resolvedHeight } = resolveDeviceDimensions(
      canvasBreakpoint,
      customWidth,
      customHeight
    );
    const artboardWidth = resolvedWidth;
    const artboardHeight = viewportClip ? resolvedHeight : 550;

    const padding = 80;
    const availableWidth = rect.width - padding;
    const initialZoom = Math.min(availableWidth / artboardWidth, 1.0);

    const availableHeight = rect.height - padding;
    const initialZoomH = Math.min(availableHeight / artboardHeight, 1.0);

    const finalZoom = Math.max(0.15, Math.min(initialZoom, initialZoomH, 1.0));

    const pageX = 160 + idx * (artboardWidth + 120) + artboardWidth / 2;
    const pageY = 160 + artboardHeight / 2;

    setZoom(finalZoom);
    setPan({
      x: rect.width / 2 - pageX * finalZoom,
      y: rect.height / 2 - pageY * finalZoom,
    });
  }, [canvasBreakpoint, customWidth, customHeight, viewportClip, setZoom, setPan, pages, activePageId, isolatedPageId]);

  const centerArtboard = useCallback(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const activeIndex = pages.findIndex((p) => p.id === activePageId);
    const idx = !isolatedPageId && activeIndex >= 0 ? activeIndex : 0;
    const { width: resolvedWidth, height: resolvedHeight } = resolveDeviceDimensions(
      canvasBreakpoint,
      customWidth,
      customHeight
    );
    const artboardWidth = resolvedWidth;
    const artboardHeight = viewportClip ? resolvedHeight : 550;

    const pageX = 160 + idx * (artboardWidth + 120) + artboardWidth / 2;
    const pageY = 160 + artboardHeight / 2;

    setPan({
      x: rect.width / 2 - pageX * zoom,
      y: rect.height / 2 - pageY * zoom,
    });
  }, [canvasBreakpoint, customWidth, customHeight, viewportClip, zoom, pages, activePageId, isolatedPageId]);

  const centerArtboardRef = useRef(centerArtboard);
  useEffect(() => {
    centerArtboardRef.current = centerArtboard;
  }, [centerArtboard]);

  useEffect(() => {
    fitArtboard();
  }, [isolatedPageId]);

  useEffect(() => {
    const handleResize = () => {
      centerArtboardRef.current();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isTyping =
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          (active as HTMLElement).isContentEditable);
      if (isTyping) return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    const handleBlur = () => {
      setIsSpacePressed(false);
    };
    window.addEventListener("blur", handleBlur);
    const handleDragEnd = () => {
      setIsDraggingOverVoid(false);
      setDraggingId(null);
      setDropTargetId(null);
    };
    window.addEventListener("dragend", handleDragEnd);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("dragend", handleDragEnd);
    };
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    // Find if the target has scrollable ancestor
    let target = e.target as HTMLElement | null;
    let shouldScrollTarget = false;
    const container = canvasContainerRef.current;

    if (container && target) {
      let curr = target;
      while (curr && curr !== container) {
        const style = window.getComputedStyle(curr);
        const hasScrollX = (style.overflowX === "auto" || style.overflowX === "scroll") && curr.scrollWidth > curr.clientWidth;
        const hasScrollY = (style.overflowY === "auto" || style.overflowY === "scroll") && curr.scrollHeight > curr.clientHeight;

        if (hasScrollX || hasScrollY) {
          if (e.deltaX !== 0 && hasScrollX) {
            shouldScrollTarget = true;
            break;
          }
          if (e.deltaY !== 0 && hasScrollY && !e.ctrlKey) {
            shouldScrollTarget = true;
            break;
          }
        }
        curr = curr.parentElement as HTMLElement;
      }
    }

    if (shouldScrollTarget) {
      return;
    }

    e.preventDefault();
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (e.ctrlKey) {
      const zoomFactor = 1.05;
      const direction = e.deltaY < 0 ? 1 : -1;
      const factor = direction > 0 ? zoomFactor : 1 / zoomFactor;

      const nextZoom = Math.min(Math.max(zoom * factor, 0.15), 4.0);
      const dx = mouseX - pan.x;
      const dy = mouseY - pan.y;

      setPan({
        x: mouseX - dx * (nextZoom / zoom),
        y: mouseY - dy * (nextZoom / zoom),
      });
      setZoom(nextZoom);
    } else {
      setPan(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  }, [zoom, pan, setZoom, setPan]);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [handleWheel]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const isLeftClickOnEmptySpace = e.button === 0 && e.target === e.currentTarget;
    const isMiddleClick = e.button === 1;
    const shouldPan = isSpacePressed || isMiddleClick || isLeftClickOnEmptySpace;
    if (shouldPan) {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingPan(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      dragStartPanRef.current = { ...pan };
    }
  }, [isSpacePressed, pan]);

  useEffect(() => {
    if (!isDraggingPan) return;
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan({
        x: dragStartPanRef.current.x + dx,
        y: dragStartPanRef.current.y + dy
      });
    };
    const handleMouseUp = () => {
      setIsDraggingPan(false);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingPan]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (editingElementId) return;
      const active = document.activeElement;
      const isTyping =
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          (active as HTMLElement).isContentEditable);
      const cmd = e.metaKey || e.ctrlKey;
      const allSelected = getAllSelected();
      const hasSel = allSelected.length > 0;
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        !isTyping &&
        hasSel
      ) {
        e.preventDefault();
        allSelected.forEach((id) => deleteElement(id));
        clearSelection();
        selectElement(null);
        showToast(
          `Deleted ${allSelected.length} element${allSelected.length > 1 ? "s" : ""}`,
        );
        return;
      }
      if (e.key === "Escape") {
        if ((selectedElementIds ?? []).length > 0) clearSelection();
        else selectElement(null);
        return;
      }
      if (isTyping) return;
      if (cmd && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (undoable) {
          undo();
          showToast("Undo");
        }
        return;
      }
      if ((cmd && e.shiftKey && e.key === "z") || (cmd && e.key === "y")) {
        e.preventDefault();
        if (redoable) {
          redo();
          showToast("Redo");
        }
        return;
      }
      if (cmd && e.key === "a") {
        e.preventDefault();
        const pg = getActivePage();
        if (pg) pg.elements.forEach((el) => toggleSelectElement(el.id));
        showToast("Selected all");
        return;
      }
      if (cmd && e.key === "d" && hasSel) {
        e.preventDefault();
        allSelected.forEach((id) => duplicateElement(id));
        showToast(
          `Duplicated ${allSelected.length} element${allSelected.length > 1 ? "s" : ""}`,
        );
        return;
      }
      if (cmd && e.key === "c" && hasSel) {
        e.preventDefault();
        const els = allSelected
          .map(findElement)
          .filter(Boolean) as CanvasElement[];
        writeClipboard(els.map(deepCloneWithNewIds));
        showToast(`Copied ${els.length} element${els.length > 1 ? "s" : ""}`);
        return;
      }
      if (cmd && e.key === "x" && hasSel) {
        e.preventDefault();
        const els = allSelected
          .map(findElement)
          .filter(Boolean) as CanvasElement[];
        writeClipboard(els.map(deepCloneWithNewIds));
        allSelected.forEach((id) => deleteElement(id));
        clearSelection();
        selectElement(null);
        showToast(`Cut ${els.length} element${els.length > 1 ? "s" : ""}`);
        return;
      }
      if (cmd && e.key === "v") {
        e.preventDefault();
        const clip = readClipboard();
        if (clip.length === 0) {
          showToast("Nothing to paste");
          return;
        }
        const toInsert = clip.map(deepCloneWithNewIds);
        toInsert.forEach((el) => addElement(el));
        showToast(
          `Pasted ${toInsert.length} element${toInsert.length > 1 ? "s" : ""}`,
        );
        return;
      }
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) &&
        hasSel
      ) {
        e.preventDefault();
        const delta = e.shiftKey ? 10 : 1;
        const dir = {
          ArrowUp: ["top", -delta],
          ArrowDown: ["top", delta],
          ArrowLeft: ["left", -delta],
          ArrowRight: ["left", delta],
        }[e.key]!;
        allSelected.forEach((id) => {
          const el = findElement(id);
          if (!el) return;
          const pos = el.styles.position || "relative";
          const current = parseFloat((el.styles as any)[dir[0]] || "0") || 0;
          updateElement(id, {
            styles: {
              ...el.styles,
              position: pos,
              [dir[0] as string]: `${current + (dir[1] as number)}px`,
            },
          });
        });
        return;
      }
      if ((e.key === "[" || e.key === "]") && hasSel) {
        e.preventDefault();
        const dir = e.key === "[" ? "up" : "down";
        allSelected.forEach((id) => {
          const store = useBuilderStore.getState();
          store.moveElement(id, dir);
        });
        showToast(e.key === "[" ? "Moved up" : "Moved down");
        return;
      }
      if (e.key === "h" && hasSel) {
        e.preventDefault();
        allSelected.forEach((id) => {
          const el = findElement(id);
          if (!el) return;
          updateElement(id, {
            metadata: { ...el.metadata, isHidden: !el.metadata?.isHidden },
          });
        });
        showToast("Toggled visibility");
        return;
      }
      if (e.key === "l" && hasSel) {
        e.preventDefault();
        allSelected.forEach((id) => {
          const el = findElement(id);
          if (!el) return;
          updateElement(id, {
            metadata: { ...el.metadata, isLocked: !el.metadata?.isLocked },
          });
        });
        showToast("Toggled lock");
        return;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [
    selectedElementId,
    selectedElementIds,
    editingElementId,
    getAllSelected,
    findElement,
    deleteElement,
    clearSelection,
    selectElement,
    duplicateElement,
    addElement,
    updateElement,
    undo,
    redo,
    undoable,
    redoable,
    toggleSelectElement,
    getActivePage,
    showToast,
  ]);

  const handleCanvasClick = useCallback(() => {
    selectElement(null);
    clearSelection();
    setEditingElement(null);
    setContextMenu(null);
  }, [selectElement, clearSelection, setEditingElement]);


  const handleContextMenu = useCallback((e: React.MouseEvent, elId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, elId });
  }, []);

  if (!page) return null;
  const multiCount = (selectedElementIds ?? []).length;

  const sharedProps = {
    zoom,
    draggingId,
    dropTargetId,
    dropPos,
    onContextMenu: handleContextMenu,
    editingId: editingElementId,
    onStartEdit: handleStartEdit,
    onCommitEdit: handleCommitEdit,
    onCancelEdit: handleCancelEdit,
    onReorderDragStart: (_: React.DragEvent, id: string) => setDraggingId(id),
    onReorderDragOver: (
      e: React.DragEvent,
      id: string,
      _idx: number,
      _pId: string | undefined,
      pIsHorizontal: boolean,
      canHaveChildren: boolean,
    ) => {
      e.preventDefault();
      e.stopPropagation();
      setDropTargetId(id);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width,
        relY = (e.clientY - rect.top) / rect.height;
      const inCenter = relX > 0.25 && relX < 0.75 && relY > 0.25 && relY < 0.75;
      if (canHaveChildren && inCenter) setDropPos("inside");
      else if (pIsHorizontal) setDropPos(relX < 0.5 ? "left" : "right");
      else setDropPos(relY < 0.5 ? "top" : "bottom");
    },
    onReorderDrop: (
      e: React.DragEvent,
      targetId: string,
      targetIndex: number,
      targetParentId: string | undefined,
    ) => {
      e.preventDefault();
      e.stopPropagation();
      const newType = e.dataTransfer.getData("elementType") as ElementType;
      const sourceId = e.dataTransfer.getData("sourceElementId");
      const compId = e.dataTransfer.getData("componentId");
      const isAfter = dropPos === "bottom" || dropPos === "right";
      const finalParentId = dropPos === "inside" ? targetId : targetParentId;
      const finalIndex =
        dropPos === "inside"
          ? undefined
          : isAfter
            ? targetIndex + 1
            : targetIndex;
      if (compId) insertComponent(compId, finalParentId, finalIndex);
      else if (newType)
        addElement(defaultElement(newType), finalParentId, finalIndex);
      else if (sourceId && sourceId !== targetId)
        reorderElement(sourceId, finalParentId, finalIndex);
      setDropTargetId(null);
      setDraggingId(null);
    },
  };

  return (
    <div
      ref={canvasContainerRef}
      className="flex-1 overflow-hidden bg-[#0d0d0f] relative outline-none select-none"
      style={{
        cursor: isDraggingPan ? "grabbing" : "grab",
        backgroundImage: showGrid
          ? "linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px)"
          : "none",
        backgroundSize: "24px 24px",
        backgroundPosition: "0 0",
        backgroundColor: "#121214",
      }}
      onClick={handleCanvasClick}
      onMouseDown={handleMouseDown}
      onDragEnter={() => setIsDraggingOverVoid(true)}
      onDragOver={() => {
        // Do not call e.preventDefault() here to prevent browser drop on empty space
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDraggingOverVoid(false);
        }
      }}
      onDrop={() => setIsDraggingOverVoid(false)}
      onContextMenu={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY, elId: "canvas" });
        }
      }}
    >
      <HoverActiveStyleSheet />
      {contextMenu && (
        <ContextMenu
          {...contextMenu}
          onClose={() => setContextMenu(null)}
          onClearCanvas={() => setShowClearConfirm(true)}
          isolatedPageId={isolatedPageId}
          setIsolatedPageId={setIsolatedPageId}
        />
      )}



      <ShortcutToast message={toast} visible={toastVisible} />

      {isolatedPageId && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-full border border-blue-500/30 bg-[#121214]/90 backdrop-blur-xl shadow-2xl select-none pointer-events-auto transition-all duration-200 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/80 font-bold uppercase tracking-wider">
              Isolated View
            </span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <span className="text-[11px] text-white/50 font-medium font-sans">
            {pages.find((p) => p.id === isolatedPageId)?.name || "Page"}
          </span>
          <button
            onClick={() => setIsolatedPageId(null)}
            className="text-[11px] text-blue-400 hover:text-blue-300 font-bold hover:bg-blue-500/10 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
          >
            Show All Pages
          </button>
        </div>
      )}

      {multiCount > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 shadow-2xl select-none"
          style={{ background: "#1a1a1a" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 mr-1">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            <span className="text-[11px] text-white/50 font-medium">
              {multiCount} selected
            </span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <button
            onClick={() => {
              (selectedElementIds ?? []).forEach((id) => duplicateElement(id));
              clearSelection();
            }}
            className="text-[11px] text-white/60 hover:text-white px-2 py-1 rounded hover:bg-white/8 transition-all cursor-pointer"
          >
            Duplicate all
          </button>
          <button
            onClick={() => {
              (selectedElementIds ?? []).forEach((id) => deleteElement(id));
              clearSelection();
            }}
            className="text-[11px] text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-all cursor-pointer"
          >
            Delete all
          </button>
          <div className="w-px h-4 bg-white/10" />
          <button
            onClick={() => clearSelection()}
            title="Deselect (Esc)"
            className="text-white/30 hover:text-white/60 p-1 rounded hover:bg-white/5 transition-all cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {isDraggingOverVoid && (
        <div className="absolute inset-0 bg-black/35 pointer-events-none z-10 transition-opacity duration-200" />
      )}

      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          position: "absolute",
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          transition: animateTransform ? "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            gap: "120px",
            padding: "160px",
            pointerEvents: "none",
          }}
        >
          {(isolatedPageId ? pages.filter((p) => p.id === isolatedPageId) : pages).map((pg) => {
            const hasElements = pg.elements.length > 0;
            const { width: resolvedWidth, height: resolvedHeight } = resolveDeviceDimensions(
              canvasBreakpoint,
              customWidth,
              customHeight
            );
            const simulatedHeight = resolvedHeight;

            return (
              <div
                key={pg.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  pointerEvents: "none",
                }}
              >
                {/* Page Title Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    pointerEvents: "auto",
                    color: pg.id === activePageId ? "rgba(255, 255, 255, 0.85)" : "rgba(255, 255, 255, 0.35)",
                    fontSize: "11px",
                    fontWeight: 600,
                    fontFamily: "sans-serif",
                    padding: "0 4px",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span>{pg.name}</span>
                    <span className="text-[10px] text-white/20 font-mono">({pg.slug})</span>
                  </div>
                  {!isolatedPageId && (
                    <button
                      onClick={() => {
                        setIsolatedPageId(pg.id);
                        setActivePage(pg.id);
                      }}
                      className="text-[10px] text-blue-400 hover:text-blue-300 font-bold hover:bg-blue-500/10 px-2 py-0.5 rounded cursor-pointer transition-colors"
                    >
                      Focus
                    </button>
                  )}
                </div>

                <div
                  data-artboard="true"
                  data-artboard-id={pg.id}
                  style={{
                    pointerEvents: "auto",
                    width: `${resolvedWidth}px`,
                    backgroundColor: "transparent",
                    boxShadow: "none",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: viewportClip
                      ? `${simulatedHeight}px`
                      : hasElements
                        ? "0px"
                        : "550px",
                    height: viewportClip
                      ? `${simulatedHeight}px`
                      : "auto",
                    overflowY: viewportClip
                      ? "auto"
                      : "visible",
                    scrollbarWidth: "thin",
                    scrollbarColor: "rgba(255,255,255,0.15) transparent",
                    borderRadius: "4px",
                    transition:
                      "width 0.3s cubic-bezier(0.4,0,0.2,1), background-color 0.25s, box-shadow 0.25s",
                    position: "relative",
                    cursor: "default",
                    overflowX: viewportClip ? "auto" : "visible",
                    border: pg.id === activePageId ? "1px solid rgba(13,153,255,0.45)" : "1px dashed rgba(255,255,255,0.08)",
                    outline: pg.id === activePageId ? "4px solid rgba(13,153,255,0.08)" : "none",
                    outlineOffset: "2px",
                    backgroundImage: viewportClip
                      ? "repeating-linear-gradient(45deg, rgba(255,255,255,0.012) 0px, rgba(255,255,255,0.012) 8px, transparent 8px, transparent 16px)"
                      : "none",
                  }}
                  onDragEnter={(e) => {
                    e.stopPropagation();
                    setIsDraggingOverVoid(false);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingOverVoid(false);
                    if (activePageId !== pg.id) {
                      setActivePage(pg.id);
                    }
                  }}
                  onDragLeave={(e) => {
                    e.stopPropagation();
                    setIsDraggingOverVoid(true);
                  }}
                  onDrop={(e) => {
                    setIsDraggingOverVoid(false);
                    const newType = e.dataTransfer.getData("elementType") as ElementType;
                    const compId = e.dataTransfer.getData("componentId");
                    const sourceId = e.dataTransfer.getData("sourceElementId");
                    if (compId) insertComponent(compId);
                    else if (newType && !hasElements) addElement(defaultElement(newType));
                    else if (sourceId) reorderElement(sourceId, undefined, undefined);
                  }}
                  onClick={() => {
                    if (activePageId !== pg.id) {
                      setActivePage(pg.id);
                    }
                  }}
                >
                  {!hasElements ? (
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 80,
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 16,
                          marginBottom: 20,
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Plus size={22} color="rgba(255,255,255,0.18)" />
                      </div>
                      <p
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: "rgba(255,255,255,0.65)",
                          marginBottom: 8,
                        }}
                      >
                        Start building
                      </p>
                      <p
                        style={{
                          fontSize: 13,
                          color: "rgba(255,255,255,0.22)",
                          maxWidth: 260,
                          lineHeight: 1.7,
                        }}
                      >
                        Drag elements from the left panel onto the canvas
                      </p>
                    </div>
                  ) : (
                    <>
                      {pg.elements.map((el, index) => (
                        <RenderElement
                          key={el.id}
                          el={el}
                          index={index}
                          parentId={undefined}
                          pageId={pg.id}
                          parentIsHorizontal={false}
                          {...sharedProps}
                        />
                      ))}
                      {viewportClip && (
                        <div
                          style={{
                            flex: "1 1 0%",
                            minHeight: 0,
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.012) 0px, rgba(255,255,255,0.012) 8px, transparent 8px, transparent 16px)",
                            borderTop: "1px dashed rgba(255,255,255,0.05)",
                            color: "rgba(255, 255, 255, 0.25)",
                            fontSize: "11px",
                            fontWeight: 500,
                            fontFamily: "sans-serif",
                            pointerEvents: "none",
                            userSelect: "none",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "12px" }}>
                            <span style={{ letterSpacing: "0.05em", textTransform: "uppercase", fontSize: "9px" }}>
                              Vacant Viewport Space
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {pg.id === activePageId && showPadding && <SpacingOverlay mode="padding" />}
                  {pg.id === activePageId && showMargin && <SpacingOverlay mode="margin" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Figma-like floating zoom indicator */}
      <div className="absolute right-6 bottom-6 z-50 flex items-center gap-1.5 bg-panel-bg/90 backdrop-blur-xl border border-panel-border rounded-xl p-1 shadow-[0_12px_32px_rgba(0,0,0,0.5)] select-none pointer-events-auto">
        <button
          onClick={() => {
            setZoom(prev => Math.max(0.15, prev - 0.1));
          }}
          title="Zoom Out"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Minus size={13} />
        </button>
        <span className="text-[11px] font-bold min-w-[42px] text-center text-white/80 font-mono">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => {
            setZoom(prev => Math.min(4.0, prev + 0.1));
          }}
          title="Zoom In"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Plus size={13} />
        </button>
        <div className="w-px h-4 bg-white/10 mx-0.5" />
        <button
          onClick={fitArtboard}
          title="Fit Artboard (Reset Pan/Zoom)"
          className="px-2.5 h-7 flex items-center justify-center rounded-lg text-[10px] font-bold uppercase tracking-wider text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          Reset
        </button>
      </div>
      {showClearConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm select-none pointer-events-auto">
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
    </div>
  );
}
