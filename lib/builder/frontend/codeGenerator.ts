import { CanvasElement, Page, SavedComponent, StyleProps } from "./types";
import { DesignTokens } from "./projectSaverLoader";
import { twMerge } from "tailwind-merge";
import { clsx, type ClassValue } from "clsx";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Google Font mapping ──────────────────────────────────────────────────────

const NEXT_FONT_MAP: Record<string, string> = {
  "inter, sans-serif": "Inter",
  "geist, sans-serif": "Geist",
  "'playfair display', serif": "Playfair_Display",
  "'dm sans', sans-serif": "DM_Sans",
  "'space grotesk', sans-serif": "Space_Grotesk",
  "'plus jakarta sans', sans-serif": "Plus_Jakarta_Sans",
  "'bricolage grotesque', sans-serif": "Bricolage_Grotesque",
  "'fraunces', serif": "Fraunces",
};

interface FontEntry {
  importName: string;
  varName: string;
}

function extractFonts(elements: CanvasElement[]): Map<string, FontEntry> {
  const fonts = new Map<string, FontEntry>();
  const walk = (els: CanvasElement[]) => {
    for (const el of els) {
      if (el.styles.fontFamily) {
        const raw = el.styles.fontFamily.trim();
        const key = raw.toLowerCase();
        if (!fonts.has(key)) {
          if (NEXT_FONT_MAP[key]) {
            fonts.set(key, {
              importName: NEXT_FONT_MAP[key],
              varName: NEXT_FONT_MAP[key].toLowerCase().replace(/_/g, ""),
            });
          } else if (
            ![
              "inherit",
              "monospace",
              "serif",
              "sans-serif",
              "cursive",
              "fantasy",
              "courier new",
              "courier",
              "consolas",
              "menlo",
              "monaco",
              "lucida console",
              "jetbrains mono",
              "fira code",
              "cascadia code",
              "source code pro",
              "inconsolata",
            ].some((m) => key.includes(m))
          ) {
            const base = raw.replace(/['"]/g, "").split(",")[0].trim();
            fonts.set(key, {
              importName: base
                .split(/\s+/)
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join("_"),
              varName: base.replace(/\s+/g, "").toLowerCase() + "Font",
            });
          }
        }
      }
      if (el.children) walk(el.children);
    }
  };
  walk(elements);
  return fonts;
}

function generateFontImports(fonts: Map<string, FontEntry>): string {
  if (!fonts.size) return "";
  return `import { ${[...fonts.values()].map((f) => f.importName).join(", ")} } from "next/font/google";\n`;
}

function generateFontInits(fonts: Map<string, FontEntry>): string {
  if (!fonts.size) return "";
  return (
    [...fonts.entries()]
      .map(([key, { importName, varName }]) => {
        const styleOpt = key.includes("serif")
          ? `, style: ["normal", "italic"]`
          : "";
        return `const ${varName} = ${importName}({ subsets: ["latin"], weight: ["400","500","600","700"]${styleOpt} });`;
      })
      .join("\n") + "\n"
  );
}

// ─── Tailwind conversion ──────────────────────────────────────────────────────
// KEY DESIGN DECISIONS:
// 1. Multi-value shorthands (padding: "16px 32px") → inline style, not Tailwind
//    because Tailwind p-[16px_32px] breaks on multi-value arbitrary values in v3
// 2. transition → always removed from inline style when state rules exist;
//    emitted instead on the base CSS selector so the browser can animate
//    between base state and :hover/:active/:focus (inline transition + stylesheet
//    hover does NOT animate reliably across all browsers)
// 3. Individual padding/margin sides → Tailwind pt-/pr-/pb-/pl- arbitrary values

function sp(v: string) {
  return v.replace(/\s+/g, "_");
}

function stylesToTailwind(
  styles: CanvasElement["styles"],
  usedFonts: Map<string, FontEntry>,
): {
  className: string;
  style: Record<string, string>;
  fontClassName?: string;
} {
  const cls: string[] = [];
  const inlineStyle: Record<string, string> = {};
  let fontClassName: string | undefined;

  const cleanSplit = (val: string) => {
    // Replace spaces inside parentheses (like rgb/rgba colors) to prevent incorrect splitting
    const cleaned = val.trim().replace(/\([^)]+\)/g, (m) => m.replace(/\s+/g, ""));
    return cleaned.split(/\s+/);
  };

  // Display & Flex
  if (styles.display) {
    const m: Record<string, string> = {
      flex: "flex",
      grid: "grid",
      block: "block",
      "inline-block": "inline-block",
      "inline-flex": "inline-flex",
      inline: "inline",
      none: "hidden",
    };
    cls.push(m[styles.display] || `[display:${styles.display}]`);
  }
  if (styles.flexDirection) {
    const m: Record<string, string> = {
      row: "flex-row",
      column: "flex-col",
      "row-reverse": "flex-row-reverse",
      "column-reverse": "flex-col-reverse",
    };
    cls.push(
      m[styles.flexDirection] || `[flex-direction:${styles.flexDirection}]`,
    );
  }
  if (styles.flexWrap)
    cls.push(styles.flexWrap === "wrap" ? "flex-wrap" : "flex-nowrap");
  if (styles.flexGrow !== undefined) cls.push(`[flex-grow:${styles.flexGrow}]`);
  if (styles.flexShrink !== undefined)
    cls.push(`[flex-shrink:${styles.flexShrink}]`);

  let flexVal = styles.flex;
  if (flexVal === "1") {
    if ((styles.height && styles.height !== "auto") || (styles.width && styles.width !== "auto")) {
      flexVal = "none";
    }
  }
  if (flexVal) {
    const m: Record<string, string> = {
      "1": "flex-1",
      none: "flex-none",
      auto: "flex-auto",
      initial: "flex-initial",
    };
    cls.push(m[flexVal] || `flex-[${flexVal}]`);
  }
  if (styles.alignItems) {
    const m: Record<string, string> = {
      "flex-start": "items-start",
      center: "items-center",
      "flex-end": "items-end",
      stretch: "items-stretch",
      baseline: "items-baseline",
    };
    cls.push(m[styles.alignItems] || `items-[${styles.alignItems}]`);
  }
  if (styles.justifyContent) {
    const m: Record<string, string> = {
      "flex-start": "justify-start",
      center: "justify-center",
      "flex-end": "justify-end",
      "space-between": "justify-between",
      "space-around": "justify-around",
      "space-evenly": "justify-evenly",
    };
    cls.push(m[styles.justifyContent] || `justify-[${styles.justifyContent}]`);
  }
  if (styles.gap) cls.push(`gap-[${sp(styles.gap)}]`);
  if (styles.columnGap) cls.push(`gap-x-[${sp(styles.columnGap)}]`);
  if (styles.rowGap) cls.push(`gap-y-[${sp(styles.rowGap)}]`);
  if (styles.gridTemplateColumns)
    inlineStyle.gridTemplateColumns = styles.gridTemplateColumns;
  if (styles.gridTemplateRows)
    inlineStyle.gridTemplateRows = styles.gridTemplateRows;
  if (styles.gridColumn) inlineStyle.gridColumn = styles.gridColumn;
  if (styles.gridRow) inlineStyle.gridRow = styles.gridRow;

  // Sizing
  if (styles.width) cls.push(`w-[${sp(styles.width)}]`);
  if (styles.height) cls.push(`h-[${sp(styles.height)}]`);
  if (styles.minWidth) cls.push(`min-w-[${sp(styles.minWidth)}]`);
  if (styles.maxWidth) cls.push(`max-w-[${sp(styles.maxWidth)}]`);
  if (styles.minHeight) cls.push(`min-h-[${sp(styles.minHeight)}]`);
  if (styles.maxHeight) cls.push(`max-h-[${sp(styles.maxHeight)}]`);
  if (styles.aspectRatio) inlineStyle.aspectRatio = styles.aspectRatio;

  // Padding — prefer longhand if any side is set individually
  if (
    styles.paddingTop ||
    styles.paddingRight ||
    styles.paddingBottom ||
    styles.paddingLeft
  ) {
    if (styles.paddingTop) cls.push(`pt-[${sp(styles.paddingTop)}]`);
    if (styles.paddingRight) cls.push(`pr-[${sp(styles.paddingRight)}]`);
    if (styles.paddingBottom) cls.push(`pb-[${sp(styles.paddingBottom)}]`);
    if (styles.paddingLeft) cls.push(`pl-[${sp(styles.paddingLeft)}]`);
  } else if (styles.padding) {
    cls.push(`p-[${sp(styles.padding.trim().replace(/\s+/g, "_"))}]`);
  }

  // Margin
  if (
    styles.marginTop ||
    styles.marginRight ||
    styles.marginBottom ||
    styles.marginLeft
  ) {
    if (styles.marginTop) cls.push(`mt-[${sp(styles.marginTop)}]`);
    if (styles.marginRight) cls.push(`mr-[${sp(styles.marginRight)}]`);
    if (styles.marginBottom) cls.push(`mb-[${sp(styles.marginBottom)}]`);
    if (styles.marginLeft) cls.push(`ml-[${sp(styles.marginLeft)}]`);
  } else if (styles.margin) {
    cls.push(`m-[${sp(styles.margin.trim().replace(/\s+/g, "_"))}]`);
  }

  // Position
  if (styles.position && styles.position !== "static")
    cls.push(styles.position);
  if (styles.top) cls.push(`top-[${styles.top}]`);
  if (styles.right) cls.push(`right-[${styles.right}]`);
  if (styles.bottom) cls.push(`bottom-[${styles.bottom}]`);
  if (styles.left) cls.push(`left-[${styles.left}]`);
  if (styles.zIndex !== undefined) cls.push(`z-[${styles.zIndex}]`);

  // Colors & BG
  if (styles.backgroundColor) cls.push(`bg-[${sp(styles.backgroundColor)}]`);
  if (styles.color) cls.push(`text-[${sp(styles.color)}]`);
  if (styles.opacity !== undefined) cls.push(`opacity-[${styles.opacity}]`);
  if (styles.backgroundImage)
    inlineStyle.backgroundImage = styles.backgroundImage;
  if (styles.backgroundSize) inlineStyle.backgroundSize = styles.backgroundSize;
  if (styles.backgroundPosition)
    inlineStyle.backgroundPosition = styles.backgroundPosition;
  if (styles.backgroundRepeat)
    inlineStyle.backgroundRepeat = styles.backgroundRepeat;
  if (
    styles.gradientType === "linear" &&
    styles.gradientStartColor &&
    styles.gradientEndColor
  ) {
    inlineStyle.backgroundImage = `linear-gradient(${styles.gradientAngle ?? 135}deg, ${styles.gradientStartColor}, ${styles.gradientEndColor})`;
  }

  // Borders — parse shorthand "1px solid #color" into parts for Tailwind,
  // individual sides go inline since Tailwind can't do arbitrary per-side shorthand
  if (
    styles.border &&
    !styles.borderTop &&
    !styles.borderRight &&
    !styles.borderBottom &&
    !styles.borderLeft
  ) {
    const parts = cleanSplit(styles.border);
    const width = parts.find((p) => /^\d/.test(p)) || "";
    const style =
      parts.find((p) =>
        ["solid", "dashed", "dotted", "double", "none"].includes(p),
      ) || "";
    const color =
      parts.find(
        (p) => p.startsWith("#") || p.startsWith("rgb") || p.startsWith("hsl") || p.startsWith("var("),
      ) || "";
    cls.push("border");
    if (width && width !== "1px") cls.push(`border-[${width}]`);
    if (style && style !== "solid") cls.push(`border-${style}`);
    if (color) cls.push(`border-[${sp(color)}]`);
  } else if (
    styles.borderTop ||
    styles.borderRight ||
    styles.borderBottom ||
    styles.borderLeft
  ) {
    const parseSide = (val: string, side: string) => {
      const parts = cleanSplit(val);
      const width = parts.find((p) => /^\d/.test(p)) || "";
      const st =
        parts.find((p) =>
          ["solid", "dashed", "dotted", "double", "none"].includes(p),
        ) || "";
      const color =
        parts.find(
          (p) =>
            p.startsWith("#") || p.startsWith("rgb") || p.startsWith("hsl") || p.startsWith("var("),
        ) || "";
      if (width) cls.push(`border-${side}-[${width}]`);
      if (st && st !== "solid") cls.push(`border-${side}-${st}`);
      if (color) cls.push(`border-${side}-[${sp(color)}]`);
    };
    if (styles.borderTop) parseSide(styles.borderTop, "t");
    if (styles.borderRight) parseSide(styles.borderRight, "r");
    if (styles.borderBottom) parseSide(styles.borderBottom, "b");
    if (styles.borderLeft) parseSide(styles.borderLeft, "l");
  } else if (styles.borderWidth || styles.borderStyle || styles.borderColor) {
    cls.push("border");
    if (styles.borderWidth) cls.push(`border-[${styles.borderWidth}]`);
    if (styles.borderStyle && styles.borderStyle !== "solid")
      cls.push(`border-${styles.borderStyle}`);
    if (styles.borderColor) cls.push(`border-[${sp(styles.borderColor)}]`);
  }
  if (styles.borderRadius) {
    cls.push(`rounded-[${styles.borderRadius.trim().replace(/\s+/g, "_")}]`);
  }
  if (styles.outline) {
    cls.push(`outline-[${styles.outline.trim().replace(/\s+/g, "_")}]`);
  }

  // Typography
  if (styles.fontSize) cls.push(`text-[${styles.fontSize}]`);
  if (styles.fontWeight) {
    const m: Record<string, string> = {
      "300": "font-light",
      "400": "font-normal",
      "500": "font-medium",
      "600": "font-semibold",
      "700": "font-bold",
      "800": "font-extrabold",
    };
    cls.push(m[styles.fontWeight] || `font-[${styles.fontWeight}]`);
  }
  if (styles.fontStyle === "italic") cls.push("italic");
  else if (styles.fontStyle === "normal") cls.push("not-italic");
  if (styles.textAlign) {
    const m: Record<string, string> = {
      left: "text-left",
      center: "text-center",
      right: "text-right",
      justify: "text-justify",
    };
    cls.push(m[styles.textAlign] || `text-${styles.textAlign}`);
  }
  if (styles.textTransform) {
    const m: Record<string, string> = {
      uppercase: "uppercase",
      lowercase: "lowercase",
      capitalize: "capitalize",
      none: "normal-case",
    };
    cls.push(
      m[styles.textTransform] || `[text-transform:${styles.textTransform}]`,
    );
  }
  if (styles.textDecoration) {
    const m: Record<string, string> = {
      underline: "underline",
      "line-through": "line-through",
      none: "no-underline",
    };
    cls.push(
      m[styles.textDecoration] || `[text-decoration:${styles.textDecoration}]`,
    );
  }
  if (styles.lineHeight) cls.push(`leading-[${styles.lineHeight}]`);
  if (styles.letterSpacing) cls.push(`tracking-[${styles.letterSpacing}]`);
  if (styles.whiteSpace) inlineStyle.whiteSpace = styles.whiteSpace;
  if (styles.textOverflow) inlineStyle.textOverflow = styles.textOverflow;
  if (styles.lineClamp) {
    inlineStyle.display = "-webkit-box";
    inlineStyle.WebkitLineClamp = String(styles.lineClamp);
    inlineStyle.WebkitBoxOrient = "vertical";
    inlineStyle.overflow = "hidden";
  }
  if (styles.fontFamily) {
    const entry = usedFonts.get(styles.fontFamily.toLowerCase().trim());
    if (entry) fontClassName = `\${${entry.varName}.className}`;
    else inlineStyle.fontFamily = styles.fontFamily;
  }

  // Effects
  if (styles.boxShadow) inlineStyle.boxShadow = styles.boxShadow;
  if (styles.backdropFilter) inlineStyle.backdropFilter = styles.backdropFilter;
  if (styles.filter) inlineStyle.filter = styles.filter;
  if (styles.transform) inlineStyle.transform = styles.transform;
  // transition: kept inline here but stripped from inline style in elementToJSX
  // when state rules exist (see comment in elementToJSX)
  if (styles.transition) inlineStyle.transition = styles.transition;

  // Overflow & interaction
  if (styles.overflow) {
    const m: Record<string, string> = {
      hidden: "overflow-hidden",
      scroll: "overflow-scroll",
      auto: "overflow-auto",
      visible: "overflow-visible",
    };
    cls.push(m[styles.overflow] || `[overflow:${styles.overflow}]`);
  }
  if (styles.cursor) {
    const m: Record<string, string> = {
      pointer: "cursor-pointer",
      default: "cursor-default",
      text: "cursor-text",
      grab: "cursor-grab",
      crosshair: "cursor-crosshair",
      "not-allowed": "cursor-not-allowed",
      "zoom-in": "cursor-zoom-in",
      none: "cursor-none",
    };
    cls.push(m[styles.cursor] || `cursor-[${styles.cursor}]`);
  }
  if (styles.userSelect) {
    const m: Record<string, string> = {
      none: "select-none",
      text: "select-text",
      all: "select-all",
      auto: "select-auto",
    };
    cls.push(m[styles.userSelect] || `[user-select:${styles.userSelect}]`);
  }
  if (styles.pointerEvents)
    cls.push(
      styles.pointerEvents === "none"
        ? "pointer-events-none"
        : "pointer-events-auto",
    );
  if (styles.objectFit) {
    const m: Record<string, string> = {
      cover: "object-cover",
      contain: "object-contain",
      fill: "object-fill",
      none: "object-none",
      "scale-down": "object-scale-down",
    };
    cls.push(m[styles.objectFit] || `[object-fit:${styles.objectFit}]`);
  }
  if (styles.listStyleType) inlineStyle.listStyleType = styles.listStyleType;

  return { className: cn(cls), style: inlineStyle, fontClassName };
}

// ─── State CSS (hover / active / focus) ──────────────────────────────────────

// ─── JSX helpers ─────────────────────────────────────────────────────────────

function serializeStyle(style: Record<string, string>): string {
  const entries = Object.entries(style)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}: "${v}"`)
    .join(", ");
  return entries ? `{ ${entries} }` : "";
}

function getResponsiveVisibilityClasses(
  showDesktop: boolean,
  showTablet: boolean,
  showMobile: boolean,
  displayVal: string = "block"
): string[] {
  const cls: string[] = [];
  
  if (showDesktop && showTablet && showMobile) {
    return cls;
  }
  if (!showDesktop && !showTablet && !showMobile) {
    cls.push("hidden");
    return cls;
  }
  
  const displayClass = displayVal === "none" ? "block" : displayVal;
  
  if (!showMobile) {
    cls.push("hidden");
    if (showTablet) {
      cls.push(`md:${displayClass}`);
      if (!showDesktop) {
        cls.push("lg:hidden");
      }
    } else if (showDesktop) {
      cls.push(`lg:${displayClass}`);
    }
  } else {
    if (!showTablet && !showDesktop) {
      cls.push("md:hidden");
    } else if (!showTablet && showDesktop) {
      cls.push("md:hidden", `lg:${displayClass}`);
    } else if (showTablet && !showDesktop) {
      cls.push("lg:hidden");
    }
  }
  
  return cls;
}

function toPascalCase(str: string): string {
  return (
    str
      .replace(/['"]/g, "")
      .split(/[\s_\-./]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("") || "Component"
  );
}

function buildCompNameMap(saved: SavedComponent[]): Map<string, string> {
  const map = new Map<string, string>();
  const used = new Set<string>();
  for (const s of saved) {
    let name = toPascalCase(s.name);
    let unique = name;
    let i = 2;
    while (used.has(unique)) unique = `${name}${i++}`;
    used.add(unique);
    map.set(s.id, unique);
  }
  return map;
}

// ─── JSX generation ───────────────────────────────────────────────────────────

function elementToJSX(
  el: CanvasElement,
  usedFonts: Map<string, FontEntry>,
  indent: number,
  compMap: Map<string, string>,
): string {
  const pad = " ".repeat(indent);

  if (el.savedComponentId && compMap.has(el.savedComponentId)) {
    return `${pad}<${compMap.get(el.savedComponentId)} />`;
  }

  const { className, style, fontClassName } = stylesToTailwind(
    el.styles,
    usedFonts,
  );

  const clsParts = className ? className.split(/\s+/).filter(Boolean) : [];

  const displayVal = el.styles.display || "block";
  const showDesktop = el.responsiveVisibility?.desktop ?? true;
  const showTablet = el.responsiveVisibility?.tablet ?? true;
  const showMobile = el.responsiveVisibility?.mobile ?? true;
  const respClasses = getResponsiveVisibilityClasses(showDesktop, showTablet, showMobile, displayVal);
  clsParts.push(...respClasses);

  if (el.hoverStyles && Object.keys(el.hoverStyles).length > 0) {
    const { className: hc } = stylesToTailwind(el.hoverStyles, usedFonts);
    if (hc) {
      clsParts.push(...hc.split(/\s+/).filter(Boolean).map((c) => `hover:${c}`));
    }
  }

  if (el.activeStyles && Object.keys(el.activeStyles).length > 0) {
    const { className: ac } = stylesToTailwind(el.activeStyles, usedFonts);
    if (ac) {
      clsParts.push(...ac.split(/\s+/).filter(Boolean).map((c) => `active:${c}`));
    }
  }

  if (el.focusStyles && Object.keys(el.focusStyles).length > 0) {
    const { className: fc } = stylesToTailwind(el.focusStyles, usedFonts);
    if (fc) {
      clsParts.push(...fc.split(/\s+/).filter(Boolean).map((c) => `focus:${c}`));
    }
  }

  const allClasses = clsParts.join(" ");

  let clsAttr = "";
  if (fontClassName && allClasses)
    clsAttr = ` className={\`${fontClassName} ${allClasses}\`}`;
  else if (fontClassName) clsAttr = ` className={\`${fontClassName}\`}`;
  else if (allClasses) clsAttr = ` className="${allClasses}"`;

  const { transition: _t, ...styleWithoutTransition } = style as any;
  const styleStr = serializeStyle(styleWithoutTransition);
  const styAttr = styleStr ? ` style={${styleStr}}` : "";

  const kids = (el.children || [])
    .map((c) => elementToJSX(c, usedFonts, indent + 2, compMap))
    .join("\n");

  const tagMap: Record<string, string> = {
    heading: "h1",
    heading2: "h2",
    heading3: "h3",
    heading4: "h4",
    heading5: "h5",
    heading6: "h6",
    text: "p",
    paragraph: "p",
    div: "div",
    section: "section",
    article: "article",
    aside: "aside",
    main: "main",
    header: "header",
    nav: "nav",
    footer: "footer",
    span: "span",
    link: "a",
    badge: "span",
    blockquote: "blockquote",
    code: "code",
    pre: "pre",
    label: "label",
    fieldset: "fieldset",
    legend: "legend",
    dialog: "dialog",
    canvas: "canvas",
  };
  const tag = el.htmlTag || tagMap[el.type] || "div";

  if (el.type === "image")
    return `${pad}<img src="${el.src || "/placeholder.jpg"}" alt="${el.alt || ""}"${clsAttr}${styAttr} />`;

  if (el.type === "link" || (el.type === "button" && el.href)) {
    const target =
      el.target === "_blank"
        ? ` target="_blank" rel="noopener noreferrer"`
        : "";
    return `${pad}<a href="${el.href || "#"}"${target}${clsAttr}${styAttr}>\n${pad}  ${el.content || "Link"}\n${pad}</a>`;
  }

  if (el.type === "button")
    return `${pad}<button type="button"${clsAttr}${styAttr}>\n${pad}  ${el.content || "Button"}\n${pad}</button>`;

  if (el.type === "input") {
    const name = el.fieldName ? ` name="${el.fieldName}"` : "";
    return `${pad}<input type="${el.inputType || "text"}"${name} placeholder="${el.placeholder || ""}"${clsAttr}${styAttr} />`;
  }

  if (el.type === "textarea") {
    const name = el.fieldName ? ` name="${el.fieldName}"` : "";
    return `${pad}<textarea${name} placeholder="${el.placeholder || ""}"${clsAttr}${styAttr}></textarea>`;
  }

  if (el.type === "select") {
    const name = el.fieldName ? ` name="${el.fieldName}"` : "";
    const opts = (el.selectOptions || [])
      .map((o) => `${pad}    <option value="${o}">${o}</option>`)
      .join("\n");
    return `${pad}<select${name}${clsAttr}${styAttr}>\n${opts}\n${pad}</select>`;
  }

  if (el.type === "checkbox") {
    const name = el.fieldName ? ` name="${el.fieldName}"` : "";
    return `${pad}<label${clsAttr}${styAttr}>\n${pad}  <input type="checkbox"${name}${el.checked ? " defaultChecked" : ""} />\n${pad}  <span>${el.content || "Label"}</span>\n${pad}</label>`;
  }

  if (el.type === "radio") {
    const name = el.fieldName ? ` name="${el.fieldName}"` : "";
    return `${pad}<label${clsAttr}${styAttr}>\n${pad}  <input type="radio"${name} />\n${pad}  <span>${el.content || "Option"}</span>\n${pad}</label>`;
  }

  if (el.type === "form") {
    const action = el.formAction ? ` action="${el.formAction}"` : "";
    const method = el.formMethod ? ` method="${el.formMethod}"` : "";
    const enctype =
      el.formEnctype && el.formEnctype !== "application/x-www-form-urlencoded"
        ? ` encType="${el.formEnctype}"`
        : "";
    return `${pad}<form${action}${method}${enctype}${clsAttr}${styAttr}>\n${kids}\n${pad}</form>`;
  }

  if (el.type === "label") {
    const htmlFor = el.fieldName ? ` htmlFor="${el.fieldName}"` : "";
    return `${pad}<label${htmlFor}${clsAttr}${styAttr}>\n${pad}  ${el.content || ""}\n${pad}</label>`;
  }

  if (el.type === "dialog") {
    const openAttr = el.open ? " open" : "";
    return `${pad}<dialog${openAttr}${clsAttr}${styAttr}>\n${kids}\n${pad}</dialog>`;
  }

  if (el.type === "canvas") {
    return `${pad}<canvas${clsAttr}${styAttr}></canvas>`;
  }

  if (el.type === "divider") return `${pad}<hr${clsAttr}${styAttr} />`;
  if (el.type === "spacer")
    return `${pad}<div${clsAttr}${styAttr} aria-hidden="true" />`;
  if (el.type === "mark")
    return `${pad}<mark${clsAttr}${styAttr}>${el.content || "highlighted text"}</mark>`;
  if (el.type === "kbd")
    return `${pad}<kbd${clsAttr}${styAttr}>${el.content || "⌘K"}</kbd>`;
  if (el.type === "time")
    return `${pad}<time${el.dateTime ? ` dateTime="${el.dateTime}"` : ""}${clsAttr}${styAttr}>${el.content || "January 1, 2025"}</time>`;
  if (el.type === "progress")
    return `${pad}<progress value={${el.progressValue ?? 60}} max={${el.progressMax ?? 100}}${clsAttr}${styAttr} />`;
  if (el.type === "meter")
    return `${pad}<meter value={${el.progressValue ?? 0.6}} min={0} max={${el.progressMax ?? 1}}${clsAttr}${styAttr} />`;

  if (el.type === "pre") {
    const lang = "typescript";
    const code = (el.content || "// code block\nconst x = 1;").replace(
      /`/g,
      "\\`",
    );
    return [
      `${pad}<div style={{ position: "relative" }}>`,
      `${pad}  <CopyButton code={\`${code}\`} />`,
      `${pad}  <SyntaxHighlighter language="${lang}" style={vscDarkPlus} customStyle={{ borderRadius: "8px", fontSize: "13px", margin: 0 }}>`,
      `${pad}    {\`${code}\`}`,
      `${pad}  </SyntaxHighlighter>`,
      `${pad}</div>`,
    ].join("\n");
  }

  if (el.type === "details") {
    const openAttr = el.open ? " open" : "";
    return `${pad}<details${openAttr}${clsAttr}${styAttr}>\n${pad}  <summary className="cursor-pointer font-medium">${el.content || "Click to expand"}</summary>\n${pad}  <div className="pt-2">Content goes here.</div>\n${pad}</details>`;
  }

  if (el.type === "alert") {
    const variantMap: Record<
      string,
      { bg: string; border: string; color: string; icon: string }
    > = {
      info: { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8", icon: "ℹ" },
      success: {
        bg: "#f0fdf4",
        border: "#bbf7d0",
        color: "#15803d",
        icon: "✓",
      },
      warning: {
        bg: "#fffbeb",
        border: "#fde68a",
        color: "#b45309",
        icon: "⚠",
      },
      error: { bg: "#fef2f2", border: "#fecaca", color: "#b91c1c", icon: "✕" },
    };
    const v = variantMap[el.alertVariant || "info"];
    const alertStyle = serializeStyle({
      ...styleWithoutTransition,
      backgroundColor: v.bg,
      border: `1px solid ${v.border}`,
      color: v.color,
    });
    const alertStyleAttr = alertStyle ? ` style={${alertStyle}}` : "";
    return `${pad}<div${clsAttr}${alertStyleAttr}>\n${pad}  <span style={{ fontWeight: 700, marginRight: "8px" }}>${v.icon}</span>\n${pad}  ${el.content || "This is an alert message."}\n${pad}</div>`;
  }

  if (el.type === "avatar") {
    if (el.avatarSrc)
      return `${pad}<img src="${el.avatarSrc}" alt="${el.avatarInitials || "avatar"}"${clsAttr}${styAttr} />`;
    return `${pad}<div${clsAttr}${styAttr}>${el.avatarInitials || "AB"}</div>`;
  }

  if (el.type === "card" || el.type === "figure") {
    const tag = el.type === "figure" ? "figure" : "div";
    return `${pad}<${tag}${clsAttr}${styAttr}>\n${kids}\n${pad}</${tag}>`;
  }

  if (el.type === "video")
    return `${pad}<video src="${el.videoSrc || ""}"${el.controls ? " controls" : ""}${el.autoPlay ? " autoPlay" : ""}${el.muted ? " muted" : ""}${el.loop ? " loop" : ""}${el.videoPoster ? ` poster="${el.videoPoster}"` : ""}${clsAttr}${styAttr} />`;

  if (el.type === "audio")
    return `${pad}<audio src="${el.src || ""}"${el.controls ? " controls" : ""}${el.autoPlay ? " autoPlay" : ""}${el.loop ? " loop" : ""}${clsAttr}${styAttr} />`;

  if (el.type === "iframe")
    return `${pad}<iframe src="${el.src || ""}"${clsAttr}${styAttr} />`;

  if (el.type === "list") {
    const items = (el.listItems || [])
      .map((item) => `${pad}  <li>${item}</li>`)
      .join("\n");
    return `${pad}<ul${clsAttr}${styAttr}>\n${items}\n${pad}</ul>`;
  }

  if (el.type === "orderedList") {
    const items = (el.listItems || [])
      .map((item) => `${pad}  <li>${item}</li>`)
      .join("\n");
    return `${pad}<ol${clsAttr}${styAttr}>\n${items}\n${pad}</ol>`;
  }

  if (el.type === "icon") {
    const iconName = el.iconName || "Star";
    return `${pad}{/* Icon: ${iconName} — import { ${iconName} } from "lucide-react" */}\n${pad}<span${clsAttr}${styAttr} aria-hidden="true" />`;
  }

  if (el.type === "table") {
    const td = el.tableData || { headers: [], rows: [] };
    const cellPad = el.styles.tableCellPadding || "8px 12px";
    const headerBg = el.styles.tableHeaderBackground || "#f9fafb";
    const stripe = el.styles.tableStripe;
    const borderCollapse = el.styles.borderCollapse || "collapse";
    const cellBorder = "1px solid #e5e7eb";

    const thStyle = `{{ padding: "${cellPad}", background: "${headerBg}", border: "${cellBorder}", textAlign: "left" as const, fontWeight: 600 }}`;
    const ths = td.headers
      .map((h: string) => `${pad}      <th style=${thStyle}>${h}</th>`)
      .join("\n");

    const trs = td.rows
      .map((row: string[], ri: number) => {
        const rowBg = stripe && ri % 2 === 1 ? `, background: "#f9fafb"` : "";
        const tdStyle = `{{ padding: "${cellPad}", border: "${cellBorder}"${rowBg} }}`;
        const tds = row
          .map((c: string) => `${pad}      <td style=${tdStyle}>${c}</td>`)
          .join("\n");
        return `${pad}    <tr>\n${tds}\n${pad}    </tr>`;
      })
      .join("\n");

    const tableStyleStr = serializeStyle({
      ...styleWithoutTransition,
      borderCollapse,
    });
    const tableStyleAttr = tableStyleStr ? ` style={${tableStyleStr}}` : "";

    return [
      `${pad}<table${clsAttr}${tableStyleAttr}>`,
      `${pad}  <thead>`,
      `${pad}    <tr>`,
      ths,
      `${pad}    </tr>`,
      `${pad}  </thead>`,
      `${pad}  <tbody>`,
      trs,
      `${pad}  </tbody>`,
      `${pad}</table>`,
    ].join("\n");
  }

  if (el.type === "navbar") {
    const brand = el.content
      ? `${pad}  <span style={{ fontWeight: 700, fontSize: "20px" }}>${el.content}</span>\n`
      : "";
    return `${pad}<nav${clsAttr}${styAttr}>\n${brand}${kids}\n${pad}</nav>`;
  }

  const inner = kids || (el.content ? `${pad}  ${el.content}` : "");
  return `${pad}<${tag}${clsAttr}${styAttr}>\n${inner}\n${pad}</${tag}>`;
}

// ─── File generators ──────────────────────────────────────────────────────────

function hasPre(elements: CanvasElement[]): boolean {
  for (const el of elements) {
    if (el.type === "pre") return true;
    if (el.children && hasPre(el.children)) return true;
  }
  return false;
}

const COPY_BUTTON_COMPONENT = `
function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ position: "absolute", top: "10px", right: "10px", zIndex: 10, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", color: "#fff", fontSize: "12px", padding: "4px 10px", cursor: "pointer" }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}`;

const SYNTAX_HIGHLIGHTER_IMPORT = `import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";`;

function generateComponentFile(name: string, element: CanvasElement): string {
  const usedFonts = extractFonts([element]);
  const fontImports = generateFontImports(usedFonts);
  const fontInits = generateFontInits(usedFonts);
  const jsx = elementToJSX(element, usedFonts, 4, new Map());
  const needsSyntax = hasPre([element]);
  return [
    `import React from 'react';`,
    needsSyntax ? SYNTAX_HIGHLIGHTER_IMPORT : "",
    fontImports.trimEnd(),
    fontInits ? `\n${fontInits.trimEnd()}\n` : "",
    needsSyntax ? COPY_BUTTON_COMPONENT : "",
    `export default function ${name}() {`,
    `  return (`,
    `    <>`,
    jsx,
    `    </>`,
    `  );`,
    `}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function generatePageCode(
  page: Page,
  compNameMap: Map<string, string> = new Map(),
): string {
  const pageName = toPascalCase(page.name);
  const usedFonts = extractFonts(page.elements);
  const fontImports = generateFontImports(usedFonts);
  const fontInits = generateFontInits(usedFonts);
  const needsSyntax = hasPre(page.elements);

  const usedComps = new Set<string>();
  const walkImports = (el: CanvasElement) => {
    if (el.savedComponentId && compNameMap.has(el.savedComponentId))
      usedComps.add(compNameMap.get(el.savedComponentId)!);
    el.children?.forEach(walkImports);
  };
  page.elements.forEach(walkImports);

  const importLines = [...usedComps]
    .sort()
    .map((n) => `import ${n} from "@/components/${n}";`);
  const bodyJSX = page.elements
    .map((el) => {
      const clonedEl = {
        ...el,
        styles: {
          ...el.styles,
          flexShrink: el.styles.flexShrink !== undefined ? el.styles.flexShrink : 0,
        },
      };
      return elementToJSX(clonedEl, usedFonts, 6, compNameMap);
    })
    .join("\n\n");

  return [
    `import React from 'react';`,
    ...importLines,
    needsSyntax ? SYNTAX_HIGHLIGHTER_IMPORT : "",
    fontImports.trimEnd(),
    fontInits ? `\n${fontInits.trimEnd()}\n` : "",
    needsSyntax ? COPY_BUTTON_COMPONENT : "",
    `export default function ${pageName}Page() {`,
    `  return (`,
    `    <main className="flex flex-col w-full min-h-screen overflow-x-hidden">`,
    bodyJSX,
    `    </main>`,
    `  );`,
    `}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function generateAllPages(
  pages: Page[],
  savedComponents: SavedComponent[] = [],
  designTokens?: DesignTokens,
): Record<string, string> {
  const files: Record<string, string> = {};
  const compNameMap = buildCompNameMap(savedComponents);

  for (const comp of savedComponents) {
    const name = compNameMap.get(comp.id);
    if (name)
      files[`src/components/${name}.tsx`] = generateComponentFile(
        name,
        comp.element,
      );
  }

  for (const page of pages) {
    const filePath =
      page.slug === "/" ? "src/app/page.tsx" : `src/app${page.slug}/page.tsx`;
    files[filePath] = generatePageCode(page, compNameMap);
  }

  const allElements = pages.flatMap((p) => p.elements);
  const allFonts = extractFonts(allElements);
  const layoutFonts = generateFontImports(allFonts);
  const layoutInits = generateFontInits(allFonts);
  const bodyClass = allFonts.size
    ? ` className={\`${[...allFonts.values()].map((f) => `\${${f.varName}.className}`).join(" ")}\`}`
    : "";

  files["src/app/layout.tsx"] = [
    `import "./globals.css";`,
    layoutFonts.trimEnd(),
    layoutInits ? `\n${layoutInits.trimEnd()}` : "",
    `export default function RootLayout({ children }: { children: React.ReactNode }) {`,
    `  return (`,
    `    <html lang="en">`,
    `      <body${bodyClass}>{children}</body>`,
    `    </html>`,
    `  );`,
    `}`,
  ].join("\n");

  let tokensCss = "";
  if (designTokens && designTokens.colors && designTokens.colors.length > 0) {
    const lines = designTokens.colors.map(
      (c: any) => `  --color-${c.name.toLowerCase().replace(/[^a-z0-9]/gi, "-")}: ${c.value};`
    ).join("\n");
    tokensCss = `:root {\n${lines}\n}\n\n`;
  }

  files["src/app/globals.css"] = [
    `@import "tailwindcss";`,
    `@tailwind base;`,
    `@tailwind components;`,
    `@tailwind utilities;`,
    ``,
    tokensCss,
    `html, body {`,
    `  margin: 0;`,
    `  padding: 0;`,
    `  box-sizing: border-box;`,
    `}`,
  ].join("\n");

  return files;
}
