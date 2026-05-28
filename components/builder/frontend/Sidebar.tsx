"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
} from "react";
import { useBuilderStore } from "@/lib/builder/frontend/store";
import {
  SavedComponent,
  CanvasElement,
  ElementType,
} from "@/lib/builder/frontend/types";
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
  Heading4,
  Heading5,
  Heading6,
  BoxSelect,
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
  Lock,
  Unlock,
  Search,
  X,
  Clock,
  Highlighter,
  Keyboard,
  BarChart2,
  AlertCircle,
  CircleUser,
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
        padding: "24px 32px",
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
      content: "\u00a9 2025 My Site. All rights reserved.",
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
        color: "#f4f4f5",
        lineHeight: "1.2",
      },
    },
    heading2: {
      type: "heading2",
      content: "Heading 2",
      styles: {
        fontSize: "28px",
        fontWeight: "700",
        color: "#f4f4f5",
        lineHeight: "1.3",
      },
    },
    heading3: {
      type: "heading3",
      content: "Heading 3",
      styles: {
        fontSize: "20px",
        fontWeight: "600",
        color: "#f4f4f5",
        lineHeight: "1.4",
      },
    },
    paragraph: {
      type: "paragraph",
      content: "Paragraph text. Write your content here.",
      styles: {
        fontSize: "16px",
        color: "#a1a1aa",
        lineHeight: "1.7",
        maxWidth: "65ch",
      },
    },
    text: {
      type: "text",
      content: "Text block. Click to edit.",
      styles: { fontSize: "16px", color: "#e4e4e7", lineHeight: "1.6" },
    },
    span: {
      type: "span",
      content: "Inline text",
      styles: { fontSize: "16px", color: "#e4e4e7", display: "inline" },
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
        color: "#a1a1aa",
        borderLeft: "4px solid #3f3f46",
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
        backgroundColor: "#27272a",
        color: "#f4f4f5",
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
        color: "#e4e4e7",
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
        color: "#e4e4e7",
        lineHeight: "1.7",
        paddingLeft: "20px",
        listStyleType: "decimal",
      },
    },
    image: {
      type: "image",
      src: "https://placehold.co/800x400/18181b/a1a1aa?text=Image",
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
        backgroundColor: "rgba(59, 130, 246, 0.15)",
        color: "#60a5fa",
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
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "rgba(255, 255, 255, 0.08)",
        width: "100%",
      },
    },
    spacer: { type: "spacer", styles: { height: "48px", width: "100%" } },
    button: {
      type: "button",
      content: "Button",
      href: "#",
      styles: {
        backgroundColor: "#0d99ff",
        color: "#ffffff",
        padding: "10px 24px",
        borderRadius: "6px",
        fontSize: "14px",
        fontWeight: "600",
        cursor: "pointer",
        display: "inline-block",
        textAlign: "center",
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
        borderColor: "rgba(255, 255, 255, 0.1)",
        fontSize: "14px",
        color: "#f4f4f5",
        backgroundColor: "#18181b",
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
        borderColor: "rgba(255, 255, 255, 0.1)",
        fontSize: "14px",
        color: "#f4f4f5",
        backgroundColor: "#18181b",
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
        borderColor: "rgba(255, 255, 255, 0.1)",
        fontSize: "14px",
        color: "#f4f4f5",
        backgroundColor: "#18181b",
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
        color: "#e4e4e7",
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
        color: "#e4e4e7",
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
    time: {
      type: "time",
      content: "January 1, 2025",
      dateTime: "2025-01-01",
      styles: { fontSize: "14px", color: "#a1a1aa" },
    },
    progress: {
      type: "progress",
      progressValue: 60,
      progressMax: 100,
      styles: { width: "100%", height: "8px", borderRadius: "4px" },
    },
    meter: {
      type: "meter",
      progressValue: 0.6,
      progressMax: 1,
      styles: { width: "100%", height: "20px" },
    },
    details: {
      type: "details",
      content: "Click to expand",
      styles: {
        fontSize: "15px",
        color: "#f4f4f5",
        padding: "8px 0",
        cursor: "pointer",
      },
    },
    kbd: {
      type: "kbd",
      content: "⌘K",
      styles: {
        fontFamily: "monospace",
        fontSize: "12px",
        backgroundColor: "#27272a",
        color: "#f4f4f5",
        padding: "2px 6px",
        borderRadius: "4px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        display: "inline-block",
      },
    },
    mark: {
      type: "mark",
      content: "highlighted text",
      styles: {
        backgroundColor: "#ca8a04",
        color: "#ffffff",
        padding: "0 2px",
        borderRadius: "2px",
      },
    },
    card: {
      type: "card",
      styles: {
        backgroundColor: "#18181b",
        borderRadius: "12px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        padding: "24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      },
      children: [],
    },
    avatar: {
      type: "avatar",
      avatarInitials: "AB",
      avatarSrc: "",
      styles: {
        width: "48px",
        height: "48px",
        borderRadius: "9999px",
        backgroundColor: "#3b82f6",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "16px",
        fontWeight: "600",
        overflow: "hidden",
      },
    },
    alert: {
      type: "alert",
      content: "This is an alert message.",
      alertVariant: "info",
      styles: {
        backgroundColor: "rgba(59, 130, 246, 0.15)",
        color: "#60a5fa",
        padding: "12px 16px",
        borderRadius: "8px",
        border: "1px solid rgba(59, 130, 246, 0.3)",
        fontSize: "14px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      },
    },
    figure: {
      type: "figure",
      styles: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        margin: "0",
      },
      children: [],
    },
    heading4: {
      type: "heading4",
      content: "Heading 4",
      styles: {
        fontSize: "18px",
        fontWeight: "600",
        color: "#f4f4f5",
        lineHeight: "1.4",
      },
    },
    heading5: {
      type: "heading5",
      content: "Heading 5",
      styles: {
        fontSize: "16px",
        fontWeight: "600",
        color: "#f4f4f5",
        lineHeight: "1.4",
      },
    },
    heading6: {
      type: "heading6",
      content: "Heading 6",
      styles: {
        fontSize: "14px",
        fontWeight: "600",
        color: "#f4f4f5",
        lineHeight: "1.4",
      },
    },
    label: {
      type: "label",
      content: "Label Text",
      styles: {
        fontSize: "14px",
        color: "#e4e4e7",
        display: "inline-block",
        fontWeight: "500",
      },
    },
    fieldset: {
      type: "fieldset",
      styles: {
        display: "block",
        padding: "16px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "6px",
        marginTop: "8px",
        marginBottom: "8px",
      },
      children: [],
    },
    legend: {
      type: "legend",
      content: "Legend/Title",
      styles: {
        fontSize: "14px",
        fontWeight: "600",
        color: "#f4f4f5",
        paddingLeft: "8px",
        paddingRight: "8px",
      },
    },
    dialog: {
      type: "dialog",
      open: false,
      styles: {
        display: "block",
        backgroundColor: "#18181b",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "8px",
        padding: "24px",
        maxWidth: "500px",
        width: "100%",
      },
      children: [],
    },
    canvas: {
      type: "canvas",
      styles: {
        width: "100%",
        height: "200px",
        backgroundColor: "#18181b",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "6px",
        display: "block",
      },
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
      { type: "fieldset", label: "Fieldset", icon: <BoxSelect size={13} /> },
      { type: "dialog", label: "Dialog", icon: <BoxSelect size={13} /> },
    ],
  },
  {
    label: "Typography",
    icon: <Type size={13} />,
    items: [
      { type: "heading", label: "H1", icon: <Heading1 size={13} /> },
      { type: "heading2", label: "H2", icon: <Heading2 size={13} /> },
      { type: "heading3", label: "H3", icon: <Heading3 size={13} /> },
      { type: "heading4", label: "H4", icon: <Heading4 size={13} /> },
      { type: "heading5", label: "H5", icon: <Heading5 size={13} /> },
      { type: "heading6", label: "H6", icon: <Heading6 size={13} /> },
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
      { type: "canvas", label: "Canvas", icon: <Frame size={13} /> },
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
      { type: "label", label: "Label", icon: <Tag size={13} /> },
      { type: "legend", label: "Legend", icon: <Type size={13} /> },
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
  {
    label: "Components",
    icon: <Package size={13} />,
    items: [
      { type: "card", label: "Card", icon: <Square size={13} /> },
      { type: "alert", label: "Alert", icon: <AlertCircle size={13} /> },
      { type: "avatar", label: "Avatar", icon: <CircleUser size={13} /> },
      { type: "figure", label: "Figure", icon: <ImageIcon size={13} /> },
    ],
  },
  {
    label: "Semantic",
    icon: <FileText size={13} />,
    items: [
      { type: "time", label: "Time", icon: <Clock size={13} /> },
      { type: "mark", label: "Mark", icon: <Highlighter size={13} /> },
      { type: "kbd", label: "Kbd", icon: <Keyboard size={13} /> },
      { type: "details", label: "Details", icon: <ChevronRight size={13} /> },
      { type: "progress", label: "Progress", icon: <BarChart2 size={13} /> },
      { type: "meter", label: "Meter", icon: <BarChart2 size={13} /> },
    ],
  },
];

function getElementIcon(type: string, size = 11) {
  const p = { size, className: "shrink-0" };
  if (type === "heading") return <Heading1 {...p} />;
  if (type === "heading2") return <Heading2 {...p} />;
  if (type === "heading3") return <Heading3 {...p} />;
  if (type === "heading4") return <Heading4 {...p} />;
  if (type === "heading5") return <Heading5 {...p} />;
  if (type === "heading6") return <Heading6 {...p} />;
  if (type === "label") return <Tag {...p} />;
  if (type === "fieldset" || type === "dialog") return <BoxSelect {...p} />;
  if (type === "legend") return <Type {...p} />;
  if (type === "canvas") return <Frame {...p} />;
  if (type === "paragraph") return <AlignLeft {...p} />;
  if (type === "text") return <Type {...p} />;
  if (type === "span") return <Bold {...p} />;
  if (type === "link") return <Link2 {...p} />;
  if (type === "blockquote") return <Quote {...p} />;
  if (type === "code" || type === "pre") return <Code2 {...p} />;
  if (type === "badge") return <Tag {...p} />;
  if (type === "image") return <ImageIcon {...p} />;
  if (type === "video") return <Video {...p} />;
  if (type === "audio") return <AudioLines {...p} />;
  if (type === "iframe") return <MonitorPlay {...p} />;
  if (type === "icon") return <Smile {...p} />;
  if (type === "button") return <MousePointer2 {...p} />;
  if (type === "input") return <FormInput {...p} />;
  if (type === "textarea") return <TextCursorInput {...p} />;
  if (type === "select") return <ListFilter {...p} />;
  if (type === "checkbox") return <CheckSquare {...p} />;
  if (type === "radio") return <CircleDot {...p} />;
  if (type === "table") return <Table2 {...p} />;
  if (type === "divider") return <Minus {...p} />;
  if (type === "spacer") return <Space {...p} />;
  if (type === "list" || type === "orderedList") return <List {...p} />;
  if (type === "section" || type === "main") return <Layout {...p} />;
  if (type === "header" || type === "nav" || type === "navbar")
    return <Navigation {...p} />;
  if (type === "form") return <FormInput {...p} />;
  if (type === "article") return <FileText {...p} />;
  if (type === "aside" || type === "footer") return <Rows {...p} />;
  if (type === "card") return <Square {...p} />;
  if (type === "alert") return <AlertCircle {...p} />;
  if (type === "avatar") return <CircleUser {...p} />;
  if (type === "figure") return <ImageIcon {...p} />;
  if (type === "time") return <Clock {...p} />;
  if (type === "mark") return <Highlighter {...p} />;
  if (type === "kbd") return <Keyboard {...p} />;
  if (type === "details") return <ChevronRight {...p} />;
  if (type === "progress" || type === "meter") return <BarChart2 {...p} />;
  return <Square {...p} />;
}

function getDisplayName(el: CanvasElement): string {
  return (
    el.metadata?.name ||
    el.content?.slice(0, 22) ||
    el.type.replace(/([A-Z])/g, " $1").trim()
  );
}

// FIX: recursively checks children too, not just top level
function matchesSearch(el: CanvasElement, q: string): boolean {
  if (!q) return true;
  const lq = q.toLowerCase();
  const selfMatch =
    getDisplayName(el).toLowerCase().includes(lq) ||
    el.type.toLowerCase().includes(lq);
  if (selfMatch) return true;
  return el.children?.some((c) => matchesSearch(c, lq)) ?? false;
}

interface DragState {
  draggingId: string | null;
  dropTargetId: string | null;
  dropPos: "before" | "after" | "inside";
  setDragging: (id: string | null) => void;
  setDropTarget: (
    id: string | null,
    pos: "before" | "after" | "inside",
  ) => void;
}

const DragCtx = createContext<DragState>({
  draggingId: null,
  dropTargetId: null,
  dropPos: "after",
  setDragging: () => {},
  setDropTarget: () => {},
});

function LayerRow({
  el,
  depth,
  onDrop,
  onDragEnd,
  searchQuery,
}: {
  el: CanvasElement;
  depth: number;
  onDrop: (e: React.DragEvent, targetId: string) => void;
  onDragEnd: () => void;
  searchQuery: string;
}) {
  const {
    selectedElementId,
    selectedElementIds,
    selectElement,
    updateElement,
    setStylingState,
  } = useBuilderStore();
  const { draggingId, dropTargetId, dropPos, setDragging, setDropTarget } =
    useContext(DragCtx);
  const [expanded, setExpanded] = useState(true);

  const isSelected = selectedElementId === el.id;
  const isMultiSelected = (selectedElementIds ?? []).includes(el.id);
  const hasChildren = (el.children?.length ?? 0) > 0;
  const isHidden = !!el.metadata?.isHidden;
  const isLocked = !!el.metadata?.isLocked;
  const isDragging = draggingId === el.id;
  const isDropTarget = dropTargetId === el.id && draggingId !== el.id;

  // FIX: properly dim elements that don't match search (checking recursively)
  const selfMatches = matchesSearch(el, searchQuery);
  const dimmed = !!(searchQuery && !selfMatches);
  const highlighted = !!(searchQuery &&
  selfMatches &&
  !el.children?.some((c) => matchesSearch(c, searchQuery)) === false
    ? false
    : searchQuery &&
      (getDisplayName(el).toLowerCase().includes(searchQuery.toLowerCase()) ||
        el.type.toLowerCase().includes(searchQuery.toLowerCase())));

  const toggleHidden = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateElement(el.id, { metadata: { ...el.metadata, isHidden: !isHidden } });
  };
  const toggleLocked = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateElement(el.id, { metadata: { ...el.metadata, isLocked: !isLocked } });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const relY = (e.clientY - rect.top) / rect.height;
    const pos: "before" | "after" | "inside" =
      relY < 0.25 ? "before" : relY > 0.75 ? "after" : "inside";
    setDropTarget(el.id, pos);
  };

  return (
    <>
      {isDropTarget && dropPos === "before" && (
        <div className="h-0.5 bg-blue-500 rounded-full mx-2 pointer-events-none" />
      )}

      <div
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          setDragging(el.id);
        }}
        onDragOver={handleDragOver}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDrop(e, el.id);
        }}
        onDragEnd={onDragEnd}
        onClick={() => {
          selectElement(el.id);
          setStylingState("default");
        }}
        className={`group flex items-center gap-1 px-2 py-[4px] cursor-pointer select-none transition-all
          ${isSelected ? "bg-blue-600/20 text-white" : "hover:bg-white/5 text-white/55"}
          ${isDragging ? "opacity-30" : ""}
          ${dimmed ? "opacity-20" : ""}
          ${isDropTarget && dropPos === "inside" ? "ring-1 ring-inset ring-blue-500 rounded" : ""}
          ${highlighted ? "bg-blue-500/8 text-white/90" : ""}
          ${isMultiSelected && !isSelected ? "bg-violet-500/10" : ""}
        `}
        style={{ paddingLeft: depth * 12 + 8 }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setExpanded((v) => !v);
          }}
          className={`w-3.5 h-3.5 flex items-center justify-center shrink-0 transition-transform ${hasChildren ? "opacity-40 hover:opacity-80" : "opacity-0 pointer-events-none"} ${expanded ? "rotate-90" : ""}`}
        >
          <ChevronRight size={11} />
        </button>

        <span
          className={`shrink-0 ${isSelected ? "text-blue-400" : isMultiSelected ? "text-violet-400" : "text-white/30 group-hover:text-white/60"} transition-colors`}
        >
          {getElementIcon(el.type)}
        </span>

        <span
          className={`flex-1 text-[11px] font-medium truncate ml-1 ${isHidden ? "line-through opacity-40" : ""}`}
        >
          {getDisplayName(el)}
        </span>

        <span className="text-[9px] text-white/20 font-mono shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mr-1">
          {el.type}
        </span>

        <button
          onClick={toggleHidden}
          title={isHidden ? "Show" : "Hide"}
          className={`shrink-0 p-0.5 rounded transition-all ${isHidden ? "text-white/40" : "text-white/0 group-hover:text-white/30 hover:text-white/70!"}`}
        >
          {isHidden ? <EyeOff size={10} /> : <Eye size={10} />}
        </button>
        <button
          onClick={toggleLocked}
          title={isLocked ? "Unlock" : "Lock"}
          className={`shrink-0 p-0.5 rounded transition-all ${isLocked ? "text-amber-400/70" : "text-white/0 group-hover:text-white/30 hover:text-white/70!"}`}
        >
          {isLocked ? <Lock size={10} /> : <Unlock size={10} />}
        </button>
      </div>

      {isDropTarget && dropPos === "after" && (
        <div className="h-0.5 bg-blue-500 rounded-full mx-2 pointer-events-none" />
      )}

      {hasChildren &&
        expanded &&
        el.children!.map((child) => (
          <LayerRow
            key={child.id}
            el={child}
            depth={depth + 1}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            searchQuery={searchQuery}
          />
        ))}
    </>
  );
}

