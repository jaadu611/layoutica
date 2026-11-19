"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  Pipette,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Palette,
  Ruler,
  Type,
  Code,
  X,
} from "lucide-react";
import { useBuilderStore } from "@/lib/builder/frontend/store";
import {
  ColorToken,
  TypographyToken,
  SpacingToken,
  DesignTokens,
} from "@/lib/builder/frontend/types";
import {
  extractDesignTokens,
  mergeDesignTokens,
  generateCssVariables,
  generateTailwindExtend,
  generateScssMaps,
  generateDtcgJson,
  mapLayoutToTokens,
} from "@/lib/builder/frontend/tokenExtractor";

const genId = () => Math.random().toString(36).slice(2, 8);

// ─── Sub-components ───────────────────────────────────────────────────────────

function ColorSwatch({
  token,
  onChange,
  onDelete,
  onApply,
}: {
  token: ColorToken;
  onChange: (t: ColorToken) => void;
  onDelete: () => void;
  onApply: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(token.name);

  return (
    <div className="group flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors border border-transparent hover:border-white/5">
      <div className="relative shrink-0" style={{ width: 26, height: 26 }}>
        <input
          type="color"
          value={token.value.startsWith("#") ? token.value.slice(0, 7) : "#ffffff"}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => onChange({ ...token, value: e.target.value })}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
        <div
          className="w-full h-full rounded-md border border-white/15 cursor-pointer shadow-sm"
          style={{ backgroundColor: token.value }}
          title="Click to change color"
        />
      </div>

      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              onChange({ ...token, name: draft.trim() || token.name });
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") {
                onChange({ ...token, name: draft.trim() || token.name });
                setEditing(false);
              }
            }}
            className="w-full bg-black/40 px-1 py-0.5 rounded text-[11px] text-white outline-none border border-blue-500/60"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-[11px] font-medium text-white/70 hover:text-white truncate w-full text-left cursor-text transition-colors"
          >
            {token.name}
          </button>
        )}
        <p className="text-[9.5px] text-white/30 font-mono truncate">{token.value}</p>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onApply(token.value)}
          title="Apply to selected element"
          className="text-white/40 hover:text-blue-400 cursor-pointer transition-colors p-1 rounded hover:bg-white/5"
        >
          <Pipette size={11} />
        </button>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={onDelete}
          title="Delete token"
          className="text-white/40 hover:text-red-400 cursor-pointer transition-colors p-1 rounded hover:bg-white/5"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

function SpacingRow({
  token,
  onChange,
  onDelete,
  onApply,
}: {
  token: SpacingToken;
  onChange: (t: SpacingToken) => void;
  onDelete: () => void;
  onApply: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(token.name);
  const [draftVal, setDraftVal] = useState(token.value);

  const numPx = Math.min(Math.max(parseFloat(token.value) || 0, 0), 100);

  return (
    <div className="group flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors border border-transparent hover:border-white/5">
      {/* Visual length bar */}
      <div className="w-8 shrink-0 flex items-center">
        <div
          className="h-1.5 bg-accent-blue/70 rounded-full"
          style={{ width: `${Math.min(numPx * 0.8 + 2, 32)}px` }}
          title={`${token.value}`}
        />
      </div>

      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="flex-1 bg-black/40 px-1 py-0.5 rounded text-[11px] text-white outline-none border border-blue-500/60"
              placeholder="Name"
            />
            <input
              value={draftVal}
              onChange={(e) => setDraftVal(e.target.value)}
              className="w-14 bg-black/40 px-1 py-0.5 rounded text-[11px] text-white outline-none border border-blue-500/60 text-right"
              placeholder="16px"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") {
                  onChange({
                    ...token,
                    name: draftName.trim() || token.name,
                    value: draftVal.trim() || token.value,
                  });
                  setEditing(false);
                }
              }}
              onBlur={() => {
                onChange({
                  ...token,
                  name: draftName.trim() || token.name,
                  value: draftVal.trim() || token.value,
                });
                setEditing(false);
              }}
            />
          </div>
        ) : (
          <div
            onClick={() => setEditing(true)}
            className="cursor-pointer"
          >
            <p className="text-[11px] font-medium text-white/70 hover:text-white truncate">
              {token.name}
            </p>
            <p className="text-[9.5px] text-white/30 font-mono">{token.value}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onApply(token.value)}
          title="Apply spacing to padding of selected element"
          className="text-white/40 hover:text-blue-400 cursor-pointer transition-colors p-1 rounded hover:bg-white/5"
        >
          <Pipette size={11} />
        </button>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={onDelete}
          title="Delete token"
          className="text-white/40 hover:text-red-400 cursor-pointer transition-colors p-1 rounded hover:bg-white/5"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

