import { create } from "zustand";
import { BackendState, BackendFileNode } from "./types";
import { getVsCodeApi } from "../frontend/vscode";

const generateId = () => Math.random().toString(36).substring(2, 11);

const MAX_HISTORY = 50;

const syncToHost = (state: BackendState) => {
  const vscode = getVsCodeApi();
  if (!vscode) return;

  const nodesWithConnections = state.nodes.map(node => {
    // Determine imports (incoming connections)
    const imports = state.connections
      .filter(c => c.targetId === node.id)
      .map(c => {
        const source = state.nodes.find(n => n.id === c.sourceId);
        return source ? `/${source.path ? source.path + '/' : ''}${source.name}.${source.extension}` : null;
      }).filter(Boolean);
      
    // Determine exports (outgoing connections)
    const exports = state.connections
      .filter(c => c.sourceId === node.id)
      .map(c => {
        const target = state.nodes.find(n => n.id === c.targetId);
        return target ? `/${target.path ? target.path + '/' : ''}${target.name}.${target.extension}` : null;
      }).filter(Boolean);

    return {
      ...node,
      imports,
      exports
    };
  });

  vscode.postMessage({
    type: "syncBackendState",
    payload: { nodes: nodesWithConnections },
  });
};

const syncLayoutToHost = (state: BackendState) => {
  const vscode = getVsCodeApi();
  if (!vscode) return;
  vscode.postMessage({
    type: "syncLayoutState",
    payload: {
      nodes: state.nodes,
      connections: state.connections,
      pinnedNodes: state.pinnedNodes,
      activeGhostNodes: state.activeGhostNodes,
    },
  });
};

