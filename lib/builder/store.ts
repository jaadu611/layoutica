"use client";

import { create } from "zustand";
import {
  BuilderState,
  CanvasElement,
  HistoryEntry,
  Page,
  SavedComponent,
} from "./types";

const MAX_HISTORY = 50;
const generateId = () => Math.random().toString(36).substr(2, 9);

const COMPONENTS_KEY = "buildify-components";

function loadComponents(): SavedComponent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COMPONENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveComponents(components: SavedComponent[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COMPONENTS_KEY, JSON.stringify(components));
  } catch {}
}

function deepCloneWithNewIds(el: CanvasElement): CanvasElement {
  return {
    ...el,
    id: `el-${generateId()}`,
    children: el.children?.map(deepCloneWithNewIds),
  };
}

function deepCloneForInsert(
  el: CanvasElement,
  savedComponentId: string,
): CanvasElement {
  return {
    ...deepCloneWithNewIds(el),
    savedComponentId,
  };
}

const defaultPage: Page = {
  id: "page-1",
  name: "Home",
  slug: "/",
  elements: [
    {
      id: "el-navbar-default",
      type: "navbar",
      content: "Brand",
      styles: {
        backgroundColor: "#ffffff",
        padding: "0px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid #e5e7eb",
        height: "64px",
        width: "100%",
      },
      children: [],
    },
    {
      id: "el-hero-default",
      type: "section",
      styles: {
        backgroundColor: "#f9fafb",
        padding: "80px 32px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "24px",
        width: "100%",
        minHeight: "500px",
      },
      children: [
        {
          id: "el-badge-default",
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
        {
          id: "el-heading-default",
          type: "heading",
          content: "Welcome to your site",
          styles: {
            fontSize: "56px",
            fontWeight: "700",
            color: "#111827",
            textAlign: "center",
            lineHeight: "1.1",
            maxWidth: "700px",
          },
        },
        {
          id: "el-paragraph-default",
          type: "paragraph",
          content:
            "Build beautiful websites visually. Export clean, production-ready React code.",
          styles: {
            fontSize: "18px",
            color: "#6b7280",
            textAlign: "center",
            maxWidth: "520px",
            lineHeight: "1.7",
          },
        },
        {
          id: "el-button-default",
          type: "button",
          content: "Get Started",
          href: "#",
          styles: {
            backgroundColor: "#111827",
            color: "#ffffff",
            padding: "14px 32px",
            borderRadius: "8px",
            fontSize: "15px",
            fontWeight: "600",
            cursor: "pointer",
            display: "inline-block",
          },
        },
      ],
    },
    {
      id: "el-footer-default",
      type: "footer",
      content: "© 2025 MySite. All rights reserved.",
      styles: {
        backgroundColor: "#111827",
        color: "#9ca3af",
        padding: "24px 32px",
        textAlign: "center",
        fontSize: "14px",
        width: "100%",
      },
    },
  ],
};

function snap(pages: Page[], activePageId: string): HistoryEntry {
  return { pages: JSON.parse(JSON.stringify(pages)), activePageId };
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  pages: [defaultPage],
  activePageId: "page-1",
  selectedElementId: null,
  stylingState: "default",
  hoveredElementId: null,
  editingElementId: null,
  past: [],
  future: [],
  components: loadComponents(),
  designTokens: {
    colors: [],
    typography: [],
  },
  selectedElementIds: [],

  undo: () => {
    const { past, pages, activePageId, future } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    set({
      pages: prev.pages,
      activePageId: prev.activePageId,
      past: past.slice(0, -1),
      future: [snap(pages, activePageId), ...future].slice(0, MAX_HISTORY),
      selectedElementId: null,
      editingElementId: null,
    });
  },

  setStylingState: (state) => set({ stylingState: state }),

  redo: () => {
    const { future, pages, activePageId, past } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      pages: next.pages,
      activePageId: next.activePageId,
      future: future.slice(1),
      past: [...past, snap(pages, activePageId)].slice(-MAX_HISTORY),
      selectedElementId: null,
      editingElementId: null,
    });
  },

  toggleSelectElement: (id: string) => {
    const { selectedElementIds, selectedElementId } = get();
    const current = [
      ...(selectedElementId ? [selectedElementId] : []),
      ...selectedElementIds,
    ].filter((v, i, a) => a.indexOf(v) === i);

    if (current.includes(id)) {
      set({ selectedElementIds: current.filter((v) => v !== id) });
    } else {
      set({ selectedElementIds: [...current, id] });
    }
  },

  clearSelection: () => set({ selectedElementIds: [] }),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  addPage: (name: string) => {
    const { pages, activePageId, past } = get();
    const newPage: Page = {
      id: `page-${generateId()}`,
      name,
      slug: `/${name.toLowerCase().replace(/\s+/g, "-")}`,
      elements: [],
    };
    set({
      pages: [...pages, newPage],
      activePageId: newPage.id,
      past: [...past, snap(pages, activePageId)].slice(-MAX_HISTORY),
      future: [],
    });
  },

  addElement: (element, parentId, targetIndex) => {
    const { pages, activePageId, past } = get();
    const newEl: CanvasElement = { ...element, id: `el-${generateId()}` };

    const insertIntoArray = (arr: CanvasElement[]) => {
      const newArr = [...(arr || [])];
      const index = targetIndex !== undefined ? targetIndex : newArr.length;
      newArr.splice(index, 0, newEl);
      return newArr;
    };

    set({
      pages: pages.map((p) => {
        if (p.id !== activePageId) return p;
        if (!parentId) return { ...p, elements: insertIntoArray(p.elements) };
        const addToParent = (elements: CanvasElement[]): CanvasElement[] =>
          elements.map((el) => {
            if (el.id === parentId)
              return { ...el, children: insertIntoArray(el.children || []) };
            if (el.children)
              return { ...el, children: addToParent(el.children) };
            return el;
          });
        return { ...p, elements: addToParent(p.elements) };
      }),
      selectedElementId: newEl.id,
      past: [...past, snap(pages, activePageId)].slice(-MAX_HISTORY),
      future: [],
    });
  },

  loadProject: (pages, components, designTokens) => {
    set({
      pages,
      components,
      designTokens: designTokens || { colors: [], typography: [] },
      activePageId: pages[0]?.id || "",
      selectedElementId: null,
      hoveredElementId: null,
      editingElementId: null,
      past: [],
      future: [],
    });
  },

  reorderElement: (sourceId, targetParentId, targetIndex) => {
    const { pages, activePageId, past } = get();
    const activePage = pages.find((p) => p.id === activePageId);
    if (!activePage) return;

    let movedElement: CanvasElement | null = null;

    const removeFromTree = (elements: CanvasElement[]): CanvasElement[] =>
      elements.reduce((acc, el) => {
        if (el.id === sourceId) {
          movedElement = el;
          return acc;
        }
        const cleanedEl = { ...el };
        if (el.children) cleanedEl.children = removeFromTree(el.children);
        return [...acc, cleanedEl];
      }, [] as CanvasElement[]);

    const cleanTree = removeFromTree(activePage.elements);
    if (!movedElement) return;

    const insertIntoTree = (elements: CanvasElement[]): CanvasElement[] => {
      if (!targetParentId) {
        const newElements = [...elements];
        const idx =
          targetIndex !== undefined ? targetIndex : newElements.length;
        newElements.splice(idx, 0, movedElement!);
        return newElements;
      }
      return elements.map((el) => {
        if (el.id === targetParentId) {
          const newChildren = [...(el.children || [])];
          const idx =
            targetIndex !== undefined ? targetIndex : newChildren.length;
          newChildren.splice(idx, 0, movedElement!);
          return { ...el, children: newChildren };
        }
        if (el.children)
          return { ...el, children: insertIntoTree(el.children) };
        return el;
      });
    };

    set({
      pages: pages.map((p) =>
        p.id === activePageId
          ? { ...p, elements: insertIntoTree(cleanTree) }
          : p,
      ),
      past: [...past, snap(pages, activePageId)].slice(-MAX_HISTORY),
      future: [],
    });
  },

  deletePage: (id: string) => {
    const { pages, activePageId, past } = get();
    const filtered = pages.filter((p) => p.id !== id);
    set({
      pages: filtered,
      activePageId: activePageId === id ? filtered[0]?.id || "" : activePageId,
      past: [...past, snap(pages, activePageId)].slice(-MAX_HISTORY),
      future: [],
    });
  },

  setActivePage: (id: string) =>
    set({ activePageId: id, selectedElementId: null }),

  renamePage: (id: string, name: string) => {
    const { pages, activePageId, past } = get();
    set({
      pages: pages.map((p) =>
        p.id === id
          ? { ...p, name, slug: `/${name.toLowerCase().replace(/\s+/g, "-")}` }
          : p,
      ),
      past: [...past, snap(pages, activePageId)].slice(-MAX_HISTORY),
      future: [],
    });
  },

  updateElement: (id, updates, state = "default") => {
    const { pages, activePageId, past } = get();

    const updateInTree = (elements: CanvasElement[]): CanvasElement[] =>
      elements.map((el) => {
        if (el.id === id) {
          if (updates.styles) {
            if (state === "hover") {
              return {
                ...el,
                hoverStyles: { ...el.hoverStyles, ...updates.styles },
              };
            }
            if (state === "active") {
              return {
                ...el,
                activeStyles: { ...el.activeStyles, ...updates.styles },
              };
            }
            return { ...el, styles: { ...el.styles, ...updates.styles } };
          }
          return { ...el, ...updates };
        }
        if (el.children) return { ...el, children: updateInTree(el.children) };
        return el;
      });

    set({
      pages: pages.map((p) =>
        p.id === activePageId
          ? { ...p, elements: updateInTree(p.elements) }
          : p,
      ),
      past: [...past, snap(pages, activePageId)].slice(-MAX_HISTORY),
      future: [],
    });
  },

  deleteElement: (id) => {
    const { pages, activePageId, past, selectedElementId } = get();
    const removeFromTree = (elements: CanvasElement[]): CanvasElement[] =>
      elements
        .filter((el) => el.id !== id)
        .map((el) =>
          el.children ? { ...el, children: removeFromTree(el.children) } : el,
        );
    set({
      pages: pages.map((p) =>
        p.id === activePageId
          ? { ...p, elements: removeFromTree(p.elements) }
          : p,
      ),
      selectedElementId: selectedElementId === id ? null : selectedElementId,
      past: [...past, snap(pages, activePageId)].slice(-MAX_HISTORY),
      future: [],
    });
  },

  selectElement: (id: string | null) =>
    set({
      selectedElementId: id,
      selectedElementIds: [],
    }),
  setHoveredElement: (id) => set({ hoveredElementId: id }),
  setEditingElement: (id) => set({ editingElementId: id }),

  moveElement: (id, direction) => {
    const { pages, activePageId, past } = get();
    const moveInArray = (arr: CanvasElement[]): CanvasElement[] => {
      const idx = arr.findIndex((el) => el.id === id);
      if (idx === -1)
        return arr.map((el) => ({
          ...el,
          children: el.children ? moveInArray(el.children) : el.children,
        }));
      const newArr = [...arr];
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= newArr.length) return newArr;
      [newArr[idx], newArr[swapIdx]] = [newArr[swapIdx], newArr[idx]];
      return newArr;
    };
    set({
      pages: pages.map((p) =>
        p.id === activePageId ? { ...p, elements: moveInArray(p.elements) } : p,
      ),
      past: [...past, snap(pages, activePageId)].slice(-MAX_HISTORY),
      future: [],
    });
  },

  duplicateElement: (id) => {
    const { pages, activePageId, past } = get();
    const cloneElement = (el: CanvasElement): CanvasElement => ({
      ...el,
      id: `el-${generateId()}`,
      children: el.children ? el.children.map(cloneElement) : undefined,
    });

    const activePage = pages.find((p) => p.id === activePageId);
    if (!activePage) return;

    let cloned: CanvasElement | null = null;
    const findAndClone = (elements: CanvasElement[]): CanvasElement[] => {
      const index = elements.findIndex((el) => el.id === id);
      if (index !== -1) {
        cloned = cloneElement(elements[index]);
        const newArr = [...elements];
        newArr.splice(index + 1, 0, cloned);
        return newArr;
      }
      return elements.map((el) =>
        el.children ? { ...el, children: findAndClone(el.children) } : el,
      );
    };

    const newElements = findAndClone(activePage.elements);
    if (!cloned) return;

    set({
      pages: pages.map((p) =>
        p.id === activePageId ? { ...p, elements: newElements } : p,
      ),
      selectedElementId: (cloned as CanvasElement).id,
      past: [...past, snap(pages, activePageId)].slice(-MAX_HISTORY),
      future: [],
    });
  },

  saveComponent: (name, element) => {
    const comp: SavedComponent = {
      id: `comp-${generateId()}`,
      name,
      element: deepCloneWithNewIds(element),
      createdAt: Date.now(),
    };
    const updated = [...get().components, comp];
    saveComponents(updated);
    set({ components: updated });
  },

  deleteComponent: (id) => {
    const updated = get().components.filter((c) => c.id !== id);
    saveComponents(updated);
    set({ components: updated });
  },

  renameComponent: (id, name) => {
    const updated = get().components.map((c) =>
      c.id === id ? { ...c, name } : c,
    );
    saveComponents(updated);
    set({ components: updated });
  },

  insertComponent: (componentId, parentId, targetIndex) => {
    const comp = get().components.find((c) => c.id === componentId);
    if (!comp) return;

    const clone = deepCloneForInsert(comp.element, comp.id);
    const { pages, activePageId, past } = get();

    const insertIntoArray = (arr: CanvasElement[]) => {
      const newArr = [...(arr || [])];
      const index = targetIndex !== undefined ? targetIndex : newArr.length;
      newArr.splice(index, 0, clone);
      return newArr;
    };

    set({
      pages: pages.map((p) => {
        if (p.id !== activePageId) return p;
        if (!parentId) return { ...p, elements: insertIntoArray(p.elements) };
        const addToParent = (elements: CanvasElement[]): CanvasElement[] =>
          elements.map((el) => {
            if (el.id === parentId)
              return { ...el, children: insertIntoArray(el.children || []) };
            if (el.children)
              return { ...el, children: addToParent(el.children) };
            return el;
          });
        return { ...p, elements: addToParent(p.elements) };
      }),
      selectedElementId: clone.id,
      past: [
        ...past,
        { pages: JSON.parse(JSON.stringify(pages)), activePageId },
      ].slice(-MAX_HISTORY),
      future: [],
    });
  },

  getActivePage: () => get().pages.find((p) => p.id === get().activePageId),

  getSelectedElement: () => {
    const state = get();
    const page = state.pages.find((p) => p.id === state.activePageId);
    if (!page || !state.selectedElementId) return undefined;
    const findInTree = (
      elements: CanvasElement[],
    ): CanvasElement | undefined => {
      for (const el of elements) {
        if (el.id === state.selectedElementId) return el;
        if (el.children) {
          const found = findInTree(el.children);
          if (found) return found;
        }
      }
    };
    return findInTree(page.elements);
  },
}));
