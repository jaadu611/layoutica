import { Page, CanvasElement, StyleProps } from "./types";
import { buildPageHTML } from "./preview";

// ─── Types ───────────────────────────────────────────────────────────────────

export type IssueType =
  | "horizontal_blowout"
  | "container_overflow"
  | "sibling_collision"
  | "aspect_distortion"
  | "text_wrap_jump"
  | "zero_size_collapse"
  | "critic_anomaly";

export type Breakpoint = "desktop" | "tablet" | "mobile";

export interface ReflowIssue {
  id: string;
  elementId: string;
  elementName: string;
  elementType: string;
  pageId: string;
  breakpoint: Breakpoint;
  severity: "error" | "warning" | "info";
  type: IssueType;
  title: string;
  description: string;
  metric?: string;
  suggestedFix?: {
    label: string;
    patch: Partial<StyleProps>;
  };
}

export interface ReflowAnalysisReport {
  timestamp: number;
  totalIssues: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  layoutDisruptionScore: number; // 0 (perfect) to 100 (disrupted)
  breakpointBreakdown: {
    desktop: number;
    tablet: number;
    mobile: number;
  };
  issues: ReflowIssue[];
}

export interface VisionCriticResult {
  densityScore: number;
  aestheticScore: number;
  anomalies: Array<{
    box: [number, number, number, number];
    type: string;
    confidence: number;
  }>;
}

export type VisionCriticHook = (
  canvas: HTMLCanvasElement,
  breakpoint: Breakpoint,
) => Promise<VisionCriticResult>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const genId = () => Math.random().toString(36).slice(2, 9);

function findElementInTree(
  elements: CanvasElement[],
  id: string,
): CanvasElement | null {
  for (const el of elements) {
    if (el.id === id) return el;
    if (el.children && el.children.length > 0) {
      const found = findElementInTree(el.children, id);
      if (found) return found;
    }
  }
  return null;
}

interface MeasuredNode {
  id: string;
  rect: DOMRect;
  scrollWidth: number;
  clientWidth: number;
  scrollHeight: number;
  clientHeight: number;
  computedStyle: CSSStyleDeclaration;
  lineCount: number;
  childrenIds: string[];
}

// ─── Headless Multi-Breakpoint Reflow Runner ──────────────────────────────────

