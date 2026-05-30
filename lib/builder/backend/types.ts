export interface BackendFileNode {
  id: string;
  name: string;
  path: string;
  extension: "ts";
  description: string;
  x: number;
  y: number;
  isExpanded?: boolean;
  color?: string;
  parameters?: string;
  returnBlocks?: string;
}

export interface NodeConnection {
  id: string;
  sourceId: string;
  targetId: string;
  type: "import" | "export";
}

export interface BackendState {
  nodes: BackendFileNode[];
  connections: NodeConnection[];
  activeFolderPath: string;
  selectedNodeId: string | null;
  pinnedNodes: string[];
  activeGhostNodes: string[];
  antennaMenuNodeId: string | null;
  mode: "frontend" | "backend";
  setMode: (mode: "frontend" | "backend") => void;
  addNode: (node: Omit<BackendFileNode, "id">) => string;
  updateNode: (id: string, updates: Partial<BackendFileNode>) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  setNodes: (nodes: BackendFileNode[]) => void;
  past: BackendFileNode[][];
  future: BackendFileNode[][];
  undo: () => void;
  redo: () => void;
  undoable: boolean;
  redoable: boolean;
  
  navigateToFolder: (path: string) => void;
  addConnection: (sourceId: string, targetId: string, type?: "import" | "export") => void;
  removeConnection: (id: string) => void;
  togglePinnedNode: (id: string) => void;
  toggleGhostNode: (id: string) => void;
  openAntennaMenu: (id: string | null) => void;
  syncFileChanges: (nodeId: string, description: string, imports: string[], exports: string[]) => void;
  sync: () => void;
}
