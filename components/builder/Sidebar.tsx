"use client";

import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from "react";
import gsap from "gsap";
import { useBuilderStore } from "@/lib/builder/store";
import {
  SavedComponent,
  CanvasElement,
  ElementType,
} from "@/lib/builder/types";
import {
  Layout,
  Type,
  MousePointer2,
  Image as ImageIcon,
  Rows,
  GripVertical,
  Plus,
  FileText,
  Trash2,
  Edit3,
  ChevronRight,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  Tag,
  Link2,
  List,
  ListOrdered,
  Video,
  MonitorPlay,
  Smile,
  Minus,
  Space,
  Square,
  Layers,
  Navigation,
  FormInput,
  TextCursorInput,
  CheckSquare,
  ListFilter,
  CircleDot,
  Table2,
  Quote,
  Code2,
  FileCode,
  Puzzle,
  Package,
  Frame,
  AudioLines,
  Bold,
  Eye,
  EyeOff,
  ChevronDown,
} from "lucide-react";

export const defaultElement = (
  type: ElementType,
): Omit<CanvasElement, "id"> => {
  const map: Record<ElementType, Omit<CanvasElement, "id">> = {
    div: { type: "div", styles: { display: "block" }, children: [] },
    section: {
      type: "section",
      styles: {
        display: "flex",
        flexDirection: "column",
        padding: "48px 32px",
      },
      children: [],
    },
    article: {
      type: "article",
      styles: { display: "block", padding: "32px" },
      children: [],
    },
    aside: {
      type: "aside",
      styles: { display: "block", padding: "24px" },
      children: [],
    },
    main: { type: "main", styles: { display: "block" }, children: [] },
    header: {
      type: "header",
      styles: { display: "flex", alignItems: "center", padding: "16px 32px" },
      children: [],
    },
    nav: {
      type: "nav",
      styles: { display: "flex", alignItems: "center", gap: "16px" },
      children: [],
    },
    form: {
      type: "form",
      styles: { display: "flex", flexDirection: "column", gap: "16px" },
      children: [],
    },
    footer: {
      type: "footer",
      content: "© 2025 My Site. All rights reserved.",
      styles: { textAlign: "center", fontSize: "14px", padding: "24px 32px" },
    },
    navbar: {
      type: "navbar",
      content: "Brand",
      styles: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "16px 32px",
      },
      children: [],
    },
    heading: {
      type: "heading",
      content: "Heading 1",
      styles: {
        fontSize: "40px",
        fontWeight: "700",
        color: "#111827",
        lineHeight: "1.2",
      },
    },
    heading2: {
      type: "heading2",
      content: "Heading 2",
      styles: {
        fontSize: "28px",
        fontWeight: "700",
        color: "#111827",
        lineHeight: "1.3",
      },
    },
    heading3: {
      type: "heading3",
      content: "Heading 3",
      styles: {
        fontSize: "20px",
        fontWeight: "600",
        color: "#111827",
        lineHeight: "1.4",
      },
    },
    paragraph: {
      type: "paragraph",
      content: "Paragraph text. Write your content here.",
      styles: {
        fontSize: "16px",
        color: "#4b5563",
        lineHeight: "1.7",
        maxWidth: "65ch",
      },
    },
    text: {
      type: "text",
      content: "Text block. Click to edit.",
      styles: { fontSize: "16px", color: "#374151", lineHeight: "1.6" },
    },
    span: {
      type: "span",
      content: "Inline text",
      styles: { fontSize: "16px", color: "#374151", display: "inline" },
    },
    link: {
      type: "link",
      content: "Click here",
      href: "#",
      styles: {
        color: "#3b82f6",
        fontSize: "16px",
        textDecoration: "underline",
        cursor: "pointer",
      },
    },
    blockquote: {
      type: "blockquote",
      content: "A quote worth remembering.",
      styles: {
        fontSize: "18px",
        color: "#374151",
        borderLeft: "4px solid #e5e7eb",
        paddingLeft: "16px",
        fontStyle: "italic",
      },
    },
    code: {
      type: "code",
      content: "const hello = 'world';",
      styles: {
        fontFamily: "'Courier New', monospace",
        fontSize: "14px",
        backgroundColor: "#f3f4f6",
        color: "#111827",
        padding: "2px 6px",
        borderRadius: "4px",
        display: "inline-block",
      },
    },
    pre: {
      type: "pre",
      content: "// code block\nconst x = 1;",
      styles: {
        fontFamily: "'Courier New', monospace",
        fontSize: "14px",
        backgroundColor: "#1e1e2e",
        color: "#cdd6f4",
        padding: "24px",
        borderRadius: "8px",
        display: "block",
        whiteSpace: "pre",
        overflow: "auto",
      },
    },
    list: {
      type: "list",
      listItems: ["First item", "Second item", "Third item"],
      styles: {
        fontSize: "16px",
        color: "#374151",
        lineHeight: "1.7",
        paddingLeft: "20px",
        listStyleType: "disc",
      },
    },
    orderedList: {
      type: "orderedList",
      listItems: ["First item", "Second item", "Third item"],
      styles: {
        fontSize: "16px",
        color: "#374151",
        lineHeight: "1.7",
        paddingLeft: "20px",
        listStyleType: "decimal",
      },
    },
    image: {
      type: "image",
      src: "https://placehold.co/800x400/f3f4f6/9ca3af?text=Image",
      alt: "Placeholder image",
      styles: { width: "100%", display: "block" },
    },
    video: {
      type: "video",
      videoSrc: "",
      controls: true,
      styles: { width: "100%", backgroundColor: "#000000" },
    },
    audio: {
      type: "audio",
      videoSrc: "",
      controls: true,
      styles: { width: "100%" },
    },
    iframe: {
      type: "iframe",
      src: "",
      styles: { width: "100%", height: "400px", display: "block" },
    },
    icon: {
      type: "icon",
      iconName: "Star",
      styles: { fontSize: "24px", color: "#3b82f6", display: "inline-block" },
    },
    badge: {
      type: "badge",
      content: "New",
      styles: {
        backgroundColor: "#eff6ff",
        color: "#3b82f6",
        fontSize: "12px",
        fontWeight: "600",
        padding: "4px 12px",
        borderRadius: "999px",
        display: "inline-block",
      },
    },
    divider: {
      type: "divider",
      styles: {
        borderTop: "1px solid #e5e7eb",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "#e5e7eb",
        width: "100%",
      },
    },
    spacer: { type: "spacer", styles: { height: "48px", width: "100%" } },
    button: {
      type: "button",
      content: "Button",
      href: "#",
      styles: {
        backgroundColor: "#111827",
        color: "#ffffff",
        padding: "10px 24px",
        borderRadius: "6px",
        fontSize: "14px",
        fontWeight: "600",
        cursor: "pointer",
        display: "inline-block",
      },
    },
    input: {
      type: "input",
      placeholder: "Enter value...",
      styles: {
        width: "100%",
        padding: "10px 14px",
        borderRadius: "6px",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "#d1d5db",
        fontSize: "14px",
        color: "#111827",
        backgroundColor: "#ffffff",
      },
    },
    textarea: {
      type: "textarea",
      placeholder: "Enter text...",
      styles: {
        width: "100%",
        padding: "10px 14px",
        borderRadius: "6px",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "#d1d5db",
        fontSize: "14px",
        color: "#111827",
        backgroundColor: "#ffffff",
        minHeight: "100px",
        resize: "vertical",
      },
    },
    select: {
      type: "select",
      selectOptions: ["Option 1", "Option 2", "Option 3"],
      styles: {
        width: "100%",
        padding: "10px 14px",
        borderRadius: "6px",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "#d1d5db",
        fontSize: "14px",
        color: "#111827",
        backgroundColor: "#ffffff",
      },
    },
    checkbox: {
      type: "checkbox",
      content: "I agree to the terms",
      checked: false,
      styles: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "14px",
        color: "#374151",
        cursor: "pointer",
      },
    },
    radio: {
      type: "radio",
      content: "Option",
      styles: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "14px",
        color: "#374151",
        cursor: "pointer",
      },
    },
    table: {
      type: "table",
      tableData: {
        headers: ["Header 1", "Header 2", "Header 3"],
        rows: [
          ["Cell", "Cell", "Cell"],
          ["Cell", "Cell", "Cell"],
        ],
      },
      styles: { width: "100%", borderCollapse: "collapse", fontSize: "14px" },
    },
  };
  return map[type];
};