export async function runReflowAnalysis(
  pages: Page[],
  activePageId: string,
  criticHook?: VisionCriticHook,
): Promise<ReflowAnalysisReport> {
  const targetPage = pages.find((p) => p.id === activePageId) || pages[0];
  if (!targetPage) {
    return {
      timestamp: Date.now(),
      totalIssues: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      layoutDisruptionScore: 0,
      breakpointBreakdown: { desktop: 0, tablet: 0, mobile: 0 },
      issues: [],
    };
  }

  const issues: ReflowIssue[] = [];

  // Generate HTML bundle for target page
  const pageHtml = buildPageHTML(targetPage, pages, [], false, false);
  const bodyContentMatch = pageHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const stylesMatch = pageHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
  const innerHtml = bodyContentMatch ? bodyContentMatch[1] : "";
  const styleTags = stylesMatch ? stylesMatch.join("\n") : "";

  // Create isolated headless measurement container in document body
  const sandbox = document.createElement("div");
  sandbox.id = "layoutica-reflow-sandbox";
  sandbox.style.cssText =
    "position:fixed;left:-9999px;top:0;height:100vh;overflow:hidden;pointer-events:none;opacity:0;z-index:-9999;";
  document.body.appendChild(sandbox);

  const BREAKPOINTS: Array<{ key: Breakpoint; width: number }> = [
    { key: "desktop", width: 1280 },
    { key: "tablet", width: 768 },
    { key: "mobile", width: 375 },
  ];

  const measurementsByBp: Record<Breakpoint, Map<string, MeasuredNode>> = {
    desktop: new Map(),
    tablet: new Map(),
    mobile: new Map(),
  };

  try {
    for (const { key, width } of BREAKPOINTS) {
      sandbox.style.width = `${width}px`;
      sandbox.innerHTML = `
        <div style="width:${width}px;margin:0;padding:0;box-sizing:border-box;font-family:Inter,sans-serif;color:#fff;background:#000;">
          ${styleTags}
          ${innerHtml}
        </div>
      `;

      // Allow DOM rendering cycle to settle
      await new Promise((r) => setTimeout(r, 16));

      const nodes = sandbox.querySelectorAll("[data-bid]");
      const measuredMap = new Map<string, MeasuredNode>();

      nodes.forEach((node) => {
        const el = node as HTMLElement;
        const bid = el.getAttribute("data-bid");
        if (!bid) return;

        const rect = el.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(el);

        // Measure line wraps for text nodes
        let lineCount = 1;
        if (el.childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
          try {
            const range = document.createRange();
            range.selectNodeContents(el.childNodes[0]);
            lineCount = Math.max(1, range.getClientRects().length);
          } catch {}
        }

        const childBids: string[] = [];
        el.querySelectorAll(":scope > [data-bid]").forEach((c) => {
          const cBid = c.getAttribute("data-bid");
          if (cBid) childBids.push(cBid);
        });

        measuredMap.set(bid, {
          id: bid,
          rect,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          computedStyle,
          lineCount,
          childrenIds: childBids,
        });
      });

      measurementsByBp[key] = measuredMap;

      // Optional: Vision Critic Hook invocation
      if (criticHook) {
        try {
          const offCanvas = document.createElement("canvas");
          offCanvas.width = width;
          offCanvas.height = Math.min(sandbox.scrollHeight, 1200);
          const criticResult = await criticHook(offCanvas, key);
          if (criticResult.anomalies && criticResult.anomalies.length > 0) {
            criticResult.anomalies.forEach((anomaly) => {
              issues.push({
                id: genId(),
                elementId: "page-root",
                elementName: "Visual Region",
                elementType: "critic",
                pageId: targetPage.id,
                breakpoint: key,
                severity: "info",
                type: "critic_anomaly",
                title: "Vision Model Anomaly",
                description: `Visual Critic flagged ${anomaly.type} (${Math.round(anomaly.confidence * 100)}% confidence).`,
              });
            });
          }
        } catch {}
      }
    }
  } finally {
    if (sandbox.parentElement) {
      sandbox.parentElement.removeChild(sandbox);
    }
  }

  // ─── Differential Delta & Invariants Evaluation ─────────────────────────────

  const desktopMap = measurementsByBp["desktop"];

  (["tablet", "mobile"] as const).forEach((bp) => {
    const bpMap = measurementsByBp[bp];
    const bpWidth = bp === "tablet" ? 768 : 375;

    bpMap.forEach((measured, bid) => {
      const astNode = findElementInTree(targetPage.elements, bid);
      const name = astNode?.metadata?.name || astNode?.type || "Element";
      const type = astNode?.type || "div";

      const desktopNode = desktopMap.get(bid);

      // Invariant 1: Horizontal Window Blowout
      if (measured.rect.right > bpWidth + 2) {
        const overhang = Math.round(measured.rect.right - bpWidth);
        issues.push({
          id: genId(),
          elementId: bid,
          elementName: name,
          elementType: type,
          pageId: targetPage.id,
          breakpoint: bp,
          severity: "error",
          type: "horizontal_blowout",
          title: "Horizontal Window Blowout",
          description: `Element extends ${overhang}px beyond the right edge of ${bp} (${bpWidth}px). Triggers involuntary horizontal scrollbar.`,
          metric: `+${overhang}px overflow`,
          suggestedFix: {
            label: "Constrain width with max-width: 100%",
            patch: { maxWidth: "100%", boxSizing: "border-box" },
          },
        });
      }

      // Invariant 2: Container Content Overflow (Clipped by overflow: hidden)
      if (
        measured.scrollWidth > measured.clientWidth + 3 &&
        measured.computedStyle.overflow !== "visible" &&
        measured.computedStyle.overflowX !== "auto" &&
        measured.computedStyle.overflowX !== "scroll"
      ) {
        const clipped = Math.round(measured.scrollWidth - measured.clientWidth);
        issues.push({
          id: genId(),
          elementId: bid,
          elementName: name,
          elementType: type,
          pageId: targetPage.id,
          breakpoint: bp,
          severity: "error",
          type: "container_overflow",
          title: "Container Clipping Overflow",
          description: `Inner content is ${clipped}px wider than container and is being clipped.`,
          metric: `${clipped}px clipped`,
          suggestedFix: {
            label: "Allow flex wrapping",
            patch: { flexWrap: "wrap" },
          },
        });
      }

      // Invariant 3: Sibling AABB Collisions
      if (measured.childrenIds.length > 1) {
        for (let i = 0; i < measured.childrenIds.length; i++) {
          for (let j = i + 1; j < measured.childrenIds.length; j++) {
            const childA = bpMap.get(measured.childrenIds[i]);
            const childB = bpMap.get(measured.childrenIds[j]);
            if (
              childA &&
              childB &&
              childA.computedStyle.position !== "absolute" &&
              childB.computedStyle.position !== "absolute"
            ) {
              const xOverlap =
                Math.min(childA.rect.right, childB.rect.right) -
                Math.max(childA.rect.left, childB.rect.left);
              const yOverlap =
                Math.min(childA.rect.bottom, childB.rect.bottom) -
                Math.max(childA.rect.top, childB.rect.top);

              if (xOverlap > 4 && yOverlap > 4) {
                const childAst = findElementInTree(
                  targetPage.elements,
                  childA.id,
                );
                issues.push({
                  id: genId(),
                  elementId: childA.id,
                  elementName: childAst?.metadata?.name || childA.id,
                  elementType: childAst?.type || "div",
                  pageId: targetPage.id,
                  breakpoint: bp,
                  severity: "error",
                  type: "sibling_collision",
                  title: "Illegal Element Collision",
                  description: `Overlaps with adjacent sibling by ${Math.round(xOverlap * yOverlap)}px².`,
                  metric: `${Math.round(xOverlap)}x${Math.round(yOverlap)}px collision`,
                  suggestedFix: {
                    label: "Add row gap spacing",
                    patch: { rowGap: "16px" },
                  },
                });
              }
            }
          }
        }
      }

      // Differential Delta: Aspect Ratio Collapse (Squishing / Thinning)
      if (
        desktopNode &&
        desktopNode.rect.width > 30 &&
        desktopNode.rect.height > 20 &&
        measured.rect.width > 0 &&
        measured.rect.height > 0
      ) {
        const desktopAR = desktopNode.rect.width / desktopNode.rect.height;
        const bpAR = measured.rect.width / measured.rect.height;
        const arDelta = bpAR / desktopAR;

        // If aspect ratio collapsed by >65% on mobile while containing flex elements
        if (
          arDelta < 0.35 &&
          measured.rect.height > desktopNode.rect.height * 1.5 &&
          measured.computedStyle.display === "flex" &&
          measured.computedStyle.flexDirection !== "column"
        ) {
          issues.push({
            id: genId(),
            elementId: bid,
            elementName: name,
            elementType: type,
            pageId: targetPage.id,
            breakpoint: bp,
            severity: "warning",
            type: "aspect_distortion",
            title: "Horizontal Row Squished / Thinned",
            description: `Flex row is forced into an unnaturally narrow column (${Math.round(measured.rect.width)}px) without stacking vertically.`,
            metric: `${Math.round((1 - arDelta) * 100)}% ratio distortion`,
            suggestedFix: {
              label: "Stack vertically on mobile (flex-col)",
              patch: { flexDirection: "column" },
            },
          });
        }
      }

      // Differential Delta: Text Line Explosion
      if (
        desktopNode &&
        desktopNode.lineCount === 1 &&
        measured.lineCount >= 3 &&
        (type === "heading" || type === "heading2" || type === "heading3" || type === "navbar")
      ) {
        issues.push({
          id: genId(),
          elementId: bid,
          elementName: name,
          elementType: type,
          pageId: targetPage.id,
          breakpoint: bp,
          severity: "info",
          type: "text_wrap_jump",
          title: "Headline Multi-Line Wrap",
          description: `Header broke from a single desktop line into ${measured.lineCount} lines on ${bp}.`,
          metric: `1 line → ${measured.lineCount} lines`,
          suggestedFix: {
            label: "Scale font down on mobile",
            patch: { fontSize: "clamp(20px, 4vw, 32px)" },
          },
        });
      }

      // Zero-Size Collapse
      if (
        (measured.rect.width === 0 || measured.rect.height === 0) &&
        (astNode?.content || (astNode?.children && astNode.children.length > 0))
      ) {
        issues.push({
          id: genId(),
          elementId: bid,
          elementName: name,
          elementType: type,
          pageId: targetPage.id,
          breakpoint: bp,
          severity: "warning",
          type: "zero_size_collapse",
          title: "Element Collapsed to 0px",
          description: `Element has rendered with 0 ${measured.rect.width === 0 ? "width" : "height"} and is invisible.`,
          suggestedFix: {
            label: "Set min-height",
            patch: { minHeight: "48px" },
          },
        });
      }
    });
  });

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;

  const disruptionScore = Math.min(
    100,
    errorCount * 18 + warningCount * 6 + infoCount * 1,
  );

  return {
    timestamp: Date.now(),
    totalIssues: issues.length,
    errorCount,
    warningCount,
    infoCount,
    layoutDisruptionScore: disruptionScore,
    breakpointBreakdown: {
      desktop: issues.filter((i) => i.breakpoint === "desktop").length,
      tablet: issues.filter((i) => i.breakpoint === "tablet").length,
      mobile: issues.filter((i) => i.breakpoint === "mobile").length,
    },
    issues,
  };
}
