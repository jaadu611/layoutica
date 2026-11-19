import { Page, CanvasElement } from "./types";
import { buildPageHTML } from "./preview";

// ─── Viewport Snapshotter ─────────────────────────────────────────────────────
// Renders responsive viewports into SVG foreignObject data URLs for inspection
// and future Small VLM visual inputs.

export interface ViewportSnapshot {
  breakpoint: "desktop" | "tablet" | "mobile";
  width: number;
  height: number;
  dataUrl: string;
}

export async function captureBreakpointSnapshot(
  page: Page,
  allPages: Page[],
  breakpoint: "desktop" | "tablet" | "mobile",
  width: number = 375,
  height: number = 812,
): Promise<ViewportSnapshot> {
  const htmlContent = buildPageHTML(page, allPages, [], false, false);

  // Extract body inner content from generated HTML
  const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const stylesMatch = htmlContent.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
  const bodyHtml = bodyMatch ? bodyMatch[1] : "";
  const stylesHtml = stylesMatch ? stylesMatch.join("\n") : "";

  // Construct standalone SVG foreignObject
  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;min-height:${height}px;background:#0f1015;color:#fff;font-family:Inter,sans-serif;margin:0;padding:0;box-sizing:border-box;overflow:hidden;">
          ${stylesHtml}
          ${bodyHtml}
        </div>
      </foreignObject>
    </svg>
  `.trim();

  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;

  // Convert SVG foreignObject to real base64 PNG data URL using Image & Canvas
  return new Promise<ViewportSnapshot>((resolve) => {
    if (typeof window === "undefined") {
      resolve({ breakpoint, width, height, dataUrl: svgDataUrl });
      return;
    }

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#09090b";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0);
            const pngDataUrl = canvas.toDataURL("image/png");
            resolve({ breakpoint, width, height, dataUrl: pngDataUrl });
            return;
          }
        } catch (e) {}
        resolve({ breakpoint, width, height, dataUrl: svgDataUrl });
      };
      img.onerror = () => {
        resolve({ breakpoint, width, height, dataUrl: svgDataUrl });
      };
      img.src = svgDataUrl;
    } catch (e) {
      resolve({ breakpoint, width, height, dataUrl: svgDataUrl });
    }
  });
}
