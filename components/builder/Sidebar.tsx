"use client";

import { useState } from "react";
import { useBuilderStore } from "@/lib/builder/store";
import { CanvasElement, ElementType } from "@/lib/builder/types";
import {
  Layout,
  Type,
  Heading as HeadingIcon,
  MousePointer2,
  Image as ImageIcon,
  Columns,
  Rows,
  GripVertical,
  Plus,
  FileText,
  Trash2,
  Edit3,
} from "lucide-react";

const ELEMENTS: {
  type: ElementType;
  label: string;
  icon: React.ReactNode;
  desc: string;
}[] = [
  {
    type: "navbar",
    label: "Navbar",
    icon: <Layout size={14} />,
    desc: "Header navigation",
  },
  {
    type: "section",
    label: "Section",
    icon: <Columns size={14} />,
    desc: "Flex container",
  },
  {
    type: "heading",
    label: "Heading",
    icon: <HeadingIcon size={14} />,
    desc: "Title text",
  },
  {
    type: "text",
    label: "Text",
    icon: <Type size={14} />,
    desc: "Paragraph text",
  },
  {
    type: "button",
    label: "Button",
    icon: <MousePointer2 size={14} />,
    desc: "Clickable action",
  },
  {
    type: "image",
    label: "Image",
    icon: <ImageIcon size={14} />,
    desc: "Visual media",
  },
  {
    type: "footer",
    label: "Footer",
    icon: <Rows size={14} />,
    desc: "Page bottom section",
  },
];

export const defaultElement = (
  type: ElementType,
): Omit<CanvasElement, "id"> => {
  const map: Record<ElementType, Omit<CanvasElement, "id">> = {
    heading: {
      type: "heading",
      content: "New Heading",
      styles: {
        fontSize: "32px",
        fontWeight: "700",
        color: "#111827",
        marginTop: "0px",
        marginBottom: "16px",
        marginLeft: "0px",
        marginRight: "0px",
      },
    },
    text: {
      type: "text",
      content: "New paragraph text. Click to edit.",
      styles: {
        fontSize: "16px",
        color: "#374151",
        marginBottom: "12px",
      },
    },
    button: {
      type: "button",
      content: "Button",
      href: "#",
      styles: {
        backgroundColor: "#111827",
        color: "#ffffff",
        paddingTop: "10px",
        paddingBottom: "10px",
        paddingLeft: "24px",
        paddingRight: "24px",
        borderRadius: "6px",
        fontSize: "14px",
        fontWeight: "600",
      },
    },
    image: {
      type: "image",
      src: "https://placehold.co/800x400/f3f4f6/9ca3af?text=Image",
      alt: "Placeholder",
      styles: {
        width: "100%",
        borderRadius: "8px",
        marginBottom: "16px",
      },
    },
    section: {
      type: "section",
      styles: {
        backgroundColor: "#f9fafb",
        paddingTop: "48px",
        paddingBottom: "48px",
        paddingLeft: "32px",
        paddingRight: "32px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      },
      children: [],
    },
    navbar: {
      type: "navbar",
      content: "Brand",
      styles: {
        backgroundColor: "#ffffff",
        paddingTop: "16px",
        paddingBottom: "16px",
        paddingLeft: "32px",
        paddingRight: "32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid #e5e7eb",
      },
      children: [],
    },
    footer: {
      type: "footer",
      content: "© 2026 My Site.",
      styles: {
        backgroundColor: "#111827",
        color: "#9ca3af",
        paddingTop: "24px",
        paddingBottom: "24px",
        textAlign: "center",
        fontSize: "14px",
      },
    },
  };
  return map[type];
};

export default function Sidebar() {
  const {
    pages,
    activePageId,
    addPage,
    deletePage,
    setActivePage,
    renamePage,
    addElement,
  } = useBuilderStore();

  const [tab, setTab] = useState<"elements" | "pages">("elements");
  const [newPageName, setNewPageName] = useState("");
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleAddPage = () => {
    if (!newPageName.trim()) return;
    addPage(newPageName.trim());
    setNewPageName("");
  };

  return (
    <div className="w-[220px] border-r border-[#2a2a2a] bg-[#161616] flex flex-col shrink-0 overflow-hidden select-none">
      <div className="flex border-b border-[#2a2a2a] h-10 px-1">
        {(["elements", "pages"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-[11px] cursor-pointer font-medium capitalize transition-colors relative ${
              tab === t ? "text-white" : "text-white/30 hover:text-white/60"
            }`}
          >
            {t}
            {tab === t && (
              <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-blue-500 rounded-t-sm" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {tab === "elements" && (
          <div className="space-y-1">
            <p className="text-[9px] uppercase tracking-[0.15em] text-white/20 mb-3 px-1 font-bold">
              Layers
            </p>
            {ELEMENTS.map(({ type, label, icon, desc }) => (
              <div
                key={type}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("elementType", type);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => addElement(defaultElement(type))}
                className="group flex items-center gap-3 px-2.5 py-2 rounded-md cursor-grab active:cursor-grabbing hover:bg-white/5 transition-all"
              >
                <div className="text-white/30 group-hover:text-blue-400 transition-colors shrink-0">
                  {icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-white/70 group-hover:text-white font-medium">
                    {label}
                  </div>
                  <div className="text-[9px] text-white/20 group-hover:text-white/40 truncate">
                    {desc}
                  </div>
                </div>
                <GripVertical
                  size={10}
                  className="text-white/5 group-hover:text-white/20 transition-opacity"
                />
              </div>
            ))}
          </div>
        )}

        {tab === "pages" && (
          <div className="space-y-2">
            <p className="text-[9px] uppercase tracking-[0.15em] text-white/20 mb-3 px-1 font-bold">
              Site Pages
            </p>
            {pages.map((page) => (
              <div
                key={page.id}
                onClick={() => setActivePage(page.id)}
                className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer transition-colors ${
                  page.id === activePageId
                    ? "bg-blue-500/10 text-blue-400"
                    : "text-white/40 hover:bg-white/5 hover:text-white/70"
                }`}
              >
                <FileText
                  size={12}
                  className={
                    page.id === activePageId ? "text-blue-400" : "opacity-40"
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
                    className="p-1 hover:text-white"
                  >
                    <Edit3 size={10} />
                  </button>
                  {pages.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePage(page.id);
                      }}
                      className="p-1 hover:text-red-400"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div className="mt-4 h-6 flex gap-1">
              <input
                type="text"
                placeholder="Page name"
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddPage()}
                className="flex-1 text-[11px] w-30 cursor-pointer bg-white/5 border border-white/10 rounded px-2 py-1.5 outline-none focus:border-white/20 text-white placeholder-white/10"
              />
              <button
                onClick={handleAddPage}
                disabled={!newPageName.trim()}
                className="bg-white/5 hover:bg-white/10 text-white/40 p-1.5 rounded disabled:opacity-20 transition-colors"
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
