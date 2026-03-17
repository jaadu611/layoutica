import { create } from "zustand";
import { BuilderState, CanvasElement, Page } from "./types";

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

export const useBuilderStore = create<BuilderState>((set, get) => ({
  pages: [defaultPage],
  activePageId: "page-1",
  selectedElementId: null,
  hoveredElementId: null,

  addPage: (name: string) => {
    const newPage: Page = {
      id: `page-${generateId()}`,
      name,
      slug: `/${name.toLowerCase().replace(/\s+/g, "-")}`,
      elements: [],
    };
    set((state) => ({
      pages: [...state.pages, newPage],
      activePageId: newPage.id,
    }));
  },

  deletePage: (id: string) => {
    set((state) => {
      const filtered = state.pages.filter((p) => p.id !== id);
      return {
        pages: filtered,
        activePageId:
          state.activePageId === id
            ? filtered[0]?.id || ""
            : state.activePageId,
      };
    });
  },

  setActivePage: (id: string) =>
    set({ activePageId: id, selectedElementId: null }),

  renamePage: (id: string, name: string) => {
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === id
          ? { ...p, name, slug: `/${name.toLowerCase().replace(/\s+/g, "-")}` }
          : p,
      ),
    }));
  },

  addElement: (element, parentId, targetIndex) => {
    const newEl: CanvasElement = { ...element, id: `el-${generateId()}` };
    set((state) => ({
      pages: state.pages.map((p) => {
        if (p.id !== state.activePageId) return p;
        const insertInto = (arr: CanvasElement[]) => {
          const newArr = [...arr];
          const index = targetIndex !== undefined ? targetIndex : newArr.length;
          newArr.splice(index, 0, newEl);
          return newArr;
        };
        if (!parentId) return { ...p, elements: insertInto(p.elements) };
        const addToParent = (elements: CanvasElement[]): CanvasElement[] =>
          elements.map((el) => {
            if (el.id === parentId)
              return { ...el, children: insertInto(el.children || []) };
            if (el.children)
              return { ...el, children: addToParent(el.children) };
            return el;
          });
        return { ...p, elements: addToParent(p.elements) };
      }),
      selectedElementId: newEl.id,
    }));
  },

  reorderElement: (sourceId, targetParentId, targetIndex) => {
    set((state) => {
      const activePage = state.pages.find((p) => p.id === state.activePageId);
      if (!activePage) return state;

      let movedElement: CanvasElement | null = null;

      const removeFromTree = (elements: CanvasElement[]): CanvasElement[] => {
        return elements.reduce((acc, el) => {
          if (el.id === sourceId) {
            movedElement = el;
            return acc;
          }
          if (el.children)
            return [...acc, { ...el, children: removeFromTree(el.children) }];
          return [...acc, el];
        }, [] as CanvasElement[]);
      };

      const cleanTree = removeFromTree(activePage.elements);
      if (!movedElement) return state;

      const insertIntoTree = (elements: CanvasElement[]): CanvasElement[] => {
        const insertAt = (arr: CanvasElement[]) => {
          const newArr = [...arr];
          const index = targetIndex !== undefined ? targetIndex : newArr.length;
          newArr.splice(index, 0, movedElement!);
          return newArr;
        };

        if (!targetParentId) return insertAt(elements);

        return elements.map((el) => {
          if (el.id === targetParentId) {
            return { ...el, children: insertAt(el.children || []) };
          }
          if (el.children && el.children.length > 0) {
            return { ...el, children: insertIntoTree(el.children) };
          }
          return el;
        });
      };

      return {
        pages: state.pages.map((p) =>
          p.id === state.activePageId
            ? { ...p, elements: insertIntoTree(cleanTree) }
            : p,
        ),
      };
    });
  },

  updateElement: (id, updates) => {
    const updateInTree = (elements: CanvasElement[]): CanvasElement[] =>
      elements.map((el) => {
        if (el.id === id) {
          return {
            ...el,
            ...updates,
            styles: { ...el.styles, ...(updates.styles || {}) },
          };
        }
        if (el.children) return { ...el, children: updateInTree(el.children) };
        return el;
      });
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === state.activePageId
          ? { ...p, elements: updateInTree(p.elements) }
          : p,
      ),
    }));
  },

  deleteElement: (id) => {
    const removeFromTree = (elements: CanvasElement[]): CanvasElement[] =>
      elements
        .filter((el) => el.id !== id)
        .map((el) =>
          el.children ? { ...el, children: removeFromTree(el.children) } : el,
        );
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === state.activePageId
          ? { ...p, elements: removeFromTree(p.elements) }
          : p,
      ),
      selectedElementId:
        state.selectedElementId === id ? null : state.selectedElementId,
    }));
  },

  selectElement: (id) => set({ selectedElementId: id }),
  setHoveredElement: (id) => set({ hoveredElementId: id }),

  moveElement: (id, direction) => {
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
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === state.activePageId
          ? { ...p, elements: moveInArray(p.elements) }
          : p,
      ),
    }));
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