type SubItem = { type: ElementType; label: string; icon: React.ReactNode };
type ElementGroup = { label: string; icon: React.ReactNode; items: SubItem[] };

const GROUPS: ElementGroup[] = [
  {
    label: "Layout",
    icon: <Layers size={13} />,
    items: [
      { type: "div", label: "Div", icon: <Square size={13} /> },
      { type: "section", label: "Section", icon: <Layout size={13} /> },
      { type: "article", label: "Article", icon: <FileText size={13} /> },
      { type: "aside", label: "Aside", icon: <Rows size={13} /> },
      { type: "main", label: "Main", icon: <Layout size={13} /> },
      { type: "header", label: "Header", icon: <Navigation size={13} /> },
      { type: "nav", label: "Nav", icon: <Navigation size={13} /> },
      { type: "form", label: "Form", icon: <FormInput size={13} /> },
      { type: "footer", label: "Footer", icon: <Rows size={13} /> },
    ],
  },

  {
    label: "Typography",
    icon: <Type size={13} />,
    items: [
      { type: "heading", label: "H1", icon: <Heading1 size={13} /> },
      { type: "heading2", label: "H2", icon: <Heading2 size={13} /> },
      { type: "heading3", label: "H3", icon: <Heading3 size={13} /> },
      { type: "paragraph", label: "Paragraph", icon: <AlignLeft size={13} /> },
      { type: "text", label: "Text", icon: <Type size={13} /> },
      { type: "span", label: "Span", icon: <Bold size={13} /> },
      { type: "link", label: "Link", icon: <Link2 size={13} /> },
      { type: "blockquote", label: "Blockquote", icon: <Quote size={13} /> },
      { type: "code", label: "Code", icon: <Code2 size={13} /> },
      { type: "pre", label: "Pre", icon: <FileCode size={13} /> },
      { type: "badge", label: "Badge", icon: <Tag size={13} /> },
    ],
  },
  {
    label: "Lists",
    icon: <List size={13} />,
    items: [
      { type: "list", label: "Unordered", icon: <List size={13} /> },
      {
        type: "orderedList",
        label: "Ordered",
        icon: <ListOrdered size={13} />,
      },
    ],
  },
  {
    label: "Media",
    icon: <ImageIcon size={13} />,
    items: [
      { type: "image", label: "Image", icon: <ImageIcon size={13} /> },
      { type: "video", label: "Video", icon: <Video size={13} /> },
      { type: "audio", label: "Audio", icon: <AudioLines size={13} /> },
      { type: "iframe", label: "iFrame", icon: <MonitorPlay size={13} /> },
      { type: "icon", label: "Icon", icon: <Smile size={13} /> },
    ],
  },
  {
    label: "Interactive",
    icon: <MousePointer2 size={13} />,
    items: [
      { type: "button", label: "Button", icon: <MousePointer2 size={13} /> },
      { type: "input", label: "Input", icon: <FormInput size={13} /> },
      {
        type: "textarea",
        label: "Textarea",
        icon: <TextCursorInput size={13} />,
      },
      { type: "select", label: "Select", icon: <ListFilter size={13} /> },
      { type: "checkbox", label: "Checkbox", icon: <CheckSquare size={13} /> },
      { type: "radio", label: "Radio", icon: <CircleDot size={13} /> },
    ],
  },
  {
    label: "Table",
    icon: <Table2 size={13} />,
    items: [{ type: "table", label: "Table", icon: <Table2 size={13} /> }],
  },
  {
    label: "Misc",
    icon: <Minus size={13} />,
    items: [
      { type: "divider", label: "Divider", icon: <Minus size={13} /> },
      { type: "spacer", label: "Spacer", icon: <Space size={13} /> },
    ],
  },
];

