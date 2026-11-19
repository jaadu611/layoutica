import { CanvasElement, Page } from "./types";
import {
  ColorToken,
  TypographyToken,
  SpacingToken,
  DesignTokens,
} from "./projectSaverLoader";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const genId = () => Math.random().toString(36).slice(2, 8);

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Convert 3-digit hex to 6-digit hex
function normalizeHex(hex: string): string {
  const clean = hex.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(clean)) {
    return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`;
  }
  return clean;
}

// Convert rgb/rgba or hex to normalized color string
function normalizeColor(color: string): string | null {
  if (!color || typeof color !== "string") return null;
  const c = color.trim().toLowerCase();
  if (
    !c ||
    c === "transparent" ||
    c === "inherit" ||
    c === "initial" ||
    c === "unset" ||
    c === "none" ||
    c === "currentcolor"
  ) {
    return null;
  }
  if (c.startsWith("#")) {
    return normalizeHex(c);
  }
  return c;
}

// Simple color naming heuristic based on hex/rgb
function nameColor(hex: string, index: number): string {
  if (hex.startsWith("#") && (hex.length === 7 || hex.length === 9)) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 510; // 0 to 1
    const d = max - min;
    const s = l > 0.5 ? d / (510 - max - min) : d / (max + min);

    if (l < 0.08) return "canvas-dark";
    if (l < 0.18 && s < 0.2) return "surface-dark";
    if (l > 0.95 && s < 0.1) return "surface-white";
    if (l > 0.85 && s < 0.1) return "surface-light";
    if (s < 0.15) {
      if (l < 0.4) return "neutral-muted";
      if (l < 0.7) return "neutral-base";
      return "neutral-light";
    }

    let h = 0;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;

    if (h >= 195 && h <= 250) return "brand-primary";
    if (h > 250 && h <= 290) return "accent-purple";
    if (h > 290 && h <= 340) return "accent-pink";
    if (h > 340 || h <= 15) return "accent-red";
    if (h > 15 && h <= 45) return "accent-orange";
    if (h > 45 && h <= 70) return "accent-amber";
    if (h > 70 && h <= 165) return "accent-emerald";
    if (h > 165 && h < 195) return "accent-cyan";
  }
  return `color-${index + 1}`;
}

// ─── Recursive Element Traversal ──────────────────────────────────────────────

function collectElements(elements: CanvasElement[]): CanvasElement[] {
  const result: CanvasElement[] = [];
  function traverse(list: CanvasElement[]) {
    for (const el of list) {
      result.push(el);
      if (Array.isArray(el.children) && el.children.length > 0) {
        traverse(el.children);
      }
    }
  }
  traverse(elements);
  return result;
}

// ─── Token Extraction ─────────────────────────────────────────────────────────

export function extractDesignTokens(pages: Page[]): DesignTokens {
  const allElements: CanvasElement[] = [];
  for (const p of pages) {
    if (Array.isArray(p.elements)) {
      allElements.push(...collectElements(p.elements));
    }
  }

  // 1. Color Extraction
  const colorCounts = new Map<string, number>();
  function registerColor(val?: string) {
    const norm = normalizeColor(val || "");
    if (norm) {
      colorCounts.set(norm, (colorCounts.get(norm) || 0) + 1);
    }
  }

  for (const el of allElements) {
    const s = el.styles || {};
    registerColor(s.color);
    registerColor(s.backgroundColor);
    registerColor(s.borderColor);
    registerColor(s.borderTop);
    registerColor(s.borderRight);
    registerColor(s.borderBottom);
    registerColor(s.borderLeft);
    registerColor(s.gradientStartColor);
    registerColor(s.gradientEndColor);

    // Extract colors from border shorthand if any
    if (s.border) {
      const match = s.border.match(/(#[0-9a-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/i);
      if (match) registerColor(match[1]);
    }
  }

  // Sort colors by frequency descending
  const sortedColors = Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color);

  const colors: ColorToken[] = [];
  const usedNames = new Set<string>();

  sortedColors.forEach((hex, idx) => {
    let baseName = nameColor(hex, idx);
    let name = baseName;
    let count = 2;
    while (usedNames.has(name)) {
      name = `${baseName}-${count++}`;
    }
    usedNames.add(name);
    colors.push({
      id: genId(),
      name,
      value: hex,
    });
  });

  // 2. Spacing Extraction
  const spacingSet = new Set<number>();
  function parseSpacingPx(val?: string) {
    if (!val || typeof val !== "string") return;
    const parts = val.trim().split(/\s+/);
    for (const p of parts) {
      const match = p.match(/^([0-9.]+)(px)?$/);
      if (match) {
        const num = parseFloat(match[1]);
        if (num > 0 && num <= 400 && Number.isFinite(num)) {
          spacingSet.add(num);
        }
      }
    }
  }

  for (const el of allElements) {
    const s = el.styles || {};
    parseSpacingPx(s.padding);
    parseSpacingPx(s.paddingTop);
    parseSpacingPx(s.paddingRight);
    parseSpacingPx(s.paddingBottom);
    parseSpacingPx(s.paddingLeft);
    parseSpacingPx(s.margin);
    parseSpacingPx(s.marginTop);
    parseSpacingPx(s.marginRight);
    parseSpacingPx(s.marginBottom);
    parseSpacingPx(s.marginLeft);
    parseSpacingPx(s.gap);
    parseSpacingPx(s.rowGap);
    parseSpacingPx(s.columnGap);
  }

  // Sort spacing ascending
  const sortedSpacing = Array.from(spacingSet).sort((a, b) => a - b);
  const spacing: SpacingToken[] = sortedSpacing.map((px) => {
    let name = `space-${px}`;
    // Standard Tailwind scale heuristics
    if (px === 4) name = "space-1";
    else if (px === 8) name = "space-2";
    else if (px === 12) name = "space-3";
    else if (px === 16) name = "space-4";
    else if (px === 20) name = "space-5";
    else if (px === 24) name = "space-6";
    else if (px === 32) name = "space-8";
    else if (px === 40) name = "space-10";
    else if (px === 48) name = "space-12";
    else if (px === 64) name = "space-16";
    else if (px === 80) name = "space-20";
    else if (px === 96) name = "space-24";
    else if (px === 128) name = "space-32";

    return {
      id: genId(),
      name,
      value: `${px}px`,
    };
  });

  // 3. Typography Extraction
  const typoMap = new Map<string, { fontSize: string; fontWeight: string; lineHeight: string }>();

  for (const el of allElements) {
    const s = el.styles || {};
    if (s.fontSize || s.fontWeight) {
      const fontSize = s.fontSize || "16px";
      const fontWeight = s.fontWeight || "400";
      const lineHeight = s.lineHeight || "1.5";
      const key = `${fontSize}_${fontWeight}_${lineHeight}`;
      if (!typoMap.has(key)) {
        typoMap.set(key, { fontSize, fontWeight, lineHeight });
      }
    }
  }

  // Sort typography descending by font-size px
  const sortedTypo = Array.from(typoMap.values()).sort((a, b) => {
    const numA = parseFloat(a.fontSize) || 16;
    const numB = parseFloat(b.fontSize) || 16;
    return numB - numA;
  });

  const typography: TypographyToken[] = sortedTypo.map((item) => {
    const px = parseFloat(item.fontSize) || 16;
    const wt = parseInt(item.fontWeight, 10) || 400;

    let name = `text-${px}`;
    if (px >= 40) name = "display-hero";
    else if (px >= 32) name = wt >= 600 ? "heading-xl" : "title-xl";
    else if (px >= 24) name = wt >= 600 ? "heading-lg" : "title-lg";
    else if (px >= 20) name = wt >= 600 ? "heading-md" : "title-md";
    else if (px >= 18) name = "heading-sm";
    else if (px >= 16) name = wt >= 600 ? "body-bold" : "body-base";
    else if (px >= 14) name = wt >= 600 ? "body-sm-bold" : "body-sm";
    else if (px <= 12) name = "caption";

    return {
      id: genId(),
      name,
      fontSize: item.fontSize,
      fontWeight: item.fontWeight,
      lineHeight: item.lineHeight,
      letterSpacing: "0",
    };
  });

  return { colors, spacing, typography };
}

// ─── Token Merging ────────────────────────────────────────────────────────────

export function mergeDesignTokens(
  existing: DesignTokens,
  extracted: DesignTokens,
): DesignTokens {
  const existingColors = existing.colors || [];
  const existingSpacing = existing.spacing || [];
  const existingTypography = existing.typography || [];

  const mergedColors = [...existingColors];
  for (const c of extracted.colors) {
    const valMatch = existingColors.some(
      (ec) => ec.value.toLowerCase() === c.value.toLowerCase(),
    );
    if (!valMatch) {
      mergedColors.push(c);
    }
  }

  const mergedSpacing = [...existingSpacing];
  for (const s of extracted.spacing) {
    const valMatch = existingSpacing.some((es) => es.value === s.value);
    if (!valMatch) {
      mergedSpacing.push(s);
    }
  }

  const mergedTypography = [...existingTypography];
  for (const t of extracted.typography) {
    const match = existingTypography.some(
      (et) =>
        et.fontSize === t.fontSize &&
        et.fontWeight === t.fontWeight &&
        et.lineHeight === t.lineHeight,
    );
    if (!match) {
      mergedTypography.push(t);
    }
  }

  return {
    colors: mergedColors,
    spacing: mergedSpacing,
    typography: mergedTypography,
  };
}

// ─── Export Generators ────────────────────────────────────────────────────────

export function generateCssVariables(tokens: DesignTokens): string {
  const colorLines = (tokens.colors || []).map(
    (c) => `  --color-${slugify(c.name)}: ${c.value};`,
  );

  const spacingLines = (tokens.spacing || []).map(
    (s) => `  --spacing-${slugify(s.name)}: ${s.value};`,
  );

  const typoLines = (tokens.typography || []).flatMap((t) => {
    const slug = slugify(t.name);
    return [
      `  --font-size-${slug}: ${t.fontSize};`,
      `  --font-weight-${slug}: ${t.fontWeight};`,
      `  --line-height-${slug}: ${t.lineHeight};`,
    ];
  });

  const sections: string[] = [];
  if (colorLines.length > 0) {
    sections.push(`  /* Colors */\n${colorLines.join("\n")}`);
  }
  if (spacingLines.length > 0) {
    sections.push(`  /* Spacing Scales */\n${spacingLines.join("\n")}`);
  }
  if (typoLines.length > 0) {
    sections.push(`  /* Typography */\n${typoLines.join("\n")}`);
  }

  return `:root {\n${sections.join("\n\n")}\n}`;
}

export function generateTailwindExtend(tokens: DesignTokens): string {
  const colorProps = (tokens.colors || []).map(
    (c) => `      "${slugify(c.name)}": "var(--color-${slugify(c.name)}, ${c.value})"`,
  );

  const spacingProps = (tokens.spacing || []).map(
    (s) => `      "${slugify(s.name).replace(/^space-/, "")}": "var(--spacing-${slugify(s.name)}, ${s.value})"`,
  );

  const typoProps = (tokens.typography || []).map(
    (t) =>
      `      "${slugify(t.name)}": ["var(--font-size-${slugify(t.name)}, ${t.fontSize})", { lineHeight: "var(--line-height-${slugify(t.name)}, ${t.lineHeight})", fontWeight: "var(--font-weight-${slugify(t.name)}, ${t.fontWeight})" }]`,
  );

  const parts: string[] = [];
  if (colorProps.length > 0) {
    parts.push(`    colors: {\n${colorProps.join(",\n")},\n    }`);
  }
  if (spacingProps.length > 0) {
    parts.push(`    spacing: {\n${spacingProps.join(",\n")},\n    }`);
  }
  if (typoProps.length > 0) {
    parts.push(`    fontSize: {\n${typoProps.join(",\n")},\n    }`);
  }

  return `theme: {\n  extend: {\n${parts.join(",\n")}\n  }\n}`;
}

export function generateScssMaps(tokens: DesignTokens): string {
  const colorItems = (tokens.colors || []).map(
    (c) => `  "${slugify(c.name)}": ${c.value},`,
  );

  const spacingItems = (tokens.spacing || []).map(
    (s) => `  "${slugify(s.name)}": ${s.value},`,
  );

  const typoItems = (tokens.typography || []).map(
    (t) =>
      `  "${slugify(t.name)}": (\n    "font-size": ${t.fontSize},\n    "font-weight": ${t.fontWeight},\n    "line-height": ${t.lineHeight}\n  ),`,
  );

  return [
    `// Design Tokens SCSS Map`,
    `$tokens-colors: (\n${colorItems.join("\n")}\n);`,
    ``,
    `$tokens-spacing: (\n${spacingItems.join("\n")}\n);`,
    ``,
    `$tokens-typography: (\n${typoItems.join("\n")}\n);`,
  ].join("\n");
}

