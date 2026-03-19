import { CanvasElement, Page, SavedComponent } from "./types";
import { twMerge } from "tailwind-merge";
import { clsx, type ClassValue } from "clsx";

/**
 * Utility to merge Tailwind classes safely
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

/**
 * Extraction logic to find all fonts used in the canvas tree
 */
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

/**
 * Converts style objects directly to Tailwind arbitrary classes.
 * Replaces spaces with underscores for Tailwind bracket notation.
 */
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

  // 1. Layout & Flex
  if (styles.display) {
    const displayMap: Record<string, string> = {
      flex: "flex",
      grid: "grid",
      block: "block",
      "inline-block": "inline-block",
      none: "hidden",
    };
    cls.push(displayMap[styles.display] || `display-[${styles.display}]`);
  }

  if (styles.flexDirection)
    cls.push(styles.flexDirection === "column" ? "flex-col" : "flex-row");
  if (styles.alignItems) cls.push(`items-[${styles.alignItems}]`);
  if (styles.justifyContent) cls.push(`justify-[${styles.justifyContent}]`);
  if (styles.gap) cls.push(`gap-[${styles.gap.replace(/\s+/g, "_")}]`);

  // 2. Spacing & Sizing
  if (styles.padding) cls.push(`p-[${styles.padding.replace(/\s+/g, "_")}]`);
  if (styles.margin) cls.push(`m-[${styles.margin.replace(/\s+/g, "_")}]`);
  if (styles.width) cls.push(`w-[${styles.width}]`);
  if (styles.height) cls.push(`h-[${styles.height}]`);
  if (styles.maxWidth) cls.push(`max-w-[${styles.maxWidth}]`);

  // 3. Visuals & Borders
  if (styles.backgroundColor) cls.push(`bg-[${styles.backgroundColor}]`);
  if (styles.color) cls.push(`text-[${styles.color}]`);
  if (styles.borderRadius)
    cls.push(`rounded-[${styles.borderRadius.replace(/\s+/g, "_")}]`);

  if (styles.borderWidth || styles.borderStyle || styles.borderColor) {
    cls.push("border");
    if (styles.borderWidth) cls.push(`border-[${styles.borderWidth}]`);
    if (styles.borderStyle && styles.borderStyle !== "solid")
      cls.push(`border-${styles.borderStyle}`);
    if (styles.borderColor) cls.push(`border-[${styles.borderColor}]`);
  }

  // 4. Typography
  if (styles.fontSize) cls.push(`text-[${styles.fontSize}]`);
  if (styles.fontWeight) cls.push(`font-[${styles.fontWeight}]`);
  if (styles.textAlign) cls.push(`text-${styles.textAlign}`);

  // 5. Fonts (Next.js specific)
  if (styles.fontFamily) {
    const entry = usedFonts.get(styles.fontFamily.toLowerCase().trim());
    if (entry) fontClassName = `\${${entry.varName}.className}`;
    else inlineStyle.fontFamily = styles.fontFamily;
  }

  // 6. Complex fallbacks
  if (styles.backgroundImage)
    inlineStyle.backgroundImage = styles.backgroundImage;
  if (styles.transform) inlineStyle.transform = styles.transform;
  if (styles.transition) inlineStyle.transition = styles.transition;
  if (styles.opacity !== undefined) cls.push(`opacity-[${styles.opacity}]`);

  return {
    className: cn(cls),
    style: inlineStyle,
    fontClassName,
  };
}

function serializeStyle(style: Record<string, string>): string {
  const entries = Object.entries(style)
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

/**
 * Recursive JSX Generation
 */
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

  // Construct className using template literals if font classes are present
  const combinedCls = fontClassName
    ? `\`${fontClassName} ${className}\``
    : `"${className}"`;
  const clsAttr =
    className || fontClassName
      ? ` className={${fontClassName ? combinedCls : combinedCls}}`
      : "";
  const finalClsAttr = fontClassName
    ? clsAttr
    : className
      ? ` className="${className}"`
      : "";

  const styleStr = serializeStyle(style);
  const styAttr = styleStr ? ` style={${styleStr}}` : "";

  const kids = (el.children || [])
    .map((c) => elementToJSX(c, usedFonts, indent + 2, compMap))
    .join("\n");

  const tagMap: Record<string, string> = {
    heading: "h1",
    heading2: "h2",
    heading3: "h3",
    text: "p",
    paragraph: "p",
    div: "div",
    button: "button",
    image: "img",
    section: "section",
    navbar: "nav",
    footer: "footer",
  };

  const tag = tagMap[el.type] || "div";

  if (tag === "img") {
    return `${pad}<img src="${el.src || "/placeholder.jpg"}" alt="${el.alt || ""}"${finalClsAttr}${styAttr} />`;
  }

  if (el.type === "button") {
    return `${pad}<button${finalClsAttr}${styAttr}>\n${pad}  ${el.content || "Button"}\n${pad}</button>`;
  }

  return `${pad}<${tag}${finalClsAttr}${styAttr}>
${kids || (el.content ? `${pad}  ${el.content}` : "")}
${pad}</${tag}>`;
}

/**
 * Generate individual component file
 */
function generateComponentFile(name: string, element: CanvasElement): string {
  const usedFonts = extractFonts([element]);
  const fontImports = generateFontImports(usedFonts);
  const fontInits = generateFontInits(usedFonts);
  const jsx = elementToJSX(element, usedFonts, 4, new Map());

  return [
    `import React from 'react';`,
    fontImports.trimEnd(),
    fontInits ? `\n${fontInits.trimEnd()}\n` : "",
    `export default function ${name}() {`,
    `  return (`,
    jsx,
    `  );`,
    `}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Generate full page code
 */
export function generatePageCode(
  page: Page,
  compNameMap: Map<string, string> = new Map(),
): string {
  const pageName = toPascalCase(page.name);
  const usedFonts = extractFonts(page.elements);
  const fontImports = generateFontImports(usedFonts);
  const fontInits = generateFontInits(usedFonts);

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
    .map((el) => elementToJSX(el, usedFonts, 6, compNameMap))
    .join("\n\n");

  return [
    `import React from 'react';`,
    ...importLines,
    fontImports.trimEnd(),
    fontInits ? `\n${fontInits.trimEnd()}\n` : "",
    `export default function ${pageName}Page() {`,
    `  return (`,
    `    <main className="w-full min-h-screen overflow-x-hidden">`,
    bodyJSX,
    `    </main>`,
    `  );`,
    `}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Export everything as a virtual file system
 */
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

  // Setup Layout with all used fonts
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
