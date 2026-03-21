"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Monitor,
  Tablet,
  Smartphone,
  RefreshCw,
  Globe,
  ArrowLeft,
  ArrowRight,
  MousePointer,
  Move,
  GripVertical,
  ChevronDown,
  Maximize2,
  Minimize2,
} from "lucide-react";
import gsap from "gsap";
import { Page, SavedComponent, CanvasElement } from "@/lib/builder/types";
import { useBuilderStore } from "@/lib/builder/store";

// ─── Style helpers ────────────────────────────────────────────────────────────

const STYLE_SKIP = new Set([
  "gradientType",
  "gradientAngle",
  "gradientStartColor",
  "gradientEndColor",
  "lineClamp",
  "tableStripe",
  "tableHeaderBackground",
  "tableCellPadding",
]);

function styleToCSS(styles: Record<string, any>): string {
  const props: string[] = [];
  for (const [key, val] of Object.entries(styles)) {
    if (val === undefined || val === "" || STYLE_SKIP.has(key)) continue;
    const cssKey = key.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`);
    props.push(`${cssKey}: ${val}`);
  }
  if (
    styles.gradientType === "linear" &&
    styles.gradientStartColor &&
    styles.gradientEndColor
  )
    props.push(
      `background-image: linear-gradient(${styles.gradientAngle ?? 135}deg, ${styles.gradientStartColor}, ${styles.gradientEndColor})`,
    );
  if (styles.lineClamp)
    props.push(
      `display: -webkit-box`,
      `-webkit-line-clamp: ${styles.lineClamp}`,
      `-webkit-box-orient: vertical`,
      `overflow: hidden`,
    );
  return props.join("; ");
}

function styleObjToBlock(styles: Record<string, any>): string {
  const lines: string[] = [];
  for (const [key, val] of Object.entries(styles)) {
    if (val === undefined || val === "" || STYLE_SKIP.has(key)) continue;
    const cssKey = key.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`);
    lines.push(`  ${cssKey}: ${val} !important;`);
  }
  if (
    styles.gradientType === "linear" &&
    styles.gradientStartColor &&
    styles.gradientEndColor
  )
    lines.push(
      `  background-image: linear-gradient(${styles.gradientAngle ?? 135}deg, ${styles.gradientStartColor}, ${styles.gradientEndColor}) !important;`,
    );
  if (styles.lineClamp)
    lines.push(
      `  display: -webkit-box !important;`,
      `  -webkit-line-clamp: ${styles.lineClamp} !important;`,
      `  -webkit-box-orient: vertical !important;`,
      `  overflow: hidden !important;`,
    );
  return lines.join("\n");
}

// ─── State CSS collector ──────────────────────────────────────────────────────

function collectStateCSS(
  el: CanvasElement,
  components: SavedComponent[],
  rules: string[],
) {
  if (el.savedComponentId) {
    const comp = components.find((c) => c.id === el.savedComponentId);
    if (comp) collectStateCSS(comp.element, components, rules);
    return;
  }
  const cls = `[data-bid="${el.id}"]`;
  if (el.styles.transition)
    rules.push(`${cls} { transition: ${el.styles.transition}; }`);
  if (el.hoverStyles && Object.keys(el.hoverStyles).length > 0) {
    const block = styleObjToBlock(el.hoverStyles as Record<string, any>);
    if (block) rules.push(`${cls}:hover {\n${block}\n}`);
  }
  if (el.activeStyles && Object.keys(el.activeStyles).length > 0) {
    const block = styleObjToBlock(el.activeStyles as Record<string, any>);
    if (block) rules.push(`${cls}:active {\n${block}\n}`);
  }
  if (el.focusStyles && Object.keys(el.focusStyles).length > 0) {
    const block = styleObjToBlock(el.focusStyles as Record<string, any>);
    if (block) rules.push(`${cls}:focus {\n${block}\n}`);
  }
  if (el.children)
    el.children.forEach((c) => collectStateCSS(c, components, rules));
}

// ─── HTML generator ───────────────────────────────────────────────────────────

