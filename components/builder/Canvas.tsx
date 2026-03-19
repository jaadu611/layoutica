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

// ─── Text-editable element types ─────────────────────────────────────────────

const TEXT_TYPES = new Set([
  "heading",
  "heading2",
  "heading3",
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
]);

// ─── Context Menu ─────────────────────────────────────────────────────────────

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

  const handleSave = () => {
    const page = getActivePage();
    if (!page) return;
    const find = (els: CanvasElement[]): CanvasElement | undefined => {
      for (const el of els) {
        if (el.id === elId) return el;
        if (el.children) {
          const f = find(el.children);
          if (f) return f;
        }
      }
    };
    const el = find(page.elements);
    if (!el) return;
    saveComponent(saveName.trim() || el.type, el);
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

// ─── Inline text editor ───────────────────────────────────────────────────────

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
    outlineOffset: 0,
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

  if (isMultiline) {
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
  }
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

// ─── RenderElement ────────────────────────────────────────────────────────────

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
  editingId: string | null;
  onStartEdit: (id: string) => void;
  onCommitEdit: (id: string, val: string) => void;
  onCancelEdit: () => void;
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
  editingId,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
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
        updateElement(el.id, {
          styles: {
            ...el.styles,
            width: `${Math.max(40, startSize.current.width + (mv.clientX - startPos.current.x))}px`,
            height: `${Math.max(20, startSize.current.height + (mv.clientY - startPos.current.y))}px`,
          },
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
  ].includes(el.type);
  const isTextType = TEXT_TYPES.has(el.type);

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
    cursor: isEditing ? "text" : "grab",
    opacity: draggingId === el.id ? 0.3 : (restStyles.opacity ?? 1),
    overflow: (restStyles.overflow as any) || undefined,
    boxSizing: "border-box",
    ...restStyles,
    outline: isEditing
      ? "2px solid #0d99ff"
      : isSelected
        ? "2px dotted #0d99ff"
        : isHovered
          ? "2px dotted rgba(13,153,255,0.8)"
          : isTarget && dropPos === "inside"
            ? "2px dashed #0d99ff"
            : "none",
    outlineOffset: "0px",
    zIndex: isSelected ? 2 : isHovered ? 1 : (restStyles.zIndex as any),
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
      if (isEditing) return;
      selectElement(el.id);
    },
    onDoubleClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      selectElement(el.id);
      if (isTextType) {
        onStartEdit(el.id);
      }
    },
    onMouseEnter: (e: React.MouseEvent) => {
      e.stopPropagation();
      setHoveredElement(el.id);
    },
    onMouseLeave: () => setHoveredElement(null),
    draggable: !isEditing,
    onDragStart: (e: React.DragEvent) => {
      if (isEditing) {
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

  const renderContent = () => {
    // Inline editor overlay
    if (isEditing && isTextType) {
      return (
        <>
          {/* Show original content dimmed behind the editor */}
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
    }

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
            borderTop: el.styles.borderTop || "1px solid #e5e7eb",
            width: "100%",
          }}
        />
      );
    if (el.type === "spacer")
      return (
        <div
          style={{
            pointerEvents: "none",
            width: "100%",
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
            paddingLeft: 20,
            listStyleType: el.styles.listStyleType || "disc",
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
            paddingLeft: 20,
            listStyleType: el.styles.listStyleType || "decimal",
          }}
        >
          {(el.listItems || ["Item 1", "Item 2"]).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      );
    if (el.type === "table") {
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
          <input type="radio" readOnly style={{ pointerEvents: "none" }} />
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
        <span style={{ pointerEvents: "none", display: "inline-block" }}>
          {el.content || "Badge"}
        </span>
      );
    if (el.type === "icon") {
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
    }
    if (el.type === "code")
      return (
        <code style={{ pointerEvents: "none", display: "inline-block" }}>
          {el.content || "code"}
        </code>
      );
    if (el.type === "pre")
      return (
        <pre style={{ pointerEvents: "none", margin: 0 }}>
          {el.content || "// code"}
        </pre>
      );
    if (el.type === "blockquote")
      return (
        <blockquote style={{ pointerEvents: "none", margin: 0 }}>
          {el.content || "Quote"}
        </blockquote>
      );

    // Container / text elements
    return (
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
      {/* Drop indicator line */}
      {isTarget && dropPos !== "inside" && (
        <div
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

      {/* Resize handle */}
      {isSelected && !isEditing && (
        <div
          onMouseDown={onResizeStart}
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 18,
            height: 18,
            cursor: "nwse-resize",
            zIndex: 10,
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

      {isSelected && !isEditing && isTextType && (
        <div
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
          }}
        >
          {el.type}
        </div>
      )}

      {renderContent()}
    </>,
  );
}

// ─── Canvas ───────────────────────────────────────────────────────────────────

export default function Canvas() {
  const {
    getActivePage,
    addElement,
    selectElement,
    reorderElement,
    insertComponent,
    deleteElement,
    updateElement,
    selectedElementId,
    editingElementId,
    setEditingElement,
  } = useBuilderStore();
  const page = getActivePage();

  // Inline editing — use store so other panels (e.g. DesignTokensPanel) can read it
  const handleStartEdit = useCallback(
    (id: string) => {
      setEditingElement(id);
    },
    [setEditingElement],
  );

  const handleCommitEdit = useCallback(
    (id: string, val: string) => {
      updateElement(id, { content: val });
      setEditingElement(null);
    },
    [updateElement, setEditingElement],
  );

  const handleCancelEdit = useCallback(() => {
    setEditingElement(null);
  }, [setEditingElement]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't fire canvas shortcuts while editing inline
      if (editingElementId) return;

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
  }, [selectedElementId, deleteElement, editingElementId]);

  // Click outside canvas → deselect and cancel edit
  const handleCanvasClick = useCallback(() => {
    selectElement(null);
    setEditingElement(null);
    setContextMenu(null);
  }, [selectElement, setEditingElement]);

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

  const sharedProps = {
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
      idx: number,
      pId: string | undefined,
      pIsHorizontal: boolean,
      canHaveChildren: boolean,
    ) => {
      e.preventDefault();
      e.stopPropagation();
      setDropTargetId(id);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;
      const relY = (e.clientY - rect.top) / rect.height;
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
      className="flex-1 overflow-y-auto bg-[#0a0a0a]"
      style={{ padding: "40px 40px 80px" }}
      onClick={handleCanvasClick}
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
          isolation: "isolate",
          position: "relative",
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
              parentIsHorizontal={false}
              {...sharedProps}
            />
          ))
        )}
      </div>
    </div>
  );
}
