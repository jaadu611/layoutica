"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useBackendStore } from "@/lib/builder/backend/store";
import { useBuilderStore } from "@/lib/builder/frontend/store";
import { BackendFileNode } from "@/lib/builder/backend/types";
import { getVsCodeApi } from "@/lib/builder/frontend/vscode";
import {
  FileCode,
  Trash2,
  Folder,
  FileText,
  ChevronDown,
  ChevronUp,
  Database,
  Plus,
  Minus,
  Layers,
  Route,
  ArrowLeftRight,
  ArrowRight,
  ArrowLeft,
  Shield,
  Settings,
  RadioTower,
  Home,
  Search,
  Pin,
  X,
  Link as LinkIcon,
  ChevronRight,
  Ghost,
  CopyPlus,
  Palette,
  Maximize2,
  AlertTriangle
} from "lucide-react";

export default function BackendCanvas() {
  const { 
    nodes, 
    selectedNodeId, 
    addNode, 
    updateNode, 
    deleteNode,
    duplicateNode,
    selectNode,
    activeFolderPath,
    navigateToFolder,
    connections,
    addConnection,
    removeConnection,
    pinnedNodes,
    togglePinnedNode,
    activeGhostNodes,
    toggleGhostNode,
    antennaMenuNodeId,
    openAntennaMenu,
    organizeWorkspaceGrid,
    sync
  } = useBackendStore();
  
  const { showGrid } = useBuilderStore();

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  
  // Pan and Zoom state
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragStartPanRef = useRef({ x: 0, y: 0 });

  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  const [hoveredConnId, setHoveredConnId] = useState<string | null>(null);
  const [isOrphanPanelOpen, setIsOrphanPanelOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId?: string; folderName?: string } | null>(null);
  const [colorPickerState, setColorPickerState] = useState<{ nodeId: string; x: number; y: number } | null>(null);

  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  
  const [connectionSearchQuery, setConnectionSearchQuery] = useState("");
  const [connectionSearchNodeId, setConnectionSearchNodeId] = useState<string | null>(null);
  const [connectionSearchPos, setConnectionSearchPos] = useState({ x: 0, y: 0 });

  const [antennaSearchQuery, setAntennaSearchQuery] = useState("");

  const [clipboard, setClipboard] = useState<{
    action: 'copy' | 'cut';
    itemType: 'file' | 'folder';
    itemId: string;
    name: string;
  } | null>(null);

  const deleteFolder = useCallback((folderName: string) => {
    const prefix = activeFolderPath ? `${activeFolderPath}/${folderName}` : folderName;
    const targets = nodes.filter(n => n.path === prefix || n.path.startsWith(prefix + "/"));
    targets.forEach(t => deleteNode(t.id));
  }, [nodes, activeFolderPath, deleteNode]);

  const duplicateFolder = useCallback((folderName: string) => {
    const prefix = activeFolderPath ? `${activeFolderPath}/${folderName}` : folderName;
    const folderNodes = nodes.filter(n => n.path === prefix || n.path.startsWith(prefix + "/"));
    
    let index = 1;
    let newFolderName = `${folderName}_copy`;
    const folderExists = () => {
      const checkPrefix = activeFolderPath ? `${activeFolderPath}/${newFolderName}` : newFolderName;
      return nodes.some(n => n.path === checkPrefix || n.path.startsWith(checkPrefix + "/"));
    };
    while (folderExists()) {
      index++;
      newFolderName = `${folderName}_copy_${index}`;
    }
    const newPrefix = activeFolderPath ? `${activeFolderPath}/${newFolderName}` : newFolderName;

    folderNodes.forEach(node => {
      const relativePath = node.path.slice(prefix.length);
      const computedPath = newPrefix + relativePath;
      const { id, ...cleanNode } = node;
      addNode({
        ...cleanNode,
        path: computedPath,
        x: node.x + 40,
        y: node.y + 40,
        isExpanded: false
      });
    });
  }, [nodes, activeFolderPath, addNode]);

  const handlePaste = useCallback(() => {
    if (!clipboard) return;
    const { action, itemType, itemId, name } = clipboard;

    if (itemType === 'file') {
      const sourceNode = nodes.find(n => n.id === itemId);
      if (!sourceNode) return;

      if (action === 'cut') {
        updateNode(sourceNode.id, { path: activeFolderPath });
        setClipboard(null);
      } else {
        let newName = sourceNode.name;
        let index = 1;
        while (nodes.some(n => n.path === activeFolderPath && n.name === (index === 1 ? newName : `${newName}_${index}`))) {
          index++;
        }
        const finalName = index === 1 ? newName : `${newName}_${index}`;
        const { id, ...cleanNode } = sourceNode;
        addNode({
          ...cleanNode,
          name: finalName,
          path: activeFolderPath,
          x: sourceNode.x + 40,
          y: sourceNode.y + 40,
          isExpanded: false
        });
      }
    } else if (itemType === 'folder') {
      const folderNodes = nodes.filter(n => n.path === itemId || n.path.startsWith(itemId + "/"));
      
      if (action === 'cut') {
        getVsCodeApi()?.postMessage({
          type: "renameFolder",
          payload: { oldName: name, activeFolderPath: activeFolderPath }
        });
        const newPrefix = activeFolderPath ? `${activeFolderPath}/${name}` : name;
        const updatedNodes = nodes.map(n => {
          if (n.path === itemId) {
            return { ...n, path: newPrefix };
          } else if (n.path.startsWith(itemId + "/")) {
            return { ...n, path: newPrefix + n.path.slice(itemId.length) };
          }
          return n;
        });
        updatedNodes.forEach(n => {
          if (n.path !== nodes.find(orig => orig.id === n.id)?.path) {
            updateNode(n.id, { path: n.path });
          }
        });
        setClipboard(null);
      } else {
        let newFolderName = name;
        let index = 1;
        const oldPrefix = itemId;
        const folderExists = () => {
          const checkPrefix = activeFolderPath ? `${activeFolderPath}/${newFolderName}` : newFolderName;
          return nodes.some(n => n.path === checkPrefix || n.path.startsWith(checkPrefix + "/"));
        };
        while (folderExists()) {
          index++;
          newFolderName = `${name}_${index}`;
        }
        const newPrefix = activeFolderPath ? `${activeFolderPath}/${newFolderName}` : newFolderName;

        folderNodes.forEach(node => {
          const relativePath = node.path.slice(oldPrefix.length);
          const computedPath = newPrefix + relativePath;
          const { id, ...cleanNode } = node;
          addNode({
            ...cleanNode,
            path: computedPath,
            x: node.x + 40,
            y: node.y + 40,
            isExpanded: false
          });
        });
      }
    }
  }, [clipboard, nodes, activeFolderPath, updateNode, addNode]);

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);

  const handleFolderMouseDown = (e: React.MouseEvent, folder: { id: string, name: string, x: number, y: number }) => {
    const target = e.target as HTMLElement;
    if (target.closest(".action-button")) return;

    e.preventDefault();
    e.stopPropagation();
    
    setSelectedFolderId(folder.id);
    selectNode(null);
    setDraggedFolderId(folder.id);

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;

    const prefix = activeFolderPath ? `${activeFolderPath}/${folder.name}` : folder.name;
    const folderNodes = nodes.filter(n => n.path === prefix || n.path.startsWith(prefix + "/"));
    const initialPositions = folderNodes.map(n => ({ id: n.id, x: n.x, y: n.y }));

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startMouseX) / zoom;
      const dy = (moveEvent.clientY - startMouseY) / zoom;

      initialPositions.forEach(pos => {
        updateNode(pos.id, {
          x: pos.x + dx,
          y: pos.y + dy,
        });
      });
    };

    const handleMouseUp = () => {
      setDraggedFolderId(null);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Wheel Panning & Zooming
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      const container = canvasContainerRef.current;
      if (!container) return;

      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (e.ctrlKey) {
        const zoomFactor = 1.05;
        const direction = e.deltaY < 0 ? 1 : -1;
        const factor = direction > 0 ? zoomFactor : 1 / zoomFactor;
        const nextZoom = Math.min(Math.max(zoom * factor, 0.15), 4.0);
        const dx = mouseX - pan.x;
        const dy = mouseY - pan.y;

        setPan({
          x: mouseX - dx * (nextZoom / zoom),
          y: mouseY - dy * (nextZoom / zoom),
        });
        setZoom(nextZoom);
      } else {
        setPan((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    },
    [zoom, pan]
  );

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [handleWheel]);

  // Spacebar pan trigger state
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const isLeftClickOnEmptySpace = e.button === 0 && e.target === e.currentTarget;
    const isMiddleClick = e.button === 1;
    const shouldPan = isSpacePressed || isMiddleClick || isLeftClickOnEmptySpace;

    if (shouldPan) {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingPan(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      dragStartPanRef.current = { ...pan };
      selectNode(null);
      setSelectedFolderId(null);
    } else {
      if (isGlobalSearchOpen) setIsGlobalSearchOpen(false);
      if (connectionSearchNodeId) setConnectionSearchNodeId(null);
      if (antennaMenuNodeId) openAntennaMenu(null);
      if (contextMenu) setContextMenu(null);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingPan) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        setPan({
          x: dragStartPanRef.current.x + dx,
          y: dragStartPanRef.current.y + dy,
        });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDraggingPan) setIsDraggingPan(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingPan, zoom, pan, connections, addConnection]);

  // Handle Drag & Drop of Presets
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canvasContainerRef.current) return;

    const presetName = e.dataTransfer.getData("text/plain");
    const rect = canvasContainerRef.current.getBoundingClientRect();
    
    const x = (e.clientX - rect.left - pan.x - 140 * zoom) / zoom;
    const y = (e.clientY - rect.top - pan.y - 20 * zoom) / zoom;

    let presetType = "file";
    if (presetName && presetName !== "generic") {
      presetType = presetName.split(".")[0];
    }

    let defaultName = "";
    let description = "";
    let useSubfolder = false;
    let folderPrefix = "";

    switch (presetType) {
      case "db":
        defaultName = "db";
        description = "Preset: db configuration";
        break;
      case "store":
        defaultName = "store";
        description = "Preset: store configuration";
        break;
      case "route":
        folderPrefix = "routes/route_";
        defaultName = "route";
        description = "Preset: route configuration";
        useSubfolder = true;
        break;
      case "middleware":
        defaultName = "middleware";
        description = "Preset: middleware configuration";
        break;
      case "auth":
        defaultName = "auth";
        description = "Preset: auth configuration";
        break;
      case "config":
        defaultName = "config";
        description = "Preset: config configuration";
        break;
      default:
        defaultName = "file";
        description = "Backend module";
        break;
    }

    let index = 1;
    let computedPath = activeFolderPath;
    let computedName = defaultName;
    
    if (useSubfolder) {
      computedPath = activeFolderPath ? `${activeFolderPath}/${folderPrefix}${index}` : `${folderPrefix}${index}`;
    } else {
      computedName = index === 1 ? defaultName : `${defaultName}_${index}`;
    }

    while (nodes.some((n) => n.path === computedPath && n.name === computedName)) {
      index++;
      if (useSubfolder) {
        computedPath = activeFolderPath ? `${activeFolderPath}/${folderPrefix}${index}` : `${folderPrefix}${index}`;
      } else {
        computedName = `${defaultName}_${index}`;
      }
    }

    addNode({
      name: computedName,
      path: computedPath,
      extension: "ts",
      description,
      x: Math.max(10, x),
      y: Math.max(10, y),
      isExpanded: true,
    });
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: BackendFileNode) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.tagName === "OPTION" ||
      target.closest(".action-button") ||
      target.closest(".connection-handle")
    ) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    selectNode(node.id);
    setSelectedFolderId(null);
    setDraggedNodeId(node.id);
    
    if (connectionSearchNodeId) setConnectionSearchNodeId(null);
    if (antennaMenuNodeId) openAntennaMenu(null);

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startNodeX = node.x;
    const startNodeY = node.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startMouseX) / zoom;
      const dy = (moveEvent.clientY - startMouseY) / zoom;

      updateNode(node.id, {
        x: startNodeX + dx,
        y: startNodeY + dy,
      });
    };

    const handleMouseUp = () => {
      setDraggedNodeId(null);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const resetPanZoom = useCallback(() => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  }, []);

  const { visibleNodes, virtualFolders, allRenderedElements } = useMemo(() => {
    const vn: BackendFileNode[] = [];
    const vfMap = new Map<string, { id: string, name: string, x: number, y: number, count: number }>();

    nodes.forEach(node => {
      if (node.path === activeFolderPath || activeGhostNodes.includes(node.id)) {
        vn.push(node);
      }
      if (!activeGhostNodes.includes(node.id) && node.path.startsWith(activeFolderPath ? activeFolderPath + "/" : "") && node.path !== activeFolderPath) {
        const remainingPath = activeFolderPath ? node.path.slice(activeFolderPath.length + 1) : node.path;
        const parts = remainingPath.split("/");
        const folderName = parts[0];
        const existing = vfMap.get(folderName);
        if (!existing) {
          vfMap.set(folderName, { id: `folder-${folderName}`, name: folderName, x: node.x, y: node.y, count: 1 });
        } else {
          existing.count += 1;
        }
      }
    });

    const vf = Array.from(vfMap.values());
    return { visibleNodes: vn, virtualFolders: vf, allRenderedElements: [...vn, ...vf] };
  }, [nodes, activeFolderPath, activeGhostNodes]);

  const handleOrganizeWorkspaceGrid = useCallback(() => {
    organizeWorkspaceGrid();
    sync();
  }, [organizeWorkspaceGrid, sync]);

  const orphanNodeIds = useMemo(() => {
    const connected = new Set<string>();
    connections.forEach(c => { connected.add(c.sourceId); connected.add(c.targetId); });
    return nodes.filter(n => !connected.has(n.id)).map(n => n.id);
  }, [nodes, connections]);

  const orphanNodes = useMemo(() => {
    return nodes.filter(n => orphanNodeIds.includes(n.id));
  }, [nodes, orphanNodeIds]);

  const fitToView = useCallback(() => {
    if (visibleNodes.length === 0) return;
    const container = canvasContainerRef.current;
    if (!container) return;
    const W = container.clientWidth;
    const H = container.clientHeight;
    const PAD = 60;
    const NODE_W = 280;
    const NODE_H = 120;
    const minX = Math.min(...visibleNodes.map(n => n.x));
    const minY = Math.min(...visibleNodes.map(n => n.y));
    const maxX = Math.max(...visibleNodes.map(n => n.x + NODE_W));
    const maxY = Math.max(...visibleNodes.map(n => n.y + NODE_H));
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const nextZoom = Math.min(
      Math.max((W - PAD * 2) / contentW, 0.15),
      Math.min((H - PAD * 2) / contentH, 4.0)
    );
    setPan({
      x: (W - contentW * nextZoom) / 2 - minX * nextZoom,
      y: (H - contentH * nextZoom) / 2 - minY * nextZoom,
    });
    setZoom(nextZoom);
  }, [visibleNodes]);

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      navigateToFolder("");
      return;
    }
    const parts = activeFolderPath.split("/");
    const targetPath = parts.slice(0, index + 1).join("/");
    navigateToFolder(targetPath);
  };

  const executeGlobalSearch = (nodeId: string) => {
    const targetNode = nodes.find(n => n.id === nodeId);
    if (targetNode) {
      navigateToFolder(targetNode.path);
      selectNode(targetNode.id);
      setIsGlobalSearchOpen(false);
    }
  };

  const triggerPortalWarp = (nodeId: string) => {
    executeGlobalSearch(nodeId);
    openAntennaMenu(null);
  };

  const breadcrumbs = activeFolderPath ? activeFolderPath.split("/") : [];

  // Pinned Dock Nodes
  const pinnedNodesData = useMemo(() => {
    return pinnedNodes.map(id => nodes.find(n => n.id === id)).filter(Boolean) as BackendFileNode[];
  }, [pinnedNodes, nodes]);

  // Global Search Filter
  const globalSearchResults = useMemo(() => {
    if (!globalSearchQuery) {
      return nodes.filter(n => pinnedNodes.includes(n.id));
    }
    return nodes.filter(n => n.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) || n.path.toLowerCase().includes(globalSearchQuery.toLowerCase()));
  }, [nodes, globalSearchQuery, pinnedNodes]);
  
  const connectionSearchResults = useMemo(() => {
    const base = nodes.filter(n => n.id !== connectionSearchNodeId);
    if (!connectionSearchQuery) return base;
    return base.filter(n => n.name.toLowerCase().includes(connectionSearchQuery.toLowerCase()) || n.path.toLowerCase().includes(connectionSearchQuery.toLowerCase()));
  }, [nodes, connectionSearchQuery, connectionSearchNodeId]);

  // Update handleKeyDown to capture Escape, Ctrl+C, Ctrl+X, Ctrl+V, Ctrl+D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      const isInput = activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT";
      
      if (e.key === "Escape") {
        let handled = false;
        if (isGlobalSearchOpen) {
          e.preventDefault();
          setIsGlobalSearchOpen(false);
          handled = true;
        }
        if (connectionSearchNodeId) {
          e.preventDefault();
          setConnectionSearchNodeId(null);
          handled = true;
        }
        if (antennaMenuNodeId) {
          e.preventDefault();
          openAntennaMenu(null);
          handled = true;
        }
        if (handled) return;
      }

      if (isGlobalSearchOpen) return;

      if (e.code === "Space" && !isInput) {
        setIsSpacePressed(true);
      }

      if ((e.code === "Delete" || e.code === "Backspace") && !isInput) {
        if (selectedNodeId) {
          deleteNode(selectedNodeId);
        } else if (selectedFolderId) {
          const folderName = selectedFolderId.replace("folder-", "");
          if (confirm(`Are you sure you want to delete folder "${folderName}" and all of its files?`)) {
            deleteFolder(folderName);
            setSelectedFolderId(null);
          }
        }
      }

      // Copy
      if ((e.key === "c" || e.key === "C") && (e.ctrlKey || e.metaKey) && !isInput) {
        if (selectedNodeId) {
          const node = nodes.find(n => n.id === selectedNodeId);
          if (node) {
            e.preventDefault();
            setClipboard({ action: 'copy', itemType: 'file', itemId: selectedNodeId, name: node.name });
          }
        } else if (selectedFolderId) {
          const folderName = selectedFolderId.replace("folder-", "");
          e.preventDefault();
          const prefix = activeFolderPath ? `${activeFolderPath}/${folderName}` : folderName;
          setClipboard({ action: 'copy', itemType: 'folder', itemId: prefix, name: folderName });
        }
      }

      // Cut
      if ((e.key === "x" || e.key === "X") && (e.ctrlKey || e.metaKey) && !isInput) {
        if (selectedNodeId) {
          const node = nodes.find(n => n.id === selectedNodeId);
          if (node) {
            e.preventDefault();
            setClipboard({ action: 'cut', itemType: 'file', itemId: selectedNodeId, name: node.name });
          }
        } else if (selectedFolderId) {
          const folderName = selectedFolderId.replace("folder-", "");
          e.preventDefault();
          const prefix = activeFolderPath ? `${activeFolderPath}/${folderName}` : folderName;
          setClipboard({ action: 'cut', itemType: 'folder', itemId: prefix, name: folderName });
        }
      }

      // Paste
      if ((e.key === "v" || e.key === "V") && (e.ctrlKey || e.metaKey) && !isInput) {
        e.preventDefault();
        handlePaste();
      }

      // Duplicate
      if ((e.key === "d" || e.key === "D") && (e.ctrlKey || e.metaKey) && !isInput) {
        if (selectedNodeId) {
          e.preventDefault();
          duplicateNode(selectedNodeId);
        } else if (selectedFolderId) {
          const folderName = selectedFolderId.replace("folder-", "");
          e.preventDefault();
          duplicateFolder(folderName);
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [selectedNodeId, deleteNode, duplicateNode, isGlobalSearchOpen, selectedFolderId, deleteFolder, clipboard, nodes, activeFolderPath, duplicateFolder, handlePaste, connectionSearchNodeId, antennaMenuNodeId, openAntennaMenu]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0c0c0e]">
      {/* Top Toolbar / Breadcrumb Layer */}
      <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-zinc-950/80 z-30 select-none backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleBreadcrumbClick(-1)}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/80 transition-colors"
          >
            <Home size={12} />
            <span>root</span>
          </button>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <span className="text-white/20 mx-2">/</span>
              <button 
                onClick={() => handleBreadcrumbClick(idx)}
                className={`text-xs transition-colors ${idx === breadcrumbs.length - 1 ? 'text-white font-medium' : 'text-white/40 hover:text-white/80'}`}
              >
                {crumb}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Global Search and Clean Layout controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleOrganizeWorkspaceGrid}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white/60 hover:text-white hover:border-zinc-700 transition-colors text-xs font-medium cursor-pointer"
            title="Clean Layout (Topological Connection-based Grid Layout)"
          >
            <Route size={13} className="text-violet-400" />
            <span>Clean Layout</span>
          </button>

          <div className="relative">
            <button 
              onClick={() => setIsGlobalSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white/40 hover:text-white hover:border-zinc-700 transition-colors text-xs"
            >
              <Search size={14} />
              <span>Search workspace...</span>
              <kbd className="ml-4 font-sans text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-white/30">⌘K</kbd>
            </button>

            {isGlobalSearchOpen && (
              <div className="absolute top-10 right-0 w-[320px] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-2">
                <div className="flex items-center gap-2 px-2 pb-2 border-b border-white/5">
                  <Search size={14} className="text-white/40" />
                  <input 
                    autoFocus
                    type="text" 
                    value={globalSearchQuery}
                    onChange={e => setGlobalSearchQuery(e.target.value)}
                    placeholder="Find files or folders..."
                    className="flex-1 bg-transparent text-xs text-white placeholder-white/20 outline-none"
                  />
                  <button onClick={() => setIsGlobalSearchOpen(false)} className="text-white/40 hover:text-white">
                    <X size={14} />
                  </button>
                </div>
                <div className="flex flex-col max-h-[300px] overflow-y-auto">
                  {globalSearchResults.map(res => (
                    <button 
                      key={res.id} 
                      onClick={() => executeGlobalSearch(res.id)}
                      className="flex flex-col items-start px-2 py-2 hover:bg-white/5 rounded-lg text-left"
                    >
                      <span className="text-xs text-white">{res.name}.{res.extension}</span>
                      <span className="text-[10px] text-white/40">{res.path || "root"}</span>
                    </button>
                  ))}
                  {globalSearchQuery && globalSearchResults.length === 0 && (
                    <div className="px-2 py-4 text-center text-xs text-white/40">No results found</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div
        ref={canvasContainerRef}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onMouseDown={handleCanvasMouseDown}
        className="flex-1 relative overflow-hidden select-none outline-none"
        style={{
          cursor: isDraggingPan ? "grabbing" : isSpacePressed ? "grab" : "default",
          backgroundImage: showGrid
            ? "linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px)"
            : "none",
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
        onClick={() => { selectNode(null); setSelectedFolderId(null); }}
      >
        {allRenderedElements.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-6 z-0">
            <div className="w-12 h-12 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/20 mb-3">
              <Database size={24} />
            </div>
            <h3 className="text-xs font-semibold text-white/50 mb-0.5">
              Folder Empty
            </h3>
            <p className="text-[11px] text-white/25 max-w-[280px] leading-relaxed">
              Drag files from the templates dropdown in the toolbar and drop them here.
            </p>
          </div>
        )}

        <div
          className="absolute inset-0 origin-top-left pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* SVG Connection Layer */}
          <style>{`
            @keyframes connection-flow {
              from { stroke-dashoffset: 8; }
              to { stroke-dashoffset: 0; }
            }
            .animate-flow {
              animation: connection-flow 0.4s linear infinite;
            }
          `}</style>
          <svg className="absolute inset-0 overflow-visible" style={{ zIndex: 0, pointerEvents: "none" }}>
            {connections.map(conn => {
              const source = visibleNodes.find(n => n.id === conn.sourceId);
              const target = visibleNodes.find(n => n.id === conn.targetId);
              
              if (source && target) {
                const sx = source.x + 280;
                const sy = source.y + 22;
                const tx = target.x;
                const ty = target.y + 22;
                const mx = (sx + tx) / 2;
                const my = (sy + ty) / 2;
                const isHovered = hoveredConnId === conn.id;
                return (
                  <g key={conn.id}>
                    <path
                      d={`M ${sx} ${sy} C ${sx + 50} ${sy}, ${tx - 50} ${ty}, ${tx} ${ty}`}
                      stroke="transparent"
                      strokeWidth="14"
                      fill="none"
                      style={{ pointerEvents: "stroke", cursor: "pointer" }}
                      onMouseEnter={() => setHoveredConnId(conn.id)}
                      onMouseLeave={() => setHoveredConnId(null)}
                    />
                    <path
                      d={`M ${sx} ${sy} C ${sx + 50} ${sy}, ${tx - 50} ${ty}, ${tx} ${ty}`}
                      stroke={isHovered ? "#71717a" : "#3f3f46"}
                      strokeWidth={isHovered ? 1.5 : 1.5}
                      fill="none"
                      strokeDasharray="4 4"
                      className="animate-flow"
                      style={{ pointerEvents: "none", transition: "stroke 0.15s" }}
                    />
                    {isHovered && (
                      <g
                        style={{ pointerEvents: "auto", cursor: "pointer" }}
                        onMouseEnter={() => setHoveredConnId(conn.id)}
                        onMouseLeave={() => setHoveredConnId(null)}
                        onClick={(e) => { e.stopPropagation(); removeConnection(conn.id); setHoveredConnId(null); }}
                      >
                        <circle cx={mx} cy={my} r={7} fill="#18181b" stroke="#52525b" strokeWidth="1" />
                        <text
                          x={mx}
                          y={my + 0.5}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="9"
                          fill="#a1a1aa"
                          style={{ userSelect: "none", fontFamily: "sans-serif", fontWeight: 600 }}
                        >
                          ✕
                        </text>
                      </g>
                    )}
                  </g>
                );
              }
              return null;
            })}
          </svg>

          {/* Virtual Folders */}
          {virtualFolders.map((folder) => {
            const isCut = clipboard?.action === 'cut' && clipboard.itemType === 'folder' && clipboard.itemId === (activeFolderPath ? `${activeFolderPath}/${folder.name}` : folder.name);
            return (
              <div
                key={folder.id}
                data-node-id={folder.id}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  navigateToFolder(activeFolderPath ? `${activeFolderPath}/${folder.name}` : folder.name);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFolderId(folder.id);
                  selectNode(null);
                }}
                onMouseDown={(e) => handleFolderMouseDown(e, folder)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({ x: e.clientX, y: e.clientY, folderName: folder.name });
                }}
                className={`absolute w-[180px] rounded-xl pointer-events-auto border flex flex-col bg-zinc-900 transition-colors shadow-lg ${
                  selectedFolderId === folder.id ? "border-zinc-400 ring-1 ring-zinc-400/20" : isCut ? "border-dashed border-zinc-600 opacity-40" : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800"
                }`}
                style={{
                  left: folder.x,
                  top: folder.y,
                  zIndex: 10,
                  cursor: draggedFolderId === folder.id ? "grabbing" : "grab",
                }}
              >
                <div className="flex items-center gap-3 p-3">
                  <div className="p-2 rounded bg-zinc-800 text-blue-400">
                    <Folder size={18} fill="currentColor" className="opacity-50" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-white truncate">
                      {folder.name}
                    </span>
                    <span className="text-[9px] text-white/40">{folder.count} {folder.count === 1 ? "file" : "files"}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Real Files */}
          {visibleNodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isExpanded = !!node.isExpanded;
            const isPinned = pinnedNodes.includes(node.id);
            const isOrphan = orphanNodeIds.includes(node.id);
            const isCut = clipboard?.action === 'cut' && clipboard.itemType === 'file' && clipboard.itemId === node.id;
            
            const outgoingExt = connections.filter(c => c.sourceId === node.id && !visibleNodes.find(n => n.id === c.targetId));
            const incomingExt = connections.filter(c => c.targetId === node.id && !visibleNodes.find(n => n.id === c.sourceId));
            const hasExternalLinks = outgoingExt.length > 0 || incomingExt.length > 0;
            const isGhost = node.path !== activeFolderPath;

            let NodeIcon = FileCode;
            const lowerName = node.name.toLowerCase();
            if (lowerName.includes("db")) NodeIcon = Database;
            else if (lowerName.includes("store")) NodeIcon = Layers;
            else if (lowerName.includes("route")) NodeIcon = Route;
            else if (lowerName.includes("middleware")) NodeIcon = ArrowLeftRight;
            else if (lowerName.includes("auth")) NodeIcon = Shield;
            else if (lowerName.includes("config")) NodeIcon = Settings;

            return (
              <div
                key={node.id}
                data-node-id={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                className={`absolute w-[280px] rounded-xl pointer-events-auto border flex flex-col bg-zinc-900 transition-shadow ${
                  isSelected && !node.color ? "border-zinc-400 ring-1 ring-zinc-400/20 shadow-xl" : !node.color ? "border-zinc-800 shadow-xl" : "shadow-xl"
                } ${isGhost ? 'opacity-95 ring-1 ring-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.15)]' : ''} ${isOrphan && !isGhost && !node.color ? 'ring-1 ring-amber-500/40' : ''} ${isCut ? 'opacity-40 border-dashed border-zinc-600' : ''}`}
                style={{
                  left: node.x,
                  top: node.y,
                  zIndex: isSelected ? 50 : 20,
                  cursor: draggedNodeId === node.id ? "grabbing" : "grab",
                  borderColor: node.color || undefined,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  selectNode(node.id);
                  setSelectedFolderId(null);
                  if (contextMenu) setContextMenu(null);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  selectNode(node.id);
                  setContextMenu({ x: e.clientX, y: e.clientY, nodeId: node.id });
                }}
              >
                {/* Export Connection Handle */}
                <button 
                  className="connection-handle action-button absolute -right-2 top-3.5 w-4 h-4 bg-zinc-900 border border-zinc-700 rounded-sm flex items-center justify-center cursor-pointer hover:bg-zinc-800 hover:border-zinc-500 transition-colors z-50 text-white/30 hover:text-white/80"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConnectionSearchNodeId(node.id);
                    setConnectionSearchPos({ x: node.x + 290, y: node.y });
                    setConnectionSearchQuery("");
                  }}
                >
                  <ChevronRight size={10} />
                </button>
                
                {/* Import Connection Handle */}
                <div className="absolute -left-2 top-3.5 w-4 h-4 bg-zinc-900 border border-zinc-800 rounded-sm flex items-center justify-center z-50 pointer-events-none text-white/20">
                  <ChevronRight size={10} />
                </div>

                {/* Header */}
                <div
                  className="flex items-center justify-between p-3 border-b border-white/5 select-none"
                  onClick={() => updateNode(node.id, { isExpanded: !isExpanded })}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="p-1 rounded bg-zinc-800 text-white/60"
                      style={node.color ? { backgroundColor: node.color + "22", color: node.color } : undefined}
                    >
                      <NodeIcon size={14} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1 min-w-0">
                        <span 
                          className={`text-xs font-semibold truncate cursor-pointer hover:underline ${isGhost ? 'text-purple-300' : 'text-white'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            getVsCodeApi()?.postMessage({
                              type: "openFile",
                              payload: { path: node.path, name: node.name, extension: node.extension }
                            });
                          }}
                        >
                          {node.name}.{node.extension}
                        </span>
                        {isGhost && <Ghost size={12} className="text-purple-400 shrink-0" />}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="action-button relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (colorPickerState?.nodeId === node.id) {
                            setColorPickerState(null);
                          } else {
                            const btn = e.currentTarget;
                            const rect = btn.getBoundingClientRect();
                            setColorPickerState({ nodeId: node.id, x: rect.left, y: rect.bottom + 4 });
                          }
                        }}
                        className="p-1 rounded transition-colors hover:bg-white/5"
                        title="Accent Color"
                        style={{ color: node.color || "rgba(255,255,255,0.2)" }}
                      >
                        <Palette size={12} />
                      </button>
                    </div>

                    <button 
                      onClick={(e) => { e.stopPropagation(); togglePinnedNode(node.id); }}
                      className={`action-button p-1 rounded transition-colors ${isPinned ? 'text-blue-400 bg-blue-400/10' : 'text-white/20 hover:text-white/60 hover:bg-white/5'}`}
                      title={isPinned ? "Unpin Node" : "Pin Node to Dock"}
                    >
                      <Pin size={12} fill={isPinned ? "currentColor" : "none"} />
                    </button>

                    {hasExternalLinks && (
                      <button 
                        className="action-button p-1 rounded text-orange-400/80 hover:bg-orange-400/10 hover:text-orange-300 transition-colors" 
                        title="View Cross-folder connections"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAntennaMenu(node.id);
                        }}
                      >
                        <RadioTower size={12} />
                      </button>
                    )}
                    
                    <button className="text-white/40 hover:text-white/80 p-1 rounded transition-colors cursor-pointer">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Expandable fields */}
                {isExpanded && (
                  <div className="p-3 flex flex-col gap-3 bg-zinc-950/20 rounded-b-xl">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase tracking-wider font-semibold text-white/40">
                          File Name
                        </label>
                        <input
                          type="text"
                          value={node.name}
                          onChange={(e) => updateNode(node.id, { name: e.target.value.replace(/[^a-zA-Z0-9_-]/g, "") })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-white/20 focus:outline-none focus:border-zinc-600 transition-colors"
                          placeholder="filename"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase tracking-wider font-semibold text-white/40">
                          Path
                        </label>
                        <input
                          type="text"
                          value={node.path}
                          onChange={(e) => updateNode(node.id, { path: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-white/20 focus:outline-none focus:border-zinc-600 transition-colors"
                          placeholder="e.g., lib/db"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] uppercase tracking-wider font-semibold text-white/40">
                        Description
                      </label>
                      <textarea
                        value={node.description}
                        onChange={(e) => updateNode(node.id, { description: e.target.value })}
                        rows={4}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-zinc-600 transition-colors resize-none"
                        placeholder="Purpose of this file..."
                      />
                    </div>


                  </div>
                )}

                {/* Connection Search Overlay */}
                {connectionSearchNodeId === node.id && (
                  <div 
                    className="absolute z-[100] w-[260px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-2 flex flex-col gap-2"
                    style={{ left: 290, top: 0 }}
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] uppercase font-bold text-white/40">Connect to...</span>
                      <button onClick={() => setConnectionSearchNodeId(null)} className="text-white/40 hover:text-white transition-colors cursor-pointer">
                        <X size={12} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg">
                      <Search size={12} className="text-white/40" />
                      <input 
                        autoFocus
                        type="text" 
                        value={connectionSearchQuery}
                        onChange={e => setConnectionSearchQuery(e.target.value)}
                        placeholder="Search workspace files..."
                        className="flex-1 bg-transparent text-xs text-white placeholder-white/20 outline-none"
                      />
                    </div>
                    <div className="flex flex-col max-h-[160px] overflow-y-auto">
                      {connectionSearchResults.map(res => (
                        <button 
                          key={res.id} 
                          onClick={(e) => {
                            e.stopPropagation();
                            addConnection(node.id, res.id);
                            setConnectionSearchNodeId(null);
                          }}
                          className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded-lg text-left transition-colors cursor-pointer"
                        >
                          <LinkIcon size={12} className="text-white/20" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs text-white truncate">{res.name}.{res.extension}</span>
                            <span className="text-[9px] text-white/40 truncate">{res.path || "root"}</span>
                          </div>
                        </button>
                      ))}
                      {connectionSearchResults.length === 0 && (
                        <div className="py-3 text-center text-[10px] text-white/40">No files found</div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Antenna Menu Overlay */}
                {antennaMenuNodeId === node.id && (
                  <div 
                    className="absolute z-[100] w-[220px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-2 flex flex-col gap-2"
                    style={{ left: 290, top: 0 }}
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-1.5 text-white/70">
                        <RadioTower size={12} />
                        <span className="text-[10px] uppercase font-bold tracking-wider">Antenna Portals</span>
                      </div>
                      <button onClick={() => openAntennaMenu(null)} className="text-white/40 hover:text-white transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                    
                    <div className="flex flex-col max-h-[200px] overflow-y-auto pr-1">
                      {outgoingExt.length > 0 && (
                        <div className="mb-2">
                          <div className="text-[9px] uppercase font-semibold text-white/30 px-1 mb-1">Exports to</div>
                          {outgoingExt.map(conn => {
                            const target = nodes.find(n => n.id === conn.targetId);
                            if (!target) return null;
                            return (
                              <button 
                                key={conn.id}
                                onClick={() => triggerPortalWarp(target.id)}
                                className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-white/5 rounded-lg text-left transition-colors group"
                              >
                                <div className="flex flex-col min-w-0 pr-2">
                                  <span className="text-xs text-white truncate">{target.name}.{target.extension}</span>
                                  <span className="text-[9px] text-white/40 truncate">{target.path || "root"}</span>
                                </div>
                                <ArrowRight size={10} className="text-emerald-400/40 group-hover:text-emerald-400 transition-colors shrink-0" />
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {incomingExt.length > 0 && (
                        <div>
                          <div className="text-[9px] uppercase font-semibold text-white/30 px-1 mb-1">Imports from</div>
                          {incomingExt.map(conn => {
                            const source = nodes.find(n => n.id === conn.sourceId);
                            if (!source) return null;
                            return (
                              <button 
                                key={conn.id}
                                onClick={() => triggerPortalWarp(source.id)}
                                className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-white/5 rounded-lg text-left transition-colors group"
                              >
                                <div className="flex flex-col min-w-0 pr-2">
                                  <span className="text-xs text-white truncate">{source.name}.{source.extension}</span>
                                  <span className="text-[9px] text-white/40 truncate">{source.path || "root"}</span>
                                </div>
                                <ArrowLeft size={10} className="text-blue-400/40 group-hover:text-blue-400 transition-colors shrink-0" />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pinned Nodes Dock */}
        {pinnedNodesData.length > 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-[55%] z-40 bg-zinc-950/80 backdrop-blur-xl border border-zinc-800 rounded-xl p-1 shadow-2xl flex items-center gap-1.5 pointer-events-auto select-none max-w-[60vw]">
            <div className="pl-2 pr-1.5 flex items-center gap-1 text-blue-400/80 border-r border-white/10 shrink-0">
              <Pin size={10} fill="currentColor" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Dock</span>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-w-full py-0.5">
              {pinnedNodesData.map(node => {
                const isActiveGhost = activeGhostNodes.includes(node.id);
                return (
                  <button
                    key={node.id}
                    onClick={() => toggleGhostNode(node.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium whitespace-nowrap transition-colors ${
                      isActiveGhost 
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' 
                        : 'bg-zinc-800 border-zinc-700 text-white/70 hover:bg-zinc-700 hover:text-white'
                    }`}
                  >
                    <FileCode size={10} className={isActiveGhost ? "text-purple-400" : "opacity-50"} />
                    {node.name}.{node.extension}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {contextMenu && createPortal(
          <div
            className="fixed inset-0 z-[200]"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          >
            <div
              className="fixed bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl py-1 min-w-[180px] select-none"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {(contextMenu as any).folderName ? (
                <>
                  <button
                    onClick={() => {
                      getVsCodeApi()?.postMessage({
                        type: "renameFolder",
                        payload: { oldName: (contextMenu as any).folderName, activeFolderPath }
                      });
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5 transition-colors text-left cursor-pointer"
                  >
                    <Settings size={12} className="text-white/40" />
                    <span>Rename Folder</span>
                  </button>
                  <button
                    onClick={() => {
                      const prefix = activeFolderPath ? `${activeFolderPath}/${(contextMenu as any).folderName}` : (contextMenu as any).folderName;
                      setClipboard({ action: 'copy', itemType: 'folder', itemId: prefix, name: (contextMenu as any).folderName });
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <CopyPlus size={12} className="text-white/40" />
                      <span>Copy Folder</span>
                    </div>
                    <kbd className="text-[9px] text-white/25 font-mono">Ctrl+C</kbd>
                  </button>
                  <button
                    onClick={() => {
                      const prefix = activeFolderPath ? `${activeFolderPath}/${(contextMenu as any).folderName}` : (contextMenu as any).folderName;
                      setClipboard({ action: 'cut', itemType: 'folder', itemId: prefix, name: (contextMenu as any).folderName });
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Ghost size={12} className="text-white/40" />
                      <span>Cut Folder</span>
                    </div>
                    <kbd className="text-[9px] text-white/25 font-mono">Ctrl+X</kbd>
                  </button>
                  <button
                    onClick={() => {
                      duplicateFolder((contextMenu as any).folderName);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <CopyPlus size={12} className="text-white/40" />
                      <span>Duplicate Folder</span>
                    </div>
                    <kbd className="text-[9px] text-white/25 font-mono">Ctrl+D</kbd>
                  </button>
                  <div className="my-1 border-t border-white/5" />
                  <button
                    onClick={() => {
                      if (confirm(`Delete folder "${(contextMenu as any).folderName}" and all its contents?`)) {
                        deleteFolder((contextMenu as any).folderName);
                      }
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400/80 hover:bg-white/5 transition-colors text-left cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>Delete Folder</span>
                  </button>
                </>
              ) : contextMenu.nodeId ? (
                <>
                  <button
                    onClick={() => {
                      const node = nodes.find(n => n.id === contextMenu.nodeId);
                      if (node) {
                        getVsCodeApi()?.postMessage({
                          type: "renameNode",
                          payload: { nodeId: contextMenu.nodeId, oldName: node.name }
                        });
                      }
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5 transition-colors text-left cursor-pointer"
                  >
                    <Settings size={12} className="text-white/40" />
                    <span>Rename File</span>
                  </button>

                  <button
                    onClick={() => {
                      const node = nodes.find(n => n.id === contextMenu.nodeId);
                      if (node) {
                        setClipboard({ action: 'copy', itemType: 'file', itemId: node.id, name: node.name });
                      }
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <CopyPlus size={12} className="text-white/40" />
                      <span>Copy File</span>
                    </div>
                    <kbd className="text-[9px] text-white/25 font-mono">Ctrl+C</kbd>
                  </button>

                  <button
                    onClick={() => {
                      const node = nodes.find(n => n.id === contextMenu.nodeId);
                      if (node) {
                        setClipboard({ action: 'cut', itemType: 'file', itemId: node.id, name: node.name });
                      }
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Ghost size={12} className="text-white/40" />
                      <span>Cut File</span>
                    </div>
                    <kbd className="text-[9px] text-white/25 font-mono">Ctrl+X</kbd>
                  </button>

                  <button
                    onClick={() => { duplicateNode(contextMenu.nodeId!); setContextMenu(null); }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <CopyPlus size={12} className="text-white/40" />
                      <span>Duplicate</span>
                    </div>
                    <kbd className="text-[9px] text-white/25 font-mono">Ctrl+D</kbd>
                  </button>
                  
                  <div className="my-1 border-t border-white/5" />
                  <button
                    onClick={() => { deleteNode(contextMenu.nodeId!); setContextMenu(null); }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-1.5 text-xs text-red-400/80 hover:bg-white/5 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Trash2 size={12} />
                      <span>Delete</span>
                    </div>
                    <kbd className="text-[9px] text-white/25 font-mono">Del</kbd>
                  </button>
                </>
              ) : (
                <>
                  <button
                    disabled={!clipboard}
                    onClick={() => { handlePaste(); setContextMenu(null); }}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-1.5 text-xs transition-colors text-left cursor-pointer ${
                      clipboard ? 'text-white/80 hover:bg-white/5' : 'text-white/20 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CopyPlus size={12} className="text-white/40" />
                      <span>Paste</span>
                    </div>
                    <kbd className="text-[9px] text-white/25 font-mono">Ctrl+V</kbd>
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body
        )}

        {/* Orphan Panel */}
        {orphanNodes.length > 0 && (
          <div className="absolute top-4 right-4 z-40 pointer-events-auto select-none">
            <button
              onClick={() => setIsOrphanPanelOpen(o => !o)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                isOrphanPanelOpen
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-zinc-900 border-amber-500/20 text-amber-400/80 hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-300'
              }`}
            >
              <AlertTriangle size={12} />
              <span>{orphanNodes.length} orphan{orphanNodes.length > 1 ? "s" : ""}</span>
            </button>
            {isOrphanPanelOpen && (
              <div className="absolute top-9 right-0 w-[220px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-2 flex flex-col gap-1">
                <div className="text-[9px] uppercase font-bold text-white/30 px-1 pb-1 border-b border-white/5">Unconnected files</div>
                <div className="flex flex-col max-h-[200px] overflow-y-auto">
                  {orphanNodes.map(n => (
                    <div key={n.id} className="flex items-center group">
                      <button
                        onClick={() => { navigateToFolder(n.path); selectNode(n.id); setIsOrphanPanelOpen(false); }}
                        className="flex flex-col items-start px-2 py-1.5 hover:bg-white/5 rounded-l-lg text-left transition-colors flex-1 min-w-0"
                      >
                        <span className="text-xs text-amber-300/90 truncate w-full">{n.name}.{n.extension}</span>
                        <span className="text-[9px] text-white/30 truncate w-full">{n.path || "root"}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNode(n.id);
                        }}
                        className="px-2 py-1.5 opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 hover:bg-white/5 rounded-r-lg transition-all h-full"
                        title="Delete Orphan"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Custom Color Picker Popover */}
        {colorPickerState && createPortal((() => {
          const pickerNode = nodes.find(n => n.id === colorPickerState.nodeId);
          const currentColor = pickerNode?.color || "";
          const presetColors = [
            "#ef4444", "#f97316", "#f59e0b", "#eab308",
            "#84cc16", "#22c55e", "#10b981", "#14b8a6",
            "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
            "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
            "#f43f5e", "#78716c", "#64748b", "#ffffff",
          ];
          return (
            <>
              <div
                className="fixed inset-0 z-[998]"
                onClick={(e) => { e.stopPropagation(); setColorPickerState(null); }}
                onMouseDown={(e) => e.stopPropagation()}
              />
              <div
                className="fixed z-[999]"
                style={{ left: colorPickerState.x, top: colorPickerState.y }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="w-[196px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-2.5 flex flex-col gap-2">
                  <div className="grid grid-cols-5 gap-1.5">
                    {presetColors.map(color => (
                      <button
                        key={color}
                        onClick={() => updateNode(colorPickerState.nodeId, { color })}
                        className="w-7 h-7 rounded-lg border transition-all hover:scale-110"
                        style={{
                          backgroundColor: color,
                          borderColor: currentColor === color ? "#fff" : "rgba(255,255,255,0.08)",
                          boxShadow: currentColor === color ? `0 0 0 1.5px ${color}44` : "none",
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                    <div
                      className="w-6 h-6 rounded-md border border-white/10 shrink-0"
                      style={{ backgroundColor: currentColor || "#6366f1" }}
                    />
                    <input
                      type="text"
                      value={currentColor || ""}
                      placeholder="#hex"
                      onChange={(e) => {
                        const v = e.target.value;
                        if (/^#[0-9a-fA-F]{0,6}$/.test(v) || v === "") {
                          updateNode(colorPickerState.nodeId, { color: v });
                        }
                      }}
                      className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-[11px] text-white font-mono placeholder-white/20 outline-none focus:border-zinc-500 transition-colors"
                    />
                    {currentColor && (
                      <button
                        onClick={() => { updateNode(colorPickerState.nodeId, { color: "" }); }}
                        className="w-6 h-6 flex items-center justify-center rounded-md text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors"
                        title="Clear color"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          );
        })(), document.body)}

        {/* Floating Zoom Controls */}
        <div className="absolute right-6 bottom-6 z-50 flex items-center gap-1.5 bg-[#18181b] border border-zinc-800 rounded-lg p-1 select-none pointer-events-auto">
          <button
            onClick={() => setZoom((prev) => Math.max(0.15, prev - 0.1))}
            className="w-7 h-7 flex items-center justify-center rounded text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Minus size={13} />
          </button>
          <span className="text-[11px] font-bold min-w-[42px] text-center text-white/80 font-mono">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((prev) => Math.min(4.0, prev + 0.1))}
            className="w-7 h-7 flex items-center justify-center rounded text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Plus size={13} />
          </button>
          <div className="w-px h-4 bg-white/10 mx-0.5" />
          <button
            onClick={fitToView}
            className="w-7 h-7 flex items-center justify-center rounded text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Fit to view"
          >
            <Maximize2 size={13} />
          </button>
          <div className="w-px h-4 bg-white/10 mx-0.5" />
          <button
            onClick={resetPanZoom}
            className="px-2.5 h-7 flex items-center justify-center rounded text-[10px] font-bold uppercase tracking-wider text-white/50 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      {clipboard?.action === 'cut' && (
        <div className="fixed bottom-4 left-4 z-[100] bg-red-950/90 border border-red-500/30 px-3.5 py-2 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs text-red-200 animate-bounce pointer-events-auto">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          <span>Actively Cut: <strong className="font-semibold text-white font-mono">{clipboard.name}</strong></span>
          <button 
            onClick={() => setClipboard(null)} 
            className="ml-1 text-red-400 hover:text-white p-0.5 rounded transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
