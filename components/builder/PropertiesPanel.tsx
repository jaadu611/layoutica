"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useBuilderStore } from "@/lib/builder/store";
import { StyleProps } from "@/lib/builder/types";
import {
  Link as LinkIcon,
  Unlink,
  MousePointer2,
  Layers,
  ChevronDown,
  Italic,
  Underline,
  Strikethrough,
  Upload,
  X,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalSpaceBetween,
  AlignHorizontalSpaceAround,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  StretchVertical,
  Baseline,
  LayoutGrid,
} from "lucide-react";

const FONT_FAMILIES = [
  { value: "inherit", label: "Inherit" },
  { value: "Inter, sans-serif", label: "Inter" },
  { value: "Geist, sans-serif", label: "Geist" },
  { value: "'Playfair Display', serif", label: "Playfair Display" },
  { value: "'DM Sans', sans-serif", label: "DM Sans" },
  { value: "'Space Grotesk', sans-serif", label: "Space Grotesk" },
  { value: "'Plus Jakarta Sans', sans-serif", label: "Plus Jakarta Sans" },
  { value: "'Bricolage Grotesque', sans-serif", label: "Bricolage Grotesque" },
  { value: "'Fraunces', serif", label: "Fraunces" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Courier New', monospace", label: "Courier New" },
  { value: "monospace", label: "Monospace" },
];

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@400;500;700&family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700&family=Bricolage+Grotesque:wght@400;600;700&family=Fraunces:ital,wght@0,400;0,700;1,400&display=swap";

let fontDebounceTimer: ReturnType<typeof setTimeout> | null = null;
function loadCustomGoogleFont(name: string, onReady: (name: string) => void) {
  if (fontDebounceTimer) clearTimeout(fontDebounceTimer);
  fontDebounceTimer = setTimeout(() => {
    if (typeof document === "undefined" || !name) return;
    const clean = name.replace(/['"]/g, "").split(",")[0].trim();
    if (!clean) return;
    const family = clean.replace(/\s+/g, "+");
    const linkId = `gfont-${family}`;
    if (document.getElementById(linkId)) {
      onReady(clean);
      return;
    }
    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${family}:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap`;
    link.onload = () => onReady(clean);
    link.onerror = () => onReady(clean);
    document.head.appendChild(link);
  }, 600);
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[9.5px] uppercase tracking-widest text-white/50 block mb-1 font-semibold">
      {children}
    </label>
  );
}
function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value?: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value?.toString() ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-[11px] bg-app-bg border border-white/10 hover:border-white/20 rounded px-2 py-1 outline-none focus:border-blue-500/60 focus:bg-panel-bg-hover text-white placeholder-white/30 transition-all font-medium cursor-text [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}
function Textarea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full text-[11px] bg-app-bg border border-white/10 hover:border-white/20 rounded px-2 py-1.5 outline-none focus:border-blue-500/60 focus:bg-panel-bg-hover text-white resize-none font-medium placeholder-white/30 cursor-text transition-all"
    />
  );
}
function MediaPicker({
  value,
  onChange,
  accept = "image/*",
  label = "Upload File",
}: {
  value?: string;
  onChange: (v: string) => void;
  accept?: string;
  label?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("File is too large. Please keep it under 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => onChange(event.target?.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div className="space-y-2">
      {value && value.startsWith("data:") ? (
        <div className="relative group rounded-lg overflow-hidden border border-white/10 aspect-video bg-black/40">
          {accept.includes("image") ? (
            <img
              src={value}
              className="w-full h-full object-contain"
              alt="Preview"
            />
          ) : accept.includes("video") ? (
            <video src={value} className="w-full h-full object-contain" />
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <span className="text-[10px] text-white/40">
                Audio file selected
              </span>
            </div>
          )}
          <button
            onClick={() => onChange("")}
            className="absolute top-1 right-1 p-1.5 bg-black/60 rounded-full text-white/60 hover:text-white hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-white/10 rounded-lg text-white/40 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group"
        >
          <Upload
            size={14}
            className="group-hover:-translate-y-px transition-transform"
          />
          <span className="text-[11px] font-medium">{label}</span>
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
function Select({
  value,
  onChange,
  options,
}: {
  value?: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const chevronRef = useRef<SVGSVGElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const selected = options.find((o) => o.value === (value || "")) || options[0];
  const openMenu = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuStyle({
        position: "fixed",
        left: rect.left,
        top: rect.bottom + 4,
        width: rect.width,
        zIndex: 99999,
      });
    }
    setOpen(true);
    if (chevronRef.current)
      gsap.to(chevronRef.current, {
        rotation: 180,
        duration: 0.2,
        ease: "power2.out",
        transformOrigin: "50% 50%",
      });
  };
  const closeMenu = () => {
    if (menuRef.current)
      gsap.to(menuRef.current, {
        opacity: 0,
        y: -4,
        scaleY: 0.94,
        duration: 0.14,
        ease: "power2.in",
        onComplete: () => setOpen(false),
      });
    else setOpen(false);
    if (chevronRef.current)
      gsap.to(chevronRef.current, {
        rotation: 0,
        duration: 0.18,
        ease: "power2.out",
        transformOrigin: "50% 50%",
      });
  };
  const toggle = () => (open ? closeMenu() : openMenu());
  const pick = (val: string) => {
    onChange(val);
    closeMenu();
  };
  useEffect(() => {
    if (open && menuRef.current)
      gsap.fromTo(
        menuRef.current,
        { opacity: 0, y: -5, scaleY: 0.9, transformOrigin: "top center" },
        { opacity: 1, y: 0, scaleY: 1, duration: 0.2, ease: "power3.out" },
      );
  }, [open]);
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      )
        closeMenu();
    };
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);
  const menu =
    open && mounted ? (
      <div
        ref={menuRef}
        style={{
          ...menuStyle,
          background: "linear-gradient(145deg, var(--panel-bg-hover) 0%, var(--app-bg) 100%)",
          border: "1px solid var(--panel-border)",
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
          borderRadius: 8,
          overflow: "hidden",
          transformOrigin: "top center",
          maxHeight: 240,
          overflowY: "auto",
        }}
      >
        <div className="py-1">
          {options.map((opt) => {
            const isActive = opt.value === (value || "");
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => pick(opt.value)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${isActive ? "text-white bg-white/8" : "text-white/50 hover:text-white/90 hover:bg-white/5"}`}
              >
                <span>{opt.label}</span>
                {isActive && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path
                      d="M1 4l2.5 2.5L9 1"
                      stroke="#60a5fa"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>
    ) : null;
  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        className={`w-full flex items-center justify-between text-[11px] bg-app-bg border ${open ? "border-blue-500/60 bg-panel-bg-hover" : "border-white/10 hover:border-white/20"} rounded px-2 py-1 text-white font-medium transition-all cursor-pointer`}
      >
        <span className="truncate">{selected?.label ?? "—"}</span>
        <ChevronDown
          ref={chevronRef as any}
          className="w-3 h-3 text-white/25 shrink-0 ml-1"
          style={{ willChange: "transform" }}
        />
      </button>
      {mounted && typeof document !== "undefined"
        ? createPortal(menu, document.body)
        : null}
    </div>
  );
}
function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2 items-center">
      <div className="relative w-7 h-7 shrink-0 rounded-md overflow-hidden border border-white/10">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
        <div
          className="w-full h-full"
          style={{ backgroundColor: value || "#000000" }}
        />
      </div>
      <Input value={value} onChange={onChange} placeholder="#HEX" />
    </div>
  );
}
function Row({
  children,
  cols = 2,
}: {
  children: React.ReactNode;
  cols?: number;
}) {
  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {children}
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function ToggleButton({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex-1 py-1.5 rounded flex items-center justify-center transition-all cursor-pointer border ${active ? "bg-blue-500/20 border-blue-500/40 text-blue-300" : "bg-white/3 border-white/5 text-white/30 hover:text-white/60 hover:bg-white/6"}`}
    >
      {children}
    </button>
  );
}
function Section({
  title,
  children,
  collapsible = false,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const chevronRef = useRef<SVGSVGElement>(null);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (!collapsible || !contentRef.current) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      gsap.set(contentRef.current, {
        height: defaultOpen ? "auto" : 0,
        opacity: defaultOpen ? 1 : 0,
        overflow: "hidden",
      });
      return;
    }
    if (open) {
      gsap.set(contentRef.current, { display: "block" });
      gsap.fromTo(
        contentRef.current,
        { height: 0, opacity: 0 },
        {
          height: "auto",
          opacity: 1,
          duration: 0.32,
          ease: "power3.out",
          clearProps: "height,overflow",
        },
      );
    } else {
      gsap.to(contentRef.current, {
        height: 0,
        opacity: 0,
        duration: 0.24,
        ease: "power3.in",
        onComplete: () => {
          if (contentRef.current)
            gsap.set(contentRef.current, { display: "none" });
        },
      });
    }
  }, [open, collapsible, defaultOpen]);
  useEffect(() => {
    if (!chevronRef.current) return;
    gsap.to(chevronRef.current, {
      rotation: open ? 0 : -90,
      duration: 0.28,
      ease: "power2.inOut",
      transformOrigin: "50% 50%",
    });
  }, [open]);
  return (
    <div>
      <button
        onClick={() => collapsible && setOpen((o) => !o)}
        className={`w-full flex items-center justify-between py-2 group ${collapsible ? "cursor-pointer" : "cursor-default"}`}
      >
        <span
          className={`text-[9.5px] uppercase tracking-widest font-semibold transition-colors duration-150 ${collapsible ? (open ? "text-white/50 group-hover:text-white/70" : "text-white/30 group-hover:text-white/50") : "text-white/35"}`}
        >
          {title}
        </span>
        {collapsible && (
          <ChevronDown
            ref={chevronRef as any}
            size={11}
            className="text-white/25 shrink-0"
            style={{ willChange: "transform" }}
          />
        )}
      </button>
      <div
        ref={contentRef}
        style={{
          overflow: "hidden",
          display: !collapsible || defaultOpen ? "block" : "none",
        }}
      >
        <div className="pb-3 space-y-2">{children}</div>
      </div>
      <div className="h-px bg-white/5 -mx-3" />
    </div>
  );
}
function ElementHeader({
  el,
  onRename,
}: {
  el: { id: string; type: string; metadata?: { name?: string } };
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const displayName =
    el.metadata?.name ||
    el.type
      .replace(/([A-Z])/g, " $1")
      .replace(/(\d)/g, " $1")
      .trim();
  const startEdit = () => {
    setDraft(el.metadata?.name || "");
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };
  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed) onRename(trimmed);
    setEditing(false);
  };
  return (
    <div className="h-11 px-3 border-b border-panel-border flex items-center justify-between bg-panel-bg shrink-0">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Layers className="w-3 h-3 text-blue-400/80 shrink-0" />
        {editing ? (
          <input
            ref={inputRef}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            placeholder={displayName}
            className="flex-1 bg-transparent text-[11px] font-bold text-white outline-none border-b border-blue-500 min-w-0"
          />
        ) : (
          <button
            onClick={startEdit}
            title="Click to rename"
            className="flex-1 text-left text-[11px] font-bold text-white/70 capitalize tracking-wide truncate hover:text-white transition-colors cursor-text"
          >
            {displayName}
          </button>
        )}
      </div>
      <span className="text-[9px] text-white/15 font-mono bg-white/5 px-1.5 py-0.5 rounded shrink-0 ml-2">
        {el.id.slice(-4)}
      </span>
    </div>
  );
}

// ─── State Selector ───────────────────────────────────────────────────────────
const STYLING_STATES = ["default", "hover", "active", "focus"] as const;
type StylingStateTab = (typeof STYLING_STATES)[number];
function StateSelectorBar({
  current,
  onChange,
  onReset,
  hasOverrides,
}: {
  current: StylingStateTab;
  onChange: (s: StylingStateTab) => void;
  onReset: () => void;
  hasOverrides: boolean;
}) {
  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-panel-border bg-panel-bg shrink-0">
      {STYLING_STATES.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`flex-1 py-1 rounded text-[10px] font-semibold capitalize tracking-wide transition-all cursor-pointer ${current === s ? "bg-blue-600 text-white shadow-sm shadow-blue-900/40" : "text-white/30 hover:text-white/60 hover:bg-white/5"}`}
        >
          {s}
        </button>
      ))}
      {current !== "default" && (
        <button
          type="button"
          onClick={onReset}
          title={`Clear all ${current} styles`}
          className={`ml-1 px-1.5 py-1 rounded text-[9px] font-bold transition-all cursor-pointer ${hasOverrides ? "text-red-400/70 hover:text-red-400 hover:bg-red-500/10" : "text-white/15 cursor-default"}`}
        >
          ✕
        </button>
      )}
    </div>
  );
}

function parseShorthand(val: string): { top: string; right: string; bottom: string; left: string } {
  const parts = val.trim().split(/\s+/).filter(Boolean);
  let top = "0px", right = "0px", bottom = "0px", left = "0px";
  if (parts.length === 1) {
    top = right = bottom = left = parts[0];
  } else if (parts.length === 2) {
    top = bottom = parts[0];
    right = left = parts[1];
  } else if (parts.length === 3) {
    top = parts[0];
    right = left = parts[1];
    bottom = parts[2];
  } else if (parts.length >= 4) {
    top = parts[0];
    right = parts[1];
    bottom = parts[2];
    left = parts[3];
  }
  return { top, right, bottom, left };
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export default function PropertiesPanel() {
  const { getSelectedElement, updateElement, stylingState, setStylingState } =
    useBuilderStore();
  const el = getSelectedElement();
  const panelRef = useRef<HTMLDivElement>(null);
  const prevElId = useRef<string | null>(null);
  const [padLinked, setPadLinked] = useState(true);
  const [marLinked, setMarLinked] = useState(true);
  const [borderLinked, setBorderLinked] = useState(true);

  useEffect(() => {
    if (!panelRef.current) return;
    if (el && el.id !== prevElId.current) {
      prevElId.current = el.id;
      // Fix 4: reset to Default tab whenever a different element is selected
      setStylingState("default");
      gsap.fromTo(
        panelRef.current,
        { opacity: 0, x: 8 },
        { opacity: 1, x: 0, duration: 0.22, ease: "power2.out" },
      );
    }
  }, [el?.id]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const id = "buildify-google-fonts";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = GOOGLE_FONTS_URL;
      document.head.appendChild(link);
    }
  }, []);

  if (!el)
    return (
      <div className="w-[240px] border-l border-panel-border bg-panel-bg flex flex-col items-center justify-center p-6 text-center h-full shrink-0">
        <div className="w-8 h-8 rounded-lg bg-white/4 flex items-center justify-center mb-3">
          <MousePointer2 className="w-4 h-4 text-white/20" />
        </div>
        <p className="text-[10px] text-white/20 uppercase tracking-widest font-semibold leading-relaxed">
          Select a layer
          <br />
          to edit
        </p>
      </div>
    );

  const update = (key: string, value: any) =>
    updateElement(el.id, { [key]: value } as any);

  // Check whether the current non-default tab has any overrides set
  const hasOverrides = (() => {
    if (stylingState === "hover")
      return Object.keys(el.hoverStyles ?? {}).length > 0;
    if (stylingState === "active")
      return Object.keys(el.activeStyles ?? {}).length > 0;
    if (stylingState === "focus")
      return Object.keys(el.focusStyles ?? {}).length > 0;
    return false;
  })();

  // Fix 3: clear all styles for the current non-default tab
  const resetStateStyles = () => {
    if (stylingState === "hover") updateElement(el.id, { hoverStyles: {} });
    else if (stylingState === "active")
      updateElement(el.id, { activeStyles: {} });
    else if (stylingState === "focus")
      updateElement(el.id, { focusStyles: {} });
  };

  // Read value from the correct style bucket for the active tab
  const gsv = (key: keyof StyleProps): any => {
    if (stylingState === "hover") return el.hoverStyles?.[key];
    if (stylingState === "active") return el.activeStyles?.[key];
    if (stylingState === "focus") return el.focusStyles?.[key];
    return (el.styles as any)[key];
  };

  // Write only the single changed key into the correct bucket.
  // NEVER spread el.styles here — the store merges via { ...el.hoverStyles, ...updates.styles }
  // so spreading would flood the hover/active bucket with all base styles.
  const updateStyle = (key: keyof StyleProps, value: any) => {
    let val: any = value;
    if (key === "backgroundImage" && value && !value.includes("url("))
      val = `url("${value}")`;
    else if (key === "opacity")
      val = value === "" ? undefined : Number(value) / 100;
    else if (
      ["zIndex", "flexGrow", "flexShrink", "gradientAngle"].includes(key)
    )
      val = value === "" ? undefined : Number(value);
    updateElement(el.id, { styles: { [key]: val } }, stylingState);
  };

  const toggleStyle = (
    key: keyof StyleProps,
    value: string,
    fallback?: string,
  ) => updateStyle(key, gsv(key) === value ? fallback : value);

  const updateAllSides = (
    type: "padding" | "margin" | "border",
    value: any,
    property?: string,
  ) => {
    const val = value === "" ? undefined : value;
    const updates: any = {};
    const suffix = property || "";
    if (type === "padding") {
      updates.padding = val;
      updates.paddingTop = val;
      updates.paddingRight = val;
      updates.paddingBottom = val;
      updates.paddingLeft = val;
    } else if (type === "margin") {
      updates.margin = val;
      updates.marginTop = val;
      updates.marginRight = val;
      updates.marginBottom = val;
      updates.marginLeft = val;
    } else if (type === "border") {
      updates[`borderTop${suffix}`] = val;
      updates[`borderRight${suffix}`] = val;
      updates[`borderBottom${suffix}`] = val;
      updates[`borderLeft${suffix}`] = val;
    }
    updateElement(el.id, { styles: updates }, stylingState);
  };

  const hasText = [
    "h1",
    "h2",
    "h3",
    "p",
    "span",
    "button",
    "a",
    "label",
    "heading",
    "heading2",
    "heading3",
    "heading4",
    "heading5",
    "heading6",
    "text",
    "paragraph",
    "badge",
    "blockquote",
    "code",
    "pre",
    "legend",
  ].includes(el.type);
  const isLayout = [
    "div",
    "section",
    "article",
    "aside",
    "header",
    "footer",
    "main",
    "nav",
    "container",
    "flex",
    "fieldset",
    "dialog",
  ].includes(el.type);

  return (
    <div className="w-[240px] border-l border-panel-border bg-panel-bg flex flex-col shrink-0 overflow-hidden select-none h-full">
      <ElementHeader
        el={el}
        onRename={(name) =>
          updateElement(el.id, { metadata: { ...el.metadata, name } })
        }
      />
      <StateSelectorBar
        current={stylingState as StylingStateTab}
        onChange={(s) => setStylingState(s)}
        onReset={resetStateStyles}
        hasOverrides={hasOverrides}
      />

      <div ref={panelRef} className="flex-1 overflow-y-auto px-3">
        {el.type === "image" && (
          <Section title="Image">
            <Field label="URL">
              <Input
                value={el.src || ""}
                onChange={(v) => update("src", v)}
                placeholder="https://..."
              />
            </Field>
            <Field label="Or Upload">
              <MediaPicker
                value={el.src}
                onChange={(v) => update("src", v)}
                accept="image/*"
                label="Upload Image"
              />
            </Field>
            <Field label="Alt Text">
              <Input
                value={el.alt || ""}
                onChange={(v) => update("alt", v)}
                placeholder="Describe the image"
              />
            </Field>
            <Field label="Object Fit">
              <Select
                value={gsv("objectFit")}
                onChange={(v) => updateStyle("objectFit", v as any)}
                options={[
                  { value: "cover", label: "Cover" },
                  { value: "contain", label: "Contain" },
                  { value: "fill", label: "Fill" },
                  { value: "none", label: "None" },
                ]}
              />
            </Field>
          </Section>
        )}
        {el.type === "video" && (
          <Section title="Video">
            <Field label="Video URL">
              <Input
                value={el.videoSrc || ""}
                onChange={(v) => update("videoSrc", v)}
                placeholder="https://video.mp4"
              />
            </Field>
            <Field label="Or Upload">
              <MediaPicker
                value={el.videoSrc}
                onChange={(v) => update("videoSrc", v)}
                accept="video/*"
                label="Upload Video"
              />
            </Field>
            <Field label="Poster Image">
              <Input
                value={el.videoPoster || ""}
                onChange={(v) => update("videoPoster", v)}
                placeholder="https://poster.jpg"
              />
            </Field>
            <div className="flex gap-1">
              <ToggleButton
                active={!!el.controls}
                onClick={() => update("controls", !el.controls)}
                title="Controls"
              >
                <span className="text-[9px] font-bold">CTL</span>
              </ToggleButton>
              <ToggleButton
                active={!!el.autoPlay}
                onClick={() => update("autoPlay", !el.autoPlay)}
                title="Autoplay"
              >
                <span className="text-[9px] font-bold">AUTO</span>
              </ToggleButton>
              <ToggleButton
                active={!!el.muted}
                onClick={() => update("muted", !el.muted)}
                title="Muted"
              >
                <span className="text-[9px] font-bold">MUTE</span>
              </ToggleButton>
              <ToggleButton
                active={!!el.loop}
                onClick={() => update("loop", !el.loop)}
                title="Loop"
              >
                <span className="text-[9px] font-bold">LOOP</span>
              </ToggleButton>
            </div>
          </Section>
        )}
        {[
          "heading",
          "heading2",
          "heading3",
          "heading4",
          "heading5",
          "heading6",
          "text",
          "paragraph",
          "span",
          "badge",
          "blockquote",
          "code",
          "pre",
          "label",
          "legend",
        ].includes(el.type) && (
          <Section title="Content">
            <Textarea
              value={el.content || ""}
              onChange={(v) => update("content", v)}
              placeholder="Type here..."
              rows={3}
            />
          </Section>
        )}
        {el.type === "link" && (
          <Section title="Link">
            <Field label="Label">
              <Input
                value={el.content || ""}
                onChange={(v) => update("content", v)}
                placeholder="Click here"
              />
            </Field>
            <Field label="URL">
              <Input
                value={el.href || ""}
                onChange={(v) => update("href", v)}
                placeholder="https://..."
              />
            </Field>
            <Field label="Open In">
              <Select
                value={el.target || "_self"}
                onChange={(v) => update("target", v)}
                options={[
                  { value: "_self", label: "Same tab" },
                  { value: "_blank", label: "New tab" },
                ]}
              />
            </Field>
          </Section>
        )}
        {el.type === "button" && (
          <Section title="Button">
            <Field label="Label">
              <Input
                value={el.content || ""}
                onChange={(v) => update("content", v)}
                placeholder="Click me"
              />
            </Field>
            <Field label="URL">
              <Input
                value={el.href || ""}
                onChange={(v) => update("href", v)}
                placeholder="https://..."
              />
            </Field>
            <Field label="Open In">
              <Select
                value={el.target || "_self"}
                onChange={(v) => update("target", v)}
                options={[
                  { value: "_self", label: "Same tab" },
                  { value: "_blank", label: "New tab" },
                ]}
              />
            </Field>
          </Section>
        )}
        {el.type === "navbar" && (
          <Section title="Navbar">
            <Field label="Brand Name">
              <Input
                value={el.content || ""}
                onChange={(v) => update("content", v)}
                placeholder="Brand"
              />
            </Field>
            <div>
              <Label>Sticky Preset</Label>
              <button
                onClick={() =>
                  updateElement(el.id, {
                    styles: {
                      ...el.styles,
                      position: "sticky",
                      top: "0px",
                      zIndex: 50,
                      backdropFilter: el.styles.backdropFilter || "blur(12px)",
                    },
                  })
                }
                className="w-full py-1.5 text-[10px] font-semibold bg-white/5 hover:bg-blue-500/15 hover:text-blue-300 border border-white/8 hover:border-blue-500/30 rounded transition-all cursor-pointer text-white/40"
              >
                Make Sticky
              </button>
            </div>
          </Section>
        )}
        {el.type === "form" && (
          <Section title="Form">
            <Field label="Action URL">
              <Input
                value={el.formAction || ""}
                onChange={(v) => update("formAction", v)}
                placeholder="/api/submit"
              />
            </Field>
            <Field label="Method">
              <Select
                value={el.formMethod || "post"}
                onChange={(v) => update("formMethod", v)}
                options={[
                  { value: "post", label: "POST" },
                  { value: "get", label: "GET" },
                ]}
              />
            </Field>
            <Field label="Encoding">
              <Select
                value={el.formEnctype || "application/x-www-form-urlencoded"}
                onChange={(v) => update("formEnctype", v)}
                options={[
                  {
                    value: "application/x-www-form-urlencoded",
                    label: "Default",
                  },
                  { value: "multipart/form-data", label: "Multipart (files)" },
                  { value: "text/plain", label: "Plain text" },
                ]}
              />
            </Field>
          </Section>
        )}
        {el.type === "footer" && (
          <Section title="Footer">
            <Field label="Content">
              <Textarea
                value={el.content || ""}
                onChange={(v) => update("content", v)}
                placeholder="© 2025 My Site."
                rows={2}
              />
            </Field>
          </Section>
        )}
        {(el.type === "list" || el.type === "orderedList") && (
          <Section title={el.type === "orderedList" ? "Ordered List" : "List"}>
            <Field label="Items (one per line)">
              <Textarea
                value={(el.listItems || []).join("\n")}
                onChange={(v) => update("listItems", v.split("\n"))}
                placeholder={"Item 1\nItem 2\nItem 3"}
                rows={5}
              />
            </Field>
            <Field label="Style">
              <Select
                value={
                  gsv("listStyleType") ||
                  (el.type === "orderedList" ? "decimal" : "disc")
                }
                onChange={(v) => updateStyle("listStyleType", v as any)}
                options={[
                  { value: "disc", label: "Bullet" },
                  { value: "decimal", label: "Numbered" },
                  { value: "square", label: "Square" },
                  { value: "circle", label: "Circle" },
                  { value: "none", label: "None" },
                ]}
              />
            </Field>
          </Section>
        )}
        {el.type === "input" && (
          <Section title="Input">
            <Field label="Placeholder">
              <Input
                value={el.placeholder || ""}
                onChange={(v) => update("placeholder", v)}
                placeholder="Enter value..."
              />
            </Field>
            <Field label="Field Name">
              <Input
                value={el.fieldName || ""}
                onChange={(v) => update("fieldName", v)}
                placeholder="email, name, phone…"
              />
            </Field>
            <Field label="Input Type">
              <Select
                value={el.inputType || "text"}
                onChange={(v) => update("inputType", v)}
                options={[
                  { value: "text", label: "Text" },
                  { value: "email", label: "Email" },
                  { value: "password", label: "Password" },
                  { value: "number", label: "Number" },
                  { value: "tel", label: "Tel" },
                  { value: "url", label: "URL" },
                  { value: "date", label: "Date" },
                  { value: "search", label: "Search" },
                ]}
              />
            </Field>
          </Section>
        )}
        {el.type === "textarea" && (
          <Section title="Textarea">
            <Field label="Placeholder">
              <Input
                value={el.placeholder || ""}
                onChange={(v) => update("placeholder", v)}
                placeholder="Enter text..."
              />
            </Field>
            <Field label="Field Name">
              <Input
                value={el.fieldName || ""}
                onChange={(v) => update("fieldName", v)}
                placeholder="message, bio…"
              />
            </Field>
          </Section>
        )}
        {el.type === "icon" && (
          <Section title="Icon">
            <Field label="Icon Name (Lucide)">
              <Input
                value={el.iconName || ""}
                onChange={(v) => update("iconName", v)}
                placeholder="Star, Home, Settings..."
              />
            </Field>
          </Section>
        )}
        {el.type === "select" && (
          <Section title="Select">
            <Field label="Options (one per line)">
              <Textarea
                value={(el.selectOptions || []).join("\n")}
                onChange={(v) => update("selectOptions", v.split("\n"))}
                placeholder={"Option 1\nOption 2\nOption 3"}
                rows={4}
              />
            </Field>
          </Section>
        )}
        {el.type === "checkbox" && (
          <Section title="Checkbox">
            <Field label="Label">
              <Input
                value={el.content || ""}
                onChange={(v) => update("content", v)}
                placeholder="I agree to the terms"
              />
            </Field>
            <Field label="Field Name">
              <Input
                value={el.fieldName || ""}
                onChange={(v) => update("fieldName", v)}
                placeholder="agree, subscribe…"
              />
            </Field>
            <div className="flex gap-1">
              <ToggleButton
                active={!!el.checked}
                onClick={() => update("checked", !el.checked)}
                title="Checked by default"
              >
                <span className="text-[9px] font-bold">Checked by default</span>
              </ToggleButton>
            </div>
          </Section>
        )}
        {el.type === "radio" && (
          <Section title="Radio">
            <Field label="Label">
              <Input
                value={el.content || ""}
                onChange={(v) => update("content", v)}
                placeholder="Option"
              />
            </Field>
            <Field label="Group Name">
              <Input
                value={el.fieldName || ""}
                onChange={(v) => update("fieldName", v)}
                placeholder="plan, gender…"
              />
            </Field>
          </Section>
        )}
        {el.type === "time" && (
          <Section title="Time">
            <Field label="Display Text">
              <Input
                value={el.content || ""}
                onChange={(v) => update("content", v)}
                placeholder="January 1, 2025"
              />
            </Field>
            <Field label="datetime attr">
              <Input
                value={el.dateTime || ""}
                onChange={(v) => update("dateTime", v)}
                placeholder="2025-01-01"
              />
            </Field>
          </Section>
        )}
        {el.type === "mark" && (
          <Section title="Highlight">
            <Field label="Text">
              <Input
                value={el.content || ""}
                onChange={(v) => update("content", v)}
                placeholder="highlighted text"
              />
            </Field>
          </Section>
        )}
        {el.type === "kbd" && (
          <Section title="Keyboard">
            <Field label="Keys">
              <Input
                value={el.content || ""}
                onChange={(v) => update("content", v)}
                placeholder="⌘K"
              />
            </Field>
          </Section>
        )}
        {el.type === "progress" && (
          <Section title="Progress">
            <Row>
              <Field label="Value">
                <Input
                  type="number"
                  value={String(el.progressValue ?? 60)}
                  onChange={(v) => update("progressValue", Number(v))}
                  placeholder="60"
                />
              </Field>
              <Field label="Max">
                <Input
                  type="number"
                  value={String(el.progressMax ?? 100)}
                  onChange={(v) => update("progressMax", Number(v))}
                  placeholder="100"
                />
              </Field>
            </Row>
          </Section>
        )}
        {el.type === "meter" && (
          <Section title="Meter">
            <Row>
              <Field label="Value">
                <Input
                  type="number"
                  value={String(el.progressValue ?? 0.6)}
                  onChange={(v) => update("progressValue", Number(v))}
                  placeholder="0.6"
                />
              </Field>
              <Field label="Max">
                <Input
                  type="number"
                  value={String(el.progressMax ?? 1)}
                  onChange={(v) => update("progressMax", Number(v))}
                  placeholder="1"
                />
              </Field>
            </Row>
          </Section>
        )}
        {el.type === "details" && (
          <Section title="Details">
            <Field label="Summary">
              <Input
                value={el.content || ""}
                onChange={(v) => update("content", v)}
                placeholder="Click to expand"
              />
            </Field>
            <div className="flex items-center justify-between px-1">
              <Label>Open by default</Label>
              <button
                onClick={() => update("open", !el.open)}
                className={`w-8 h-4 rounded-full transition-colors relative ${el.open ? "bg-blue-500" : "bg-white/10"}`}
              >
                <div
                  className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${el.open ? "left-4.5" : "left-0.5"}`}
                />
              </button>
            </div>
          </Section>
        )}
        {el.type === "label" && (
          <Section title="Label Settings">
            <Field label="For (Input ID/Name)">
              <Input
                value={el.fieldName || ""}
                onChange={(v) => update("fieldName", v)}
                placeholder="input-id"
              />
            </Field>
          </Section>
        )}
        {el.type === "dialog" && (
          <Section title="Dialog Settings">
            <div className="flex items-center justify-between px-1">
              <Label>Open by default</Label>
              <button
                onClick={() => update("open", !el.open)}
                className={`w-8 h-4 rounded-full transition-colors relative ${el.open ? "bg-blue-500" : "bg-white/10"}`}
              >
                <div
                  className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${el.open ? "left-4.5" : "left-0.5"}`}
                />
              </button>
            </div>
          </Section>
        )}
        {el.type === "alert" && (
          <Section title="Alert">
            <Field label="Message">
              <Input
                value={el.content || ""}
                onChange={(v) => update("content", v)}
                placeholder="Alert message…"
              />
            </Field>
            <Field label="Variant">
              <Select
                value={el.alertVariant || "info"}
                onChange={(v) => update("alertVariant", v)}
                options={[
                  { value: "info", label: "Info" },
                  { value: "success", label: "Success" },
                  { value: "warning", label: "Warning" },
                  { value: "error", label: "Error" },
                ]}
              />
            </Field>
          </Section>
        )}
        {el.type === "avatar" && (
          <Section title="Avatar">
            <Field label="Image URL">
              <Input
                value={el.avatarSrc || ""}
                onChange={(v) => update("avatarSrc", v)}
                placeholder="https://…"
              />
            </Field>
            <Field label="Initials">
              <Input
                value={el.avatarInitials || ""}
                onChange={(v) => update("avatarInitials", v)}
                placeholder="AB"
              />
            </Field>
          </Section>
        )}
        {el.type === "table" && (
          <Section title="Table">
            {(() => {
              const td = el.tableData || {
                headers: ["H1", "H2", "H3"],
                rows: [
                  ["", "", ""],
                  ["", "", ""],
                ],
              };
              const setTd = (next: any) =>
                updateElement(el.id, { tableData: next });
              return (
                <div className="space-y-4">
                  <div className="space-y-3 p-3 bg-white/5 rounded-lg border border-white/5">
                    <p className="text-[10px] uppercase opacity-40 font-bold text-white/50 block mb-1 tracking-widest">
                      Appearance
                    </p>
                    <div className="flex items-center justify-between">
                      <Label>Zebra Stripes</Label>
                      <button
                        onClick={() =>
                          updateStyle("tableStripe", !gsv("tableStripe"))
                        }
                        className={`w-8 h-4 rounded-full transition-colors relative ${gsv("tableStripe") ? "bg-blue-500" : "bg-white/10"}`}
                      >
                        <div
                          className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${gsv("tableStripe") ? "left-4.5" : "left-0.5"}`}
                        />
                      </button>
                    </div>
                    <Row>
                      <Field label="Header Bg">
                        <Input
                          value={gsv("tableHeaderBackground") || "#f9fafb"}
                          onChange={(v) =>
                            updateStyle("tableHeaderBackground", v)
                          }
                        />
                      </Field>
                      <Field label="Padding">
                        <Input
                          value={gsv("tableCellPadding") || "6px 12px"}
                          onChange={(v) => updateStyle("tableCellPadding", v)}
                        />
                      </Field>
                    </Row>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Columns: {td.headers.length}</Label>
                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          setTd({
                            headers: [
                              ...td.headers,
                              `H${td.headers.length + 1}`,
                            ],
                            rows: td.rows.map((r: string[]) => [...r, ""]),
                          })
                        }
                        className="text-[10px] bg-white/5 hover:bg-white/10 text-white/50 px-1.5 py-0.5 rounded cursor-pointer"
                      >
                        + Col
                      </button>
                      {td.headers.length > 1 && (
                        <button
                          onClick={() =>
                            setTd({
                              headers: td.headers.slice(0, -1),
                              rows: td.rows.map((r: string[]) =>
                                r.slice(0, -1),
                              ),
                            })
                          }
                          className="text-[10px] bg-white/5 hover:bg-white/10 text-white/50 px-1.5 py-0.5 rounded cursor-pointer"
                        >
                          - Col
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Headers</Label>
                    {td.headers.map((h: string, i: number) => (
                      <Input
                        key={i}
                        value={h}
                        onChange={(v) => {
                          const nh = [...td.headers];
                          nh[i] = v;
                          setTd({ ...td, headers: nh });
                        }}
                        placeholder={`Header ${i + 1}`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Rows: {td.rows.length}</Label>
                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          setTd({
                            ...td,
                            rows: [
                              ...td.rows,
                              new Array(td.headers.length).fill(""),
                            ],
                          })
                        }
                        className="text-[10px] bg-white/5 hover:bg-white/10 text-white/50 px-1.5 py-0.5 rounded cursor-pointer"
                      >
                        + Row
                      </button>
                      {td.rows.length > 1 && (
                        <button
                          onClick={() =>
                            setTd({ ...td, rows: td.rows.slice(0, -1) })
                          }
                          className="text-[10px] bg-white/5 hover:bg-white/10 text-white/50 px-1.5 py-0.5 rounded cursor-pointer"
                        >
                          - Row
                        </button>
                      )}
                    </div>
                  </div>
                  {td.rows.map((row: string[], ri: number) => (
                    <div key={ri} className="space-y-1">
                      <Label>Row {ri + 1}</Label>
                      <div
                        className="grid gap-1"
                        style={{
                          gridTemplateColumns: `repeat(${td.headers.length}, 1fr)`,
                        }}
                      >
                        {row.map((cell: string, ci: number) => (
                          <Input
                            key={ci}
                            value={cell}
                            onChange={(v) => {
                              const nr = td.rows.map(
                                (r: string[], i: number) =>
                                  i === ri
                                    ? r.map((c: string, j: number) =>
                                        j === ci ? v : c,
                                      )
                                    : r,
                              );
                              setTd({ ...td, rows: nr });
                            }}
                            placeholder="Cell"
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </Section>
        )}
        {el.type === "iframe" && (
          <Section title="iFrame">
            <Field label="URL">
              <Input
                value={el.src || ""}
                onChange={(v) => update("src", v)}
                placeholder="https://..."
              />
            </Field>
          </Section>
        )}
        {el.type === "audio" && (
          <Section title="Audio">
            <Field label="Audio URL">
              <Input
                value={el.src || ""}
                onChange={(v) => update("src", v)}
                placeholder="https://audio.mp3"
              />
            </Field>
            <Field label="Or Upload">
              <MediaPicker
                value={el.src}
                onChange={(v) => update("src", v)}
                accept="audio/*"
                label="Upload Audio"
              />
            </Field>
            <div className="flex gap-1">
              <ToggleButton
                active={!!el.controls}
                onClick={() => update("controls", !el.controls)}
                title="Controls"
              >
                <span className="text-[9px] font-bold">CTL</span>
              </ToggleButton>
              <ToggleButton
                active={!!el.autoPlay}
                onClick={() => update("autoPlay", !el.autoPlay)}
                title="Autoplay"
              >
                <span className="text-[9px] font-bold">AUTO</span>
              </ToggleButton>
              <ToggleButton
                active={!!el.loop}
                onClick={() => update("loop", !el.loop)}
                title="Loop"
              >
                <span className="text-[9px] font-bold">LOOP</span>
              </ToggleButton>
            </div>
          </Section>
        )}
        {el.type === "divider" && (
          <Section title="Divider">
            <Field label="Color">
              <ColorInput
                value={gsv("borderColor") || "#e5e7eb"}
                onChange={(v) => {
                  const w = gsv("borderWidth") || "1px";
                  const s = gsv("borderStyle") || "solid";
                  updateElement(
                    el.id,
                    { styles: { borderColor: v, borderTop: `${w} ${s} ${v}` } },
                    stylingState,
                  );
                }}
              />
            </Field>
            <Row>
              <Field label="Thickness">
                <Input
                  value={gsv("borderWidth") || "1px"}
                  onChange={(v) => {
                    const c = gsv("borderColor") || "#e5e7eb";
                    const s = gsv("borderStyle") || "solid";
                    updateElement(
                      el.id,
                      {
                        styles: { borderWidth: v, borderTop: `${v} ${s} ${c}` },
                      },
                      stylingState,
                    );
                  }}
                  placeholder="1px"
                />
              </Field>
              <Field label="Style">
                <Select
                  value={gsv("borderStyle") || "solid"}
                  onChange={(v) => {
                    const c = gsv("borderColor") || "#e5e7eb";
                    const w = gsv("borderWidth") || "1px";
                    updateElement(
                      el.id,
                      {
                        styles: {
                          borderStyle: v as any,
                          borderTop: `${w} ${v} ${c}`,
                        },
                      },
                      stylingState,
                    );
                  }}
                  options={[
                    { value: "solid", label: "Solid" },
                    { value: "dashed", label: "Dashed" },
                    { value: "dotted", label: "Dotted" },
                    { value: "double", label: "Double" },
                  ]}
                />
              </Field>
            </Row>
          </Section>
        )}
        {el.type === "spacer" && (
          <Section title="Spacer">
            <Field label="Height">
              <Input
                value={gsv("height") || "48px"}
                onChange={(v) => updateStyle("height", v)}
                placeholder="48px"
              />
            </Field>
          </Section>
        )}

        <Section title="Size & Space">
          <Row>
            <Field label="Width">
              <Input
                value={gsv("width")}
                onChange={(v) => updateStyle("width", v)}
                placeholder="auto"
              />
            </Field>
            <Field label="Height">
              <Input
                value={gsv("height")}
                onChange={(v) => updateStyle("height", v)}
                placeholder="auto"
              />
            </Field>
          </Row>
          <Row>
            <Field label="Min W">
              <Input
                value={gsv("minWidth")}
                onChange={(v) => updateStyle("minWidth", v)}
                placeholder="—"
              />
            </Field>
            <Field label="Max W">
              <Input
                value={gsv("maxWidth")}
                onChange={(v) => updateStyle("maxWidth", v)}
                placeholder="—"
              />
            </Field>
          </Row>
          <Row>
            <Field label="Min H">
              <Input
                value={gsv("minHeight")}
                onChange={(v) => updateStyle("minHeight", v)}
                placeholder="—"
              />
            </Field>
            <Field label="Max H">
              <Input
                value={gsv("maxHeight")}
                onChange={(v) => updateStyle("maxHeight", v)}
                placeholder="—"
              />
            </Field>
          </Row>
          <Field label="Aspect Ratio">
            <Input
              value={gsv("aspectRatio")}
              onChange={(v) => updateStyle("aspectRatio", v)}
              placeholder="16 / 9"
            />
          </Field>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>Padding</Label>
              <button
                onClick={() => {
                  const nextLinked = !padLinked;
                  setPadLinked(nextLinked);
                  if (!nextLinked) {
                    const currentVal = gsv("padding") || "";
                    const { top, right, bottom, left } = parseShorthand(String(currentVal));
                    updateElement(el.id, {
                      styles: {
                        ...el.styles,
                        paddingTop: top,
                        paddingRight: right,
                        paddingBottom: bottom,
                        paddingLeft: left,
                      }
                    }, stylingState);
                  } else {
                    const t = gsv("paddingTop") || "0px";
                    const r = gsv("paddingRight") || "0px";
                    const b = gsv("paddingBottom") || "0px";
                    const l = gsv("paddingLeft") || "0px";
                    let shorthand = "";
                    if (t === r && r === b && b === l) shorthand = t;
                    else if (t === b && r === l) shorthand = `${t} ${r}`;
                    else if (r === l) shorthand = `${t} ${r} ${b}`;
                    else shorthand = `${t} ${r} ${b} ${l}`;
                    updateElement(el.id, {
                      styles: {
                        ...el.styles,
                        padding: shorthand,
                      }
                    }, stylingState);
                  }
                }}
                className="text-white/20 hover:text-blue-400 transition-colors cursor-pointer"
              >
                {padLinked ? (
                  <LinkIcon size={9} />
                ) : (
                  <Unlink size={9} className="text-blue-400" />
                )}
              </button>
            </div>
            {padLinked ? (
              <Input
                value={gsv("padding")}
                onChange={(v) => updateAllSides("padding", v)}
                placeholder="All sides"
              />
            ) : (
              <Row>
                <Input
                  value={gsv("paddingTop")}
                  onChange={(v) => updateStyle("paddingTop", v)}
                  placeholder="Top"
                />
                <Input
                  value={gsv("paddingRight")}
                  onChange={(v) => updateStyle("paddingRight", v)}
                  placeholder="Right"
                />
                <Input
                  value={gsv("paddingBottom")}
                  onChange={(v) => updateStyle("paddingBottom", v)}
                  placeholder="Bottom"
                />
                <Input
                  value={gsv("paddingLeft")}
                  onChange={(v) => updateStyle("paddingLeft", v)}
                  placeholder="Left"
                />
              </Row>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>Margin</Label>
              <button
                onClick={() => {
                  const nextLinked = !marLinked;
                  setMarLinked(nextLinked);
                  if (!nextLinked) {
                    const currentVal = gsv("margin") || "";
                    const { top, right, bottom, left } = parseShorthand(String(currentVal));
                    updateElement(el.id, {
                      styles: {
                        ...el.styles,
                        marginTop: top,
                        marginRight: right,
                        marginBottom: bottom,
                        marginLeft: left,
                      }
                    }, stylingState);
                  } else {
                    const t = gsv("marginTop") || "0px";
                    const r = gsv("marginRight") || "0px";
                    const b = gsv("marginBottom") || "0px";
                    const l = gsv("marginLeft") || "0px";
                    let shorthand = "";
                    if (t === r && r === b && b === l) shorthand = t;
                    else if (t === b && r === l) shorthand = `${t} ${r}`;
                    else if (r === l) shorthand = `${t} ${r} ${b}`;
                    else shorthand = `${t} ${r} ${b} ${l}`;
                    updateElement(el.id, {
                      styles: {
                        ...el.styles,
                        margin: shorthand,
                      }
                    }, stylingState);
                  }
                }}
                className="text-white/20 hover:text-blue-400 transition-colors cursor-pointer"
              >
                {marLinked ? (
                  <LinkIcon size={9} />
                ) : (
                  <Unlink size={9} className="text-blue-400" />
                )}
              </button>
            </div>
            {marLinked ? (
              <Input
                value={gsv("margin")}
                onChange={(v) => updateAllSides("margin", v)}
                placeholder="All sides"
              />
            ) : (
              <Row>
                <Input
                  value={gsv("marginTop")}
                  onChange={(v) => updateStyle("marginTop", v)}
                  placeholder="Top"
                />
                <Input
                  value={gsv("marginRight")}
                  onChange={(v) => updateStyle("marginRight", v)}
                  placeholder="Right"
                />
                <Input
                  value={gsv("marginBottom")}
                  onChange={(v) => updateStyle("marginBottom", v)}
                  placeholder="Bottom"
                />
                <Input
                  value={gsv("marginLeft")}
                  onChange={(v) => updateStyle("marginLeft", v)}
                  placeholder="Left"
                />
              </Row>
            )}
          </div>
        </Section>

        <Section
          title="Layout"
          collapsible
          defaultOpen={
            gsv("display") === "flex" || gsv("display") === "grid" || isLayout
          }
        >
          <Row>
            <Field label="Display">
              <Select
                value={gsv("display")}
                onChange={(v) => updateStyle("display", v)}
                options={[
                  { value: "block", label: "Block" },
                  { value: "flex", label: "Flex" },
                  { value: "grid", label: "Grid" },
                  { value: "inline-block", label: "Inline" },
                  { value: "inline-flex", label: "Inline Flex" },
                  { value: "none", label: "None" },
                ]}
              />
            </Field>
            <Field label="Overflow">
              <Select
                value={gsv("overflow")}
                onChange={(v) => updateStyle("overflow", v as any)}
                options={[
                  { value: "visible", label: "Visible" },
                  { value: "hidden", label: "Hidden" },
                  { value: "auto", label: "Auto" },
                  { value: "scroll", label: "Scroll" },
                ]}
              />
            </Field>
          </Row>
          {(gsv("display") === "flex" || gsv("display") === "inline-flex") && (
            <div className="space-y-2.5 bg-white/3 rounded-lg p-2.5 border border-white/5">
              <Row>
                <Field label="Direction">
                  <Select
                    value={gsv("flexDirection")}
                    onChange={(v) => updateStyle("flexDirection", v as any)}
                    options={[
                      { value: "row", label: "Row" },
                      { value: "column", label: "Column" },
                      { value: "row-reverse", label: "Row ↩" },
                      { value: "column-reverse", label: "Col ↩" },
                    ]}
                  />
                </Field>
                <Field label="Wrap">
                  <Select
                    value={gsv("flexWrap")}
                    onChange={(v) => updateStyle("flexWrap", v as any)}
                    options={[
                      { value: "nowrap", label: "No Wrap" },
                      { value: "wrap", label: "Wrap" },
                    ]}
                  />
                </Field>
              </Row>
              <Field label="Justify">
                <div className="grid grid-cols-6 gap-0.5 bg-black/20 p-0.5 rounded-md overflow-hidden">
                  {[
                    {
                      id: "flex-start",
                      title: "Start",
                      icon: <AlignHorizontalJustifyStart size={12} />,
                    },
                    {
                      id: "center",
                      title: "Center",
                      icon: <AlignHorizontalJustifyCenter size={12} />,
                    },
                    {
                      id: "flex-end",
                      title: "End",
                      icon: <AlignHorizontalJustifyEnd size={12} />,
                    },
                    {
                      id: "space-between",
                      title: "Between",
                      icon: <AlignHorizontalSpaceBetween size={12} />,
                    },
                    {
                      id: "space-around",
                      title: "Around",
                      icon: <AlignHorizontalSpaceAround size={12} />,
                    },
                    {
                      id: "space-evenly",
                      title: "Evenly",
                      icon: <LayoutGrid size={11} />,
                    },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      title={opt.title}
                      onClick={() => updateStyle("justifyContent", opt.id)}
                      className={`h-7 rounded flex items-center justify-center transition-all cursor-pointer ${gsv("justifyContent") === opt.id ? "bg-panel-bg-hover text-white shadow-sm" : "text-white/20 hover:text-white/40 hover:bg-white/5"}`}
                    >
                      {opt.icon}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Align">
                <div className="grid grid-cols-5 gap-0.5 bg-black/20 p-0.5 rounded-md overflow-hidden">
                  {[
                    {
                      id: "flex-start",
                      title: "Start",
                      icon: <AlignStartVertical size={12} />,
                    },
                    {
                      id: "center",
                      title: "Center",
                      icon: <AlignCenterVertical size={12} />,
                    },
                    {
                      id: "flex-end",
                      title: "End",
                      icon: <AlignEndVertical size={12} />,
                    },
                    {
                      id: "stretch",
                      title: "Stretch",
                      icon: <StretchVertical size={12} />,
                    },
                    {
                      id: "baseline",
                      title: "Baseline",
                      icon: <Baseline size={12} />,
                    },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      title={opt.title}
                      onClick={() => updateStyle("alignItems", opt.id)}
                      className={`h-7 rounded flex items-center justify-center transition-all cursor-pointer ${gsv("alignItems") === opt.id ? "bg-panel-bg-hover text-white shadow-sm" : "text-white/20 hover:text-white/40 hover:bg-white/5"}`}
                    >
                      {opt.icon}
                    </button>
                  ))}
                </div>
              </Field>
              <Row>
                <Field label="Gap">
                  <Input
                    value={gsv("gap")}
                    onChange={(v) => updateStyle("gap", v)}
                    placeholder="12px"
                  />
                </Field>
                <Field label="Grow">
                  <Input
                    value={gsv("flexGrow")}
                    onChange={(v) => updateStyle("flexGrow", v)}
                    placeholder="0"
                  />
                </Field>
              </Row>
              <Field label="Shrink">
                <Input
                  value={gsv("flexShrink")}
                  onChange={(v) => updateStyle("flexShrink", v)}
                  placeholder="1"
                />
              </Field>
            </div>
          )}
          {gsv("display") === "grid" && (
            <div className="space-y-2.5 bg-white/3 rounded-lg p-2.5 border border-white/5">
              <Field label="Columns">
                <Input
                  value={gsv("gridTemplateColumns")}
                  onChange={(v) => updateStyle("gridTemplateColumns", v)}
                  placeholder="1fr 1fr 1fr"
                />
              </Field>
              <div className="flex flex-wrap gap-1">
                {[
                  "1fr",
                  "1fr 1fr",
                  "1fr 1fr 1fr",
                  "1fr 1fr 1fr 1fr",
                  "repeat(2,1fr)",
                  "repeat(3,1fr)",
                  "repeat(4,1fr)",
                  "200px 1fr",
                  "1fr 2fr",
                  "2fr 1fr",
                ].map((v) => (
                  <button
                    key={v}
                    onClick={() => updateStyle("gridTemplateColumns", v)}
                    className={`text-[9px] px-1.5 py-0.5 rounded border cursor-pointer transition-all ${gsv("gridTemplateColumns") === v ? "bg-blue-500/20 border-blue-500/40 text-blue-300" : "bg-white/3 border-white/8 text-white/30 hover:text-white/70 hover:bg-white/8"}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <Field label="Rows">
                <Input
                  value={gsv("gridTemplateRows")}
                  onChange={(v) => updateStyle("gridTemplateRows", v)}
                  placeholder="auto"
                />
              </Field>
              <Row>
                <Field label="Gap">
                  <Input
                    value={gsv("gap")}
                    onChange={(v) => updateStyle("gap", v)}
                    placeholder="24px"
                  />
                </Field>
                <Field label="Col Gap">
                  <Input
                    value={gsv("columnGap")}
                    onChange={(v) => updateStyle("columnGap", v)}
                    placeholder="—"
                  />
                </Field>
              </Row>
              <Field label="Row Gap">
                <Input
                  value={gsv("rowGap")}
                  onChange={(v) => updateStyle("rowGap", v)}
                  placeholder="—"
                />
              </Field>
              <Row>
                <Field label="Justify">
                  <Select
                    value={gsv("justifyContent")}
                    onChange={(v) => updateStyle("justifyContent", v)}
                    options={[
                      { value: "start", label: "Start" },
                      { value: "center", label: "Center" },
                      { value: "end", label: "End" },
                      { value: "stretch", label: "Stretch" },
                      { value: "space-between", label: "Between" },
                    ]}
                  />
                </Field>
                <Field label="Align">
                  <Select
                    value={gsv("alignItems")}
                    onChange={(v) => updateStyle("alignItems", v as any)}
                    options={[
                      { value: "start", label: "Start" },
                      { value: "center", label: "Center" },
                      { value: "end", label: "End" },
                      { value: "stretch", label: "Stretch" },
                    ]}
                  />
                </Field>
              </Row>
            </div>
          )}
        </Section>

        <Section title="Background">
          <Field label="Color">
            <ColorInput
              value={gsv("backgroundColor") || ""}
              onChange={(v) => updateStyle("backgroundColor", v)}
            />
          </Field>
          <Field label="Image URL">
            <Input
              value={gsv("backgroundImage") || ""}
              onChange={(v) => updateStyle("backgroundImage", v)}
              placeholder="https://..."
            />
          </Field>
          <Field label="Or Upload">
            <MediaPicker
              value={gsv("backgroundImage")}
              onChange={(v) => updateStyle("backgroundImage", v)}
              accept="image/*"
              label="Upload Image"
            />
          </Field>
          {gsv("backgroundImage") && (
            <Row>
              <Field label="Size">
                <Select
                  value={gsv("backgroundSize") || "cover"}
                  onChange={(v) => updateStyle("backgroundSize", v)}
                  options={[
                    { value: "cover", label: "Cover" },
                    { value: "contain", label: "Contain" },
                    { value: "auto", label: "Auto" },
                  ]}
                />
              </Field>
              <Field label="Position">
                <Select
                  value={gsv("backgroundPosition") || "center"}
                  onChange={(v) => updateStyle("backgroundPosition", v)}
                  options={[
                    { value: "center", label: "Center" },
                    { value: "top", label: "Top" },
                    { value: "bottom", label: "Bottom" },
                  ]}
                />
              </Field>
            </Row>
          )}
        </Section>

        <Section title="Gradient" collapsible defaultOpen={false}>
          <Field label="Type">
            <Select
              value={gsv("gradientType") || "none"}
              onChange={(v) => {
                const t = v as any;
                if (t === "linear" || t === "radial") {
                  updateElement(
                    el.id,
                    {
                      styles: {
                        gradientType: t,
                        gradientStartColor:
                          gsv("gradientStartColor") || "#4f46e5",
                        gradientEndColor: gsv("gradientEndColor") || "#9333ea",
                        gradientAngle: gsv("gradientAngle") ?? 135,
                      },
                    },
                    stylingState,
                  );
                } else {
                  updateStyle("gradientType", t);
                }
              }}
              options={[
                { value: "none", label: "None" },
                { value: "linear", label: "Linear" },
                { value: "radial", label: "Radial" },
              ]}
            />
          </Field>
          {(gsv("gradientType") === "linear" ||
            gsv("gradientType") === "radial") && (
            <>
              <Row>
                <Field label="Start">
                  <ColorInput
                    value={gsv("gradientStartColor") || "#4f46e5"}
                    onChange={(v) => updateStyle("gradientStartColor", v)}
                  />
                </Field>
                <Field label="End">
                  <ColorInput
                    value={gsv("gradientEndColor") || "#9333ea"}
                    onChange={(v) => updateStyle("gradientEndColor", v)}
                  />
                </Field>
              </Row>
              {gsv("gradientType") === "linear" && (
                <Field label="Angle">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={gsv("gradientAngle") ?? 135}
                      onChange={(v) => updateStyle("gradientAngle", v)}
                      placeholder="135"
                    />
                    <svg
                      width="30"
                      height="30"
                      viewBox="0 0 30 30"
                      className="shrink-0 cursor-pointer"
                      style={{ touchAction: "none" }}
                      onMouseDown={(e) => {
                        const svg = e.currentTarget;
                        const getAngle = (ev: MouseEvent) => {
                          const r = svg.getBoundingClientRect();
                          const deg =
                            (Math.atan2(
                              ev.clientY - (r.top + r.height / 2),
                              ev.clientX - (r.left + r.width / 2),
                            ) *
                              180) /
                              Math.PI +
                            90;
                          return Math.round((deg + 360) % 360);
                        };
                        const onMove = (ev: MouseEvent) =>
                          updateStyle("gradientAngle", String(getAngle(ev)));
                        const onUp = () => {
                          document.removeEventListener("mousemove", onMove);
                          document.removeEventListener("mouseup", onUp);
                        };
                        updateStyle(
                          "gradientAngle",
                          String(getAngle(e.nativeEvent)),
                        );
                        document.addEventListener("mousemove", onMove);
                        document.addEventListener("mouseup", onUp);
                      }}
                    >
                      <circle
                        cx="15"
                        cy="15"
                        r="13"
                        fill="rgba(255,255,255,0.04)"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="1"
                      />
                      {(() => {
                        const a =
                          ((gsv("gradientAngle") ?? 135) - 90) *
                          (Math.PI / 180);
                        const tx = 15 + Math.cos(a) * 10;
                        const ty = 15 + Math.sin(a) * 10;
                        return (
                          <>
                            <line
                              x1="15"
                              y1="15"
                              x2={tx}
                              y2={ty}
                              stroke="#3b82f6"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                            <circle cx={tx} cy={ty} r="2" fill="#3b82f6" />
                          </>
                        );
                      })()}
                      <circle
                        cx="15"
                        cy="15"
                        r="2"
                        fill="#1e293b"
                        stroke="rgba(255,255,255,0.4)"
                        strokeWidth="0.8"
                      />
                    </svg>
                  </div>
                  <div className="grid grid-cols-4 gap-1 mt-2">
                    {[
                      { l: "↑", a: 0 },
                      { l: "↗", a: 45 },
                      { l: "→", a: 90 },
                      { l: "↘", a: 135 },
                      { l: "↓", a: 180 },
                      { l: "↙", a: 225 },
                      { l: "←", a: 270 },
                      { l: "↖", a: 315 },
                    ].map(({ l, a }) => (
                      <button
                        key={a}
                        onClick={() => updateStyle("gradientAngle", String(a))}
                        className={`py-1 text-[11px] rounded transition-all border cursor-pointer ${(gsv("gradientAngle") ?? 135) === a ? "bg-blue-500/20 border-blue-500/40 text-white" : "bg-white/3 border-white/5 text-white/30 hover:text-white/70 hover:bg-white/8"}`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </Field>
              )}
            </>
          )}
        </Section>

        {hasText && (
          <Section title="Typography">
            <Row>
              <Field label="Size">
                <Input
                  value={gsv("fontSize")}
                  onChange={(v) => updateStyle("fontSize", v)}
                  placeholder="16px"
                />
              </Field>
              <Field label="Weight">
                <Select
                  value={gsv("fontWeight")}
                  onChange={(v) => updateStyle("fontWeight", v)}
                  options={[
                    { value: "300", label: "Light" },
                    { value: "400", label: "Regular" },
                    { value: "500", label: "Medium" },
                    { value: "600", label: "Semibold" },
                    { value: "700", label: "Bold" },
                    { value: "800", label: "Extrabold" },
                  ]}
                />
              </Field>
            </Row>
            <div className="flex gap-1">
              <ToggleButton
                active={gsv("fontStyle") === "italic"}
                onClick={() => toggleStyle("fontStyle", "italic", "normal")}
                title="Italic"
              >
                <Italic size={11} />
              </ToggleButton>
              <ToggleButton
                active={gsv("textDecoration") === "underline"}
                onClick={() =>
                  toggleStyle("textDecoration", "underline", "none")
                }
                title="Underline"
              >
                <Underline size={11} />
              </ToggleButton>
              <ToggleButton
                active={gsv("textDecoration") === "line-through"}
                onClick={() =>
                  toggleStyle("textDecoration", "line-through", "none")
                }
                title="Strikethrough"
              >
                <Strikethrough size={11} />
              </ToggleButton>
            </div>
            <Row>
              <Field label="Align">
                <Select
                  value={gsv("textAlign")}
                  onChange={(v) => updateStyle("textAlign", v as any)}
                  options={[
                    { value: "left", label: "Left" },
                    { value: "center", label: "Center" },
                    { value: "right", label: "Right" },
                    { value: "justify", label: "Justify" },
                  ]}
                />
              </Field>
              <Field label="Transform">
                <Select
                  value={gsv("textTransform")}
                  onChange={(v) => updateStyle("textTransform", v as any)}
                  options={[
                    { value: "none", label: "None" },
                    { value: "uppercase", label: "ABC" },
                    { value: "lowercase", label: "abc" },
                    { value: "capitalize", label: "Abc" },
                  ]}
                />
              </Field>
            </Row>
            <Row>
              <Field label="Line Height">
                <Input
                  value={gsv("lineHeight")}
                  onChange={(v) => updateStyle("lineHeight", v)}
                  placeholder="1.5"
                />
              </Field>
              <Field label="Spacing">
                <Input
                  value={gsv("letterSpacing")}
                  onChange={(v) => updateStyle("letterSpacing", v)}
                  placeholder="0px"
                />
              </Field>
            </Row>
            <Row>
              <Field label="White Space">
                <Select
                  value={gsv("whiteSpace")}
                  onChange={(v) => updateStyle("whiteSpace", v as any)}
                  options={[
                    { value: "normal", label: "Normal" },
                    { value: "nowrap", label: "No Wrap" },
                    { value: "pre", label: "Pre" },
                    { value: "pre-wrap", label: "Pre Wrap" },
                    { value: "pre-line", label: "Pre Line" },
                  ]}
                />
              </Field>
              <Field label="Truncate">
                <Select
                  value={gsv("textOverflow")}
                  onChange={(v) => updateStyle("textOverflow", v as any)}
                  options={[
                    { value: "clip", label: "Clip" },
                    { value: "ellipsis", label: "Ellipsis" },
                  ]}
                />
              </Field>
            </Row>
            <Field label="Max Lines">
              <Input
                value={gsv("lineClamp")}
                onChange={(v) => updateStyle("lineClamp", v)}
                placeholder="2"
                type="number"
              />
            </Field>
            <Field label="Color">
              <ColorInput
                value={gsv("color") || "#000000"}
                onChange={(v) => updateStyle("color", v)}
              />
            </Field>
            <Field label="Font Family">
              <div className="space-y-2">
                <Select
                  value={gsv("fontFamily") || "inherit"}
                  onChange={(v) => updateStyle("fontFamily", v)}
                  options={FONT_FAMILIES}
                />
                <Input
                  value={
                    FONT_FAMILIES.some((f) => f.value === gsv("fontFamily"))
                      ? ""
                      : gsv("fontFamily") || ""
                  }
                  onChange={(v) => {
                    const name = v.trim();
                    if (!name) {
                      updateStyle("fontFamily", "");
                      return;
                    }
                    loadCustomGoogleFont(name, (loaded) =>
                      updateStyle("fontFamily", loaded),
                    );
                  }}
                  placeholder="Custom font e.g. Poppins"
                />
                <p className="text-[9px] text-white/20 leading-relaxed">
                  Exports via{" "}
                  <span className="text-white/35 font-mono">
                    next/font/google
                  </span>
                </p>
              </div>
            </Field>
          </Section>
        )}

        <Section title="Borders" collapsible defaultOpen={false}>
          <Row>
            <Field label="Style">
              <Select
                value={gsv("borderStyle")}
                onChange={(v) => updateStyle("borderStyle", v as any)}
                options={[
                  { value: "none", label: "None" },
                  { value: "solid", label: "Solid" },
                  { value: "dashed", label: "Dashed" },
                  { value: "dotted", label: "Dotted" },
                ]}
              />
            </Field>
            <Field label="Radius">
              <Input
                value={gsv("borderRadius")}
                onChange={(v) => updateStyle("borderRadius", v)}
                placeholder="8px"
              />
            </Field>
          </Row>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>Border</Label>
              <button
                onClick={() => setBorderLinked(!borderLinked)}
                className="text-white/20 hover:text-blue-400 transition-colors cursor-pointer"
              >
                {borderLinked ? (
                  <LinkIcon size={9} />
                ) : (
                  <Unlink size={9} className="text-blue-400" />
                )}
              </button>
            </div>
            {borderLinked ? (
              <div className="space-y-2">
                <Input
                  value={gsv("borderWidth")}
                  onChange={(v) => updateAllSides("border", v, "Width")}
                  placeholder="1px"
                />
                <ColorInput
                  value={gsv("borderColor") || "#ffffff"}
                  onChange={(v) => updateAllSides("border", v, "Color")}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                {(
                  [
                    "borderTop",
                    "borderRight",
                    "borderBottom",
                    "borderLeft",
                  ] as const
                ).map((side) => (
                  <Field key={side} label={side.replace("border", "")}>
                    <Input
                      value={gsv(side)}
                      onChange={(v) => updateStyle(side, v)}
                      placeholder="1px solid #e5e7eb"
                    />
                  </Field>
                ))}
              </div>
            )}
          </div>
          <Field label="Outline">
            <Input
              value={gsv("outline")}
              onChange={(v) => updateStyle("outline", v)}
              placeholder="2px solid #3b82f6"
            />
          </Field>
        </Section>

        <Section title="Effects" collapsible defaultOpen={false}>
          <Row>
            <Field label="Opacity %">
              <Input
                value={
                  gsv("opacity") !== undefined
                    ? Math.round(gsv("opacity") * 100)
                    : 100
                }
                onChange={(v) => updateStyle("opacity", v)}
                placeholder="100"
              />
            </Field>
            <Field label="Z-Index">
              <Input
                value={gsv("zIndex")}
                onChange={(v) => updateStyle("zIndex", v)}
                placeholder="0"
              />
            </Field>
          </Row>
          <Field label="Box Shadow">
            <Input
              value={gsv("boxShadow")}
              onChange={(v) => updateStyle("boxShadow", v)}
              placeholder="0 4px 12px rgba(0,0,0,0.2)"
            />
          </Field>
          <Field label="Backdrop Blur">
            <Input
              value={gsv("backdropFilter")}
              onChange={(v) => updateStyle("backdropFilter", v)}
              placeholder="blur(10px)"
            />
          </Field>
          <Field label="CSS Filter">
            <Input
              value={gsv("filter")}
              onChange={(v) => updateStyle("filter", v)}
              placeholder="brightness(0.8) blur(2px)"
            />
          </Field>
          <Field label="Transform">
            <Input
              value={gsv("transform")}
              onChange={(v) => updateStyle("transform", v)}
              placeholder="scale(1.1)"
            />
          </Field>
          <Field label="Transition">
            <Input
              value={gsv("transition")}
              onChange={(v) => updateStyle("transition", v)}
              placeholder="all 0.2s ease"
            />
          </Field>
        </Section>

        <Section title="Interaction" collapsible defaultOpen={false}>
          <Field label="Cursor">
            <Select
              value={gsv("cursor")}
              onChange={(v) => updateStyle("cursor", v)}
              options={[
                { value: "default", label: "Default" },
                { value: "pointer", label: "Pointer" },
                { value: "text", label: "Text" },
                { value: "grab", label: "Grab" },
                { value: "crosshair", label: "Crosshair" },
                { value: "zoom-in", label: "Zoom In" },
                { value: "not-allowed", label: "Not Allowed" },
                { value: "none", label: "None" },
              ]}
            />
          </Field>
          <Row>
            <Field label="User Select">
              <Select
                value={gsv("userSelect")}
                onChange={(v) => updateStyle("userSelect", v as any)}
                options={[
                  { value: "auto", label: "Auto" },
                  { value: "text", label: "Text" },
                  { value: "none", label: "None" },
                  { value: "all", label: "All" },
                ]}
              />
            </Field>
            <Field label="Ptr Events">
              <Select
                value={gsv("pointerEvents")}
                onChange={(v) => updateStyle("pointerEvents", v as any)}
                options={[
                  { value: "auto", label: "Auto" },
                  { value: "none", label: "None" },
                ]}
              />
            </Field>
          </Row>
        </Section>

        <Section title="Position" collapsible defaultOpen={false}>
          <Field label="Position">
            <Select
              value={gsv("position")}
              onChange={(v) => updateStyle("position", v)}
              options={[
                { value: "static", label: "Static" },
                { value: "relative", label: "Relative" },
                { value: "absolute", label: "Absolute" },
                { value: "fixed", label: "Fixed" },
                { value: "sticky", label: "Sticky" },
              ]}
            />
          </Field>
          {gsv("position") === "sticky" && (
            <div className="px-2 py-1.5 bg-amber-500/8 border border-amber-500/15 rounded text-[10px] text-amber-300/70 leading-relaxed">
              Set <b>Top</b> to <code>0px</code> for a sticky navbar. Parent
              must not have <code>overflow: hidden</code>.
            </div>
          )}
          <div
            className={`space-y-2.5 transition-opacity duration-200 ${!gsv("position") || gsv("position") === "static" ? "opacity-25 pointer-events-none" : "opacity-100"}`}
          >
            <Row>
              <Field label="Top">
                <Input
                  value={gsv("top")}
                  onChange={(v) => updateStyle("top", v)}
                  placeholder="0px"
                />
              </Field>
              <Field label="Right">
                <Input
                  value={gsv("right")}
                  onChange={(v) => updateStyle("right", v)}
                  placeholder="0px"
                />
              </Field>
            </Row>
            <Row>
              <Field label="Bottom">
                <Input
                  value={gsv("bottom")}
                  onChange={(v) => updateStyle("bottom", v)}
                  placeholder="0px"
                />
              </Field>
              <Field label="Left">
                <Input
                  value={gsv("left")}
                  onChange={(v) => updateStyle("left", v)}
                  placeholder="0px"
                />
              </Field>
            </Row>
          </div>
        </Section>

        <div className="h-4" />
      </div>
    </div>
  );
}
