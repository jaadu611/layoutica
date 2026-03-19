"use client";

import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from "react";
import { useBuilderStore } from "@/lib/builder/store";
import { ElementType, CanvasElement } from "@/lib/builder/types";
import { defaultElement } from "./Sidebar";
import * as LucideIcons from "lucide-react";
const { ArrowUp, ArrowDown, Trash2, Copy, Plus, Bookmark } = LucideIcons;

interface RenderElementProps {
  el: CanvasElement;
  index: number;
  parentId?: string;
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
}

function ContextMenu({
  x,
  y,
  elId,
  onClose,
}: {
  x: number;
  y: number;
  elId: string;
  onClose: () => void;
}) {
  const {
    moveElement,
    deleteElement,
    duplicateElement,
    saveComponent,
    getActivePage,
  } = useBuilderStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState("");

  useLayoutEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let newLeft = x;
      let newTop = y;
      if (x + rect.width > window.innerWidth)
        newLeft = Math.max(0, x - rect.width);
      if (y + rect.height > window.innerHeight)
        newTop = Math.max(0, y - rect.height);
      setPos({ left: newLeft, top: newTop });
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

  const handleSaveComponent = () => {
    const page = getActivePage();
    if (!page) return;
    const findEl = (els: any[]): any => {
      for (const el of els) {
        if (el.id === elId) return el;
        if (el.children) {
          const f = findEl(el.children);
          if (f) return f;
        }
      }
    };
    const el = findEl(page.elements);
    if (!el) return;
    const name = saveName.trim() || el.type;
    saveComponent(name, el);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-10000 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-2xl py-1.5 min-w-[180px]"
      style={{ left: pos.left, top: pos.top }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1.5 mb-1 border-b border-[#333]">
        <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
          Element
        </span>
      </div>
      <button
        onClick={() => {
          moveElement(elId, "up");
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-white/70 hover:bg-white/5 hover:text-white transition-colors"
      >
        <ArrowUp size={12} className="text-white/30" /> Move Up
      </button>
      <button
        onClick={() => {
          moveElement(elId, "down");
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-white/70 hover:bg-white/5 hover:text-white transition-colors"
      >
        <ArrowDown size={12} className="text-white/30" /> Move Down
      </button>
      <div className="my-1 border-t border-[#333]" />
      <button
        onClick={() => {
          duplicateElement(elId);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-white/70 hover:bg-white/5 hover:text-white transition-colors"
      >
        <Copy size={12} className="text-white/30" /> Duplicate
      </button>
      <div className="my-1 border-t border-[#333]" />
      {saving ? (
        <div className="px-3 py-2 flex gap-1.5">
          <input
            autoFocus
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveComponent();
              if (e.key === "Escape") setSaving(false);
            }}
            placeholder="Component name..."
            className="flex-1 text-[11px] bg-white/5 border border-white/10 rounded px-2 py-1 outline-none focus:border-blue-500/50 text-white placeholder-white/25"
          />
          <button
            onClick={handleSaveComponent}
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
      <div className="my-1 border-t border-[#333]" />
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

function RenderElement({
  el,
  index,
  parentId,
  onReorderDragStart,
  onReorderDragOver,
  onReorderDrop,
  draggingId,
  dropTargetId,
  dropPos,
  parentIsHorizontal,
  onContextMenu,
}: RenderElementProps) {
  const {
    selectedElementId,
    hoveredElementId,
    selectElement,
    setHoveredElement,
    updateElement,
    pages,
    setActivePage,
  } = useBuilderStore();

  const isResizing = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startSize = useRef({ width: 0, height: 0 });

  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isResizing.current = true;
      startPos.current = { x: e.clientX, y: e.clientY };
      const rect = (
        e.currentTarget as HTMLElement
      ).parentElement?.getBoundingClientRect();
      if (rect) startSize.current = { width: rect.width, height: rect.height };

      const onMove = (mv: MouseEvent) => {
        if (!isResizing.current) return;
        const newW = Math.max(
          40,
          startSize.current.width + (mv.clientX - startPos.current.x),
        );
        const newH = Math.max(
          20,
          startSize.current.height + (mv.clientY - startPos.current.y),
        );
        updateElement(el.id, {
          styles: { ...el.styles, width: `${newW}px`, height: `${newH}px` },
        });
      };
      const onUp = () => {
        isResizing.current = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [el.id, el.styles, updateElement],
  );

  const isSelected = selectedElementId === el.id;
  const isHovered = hoveredElementId === el.id && !isSelected;
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
  ].includes(el.type);

  const {
    gradientType,
    gradientAngle,
    gradientStartColor,
    gradientEndColor,
    lineClamp,
    ...restStyles
  } = el.styles as any;

  const wrapperStyle: React.CSSProperties = {
    position: (restStyles.position as any) || "relative",
    cursor: "grab",
    opacity: draggingId === el.id ? 0.3 : (restStyles.opacity ?? 1),
    overflow: (restStyles.overflow as any) || undefined,
    boxSizing: "border-box",
    ...restStyles,
    outline: isSelected
      ? "2px dotted #0d99ff"
      : isHovered
        ? "2px dotted rgba(13, 153, 255, 0.8)"
        : isTarget && dropPos === "inside"
          ? "2px dashed #0d99ff"
          : "none",
    outlineOffset: "0px",
    zIndex: isSelected ? 100 : isHovered ? 99 : (restStyles.zIndex as any),
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
  };
  const htmlTag = (el as any).htmlTag || TAG_MAP[el.type] || "div";

  const wrapperProps: any = {
    style: wrapperStyle,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      selectElement(el.id);
    },
    onDoubleClick: (e: React.MouseEvent) => {
      e.stopPropagation();

      if (el.href) {
        const cleanHref = el.href.startsWith("/") ? el.href : `/${el.href}`;
        const targetPage = pages.find(
          (p) =>
            p.slug === cleanHref ||
            p.name.toLowerCase() === cleanHref.slice(1).toLowerCase(),
        );

        if (targetPage) {
          setActivePage(targetPage.id);
        } else if (cleanHref.startsWith("/")) {
          alert(`Error: Page "${cleanHref}" not found in this project.`);
        }
      }
    },
    onMouseEnter: (e: React.MouseEvent) => {
      e.stopPropagation();
      setHoveredElement(el.id);
    },
    onMouseLeave: () => setHoveredElement(null),
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
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
    onContextMenu: (e: React.MouseEvent) => onContextMenu(e, el.id),
  };

  return React.createElement(
    htmlTag,
    wrapperProps,
    <>
      {isTarget && dropPos !== "inside" && (
        <div
          className="absolute bg-blue-500 z-50 pointer-events-none rounded-full"
          style={{
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

      {isSelected && (
        <div
          onMouseDown={onResizeStart}
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 18,
            height: 18,
            cursor: "nwse-resize",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <circle cx="2.5" cy="7" r="1.3" fill="#2563eb" />
            <circle cx="7" cy="7" r="1.3" fill="#2563eb" />
            <circle cx="7" cy="2.5" r="1.3" fill="#2563eb" />
          </svg>
        </div>
      )}

      {el.type === "image" ? (
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
      ) : el.type === "video" ? (
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
      ) : el.type === "audio" ? (
        <div className="w-full p-2 bg-gray-50 rounded-lg flex items-center gap-2">
          <audio
            src={el.src}
            controls={el.controls}
            autoPlay={el.autoPlay}
            loop={el.loop}
            className="w-full h-8 pointer-events-none"
          />
        </div>
      ) : el.type === "iframe" ? (
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
      ) : el.type === "divider" ? (
        <hr
          style={{
            pointerEvents: "none",
            border: "none",
            borderTop: el.styles.borderTop || "1px solid #e5e7eb",
            width: "100%",
          }}
        />
      ) : el.type === "spacer" ? (
        <div
          style={{
            pointerEvents: "none",
            width: "100%",
            height: el.styles.height || "48px",
            background:
              "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(148,163,184,0.15) 4px, rgba(148,163,184,0.15) 8px)",
          }}
        />
      ) : el.type === "list" ? (
        <ul
          style={{
            pointerEvents: "none",
            paddingLeft: 20,
            listStyleType: el.styles.listStyleType || "disc",
          }}
        >
          {(el.listItems || ["Item 1", "Item 2"]).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      ) : el.type === "orderedList" ? (
        <ol
          style={{
            pointerEvents: "none",
            paddingLeft: 20,
            listStyleType: el.styles.listStyleType || "decimal",
          }}
        >
          {(el.listItems || ["Item 1", "Item 2"]).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      ) : el.type === "table" ? (
        (() => {
          const td = (el as any).tableData || {
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
                        el.styles.tableStripe && ri % 2 === 1
                          ? "#f9fafb"
                          : "white",
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
        })()
      ) : el.type === "checkbox" ? (
        <label
          style={{
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
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
      ) : el.type === "radio" ? (
        <label
          style={{
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <input type="radio" readOnly style={{ pointerEvents: "none" }} />
          <span>{el.content || "Option"}</span>
        </label>
      ) : el.type === "select" ? (
        <select
          disabled
          style={{
            pointerEvents: "none",
            width: "100%",
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #d1d5db",
            fontSize: 14,
            color: "#111827",
            backgroundColor: "#fff",
          }}
        >
          {(el.selectOptions || ["Option 1", "Option 2"]).map((o, i) => (
            <option key={i}>{o}</option>
          ))}
        </select>
      ) : el.type === "input" ? (
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
      ) : el.type === "textarea" ? (
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
      ) : el.type === "badge" ? (
        <span style={{ pointerEvents: "none", display: "inline-block" }}>
          {el.content || "Badge"}
        </span>
      ) : el.type === "icon" ? (
        (() => {
          const name = el.iconName || "Sparkles";
          const normalized = name
            .split(/[-_\s]+/)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
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
        })()
      ) : el.type === "code" ? (
        <code style={{ pointerEvents: "none", display: "inline-block" }}>
          {el.content || "code"}
        </code>
      ) : el.type === "pre" ? (
        <pre style={{ pointerEvents: "none", margin: 0 }}>
          {el.content || "// code"}
        </pre>
      ) : el.type === "blockquote" ? (
        <blockquote style={{ pointerEvents: "none", margin: 0 }}>
          {el.content || "Quote"}
        </blockquote>
      ) : (
        <>
          {el.content ? (
            <span style={{ pointerEvents: "none" }}>{el.content}</span>
          ) : (
            el.children &&
            el.children.length === 0 && (
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
                {el.type} — drop elements here
              </div>
            )
          )}
          {el.children?.map((child, childIndex) => (
            <RenderElement
              key={child.id}
              el={child}
              index={childIndex}
              parentId={el.id}
              onContextMenu={onContextMenu}
              onReorderDragStart={onReorderDragStart}
              onReorderDragOver={onReorderDragOver}
              onReorderDrop={onReorderDrop}
              draggingId={draggingId}
              dropTargetId={dropTargetId}
              dropPos={dropPos}
              parentIsHorizontal={isHorizontal}
            />
          ))}
        </>
      )}
    </>,
  );
}

export default function Canvas() {
  const {
    getActivePage,
    addElement,
    selectElement,
    reorderElement,
    insertComponent,
    deleteElement,
    selectedElementId,
  } = useBuilderStore();
  const page = getActivePage();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!selectedElementId) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        const active = document.activeElement;
        const isEditing =
          active &&
          (active.tagName === "INPUT" ||
            active.tagName === "TEXTAREA" ||
            (active as HTMLElement).isContentEditable);
        if (!isEditing) {
          e.preventDefault();
          deleteElement(selectedElementId);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedElementId, deleteElement]);

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

  const handleContextMenu = useCallback((e: React.MouseEvent, elId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, elId });
  }, []);

  if (!page) return null;

  const hasElements = page.elements.length > 0;

  return (
    <div
      className="flex-1 overflow-y-auto bg-[#0a0a0a]"
      style={{ padding: "40px 40px 80px" }}
      onClick={() => {
        selectElement(null);
        setContextMenu(null);
      }}
    >
      {contextMenu && (
        <ContextMenu {...contextMenu} onClose={() => setContextMenu(null)} />
      )}

      <div
        style={{
          width: "100%",
          maxWidth: 1200,
          margin: "0 auto",
          backgroundColor: hasElements ? "#ffffff" : "transparent",
          boxShadow: hasElements ? "0 8px 60px rgba(0,0,0,0.55)" : "none",
          display: "flex",
          flexDirection: "column",
          minHeight: hasElements ? 0 : "calc(100vh - 200px)",
          transition: "background-color 0.25s, box-shadow 0.25s",
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          const newType = e.dataTransfer.getData("elementType") as ElementType;
          const compId = e.dataTransfer.getData("componentId");
          if (compId) insertComponent(compId);
          else if (newType && !hasElements) addElement(defaultElement(newType));
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
          page.elements.map((el, index) => (
            <RenderElement
              key={el.id}
              el={el}
              index={index}
              parentId={undefined}
              draggingId={draggingId}
              dropTargetId={dropTargetId}
              dropPos={dropPos}
              parentIsHorizontal={false}
              onContextMenu={handleContextMenu}
              onReorderDragStart={(_, id) => setDraggingId(id)}
              onReorderDragOver={(
                e,
                id,
                idx,
                pId,
                pIsHorizontal,
                canHaveChildren,
              ) => {
                e.preventDefault();
                e.stopPropagation();
                setDropTargetId(id);
                const rect = (
                  e.currentTarget as HTMLElement
                ).getBoundingClientRect();
                const relX = (e.clientX - rect.left) / rect.width;
                const relY = (e.clientY - rect.top) / rect.height;
                const inCenter =
                  relX > 0.25 && relX < 0.75 && relY > 0.25 && relY < 0.75;
                if (canHaveChildren && inCenter) setDropPos("inside");
                else if (pIsHorizontal)
                  setDropPos(relX < 0.5 ? "left" : "right");
                else setDropPos(relY < 0.5 ? "top" : "bottom");
              }}
              onReorderDrop={(e, targetId, targetIndex, targetParentId) => {
                e.preventDefault();
                e.stopPropagation();
                const newType = e.dataTransfer.getData(
                  "elementType",
                ) as ElementType;
                const sourceId = e.dataTransfer.getData("sourceElementId");
                const isAfter = dropPos === "bottom" || dropPos === "right";
                const finalParentId =
                  dropPos === "inside" ? targetId : targetParentId;
                const finalIndex =
                  dropPos === "inside"
                    ? undefined
                    : isAfter
                      ? targetIndex + 1
                      : targetIndex;

                const compId = e.dataTransfer.getData("componentId");
                if (compId) insertComponent(compId, finalParentId, finalIndex);
                else if (newType)
                  addElement(
                    defaultElement(newType),
                    finalParentId,
                    finalIndex,
                  );
                else if (sourceId && sourceId !== targetId)
                  reorderElement(sourceId, finalParentId, finalIndex);

                setDropTargetId(null);
                setDraggingId(null);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