function elementToHTML(
  el: CanvasElement,
  allPages: Page[],
  components: SavedComponent[],
): string {
  if (el.savedComponentId) {
    const comp = components.find((c) => c.id === el.savedComponentId);
    if (comp) return elementToHTML(comp.element, allPages, components);
  }

  if (el.metadata?.isHidden) return "";

  const lockedAttr = el.metadata?.isLocked ? ' data-locked="true"' : "";
  const css = styleToCSS({
    ...el.styles,
    ...(el.metadata?.isLocked
      ? { pointerEvents: "none", userSelect: "none" }
      : {}),
  } as Record<string, any>);
  const style = css ? ` style="${css}"` : "";
  const bid = ` data-bid="${el.id}"${lockedAttr}`;
  const kids = (el.children || [])
    .map((c) => elementToHTML(c, allPages, components))
    .join("\n");

  const rewriteHref = (href: string) => {
    if (!href || href === "#") return "javascript:void(0)";
    if (href.startsWith("http") || href.startsWith("//")) return href;
    return href;
  };

  switch (el.type) {
    case "heading":
      return `<h1${bid}${style}>${el.content || "Heading"}</h1>`;
    case "heading2":
      return `<h2${bid}${style}>${el.content || "Heading"}</h2>`;
    case "heading3":
      return `<h3${bid}${style}>${el.content || "Heading"}</h3>`;
    case "text":
    case "paragraph":
      return `<p${bid}${style}>${el.content || ""}</p>`;
    case "span":
      return `<span${bid}${style}>${el.content || ""}</span>`;
    case "badge":
      return `<span${bid}${style}>${el.content || "Badge"}</span>`;
    case "blockquote":
      return `<blockquote${bid}${style}>${el.content || ""}</blockquote>`;
    case "code":
      return `<code${bid}${style}>${el.content || ""}</code>`;
    case "pre": {
      const code = (el.content || "// code block\nconst x = 1;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      const preStyle = styleToCSS({
        borderRadius: "8px",
        margin: "0",
        ...el.styles,
      });
      return `<div style="position:relative">
  <button onclick="navigator.clipboard.writeText(this.closest('div').querySelector('code').innerText);this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',2000)" style="position:absolute;top:10px;right:10px;z-index:10;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:#fff;font-size:11px;padding:3px 9px;cursor:pointer">Copy</button>
  <pre${bid} style="${preStyle}"><code class="hljs language-typescript">${code}</code></pre>
</div>`;
    }
    case "icon":
      return `<span${bid}${style} aria-hidden="true">${el.content || "★"}</span>`;
    case "divider":
      return `<hr${bid}${style} />`;
    case "spacer":
      return `<div${bid}${style} aria-hidden="true"></div>`;
    case "image":
      return `<img${bid} src="${el.src || ""}" alt="${el.alt || ""}"${style} />`;
    case "iframe":
      return `<iframe${bid} src="${el.src || ""}"${style}></iframe>`;
    case "input":
      return `<input${bid} type="${el.inputType || "text"}" placeholder="${el.placeholder || ""}"${style} />`;
    case "textarea":
      return `<textarea${bid} placeholder="${el.placeholder || ""}"${style}></textarea>`;
    case "select": {
      const opts = (el.selectOptions || [])
        .map((o) => `<option>${o}</option>`)
        .join("");
      return `<select${bid}${style}>${opts}</select>`;
    }
    case "checkbox":
      return `<label${bid}${style}><input type="checkbox"${el.checked ? " checked" : ""} /> <span>${el.content || "Label"}</span></label>`;
    case "radio":
      return `<label${bid}${style}><input type="radio"${el.fieldName ? ` name="${el.fieldName}"` : ""} /> <span>${el.content || "Option"}</span></label>`;
    case "list": {
      const items = (el.listItems || []).map((i) => `<li>${i}</li>`).join("");
      return `<ul${bid}${style}>${items}</ul>`;
    }
    case "orderedList": {
      const items = (el.listItems || []).map((i) => `<li>${i}</li>`).join("");
      return `<ol${bid}${style}>${items}</ol>`;
    }
    case "navbar": {
      const navKids = (el.children || [])
        .map((c) => elementToHTML(c, allPages, components))
        .join("\n");
      const brand = el.content
        ? `<span style="font-weight:700;font-size:20px">${el.content}</span>`
        : "";
      return `<nav${bid}${style}>${brand}${navKids}</nav>`;
    }
    case "table": {
      const td = el.tableData || { headers: [], rows: [] };
      const cellPad = el.styles.tableCellPadding || "8px 12px";
      const headerBg = el.styles.tableHeaderBackground || "#f9fafb";
      const stripe = el.styles.tableStripe;
      const cellBorder = "1px solid #e5e7eb";
      const ths = td.headers
        .map(
          (h: string) =>
            `<th style="padding:${cellPad};background:${headerBg};border:${cellBorder};text-align:left;font-weight:600">${h}</th>`,
        )
        .join("");
      const trs = td.rows
        .map((row: string[], ri: number) => {
          const rowBg = stripe && ri % 2 === 1 ? "background:#f9fafb" : "";
          const tds = row
            .map(
              (c: string) =>
                `<td style="padding:${cellPad};border:${cellBorder}${rowBg ? ";" + rowBg : ""}">${c}</td>`,
            )
            .join("");
          return `<tr>${tds}</tr>`;
        })
        .join("");
      const tableStyle = styleToCSS({
        ...el.styles,
        borderCollapse: el.styles.borderCollapse || "collapse",
      });
      return `<table${bid} style="${tableStyle}"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
    }
    case "mark":
      return `<mark${bid}${style}>${el.content || "highlighted text"}</mark>`;
    case "kbd":
      return `<kbd${bid}${style}>${el.content || "⌘K"}</kbd>`;
    case "time":
      return `<time${bid}${el.dateTime ? ` datetime="${el.dateTime}"` : ""}${style}>${el.content || "January 1, 2025"}</time>`;
    case "progress":
      return `<progress${bid} value="${el.progressValue ?? 60}" max="${el.progressMax ?? 100}"${style}></progress>`;
    case "meter":
      return `<meter${bid} value="${el.progressValue ?? 0.6}" min="0" max="${el.progressMax ?? 1}"${style}></meter>`;
    case "details": {
      const openAttr = el.open ? " open" : "";
      return `<details${bid}${openAttr}${style}><summary style="cursor:pointer;font-weight:500">${el.content || "Click to expand"}</summary><div style="padding-top:8px">Content goes here.</div></details>`;
    }
    case "alert": {
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
        error: {
          bg: "#fef2f2",
          border: "#fecaca",
          color: "#b91c1c",
          icon: "✕",
        },
      };
      const v = variantMap[el.alertVariant || "info"];
      const alertStyle = styleToCSS({
        ...el.styles,
        backgroundColor: v.bg,
        border: `1px solid ${v.border}`,
        color: v.color,
      });
      return `<div${bid} style="${alertStyle}"><span style="font-weight:700;margin-right:8px">${v.icon}</span>${el.content || "This is an alert message."}</div>`;
    }
    case "avatar": {
      if (el.avatarSrc)
        return `<img${bid} src="${el.avatarSrc}" alt="${el.avatarInitials || "avatar"}"${style} />`;
      return `<div${bid}${style}>${el.avatarInitials || "AB"}</div>`;
    }
    case "card":
      return `<div${bid}${style}>${kids}</div>`;
    case "figure":
      return `<figure${bid}${style}>${kids}</figure>`;
    case "link":
      return `<a${bid} href="${rewriteHref(el.href || "#")}"${style}>${el.content || "Link"}</a>`;
    case "button":
      return `<button${bid}${style}>${el.content || "Button"}</button>`;
    case "div":
    case "section":
    case "article":
    case "aside":
    case "main":
    case "header":
    case "nav":
    case "form": {
      const tag = el.htmlTag || el.type;
      return `<${tag}${bid}${style}>${kids}</${tag}>`;
    }
    default:
      return `<div${bid}${style}>${el.content || kids || ""}</div>`;
  }
}

