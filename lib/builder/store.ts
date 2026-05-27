"use client";

import { create } from "zustand";
import {
  BuilderState,
  CanvasElement,
  HistoryEntry,
  Page,
  SavedComponent,
  CanvasBreakpoint,
  CanvasBackground,
} from "./types";
import { DesignTokens } from "./projectSaverLoader";

const DEFAULT_TOKENS: DesignTokens = {
  colors: [
    { id: "c1", name: "Primary", value: "#0d99ff" },
    { id: "c2", name: "Secondary", value: "#111827" },
    { id: "c3", name: "Accent", value: "#f59e0b" },
    { id: "c4", name: "Surface", value: "#f9fafb" },
    { id: "c5", name: "Text", value: "#374151" },
    { id: "c6", name: "Muted", value: "#9ca3af" },
  ],
  typography: [
    {
      id: "t1",
      name: "Display",
      fontSize: "56px",
      fontWeight: "700",
      lineHeight: "1.1",
      letterSpacing: "-0.02em",
    },
    {
      id: "t2",
      name: "H1",
      fontSize: "40px",
      fontWeight: "700",
      lineHeight: "1.2",
      letterSpacing: "-0.01em",
    },
    {
      id: "t3",
      name: "H2",
      fontSize: "28px",
      fontWeight: "600",
      lineHeight: "1.3",
      letterSpacing: "0",
    },
    {
      id: "t4",
      name: "H3",
      fontSize: "20px",
      fontWeight: "600",
      lineHeight: "1.4",
      letterSpacing: "0",
    },
    {
      id: "t5",
      name: "Body",
      fontSize: "16px",
      fontWeight: "400",
      lineHeight: "1.7",
      letterSpacing: "0",
    },
    {
      id: "t6",
      name: "Small",
      fontSize: "13px",
      fontWeight: "400",
      lineHeight: "1.5",
      letterSpacing: "0",
    },
    {
      id: "t7",
      name: "Caption",
      fontSize: "11px",
      fontWeight: "500",
      lineHeight: "1.4",
      letterSpacing: "0.04em",
    },
  ],
};

function loadTokens(): DesignTokens {
  return DEFAULT_TOKENS;
}

const MAX_HISTORY = 50;
const generateId = () => Math.random().toString(36).substr(2, 9);

function loadComponents(): SavedComponent[] {
  return [];
}

