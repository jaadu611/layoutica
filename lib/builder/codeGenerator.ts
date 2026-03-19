import { CanvasElement, Page, SavedComponent, StyleProps } from "./types";

function elementToJSX(
  el: CanvasElement,
  indent: number,
  compMap: Map<string, string>,
): string {
  const pad = " ".repeat(indent);

  if (el.savedComponentId && compMap.has(el.savedComponentId)) {
    return `${pad}<${compMap.get(el.savedComponentId)} />`;
  }

  const cleanStyles = Object.entries(el.styles).reduce(
    (acc, [key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== "" &&
        key !== "gradientType" &&
        key !== "gradientAngle" &&
        key !== "gradientStartColor" &&
        key !== "gradientEndColor"
      ) {
        acc[key] = typeof value === "number" ? `${value}px` : String(value);
      }
      return acc;
    },
    {} as Record<string, string>,
  );

  if (el.styles.gradientType === "linear") {
    cleanStyles.backgroundImage = `linear-gradient(${el.styles.gradientAngle ?? 135}deg, ${el.styles.gradientStartColor}, ${el.styles.gradientEndColor ?? "transparent"})`;
  }

  const styleString =
    Object.keys(cleanStyles).length > 0
      ? ` style={{ ${Object.entries(cleanStyles)
          .map(([k, v]) => `${k}: "${v}"`)
          .join(", ")} }}`
      : "";

  const children = el.children?.length
    ? `\n${el.children.map((c) => elementToJSX(c, indent + 2, compMap)).join("\n")}\n${pad}`
    : el.content || "";

  const tags: Record<string, string> = {
    heading: "h1",
    heading2: "h2",
    heading3: "h3",
    paragraph: "p",
    text: "p",
    span: "span",
    link: "a",
    button: "a",
    image: "img",
    navbar: "nav",
    divider: "hr",
    section: "section",
    article: "article",
    aside: "aside",
    main: "main",
    header: "header",
    nav: "nav",
    form: "form",
    footer: "footer",
    blockquote: "blockquote",
    code: "code",
    pre: "pre",
    list: "ul",
    orderedList: "ol",
    video: "video",
    audio: "audio",
    iframe: "iframe",
    icon: "span",
    badge: "span",
    spacer: "div",
    input: "input",
    textarea: "textarea",
    select: "select",
    checkbox: "input",
    radio: "input",
    table: "table",
  };

  const tag =
    el.htmlTag || tags[el.type as keyof typeof tags] || el.type || "div";
  const href = tag === "a" ? ` href="${el.href || "#"}"` : "";
  const src =
    tag === "img" ? ` src="${el.src || ""}" alt="${el.alt || ""}"` : "";

  if (["img", "hr", "input"].includes(tag)) {
    return `${pad}<${tag}${src}${styleString} />`;
  }

  return `${pad}<${tag}${href}${styleString}>${children}</${tag}>`;
}

export function generatePageCode(
  page: Page,
  compMap: Map<string, string>,
): string {
  const name = page.name.replace(/\s+/g, "");
  const content = page.elements
    .map((el) => elementToJSX(el, 6, compMap))
    .join("\n\n");

  return `
import React from 'react';

export default function ${name}Page() {
  return (
    <main style={{ minHeight: '100vh', width: '100%' }}>
${content}
    </main>
  );
}
`.trim();
}

export function generateAllPages(
  pages: Page[],
  saved: SavedComponent[],
): Record<string, string> {
  const files: Record<string, string> = {};
  const compMap = new Map(saved.map((s) => [s.id, s.name.replace(/\s+/g, "")]));

  saved.forEach((s) => {
    const name = compMap.get(s.id)!;
    files[`src/components/${name}.tsx`] = `
import React from 'react';

export default function ${name}() {
  return (
${elementToJSX(s.element, 4, new Map())}
  );
}
`.trim();
  });

  pages.forEach((p) => {
    const path =
      p.slug === "/" ? "src/app/page.tsx" : `src/app${p.slug}/page.tsx`;
    files[path] = generatePageCode(p, compMap);
  });

  files["src/app/layout.tsx"] = `
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Generated Site",
  description: "Built with Layoutica",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, boxSizing: 'border-box' }}>
        {children}
      </body>
    </html>
  );
}
`.trim();

  files["src/app/globals.css"] = "body { margin: 0; font-family: sans-serif; }";

  return files;
}
