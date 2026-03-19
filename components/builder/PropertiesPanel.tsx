"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useBuilderStore } from "@/lib/builder/store";
import { StyleProps } from "@/lib/builder/types";
import {
  Link as LinkIcon,
  Unlink,
  AlignLeft,
  AlignCenter,
  AlignRight,
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
  StretchHorizontal,
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
    const existing = document.getElementById(linkId);
    if (existing) {
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
      className="w-full text-[11px] bg-[#1e1e1e] border border-white/10 hover:border-white/20 rounded px-2 py-1 outline-none focus:border-blue-500/60 focus:bg-[#252525] text-white placeholder-white/30 transition-all font-medium cursor-text [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
      className="w-full text-[11px] bg-[#1e1e1e] border border-white/10 hover:border-white/20 rounded px-2 py-1.5 outline-none focus:border-blue-500/60 focus:bg-[#252525] text-white resize-none font-medium placeholder-white/30 cursor-text transition-all"
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
      alert(
        "File is too large. Please keep it under 10MB to avoid performance issues.",
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onChange(base64);
    };
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
    if (menuRef.current) {
      gsap.to(menuRef.current, {
        opacity: 0,
        y: -4,
        scaleY: 0.94,
        duration: 0.14,
        ease: "power2.in",
        onComplete: () => setOpen(false),
      });
    } else {
      setOpen(false);
    }
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
    if (open && menuRef.current) {
      gsap.fromTo(
        menuRef.current,
        { opacity: 0, y: -5, scaleY: 0.9, transformOrigin: "top center" },
        { opacity: 1, y: 0, scaleY: 1, duration: 0.2, ease: "power3.out" },
      );
    }
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
          background: "linear-gradient(145deg, #242424 0%, #1e1e1e 100%)",
          border: "1px solid rgba(255,255,255,0.1)",
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
        className={`w-full flex items-center justify-between text-[11px] bg-[#1e1e1e] border ${open ? "border-blue-500/60 bg-[#252525]" : "border-white/10 hover:border-white/20"} rounded px-2 py-1 text-white font-medium transition-all cursor-pointer`}
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
      className={`flex-1 py-1.5 rounded flex items-center justify-center transition-all cursor-pointer border ${
        active
          ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
          : "bg-white/3 border-white/5 text-white/30 hover:text-white/60 hover:bg-white/6"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="h-px bg-white/5 -mx-3" />;
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
          className={`text-[9.5px] uppercase tracking-widest font-semibold transition-colors duration-150 ${
            collapsible
              ? open
                ? "text-white/50 group-hover:text-white/70"
                : "text-white/30 group-hover:text-white/50"
              : "text-white/35"
          }`}
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
    <div className="h-11 px-3 border-b border-[#383838] flex items-center justify-between bg-[#2c2c2c] shrink-0">
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

export default function PropertiesPanel() {
  const { getSelectedElement, updateElement } = useBuilderStore();
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
      <div className="w-[240px] border-l border-[#383838] bg-[#2c2c2c] flex flex-col items-center justify-center p-6 text-center h-full shrink-0">
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

  const update = (key: string, value: any) => {
    updateElement(el.id, { [key]: value } as any);
  };

  const updateStyle = (key: keyof StyleProps, value: any) => {
    let val: any = value;

    if (key === "backgroundImage" && value && !value.includes("url(")) {
      val = `url("${value}")`;
    } else if (key === "opacity") {
      val = value === "" ? undefined : Number(value) / 100;
    } else if (
      key === "zIndex" ||
      key === "flexGrow" ||
      key === "flexShrink" ||
      key === "gradientAngle"
    ) {
      val = value === "" ? undefined : Number(value);
    } else if (
      (key === "fontSize" ||
        key === "letterSpacing" ||
        key === "width" ||
        key === "height" ||
        key === "minWidth" ||
        key === "maxWidth" ||
        key === "minHeight" ||
        key === "maxHeight" ||
        key === "gap") &&
      typeof value === "string" &&
      value !== "" &&
      !isNaN(Number(value))
    ) {
      val = Number(value);
    }

    updateElement(el.id, {
      styles: {
        ...el.styles,
        [key]: val,
      },
    });
  };

  const toggleStyle = (
    key: keyof StyleProps,
    value: string,
    fallback?: string,
  ) => {
    updateStyle(key, el.styles[key] === value ? fallback : value);
  };

  const updateAllSides = (
    type: "padding" | "margin" | "border",
    value: any,
    property?: string,
  ) => {
    const val = value === "" ? undefined : property ? value : Number(value);
    const updates: any = {};
    const suffix = property || "";
    if (type === "padding") {
      updates.paddingTop = val;
      updates.paddingRight = val;
      updates.paddingBottom = val;
      updates.paddingLeft = val;
    } else if (type === "margin") {
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
    updateElement(el.id, {
      styles: {
        ...el.styles,
        ...updates,
      },
    });
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
    "text",
    "paragraph",
    "badge",
    "blockquote",
    "code",
    "pre",
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
  ].includes(el.type);

  return (
    <div className="w-[240px] border-l border-[#383838] bg-[#2c2c2c] flex flex-col shrink-0 overflow-hidden select-none h-full">
      <ElementHeader
        el={el}
        onRename={(name) =>
          updateElement(el.id, { metadata: { ...el.metadata, name } })
        }
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
                value={el.styles.objectFit}
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
          "text",
          "paragraph",
          "span",
          "badge",
          "blockquote",
          "code",
          "pre",
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
                  el.styles.listStyleType ||
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
          </Section>
        )}

        {el.type === "table" && (
          <Section title="Table">
            {(() => {
              const td = (el as any).tableData || {
                headers: ["H1", "H2", "H3"],
                rows: [
                  ["", "", ""],
                  ["", "", ""],
                ],
              };
              const setTd = (next: any) =>
                updateElement(el.id, { tableData: next } as any);
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
                          updateStyle("tableStripe", !el.styles.tableStripe)
                        }
                        className={`w-8 h-4 rounded-full transition-colors relative ${el.styles.tableStripe ? "bg-blue-500" : "bg-white/10"}`}
                      >
                        <div
                          className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${el.styles.tableStripe ? "left-4.5" : "left-0.5"}`}
                        />
                      </button>
                    </div>
                    <Row>
                      <Field label="Header Bg">
                        <Input
                          value={el.styles.tableHeaderBackground || "#f9fafb"}
                          onChange={(v) =>
                            updateStyle("tableHeaderBackground", v)
                          }
                        />
                      </Field>
                      <Field label="Padding">
                        <Input
                          value={el.styles.tableCellPadding || "6px 12px"}
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
                            placeholder={`Cell`}
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

        {hasText && (
          <Section title="Typography">
            <Row>
              <Field label="Size">
                <Input
                  value={el.styles.fontSize}
                  onChange={(v) => updateStyle("fontSize", v)}
                  placeholder="16px"
                />
              </Field>
              <Field label="Weight">
                <Select
                  value={el.styles.fontWeight}
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
                active={el.styles.fontStyle === "italic"}
                onClick={() => toggleStyle("fontStyle", "italic", "normal")}
                title="Italic"
              >
                <Italic size={11} />
              </ToggleButton>
              <ToggleButton
                active={el.styles.textDecoration === "underline"}
                onClick={() =>
                  toggleStyle("textDecoration", "underline", "none")
                }
                title="Underline"
              >
                <Underline size={11} />
              </ToggleButton>
              <ToggleButton
                active={el.styles.textDecoration === "line-through"}
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
                  value={el.styles.textAlign}
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
                  value={el.styles.textTransform}
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
                  value={el.styles.lineHeight}
                  onChange={(v) => updateStyle("lineHeight", v)}
                  placeholder="1.5"
                />
              </Field>
              <Field label="Spacing">
                <Input
                  value={el.styles.letterSpacing}
                  onChange={(v) => updateStyle("letterSpacing", v)}
                  placeholder="0px"
                />
              </Field>
            </Row>
            <Row>
              <Field label="White Space">
                <Select
                  value={el.styles.whiteSpace}
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
                  value={el.styles.textOverflow}
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
                value={el.styles.lineClamp}
                onChange={(v) => updateStyle("lineClamp", v)}
                placeholder="2"
                type="number"
              />
            </Field>
            <Field label="Color">
              <ColorInput
                value={el.styles.color || "#000000"}
                onChange={(v) => updateStyle("color", v)}
              />
            </Field>
            <Field label="Font Family">
              <div className="space-y-2">
                <Select
                  value={el.styles.fontFamily || "inherit"}
                  onChange={(v) => updateStyle("fontFamily", v)}
                  options={FONT_FAMILIES}
                />
                <Input
                  value={
                    FONT_FAMILIES.some((f) => f.value === el.styles.fontFamily)
                      ? ""
                      : el.styles.fontFamily || ""
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

        {el.type === "divider" && (
          <Section title="Divider">
            <Field label="Color">
              <ColorInput
                value={el.styles.borderColor || "#e5e7eb"}
                onChange={(v) => {
                  const width = el.styles.borderWidth || "1px";
                  const style = el.styles.borderStyle || "solid";
                  updateElement(el.id, {
                    styles: {
                      ...el.styles,
                      borderColor: v,
                      borderTop: `${width} ${style} ${v}`,
                    },
                  });
                }}
              />
            </Field>
            <Row>
              <Field label="Thickness">
                <Input
                  value={el.styles.borderWidth || "1px"}
                  onChange={(v) => {
                    const color = el.styles.borderColor || "#e5e7eb";
                    const style = el.styles.borderStyle || "solid";
                    updateElement(el.id, {
                      styles: {
                        ...el.styles,
                        borderWidth: v,
                        borderTop: `${v} ${style} ${color}`,
                      },
                    });
                  }}
                  placeholder="1px"
                />
              </Field>
              <Field label="Style">
                <Select
                  value={el.styles.borderStyle || "solid"}
                  onChange={(v) => {
                    const color = el.styles.borderColor || "#e5e7eb";
                    const width = el.styles.borderWidth || "1px";
                    updateElement(el.id, {
                      styles: {
                        ...el.styles,
                        borderStyle: v as any,
                        borderTop: `${width} ${v} ${color}`,
                      },
                    });
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
                value={el.styles.height || "48px"}
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
                value={el.styles.width}
                onChange={(v) => updateStyle("width", v)}
                placeholder="auto"
              />
            </Field>
            <Field label="Height">
              <Input
                value={el.styles.height}
                onChange={(v) => updateStyle("height", v)}
                placeholder="auto"
              />
            </Field>
          </Row>
          <Row>
            <Field label="Min W">
              <Input
                value={el.styles.minWidth}
                onChange={(v) => updateStyle("minWidth", v)}
                placeholder="—"
              />
            </Field>
            <Field label="Max W">
              <Input
                value={el.styles.maxWidth}
                onChange={(v) => updateStyle("maxWidth", v)}
                placeholder="—"
              />
            </Field>
          </Row>
          <Row>
            <Field label="Min H">
              <Input
                value={el.styles.minHeight}
                onChange={(v) => updateStyle("minHeight", v)}
                placeholder="—"
              />
            </Field>
            <Field label="Max H">
              <Input
                value={el.styles.maxHeight}
                onChange={(v) => updateStyle("maxHeight", v)}
                placeholder="—"
              />
            </Field>
          </Row>
          <Field label="Aspect Ratio">
            <Input
              value={el.styles.aspectRatio}
              onChange={(v) => updateStyle("aspectRatio", v)}
              placeholder="16 / 9"
            />
          </Field>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>Padding</Label>
              <button
                onClick={() => setPadLinked(!padLinked)}
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
                value={el.styles.padding}
                onChange={(v) => updateAllSides("padding", v)}
                placeholder="All sides"
              />
            ) : (
              <Row>
                <Input
                  value={el.styles.paddingTop}
                  onChange={(v) => updateStyle("paddingTop", v)}
                  placeholder="Top"
                />
                <Input
                  value={el.styles.paddingRight}
                  onChange={(v) => updateStyle("paddingRight", v)}
                  placeholder="Right"
                />
                <Input
                  value={el.styles.paddingBottom}
                  onChange={(v) => updateStyle("paddingBottom", v)}
                  placeholder="Bottom"
                />
                <Input
                  value={el.styles.paddingLeft}
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
                onClick={() => setMarLinked(!marLinked)}
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
                value={el.styles.margin}
                onChange={(v) => updateAllSides("margin", v)}
                placeholder="All sides"
              />
            ) : (
              <Row>
                <Input
                  value={el.styles.marginTop}
                  onChange={(v) => updateStyle("marginTop", v)}
                  placeholder="Top"
                />
                <Input
                  value={el.styles.marginRight}
                  onChange={(v) => updateStyle("marginRight", v)}
                  placeholder="Right"
                />
                <Input
                  value={el.styles.marginBottom}
                  onChange={(v) => updateStyle("marginBottom", v)}
                  placeholder="Bottom"
                />
                <Input
                  value={el.styles.marginLeft}
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
            el.styles.display === "flex" ||
            el.styles.display === "grid" ||
            isLayout
          }
        >
          <Row>
            <Field label="Display">
              <Select
                value={el.styles.display}
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
                value={el.styles.overflow}
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
          {(el.styles.display === "flex" ||
            el.styles.display === "inline-flex") && (
            <div className="space-y-2.5 bg-white/3 rounded-lg p-2.5 border border-white/5">
              <Row>
                <Field label="Direction">
                  <Select
                    value={el.styles.flexDirection}
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
                    value={el.styles.flexWrap}
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
                      className={`h-7 rounded flex items-center justify-center transition-all cursor-pointer ${el.styles.justifyContent === opt.id ? "bg-[#333] text-white shadow-sm" : "text-white/20 hover:text-white/40 hover:bg-white/5"}`}
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
                      className={`h-7 rounded flex items-center justify-center transition-all cursor-pointer ${el.styles.alignItems === opt.id ? "bg-[#333] text-white shadow-sm" : "text-white/20 hover:text-white/40 hover:bg-white/5"}`}
                    >
                      {opt.icon}
                    </button>
                  ))}
                </div>
              </Field>
              <Row>
                <Field label="Gap">
                  <Input
                    value={el.styles.gap}
                    onChange={(v) => updateStyle("gap", v)}
                    placeholder="12px"
                  />
                </Field>
                <Field label="Grow">
                  <Input
                    value={el.styles.flexGrow}
                    onChange={(v) => updateStyle("flexGrow", v)}
                    placeholder="0"
                  />
                </Field>
              </Row>
              <Field label="Shrink">
                <Input
                  value={el.styles.flexShrink}
                  onChange={(v) => updateStyle("flexShrink", v)}
                  placeholder="1"
                />
              </Field>
            </div>
          )}
          {el.styles.display === "grid" && (
            <div className="space-y-2.5 bg-white/3 rounded-lg p-2.5 border border-white/5">
              <Field label="Gap">
                <Input
                  value={el.styles.gap}
                  onChange={(v) => updateStyle("gap", v)}
                  placeholder="12px"
                />
              </Field>
              <Field label="Columns">
                <Input
                  value={el.styles.gridTemplateColumns}
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
                    className={`text-[9px] px-1.5 py-0.5 rounded border cursor-pointer transition-all ${el.styles.gridTemplateColumns === v ? "bg-blue-500/20 border-blue-500/40 text-blue-300" : "bg-white/3 border-white/8 text-white/30 hover:text-white/70 hover:bg-white/8"}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <Field label="Rows">
                <Input
                  value={el.styles.gridTemplateRows}
                  onChange={(v) => updateStyle("gridTemplateRows", v)}
                  placeholder="auto"
                />
              </Field>
              <Row>
                <Field label="Gap">
                  <Input
                    value={el.styles.gap}
                    onChange={(v) => updateStyle("gap", v)}
                    placeholder="24px"
                  />
                </Field>
                <Field label="Col Gap">
                  <Input
                    value={el.styles.columnGap}
                    onChange={(v) => updateStyle("columnGap", v)}
                    placeholder="—"
                  />
                </Field>
              </Row>
              <Field label="Row Gap">
                <Input
                  value={el.styles.rowGap}
                  onChange={(v) => updateStyle("rowGap", v)}
                  placeholder="—"
                />
              </Field>
              <Row>
                <Field label="Justify">
                  <Select
                    value={el.styles.justifyContent}
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
                    value={el.styles.alignItems}
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
              value={el.styles.backgroundColor || ""}
              onChange={(v) => updateStyle("backgroundColor", v)}
            />
          </Field>
          <Field label="Image URL">
            <Input
              value={el.styles.backgroundImage || ""}
              onChange={(v) => updateStyle("backgroundImage", v)}
              placeholder="https://..."
            />
          </Field>
          <Field label="Or Upload">
            <MediaPicker
              value={el.styles.backgroundImage}
              onChange={(v) => updateStyle("backgroundImage", v)}
              accept="image/*"
              label="Upload Image"
            />
          </Field>
          {el.styles.backgroundImage && (
            <Row>
              <Field label="Size">
                <Select
                  value={el.styles.backgroundSize || "cover"}
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
                  value={el.styles.backgroundPosition || "center"}
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
              value={el.styles.gradientType || "none"}
              onChange={(v) => {
                const t = v as any;
                if (t === "linear" || t === "radial") {
                  updateElement(el.id, {
                    styles: {
                      ...el.styles,
                      gradientType: t,
                      gradientStartColor:
                        el.styles.gradientStartColor || "#4f46e5",
                      gradientEndColor: el.styles.gradientEndColor || "#9333ea",
                      gradientAngle: el.styles.gradientAngle ?? 135,
                    },
                  });
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
          {(el.styles.gradientType === "linear" ||
            el.styles.gradientType === "radial") && (
            <>
              <Row>
                <Field label="Start">
                  <ColorInput
                    value={el.styles.gradientStartColor || "#4f46e5"}
                    onChange={(v) => updateStyle("gradientStartColor", v)}
                  />
                </Field>
                <Field label="End">
                  <ColorInput
                    value={el.styles.gradientEndColor || "#9333ea"}
                    onChange={(v) => updateStyle("gradientEndColor", v)}
                  />
                </Field>
              </Row>
              {el.styles.gradientType === "linear" && (
                <Field label="Angle">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={el.styles.gradientAngle ?? 135}
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
                          ((el.styles.gradientAngle ?? 135) - 90) *
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
                        className={`py-1 text-[11px] rounded transition-all border cursor-pointer ${(el.styles.gradientAngle ?? 135) === a ? "bg-blue-500/20 border-blue-500/40 text-white" : "bg-white/3 border-white/5 text-white/30 hover:text-white/70 hover:bg-white/8"}`}
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

        <Section title="Borders" collapsible defaultOpen={false}>
          <Row>
            <Field label="Style">
              <Select
                value={el.styles.borderStyle}
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
                value={el.styles.borderRadius}
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
                  value={el.styles.borderWidth}
                  onChange={(v) => updateAllSides("border", v, "Width")}
                  placeholder="1px"
                />
                <ColorInput
                  value={el.styles.borderColor || "#ffffff"}
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
                      value={el.styles[side]}
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
              value={el.styles.outline}
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
                  el.styles.opacity !== undefined
                    ? Math.round(el.styles.opacity * 100)
                    : 100
                }
                onChange={(v) => updateStyle("opacity", v)}
                placeholder="100"
              />
            </Field>
            <Field label="Z-Index">
              <Input
                value={el.styles.zIndex}
                onChange={(v) => updateStyle("zIndex", v)}
                placeholder="0"
              />
            </Field>
          </Row>
          <Field label="Box Shadow">
            <Input
              value={el.styles.boxShadow}
              onChange={(v) => updateStyle("boxShadow", v)}
              placeholder="0 4px 12px rgba(0,0,0,0.2)"
            />
          </Field>
          <Field label="Backdrop Blur">
            <Input
              value={el.styles.backdropFilter}
              onChange={(v) => updateStyle("backdropFilter", v)}
              placeholder="blur(10px)"
            />
          </Field>
          <Field label="CSS Filter">
            <Input
              value={el.styles.filter}
              onChange={(v) => updateStyle("filter", v)}
              placeholder="brightness(0.8) blur(2px)"
            />
          </Field>
          <Field label="Transform">
            <Input
              value={el.styles.transform}
              onChange={(v) => updateStyle("transform", v)}
              placeholder="scale(1.1)"
            />
          </Field>
          <Field label="Transition">
            <Input
              value={el.styles.transition}
              onChange={(v) => updateStyle("transition", v)}
              placeholder="all 0.2s ease"
            />
          </Field>
        </Section>

        <Section title="Interaction" collapsible defaultOpen={false}>
          <Field label="Cursor">
            <Select
              value={el.styles.cursor}
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
                value={el.styles.userSelect}
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
                value={el.styles.pointerEvents}
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
              value={el.styles.position}
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
          <div
            className={`space-y-2.5 transition-opacity duration-200 ${!el.styles.position || el.styles.position === "static" ? "opacity-25 pointer-events-none" : "opacity-100"}`}
          >
            <Row>
              <Field label="Top">
                <Input
                  value={el.styles.top}
                  onChange={(v) => updateStyle("top", v)}
                  placeholder="0px"
                />
              </Field>
              <Field label="Right">
                <Input
                  value={el.styles.right}
                  onChange={(v) => updateStyle("right", v)}
                  placeholder="0px"
                />
              </Field>
            </Row>
            <Row>
              <Field label="Bottom">
                <Input
                  value={el.styles.bottom}
                  onChange={(v) => updateStyle("bottom", v)}
                  placeholder="0px"
                />
              </Field>
              <Field label="Left">
                <Input
                  value={el.styles.left}
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
