import { CanvasElement, Page, SavedComponent, StyleProps } from "./types";
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
            !["inherit", "monospace", "serif", "sans-serif"].includes(key)
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
  if (styles.width) cls.push(`w-[${styles.width}]`);
  if (styles.height) cls.push(`h-[${styles.height}]`);
  if (styles.minWidth) cls.push(`min-w-[${styles.minWidth}]`);
  if (styles.maxWidth) cls.push(`max-w-[${styles.maxWidth}]`);
  if (styles.minHeight) cls.push(`min-h-[${styles.minHeight}]`);
  if (styles.maxHeight) cls.push(`max-h-[${styles.maxHeight}]`);
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
    const parts = styles.padding.trim().split(/\s+/);
    if (parts.length === 1) cls.push(`p-[${sp(styles.padding)}]`);
    else inlineStyle.padding = styles.padding; // multi-value shorthand → inline
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
    const parts = styles.margin.trim().split(/\s+/);
    if (parts.length === 1) cls.push(`m-[${sp(styles.margin)}]`);
    else inlineStyle.margin = styles.margin;
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
  if (styles.backgroundColor) cls.push(`bg-[${styles.backgroundColor}]`);
  if (styles.color) cls.push(`text-[${styles.color}]`);
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

  // Borders — individual sides must be inline (Tailwind can't do arbitrary per-side shorthand)
  if (
    styles.borderTop ||
    styles.borderRight ||
    styles.borderBottom ||
    styles.borderLeft
  ) {
    if (styles.borderTop) inlineStyle.borderTop = styles.borderTop;
    if (styles.borderRight) inlineStyle.borderRight = styles.borderRight;
    if (styles.borderBottom) inlineStyle.borderBottom = styles.borderBottom;
    if (styles.borderLeft) inlineStyle.borderLeft = styles.borderLeft;
  } else if (styles.borderWidth || styles.borderStyle || styles.borderColor) {
    cls.push("border");
    if (styles.borderWidth) cls.push(`border-[${styles.borderWidth}]`);
    if (styles.borderStyle && styles.borderStyle !== "solid")
      cls.push(`border-${styles.borderStyle}`);
    if (styles.borderColor) cls.push(`border-[${styles.borderColor}]`);
  }
  if (styles.borderRadius) {
    const parts = styles.borderRadius.trim().split(/\s+/);
    if (parts.length === 1) cls.push(`rounded-[${styles.borderRadius}]`);
    else inlineStyle.borderRadius = styles.borderRadius;
  }
  if (styles.outline) inlineStyle.outline = styles.outline;

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

const CSS_PROP_SKIP = new Set([
  "gradientType",
  "gradientAngle",
  "gradientStartColor",
  "gradientEndColor",
  "lineClamp",
  "tableStripe",
  "tableHeaderBackground",
  "tableCellPadding",
]);

