import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import {
  BuilderState,
  CanvasElement,
  HistoryEntry,
  Page,
  PageRole,
  SavedComponent,
  SelectedState,
  UILayoutSnapshot,
} from "./types";
import { getVsCodeApi } from "./vscode";

const generateId = () => Math.random().toString(36).substring(2, 11);
const MAX_HISTORY = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────

function pushHistory(
  past: HistoryEntry[],
  pages: Page[],
  activePageId: string,
): HistoryEntry[] {
  return [...past, { pages: structuredClone(pages), activePageId }].slice(
    -MAX_HISTORY,
  );
}

function addChild(
  parent: CanvasElement,
  child: CanvasElement,
  targetIndex?: number,
): CanvasElement {
  const siblings = parent.children ?? [];
  const idx = targetIndex ?? siblings.length;
  return {
    ...parent,
    children: [...siblings.slice(0, idx), child, ...siblings.slice(idx)],
  };
}

function removeChild(parent: CanvasElement, childId: string): CanvasElement {
  return {
    ...parent,
    children: (parent.children ?? []).filter((c) => c.id !== childId),
  };
}

function findAndRemove(
  elements: CanvasElement[],
  id: string,
): { elements: CanvasElement[]; removed: CanvasElement | null } {
  let removed: CanvasElement | null = null;
  const newElements: CanvasElement[] = [];
  for (const el of elements) {
    if (el.id === id) {
      removed = el;
      // skip
    } else if (el.children?.length) {
      const result = findAndRemove(el.children, id);
      if (result.removed) removed = result.removed;
      newElements.push({ ...el, children: result.elements });
    } else {
      newElements.push(el);
    }
  }
  return { elements: newElements, removed };
}