export const useBackendStore = create<BackendState>((set, get) => ({
  nodes: [],
  selectedNodeId: null,
  mode: "frontend",
  past: [],
  future: [],
  undoable: false,
  redoable: false,
  activeFolderPath: "src",
  connections: [],
  pinnedNodes: [],
  activeGhostNodes: [],
  antennaMenuNodeId: null,

  togglePinnedNode: (id) => {
    const { nodes, activeFolderPath } = get();
    const node = nodes.find(n => n.id === id);
    const isGhost = node && node.path !== activeFolderPath;

    set((state) => {
      const isCurrentlyPinned = state.pinnedNodes.includes(id);
      const nextPinned = isCurrentlyPinned
        ? state.pinnedNodes.filter(n => n !== id)
        : [...state.pinnedNodes, id];
        
      let nextGhost = state.activeGhostNodes;
      if (isGhost && isCurrentlyPinned) {
        nextGhost = state.activeGhostNodes.filter(n => n !== id);
      }

      return {
        pinnedNodes: nextPinned,
        activeGhostNodes: nextGhost
      };
    });
    syncLayoutToHost(get());
  },

  toggleGhostNode: (id) => {
    set((state) => ({
      activeGhostNodes: state.activeGhostNodes.includes(id)
        ? state.activeGhostNodes.filter(n => n !== id)
        : [...state.activeGhostNodes, id]
    }));
    syncLayoutToHost(get());
  },

  openAntennaMenu: (id) => set({ antennaMenuNodeId: id }),

  syncFileChanges: (nodeId, description, imports, exports) => {
    const { nodes, connections, past } = get();
    const newNodes = nodes.map(n => n.id === nodeId ? { ...n, description } : n);
    const getNodeFormattedPath = (n: BackendFileNode) => {
      const ext = n.extension || "ts";
      let filename = n.name;
      if (!filename.endsWith(`.${ext}`)) filename = `${filename}.${ext}`;
      const p = n.path ? `${n.path}/${filename}` : filename;
      return '/' + p.replace(/\\/g, '/').replace(/^\/+/, '');
    };
    const otherConns = connections.filter(c => c.sourceId !== nodeId && c.targetId !== nodeId);
    const newConnections = [...otherConns];
    imports.forEach(impPath => {
      const importNode = nodes.find(n => getNodeFormattedPath(n) === impPath);
      if (importNode) {
        newConnections.push({
          id: `conn-${Math.random().toString(36).substring(2, 11)}`,
          sourceId: importNode.id,
          targetId: nodeId,
          type: "import"
        });
      }
    });
    exports.forEach(expPath => {
      const exportNode = nodes.find(n => getNodeFormattedPath(n) === expPath);
      if (exportNode) {
        newConnections.push({
          id: `conn-${Math.random().toString(36).substring(2, 11)}`,
          sourceId: nodeId,
          targetId: exportNode.id,
          type: "export"
        });
      }
    });
    const newPast = [...past, nodes].slice(-MAX_HISTORY);
    set({
      nodes: newNodes,
      connections: newConnections,
      past: newPast,
      future: [],
      undoable: true,
      redoable: false
    });
    syncToHost(get());
    syncLayoutToHost(get());
  },

  undo: () => {
    const { past, nodes, future } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);
    
    set({
      nodes: previous,
      past: newPast,
      future: [nodes, ...future].slice(0, MAX_HISTORY),
      undoable: newPast.length > 0,
      redoable: true,
    });
    
    syncToHost(get());
  },

  redo: () => {
    const { past, nodes, future } = get();
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    
    set({
      nodes: next,
      past: [...past, nodes].slice(-MAX_HISTORY),
      future: newFuture,
      undoable: true,
      redoable: newFuture.length > 0,
    });
    
    syncToHost(get());
  },

  setMode: (mode) => set({ mode }),

  navigateToFolder: (path) => set({ activeFolderPath: path }),

  addConnection: (sourceId, targetId, type = "import") => {
    const { connections } = get();

    if (sourceId === targetId) return;

    const alreadyExists = connections.some(
      (c) => c.sourceId === sourceId && c.targetId === targetId
    );
    if (alreadyExists) return;

    const wouldCreateCycle = (() => {
      const visited = new Set<string>();
      const stack = [targetId];
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (current === sourceId) return true;
        if (visited.has(current)) continue;
        visited.add(current);
        connections
          .filter((c) => c.sourceId === current)
          .forEach((c) => stack.push(c.targetId));
      }
      return false;
    })();

    if (wouldCreateCycle) return;

    set((state) => ({
      connections: [...state.connections, { id: `conn-${generateId()}`, sourceId, targetId, type }],
    }));
    syncToHost(get());
    syncLayoutToHost(get());
  },

  removeConnection: (id) => {
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== id),
    }));
    syncToHost(get());
    syncLayoutToHost(get());
  },

  addNode: (nodeData) => {
    const id = `node-${generateId()}`;
    const newNode: BackendFileNode = {
      ...nodeData,
      id,
      path: get().activeFolderPath, // Default to current folder if not explicitly set
    };
    if (nodeData.path) {
      newNode.path = nodeData.path;
    }
    const { nodes, past } = get();
    const newNodes = [...nodes, newNode];
    const newPast = [...past, nodes].slice(-MAX_HISTORY);

    set({ 
      nodes: newNodes, 
      selectedNodeId: id,
      past: newPast,
      future: [],
      undoable: true,
      redoable: false,
    });

    syncToHost(get());
    syncLayoutToHost(get());
    return id;
  },

  updateNode: (id, updates) => {
    const { nodes, past, navigateToFolder } = get();
    let shouldNavigate = false;
    let newPath = "";

    const newNodes = nodes.map((n) => {
      if (n.id === id) {
        if (updates.path !== undefined && updates.path !== n.path) {
          shouldNavigate = true;
          newPath = updates.path;
        }
        return { ...n, ...updates };
      }
      return n;
    });

    const isImportantUpdate = Object.keys(updates).some(
      (k) => k !== "x" && k !== "y" && k !== "isExpanded"
    );

    if (isImportantUpdate) {
      const newPast = [...past, nodes].slice(-MAX_HISTORY);
      set({ 
        nodes: newNodes,
        past: newPast,
        future: [],
        undoable: true,
        redoable: false,
      });
    } else {
      set({ nodes: newNodes });
    }

    if (shouldNavigate) {
      navigateToFolder(newPath);
    }

    syncToHost(get());
    syncLayoutToHost(get());
  },

  deleteNode: (id) => {
    const { nodes, past, selectedNodeId, connections } = get();
    const newNodes = nodes.filter((n) => n.id !== id);
    const newConnections = connections.filter((c) => c.sourceId !== id && c.targetId !== id);
    const newPast = [...past, nodes].slice(-MAX_HISTORY);

    set({
      nodes: newNodes,
      connections: newConnections,
      selectedNodeId: selectedNodeId === id ? null : selectedNodeId,
      past: newPast,
      future: [],
      undoable: true,
      redoable: false,
    });

    syncToHost(get());
    syncLayoutToHost(get());
  },

  duplicateNode: (id) => {
    const { nodes, past } = get();
    const source = nodes.find((n) => n.id === id);
    if (!source) return;
    const newId = `node-${Math.random().toString(36).substring(2, 11)}`;
    const duplicate: BackendFileNode = {
      ...source,
      id: newId,
      name: `${source.name}_copy`,
      x: source.x + 40,
      y: source.y + 40,
      isExpanded: false,
    };
    const newNodes = [...nodes, duplicate];
    const newPast = [...past, nodes].slice(-MAX_HISTORY);
    set({
      nodes: newNodes,
      selectedNodeId: newId,
      past: newPast,
      future: [],
      undoable: true,
      redoable: false,
    });
    syncToHost(get());
    syncLayoutToHost(get());
  },

  selectNode: (id) => set({ selectedNodeId: id }),

  setNodes: (nodes) => set({ nodes }),

  organizeWorkspaceGrid: () => {
    const { nodes, activeFolderPath, updateNode, activeGhostNodes, connections } = get();
    const activeNodes = nodes.filter(n => n.path === activeFolderPath);
    if (activeNodes.length === 0) return;

    // Build undirected adjacency list for grouping connected nodes
    const adj = new Map<string, string[]>();
    const nodeMap = new Map<string, BackendFileNode>();

    activeNodes.forEach(n => {
      adj.set(n.id, []);
      nodeMap.set(n.id, n);
    });

    connections.forEach(c => {
      if (adj.has(c.sourceId) && adj.has(c.targetId)) {
        adj.get(c.sourceId)!.push(c.targetId);
        adj.get(c.targetId)!.push(c.sourceId);
      }
    });

    // BFS to find connected components and order nodes within them
    const visited = new Set<string>();
    const orderedNodeIds: string[] = [];

    activeNodes.forEach(node => {
      if (!visited.has(node.id)) {
        const queue: string[] = [node.id];
        visited.add(node.id);
        while (queue.length > 0) {
          const curr = queue.shift()!;
          orderedNodeIds.push(curr);
          const neighbors = adj.get(curr) || [];
          neighbors.forEach(neighbor => {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push(neighbor);
            }
          });
        }
      }
    });

    // Lay out nodes in a 3-column row-major grid
    const COLS = 3;
    let currentY = 40;
    let rowHeight = 0;

    orderedNodeIds.forEach((nodeId, idx) => {
      const node = nodeMap.get(nodeId);
      if (!node) return;

      const col = idx % COLS;
      if (col === 0 && idx > 0) {
        currentY += rowHeight + 48; // Spaced 48px vertical row gap
        rowHeight = 0;
      }

      const nodeX = 40 + col * (280 + 40); // 280px node width + 40px column gap
      const nodeHeight = node.isExpanded ? 340 : 90;
      rowHeight = Math.max(rowHeight, nodeHeight);

      updateNode(node.id, {
        x: nodeX,
        y: currentY
      });
    });

    // Calculate currentX for virtual folders as column 3 (to the right of grid)
    const currentX = 40 + COLS * 320; // COLS * (280 + 40)

    // Arrange virtual folders at the very end as a clean sidebar/column
    const vfMap = new Map<string, { id: string, name: string, x: number, y: number, count: number }>();
    nodes.forEach(node => {
      if (!activeGhostNodes.includes(node.id) && node.path.startsWith(activeFolderPath ? activeFolderPath + "/" : "") && node.path !== activeFolderPath) {
        const remainingPath = activeFolderPath ? node.path.slice(activeFolderPath.length + 1) : node.path;
        const parts = remainingPath.slice(0).split("/");
        const folderName = parts[0];
        const existing = vfMap.get(folderName);
        if (!existing) {
          vfMap.set(folderName, { id: `folder-${folderName}`, name: folderName, x: node.x, y: node.y, count: 1 });
        } else {
          existing.count += 1;
        }
      }
    });
    const virtualFolders = Array.from(vfMap.values());

    let folderY = 40;
    virtualFolders.forEach(folder => {
      const prefix = activeFolderPath ? `${activeFolderPath}/${folder.name}` : folder.name;
      const folderNodes = nodes.filter(n => n.path === prefix || n.path.startsWith(prefix + "/"));
      const folderDx = currentX - folder.x;
      const folderDy = folderY - folder.y;
      folderNodes.forEach(fn => {
        updateNode(fn.id, {
          x: fn.x + folderDx,
          y: fn.y + folderDy
        });
      });
      folderY += 72; // Compact folders height spacing (folder height ~52px + 20px gap)
    });
  },

  sync: () => {
    syncToHost(get());
    syncLayoutToHost(get());
  },
}));
