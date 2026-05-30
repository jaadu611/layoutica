import { create } from "zustand";
import { WorkspaceState, Breadcrumb, WorkspaceNode, NodeMetadata } from "./types";

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  activeFolderId: null,
  breadcrumbStack: [],
  pinnedNodes: [],
  fileGraph: {},
  highlightedNodeId: null,
  physicalWires: [],
  antennaLinks: [],
  antennaMenuNodeId: null,
  
  setActiveFolder: (id: string | null) => set({ activeFolderId: id }),
  
  setBreadcrumbStack: (stack: Breadcrumb[]) => set({ breadcrumbStack: stack }),
  
  setPinnedNodes: (pinned: string[]) => set({ pinnedNodes: pinned }),
  
  setFileGraph: (graph: Record<string, WorkspaceNode>) => set({ fileGraph: graph }),
  
  setHighlightedNodeId: (id: string | null) => set({ highlightedNodeId: id }),

  navigateToFolder: (folderId: string | null) => {
    const { fileGraph } = get();
    const newBreadcrumbStack: Breadcrumb[] = [];
    
    let currentId = folderId;
    while (currentId && fileGraph[currentId]) {
      const node = fileGraph[currentId];
      newBreadcrumbStack.unshift({ id: node.id, name: node.name || node.id });
      currentId = node.parentId;
    }
    
    set({
      activeFolderId: folderId,
      breadcrumbStack: newBreadcrumbStack,
    });
  },

  executeGlobalSearch: (query: string) => {
    const { fileGraph, navigateToFolder } = get();
    
    const targetNode = Object.values(fileGraph).find((node) => 
      node.name?.toLowerCase().includes(query.toLowerCase()) ||
      node.id.toLowerCase().includes(query.toLowerCase())
    );
    
    if (targetNode) {
      navigateToFolder(targetNode.parentId);
      set({ highlightedNodeId: targetNode.id });
      
      setTimeout(() => {
        if (get().highlightedNodeId === targetNode.id) {
          set({ highlightedNodeId: null });
        }
      }, 3000);
    }
  },

  pinNodeToDock: (nodeId: string) => {
    const { pinnedNodes } = get();
    if (!pinnedNodes.includes(nodeId)) {
      set({ pinnedNodes: [...pinnedNodes, nodeId] });
    }
  },

  evaluateConnectionType: (sourceId: string, targetId: string) => {
    const { fileGraph, renderPhysicalWire, registerAntennaLink } = get();
    const sourceNode = fileGraph[sourceId];
    const targetNode = fileGraph[targetId];

    if (!sourceNode || !targetNode) return;

    if (sourceNode.parentId === targetNode.parentId) {
      renderPhysicalWire(sourceId, targetId);
    } else {
      registerAntennaLink(sourceId, targetId);
    }
  },

  renderPhysicalWire: (sourceId: string, targetId: string) => {
    set((state) => ({
      physicalWires: [...state.physicalWires, { sourceId, targetId }],
    }));
  },

  registerAntennaLink: (sourceId: string, targetId: string) => {
    set((state) => {
      const fileGraph = { ...state.fileGraph };
      
      const sourceNode = fileGraph[sourceId];
      if (sourceNode) {
        fileGraph[sourceId] = {
          ...sourceNode,
          connections: [...(sourceNode.connections || []), { sourceId, targetId, type: "export" }]
        };
      }
      
      const targetNode = fileGraph[targetId];
      if (targetNode) {
        fileGraph[targetId] = {
          ...targetNode,
          connections: [...(targetNode.connections || []), { sourceId, targetId, type: "import" }]
        };
      }

      return {
        antennaLinks: [...state.antennaLinks, { sourceId, targetId }],
        fileGraph,
      };
    });
  },

  openAntennaMenu: (nodeId: string | null) => {
    set({ antennaMenuNodeId: nodeId });
  },

  triggerPortalWarp: (targetId: string) => {
    const { fileGraph, navigateToFolder, setHighlightedNodeId } = get();
    const targetNode = fileGraph[targetId];
    if (targetNode) {
      navigateToFolder(targetNode.parentId);
      setHighlightedNodeId(targetId);
      
      setTimeout(() => {
        if (get().highlightedNodeId === targetId) {
          set({ highlightedNodeId: null });
        }
      }, 3000);
    }
  },

  updateNodeMetadata: (nodeId: string, payload: Partial<NodeMetadata>) => {
    set((state) => {
      const node = state.fileGraph[nodeId];
      if (!node) return state;

      return {
        fileGraph: {
          ...state.fileGraph,
          [nodeId]: {
            ...node,
            metadata: { ...(node.metadata || {}), ...payload },
          }
        }
      };
    });
  },

  validateNodeCompleteness: (nodeId: string) => {
    const { fileGraph } = get();
    const node = fileGraph[nodeId];
    if (!node) return false;
    
    if (!node.metadata) return false;
    if (!node.metadata.description || node.metadata.description.trim() === "") return false;
    
    return true;
  },

  calculateNodeTiers: () => {
    const { fileGraph } = get();
    const tiers: Record<string, number> = {};
    const nodes = Object.values(fileGraph).filter((n): n is WorkspaceNode => n.type === "file");
    
    const adj: Record<string, string[]> = {};
    nodes.forEach(n => {
      adj[n.id] = (n.connections || []).filter(c => c.type === "import").map(c => c.sourceId);
    });

    let changed = true;
    let iterationCount = 0;
    
    while (changed && iterationCount < nodes.length + 1) {
      changed = false;
      iterationCount++;
      
      for (const node of nodes) {
        const id = node.id;
        const imports = adj[id] || [];
        
        let targetTier = 3;
        
        if (imports.length > 0) {
          let minImportTier = 3;
          for (const depId of imports) {
            if (tiers[depId] !== undefined) {
              minImportTier = Math.min(minImportTier, tiers[depId]);
            } else {
              minImportTier = 0; 
            }
          }
          
          if (minImportTier > 0) {
            targetTier = minImportTier - 1;
          } else {
            targetTier = 0;
          }
        }
        
        if (targetTier > 0 && tiers[id] !== targetTier) {
          tiers[id] = targetTier;
          changed = true;
        }
      }
    }
    
    if (iterationCount > nodes.length && nodes.some(n => tiers[n.id] === undefined || tiers[n.id] === 0)) {
      throw new Error("Circular dependency detected in fileGraph");
    }

    return tiers;
  },

  compileProjectJSON: () => {
    const { fileGraph, calculateNodeTiers } = get();
    const tiers = calculateNodeTiers();
    const nodes = Object.values(fileGraph).filter((n): n is WorkspaceNode => n.type === "file");
    
    const sortedNodes = nodes.sort((a, b) => (tiers[b.id] || 3) - (tiers[a.id] || 3));
    
    const payload = sortedNodes.map(node => ({
      id: node.id,
      name: node.name,
      tier: tiers[node.id],
      metadata: node.metadata,
      connections: node.connections || []
    }));

    return {
      version: "1.0.0",
      compiledAt: new Date().toISOString(),
      nodes: payload
    };
  },
}));