function findElement(
  elements: CanvasElement[],
  id: string,
): CanvasElement | undefined {
  for (const el of elements) {
    if (el.id === id) return el;
    if (el.children?.length) {
      const found = findElement(el.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

function findParent(
  elements: CanvasElement[],
  id: string,
  parent?: CanvasElement,
): CanvasElement | undefined {
  for (const el of elements) {
    if (el.children?.some((c) => c.id === id)) return el;
    if (el.children?.length) {
      const found = findParent(el.children, id, el);
      if (found) return found;
    }
  }
  return parent;
}

function updateElementInTree(
  elements: CanvasElement[],
  id: string,
  updater: (el: CanvasElement) => Partial<CanvasElement>,
): CanvasElement[] {
  return elements.map((el) => {
    if (el.id === id) return { ...el, ...updater(el) };
    if (el.children?.length)
      return { ...el, children: updateElementInTree(el.children, id, updater) };
    return el;
  });
}

function moveElementInTree(
  elements: CanvasElement[],
  sourceId: string,
  targetParentId?: string,
  targetIndex?: number,
): { elements: CanvasElement[]; moved: boolean } {
  // 1. Find and remove the source element
  const { elements: withoutSource, removed } = findAndRemove(elements, sourceId);
  if (!removed) return { elements, moved: false };

  // 2. Insert into target parent
  if (!targetParentId) {
    // Move to root
    const idx = targetIndex ?? withoutSource.length;
    return {
      elements: [
        ...withoutSource.slice(0, idx),
        removed,
        ...withoutSource.slice(idx),
      ],
      moved: true,
    };
  }

  // Find target parent and insert
  const result = (function insert(
    els: CanvasElement[],
    parentId: string,
    child: CanvasElement,
    index?: number,
  ): CanvasElement[] {
    return els.map((el) => {
      if (el.id === parentId) {
        const siblings = el.children ?? [];
        const idx = index ?? siblings.length;
        return {
          ...el,
          children: [
            ...siblings.slice(0, idx),
            child,
            ...siblings.slice(idx),
          ],
        };
      }
      if (el.children?.length)
        return { ...el, children: insert(el.children, parentId, child, index) };
      return el;
    });
  })(withoutSource, targetParentId, removed, targetIndex);

  return { elements: result, moved: true };
}

function cloneElementTree(el: CanvasElement): CanvasElement {
  return {
    ...el,
    id: generateId(),
    children: el.children?.map(cloneElementTree),
  };
}

// ─── Auto-save / Hydration helpers ────────────────────────────────────────

const AUTOSAVE_DEBOUNCE_MS = 800;
let autosaveTimer: ReturnType<typeof setTimeout> | null = null;

function triggerAutoSave(state: BuilderState) {
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    doAutoSave(state);
  }, AUTOSAVE_DEBOUNCE_MS);
}

function doAutoSave(state: BuilderState) {
  const vscode = getVsCodeApi();
  if (!vscode) {
    // Browser fallback: save to localStorage
    try {
      const snapshot: UILayoutSnapshot = {
        metadata: {
          name: "layoutica-project",
          version: "1.3.0",
          lastUpdated: new Date().toISOString(),
          pageCount: state.pages.length,
          exportMode: state.exportMode,
        },
        data: {
          pages: state.pages,
          savedComponents: state.components,
          designTokens: state.designTokens,
          viewSettings: {
            activePageId: state.activePageId,
            leftSidebarCollapsed: state.leftSidebarCollapsed,
            rightPanelCollapsed: state.rightPanelCollapsed,
          },
        },
      };
      localStorage.setItem("layoutica_ui_layout", JSON.stringify(snapshot));
    } catch {
      // silently fail
    }
    return;
  }

  const snapshot: UILayoutSnapshot = {
    metadata: {
      name: "layoutica-project",
      version: "1.3.0",
      lastUpdated: new Date().toISOString(),
      pageCount: state.pages.length,
      exportMode: state.exportMode,
    },
    data: {
      pages: state.pages,
      savedComponents: state.components,
      designTokens: state.designTokens,
      viewSettings: {
        activePageId: state.activePageId,
        leftSidebarCollapsed: state.leftSidebarCollapsed,
        rightPanelCollapsed: state.rightPanelCollapsed,
      },
    },
  };

  vscode.postMessage({
    type: "saveUILayout",
    payload: {
      json: JSON.stringify(snapshot, null, 2),
      filename: "ui_layout.json",
    },
  });
}

function tryHydrateFromStorage(set: (partial: Partial<BuilderState>) => void): boolean {
  const vscode = getVsCodeApi();
  if (!vscode) {
    try {
      const raw = localStorage.getItem("layoutica_ui_layout");
      if (!raw) return false;
      const snapshot: UILayoutSnapshot = JSON.parse(raw);
      if (!snapshot?.data?.pages?.length) return false;
      applySnapshot(set, snapshot);
      return true;
    } catch {
      return false;
    }
  }
  // VS Code: we'll request on mount via a different channel
  return false;
}

function applySnapshot(set: (partial: Partial<BuilderState>) => void, snapshot: UILayoutSnapshot) {
  set({
    pages: snapshot.data.pages,
    components: snapshot.data.savedComponents ?? [],
    designTokens: snapshot.data.designTokens ?? { colors: [], typography: [] },
    activePageId: snapshot.data.viewSettings?.activePageId ?? snapshot.data.pages[0]?.id ?? "",
    leftSidebarCollapsed: snapshot.data.viewSettings?.leftSidebarCollapsed ?? false,
    rightPanelCollapsed: snapshot.data.viewSettings?.rightPanelCollapsed ?? false,
    exportMode: snapshot.metadata.exportMode ?? "live",
    past: [],
    future: [],
  });
}

// ─── Store ────────────────────────────────────────────────────────────────

export const useBuilderStore = create<BuilderState>()(
  subscribeWithSelector((set, get) => {
    // Attempt hydration on store creation (browser path)
    const hydrated = tryHydrateFromStorage(set);

    // If not hydrated via localStorage, create a default Home page
    const defaultPages: Page[] = [
      {
        id: "page-default-home",
        name: "Home",
        slug: "/",
        role: "page",
        elements: [],
      },
    ];

    return {
      pages: hydrated ? get().pages : defaultPages,
      activePageId: hydrated ? get().activePageId : "page-default-home",
      designTokens: hydrated
        ? get().designTokens
        : { colors: [], typography: [] },
      selectedElementId: null,
      stylingState: "default" as SelectedState,
      selectedElementIds: [],
      hoveredElementId: null,
      editingElementId: null,
      past: [],
      future: [],
      components: hydrated ? get().components : [],
      leftSidebarCollapsed: hydrated ? get().leftSidebarCollapsed : false,
      rightPanelCollapsed: false,

      // Canvas view settings
      canvasBreakpoint: "desktop",
      customWidth: 1440,
      customHeight: 900,
      viewportClip: false,
      canvasBackground: "white" as const,
      showGrid: false,
      showPadding: false,
      showMargin: false,
      exportMode: hydrated ? get().exportMode : null,
      setExportMode: (mode) => {
        set({ exportMode: mode });
        triggerAutoSave(get());
      },

      // ─── Page methods ───────────────────────────────────────────────

      addPage: (name, role = "page") => {
        const { pages, activePageId, past } = get();
        const id = `page-${generateId()}`;
        const slug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "untitled";
        const newPage: Page = {
          id,
          name,
          slug,
          role,
          elements: [],
        };
        set({
          pages: [...pages, newPage],
          activePageId: id,
          past: pushHistory(past, pages, activePageId),
          future: [],
        });
        triggerAutoSave(get());
      },

      deletePage: (id) => {
        const { pages, activePageId, past } = get();
        if (pages.length <= 1) return;
        const newPages = pages.filter((p) => p.id !== id);
        const newActiveId =
          activePageId === id ? newPages[0]?.id ?? "" : activePageId;
        set({
          pages: newPages,
          activePageId: newActiveId,
          past: pushHistory(past, pages, activePageId),
          future: [],
          selectedElementId:
            get().selectedElementId && id === activePageId
              ? null
              : get().selectedElementId,
        });
        triggerAutoSave(get());
      },

      setActivePage: (id) => {
        const { pages, activePageId, past } = get();
        if (id === activePageId) return;
        set({
          activePageId: id,
          selectedElementId: null,
          past: pushHistory(past, pages, activePageId),
          future: [],
        });
      },

      renamePage: (id, name) => {
        const { pages, activePageId, past } = get();
        set({
          pages: pages.map((p) =>
            p.id === id ? { ...p, name } : p,
          ),
          past: pushHistory(past, pages, activePageId),
          future: [],
        });
        triggerAutoSave(get());
      },

      setPageRole: (id, role) => {
        const { pages, activePageId, past } = get();
        set({
          pages: pages.map((p) =>
            p.id === id ? { ...p, role } : p,
          ),
          past: pushHistory(past, pages, activePageId),
          future: [],
        });
        triggerAutoSave(get());
      },

      // ─── Element methods ────────────────────────────────────────────

      addElement: (element, parentId, targetIndex) => {
        const { pages, activePageId, past } = get();
        const newEl: CanvasElement = { ...element, id: `el-${generateId()}` };

        const newPages = pages.map((page) => {
          if (page.id !== activePageId) return page;
          if (!parentId) {
            const elements = [...(page.elements ?? [])];
            const idx = targetIndex ?? elements.length;
            elements.splice(idx, 0, newEl);
            return { ...page, elements };
          }
          return {
            ...page,
            elements: updateElementInTree(page.elements, parentId, (parent) =>
              addChild(parent, newEl, targetIndex),
            ),
          };
        });

        set({
          pages: newPages,
          selectedElementId: newEl.id,
          past: pushHistory(past, pages, activePageId),
          future: [],
        });
        triggerAutoSave(get());
      },

      deleteElement: (id) => {
        const { pages, activePageId, selectedElementId, past } = get();
        const newPages = pages.map((page) => {
          if (page.id !== activePageId) return page;
          const { elements } = findAndRemove(page.elements, id);
          return { ...page, elements };
        });
        set({
          pages: newPages,
          selectedElementId:
            selectedElementId === id ? null : selectedElementId,
          past: pushHistory(past, pages, activePageId),
          future: [],
        });
        triggerAutoSave(get());
      },

      selectElement: (id) => set({ selectedElementId: id }),

      setHoveredElement: (id) => set({ hoveredElementId: id }),

      setEditingElement: (id) => set({ editingElementId: id }),

      setStylingState: (state) => set({ stylingState: state }),

      toggleSelectElement: (id) => {
        const { selectedElementIds } = get();
        set({
          selectedElementIds: selectedElementIds.includes(id)
            ? selectedElementIds.filter((sid) => sid !== id)
            : [...selectedElementIds, id],
        });
      },

      clearSelection: () =>
        set({
          selectedElementId: null,
          selectedElementIds: [],
        }),

      clearCanvas: () => {
        const { pages, activePageId, past } = get();
        const newPages = pages.map((page) => {
          if (page.id !== activePageId) return page;
          return { ...page, elements: [] };
        });
        set({
          pages: newPages,
          selectedElementId: null,
          selectedElementIds: [],
          past: pushHistory(past, pages, activePageId),
          future: [],
        });
        triggerAutoSave(get());
      },

      updateElement: (id, updates, state) => {
        const { pages, activePageId, past } = get();
        const newPages = pages.map((page) => {
          if (page.id !== activePageId) return page;
          return {
            ...page,
            elements: updateElementInTree(page.elements, id, (el) => {
              if (!state || state === "default") return updates;
              const stateKey =
                state === "focus"
                  ? "focusStyles"
                  : state === "hover"
                    ? "hoverStyles"
                    : state === "active"
                      ? "activeStyles"
                      : null;
              if (!stateKey) return updates;
              // Merge with the existing state-specific styles
              const existing = (el as any)[stateKey] ?? {};
              return { [stateKey]: { ...existing, ...updates } };
            }),
          };
        });
        set({
          pages: newPages,
          past: pushHistory(past, pages, activePageId),
          future: [],
        });
        triggerAutoSave(get());
      },

      moveElement: (id, direction) => {
        const { pages, activePageId, past } = get();
        const page = pages.find((p) => p.id === activePageId);
        if (!page) return;

        const parent = findParent(page.elements, id);
        const siblings = parent ? parent.children ?? [] : page.elements;
        const idx = siblings.findIndex((el) => el.id === id);
        if (idx === -1) return;
        if (direction === "up" && idx === 0) return;
        if (direction === "down" && idx === siblings.length - 1) return;
        const newIdx = direction === "up" ? idx - 1 : idx + 1;
        const newSiblings = [...siblings];
        const [moved] = newSiblings.splice(idx, 1);
        newSiblings.splice(newIdx, 0, moved);

        const newPages = pages.map((p) => {
          if (p.id !== activePageId) return p;
          if (!parent) return { ...p, elements: newSiblings };
          return {
            ...p,
            elements: updateElementInTree(p.elements, parent.id, () => ({
              children: newSiblings,
            })),
          };
        });

        set({
          pages: newPages,
          past: pushHistory(past, pages, activePageId),
          future: [],
        });
        triggerAutoSave(get());
      },

      reorderElement: (sourceId, targetParentId, targetIndex) => {
        const { pages, activePageId, past } = get();
        const page = pages.find((p) => p.id === activePageId);
        if (!page) return;

        const { elements, moved } = moveElementInTree(
          page.elements,
          sourceId,
          targetParentId,
          targetIndex,
        );
        if (!moved) return;

        const newPages = pages.map((p) => {
          if (p.id !== activePageId) return p;
          return { ...p, elements };
        });

        set({
          pages: newPages,
          past: pushHistory(past, pages, activePageId),
          future: [],
        });
        triggerAutoSave(get());
      },

      duplicateElement: (id) => {
        const { pages, activePageId, past } = get();
        const page = pages.find((p) => p.id === activePageId);
        if (!page) return;

        const el = findElement(page.elements, id);
        if (!el) return;

        const clone = cloneElementTree(el);
        clone.metadata = {
          ...clone.metadata,
          name: clone.metadata?.name
            ? `${clone.metadata.name} (copy)`
            : undefined,
        };

        const parent = findParent(page.elements, id);
        const siblings = parent ? parent.children ?? [] : page.elements;
        const idx = siblings.findIndex((s) => s.id === id);

        const newPages = pages.map((p) => {
          if (p.id !== activePageId) return p;
          if (!parent) {
            const elements = [...p.elements];
            elements.splice(idx + 1, 0, clone);
            return { ...p, elements };
          }
          return {
            ...p,
            elements: updateElementInTree(p.elements, parent.id, (par) => {
              const children = [...(par.children ?? [])];
              children.splice(idx + 1, 0, clone);
              return { children };
            }),
          };
        });

        set({
          pages: newPages,
          selectedElementId: clone.id,
          past: pushHistory(past, pages, activePageId),
          future: [],
        });
        triggerAutoSave(get());
      },

      loadProject: (pages, components, designTokens) => {
        set({
          pages,
          components,
          designTokens,
          activePageId: pages[0]?.id ?? "",
          selectedElementId: null,
          selectedElementIds: [],
          past: [],
          future: [],
        });
        triggerAutoSave(get());
      },

      setDesignTokens: (tokens) => {
        set({ designTokens: tokens });
        triggerAutoSave(get());
      },

      // ─── Undo / Redo ────────────────────────────────────────────────

      undo: () => {
        const { past, pages, activePageId, future } = get();
        if (past.length === 0) return;
        const previous = past[past.length - 1];
        const newPast = past.slice(0, -1);
        set({
          pages: previous.pages,
          activePageId: previous.activePageId,
          past: newPast,
          future: [
            ...future,
            { pages: structuredClone(pages), activePageId },
          ].slice(0, MAX_HISTORY),
        });
        triggerAutoSave(get());
      },

      redo: () => {
        const { past, pages, activePageId, future } = get();
        if (future.length === 0) return;
        const next = future[future.length - 1];
        const newFuture = future.slice(0, -1);
        set({
          pages: next.pages,
          activePageId: next.activePageId,
          past: [
            ...past,
            { pages: structuredClone(pages), activePageId },
          ].slice(-MAX_HISTORY),
          future: newFuture,
        });
        triggerAutoSave(get());
      },

      canUndo: () => get().past.length > 0,
      canRedo: () => get().future.length > 0,

      // ─── Saved Components ───────────────────────────────────────────

      saveComponent: (name, element) => {
        const { components } = get();
        const newComp: SavedComponent = {
          id: `comp-${generateId()}`,
          name,
          element: structuredClone(element),
          createdAt: Date.now(),
        };
        set({ components: [...components, newComp] });
        triggerAutoSave(get());
      },

      deleteComponent: (id) => {
        set((s) => ({
          components: s.components.filter((c) => c.id !== id),
        }));
        triggerAutoSave(get());
      },

      renameComponent: (id, name) => {
        set((s) => ({
          components: s.components.map((c) =>
            c.id === id ? { ...c, name } : c,
          ),
        }));
        triggerAutoSave(get());
      },

      insertComponent: (componentId, parentId, targetIndex) => {
        const { components } = get();
        const comp = components.find((c) => c.id === componentId);
        if (!comp) return;
        const cloned = cloneElementTree(comp.element);
        // Set name from component metadata
        cloned.metadata = {
          ...cloned.metadata,
          name: comp.name,
        };
        get().addElement(
          cloned,
          parentId,
          targetIndex,
        );
      },

      // ─── Queries ────────────────────────────────────────────────────

      getActivePage: () => {
        const { pages, activePageId } = get();
        return pages.find((p) => p.id === activePageId);
      },

      getSelectedElement: () => {
        const { pages, activePageId, selectedElementId } = get();
        if (!selectedElementId) return undefined;
        const page = pages.find((p) => p.id === activePageId);
        if (!page) return undefined;
        return findElement(page.elements, selectedElementId);
      },

      // ─── UI State ───────────────────────────────────────────────────

      setLeftSidebarCollapsed: (v) => {
        set({ leftSidebarCollapsed: v });
        triggerAutoSave(get());
      },
      setRightPanelCollapsed: (v) => {
        set({ rightPanelCollapsed: v });
        triggerAutoSave(get());
      },

      setCanvasBreakpoint: (v) => set({ canvasBreakpoint: v }),
      setCustomWidth: (w) => set({ customWidth: w }),
      setCustomHeight: (h) => set({ customHeight: h }),
      setViewportClip: (clip) => set({ viewportClip: clip }),
      setCanvasBackground: (v) => set({ canvasBackground: v }),
      setShowGrid: (v) => set({ showGrid: v }),
      setShowPadding: (v) => set({ showPadding: v }),
      setShowMargin: (v) => set({ showMargin: v }),
    };
  }),
);