function GroupRow({
  group,
  onAdd,
}: {
  group: ElementGroup;
  onAdd: (type: ElementType) => void;
}) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const chevronRef = useRef<SVGSVGElement>(null);
  const isFirst = useRef(true);

  useEffect(() => {
    if (!contentRef.current) return;
    if (isFirst.current) {
      isFirst.current = false;
      gsap.set(contentRef.current, {
        height: open ? "auto" : 0,
        opacity: open ? 1 : 0,
        overflow: "hidden",
      });
      return;
    }
    if (open) {
      gsap.set(contentRef.current, { display: "block" });
      gsap.fromTo(
        contentRef.current,
        { height: 0, opacity: 0 },
        {
          height: "auto",
          opacity: 1,
          duration: 0.22,
          ease: "power3.out",
          clearProps: "height,overflow",
        },
      );
    } else {
      gsap.to(contentRef.current, {
        height: 0,
        opacity: 0,
        duration: 0.18,
        ease: "power3.in",
        onComplete: () => {
          if (contentRef.current)
            gsap.set(contentRef.current, { display: "none" });
        },
      });
    }
  }, [open]);

  useEffect(() => {
    if (!chevronRef.current) return;
    gsap.to(chevronRef.current, {
      rotation: open ? 90 : 0,
      duration: 0.2,
      ease: "power2.inOut",
      transformOrigin: "50% 50%",
    });
  }, [open]);

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 transition-colors cursor-pointer group"
      >
        <span className="text-white/25 group-hover:text-white/50 transition-colors">
          {group.icon}
        </span>
        <span className="flex-1 text-left text-[10px] uppercase tracking-[0.12em] font-bold text-white/30 group-hover:text-white/50 transition-colors">
          {group.label}
        </span>
        <ChevronRight
          ref={chevronRef as any}
          size={10}
          className="text-white/20 shrink-0"
          style={{ willChange: "transform" }}
        />
      </button>

      <div ref={contentRef} style={{ overflow: "hidden" }}>
        <div className="pl-2 pb-1 space-y-0.5">
          {group.items.map(({ type, label, icon }) => (
            <div
              key={type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("elementType", type);
                e.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => onAdd(type)}
              className="group/item flex items-center gap-2.5 px-2 py-1.5 rounded cursor-grab active:cursor-grabbing hover:bg-white/5 transition-all"
            >
              <span className="text-white/25 group-hover/item:text-blue-400 transition-colors shrink-0">
                {icon}
              </span>
              <span className="flex-1 text-[11px] text-white/55 group-hover/item:text-white/90 font-medium transition-colors">
                {label}
              </span>
              <GripVertical
                size={9}
                className="text-white/0 group-hover/item:text-white/20 transition-colors shrink-0"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ComponentRow({
  comp,
  onInsert,
  onDelete,
  onRename,
}: {
  comp: SavedComponent;
  onInsert: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(comp.name);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("componentId", comp.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
      onClick={onInsert}
      className="group flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-grab active:cursor-grabbing hover:bg-white/5 transition-all"
    >
      <div className="w-7 h-7 rounded-md bg-white/5 border border-white/8 flex items-center justify-center shrink-0 text-white/25 group-hover:text-blue-400 transition-colors">
        <Puzzle size={12} />
      </div>
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={() => {
              if (editName.trim()) onRename(editName.trim());
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (editName.trim()) onRename(editName.trim());
                setEditing(false);
              }
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-full bg-transparent text-[11px] outline-none text-white border-b border-blue-500"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="text-[11px] text-white/60 group-hover:text-white/90 font-medium truncate">
            {comp.name}
          </div>
        )}
        <div className="text-[9px] text-white/20 capitalize">
          {comp.element.type}
        </div>
      </div>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
            setEditName(comp.name);
          }}
          className="p-1 hover:text-white text-white/30 cursor-pointer"
          title="Rename"
        >
          <Edit3 size={10} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 hover:text-red-400 text-white/30 cursor-pointer"
          title="Delete"
        >
          <Trash2 size={10} />
        </button>
      </div>
      <GripVertical
        size={9}
        className="text-white/0 group-hover:text-white/20 transition-colors shrink-0"
      />
    </div>
  );
}

function LayerTreeItem({
  el,
  depth = 0,
  activeId,
  hoveredId,
  onSelect,
  onHover,
  onLeave,
}: {
  el: CanvasElement;
  depth?: number;
  activeId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onLeave: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const isSelected = activeId === el.id;
  const isHovered = hoveredId === el.id;
  const hasChildren = el.children && el.children.length > 0;

  const displayName =
    el.metadata?.name || el.type.charAt(0).toUpperCase() + el.type.slice(1);

  return (
    <div>
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSelect(el.id);
        }}
        onMouseEnter={(e) => {
          e.stopPropagation();
          onHover(el.id);
        }}
        onMouseLeave={onLeave}
        className={`flex items-center h-7 px-2 cursor-pointer transition-colors ${
          isSelected
            ? "bg-blue-500/15 text-blue-400"
            : isHovered
              ? "bg-white/5 text-white/90"
              : "text-white/60 hover:text-white/80"
        }`}
        style={{ paddingLeft: `${depth * 10 + 8}px` }}
      >
        <div className="flex items-center justify-center w-4 h-4 mr-1 opacity-50">
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="hover:text-white"
            >
              <ChevronRight
                size={12}
                className={`transition-transform ${expanded ? "rotate-90" : ""}`}
              />
            </button>
          ) : (
            <span className="w-1 h-1 rounded-full bg-white/20" />
          )}
        </div>

        {/* Detailed icon mapping */}
        <div className="mr-2 opacity-70">
          {el.type === "div" ? (
            <Square size={11} />
          ) : el.type === "section" ? (
            <Layout size={11} />
          ) : el.type === "article" ? (
            <FileText size={11} />
          ) : el.type === "aside" || el.type === "footer" ? (
            <Rows size={11} />
          ) : el.type === "main" ? (
            <Layout size={11} />
          ) : el.type === "header" ||
            el.type === "nav" ||
            el.type === "navbar" ? (
            <Navigation size={11} />
          ) : el.type === "form" || el.type === "input" ? (
            <FormInput size={11} />
          ) : el.type === "heading" ? (
            <Heading1 size={11} />
          ) : el.type === "heading2" ? (
            <Heading2 size={11} />
          ) : el.type === "heading3" ? (
            <Heading3 size={11} />
          ) : el.type === "paragraph" ? (
            <AlignLeft size={11} />
          ) : el.type === "text" ? (
            <Type size={11} />
          ) : el.type === "span" ? (
            <Bold size={11} />
          ) : el.type === "link" ? (
            <Link2 size={11} />
          ) : el.type === "list" || el.type === "orderedList" ? (
            <List size={11} />
          ) : el.type === "blockquote" ? (
            <Quote size={11} />
          ) : el.type === "code" || el.type === "pre" ? (
            <Code2 size={11} />
          ) : el.type === "badge" ? (
            <Tag size={11} />
          ) : el.type === "image" ? (
            <ImageIcon size={11} />
          ) : el.type === "video" ? (
            <Video size={11} />
          ) : el.type === "audio" ? (
            <AudioLines size={11} />
          ) : el.type === "iframe" ? (
            <MonitorPlay size={11} />
          ) : el.type === "icon" ? (
            <Smile size={11} />
          ) : el.type === "button" ? (
            <MousePointer2 size={11} />
          ) : el.type === "textarea" ? (
            <TextCursorInput size={11} />
          ) : el.type === "select" ? (
            <ListFilter size={11} />
          ) : el.type === "checkbox" ? (
            <CheckSquare size={11} />
          ) : el.type === "radio" ? (
            <CircleDot size={11} />
          ) : el.type === "table" ? (
            <Table2 size={11} />
          ) : el.type === "divider" ? (
            <Minus size={11} />
          ) : el.type === "spacer" ? (
            <Space size={11} />
          ) : (
            <Frame size={11} />
          )}
        </div>

        <span className="text-[11px] font-medium truncate flex-1">
          {displayName}
        </span>
      </div>

      {hasChildren && expanded && (
        <div>
          {el.children!.map((child) => (
            <LayerTreeItem
              key={child.id}
              el={child}
              depth={depth + 1}
              activeId={activeId}
              hoveredId={hoveredId}
              onSelect={onSelect}
              onHover={onHover}
              onLeave={onLeave}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const {
    pages,
    activePageId,
    addPage,
    deletePage,
    setActivePage,
    renamePage,
    addElement,
    components,
    deleteComponent,
    renameComponent,
    insertComponent,
    getActivePage,
    selectedElementId,
    hoveredElementId,
    selectElement,
    setHoveredElement,
  } = useBuilderStore();

  const [tab, setTab] = useState<"layers" | "assets" | "pages">("layers");
  const [newPageName, setNewPageName] = useState("");
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const activePage = getActivePage();

  const handleAddPage = () => {
    if (!newPageName.trim()) return;
    addPage(newPageName.trim());
    setNewPageName("");
  };

  const handleAdd = (type: ElementType) => addElement(defaultElement(type));

  return (
    <div className="w-[240px] border-r border-[#383838] bg-[#2c2c2c] flex flex-col shrink-0 overflow-hidden select-none">
      <div className="flex border-b border-[#383838] h-11 px-2 shrink-0">
        {(["layers", "assets", "pages"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 flex items-center justify-center text-[11px] font-medium capitalize cursor-pointer transition-colors relative ${
              tab === t ? "text-white" : "text-white/40 hover:text-white/70"
            }`}
          >
            {t}
            {tab === t && (
              <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-white rounded-t-sm" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
        {tab === "layers" && (
          <div className="py-2">
            {!activePage?.elements?.length ? (
              <div className="px-4 py-8 text-center text-white/30 text-[11px]">
                No layers on this page.
                <br />
                Add elements from Assets.
              </div>
            ) : (
              activePage.elements.map((el) => (
                <LayerTreeItem
                  key={el.id}
                  el={el}
                  activeId={selectedElementId}
                  hoveredId={hoveredElementId}
                  onSelect={selectElement}
                  onHover={setHoveredElement}
                  onLeave={() => setHoveredElement(null)}
                />
              ))
            )}
          </div>
        )}

        {tab === "assets" && (
          <div className="space-y-4 p-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2 px-1 font-semibold">
                Elements
              </p>
              <div className="space-y-0.5">
                {GROUPS.map((group) => (
                  <GroupRow key={group.label} group={group} onAdd={handleAdd} />
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2 px-1 font-semibold">
                Saved Components
              </p>
              {components.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center bg-white/5 rounded-md mx-1 border border-white/5 border-dashed">
                  <Package size={20} className="text-white/20 mb-2" />
                  <p className="text-[10px] text-white/40 leading-relaxed px-4">
                    Right-click canvas elements to save components
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {components.map((comp) => (
                    <ComponentRow
                      key={comp.id}
                      comp={comp}
                      onInsert={() => insertComponent(comp.id)}
                      onDelete={() => deleteComponent(comp.id)}
                      onRename={(name) => renameComponent(comp.id, name)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "pages" && (
          <div className="space-y-2 p-2">
            <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2 px-1 font-semibold">
              Site Pages
            </p>
            {pages.map((page) => (
              <div
                key={page.id}
                onClick={() => setActivePage(page.id)}
                className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer transition-colors ${
                  page.id === activePageId
                    ? "bg-blue-500/15 text-blue-400"
                    : "text-white/40 hover:bg-white/5 hover:text-white/80"
                }`}
              >
                <FileText
                  size={12}
                  className={
                    page.id === activePageId
                      ? "text-blue-400"
                      : "opacity-40 group-hover:opacity-100"
                  }
                />

                {editingPageId === page.id ? (
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => {
                      if (editingName.trim())
                        renamePage(page.id, editingName.trim());
                      setEditingPageId(null);
                    }}
                    onKeyDown={(e) =>
                      e.key === "Enter" && setEditingPageId(null)
                    }
                    className="flex-1 bg-transparent text-[11px] outline-none text-white border-b border-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="flex-1 text-[11px] truncate font-medium">
                    {page.name}
                  </span>
                )}

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPageId(page.id);
                      setEditingName(page.name);
                    }}
                    className="p-1 hover:text-white cursor-pointer"
                  >
                    <Edit3 size={10} />
                  </button>
                  {pages.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePage(page.id);
                      }}
                      className="p-1 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div className="mt-4 flex gap-1 px-1">
              <input
                type="text"
                placeholder="New page..."
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddPage()}
                className="flex-1 text-[11px] bg-white/5 border border-white/10 rounded px-2 py-1.5 outline-none focus:border-white/20 text-white placeholder-white/20 cursor-text"
              />
              <button
                onClick={handleAddPage}
                disabled={!newPageName.trim()}
                className="bg-white/5 hover:bg-white/10 text-white/40 p-1.5 rounded disabled:opacity-20 transition-colors cursor-pointer"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
