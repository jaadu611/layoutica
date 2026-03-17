"use client";

import { useState } from "react";
import { useBuilderStore } from "@/lib/builder/store";
import { StyleProps } from "@/lib/builder/types";
import {
  Link as LinkIcon,
  Unlink,
  Maximize2,
  Minimize2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyEnd,
  StretchHorizontal,
  WrapText,
  Eye,
  EyeOff,
  MousePointer2,
  Layers,
} from "lucide-react";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[9px] uppercase tracking-[0.12em] text-white/25 block mb-1 font-bold">
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value?: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value?.toString() ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-[11px] bg-white/5 border border-white/10 rounded px-2 py-1.5 outline-none focus:border-blue-500/50 text-white placeholder-white/10 transition-all"
    />
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
      <div className="relative w-7 h-7 shrink-0">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
        <div
          className="w-full h-full rounded border border-white/10"
          style={{ backgroundColor: value || "#000000" }}
        />
      </div>
      <Input value={value} onChange={onChange} placeholder="#HEX" />
    </div>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="space-y-3 pb-4 border-b border-white/5 last:border-0 mb-4">
      <div className="flex items-center justify-between pt-1">
        <span className="text-[9px] uppercase tracking-[0.15em] text-white/40 font-black">
          {title}
        </span>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function PropertiesPanel() {
  const { getSelectedElement, updateElement } = useBuilderStore();
  const el = getSelectedElement();

  const [padLinked, setPadLinked] = useState(true);
  const [marLinked, setMarLinked] = useState(true);
  const [borderLinked, setBorderLinked] = useState(true);

  if (!el)
    return (
      <div className="w-[240px] border-l border-[#2a2a2a] bg-[#161616] flex flex-col items-center justify-center p-8 text-center h-full">
        <MousePointer2 className="w-5 h-5 text-white/10 mb-3" />
        <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold leading-relaxed">
          Select a layer
          <br />
          to edit properties
        </p>
      </div>
    );

  const update = (key: string, value: string) =>
    updateElement(el.id, { [key]: value } as any);

  const updateStyle = (key: keyof StyleProps, value: string) => {
    const isNumber = key === "opacity" || key === "zIndex";
    const val = isNumber ? (value === "" ? undefined : Number(value)) : value;
    updateElement(el.id, { styles: { ...el.styles, [key]: val } });
  };

  const updateAllSides = (prefix: "padding" | "margin", value: string) => {
    updateElement(el.id, {
      styles: {
        ...el.styles,
        [`${prefix}Top`]: value,
        [`${prefix}Right`]: value,
        [`${prefix}Bottom`]: value,
        [`${prefix}Left`]: value,
      },
    });
  };

  const isContainer = ["section", "navbar", "footer"].includes(el.type);
  const hasTypography = [
    "heading",
    "text",
    "button",
    "navbar",
    "footer",
  ].includes(el.type);

  return (
    <div className="w-[240px] border-l border-[#2a2a2a] bg-[#161616] flex flex-col shrink-0 overflow-hidden select-none h-full">
      <div className="h-10 px-3 border-b border-[#2a2a2a] flex items-center justify-between bg-[#1a1a1a] shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="w-3 h-3 text-blue-500" />
          <span className="text-[11px] font-bold text-white/90 uppercase tracking-tight">
            {el.type}
          </span>
        </div>
        <span className="text-[9px] text-white/20 font-mono">
          ID: {el.id.slice(-4)}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <Section title="Layout">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Width</Label>
              <Input
                value={el.styles.width}
                onChange={(v) => updateStyle("width", v)}
                placeholder="auto"
              />
            </div>
            <div>
              <Label>Height</Label>
              <Input
                value={el.styles.height}
                onChange={(v) => updateStyle("height", v)}
                placeholder="auto"
              />
            </div>
          </div>
        </Section>

        {isContainer && (
          <Section title="Flexbox">
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>Direction</Label>
                  <div className="flex bg-white/5 rounded p-0.5 border border-white/5">
                    <button
                      onClick={() => updateStyle("flexDirection", "row")}
                      className={`flex-1 py-1 rounded text-[10px] ${el.styles.flexDirection !== "column" ? "bg-[#333] text-white shadow-sm" : "text-white/30"}`}
                    >
                      Row
                    </button>
                    <button
                      onClick={() => updateStyle("flexDirection", "column")}
                      className={`flex-1 py-1 rounded text-[10px] ${el.styles.flexDirection === "column" ? "bg-[#333] text-white shadow-sm" : "text-white/30"}`}
                    >
                      Col
                    </button>
                  </div>
                </div>
                <div className="w-12">
                  <Label>Wrap</Label>
                  <button
                    onClick={() =>
                      updateStyle(
                        "flexWrap",
                        el.styles.flexWrap === "wrap" ? "nowrap" : "wrap",
                      )
                    }
                    className={`w-full py-1.5 rounded border flex justify-center transition-all ${el.styles.flexWrap === "wrap" ? "bg-blue-500/10 border-blue-500/50 text-blue-400" : "border-white/10 text-white/20"}`}
                  >
                    <WrapText size={12} />
                  </button>
                </div>
              </div>

              <div>
                <Label>Horizontal Axis</Label>
                <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded border border-white/5">
                  {[
                    {
                      val: "flex-start",
                      icon: <AlignVerticalJustifyStart size={12} />,
                    },
                    {
                      val: "center",
                      icon: <AlignVerticalJustifyCenter size={12} />,
                    },
                    {
                      val: "flex-end",
                      icon: <AlignVerticalJustifyEnd size={12} />,
                    },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => updateStyle("justifyContent", opt.val)}
                      className={`py-1.5 rounded flex items-center justify-center transition-all ${el.styles.justifyContent === opt.val ? "bg-[#444] text-white" : "text-white/20 hover:text-white/40"}`}
                    >
                      {opt.icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Vertical Axis</Label>
                <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded border border-white/5">
                  {[
                    { val: "flex-start", icon: <AlignLeft size={12} /> },
                    { val: "center", icon: <AlignCenter size={12} /> },
                    { val: "flex-end", icon: <AlignRight size={12} /> },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => updateStyle("alignItems", opt.val)}
                      className={`py-1.5 rounded flex items-center justify-center transition-all ${el.styles.alignItems === opt.val ? "bg-[#444] text-white" : "text-white/20 hover:text-white/40"}`}
                    >
                      {opt.icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Gap</Label>
                <Input
                  value={el.styles.gap}
                  onChange={(v) => updateStyle("gap", v)}
                  placeholder="16px"
                />
              </div>
            </div>
          </Section>
        )}

        {hasTypography && (
          <Section title="Typography">
            <div className="space-y-3">
              <textarea
                value={el.content || ""}
                onChange={(e) => update("content", e.target.value)}
                className="w-full text-[11px] bg-white/5 border border-white/10 rounded px-2 py-1.5 outline-none focus:border-white/30 resize-none text-white font-medium"
                rows={2}
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Size</Label>
                  <Input
                    value={el.styles.fontSize}
                    onChange={(v) => updateStyle("fontSize", v)}
                    placeholder="16px"
                  />
                </div>
                <div>
                  <Label>Weight</Label>
                  <select
                    value={el.styles.fontWeight || "400"}
                    onChange={(e) => updateStyle("fontWeight", e.target.value)}
                    className="w-full text-[11px] bg-[#1a1a1a] border border-white/10 rounded px-1 py-1.5 text-white outline-none"
                  >
                    <option value="300">Light</option>
                    <option value="400">Regular</option>
                    <option value="600">Medium</option>
                    <option value="700">Bold</option>
                  </select>
                </div>
              </div>
              <ColorInput
                value={el.styles.color || "#000000"}
                onChange={(v) => updateStyle("color", v)}
              />
            </div>
          </Section>
        )}

        <Section
          title="Padding"
          action={
            <button
              onClick={() => setPadLinked(!padLinked)}
              className="text-white/20 hover:text-blue-400 transition-colors"
            >
              {padLinked ? (
                <LinkIcon size={10} />
              ) : (
                <Unlink size={10} className="text-blue-500" />
              )}
            </button>
          }
        >
          {padLinked ? (
            <Input
              value={el.styles.paddingTop}
              onChange={(v) => updateAllSides("padding", v)}
              placeholder="All sides"
            />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Top</Label>
                <Input
                  value={el.styles.paddingTop}
                  onChange={(v) => updateStyle("paddingTop", v)}
                />
              </div>
              <div className="space-y-1">
                <Label>Right</Label>
                <Input
                  value={el.styles.paddingRight}
                  onChange={(v) => updateStyle("paddingRight", v)}
                />
              </div>
              <div className="space-y-1">
                <Label>Bottom</Label>
                <Input
                  value={el.styles.paddingBottom}
                  onChange={(v) => updateStyle("paddingBottom", v)}
                />
              </div>
              <div className="space-y-1">
                <Label>Left</Label>
                <Input
                  value={el.styles.paddingLeft}
                  onChange={(v) => updateStyle("paddingLeft", v)}
                />
              </div>
            </div>
          )}
        </Section>

        <Section
          title="Margin"
          action={
            <button
              onClick={() => setMarLinked(!marLinked)}
              className="text-white/20 hover:text-blue-400 transition-colors"
            >
              {marLinked ? (
                <LinkIcon size={10} />
              ) : (
                <Unlink size={10} className="text-blue-500" />
              )}
            </button>
          }
        >
          {marLinked ? (
            <Input
              value={el.styles.marginTop}
              onChange={(v) => updateAllSides("margin", v)}
              placeholder="All sides"
            />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Top</Label>
                <Input
                  value={el.styles.marginTop}
                  onChange={(v) => updateStyle("marginTop", v)}
                />
              </div>
              <div className="space-y-1">
                <Label>Right</Label>
                <Input
                  value={el.styles.marginRight}
                  onChange={(v) => updateStyle("marginRight", v)}
                />
              </div>
              <div className="space-y-1">
                <Label>Bottom</Label>
                <Input
                  value={el.styles.marginBottom}
                  onChange={(v) => updateStyle("marginBottom", v)}
                />
              </div>
              <div className="space-y-1">
                <Label>Left</Label>
                <Input
                  value={el.styles.marginLeft}
                  onChange={(v) => updateStyle("marginLeft", v)}
                />
              </div>
            </div>
          )}
        </Section>

        <Section title="Fill">
          <ColorInput
            value={el.styles.backgroundColor || ""}
            onChange={(v) => updateStyle("backgroundColor", v)}
          />
        </Section>

        <Section
          title="Stroke"
          action={
            <button
              onClick={() => setBorderLinked(!borderLinked)}
              className="text-white/20 hover:text-blue-400"
            >
              {borderLinked ? (
                <Maximize2 size={10} />
              ) : (
                <Minimize2 size={10} className="text-blue-500" />
              )}
            </button>
          }
        >
          <div className="space-y-3">
            <ColorInput
              value={el.styles.borderColor || "#000000"}
              onChange={(v) => updateStyle("borderColor", v)}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Radius</Label>
                <Input
                  value={el.styles.borderRadius}
                  onChange={(v) => updateStyle("borderRadius", v)}
                  placeholder="0px"
                />
              </div>
              <div>
                <Label>Weight</Label>
                <Input
                  value={el.styles.borderWidth}
                  onChange={(v) => updateStyle("borderWidth", v)}
                  placeholder="1px"
                />
              </div>
            </div>
            {!borderLinked && (
              <div className="grid grid-cols-4 gap-1 p-1 bg-black/20 rounded border border-white/5">
                {["Top", "Right", "Bottom", "Left"].map((side) => {
                  const key = `border${side}` as any;
                  const isActive = !!el.styles[key as keyof StyleProps];
                  return (
                    <button
                      key={side}
                      onClick={() =>
                        updateStyle(
                          key,
                          isActive
                            ? ""
                            : `${el.styles.borderWidth || "1px"} solid ${el.styles.borderColor || "#000"}`,
                        )
                      }
                      className={`text-[9px] py-1.5 rounded border transition-all ${isActive ? "bg-blue-500/10 border-blue-500/50 text-blue-400" : "border-transparent text-white/40 hover:text-white/40"}`}
                    >
                      {side[0]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Section>

        <Section title="Effects">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Opacity</Label>
              <Input
                value={el.styles.opacity}
                onChange={(v) => updateStyle("opacity", v)}
                placeholder="1"
              />
            </div>
            <div>
              <Label>Z-Index</Label>
              <Input
                value={el.styles.zIndex}
                onChange={(v) => updateStyle("zIndex", v)}
                placeholder="0"
              />
            </div>
          </div>
          <button
            onClick={() =>
              updateStyle(
                "display",
                el.styles.display === "none"
                  ? isContainer
                    ? "flex"
                    : "block"
                  : "none",
              )
            }
            className={`w-full py-2 rounded border flex items-center justify-center gap-2 text-[10px] transition-all ${el.styles.display === "none" ? "bg-red-500/10 border-red-500/30 text-red-400" : "border-white/10 text-white/40 hover:bg-white/5"}`}
          >
            {el.styles.display === "none" ? (
              <EyeOff size={12} />
            ) : (
              <Eye size={12} />
            )}
            {el.styles.display === "none" ? "Layer Hidden" : "Layer Visible"}
          </button>
        </Section>
      </div>
    </div>
  );
}
