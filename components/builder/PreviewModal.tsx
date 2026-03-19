"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Monitor,
  Tablet,
  Smartphone,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Globe,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Page, SavedComponent } from "@/lib/builder/types";

// ─── HTML generator ───────────────────────────────────────────────────────────
// Converts canvas elements to plain HTML + inline CSS (no React/Next needed).
// Components are inlined — this is purely a visual preview, not exported code.

import { CanvasElement } from "@/lib/builder/types";

function styleToCSS(styles: CanvasElement["styles"]): string {
  const skip = new Set([
    "gradientType",
    "gradientAngle",
    "gradientStartColor",
    "gradientEndColor",
    "lineClamp",
    "tableStripe",
    "tableHeaderBackground",
    "tableCellPadding",
  ]);
  const props: string[] = [];

  for (const [key, val] of Object.entries(styles)) {
    if (val === undefined || val === "" || skip.has(key)) continue;
    // camelCase → kebab-case
    const cssKey = key.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`);
    props.push(`${cssKey}: ${val}`);
  }

  // gradient override
  if (
    styles.gradientType === "linear" &&
    styles.gradientStartColor &&
    styles.gradientEndColor
  ) {
    props.push(
      `background-image: linear-gradient(${styles.gradientAngle ?? 135}deg, ${styles.gradientStartColor}, ${styles.gradientEndColor})`,
    );
  }
  if (styles.lineClamp) {
    props.push(
      `display: -webkit-box`,
      `-webkit-line-clamp: ${styles.lineClamp}`,
      `-webkit-box-orient: vertical`,
      `overflow: hidden`,
    );
  }

  return props.join("; ");
}

function elementToHTML(
  el: CanvasElement,
  allPages: Page[],
  components: SavedComponent[],
): string {
  // If this is a saved-component instance, inline it from the saved component
  if (el.savedComponentId) {
    const comp = components.find((c) => c.id === el.savedComponentId);
    if (comp) return elementToHTML(comp.element, allPages, components);
  }

  const css = styleToCSS(el.styles);
  const style = css ? ` style="${css}"` : "";
  const kids = (el.children || [])
    .map((c) => elementToHTML(c, allPages, components))
    .join("\n");

  // Rewrite hrefs so internal links navigate within the preview
  const rewriteHref = (href: string) => {
    if (!href || href === "#") return "javascript:void(0)";
    if (href.startsWith("http") || href.startsWith("//")) return href;
    // Internal path — will be intercepted by the iframe's click handler
    return href;
  };

  switch (el.type) {
    case "heading":
      return `<h1${style}>${el.content || "Heading"}</h1>`;
    case "heading2":
      return `<h2${style}>${el.content || "Heading"}</h2>`;
    case "heading3":
      return `<h3${style}>${el.content || "Heading"}</h3>`;
    case "text":
    case "paragraph":
      return `<p${style}>${el.content || ""}</p>`;
    case "span":
      return `<span${style}>${el.content || ""}</span>`;
    case "badge":
      return `<span${style}>${el.content || "Badge"}</span>`;
    case "blockquote":
      return `<blockquote${style}>${el.content || ""}</blockquote>`;
    case "code":
      return `<code${style}>${el.content || ""}</code>`;
    case "pre":
      return `<pre${style}>${el.content || ""}</pre>`;
    case "icon":
      return `<span${style} aria-hidden="true">${el.content || "★"}</span>`;
    case "divider":
      return `<hr${style} />`;
    case "spacer":
      return `<div${style} aria-hidden="true"></div>`;
    case "image":
      return `<img src="${el.src || ""}" alt="${el.alt || ""}"${style} />`;
    case "iframe":
      return `<iframe src="${el.src || ""}"${style}></iframe>`;
    case "input":
      return `<input type="text" placeholder="${el.placeholder || ""}"${style} />`;
    case "textarea":
      return `<textarea placeholder="${el.placeholder || ""}"${style}></textarea>`;
    case "footer":
      return `<footer${style}>${el.content || ""}</footer>`;

    case "link": {
      const href = rewriteHref(el.href || "#");
      const target = el.target === "_blank" ? ` target="_blank"` : "";
      return `<a href="${href}"${target}${style}>${el.content || "Link"}</a>`;
    }
    case "button": {
      const href = rewriteHref(el.href || "#");
      const target = el.target === "_blank" ? ` target="_blank"` : "";
      return `<a href="${href}"${target}${style}>${el.content || "Button"}</a>`;
    }
    case "video":
      return `<video${style}${el.controls ? " controls" : ""}${el.autoPlay ? " autoplay" : ""}${el.muted ? " muted" : ""}${el.loop ? " loop" : ""}${el.videoPoster ? ` poster="${el.videoPoster}"` : ""}><source src="${el.videoSrc || ""}" /></video>`;
    case "audio":
      return `<audio${style}${el.controls ? " controls" : ""}${el.autoPlay ? " autoplay" : ""}${el.loop ? " loop" : ""}><source src="${el.videoSrc || ""}" /></audio>`;
    case "select": {
      const opts = (el.selectOptions || [])
        .map((o) => `<option value="${o}">${o}</option>`)
        .join("");
      return `<select${style}>${opts}</select>`;
    }
    case "checkbox":
      return `<label${style}><input type="checkbox"${el.checked ? " checked" : ""} /> <span>${el.content || "Label"}</span></label>`;
    case "radio":
      return `<label${style}><input type="radio" /> <span>${el.content || "Option"}</span></label>`;
    case "list": {
      const items = (el.listItems || []).map((i) => `<li>${i}</li>`).join("");
      return `<ul${style}>${items}</ul>`;
    }
    case "orderedList": {
      const items = (el.listItems || []).map((i) => `<li>${i}</li>`).join("");
      return `<ol${style}>${items}</ol>`;
    }
    case "navbar": {
      const navKids = (el.children || [])
        .map((c) => elementToHTML(c, allPages, components))
        .join("\n");
      const brand = el.content
        ? `<span style="font-weight:700;font-size:20px">${el.content}</span>`
        : "";
      return `<nav${style}>${brand}${navKids}</nav>`;
    }
    case "table": {
      const td = (el as any).tableData || { headers: [], rows: [] };
      const ths = td.headers.map((h: string) => `<th>${h}</th>`).join("");
      const trs = td.rows
        .map(
          (row: string[]) =>
            `<tr>${row.map((c: string) => `<td>${c}</td>`).join("")}</tr>`,
        )
        .join("");
      return `<table${style}><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
    }
    case "div":
    case "section":
    case "article":
    case "aside":
    case "main":
    case "header":
    case "nav":
    case "form": {
      const tag = (el as any).htmlTag || el.type;
      return `<${tag}${style}>${kids}</${tag}>`;
    }
    default:
      return `<div${style}>${el.content || kids || ""}</div>`;
  }
}

