export type NodeType = "folder" | "file";

export interface NodeMetadata {
  description?: string;
  params?: any[];
  returnBlocks?: any[];
  [key: string]: any;
}

export interface NodeConnection {
  sourceId: string;
  targetId: string;
  type: "import" | "export";
}

export interface WorkspaceNode {
  id: string;
  parentId: string | null;
  type: NodeType;
  metadata: NodeMetadata;
  connections: NodeConnection[];
  name?: string;
}

export interface Breadcrumb {
  id: string;
  name: string;
}

export interface WorkspaceState {
  activeFolderId: string | null;
  breadcrumbStack: Breadcrumb[];
  pinnedNodes: string[];
  fileGraph: Record<string, WorkspaceNode>;
  highlightedNodeId: string | null;
  physicalWires: Array<{ sourceId: string; targetId: string }>;
  antennaLinks: Array<{ sourceId: string; targetId: string }>;
  antennaMenuNodeId: string | null;
  
  setActiveFolder: (id: string | null) => void;
  setBreadcrumbStack: (stack: Breadcrumb[]) => void;
  setPinnedNodes: (pinned: string[]) => void;
  setFileGraph: (graph: Record<string, WorkspaceNode>) => void;
  setHighlightedNodeId: (id: string | null) => void;

  navigateToFolder: (folderId: string | null) => void;
  executeGlobalSearch: (query: string) => void;
  pinNodeToDock: (nodeId: string) => void;

  evaluateConnectionType: (sourceId: string, targetId: string) => void;
  renderPhysicalWire: (sourceId: string, targetId: string) => void;
  registerAntennaLink: (sourceId: string, targetId: string) => void;

  openAntennaMenu: (nodeId: string | null) => void;
  triggerPortalWarp: (targetId: string) => void;

  updateNodeMetadata: (nodeId: string, payload: Partial<NodeMetadata>) => void;
  validateNodeCompleteness: (nodeId: string) => boolean;

  calculateNodeTiers: () => Record<string, number>;
  compileProjectJSON: () => any;
}
