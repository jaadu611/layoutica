export type ElementType =
  | "text"
  | "heading"
  | "image"
  | "button"
  | "section"
  | "navbar"
  | "footer";

export interface StyleProps {
  display?: "block" | "flex" | "grid" | "none" | "inline-block";
  flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
  justifyContent?:
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around"
    | "space-evenly";
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch" | "baseline";
  flexWrap?: "wrap" | "nowrap" | "wrap-reverse";
  gap?: string;
  flexGrow?: number;
  flexShrink?: number;
  gridTemplateColumns?: string;
  zIndex?: number;
  position?: "static" | "relative" | "absolute" | "fixed" | "sticky";
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;

  width?: string;
  height?: string;
  minWidth?: string;
  minHeight?: string;
  maxWidth?: string;
  maxHeight?: string;
  padding?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  paddingRight?: string;
  margin?: string;
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  aspectRatio?: string;

  color?: string;
  fontSize?: string;
  fontWeight?: string;
  fontFamily?: string;
  lineHeight?: string;
  letterSpacing?: string;
  textAlign?: "left" | "center" | "right" | "justify";
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textDecoration?: "none" | "underline" | "line-through";
  fontStyle?: "normal" | "italic";
  whiteSpace?: "normal" | "nowrap" | "pre" | "pre-wrap" | "pre-line";

  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
  opacity?: number;
  borderRadius?: string;
  boxShadow?: string;
  backdropFilter?: string;

  borderWidth?: string;
  borderStyle?: "solid" | "dashed" | "dotted" | "none";
  borderColor?: string;
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
  outline?: string;

  cursor?: string;
  transition?: string;
  transform?: string;
  overflow?: "visible" | "hidden" | "scroll" | "auto";
  objectFit?: "fill" | "contain" | "cover" | "none" | "scale-down";
  userSelect?: "auto" | "text" | "none" | "all";
  pointerEvents?: "auto" | "none";

  gradientType?: "linear" | "radial" | "none";
  gradientAngle?: number;
  gradientStartColor?: string;
  gradientEndColor?: string;
}

export interface CanvasElement {
  id: string;
  type: ElementType;
  content?: string;
  src?: string;
  alt?: string;
  href?: string;
  target?: "_blank" | "_self";
  children?: CanvasElement[];
  styles: StyleProps;
  tailwindClasses?: string;
  metadata?: {
    name?: string;
    isHidden?: boolean;
    isLocked?: boolean;
  };
}

export interface Page {
  id: string;
  name: string;
  slug: string;
  elements: CanvasElement[];
}

export interface HistoryEntry {
  pages: Page[];
  activePageId: string;
}

export interface BuilderState {
  pages: Page[];
  activePageId: string;
  selectedElementId: string | null;
  hoveredElementId: string | null;
  past: HistoryEntry[];
  future: HistoryEntry[];

  addPage: (name: string) => void;
  deletePage: (id: string) => void;
  setActivePage: (id: string) => void;
  renamePage: (id: string, name: string) => void;

  addElement: (
    element: Omit<CanvasElement, "id">,
    parentId?: string,
    targetIndex?: number,
  ) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  selectElement: (id: string | null) => void;
  setHoveredElement: (id: string | null) => void;
  moveElement: (id: string, direction: "up" | "down") => void;
  reorderElement: (
    sourceId: string,
    targetParentId?: string,
    targetIndex?: number,
  ) => void;
  duplicateElement: (id: string) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  getActivePage: () => Page | undefined;
  getSelectedElement: () => CanvasElement | undefined;
}