function saveComponents(components: SavedComponent[]) {
  // Saved in-memory via zustand store state only
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
  return { ...deepCloneWithNewIds(el), savedComponentId };
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
        backgroundColor: "#18181b",
        color: "#f4f4f5",
        padding: "0px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        height: "64px",
        width: "100%",
      },
      children: [],
    },
    {
      id: "el-hero-default",
      type: "section",
      styles: {
        backgroundColor: "#121214",
        padding: "48px 32px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flex: "1",
        gap: "24px",
        width: "100%",
      },
      children: [
        {
          id: "el-badge-default",
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
        {
          id: "el-heading-default",
          type: "heading",
          content: "Welcome to your site",
          styles: {
            fontSize: "56px",
            fontWeight: "700",
            color: "#f4f4f5",
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
            color: "#a1a1aa",
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
            backgroundColor: "#0d99ff",
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
      content: "\u00a9 2025 MySite. All rights reserved.",
      styles: {
        backgroundColor: "#09090b",
        color: "#a1a1aa",
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

let _historyDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingSnap: HistoryEntry | null = null;

function scheduleHistoryCommit(
  currentSnap: HistoryEntry,
  commitFn: (snap: HistoryEntry) => void,
) {
  if (!_pendingSnap) _pendingSnap = currentSnap;
  if (_historyDebounceTimer) clearTimeout(_historyDebounceTimer);
  _historyDebounceTimer = setTimeout(() => {
    if (_pendingSnap) {
      commitFn(_pendingSnap);
      _pendingSnap = null;
    }
  }, 400);
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
  designTokens: typeof window !== "undefined" ? loadTokens() : DEFAULT_TOKENS,
  selectedElementIds: [],
  rightPanelCollapsed: true,
  leftSidebarCollapsed: false,

  canvasBreakpoint: "desktop" as CanvasBreakpoint,
  canvasBackground: "dark" as CanvasBackground,
  showGrid: true,
  showPadding: false,
  showMargin: false,
  exportMode: null,
  setExportMode: (mode) => set({ exportMode: mode }),

  undo: () => {
    if (_historyDebounceTimer) {
      clearTimeout(_historyDebounceTimer);
      _historyDebounceTimer = null;
    }
    if (_pendingSnap) {
      const { pages, activePageId, future } = get();
      set((s) => ({
        past: [...s.past, _pendingSnap!].slice(-MAX_HISTORY),
        future: [snap(pages, activePageId), ...future].slice(0, MAX_HISTORY),
      }));
      _pendingSnap = null;
    }
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
  clearCanvas: () => {
    const { pages, activePageId, past } = get();
    set({
      pages: pages.map((p) =>
        p.id === activePageId ? { ...p, elements: [] } : p
      ),
      selectedElementId: null,
      selectedElementIds: [],
      past: [...past, snap(pages, activePageId)].slice(-MAX_HISTORY),
      future: [],
    });
  },
  canUndo: () => get().past.length > 0 || _pendingSnap !== null,
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

  setDesignTokens: (tokens) => {
    set({ designTokens: tokens });
  },

  reorderElement: (sourceId, targetParentId, targetIndex) => {
    const { pages, activePageId, past } = get();
    const activePage = pages.find((p) => p.id === activePageId);
    if (!activePage) return;

    // 1. Ancestry Check: Prevent moving a container into one of its own children
    const isAncestor = (parentId: string, targetId: string): boolean => {
      const getElement = (id: string, elements: CanvasElement[]): CanvasElement | null => {
        for (const el of elements) {
          if (el.id === id) return el;
          if (el.children) {
            const found = getElement(id, el.children);
            if (found) return found;
          }
        }
        return null;
      };
      const parent = getElement(parentId, activePage.elements);
      if (!parent || !parent.children) return false;
      const findIn = (elements: CanvasElement[]): boolean => {
        return elements.some((el) => el.id === targetId || (el.children && findIn(el.children)));
      };
      return findIn(parent.children);
    };

    if (targetParentId === sourceId || (targetParentId && isAncestor(sourceId, targetParentId))) {
      return;
    }

    // 2. Remove from source
    let movedElement: CanvasElement | null = null;
    const removeFromTree = (elements: CanvasElement[]): CanvasElement[] => {
      return elements.reduce((acc, el) => {
        if (el.id === sourceId) {
          movedElement = el;
          return acc;
        }
        const newEl = { ...el };
        if (el.children) newEl.children = removeFromTree(el.children);
        return [...acc, newEl];
      }, [] as CanvasElement[]);
    };

    const treeWithoutSource = removeFromTree(activePage.elements);
    if (!movedElement) return;

    // 3. Insert into target
    const insertIntoTree = (elements: CanvasElement[]): CanvasElement[] => {
      if (!targetParentId) {
        const newArr = [...elements];
        newArr.splice(targetIndex ?? newArr.length, 0, movedElement!);
        return newArr;
      }
      return elements.map((el) => {
        if (el.id === targetParentId) {
          const children = [...(el.children || [])];
          children.splice(targetIndex ?? children.length, 0, movedElement!);
          return { ...el, children };
        }
        if (el.children) return { ...el, children: insertIntoTree(el.children) };
        return el;
      });
    };

    set({
      pages: pages.map((p) =>
        p.id === activePageId
          ? { ...p, elements: insertIntoTree(treeWithoutSource) }
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

    const becomingAbsolute =
      state === "default" &&
      updates.styles &&
      (updates.styles as any).position === "absolute";

    const findParentId = (
      els: CanvasElement[],
      targetId: string,
      parentId?: string,
    ): string | undefined => {
      for (const el of els) {
        if (el.id === targetId) return parentId;
        if (el.children) {
          const found = findParentId(el.children, targetId, el.id);
          if (found !== undefined) return found;
        }
      }
      return undefined;
    };

    const activePage = pages.find((p) => p.id === activePageId);

    const updateInTree = (elements: CanvasElement[]): CanvasElement[] =>
      elements.map((el) => {
        if (el.id === id) {
          if (updates.styles) {
            if (state === "hover")
              return {
                ...el,
                hoverStyles: { ...el.hoverStyles, ...updates.styles },
              };
            if (state === "active")
              return {
                ...el,
                activeStyles: { ...el.activeStyles, ...updates.styles },
              };
            if (state === "focus")
              return {
                ...el,
                focusStyles: { ...el.focusStyles, ...updates.styles },
              };
            return { ...el, styles: { ...el.styles, ...updates.styles } };
          }
          return { ...el, ...updates };
        }
        if (el.children) return { ...el, children: updateInTree(el.children) };
        return el;
      });

    let updatedElements = activePage ? updateInTree(activePage.elements) : [];

    if (becomingAbsolute && activePage) {
      const parentId = findParentId(activePage.elements, id);
      if (parentId) {
        const fixParent = (els: CanvasElement[]): CanvasElement[] =>
          els.map((el) => {
            if (el.id === parentId) {
              const currentPos = el.styles.position;
              if (!currentPos || currentPos === "static") {
                return {
                  ...el,
                  styles: { ...el.styles, position: "relative" },
                };
              }
              return el;
            }
            if (el.children) return { ...el, children: fixParent(el.children) };
            return el;
          });
        updatedElements = fixParent(updatedElements);
      }
    }

    const updatedPages = pages.map((p) =>
      p.id === activePageId ? { ...p, elements: updatedElements } : p,
    );

    const isRapidEdit = !!updates.styles || "content" in updates;

    if (isRapidEdit) {
      const currentSnap = snap(pages, activePageId);
      set({ pages: updatedPages, future: [] });
      scheduleHistoryCommit(currentSnap, (s) => {
        set((store) => ({ past: [...store.past, s].slice(-MAX_HISTORY) }));
      });
    } else {
      set({
        pages: updatedPages,
        past: [...past, snap(pages, activePageId)].slice(-MAX_HISTORY),
        future: [],
      });
    }
  },

  deleteElement: (id) => {
    const { pages, activePageId, past, selectedElementId, selectedElementIds } =
      get();
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
      selectedElementIds: (selectedElementIds ?? []).filter(
        (sid) => sid !== id,
      ),
      past: [...past, snap(pages, activePageId)].slice(-MAX_HISTORY),
      future: [],
    });
  },

  selectElement: (id: string | null) =>
    set({ selectedElementId: id, selectedElementIds: [] }),
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

  setRightPanelCollapsed: (v: boolean) => set({ rightPanelCollapsed: v }),
  setLeftSidebarCollapsed: (v: boolean) => set({ leftSidebarCollapsed: v }),

  setCanvasBreakpoint: (v: CanvasBreakpoint) => set({ canvasBreakpoint: v }),
  setCanvasBackground: (v: CanvasBackground) => set({ canvasBackground: v }),
  setShowGrid: (v: boolean) => set({ showGrid: v }),
  setShowPadding: (v: boolean) => set({ showPadding: v }),
  setShowMargin: (v: boolean) => set({ showMargin: v }),
}));
