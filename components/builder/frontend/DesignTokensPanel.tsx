"use client";

import { useState } from "react";
import { Plus, Trash2, Pipette } from "lucide-react";
import { useBuilderStore } from "@/lib/builder/frontend/store";

export interface ColorToken {
  id: string;
  name: string;
  value: string;
}

export interface TypographyToken {
  id: string;
  name: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
}

export interface DesignTokens {
  colors: ColorToken[];
  typography: TypographyToken[];
}



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
    <div className="group flex items-center gap-2">
      <div className="relative shrink-0" style={{ width: 28, height: 28 }}>
        <input
          type="color"
          value={token.value}
          onMouseDown={(e) => e.preventDefault()}
          onChange={(e) => onChange({ ...token, value: e.target.value })}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
        <div
          className="w-full h-full rounded-lg border border-white/10 cursor-pointer"
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
            className="w-full bg-transparent text-[11px] text-white outline-none border-b border-blue-500"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-[11px] text-white/55 hover:text-white/80 truncate w-full text-left cursor-text transition-colors"
          >
            {token.name}
          </button>
        )}
        <p className="text-[9px] text-white/25 font-mono">{token.value}</p>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onApply(token.value)}
          title="Apply to selected element (text color if editing, background otherwise)"
          className="text-white/30 hover:text-blue-400 cursor-pointer transition-colors p-1"
        >
          <Pipette size={10} />
        </button>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={onDelete}
          className="text-white/30 hover:text-red-400 cursor-pointer transition-colors p-1"
        >
          <Trash2 size={10} />
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
    <div className="group flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
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
            className="w-full bg-transparent text-[11px] text-white outline-none border-b border-blue-500"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-[11px] font-semibold text-white/65 hover:text-white/90 cursor-text text-left w-full transition-colors"
          >
            {token.name}
          </button>
        )}
        <p className="text-[9px] text-white/25 font-mono">
          {token.fontSize} / {token.fontWeight} / lh {token.lineHeight}
        </p>
      </div>

      <div
        className="shrink-0 text-white/40"
        style={{
          fontSize: Math.min(parseInt(token.fontSize) * 0.5, 18),
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
          className="text-white/30 hover:text-blue-400 cursor-pointer transition-colors p-1"
        >
          <Pipette size={10} />
        </button>
        <button
          onClick={onDelete}
          className="text-white/30 hover:text-red-400 cursor-pointer transition-colors p-1"
        >
          <Trash2 size={10} />
        </button>
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
    getSelectedElement,
    updateElement,
    editingElementId,
    designTokens,
    setDesignTokens,
  } = useBuilderStore();
  const [tab, setTab] = useState<"colors" | "typography">("colors");

  const tokens = designTokens || { colors: [], typography: [] };

  const persist = (next: DesignTokens) => {
    setDesignTokens(next);
  };

  const applyColor = (value: string) => {
    const el = getSelectedElement();
    if (!el) return;
    // If we're actively editing text (double-clicked), apply to text color.
    // Otherwise apply to background.
    const prop = editingElementId === el.id ? "color" : "backgroundColor";
    updateElement(el.id, { styles: { ...el.styles, [prop]: value } });
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
        { id: genId(), name: "New Color", value: "#6366f1" },
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
          name: "New Style",
          fontSize: "16px",
          fontWeight: "400",
          lineHeight: "1.5",
          letterSpacing: "0",
        },
      ],
    });
  };

  const inner = (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      {/* Header */}
      <div
        className="flex items-center justify-between shrink-0 px-4 py-3"
        style={{ borderBottom: "1px solid var(--panel-border)" }}
      >
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(255,255,255,0.7)",
          }}
        >
          Design Tokens
        </p>
        {floating && onClose && (
          <button
            onClick={onClose}
            style={{
              color: "rgba(255,255,255,0.3)",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path
                d="M1 1l11 11M12 1L1 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex px-3 pt-3 gap-1 shrink-0">
        {(["colors", "typography"] as const).map((t) => (
          <button
            key={t}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setTab(t)}
            className="flex-1 py-1.5 rounded-md cursor-pointer transition-all capitalize"
            style={{
              fontSize: 11,
              fontWeight: 500,
              border: "none",
              background: tab === t ? "rgba(255,255,255,0.09)" : "transparent",
              color:
                tab === t ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Body */}
      <div
        className="flex-1 overflow-y-auto px-3 pb-3 pt-2"
        style={{ minHeight: 0 }}
      >
        {tab === "colors" && (
          <div className="space-y-2">
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
              onMouseDown={(e) => e.preventDefault()}
              onClick={addColor}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg cursor-pointer transition-all mt-2"
              style={{
                border: "1px dashed rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.3)",
                fontSize: 11,
                background: "transparent",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "rgba(255,255,255,0.6)";
                (e.currentTarget as HTMLElement).style.borderColor =
                  "rgba(255,255,255,0.25)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "rgba(255,255,255,0.3)";
                (e.currentTarget as HTMLElement).style.borderColor =
                  "rgba(255,255,255,0.1)";
              }}
            >
              <Plus size={11} /> Add color
            </button>
          </div>
        )}

        {tab === "typography" && (
          <div>
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
              onMouseDown={(e) => e.preventDefault()}
              onClick={addTypography}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg cursor-pointer transition-all mt-2"
              style={{
                border: "1px dashed rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.3)",
                fontSize: 11,
                background: "transparent",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "rgba(255,255,255,0.6)";
                (e.currentTarget as HTMLElement).style.borderColor =
                  "rgba(255,255,255,0.25)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "rgba(255,255,255,0.3)";
                (e.currentTarget as HTMLElement).style.borderColor =
                  "rgba(255,255,255,0.1)";
              }}
            >
              <Plus size={11} /> Add style
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (floating) {
    return (
      <div
        className="fixed z-50 flex flex-col overflow-hidden"
        style={{
          top: 60,
          right: 248,
          width: 240,
          maxHeight: "calc(100vh - 80px)",
          background: "var(--panel-bg)",
          border: "1px solid var(--panel-border)",
          borderRadius: 12,
          boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
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