function TypographyRow({
  token,
  onChange,
  onDelete,
  onApply,
}: {
  token: TypographyToken;
  onChange: (t: TypographyToken) => void;
  onDelete: () => void;
  onApply: (t: TypographyToken) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(token.name);

  return (
    <div className="group flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors border border-transparent hover:border-white/5">
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              onChange({ ...token, name: draft.trim() || token.name });
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") {
                onChange({ ...token, name: draft.trim() || token.name });
                setEditing(false);
              }
            }}
            className="w-full bg-black/40 px-1 py-0.5 rounded text-[11px] text-white outline-none border border-blue-500/60"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-[11px] font-medium text-white/70 hover:text-white cursor-text text-left w-full transition-colors truncate"
          >
            {token.name}
          </button>
        )}
        <p className="text-[9.5px] text-white/30 font-mono truncate">
          {token.fontSize} · w{token.fontWeight} · lh{token.lineHeight}
        </p>
      </div>

      <div
        className="shrink-0 text-white/40 px-1 font-serif select-none"
        style={{
          fontSize: Math.min(Math.max(parseInt(token.fontSize, 10) * 0.45, 11), 17),
          fontWeight: token.fontWeight,
          lineHeight: 1,
        }}
      >
        Aa
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => onApply(token)}
          title="Apply to selected element"
          className="text-white/40 hover:text-blue-400 cursor-pointer transition-colors p-1 rounded hover:bg-white/5"
        >
          <Pipette size={11} />
        </button>
        <button
          onClick={onDelete}
          title="Delete token"
          className="text-white/40 hover:text-red-400 cursor-pointer transition-colors p-1 rounded hover:bg-white/5"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

// ─── Export View ─────────────────────────────────────────────────────────────

