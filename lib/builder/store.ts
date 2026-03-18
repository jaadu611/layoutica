import { create } from "zustand";
import { BuilderState, CanvasElement, HistoryEntry, Page } from "./types";

const MAX_HISTORY = 50;
const generateId = () => Math.random().toString(36).substr(2, 9);

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
      id: "el-section-default",
      type: "section",
      styles: {
        backgroundColor: "#f9fafb",
        padding: "64px 32px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "24px",
        minHeight: "400px",
        width: "100%",
      },
      children: [
        {
          id: "el-heading-default",
          type: "heading",
          content: "Welcome to your site",
          styles: {
            fontSize: "48px",
            fontWeight: "700",
            color: "#111827",
            textAlign: "center",
          },
        },
      ],
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
  hoveredElementId: null,
  past: [],
  future: [],

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
    });
  },

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
    });
  },

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

  updateElement: (id, updates) => {
    const { pages, activePageId, past } = get();
    const updateInTree = (elements: CanvasElement[]): CanvasElement[] =>
      elements.map((el) => {
        if (el.id === id)
          return {
            ...el,
            ...updates,
            styles: { ...el.styles, ...(updates.styles || {}) },
          };
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

  selectElement: (id) => set({ selectedElementId: id }),
  setHoveredElement: (id) => set({ hoveredElementId: id }),

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
