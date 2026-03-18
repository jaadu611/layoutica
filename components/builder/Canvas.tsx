"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from "react";
import { useBuilderStore } from "@/lib/builder/store";
import { ElementType, CanvasElement } from "@/lib/builder/types";
import { defaultElement } from "./Sidebar";
import { ArrowUp, ArrowDown, Trash2, Copy, Plus } from "lucide-react";

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
  const { moveElement, deleteElement, duplicateElement } = useBuilderStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

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

  return (
    <div
      ref={menuRef}
      className="fixed z-10000 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-2xl py-1.5 min-w-[170px]"
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
  const canHaveChildren = ["section", "navbar", "footer"].includes(el.type);

  const {
    gradientType,
    gradientAngle,
    gradientStartColor,
    gradientEndColor,
    backgroundImage: rawBgImage,
    ...restStyles
  } = el.styles as any;

  const resolvedBgImage = rawBgImage
    ? rawBgImage.startsWith("url(")
      ? rawBgImage
      : `url("${rawBgImage}")`
    : undefined;

  const wrapperStyle: React.CSSProperties = {
    position: (restStyles.position as any) || "relative",
    cursor: "grab",
    opacity: draggingId === el.id ? 0.3 : (restStyles.opacity ?? 1),
    overflow: (restStyles.overflow as any) || "visible",
    boxSizing: "border-box",
    outline: isSelected
      ? "2px solid #2563eb"
      : isHovered
        ? "1.5px solid #60a5fa"
        : isTarget && dropPos === "inside"
          ? "2px dashed #2563eb"
          : "none",
    outlineOffset: "-2px",
    ...restStyles,
    ...(resolvedBgImage &&
    !(gradientType === "linear" && gradientStartColor && gradientEndColor)
      ? {
          backgroundImage: resolvedBgImage,
          backgroundSize: restStyles.backgroundSize || "cover",
          backgroundPosition: restStyles.backgroundPosition || "center",
        }
      : {}),
    ...(gradientType === "linear"
      ? {
          backgroundImage: `linear-gradient(${gradientAngle ?? 135}deg, ${gradientStartColor || "#4f46e5"}, ${gradientEndColor || "#9333ea"})`,
        }
      : gradientType === "radial"
        ? {
            backgroundImage: `radial-gradient(circle, ${gradientStartColor || "#4f46e5"}, ${gradientEndColor || "#9333ea"})`,
          }
        : {}),
  };

  return (
    <div
      style={wrapperStyle}
      onClick={(e) => {
        e.stopPropagation();
        selectElement(el.id);
      }}
      onMouseEnter={(e) => {
        e.stopPropagation();
        setHoveredElement(el.id);
      }}
      onMouseLeave={() => setHoveredElement(null)}
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData("sourceElementId", el.id);
        onReorderDragStart(e, el.id);
      }}
      onDragOver={(e) =>
        onReorderDragOver(
          e,
          el.id,
          index,
          parentId,
          parentIsHorizontal,
          canHaveChildren,
        )
      }
      onDrop={(e) => onReorderDrop(e, el.id, index, parentId)}
      onContextMenu={(e) => onContextMenu(e, el.id)}
    >
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
      ) : (
        <>
          {el.content && (
            <span style={{ pointerEvents: "none" }}>{el.content}</span>
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
    </div>
  );
}

export default function Canvas() {
  const { getActivePage, addElement, selectElement, reorderElement } =
    useBuilderStore();
  const page = getActivePage();

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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const tag = (e.target as HTMLElement).tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement).isContentEditable
      )
        return;
      const { selectedElementId, deleteElement } = useBuilderStore.getState();
      if (selectedElementId) {
        e.preventDefault();
        deleteElement(selectedElementId);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
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
          overflow: "hidden",
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          const newType = e.dataTransfer.getData("elementType") as ElementType;
          if (newType && !hasElements) addElement(defaultElement(newType));
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

                if (newType)
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
