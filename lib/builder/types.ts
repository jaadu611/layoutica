export type ElementType =
  | "text"
  | "heading"
  | "image"
  | "button"
  | "section"
  | "navbar"
  | "footer";

export interface StyleProps {
  width?: string;
  height?: string;
  minWidth?: string;
  minHeight?: string;
  maxWidth?: string;
  maxHeight?: string;
  margin?: string;
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  padding?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  paddingRight?: string;
  display?: "block" | "flex" | "grid" | "none" | "inline-block";
  flexDirection?: "row" | "column";
  justifyContent?:
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around";
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch";
  gap?: string;
  flexWrap?: "wrap" | "nowrap";
  color?: string;
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
  letterSpacing?: string;
  textAlign?: "left" | "center" | "right" | "justify";
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: "cover" | "contain" | "auto";
  borderRadius?: string;
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
  borderWidth?: string;
  borderStyle?: "solid" | "dashed" | "dotted" | "none";
  borderColor?: string;
  boxShadow?: string;
  opacity?: number;
  cursor?: string;
  position?: "static" | "relative" | "absolute" | "fixed";
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  zIndex?: number;
  overflow?: "visible" | "hidden" | "scroll" | "auto";
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

export interface BuilderState {
  pages: Page[];
  activePageId: string;
  selectedElementId: string | null;
  hoveredElementId: string | null;
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
  getActivePage: () => Page | undefined;
  getSelectedElement: () => CanvasElement | undefined;
}