function styleObjToCSS(styles: Partial<StyleProps>): string {
  const lines: string[] = [];
  for (const [key, val] of Object.entries(styles)) {
    if (val === undefined || val === "" || CSS_PROP_SKIP.has(key)) continue;
    const cssKey = key.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`);
    lines.push(`  ${cssKey}: ${val};`);
  }
  const s = styles as any;
  if (s.gradientType === "linear" && s.gradientStartColor && s.gradientEndColor)
    lines.push(
      `  background-image: linear-gradient(${s.gradientAngle ?? 135}deg, ${s.gradientStartColor}, ${s.gradientEndColor});`,
    );
  if (s.lineClamp)
    lines.push(
      `  display: -webkit-box;`,
      `  -webkit-line-clamp: ${s.lineClamp};`,
      `  -webkit-box-orient: vertical;`,
      `  overflow: hidden;`,
    );
  return lines.join("\n");
}

interface StateCSS {
  selector: string;
  css: string;
}

function buildBaseRule(el: CanvasElement, stateClass: string): StateCSS | null {
  const lines: string[] = [];
  if (el.styles.transition)
    lines.push(`  transition: ${el.styles.transition};`);
  if (!lines.length) return null;
  return { selector: `.${stateClass}`, css: lines.join("\n") };
}

function collectStateCSS(elements: CanvasElement[], rules: StateCSS[]) {
  for (const el of elements) {
    const stateClass = `el-${el.id}`;
    const hasHover = !!(
      el.hoverStyles && Object.keys(el.hoverStyles).length > 0
    );
    const hasActive = !!(
      el.activeStyles && Object.keys(el.activeStyles).length > 0
    );
    const hasFocus = !!(
      (el as any).focusStyles && Object.keys((el as any).focusStyles).length > 0
    );

    if (hasHover || hasActive || hasFocus) {
      const base = buildBaseRule(el, stateClass);
      if (base) rules.push(base);
      if (hasHover) {
        const css = styleObjToCSS(el.hoverStyles!);
        if (css) rules.push({ selector: `.${stateClass}:hover`, css });
      }
      if (hasActive) {
        const css = styleObjToCSS(el.activeStyles!);
        if (css) rules.push({ selector: `.${stateClass}:active`, css });
      }
      if (hasFocus) {
        const css = styleObjToCSS((el as any).focusStyles);
        if (css) rules.push({ selector: `.${stateClass}:focus`, css });
      }
    }
    if (el.children) collectStateCSS(el.children, rules);
  }
}

function buildStateCSSFile(pages: Page[]): string {
  const rules: StateCSS[] = [];
  for (const page of pages) collectStateCSS(page.elements, rules);
  if (!rules.length) return "";
  return rules
    .map(({ selector, css }) => `${selector} {\n${css}\n}`)
    .join("\n\n");
}

// ─── JSX helpers ─────────────────────────────────────────────────────────────

function serializeStyle(style: Record<string, string>): string {
  const entries = Object.entries(style)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}: "${v}"`)
    .join(", ");
  return entries ? `{ ${entries} }` : "";
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
  stateRules: StateCSS[],
): string {
  const pad = " ".repeat(indent);

  if (el.savedComponentId && compMap.has(el.savedComponentId)) {
    return `${pad}<${compMap.get(el.savedComponentId)} />`;
  }

  const { className, style, fontClassName } = stylesToTailwind(
    el.styles,
    usedFonts,
  );

  const hasStateStyles =
    !!(el.hoverStyles && Object.keys(el.hoverStyles).length > 0) ||
    !!(el.activeStyles && Object.keys(el.activeStyles).length > 0) ||
    !!(
      (el as any).focusStyles && Object.keys((el as any).focusStyles).length > 0
    );

  const stateClass = hasStateStyles ? `el-${el.id}` : "";

  if (hasStateStyles) {
    const base = buildBaseRule(el, stateClass);
    if (base) stateRules.push(base);
    if (el.hoverStyles && Object.keys(el.hoverStyles).length > 0) {
      const css = styleObjToCSS(el.hoverStyles);
      if (css) stateRules.push({ selector: `.${stateClass}:hover`, css });
    }
    if (el.activeStyles && Object.keys(el.activeStyles).length > 0) {
      const css = styleObjToCSS(el.activeStyles);
      if (css) stateRules.push({ selector: `.${stateClass}:active`, css });
    }
    if (
      (el as any).focusStyles &&
      Object.keys((el as any).focusStyles).length > 0
    ) {
      const css = styleObjToCSS((el as any).focusStyles);
      if (css) stateRules.push({ selector: `.${stateClass}:focus`, css });
    }
  }

  const allClasses = [className, stateClass].filter(Boolean).join(" ");

  // Strip transition from inline style — it's emitted in the stylesheet via buildBaseRule.
  // This is the fix: inline style transition + stylesheet :hover = no animation.
  // Stylesheet transition + stylesheet :hover = animation works correctly.
  const { transition: _t, ...styleWithoutTransition } = style as any;

  let clsAttr = "";
  if (fontClassName && allClasses)
    clsAttr = ` className={\`${fontClassName} ${allClasses}\`}`;
  else if (fontClassName) clsAttr = ` className={\`${fontClassName}\`}`;
  else if (allClasses) clsAttr = ` className="${allClasses}"`;

  const styleStr = serializeStyle(styleWithoutTransition);
  const styAttr = styleStr ? ` style={${styleStr}}` : "";

  const kids = (el.children || [])
    .map((c) => elementToJSX(c, usedFonts, indent + 2, compMap, stateRules))
    .join("\n");

  const tagMap: Record<string, string> = {
    heading: "h1",
    heading2: "h2",
    heading3: "h3",
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
  };
  const tag = (el as any).htmlTag || tagMap[el.type] || "div";

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
    const name = (el as any).fieldName
      ? ` name="${(el as any).fieldName}"`
      : "";
    return `${pad}<input type="${(el as any).inputType || "text"}"${name} placeholder="${el.placeholder || ""}"${clsAttr}${styAttr} />`;
  }

  if (el.type === "textarea") {
    const name = (el as any).fieldName
      ? ` name="${(el as any).fieldName}"`
      : "";
    return `${pad}<textarea${name} placeholder="${el.placeholder || ""}"${clsAttr}${styAttr}></textarea>`;
  }

  if (el.type === "select") {
    const name = (el as any).fieldName
      ? ` name="${(el as any).fieldName}"`
      : "";
    const opts = (el.selectOptions || [])
      .map((o) => `${pad}    <option value="${o}">${o}</option>`)
      .join("\n");
    return `${pad}<select${name}${clsAttr}${styAttr}>\n${opts}\n${pad}</select>`;
  }

  if (el.type === "checkbox") {
    const name = (el as any).fieldName
      ? ` name="${(el as any).fieldName}"`
      : "";
    return `${pad}<label${clsAttr}${styAttr}>\n${pad}  <input type="checkbox"${name}${el.checked ? " defaultChecked" : ""} />\n${pad}  <span>${el.content || "Label"}</span>\n${pad}</label>`;
  }

  if (el.type === "radio") {
    const name = (el as any).fieldName
      ? ` name="${(el as any).fieldName}"`
      : "";
    return `${pad}<label${clsAttr}${styAttr}>\n${pad}  <input type="radio"${name} />\n${pad}  <span>${el.content || "Option"}</span>\n${pad}</label>`;
  }

  if (el.type === "form") {
    const action = (el as any).formAction
      ? ` action="${(el as any).formAction}"`
      : "";
    const method = (el as any).formMethod
      ? ` method="${(el as any).formMethod}"`
      : "";
    const enctype =
      (el as any).formEnctype &&
      (el as any).formEnctype !== "application/x-www-form-urlencoded"
        ? ` encType="${(el as any).formEnctype}"`
        : "";
    return `${pad}<form${action}${method}${enctype}${clsAttr}${styAttr}>\n${kids}\n${pad}</form>`;
  }

  if (el.type === "divider") return `${pad}<hr${clsAttr}${styAttr} />`;
  if (el.type === "spacer")
    return `${pad}<div${clsAttr}${styAttr} aria-hidden="true" />`;

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
    const iconName = (el as any).iconName || "Star";
    return `${pad}{/* Icon: ${iconName} — import { ${iconName} } from "lucide-react" */}\n${pad}<span${clsAttr}${styAttr} aria-hidden="true" />`;
  }

  if (el.type === "table") {
    const td = (el as any).tableData || { headers: [], rows: [] };
    const ths = td.headers
      .map((h: string) => `${pad}      <th>${h}</th>`)
      .join("\n");
    const trs = td.rows
      .map(
        (row: string[]) =>
          `${pad}    <tr>\n${row.map((c: string) => `${pad}      <td>${c}</td>`).join("\n")}\n${pad}    </tr>`,
      )
      .join("\n");
    return `${pad}<table${clsAttr}${styAttr}>\n${pad}  <thead>\n${pad}    <tr>\n${ths}\n${pad}    </tr>\n${pad}  </thead>\n${pad}  <tbody>\n${trs}\n${pad}  </tbody>\n${pad}</table>`;
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

function generateComponentFile(name: string, element: CanvasElement): string {
  const usedFonts = extractFonts([element]);
  const fontImports = generateFontImports(usedFonts);
  const fontInits = generateFontInits(usedFonts);
  const stateRules: StateCSS[] = [];
  const jsx = elementToJSX(element, usedFonts, 4, new Map(), stateRules);
  const styleBlock = stateRules.length
    ? `\n      <style>{\`\n${stateRules.map(({ selector, css }) => `${selector} {\n${css}\n}`).join("\n\n")}\n      \`}</style>`
    : "";
  return [
    `import React from 'react';`,
    fontImports.trimEnd(),
    fontInits ? `\n${fontInits.trimEnd()}\n` : "",
    `export default function ${name}() {`,
    `  return (`,
    `    <>`,
    styleBlock,
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
  const stateRules: StateCSS[] = [];

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
    .map((el) => elementToJSX(el, usedFonts, 6, compNameMap, stateRules))
    .join("\n\n");

  const stateStyleBlock = stateRules.length
    ? `\n      {/* Interaction styles: hover, active, focus with transitions */}\n      <style>{\`\n${stateRules.map(({ selector, css }) => `${selector} {\n${css}\n}`).join("\n\n")}\n      \`}</style>`
    : "";

  return [
    `import React from 'react';`,
    ...importLines,
    fontImports.trimEnd(),
    fontInits ? `\n${fontInits.trimEnd()}\n` : "",
    `export default function ${pageName}Page() {`,
    `  return (`,
    `    <main className="w-full min-h-screen overflow-x-hidden">`,
    stateStyleBlock,
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

  const allStateCss = buildStateCSSFile(pages);
  if (allStateCss) {
    files["src/app/interactions.css"] = [
      "/* Auto-generated: hover, active, focus, transition rules */",
      "/* Interaction styles are also inlined in each page component. */",
      "",
      allStateCss,
    ].join("\n");
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

  files["src/app/globals.css"] =
    `@tailwind base;\n@tailwind components;\n@tailwind utilities;`;

  return files;
}