function buildPageHTML(
  page: Page,
  allPages: Page[],
  components: SavedComponent[],
  editMode: boolean,
  dragMode: boolean,
): string {
  const body = page.elements
    .map((el) => elementToHTML(el, allPages, components))
    .join("\n");
  const stateRules: string[] = [];
  for (const el of page.elements) collectStateCSS(el, components, stateRules);
  const stateCSS = stateRules.length ? stateRules.join("\n\n") : "";

  const editScript = editMode
    ? `
<script>
  var _selected = null;
  var _dragEl = null;
  var _dragStartX = 0, _dragStartY = 0;
  var _elStartTop = 0, _elStartLeft = 0;
  var _resizeEl = null;
  var _resizeStartX = 0, _resizeStartY = 0;
  var _elStartW = 0, _elStartH = 0;
  var _radiusEl = null;
  var _radiusStartX = 0, _elStartRadius = 0;
  var _mode = '${dragMode ? "move" : "select"}';

  function getBid(el) {
    while (el && el !== document.body) {
      if (el.dataset && el.dataset.bid) return el;
      el = el.parentElement;
    }
    return null;
  }

  function postSelect(bid, rect) {
    window.parent.postMessage({ type: 'select', bid: bid, rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height } }, '*');
  }

  function postUpdate(bid, styles) {
    window.parent.postMessage({ type: 'update', bid: bid, styles: styles }, '*');
  }

  function postDeselect() {
    window.parent.postMessage({ type: 'deselect' }, '*');
  }

  function updateCursor() {
    if (_mode === 'move') document.body.classList.add('is-move-mode');
    else document.body.classList.remove('is-move-mode');
  }
  updateCursor();

  document.addEventListener('mousedown', function(e) {
    if (e.target.closest('[data-locked]')) return;
    var node = getBid(e.target);
    if (!node) { _selected = null; postDeselect(); return; }
    e.preventDefault();
    _selected = node;
    var rect = node.getBoundingClientRect();
    postSelect(node.dataset.bid, rect);

    if (_mode === 'move') {
      _dragEl = node;
      _dragStartX = e.clientX;
      _dragStartY = e.clientY;
      
      var parent = node.parentElement || document.documentElement;
      if (window.getComputedStyle(parent).position === 'static' && parent !== document.documentElement) {
        parent.style.position = 'relative'; 
      }
      
      var oldRect = node.getBoundingClientRect();
      var oldTransition = node.style.transition;
      node.style.transition = 'none';
      node.style.position = 'absolute';
      node.style.top = '0px';
      node.style.left = '0px';
      
      var newRect = node.getBoundingClientRect();
      _elStartTop = oldRect.top - newRect.top;
      _elStartLeft = oldRect.left - newRect.left;
      
      node.style.top = _elStartTop + 'px';
      node.style.left = _elStartLeft + 'px';
    }
  });

  function handleMove(e) {
    if (_dragEl) {
      var dx = e.clientX - _dragStartX;
      var dy = e.clientY - _dragStartY;
      var newTop = Math.round(_elStartTop + dy);
      var newLeft = Math.round(_elStartLeft + dx);
      _dragEl.style.position = 'absolute';
      _dragEl.style.top = newTop + 'px';
      _dragEl.style.left = newLeft + 'px';
      var rect = _dragEl.getBoundingClientRect();
      window.parent.postMessage({ type: 'selectmove', bid: _dragEl.dataset.bid, rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height } }, '*');
    }
    if (_resizeEl) {
      var dw = e.clientX - _resizeStartX;
      var dh = e.clientY - _resizeStartY;
      var nw = Math.max(20, Math.round(_elStartW + dw));
      var nh = Math.max(10, Math.round(_elStartH + dh));
      _resizeEl.style.width = nw + 'px';
      _resizeEl.style.height = nh + 'px';
      var rect = _resizeEl.getBoundingClientRect();
      window.parent.postMessage({ type: 'selectmove', bid: _resizeEl.dataset.bid, rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height } }, '*');
    }
    if (_radiusEl) {
      var dx = e.clientX - _radiusStartX;
      var newR = Math.max(0, Math.round(_elStartRadius + dx));
      _radiusEl.style.setProperty('border-radius', newR + 'px', 'important');
    }
  }

  function handleUp() {
    if (_dragEl) {
      postUpdate(_dragEl.dataset.bid, { position: 'absolute', top: _dragEl.style.top, left: _dragEl.style.left });
      _dragEl = null;
    }
    if (_resizeEl) {
      postUpdate(_resizeEl.dataset.bid, { width: _resizeEl.style.width, height: _resizeEl.style.height });
      _resizeEl = null;
    }
    if (_radiusEl) {
      postUpdate(_radiusEl.dataset.bid, { borderRadius: _radiusEl.style.borderRadius });
      _radiusEl = null;
    }
  }

  document.addEventListener('mousemove', handleMove);
  document.addEventListener('mouseup', handleUp);

  window.addEventListener('message', function(e) {
    if (e.data.type === 'startResize') {
      _resizeEl = document.querySelector('[data-bid="' + e.data.bid + '"]');
      if (!_resizeEl) return;
      _resizeStartX = e.data.x;
      _resizeStartY = e.data.y;
      var r = _resizeEl.getBoundingClientRect();
      _elStartW = r.width;
      _elStartH = r.height;
    }
    if (e.data.type === 'startRadius') {
      _radiusEl = document.querySelector('[data-bid="' + e.data.bid + '"]');
      if (!_radiusEl) return;
      _radiusStartX = e.data.x;
      var currentR = _radiusEl.style.borderRadius || window.getComputedStyle(_radiusEl).borderRadius;
      _elStartRadius = parseFloat(currentR) || 0;
    }
    if (e.data.type === 'forwardMouseMove') {
      handleMove({ clientX: e.data.x, clientY: e.data.y });
    }
    if (e.data.type === 'forwardMouseUp') {
      handleUp();
    }
    if (e.data.type === 'setMode') {
      _mode = e.data.mode;
      updateCursor();
    }
    if (e.data.type === 'deselect') {
      _selected = null;
    }
  });

  window.addEventListener('scroll', function() {
    if (_selected) {
      var rect = _selected.getBoundingClientRect();
      postSelect(_selected.dataset.bid, rect);
    }
  });

  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('pre code.hljs').forEach(function(block) { hljs.highlightElement(block); });
  });
  document.addEventListener('click', function(e) {
    var a = e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href === 'javascript:void(0)') return;
    if (href.startsWith('http') || href.startsWith('//') || href.startsWith('mailto')) return;
    e.preventDefault();
    window.parent.postMessage({ type: 'navigate', slug: href }, '*');
  });
</script>`
    : `
<script>
  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('pre code.hljs').forEach(function(block) { hljs.highlightElement(block); });
  });
  document.addEventListener('click', function(e) {
    var a = e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href === 'javascript:void(0)') return;
    if (href.startsWith('http') || href.startsWith('//') || href.startsWith('mailto')) return;
    e.preventDefault();
    window.parent.postMessage({ type: 'navigate', slug: href }, '*');
  });
</script>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${page.name}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/vs2015.min.css" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; min-height: 100%; }
    img { max-width: 100%; display: block; }
    a { text-decoration: none; }
    input, textarea, select, button { font: inherit; }
    pre code.hljs { border-radius: 8px; font-size: 13px; line-height: 1.7; }
    body.is-move-mode, body.is-move-mode * { cursor: move !important; }
    ${stateCSS}
  </style>
</head>
<body>
${body}
${editScript}
</body>
</html>`;
}

