import { CanvasElement, Page } from "./types";

function stylesToAttrs(styles: CanvasElement["styles"]): {
  className: string;
  style: Record<string, string>;
} {
  const cls: string[] = [];
  const style: Record<string, string> = {};

  if (styles.display === "flex") {
    cls.push("flex");
    if (styles.flexDirection === "column") cls.push("flex-col");
    if (styles.alignItems === "center") cls.push("items-center");
    else if (styles.alignItems === "flex-start") cls.push("items-start");
    else if (styles.alignItems === "flex-end") cls.push("items-end");
    else if (styles.alignItems === "stretch") cls.push("items-stretch");
    if (styles.justifyContent === "center") cls.push("justify-center");
    else if (styles.justifyContent === "space-between")
      cls.push("justify-between");
    else if (styles.justifyContent === "space-around")
      cls.push("justify-around");
    else if (styles.justifyContent === "flex-end") cls.push("justify-end");
  }

  if (styles.textAlign === "center") cls.push("text-center");
  else if (styles.textAlign === "right") cls.push("text-right");

  if (styles.fontWeight === "700" || styles.fontWeight === "bold")
    cls.push("font-bold");
  else if (styles.fontWeight === "800") cls.push("font-extrabold");
  else if (styles.fontWeight === "600") cls.push("font-semibold");
  else if (styles.fontWeight === "500") cls.push("font-medium");
  else if (styles.fontWeight === "300") cls.push("font-light");

  if (styles.width === "100%") cls.push("w-full");
  else if (styles.width) style.width = styles.width;

  if (styles.height === "100%") cls.push("h-full");
  else if (styles.height) style.height = styles.height;

  const inlineProps: (keyof typeof styles)[] = [
    "color",
    "backgroundColor",
    "fontSize",
    "padding",
    "margin",
    "borderRadius",
    "gap",
  ];
  for (const key of inlineProps) {
    const val = styles[key];
    if (val) {
      const cssProp = key.replace(/([A-Z])/g, "-$1").toLowerCase();
      style[cssProp] = val as string;
    }
  }

  return { className: cls.join(" "), style };
}

function elementToJSX(el: CanvasElement, indent: number = 4): string {
  const pad = " ".repeat(indent);
  const { className, style } = stylesToAttrs(el.styles);

  const classAttr = className ? ` className="${className}"` : "";
  const styleAttr =
    Object.keys(style).length > 0
      ? ` style={${JSON.stringify(style).replace(/"([^"]+)":/g, "$1:")}}`
      : "";

  switch (el.type) {
    case "heading":
      return `${pad}<h1${classAttr}${styleAttr}>${el.content || "Heading"}</h1>`;

    case "text":
      return `${pad}<p${classAttr}${styleAttr}>${el.content || "Text"}</p>`;

    case "button":
      return `${pad}<a\n${pad}  href="${el.href || "#"}"\n${pad}  ${classAttr ? `className="${className}"` : ""}\n${pad}  ${styleAttr ? `style={${JSON.stringify(style).replace(/"([^"]+)":/g, "$1:")}}` : ""}\n${pad}>\n${pad}  ${el.content || "Button"}\n${pad}</a>`;

    case "image":
      return `${pad}<img\n${pad}  src="${el.src || "/placeholder.jpg"}"\n${pad}  alt="${el.alt || "image"}"\n${pad}  ${classAttr ? `className="${className}"` : ""}\n${pad}  ${styleAttr ? `style={${JSON.stringify(style).replace(/"([^"]+)":/g, "$1:")}}` : ""}\n${pad}/>`;

    case "navbar": {
      const childrenJSX = (el.children || [])
        .map((c) => elementToJSX(c, indent + 4))
        .join("\n");
      const navLinks =
        childrenJSX ||
        `${pad}    <a href="/">Home</a>\n${pad}    <a href="/about">About</a>\n${pad}    <a href="/contact">Contact</a>`;
      return `${pad}<nav${classAttr}${styleAttr}>\n${pad}  <span style={{fontWeight:"700",fontSize:"20px"}}>${el.content || "Brand"}</span>\n${pad}  <div className="flex gap-6">\n${navLinks}\n${pad}  </div>\n${pad}</nav>`;
    }

    case "footer":
      return `${pad}<footer${classAttr}${styleAttr}>\n${pad}  ${el.content || "Footer"}\n${pad}</footer>`;

    case "section": {
      const childrenJSX = (el.children || [])
        .map((c) => elementToJSX(c, indent + 2))
        .join("\n");
      return `${pad}<section${classAttr}${styleAttr}>\n${childrenJSX || `${pad}  {/* empty section */}`}\n${pad}</section>`;
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

  const bodyJSX = page.elements.map((el) => elementToJSX(el, 6)).join("\n\n");

  return [
    `export default function ${componentName}Page() {`,
    `  return (`,
    `    <main>`,
    bodyJSX,
    `    </main>`,
    `  );`,
    `}`,
    ``,
  ].join("\n");
}

export function generateAllPages(pages: Page[]): Record<string, string> {
  const files: Record<string, string> = {};

  for (const page of pages) {
    const filePath =
      page.slug === "/" ? "src/app/page.tsx" : `src/app${page.slug}/page.tsx`;
    files[filePath] = generatePageCode(page);
  }

  files["src/app/layout.tsx"] = [
    `import type { Metadata } from "next";`,
    `import "./globals.css";`,
    ``,
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
    `      <body>{children}</body>`,
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
