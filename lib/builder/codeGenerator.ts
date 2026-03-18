import { CanvasElement, Page } from "./types";

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
        if (fonts.has(key)) continue;

        if (NEXT_FONT_MAP[key]) {
          const importName = NEXT_FONT_MAP[key];
          const varName = importName.toLowerCase().replace(/_/g, "");
          fonts.set(key, { importName, varName });
        } else if (
          key !== "inherit" &&
          key !== "monospace" &&
          key !== "serif" &&
          key !== "sans-serif"
        ) {
          const baseName = raw.replace(/['"]/g, "").split(",")[0].trim();
          const importName = baseName
            .split(/\s+/)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join("_");
          const varName = baseName.replace(/\s+/g, "").toLowerCase() + "Font";
          fonts.set(key, { importName, varName });
        }
      }
      if (el.children) walk(el.children);
    }
  };
  walk(elements);
  return fonts;
}

function generateFontImports(fonts: Map<string, FontEntry>): string {
  if (fonts.size === 0) return "";
  const names = Array.from(fonts.values()).map((f) => f.importName);
  return `import { ${names.join(", ")} } from "next/font/google";\n`;
}

function generateFontInits(fonts: Map<string, FontEntry>): string {
  if (fonts.size === 0) return "";
  return (
    Array.from(fonts.entries())
      .map(([key, { importName, varName }]) => {
        const isSerif = key.includes("serif");
        const subsets = `["latin"]`;
        const weights = `["400", "500", "600", "700"]`;
        const styleOpt = isSerif ? `, style: ["normal", "italic"]` : "";
        return `const ${varName} = ${importName}({ subsets: ${subsets}, weight: ${weights}${styleOpt} });`;
      })
      .join("\n") + "\n"
  );
}

function stylesToAttrs(
  styles: CanvasElement["styles"],
  usedFonts: Map<string, FontEntry>,
): {
  className: string;
  style: Record<string, string>;
  fontClassName?: string;
} {
  const cls: string[] = [];
  const style: Record<string, string> = {};
  let fontClassName: string | undefined;

  if (styles.display === "flex") {
    cls.push("flex");
    if (styles.flexDirection === "column") cls.push("flex-col");
    else if (styles.flexDirection === "row-reverse")
      cls.push("flex-row-reverse");
    else if (styles.flexDirection === "column-reverse")
      cls.push("flex-col-reverse");

    if (styles.alignItems === "center") cls.push("items-center");
    else if (styles.alignItems === "flex-start") cls.push("items-start");
    else if (styles.alignItems === "flex-end") cls.push("items-end");
    else if (styles.alignItems === "stretch") cls.push("items-stretch");
    else if (styles.alignItems === "baseline") cls.push("items-baseline");

    if (styles.justifyContent === "center") cls.push("justify-center");
    else if (styles.justifyContent === "space-between")
      cls.push("justify-between");
    else if (styles.justifyContent === "space-around")
      cls.push("justify-around");
    else if (styles.justifyContent === "space-evenly")
      cls.push("justify-evenly");
    else if (styles.justifyContent === "flex-end") cls.push("justify-end");
    else if (styles.justifyContent === "flex-start") cls.push("justify-start");
  }

  if (styles.textAlign === "center") cls.push("text-center");
  else if (styles.textAlign === "right") cls.push("text-right");
  else if (styles.textAlign === "left") cls.push("text-left");

  if (styles.fontWeight === "700" || styles.fontWeight === "bold")
    cls.push("font-bold");
  else if (styles.fontWeight === "800") cls.push("font-extrabold");
  else if (styles.fontWeight === "600") cls.push("font-semibold");
  else if (styles.fontWeight === "500") cls.push("font-medium");
  else if (styles.fontWeight === "300") cls.push("font-light");

  if (styles.fontFamily) {
    const key = styles.fontFamily.toLowerCase().trim();
    const entry = usedFonts.get(key);
    if (entry) fontClassName = `\${${entry.varName}.className}`;
  }

  const skipKeys = new Set([
    "display",
    "flexDirection",
    "alignItems",
    "justifyContent",
    "textAlign",
    "fontWeight",
    "fontFamily",
    "gradientType",
    "gradientAngle",
    "gradientStartColor",
    "gradientEndColor",
  ]);

  for (const [key, val] of Object.entries(styles)) {
    if (val === undefined || val === "" || skipKeys.has(key)) continue;
    style[key] = val.toString();
  }

  if (
    styles.gradientType === "linear" &&
    styles.gradientStartColor &&
    styles.gradientEndColor
  ) {
    const angle = styles.gradientAngle ?? 135;
    style["backgroundImage"] =
      `linear-gradient(${angle}deg, ${styles.gradientStartColor}, ${styles.gradientEndColor})`;
  }

  return { className: cls.join(" "), style, fontClassName };
}

function serializeStyle(style: Record<string, string>): string {
  const entries = Object.entries(style)
    .map(([k, v]) => `${k}: "${v}"`)
    .join(", ");
  return `{{ ${entries} }}`;
}