// ─── Viewports ────────────────────────────────────────────────────────────────

const VIEWPORTS = [
  { id: "desktop", label: "Desktop", icon: Monitor, frameW: null },
  { id: "tablet", label: "Tablet", icon: Tablet, frameW: 768 },
  { id: "mobile", label: "Mobile", icon: Smartphone, frameW: 390 },
] as const;
type ViewportId = (typeof VIEWPORTS)[number]["id"];

// ─── Selection overlay ────────────────────────────────────────────────────────

interface SelectionRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function SelectionOverlay({
  rect,
  iframeRect,
  onResizeStart,
  onRadiusStart,
  selectedBid,
  pages,
}: {
  rect: SelectionRect;
  iframeRect: DOMRect;
  onResizeStart: (x: number, y: number) => void;
  onRadiusStart: (x: number, y: number) => void;
  selectedBid: string;
  pages: Page[];
}) {
  const el = (() => {
    const find = (els: CanvasElement[]): CanvasElement | undefined => {
      for (const e of els) {
        if (e.id === selectedBid) return e;
        if (e.children) {
          const f = find(e.children);
          if (f) return f;
        }
      }
    };
    for (const p of pages) {
      const f = find(p.elements);
      if (f) return f;
    }
  })();

  const absTop = iframeRect.top + rect.top;
  const absLeft = iframeRect.left + rect.left;

  return (
    <>
      {/* Blue outline */}
      <div
        style={{
          position: "fixed",
          top: absTop,
          left: absLeft,
          width: rect.width,
          height: rect.height,
          outline: "2px solid #3b82f6",
          outlineOffset: 1,
          pointerEvents: "none",
          zIndex: 9998,
        }}
      />

      {/* Label */}
      <div
        style={{
          position: "fixed",
          top: absTop - 22,
          left: absLeft,
          background: "#3b82f6",
          color: "#fff",
          fontSize: 10,
          fontWeight: 600,
          padding: "2px 7px",
          borderRadius: 4,
          pointerEvents: "none",
          zIndex: 9999,
          whiteSpace: "nowrap",
        }}
      >
        {el?.type || "element"} {el?.metadata?.isLocked ? "🔒" : ""}
      </div>

      {/* Resize handle — bottom right */}
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onResizeStart(e.clientX, e.clientY);
        }}
        style={{
          position: "fixed",
          top: absTop + rect.height - 8,
          left: absLeft + rect.width - 8,
          width: 16,
          height: 16,
          background: "#3b82f6",
          border: "3px solid #fff",
          borderRadius: 2,
          cursor: "nwse-resize",
          zIndex: 9999,
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        }}
      />

      {/* Border radius handle — top right */}
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRadiusStart(e.clientX, e.clientY);
        }}
        title="Drag right to round, left to sharpen"
        style={{
          position: "fixed",
          top: absTop - 8,
          left: absLeft + rect.width - 8,
          width: 16,
          height: 16,
          background: "#fff",
          border: "3px solid #3b82f6",
          borderRadius: "50%",
          cursor: "ew-resize",
          zIndex: 9999,
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        }}
      />

      {/* Width/Height label */}
      <div
        style={{
          position: "fixed",
          top: absTop + rect.height + 4,
          left: absLeft,
          background: "rgba(0,0,0,0.65)",
          color: "#fff",
          fontSize: 10,
          padding: "2px 6px",
          borderRadius: 4,
          pointerEvents: "none",
          zIndex: 9999,
          fontFamily: "monospace",
        }}
      >
        {Math.round(rect.width)} × {Math.round(rect.height)}
      </div>
    </>
  );
}

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
  const { updateElement } = useBuilderStore();
  const [currentSlug, setCurrentSlug] = useState(initialSlug);
  const [viewport, setViewport] = useState<ViewportId>("desktop");
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<string[]>([initialSlug]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [dragMode, setDragMode] = useState(false);
  const [selectedBid, setSelectedBid] = useState<string | null>(null);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(
    null,
  );
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ x: 24, y: 24 }); // from bottom left
  const [showPages, setShowPages] = useState(false);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeWrapRef = useRef<HTMLDivElement>(null);

  const currentPage = pages.find((p) => p.slug === currentSlug) ?? pages[0];
  const currentViewport = VIEWPORTS.find((v) => v.id === viewport)!;

  const srcdoc = currentPage
    ? buildPageHTML(currentPage, pages, components, editMode, dragMode)
    : "<html><body><p style='padding:40px;font-family:sans-serif;color:#888'>Page not found</p></body></html>";

  const navigateTo = useCallback(
    (slug: string) => {
      const page = pages.find((p) => p.slug === slug);
      if (!page) return;
      setCurrentSlug(slug);
      setLoading(true);
      setHistory((prev) => [...prev.slice(0, historyIdx + 1), slug]);
      setHistoryIdx((i) => i + 1);
    },
    [pages, historyIdx],
  );

  const refresh = () => {
    setLoading(true);
    if (iframeRef.current) {
      iframeRef.current.srcdoc = "";
      requestAnimationFrame(() => {
        if (iframeRef.current) iframeRef.current.srcdoc = srcdoc;
      });
    }
  };

  const goBack = () => {
    if (historyIdx <= 0) return;
    const i = historyIdx - 1;
    setHistoryIdx(i);
    setCurrentSlug(history[i]);
    setLoading(true);
  };
  const goForward = () => {
    if (historyIdx >= history.length - 1) return;
    const i = historyIdx + 1;
    setHistoryIdx(i);
    setCurrentSlug(history[i]);
    setLoading(true);
  };

  const handleMenuDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = menuPos.x;
    const initialY = menuPos.y;

    const onMove = (mv: MouseEvent) => {
      setMenuPos({
        x: Math.max(12, initialX + (mv.clientX - startX)),
        y: Math.max(12, initialY - (mv.clientY - startY)),
      });
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  useEffect(() => {
    if (!menuRef.current || !contentRef.current) return;
    
    if (isMenuCollapsed) {
      gsap.to(menuRef.current, {
        width: 48,
        height: 48,
        borderRadius: "50%",
        padding: 0,
        gap: 0,
        duration: 0.5,
        ease: "expo.out"
      });
      gsap.to(contentRef.current, {
        opacity: 0,
        scale: 0.8,
        duration: 0.3,
        pointerEvents: "none"
      });
    } else {
      gsap.to(menuRef.current, {
        width: "auto",
        height: "auto",
        borderRadius: 14,
        padding: "6px 8px",
        gap: 10,
        duration: 0.5,
        ease: "back.out(1.4)"
      });
      gsap.to(contentRef.current, {
        opacity: 1,
        scale: 1,
        duration: 0.4,
        delay: 0.2,
        pointerEvents: "auto"
      });
    }
  }, [isMenuCollapsed]);

  // Send mode to iframe when it changes
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "setMode", mode: dragMode ? "move" : "select" },
      "*",
    );
  }, [dragMode, srcdoc]);

  // Message handler from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "navigate" && e.data.slug) {
        navigateTo(e.data.slug);
        return;
      }
      if (e.data?.type === "select" || e.data?.type === "selectmove") {
        setSelectedBid(e.data.bid);
        setSelectionRect({
          top: e.data.rect.top,
          left: e.data.rect.left,
          width: e.data.rect.width,
          height: e.data.rect.height,
        });
        return;
      }
      if (e.data?.type === "deselect") {
        setSelectedBid(null);
        setSelectionRect(null);
        return;
      }
      if (e.data?.type === "update" && e.data.bid) {
        updateElement(e.data.bid, { styles: e.data.styles });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [navigateTo, updateElement]);

  // Global move forwarder for handles
  useEffect(() => {
    if (!activeHandle) return;
    const onMove = (e: MouseEvent) => {
      const iframeRect = iframeWrapRef.current?.getBoundingClientRect();
      if (!iframeRect) return;
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: "forwardMouseMove",
          x: e.clientX - iframeRect.left,
          y: e.clientY - iframeRect.top,
        },
        "*",
      );
    };
    const onUp = () => {
      setActiveHandle(null);
      iframeRef.current?.contentWindow?.postMessage(
        { type: "forwardMouseUp" },
        "*",
      );
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [activeHandle]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // Deselect when clicking outside the iframe overlay area
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedBid(null);
      setSelectionRect(null);
      iframeRef.current?.contentWindow?.postMessage({ type: "deselect" }, "*");
    }
  };

  const handleResizeStart = (x: number, y: number) => {
    const iframeRect = iframeWrapRef.current?.getBoundingClientRect();
    if (!iframeRect || !selectedBid) return;
    setActiveHandle("resize");
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "startResize",
        bid: selectedBid,
        x: x - iframeRect.left,
        y: y - iframeRect.top,
      },
      "*",
    );
  };
  const handleRadiusStart = (x: number, y: number) => {
    const iframeRect = iframeWrapRef.current?.getBoundingClientRect();
    if (!iframeRect || !selectedBid) return;
    setActiveHandle("radius");
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "startRadius",
        bid: selectedBid,
        x: x - iframeRect.left,
        y: y - iframeRect.top,
      },
      "*",
    );
  };

  const iframeRect = iframeWrapRef.current?.getBoundingClientRect() ?? null;
  const canBack = historyIdx > 0;
  const canForward = historyIdx < history.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "#090909" }}
    >
      {/* ── CANVAS ── */}
      <div
        className="flex-1 flex items-start justify-center overflow-auto"
        style={{
          background: viewport === "desktop" ? "#fff" : "#0a0a0a",
          padding: viewport === "desktop" ? 0 : "48px 0 80px",
        }}
        onClick={handleOverlayClick}
      >
        <div
          ref={iframeWrapRef}
          style={{
            width: currentViewport.frameW
              ? `${currentViewport.frameW}px`
              : "100%",
            height: viewport === "desktop" ? "100%" : "auto",
            minHeight: viewport !== "desktop" ? 640 : undefined,
            background: "#fff",
            boxShadow:
              viewport !== "desktop" ? "0 40px 120px rgba(0,0,0,0.6)" : "none",
            borderRadius: viewport !== "desktop" ? 16 : 0,
            overflow: "hidden",
            transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            position: "relative",
          }}
        >
          {loading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 10,
                background: "rgba(255,255,255,0.9)",
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
                      background: "#3b82f6",
                      animation: `bounce 0.8s ${i * 0.15}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <iframe
            key={`${currentSlug}-${editMode}`}
            ref={iframeRef}
            srcDoc={srcdoc}
            sandbox="allow-scripts allow-same-origin allow-forms"
            style={{
              width: "100%",
              height: viewport === "desktop" ? "100vh" : "100%",
              minHeight: viewport !== "desktop" ? 640 : undefined,
              border: "none",
              display: "block",
            }}
            onLoad={() => setLoading(false)}
            title={`Preview: ${currentPage?.name}`}
          />
        </div>

        {/* Selection overlay */}
        {editMode && selectionRect && selectedBid && iframeRect && (
          <SelectionOverlay
            rect={selectionRect}
            iframeRect={iframeRect}
            onResizeStart={handleResizeStart}
            onRadiusStart={handleRadiusStart}
            selectedBid={selectedBid}
            pages={pages}
          />
        )}
      </div>

      {/* ── FLOATING DRAGGABLE MENU ── */}
      <div
        ref={menuRef}
        style={{
          position: "fixed",
          left: menuPos.x,
          bottom: menuPos.y,
          zIndex: 10000,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: "calc(100vw - 48px)",
          background: "rgba(23, 23, 23, 0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: "6px 8px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
      >
        {/* Page Switcher Popup */}
        {showPages && !isMenuCollapsed && (
          <div
            style={{
              background: "#1a1a1a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              padding: 6,
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
              display: "grid",
              gap: 2,
              minWidth: 160,
              position: "absolute",
              bottom: "100%",
              marginBottom: 8,
              left: 0,
            }}
          >
            {pages.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  navigateTo(p.slug);
                  setShowPages(false);
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "none",
                  textAlign: "left",
                  fontSize: 12,
                  background:
                    currentSlug === p.slug
                      ? "rgba(59,130,246,0.2)"
                      : "transparent",
                  color: currentSlug === p.slug ? "#60a5fa" : "#aaa",
                  cursor: "pointer",
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {/* Collapsed Ball View */}
        {isMenuCollapsed && (
          <button
            onClick={() => setIsMenuCollapsed(false)}
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              border: "none",
              background: "transparent",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Maximize2 size={20} />
          </button>
        )}

        {/* Main Toolbar Content */}
        <div
          ref={contentRef}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            visibility: isMenuCollapsed ? "hidden" : "visible",
          }}
        >
          {/* Drag Handle */}
          <div
            onMouseDown={handleMenuDrag}
            style={{
              cursor: "move",
              color: "rgba(255,255,255,0.2)",
              padding: "0 4px",
            }}
          >
            <GripVertical size={16} />
          </div>

          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "rgba(255,255,255,0.08)",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={15} />
          </button>

          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }} />

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={goBack}
              disabled={!canBack}
              style={{
                background: "transparent",
                border: "none",
                color: canBack ? "#fff" : "rgba(255,255,255,0.15)",
                cursor: canBack ? "pointer" : "default",
                padding: 6,
              }}
            >
              <ArrowLeft size={16} />
            </button>
            <button
              onClick={goForward}
              disabled={!canForward}
              style={{
                background: "transparent",
                border: "none",
                color: canForward ? "#fff" : "rgba(255,255,255,0.15)",
                cursor: canForward ? "pointer" : "default",
                padding: 6,
              }}
            >
              <ArrowRight size={16} />
            </button>
            <button
              onClick={refresh}
              style={{
                background: "transparent",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                padding: 6,
              }}
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }} />

          {/* Page Selector */}
          <button
            onClick={() => setShowPages(!showPages)}
            style={{
              padding: "0 10px",
              height: 32,
              borderRadius: 10,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.05)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
            }}
          >
            {currentPage?.name}
            <ChevronDown size={14} />
          </button>

          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }} />

          {/* Modes */}
          <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.05)", padding: 3, borderRadius: 10 }}>
            <button
              onClick={() => { setEditMode(false); setSelectedBid(null); setSelectionRect(null); }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "none",
                background: !editMode ? "rgba(255,255,255,0.15)" : "transparent",
                color: !editMode ? "#fff" : "rgba(255,255,255,0.35)",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}
              title="Preview Mode"
            >
              <Globe size={16} />
            </button>
            <button
              onClick={() => setEditMode(true)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "none",
                background: editMode ? "#3b82f6" : "transparent",
                color: "#fff",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}
              title="Edit Mode"
            >
              <MousePointer size={16} />
            </button>
          </div>

          {editMode && (
            <div style={{ display: "flex", gap: 3, background: "rgba(59,130,246,0.15)", padding: 3, borderRadius: 10 }}>
              <button
                onClick={() => setDragMode(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "none",
                  background: !dragMode ? "#3b82f6" : "transparent",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}
                title="Select Tool"
              >
                <MousePointer size={16} />
              </button>
              <button
                onClick={() => setDragMode(true)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "none",
                  background: dragMode ? "#3b82f6" : "transparent",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}
                title="Move Tool"
              >
                <Move size={16} />
              </button>
            </div>
          )}

          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }} />

          {/* Viewports */}
          <div style={{ display: "flex", gap: 4 }}>
            {VIEWPORTS.map(({ id, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setViewport(id)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  border: "none",
                  background: viewport === id ? "rgba(255,255,255,0.1)" : "transparent",
                  color: viewport === id ? "#fff" : "rgba(255,255,255,0.3)",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>

          {/* URL Info */}
          <div style={{ padding: "0 8px", fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>
            {currentSlug}
          </div>

          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }} />

          {/* Collapse Trigger */}
          <button
            onClick={() => setIsMenuCollapsed(true)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.4)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Minimize Menu"
          >
            <Minimize2 size={16} />
          </button>
        </div>
      </div>

      <style>{`@keyframes bounce { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-6px) } }`}</style>
    </div>
  );
}