function buildPageHTML(
  page: Page,
  allPages: Page[],
  components: SavedComponent[],
  slug: string,
): string {
  const body = page.elements
    .map((el) => elementToHTML(el, allPages, components))
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${page.name}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; min-height: 100%; }
    img { max-width: 100%; display: block; }
    a { text-decoration: none; }
    input, textarea, select, button { font: inherit; }
  </style>
</head>
<body>
${body}
<script>
  // Intercept internal link clicks and notify the parent frame
  document.addEventListener('click', function(e) {
    var a = e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href === 'javascript:void(0)') return;
    if (href.startsWith('http') || href.startsWith('//') || href.startsWith('mailto')) return;
    e.preventDefault();
    window.parent.postMessage({ type: 'navigate', slug: href }, '*');
  });
</script>
</body>
</html>`;
}

// ─── Viewport sizes ───────────────────────────────────────────────────────────

const VIEWPORTS = [
  {
    id: "desktop",
    label: "Desktop",
    icon: Monitor,
    width: "100%",
    frameW: null,
  },
  { id: "tablet", label: "Tablet", icon: Tablet, width: 768, frameW: 768 },
  { id: "mobile", label: "Mobile", icon: Smartphone, width: 390, frameW: 390 },
] as const;

type ViewportId = (typeof VIEWPORTS)[number]["id"];

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  pages: Page[];
  components: SavedComponent[];
  initialSlug?: string;
  onClose: () => void;
}

export default function PreviewModal({
  pages,
  components,
  initialSlug = "/",
  onClose,
}: Props) {
  const [currentSlug, setCurrentSlug] = useState(initialSlug);
  const [viewport, setViewport] = useState<ViewportId>("desktop");
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<string[]>([initialSlug]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentPage = pages.find((p) => p.slug === currentSlug) ?? pages[0];
  const currentViewport = VIEWPORTS.find((v) => v.id === viewport)!;

  // Build srcdoc for current page
  const srcdoc = currentPage
    ? buildPageHTML(currentPage, pages, components, currentPage.slug)
    : "<html><body><p style='padding:40px;font-family:sans-serif;color:#888'>Page not found</p></body></html>";

  // Navigate to a slug (push history)
  const navigateTo = useCallback(
    (slug: string) => {
      const page = pages.find((p) => p.slug === slug);
      if (!page) return;
      // setLoading will be triggered by the iframe's onLoad once srcdoc swaps
      setCurrentSlug(slug);
      setLoading(true);
      setHistory((prev) => {
        const trimmed = prev.slice(0, historyIdx + 1);
        return [...trimmed, slug];
      });
      setHistoryIdx((i) => i + 1);
    },
    [pages, historyIdx],
  );

  const goBack = () => {
    if (historyIdx <= 0) return;
    const newIdx = historyIdx - 1;
    setHistoryIdx(newIdx);
    setCurrentSlug(history[newIdx]);
    setLoading(true);
  };

  const goForward = () => {
    if (historyIdx >= history.length - 1) return;
    const newIdx = historyIdx + 1;
    setHistoryIdx(newIdx);
    setCurrentSlug(history[newIdx]);
    setLoading(true);
  };

  const refresh = () => {
    setLoading(true);
    if (iframeRef.current) {
      iframeRef.current.srcdoc = "";
      requestAnimationFrame(() => {
        if (iframeRef.current) iframeRef.current.srcdoc = srcdoc;
      });
    }
  };

  // Listen to navigate messages from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "navigate" && e.data.slug) {
        navigateTo(e.data.slug);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [navigateTo]);

  // Keyboard: Escape closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const canBack = historyIdx > 0;
  const canForward = historyIdx < history.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "#090909" }}
    >
      {/* ── TOOLBAR ── */}
      <div
        className="flex items-center gap-3 shrink-0"
        style={{
          height: 48,
          padding: "0 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "#0e0e0e",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="flex items-center justify-center shrink-0 cursor-pointer transition-colors"
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "rgba(255,255,255,0.06)",
            border: "none",
            color: "rgba(255,255,255,0.45)",
          }}
          title="Close preview (Esc)"
        >
          <X size={13} />
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={goBack}
            disabled={!canBack}
            className="flex items-center justify-center cursor-pointer transition-all"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: canBack
                ? "rgba(255,255,255,0.5)"
                : "rgba(255,255,255,0.15)",
            }}
          >
            <ArrowLeft size={14} />
          </button>
          <button
            onClick={goForward}
            disabled={!canForward}
            className="flex items-center justify-center cursor-pointer transition-all"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: canForward
                ? "rgba(255,255,255,0.5)"
                : "rgba(255,255,255,0.15)",
            }}
          >
            <ArrowRight size={14} />
          </button>
          <button
            onClick={refresh}
            className="flex items-center justify-center cursor-pointer transition-all"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Address bar */}
        <div
          className="flex items-center gap-2 flex-1"
          style={{
            height: 30,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            padding: "0 12px",
            maxWidth: 480,
            margin: "0 auto",
          }}
        >
          <Globe
            size={11}
            style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0 }}
          />
          <span
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.45)",
              fontFamily: "monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            localhost:3000{currentSlug === "/" ? "" : currentSlug}
          </span>
        </div>

        <div
          className="flex items-center gap-1 overflow-x-auto"
          style={{ maxWidth: 280, scrollbarWidth: "none" }}
        >
          {pages.map((page) => (
            <button
              key={page.id}
              onClick={() => {
                if (currentSlug !== page.slug) {
                  navigateTo(page.slug);
                }
              }}
              className="flex items-center shrink-0 cursor-pointer transition-all"
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: "none",
                fontSize: 11,
                fontWeight: 500,
                background:
                  currentSlug === page.slug
                    ? "rgba(255,255,255,0.1)"
                    : "transparent",
                color:
                  currentSlug === page.slug
                    ? "rgba(255,255,255,0.8)"
                    : "rgba(255,255,255,0.3)",
                whiteSpace: "nowrap",
                cursor: currentSlug === page.slug ? "default" : "pointer",
              }}
            >
              {page.name}
            </button>
          ))}
        </div>

        <div
          className="flex items-center shrink-0"
          style={{
            background: "rgba(255,255,255,0.05)",
            borderRadius: 8,
            padding: 3,
            gap: 2,
          }}
        >
          {VIEWPORTS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setViewport(id)}
              title={label}
              className="flex items-center justify-center cursor-pointer transition-all"
              style={{
                width: 28,
                height: 24,
                borderRadius: 6,
                border: "none",
                background:
                  viewport === id ? "rgba(255,255,255,0.12)" : "transparent",
                color:
                  viewport === id
                    ? "rgba(255,255,255,0.8)"
                    : "rgba(255,255,255,0.3)",
              }}
            >
              <Icon size={13} />
            </button>
          ))}
        </div>
      </div>

      {/* ── CANVAS ── */}
      <div
        ref={containerRef}
        className="flex-1 flex items-start justify-center overflow-auto"
        style={{
          background: viewport === "desktop" ? "#fff" : "#141414",
          padding: viewport === "desktop" ? 0 : "32px 0 48px",
        }}
      >
        <div
          style={{
            width: currentViewport.frameW
              ? `${currentViewport.frameW}px`
              : "100%",
            height: viewport === "desktop" ? "100%" : "auto",
            minHeight: viewport !== "desktop" ? 600 : undefined,
            background: "#fff",
            boxShadow:
              viewport !== "desktop" ? "0 24px 80px rgba(0,0,0,0.5)" : "none",
            borderRadius: viewport !== "desktop" ? 12 : 0,
            overflow: "hidden",
            transition: "width 0.25s ease",
            position: "relative",
          }}
        >
          {/* Loading shimmer */}
          {loading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 10,
                background: "rgba(255,255,255,0.85)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ display: "flex", gap: 6 }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#d1d5db",
                      animation: `bounce 0.8s ${i * 0.15}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <iframe
            key={currentSlug}
            ref={iframeRef}
            srcDoc={srcdoc}
            sandbox="allow-scripts allow-same-origin allow-forms"
            style={{
              width: "100%",
              height: viewport === "desktop" ? "100%" : "100%",
              minHeight: viewport !== "desktop" ? 600 : undefined,
              border: "none",
              display: "block",
            }}
            onLoad={() => setLoading(false)}
            title={`Preview: ${currentPage?.name}`}
          />
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
        @keyframes bounce { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-6px) } }
      `}</style>
    </div>
  );
}