export function generateDtcgJson(tokens: DesignTokens): string {
  const dtcg: Record<string, any> = {
    $schema: "https://design-tokens.github.io/community-group/format/",
    color: {},
    spacing: {},
    typography: {},
  };

  for (const c of tokens.colors || []) {
    dtcg.color[slugify(c.name)] = {
      $value: c.value,
      $type: "color",
      $description: `Color token ${c.name}`,
    };
  }

  for (const s of tokens.spacing || []) {
    dtcg.spacing[slugify(s.name)] = {
      $value: s.value,
      $type: "dimension",
      $description: `Spacing scale ${s.name}`,
    };
  }

  for (const t of tokens.typography || []) {
    dtcg.typography[slugify(t.name)] = {
      $type: "typography",
      $value: {
        fontSize: t.fontSize,
        fontWeight: t.fontWeight,
        lineHeight: t.lineHeight,
      },
    };
  }

  return JSON.stringify(dtcg, null, 2);
}

// ─── Layout Hardcoded Value Token Mapper ──────────────────────────────────────

export function mapLayoutToTokens(
  pages: Page[],
  tokens: DesignTokens,
): { updatedPages: Page[]; replacementsCount: number } {
  let replacementsCount = 0;

  // Build lookup maps
  const colorMap = new Map<string, string>();
  for (const c of tokens.colors || []) {
    colorMap.set(normalizeHex(c.value), `var(--color-${slugify(c.name)})`);
  }

  function transformElement(el: CanvasElement): CanvasElement {
    const s = { ...el.styles };
    let modified = false;

    // Map color props
    const colorProps: (keyof typeof s)[] = [
      "color",
      "backgroundColor",
      "borderColor",
      "gradientStartColor",
      "gradientEndColor",
    ];

    for (const prop of colorProps) {
      const val = s[prop];
      if (typeof val === "string" && !val.startsWith("var(")) {
        const norm = normalizeHex(val);
        if (colorMap.has(norm)) {
          (s as any)[prop] = colorMap.get(norm)!;
          replacementsCount++;
          modified = true;
        }
      }
    }

    const transformedChildren = el.children?.map(transformElement);

    return {
      ...el,
      styles: modified ? s : el.styles,
      children: transformedChildren,
    };
  }

  const updatedPages = pages.map((p) => ({
    ...p,
    elements: p.elements.map(transformElement),
  }));

  return { updatedPages, replacementsCount };
}