// FIX: Replaced GSAP-based open/close with pure CSS max-height transition.
// Root causes of the two reported bugs:
//   1. "Tall on reload" — GSAP fires after React paint, so the div renders
//      at full height for one frame. CSS-only avoids this entirely.
//   2. "Can't reopen after collapse" — GSAP set display:none in onComplete,
//      but when reopening it called set({ display:"block" }) then fromTo,
//      and clearProps didn't include "display", so display:none persisted.
//      CSS transitions never touch display, so this race condition is gone.
function GroupRow({
  group,
  onAdd,
}: {
  group: ElementGroup;
  onAdd: (type: ElementType) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 transition-colors cursor-pointer group"
      >
        <span className="text-white/25 group-hover:text-white/50 transition-colors">
          {group.icon}
        </span>
        <span className="flex-1 text-left text-[9px] uppercase tracking-[0.14em] font-bold text-white/50 group-hover:text-white/80 transition-colors">
          {group.label}
        </span>
        {/* FIX: CSS rotate instead of GSAP — no timing issues */}
        <ChevronRight
          size={10}
          className="text-white/20 shrink-0 transition-transform duration-200"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        />
      </button>

      {/* FIX: CSS max-height transition — no GSAP, no display:none, no flash */}
      <div
        style={{
          overflow: "hidden",
          maxHeight: open ? "600px" : "0px",
          opacity: open ? 1 : 0,
          transition: open
            ? "max-height 0.22s ease-out, opacity 0.18s ease-out"
            : "max-height 0.18s ease-in, opacity 0.14s ease-in",
        }}
      >
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
              <span className="flex-1 text-[10px] text-white/80 group-hover/item:text-white font-medium transition-colors">
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
          <div className="text-[10px] text-white/85 group-hover:text-white font-medium truncate">
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
    selectElement,
    reorderElement,
    setStylingState,
  } = useBuilderStore();

  const [tab, setTab] = useState<"layers" | "assets" | "pages">("layers");
  const [newPageName, setNewPageName] = useState("");
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const [draggingId, setDraggingIdState] = useState<string | null>(null);
  const [dropTargetId, setDropTargetIdState] = useState<string | null>(null);
  const [dropPos, setDropPosState] = useState<"before" | "after" | "inside">(
    "after",
  );

  const setDragging = useCallback(
    (id: string | null) => setDraggingIdState(id),
    [],
  );
  const setDropTarget = useCallback(
    (id: string | null, pos: "before" | "after" | "inside") => {
      setDropTargetIdState(id);
      setDropPosState(pos);
    },
    [],
  );

  const dragCtx: DragState = {
    draggingId,
    dropTargetId,
    dropPos,
    setDragging,
    setDropTarget,
  };

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      if (!draggingId || draggingId === targetId) {
        setDragging(null);
        setDropTarget(null, "after");
        return;
      }

      const pg = getActivePage();
      if (!pg) return;

      if (dropPos === "inside") {
        reorderElement(draggingId, targetId, 0);
        setDragging(null);
        setDropTarget(null, "after");
        return;
      }

      type NodeInfo = { parentId: string | undefined; index: number };
      const nodeMap = new Map<string, NodeInfo>();

      const walk = (els: CanvasElement[], parentId: string | undefined) => {
        els.forEach((el, idx) => {
          nodeMap.set(el.id, { parentId, index: idx });
          if (el.children?.length) walk(el.children, el.id);
        });
      };
      walk(pg.elements, undefined);

      const targetInfo = nodeMap.get(targetId);
      if (!targetInfo) {
        setDragging(null);
        setDropTarget(null, "after");
        return;
      }

      const insertIndex =
        dropPos === "before" ? targetInfo.index : targetInfo.index + 1;
      reorderElement(draggingId, targetInfo.parentId, insertIndex);

      setDragging(null);
      setDropTarget(null, "after");
    },
    [
      draggingId,
      dropPos,
      reorderElement,
      getActivePage,
      setDragging,
      setDropTarget,
    ],
  );

  const handleDragEnd = useCallback(() => {
    setDragging(null);
    setDropTarget(null, "after");
  }, [setDragging, setDropTarget]);

  useEffect(() => {
    if (tab !== "layers") return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (!selectedElementId) return;
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === "INPUT" || active.tagName === "TEXTAREA")
      )
        return;
      const pg = getActivePage();
      if (!pg) return;
      const flat: string[] = [];
      const walk = (els: CanvasElement[]) => {
        for (const el of els) {
          flat.push(el.id);
          if (el.children) walk(el.children);
        }
      };
      walk(pg.elements);
      const idx = flat.indexOf(selectedElementId);
      if (e.key === "ArrowUp" && idx > 0) {
        e.preventDefault();
        selectElement(flat[idx - 1]);
        setStylingState("default");
      }
      if (e.key === "ArrowDown" && idx < flat.length - 1) {
        e.preventDefault();
        selectElement(flat[idx + 1]);
        setStylingState("default");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tab, selectedElementId, getActivePage, selectElement, setStylingState]);

  const activePage = getActivePage();

  // FIX: guard against empty string to prevent phantom page creation
  const handleAddPage = () => {
    const name = newPageName.trim();
    if (!name) return;
    addPage(name);
    setNewPageName("");
  };

  const handleAdd = (type: ElementType) => addElement(defaultElement(type));

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 overflow-hidden select-none">
      <div className="flex border-b border-panel-border h-11 px-2 shrink-0">
        {(["layers", "assets", "pages"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 flex items-center justify-center text-[11px] font-medium capitalize cursor-pointer transition-colors relative ${tab === t ? "text-white" : "text-white/40 hover:text-white/70"}`}
          >
            {t}
            {tab === t && (
              <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-white rounded-t-sm" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto w-full min-h-0">
        {tab === "layers" && (
          <DragCtx.Provider value={dragCtx}>
            <div className="px-2 pt-2 pb-1 border-b border-panel-border shrink-0">
              <div className="relative">
                <Search
                  size={10}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none"
                />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search layers\u2026"
                  className="w-full text-[11px] bg-app-bg border border-white/8 hover:border-white/15 focus:border-blue-500/50 rounded pl-6 pr-6 py-1 outline-none text-white placeholder-white/20 transition-all"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            </div>
            <div className="py-1">
              {!activePage?.elements?.length ? (
                <div className="px-4 py-8 text-center text-white/25 text-[11px]">
                  No layers yet.
                  <br />
                  Add elements from Assets.
                </div>
              ) : (
                <>
                  {activePage.elements.map((el) => (
                    <LayerRow
                      key={el.id}
                      el={el}
                      depth={0}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                      searchQuery={search}
                    />
                  ))}
                  {/* FIX: end-of-list drop zone uses pg.elements.length instead of Infinity */}
                  <div
                    className="h-3"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggingId && activePage) {
                        reorderElement(
                          draggingId,
                          undefined,
                          activePage.elements.length,
                        );
                        setDragging(null);
                      }
                    }}
                  />
                </>
              )}
            </div>
          </DragCtx.Provider>
        )}

        {tab === "assets" && (
          <div className="space-y-4 p-2">
            <div>
              <p className="text-[9px] uppercase tracking-widest text-white/60 mb-2 px-1 font-bold">
                Elements
              </p>
              <div className="space-y-0.5">
                {GROUPS.map((group) => (
                  <GroupRow key={group.label} group={group} onAdd={handleAdd} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest text-white/60 mb-2 px-1 font-bold">
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
                className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer transition-colors ${page.id === activePageId ? "bg-blue-500/15 text-blue-400" : "text-white/40 hover:bg-white/5 hover:text-white/80"}`}
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
            <div className="mt-4 flex gap-1.5 px-1 items-center">
              <input
                type="text"
                placeholder="New page..."
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddPage()}
                className="flex-1 min-w-0 text-[11px] bg-white/5 border border-white/10 rounded-md px-2.5 py-1.5 outline-none focus:border-white/20 text-white placeholder-white/20 cursor-text transition-all"
              />
              <button
                onClick={handleAddPage}
                disabled={!newPageName.trim()}
                className="bg-white/5 hover:bg-white/10 text-white/40 p-1.5 rounded-md disabled:opacity-20 transition-colors cursor-pointer shrink-0"
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