function elementToJSX(
  el: CanvasElement,
  usedFonts: Map<string, FontEntry>,
  indent: number = 4,
): string {
  const pad = " ".repeat(indent);
  const { className, style, fontClassName } = stylesToAttrs(
    el.styles,
    usedFonts,
  );

  const combinedClass = [fontClassName, className].filter(Boolean).join(" ");
  const classAttr = combinedClass
    ? fontClassName
      ? ` className={\`${combinedClass}\`}`
      : ` className="${className}"`
    : "";

  const styleAttr =
    Object.keys(style).length > 0 ? ` style={${serializeStyle(style)}}` : "";

  switch (el.type) {
    case "heading":
      return `${pad}<h1${classAttr}${styleAttr}>${el.content || "Heading"}</h1>`;

    case "text":
      return `${pad}<p${classAttr}${styleAttr}>${el.content || "Text"}</p>`;

    case "button": {
      const target = el.target ? ` target="${el.target}"` : "";
      const rel = el.target === "_blank" ? ` rel="noopener noreferrer"` : "";
      return `${pad}<a href="${el.href || "#"}"${target}${rel}${classAttr}${styleAttr}>\n${pad}  ${el.content || "Button"}\n${pad}</a>`;
    }

    case "image":
      return `${pad}<img src="${el.src || "/placeholder.jpg"}" alt="${el.alt || "image"}"${classAttr}${styleAttr} />`;

    case "navbar": {
      const childrenJSX = (el.children || [])
        .map((c) => elementToJSX(c, usedFonts, indent + 4))
        .join("\n");
      const navLinks =
        childrenJSX ||
        `${pad}    <a href="/">Home</a>\n${pad}    <a href="/about">About</a>\n${pad}    <a href="/contact">Contact</a>`;
      return `${pad}<nav${classAttr}${styleAttr}>\n${pad}  <span style={{fontWeight: "700", fontSize: "20px"}}>${el.content || "Brand"}</span>\n${pad}  <div className="flex gap-6">\n${navLinks}\n${pad}  </div>\n${pad}</nav>`;
    }

    case "footer":
      return `${pad}<footer${classAttr}${styleAttr}>\n${pad}  ${el.content || "Footer"}\n${pad}</footer>`;

    case "section": {
      const childrenJSX = (el.children || [])
        .map((c) => elementToJSX(c, usedFonts, indent + 2))
        .join("\n");
      return `${pad}<section${classAttr}${styleAttr}>\n${childrenJSX || `${pad}  `}\n${pad}</section>`;
    }

    default:
      return `${pad}<div${classAttr}${styleAttr}>${el.content || ""}</div>`;
  }
}

export function generatePageCode(page: Page): string {
  const componentName = page.name
    .split(/[\s-_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");

  const usedFonts = extractFonts(page.elements);
  const fontImports = generateFontImports(usedFonts);
  const fontInits = generateFontInits(usedFonts);
  const bodyJSX = page.elements
    .map((el) => elementToJSX(el, usedFonts, 6))
    .join("\n\n");

  const lines: string[] = [];
  if (fontImports) lines.push(fontImports.trimEnd());
  if (fontInits) lines.push("", fontInits.trimEnd(), "");
  lines.push(
    `export default function ${componentName}Page() {`,
    `  return (`,
    `    <main>`,
    bodyJSX,
    `    </main>`,
    `  );`,
    `}`,
    ``,
  );

  return lines.join("\n");
}

export function generateAllPages(pages: Page[]): Record<string, string> {
  const files: Record<string, string> = {};

  for (const page of pages) {
    const filePath =
      page.slug === "/" ? "src/app/page.tsx" : `src/app${page.slug}/page.tsx`;
    files[filePath] = generatePageCode(page);
  }

  const allFonts = new Map<string, FontEntry>();
  for (const page of pages) {
    for (const [k, v] of extractFonts(page.elements)) allFonts.set(k, v);
  }

  const layoutFontImports = generateFontImports(allFonts);
  const layoutFontInits = generateFontInits(allFonts);
  const bodyClassAttr =
    allFonts.size > 0
      ? ` className={\`${Array.from(allFonts.values())
          .map((f) => `\${${f.varName}.className}`)
          .join(" ")}\`}`
      : "";

  files["src/app/layout.tsx"] = [
    `import type { Metadata } from "next";`,
    `import "./globals.css";`,
    ...(layoutFontImports ? [layoutFontImports.trimEnd()] : []),
    ``,
    ...(layoutFontInits ? [layoutFontInits.trimEnd(), ``] : []),
    `export const metadata: Metadata = {`,
    `  title: "My Site",`,
    `  description: "Built with Visual Builder",`,
    `};`,
    ``,
    `export default function RootLayout({`,
    `  children,`,
    `}: {`,
    `  children: React.ReactNode;`,
    `}) {`,
    `  return (`,
    `    <html lang="en">`,
    `      <body${bodyClassAttr}>{children}</body>`,
    `    </html>`,
    `  );`,
    `}`,
    ``,
  ].join("\n");

  files["src/app/globals.css"] = [
    `@tailwind base;`,
    `@tailwind components;`,
    `@tailwind utilities;`,
    ``,
    `* {`,
    `  box-sizing: border-box;`,
    `  margin: 0;`,
    `  padding: 0;`,
    `}`,
    ``,
  ].join("\n");

  files["tailwind.config.ts"] = [
    `import type { Config } from "tailwindcss";`,
    ``,
    `export default {`,
    `  content: ["./src/**/*.{ts,tsx}"],`,
    `  theme: { extend: {} },`,
    `  plugins: [],`,
    `} satisfies Config;`,
    ``,
  ].join("\n");

  return files;
}
