"use client";

import { useState } from "react";
import { useBuilderStore } from "@/lib/builder/store";
import { ElementType } from "@/lib/builder/types";
import { defaultElement } from "./Sidebar";

function RenderElement({
  el,
  depth = 0,
  onReorderDragStart,
  onReorderDragOver,
  onReorderDrop,
  draggingId,
  dropTargetId,
  dropPos,
}: any) {
  const {
    selectedElementId,
    hoveredElementId,
    selectElement,
    setHoveredElement,
    deleteElement,
    moveElement,
  } = useBuilderStore();

  const isSelected = selectedElementId === el.id;
  const isHovered = hoveredElementId === el.id && !isSelected;
  const isTarget = dropTargetId === el.id && draggingId !== el.id;

  const wrapperStyle: React.CSSProperties = {
    position: "relative",
    cursor: "grab",
    opacity: draggingId === el.id ? 0.3 : 1,
    outline: isSelected
      ? "2px solid #2563eb"
      : isHovered
        ? "1.5px solid #60a5fa"
        : isTarget && dropPos === "inside"
          ? "2px dashed #2563eb"
          : "none",
    outlineOffset: "-2px",
    ...el.styles,
    display:
      el.styles.display ||
      (["section", "navbar"].includes(el.type) ? "flex" : "block"),
    fontSize: el.styles.fontSize,
    fontWeight: el.styles.fontWeight,
    textAlign: el.styles.textAlign as any,
    color: el.styles.color,
    backgroundColor: el.styles.backgroundColor,
  };

  const childrenContent = (el.children || []).map((child: any) => (
    <RenderElement
      key={child.id}
      el={child}
      depth={depth + 1}
      onReorderDragStart={onReorderDragStart}
      onReorderDragOver={onReorderDragOver}
      onReorderDrop={onReorderDrop}
      draggingId={draggingId}
      dropTargetId={dropTargetId}
      dropPos={dropPos}
    />
  ));

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
      onDragOver={(e) => onReorderDragOver(e, el.id)}
      onDrop={(e) => onReorderDrop(e, el.id)}
    >
      {isTarget && dropPos === "top" && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600 z-70" />
      )}
      {isTarget && dropPos === "bottom" && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 z-70" />
      )}

      {(isSelected || isHovered) && (
        <div
          className="absolute flex items-center z-9999 h-6 px-1 shadow-2xl"
          style={{
            top: depth === 0 ? "4px" : "-28px",
            right: "4px",
            borderRadius: "4px",
            backgroundColor: "#000000",
            border: "1px solid #444",
            color: "#ffffff",
          }}
        >
          <span
            className="text-[9px] uppercase font-black tracking-tight mr-1 pr-1 border-r border-[#333]"
            style={{ color: "#60a5fa" }}
          >
            {el.type}
          </span>
          <div className="flex gap-0.5 items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                moveElement(el.id, "up");
              }}
              className="w-5 h-5 flex items-center justify-center text-[10px] font-bold hover:bg-[#333] rounded"
            >
              ↑
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                moveElement(el.id, "down");
              }}
              className="w-5 h-5 flex items-center justify-center text-[10px] font-bold hover:bg-[#333] rounded"
            >
              ↓
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteElement(el.id);
              }}
              className="w-5 h-5 flex items-center justify-center text-[10px] font-bold text-red-500 hover:bg-red-900 rounded"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {el.type === "image" ? (
        <img
          src={el.src}
          alt={el.alt}
          className="w-full h-full object-cover block"
        />
      ) : (
        <>
          {el.content && <span>{el.content}</span>}
          {childrenContent}
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
  const [dropPos, setDropPos] = useState<"top" | "bottom" | "inside">("inside");
  const [isSidebarDragging, setIsSidebarDragging] = useState(false);

  if (!page) return null;

  const hasElements = page.elements.length > 0;

  return (
    <div
      className="flex-1 overflow-y-auto bg-[#0a0a0a] p-10 flex flex-col items-center"
      onClick={() => selectElement(null)}
      onDragEnter={() => setIsSidebarDragging(true)}
      onDragEnd={() => setIsSidebarDragging(false)}
      onDrop={() => setIsSidebarDragging(false)}
    >
      <div
        className="bg-white shadow-2xl w-full max-w-[1200px] relative flex flex-col overflow-hidden transition-all duration-300"
        style={{
          height: "auto",
          minHeight: hasElements ? "0px" : "160px",
        }}
        onDragOver={(e) => e.preventDefault()}
      >
        {page.elements.map((el) => (
          <RenderElement
            key={el.id}
            el={el}
            draggingId={draggingId}
            dropTargetId={dropTargetId}
            dropPos={dropPos}
            onReorderDragStart={(e: any, id: string) => setDraggingId(id)}
            onReorderDragOver={(e: any, id: string) => {
              e.preventDefault();
              e.stopPropagation();
              setDropTargetId(id);
              const rect = e.currentTarget.getBoundingClientRect();
              const relY = e.clientY - rect.top;
              if (relY < rect.height * 0.25) setDropPos("top");
              else if (relY > rect.height * 0.75) setDropPos("bottom");
              else setDropPos("inside");
            }}
            onReorderDrop={(e: any, targetId: string) => {
              e.preventDefault();
              e.stopPropagation();
              const newType = e.dataTransfer.getData(
                "elementType",
              ) as ElementType;
              const sourceId = e.dataTransfer.getData("sourceElementId");
              let finalIdx = page.elements.findIndex(
                (item) => item.id === targetId,
              );
              if (dropPos === "bottom") finalIdx++;

              if (newType)
                addElement(
                  defaultElement(newType),
                  dropPos === "inside" ? targetId : undefined,
                  dropPos === "inside" ? undefined : finalIdx,
                );
              else if (sourceId)
                reorderElement(
                  sourceId,
                  dropPos === "inside" ? targetId : undefined,
                  dropPos === "inside" ? undefined : finalIdx,
                );

              setDropTargetId(null);
              setDraggingId(null);
              setIsSidebarDragging(false);
            }}
          />
        ))}

        <div
          className={`w-full transition-all duration-200 flex items-center justify-center border-blue-500/0 ${
            !hasElements
              ? "h-[160px] bg-white border-2 border-dashed border-gray-100"
              : isSidebarDragging || draggingId
                ? "h-12 bg-blue-50/30 border-t-2 border-dashed border-blue-200"
                : "h-0"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDropTargetId("canvas-bottom");
          }}
          onDragLeave={() => setDropTargetId(null)}
          onDrop={(e) => {
            const newType = e.dataTransfer.getData(
              "elementType",
            ) as ElementType;
            const sourceId = e.dataTransfer.getData("sourceElementId");
            if (newType) addElement(defaultElement(newType));
            else if (sourceId) reorderElement(sourceId);
            setDropTargetId(null);
            setDraggingId(null);
            setIsSidebarDragging(false);
          }}
        >
          {!hasElements && (
            <div className="text-center pointer-events-none opacity-40">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em]">
                Drop element to start
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