function ExportView({ tokens }: { tokens: DesignTokens }) {
  const [format, setFormat] = useState<"css" | "tailwind" | "scss" | "json">(
    "css",
  );
  const [copied, setCopied] = useState(false);

  let code = "";
  if (format === "css") {
    code = generateCssVariables(tokens);
  } else if (format === "tailwind") {
    code = generateTailwindExtend(tokens);
  } else if (format === "scss") {
    code = generateScssMaps(tokens);
  } else if (format === "json") {
    code = generateDtcgJson(tokens);
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full gap-2.5">
      <div className="flex items-center justify-between gap-1">
        <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5 text-[10px]">
          {(["css", "tailwind", "scss", "json"] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setFormat(fmt)}
              className={`px-2 py-0.5 rounded-md uppercase font-semibold transition-all cursor-pointer ${
                format === fmt
                  ? "bg-accent-blue text-white shadow-sm"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5 transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check size={11} className="text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <div className="flex-1 min-h-0 bg-[#0d0e12] rounded-lg border border-white/10 p-2.5 overflow-auto">
        <pre className="text-[10px] font-mono text-white/80 leading-relaxed whitespace-pre font-normal">
          {code}
        </pre>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface Props {
  floating?: boolean;
  onClose?: () => void;
}

export default function DesignTokensPanel({
  floating = false,
  onClose,
}: Props) {
  const {
    pages,
    setPages,
    getSelectedElement,
    updateElement,
    editingElementId,
    designTokens,
    setDesignTokens,
  } = useBuilderStore();

  const [tab, setTab] = useState<"colors" | "spacing" | "typography" | "code">(
    "colors",
  );
  const [notification, setNotification] = useState<string | null>(null);

  const tokens: DesignTokens = {
    colors: designTokens?.colors || [],
    spacing: designTokens?.spacing || [],
    typography: designTokens?.typography || [],
  };

  const persist = (next: DesignTokens) => {
    setDesignTokens(next);
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // ─── Auto-Extract from Layout ───────────────────────────────────────────────
  const handleAutoExtract = () => {
    const extracted = extractDesignTokens(pages);
    const merged = mergeDesignTokens(tokens, extracted);
    persist(merged);
    const totalFound =
      extracted.colors.length +
      extracted.spacing.length +
      extracted.typography.length;
    showToast(
      `Extracted ${extracted.colors.length} colors, ${extracted.spacing.length} spacing scales, ${extracted.typography.length} styles`,
    );
  };

  // ─── Sync / Map Tokens to Layout ────────────────────────────────────────────
  const handleSyncToLayout = () => {
    const { updatedPages, replacementsCount } = mapLayoutToTokens(
      pages,
      tokens,
    );
    if (replacementsCount > 0) {
      setPages(updatedPages);
      showToast(`Mapped ${replacementsCount} hardcoded values to CSS variables`);
    } else {
      showToast(`All values are already synced with tokens`);
    }
  };

  // ─── Apply to element ───────────────────────────────────────────────────────
  const applyColor = (value: string) => {
    const el = getSelectedElement();
    if (!el) return;
    const prop = editingElementId === el.id ? "color" : "backgroundColor";
    updateElement(el.id, { styles: { ...el.styles, [prop]: value } });
  };

  const applySpacing = (value: string) => {
    const el = getSelectedElement();
    if (!el) return;
    updateElement(el.id, {
      styles: {
        ...el.styles,
        padding: value,
      },
    });
  };

  const applyTypography = (t: TypographyToken) => {
    const el = getSelectedElement();
    if (!el) return;
    updateElement(el.id, {
      styles: {
        ...el.styles,
        fontSize: t.fontSize,
        fontWeight: t.fontWeight,
        lineHeight: t.lineHeight,
        letterSpacing: t.letterSpacing || undefined,
      },
    });
  };

  const addColor = () => {
    persist({
      ...tokens,
      colors: [
        ...tokens.colors,
        { id: genId(), name: `color-${tokens.colors.length + 1}`, value: "#3b82f6" },
      ],
    });
  };

  const addSpacing = () => {
    persist({
      ...tokens,
      spacing: [
        ...tokens.spacing,
        { id: genId(), name: `space-${tokens.spacing.length + 1}`, value: "16px" },
      ],
    });
  };

  const addTypography = () => {
    persist({
      ...tokens,
      typography: [
        ...tokens.typography,
        {
          id: genId(),
          name: `text-${tokens.typography.length + 1}`,
          fontSize: "16px",
          fontWeight: "400",
          lineHeight: "1.5",
          letterSpacing: "0",
        },
      ],
    });
  };

  const inner = (
    <div className="flex flex-col h-full bg-[#121318]" style={{ minHeight: 0 }}>
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 px-3.5 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Palette size={14} className="text-accent-blue" />
          <span className="text-[12px] font-semibold text-white/90 tracking-tight">
            Design Tokens
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Auto Extract Button */}
          <button
            onClick={handleAutoExtract}
            title="Auto-extract colors, spacing scales & typography from layout"
            className="flex items-center gap-1 text-[10.5px] px-2 py-1 rounded-md bg-accent-blue/15 hover:bg-accent-blue/25 text-accent-blue border border-accent-blue/30 transition-colors font-medium cursor-pointer"
          >
            <Sparkles size={11} />
            <span>Extract</span>
          </button>

          {/* Sync to Layout Button */}
          <button
            onClick={handleSyncToLayout}
            title="Replace hardcoded styles in layout with CSS variable tokens"
            className="flex items-center gap-1 text-[10.5px] px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors cursor-pointer"
          >
            <RefreshCw size={11} />
            <span>Sync</span>
          </button>

          {floating && onClose && (
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white p-1 rounded-md transition-colors ml-1 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className="px-3 py-1.5 bg-accent-blue/15 border-b border-accent-blue/30 text-[10.5px] text-blue-200 text-center animate-in fade-in duration-150">
          {notification}
        </div>
      )}

      {/* Tabs */}
      <div className="flex px-3 pt-2.5 gap-1 shrink-0 border-b border-white/5 pb-2">
        {(
          [
            { id: "colors", label: "Colors", icon: Palette },
            { id: "spacing", label: "Spacing", icon: Ruler },
            { id: "typography", label: "Type", icon: Type },
            { id: "code", label: "Code", icon: Code },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const count =
            t.id === "colors"
              ? tokens.colors.length
              : t.id === "spacing"
                ? tokens.spacing.length
                : t.id === "typography"
                  ? tokens.typography.length
                  : null;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                tab === t.id
                  ? "bg-white/10 text-white shadow-sm border border-white/10"
                  : "text-white/40 hover:text-white/70 hover:bg-white/5"
              }`}
            >
              <Icon size={11} />
              <span>{t.label}</span>
              {count !== null && count > 0 && (
                <span className="text-[9px] px-1 py-0.2 bg-white/10 rounded-full text-white/60">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div
        className="flex-1 overflow-y-auto px-3 py-2.5 space-y-1.5"
        style={{ minHeight: 0 }}
      >
        {tab === "colors" && (
          <div className="space-y-1">
            {tokens.colors.map((token) => (
              <ColorSwatch
                key={token.id}
                token={token}
                onChange={(updated) =>
                  persist({
                    ...tokens,
                    colors: tokens.colors.map((c) =>
                      c.id === updated.id ? updated : c,
                    ),
                  })
                }
                onDelete={() =>
                  persist({
                    ...tokens,
                    colors: tokens.colors.filter((c) => c.id !== token.id),
                  })
                }
                onApply={(val) => applyColor(val)}
              />
            ))}
            <button
              onClick={addColor}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-white/15 hover:border-white/30 text-white/40 hover:text-white/80 text-[11px] transition-colors mt-2 cursor-pointer bg-white/[0.02]"
            >
              <Plus size={11} /> Add color
            </button>
          </div>
        )}

        {tab === "spacing" && (
          <div className="space-y-1">
            {tokens.spacing.map((token) => (
              <SpacingRow
                key={token.id}
                token={token}
                onChange={(updated) =>
                  persist({
                    ...tokens,
                    spacing: tokens.spacing.map((s) =>
                      s.id === updated.id ? updated : s,
                    ),
                  })
                }
                onDelete={() =>
                  persist({
                    ...tokens,
                    spacing: tokens.spacing.filter((s) => s.id !== token.id),
                  })
                }
                onApply={applySpacing}
              />
            ))}
            <button
              onClick={addSpacing}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-white/15 hover:border-white/30 text-white/40 hover:text-white/80 text-[11px] transition-colors mt-2 cursor-pointer bg-white/[0.02]"
            >
              <Plus size={11} /> Add spacing
            </button>
          </div>
        )}

        {tab === "typography" && (
          <div className="space-y-1">
            {tokens.typography.map((token) => (
              <TypographyRow
                key={token.id}
                token={token}
                onChange={(updated) =>
                  persist({
                    ...tokens,
                    typography: tokens.typography.map((t) =>
                      t.id === updated.id ? updated : t,
                    ),
                  })
                }
                onDelete={() =>
                  persist({
                    ...tokens,
                    typography: tokens.typography.filter(
                      (t) => t.id !== token.id,
                    ),
                  })
                }
                onApply={applyTypography}
              />
            ))}
            <button
              onClick={addTypography}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-white/15 hover:border-white/30 text-white/40 hover:text-white/80 text-[11px] transition-colors mt-2 cursor-pointer bg-white/[0.02]"
            >
              <Plus size={11} /> Add style
            </button>
          </div>
        )}

        {tab === "code" && <ExportView tokens={tokens} />}
      </div>
    </div>
  );

  if (floating) {
    return (
      <div
        className="fixed z-50 flex flex-col overflow-hidden shadow-2xl border border-white/10 rounded-xl"
        style={{
          top: 56,
          right: 280,
          width: 330,
          height: 480,
          maxHeight: "calc(100vh - 72px)",
          backdropFilter: "blur(20px)",
        }}
      >
        {inner}
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: "100%" }}>
      {inner}
    </div>
  );
}
