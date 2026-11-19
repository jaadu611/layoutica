"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  RefreshCw,
  Wand2,
  X,
  Smartphone,
  Tablet,
  Monitor,
  Eye,
  Check,
} from "lucide-react";
import { useBuilderStore } from "@/lib/builder/frontend/store";
import {
  runReflowAnalysis,
  ReflowAnalysisReport,
  ReflowIssue,
  Breakpoint,
} from "@/lib/builder/frontend/reflowAnalyzer";
import {
  captureBreakpointSnapshot,
  ViewportSnapshot,
} from "@/lib/builder/frontend/snapshotter";

interface Props {
  onClose: () => void;
}

export default function ReflowSimulatorModal({ onClose }: Props) {
  const {
    pages,
    activePageId,
    selectElement,
    updateElement,
    setActivePage,
  } = useBuilderStore();

  const [report, setReport] = useState<ReflowAnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | Breakpoint | "snapshots">(
    "all",
  );
  const [fixedIssueIds, setFixedIssueIds] = useState<Set<string>>(new Set());
  const [snapshots, setSnapshots] = useState<Record<Breakpoint, ViewportSnapshot | null>>({
    desktop: null,
    tablet: null,
    mobile: null,
  });

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const activePg = pages.find((p) => p.id === activePageId) || pages[0];
      const rep = await runReflowAnalysis(pages, activePageId);
      setReport(rep);

      if (activePg) {
        const [mSnap, tSnap] = await Promise.all([
          captureBreakpointSnapshot(activePg, pages, "mobile", 375, 667),
          captureBreakpointSnapshot(activePg, pages, "tablet", 768, 800),
        ]);
        setSnapshots({
          desktop: null,
          mobile: mSnap,
          tablet: tSnap,
        });
      }
    } catch (err) {
      console.error("[Reflow Simulator] Failed to execute analysis:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAnalysis();
  }, [pages, activePageId]);

  const handleApplyFix = (issue: ReflowIssue) => {
    if (!issue.suggestedFix) return;
    const activePg = pages.find((p) => p.id === issue.pageId) || pages[0];
    if (!activePg) return;

    const findEl = (els: any[]): any => {
      for (const el of els) {
        if (el.id === issue.elementId) return el;
        if (el.children) {
          const res = findEl(el.children);
          if (res) return res;
        }
      }
      return null;
    };

    const targetEl = findEl(activePg.elements);
    if (!targetEl) return;

    updateElement(issue.elementId, {
      styles: {
        ...targetEl.styles,
        ...issue.suggestedFix.patch,
      },
    });

    setFixedIssueIds((prev) => new Set([...prev, issue.id]));
  };

  const handleInspect = (issue: ReflowIssue) => {
    if (activePageId !== issue.pageId) {
      setActivePage(issue.pageId);
    }
    selectElement(issue.elementId);
    onClose();
  };

  const filteredIssues = (report?.issues || []).filter((issue) => {
    if (fixedIssueIds.has(issue.id)) return false;
    if (activeTab === "all") return true;
    if (activeTab === "snapshots") return false;
    return issue.breakpoint === activeTab;
  });

  const remainingCount = report ? report.totalIssues - fixedIssueIds.size : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[82vh] bg-[#18181b]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden text-white font-sans select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8 bg-white/2">
          <div className="flex items-center gap-2.5">
            <Activity size={15} className="text-white/60" />
            <h2 className="text-xs font-semibold text-white/90">
              Responsive Reflow Inspector
            </h2>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                remainingCount === 0
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}
            >
              {remainingCount === 0 ? "100% Responsive" : `${remainingCount} issues`}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={runAnalysis}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5 text-[11px] transition-colors cursor-pointer"
              title="Re-run responsive simulation"
            >
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
              <span>Re-scan</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-5 pt-2.5 pb-1 border-b border-white/5 bg-white/1 text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "all"
                  ? "bg-white/10 text-white font-semibold"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>All</span>
              <span className="text-[9px] px-1 py-0.2 bg-white/10 rounded font-mono text-white/60">
                {remainingCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("mobile")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "mobile"
                  ? "bg-white/10 text-white font-semibold"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              <Smartphone size={11} />
              <span>Mobile</span>
              <span className="text-[9px] px-1 py-0.2 bg-white/10 rounded font-mono text-white/60">
                {report?.breakpointBreakdown.mobile ?? 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("tablet")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "tablet"
                  ? "bg-white/10 text-white font-semibold"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              <Tablet size={11} />
              <span>Tablet</span>
              <span className="text-[9px] px-1 py-0.2 bg-white/10 rounded font-mono text-white/60">
                {report?.breakpointBreakdown.tablet ?? 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("desktop")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "desktop"
                  ? "bg-white/10 text-white font-semibold"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              <Monitor size={11} />
              <span>Desktop</span>
              <span className="text-[9px] px-1 py-0.2 bg-white/10 rounded font-mono text-white/60">
                {report?.breakpointBreakdown.desktop ?? 0}
              </span>
            </button>
          </div>

          <button
            onClick={() => setActiveTab("snapshots")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "snapshots"
                ? "bg-white/10 text-white font-semibold"
                : "text-white/40 hover:text-white hover:bg-white/5"
            }`}
          >
            <Eye size={11} />
            <span>Snapshots</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">
          {loading ? (
            <div className="h-44 flex flex-col items-center justify-center gap-2 text-white/40 text-xs">
              <RefreshCw size={18} className="animate-spin text-white/60" />
              <p className="font-mono text-[11px]">Evaluating layout invariants...</p>
            </div>
          ) : activeTab === "snapshots" ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2 p-3 bg-white/3 border border-white/6 rounded-xl">
                <div className="flex items-center justify-between text-[11px] text-white/60">
                  <span className="flex items-center gap-1">
                    <Smartphone size={12} /> Mobile (375px)
                  </span>
                </div>
                <div className="h-56 bg-black/50 rounded-lg border border-white/5 flex items-center justify-center p-2 overflow-hidden">
                  {snapshots.mobile ? (
                    <img
                      src={snapshots.mobile.dataUrl}
                      alt="Mobile Snapshot"
                      className="max-h-full object-contain rounded"
                    />
                  ) : (
                    <span className="text-white/20 text-[10px]">No snapshot</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 p-3 bg-white/3 border border-white/6 rounded-xl">
                <div className="flex items-center justify-between text-[11px] text-white/60">
                  <span className="flex items-center gap-1">
                    <Tablet size={12} /> Tablet (768px)
                  </span>
                </div>
                <div className="h-56 bg-black/50 rounded-lg border border-white/5 flex items-center justify-center p-2 overflow-hidden">
                  {snapshots.tablet ? (
                    <img
                      src={snapshots.tablet.dataUrl}
                      alt="Tablet Snapshot"
                      className="max-h-full object-contain rounded"
                    />
                  ) : (
                    <span className="text-white/20 text-[10px]">No snapshot</span>
                  )}
                </div>
              </div>
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center gap-2 text-center text-white/40">
              <CheckCircle2 size={20} className="text-emerald-400" />
              <h3 className="text-xs font-semibold text-white/80">
                No Responsive Breakpoint Violations
              </h3>
              <p className="text-[11px] text-white/40 max-w-xs">
                Containment, sibling bounds, and aspect ratios verified clean.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filteredIssues.map((issue) => {
                const isErr = issue.severity === "error";
                const isFixed = fixedIssueIds.has(issue.id);

                return (
                  <div
                    key={issue.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/5 border border-white/6 text-xs transition-colors"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="mt-0.5 shrink-0">
                        {isErr ? (
                          <AlertCircle size={14} className="text-red-400" />
                        ) : (
                          <AlertTriangle size={14} className="text-amber-400" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white/90 truncate">
                            {issue.title}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/8 font-mono text-white/50 uppercase">
                            {issue.breakpoint}
                          </span>
                          {issue.metric && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 font-mono text-white/40">
                              {issue.metric}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/50 mt-0.5 truncate">
                          {issue.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleInspect(issue)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5 text-[11px] transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>
                      {issue.suggestedFix && (
                        <button
                          onClick={() => handleApplyFix(issue)}
                          disabled={isFixed}
                          className={`flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                            isFixed
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                          }`}
                        >
                          {isFixed ? (
                            <>
                              <Check size={11} />
                              <span>Fixed</span>
                            </>
                          ) : (
                            <>
                              <Wand2 size={11} />
                              <span>{issue.suggestedFix.label}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
