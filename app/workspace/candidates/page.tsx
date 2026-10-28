"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Play, Pause, Check, SkipForward, MoreHorizontal, Filter, ArrowUpDown, Plus, List, Columns, Download, Flag } from "lucide-react";
import { useStore, useFilteredCandidates } from "@/lib/store";
import { useAudioUrlFallback } from "@/hooks/useAudioUrlFallback";
import { useAudioSegment } from "@/hooks/useAudioSegment";
import { formatTime, formatDuration, cn } from "@/lib/utils";
import { ScoreRing } from "@/components/ScoreRing";
import { RadarChart } from "@/components/RadarChart";
import { WaveformCanvas } from "@/components/WaveformCanvas";
import { Badge } from "@/components/Badge";
import { QABadge } from "@/components/QABadge";
import { SeamView } from "@/components/SeamView";
import { ParamSlider } from "@/components/ParamSlider";

export default function CandidatesPage() {
  const router = useRouter();
  const project = useStore((s) => s.currentProject);
  const selectedId = useStore((s) => s.selectedCandidateId);
  const selectCandidate = useStore((s) => s.selectCandidate);
  const filter = useStore((s) => s.stageFilter);
  const setFilter = useStore((s) => s.setStageFilter);
  const sortBy = useStore((s) => s.sortBy);
  const setSortBy = useStore((s) => s.setSortBy);
  const viewMode = useStore((s) => s.viewMode);
  const setViewMode = useStore((s) => s.setViewMode);
  const inExport = useStore((s) => s.inExport);
  const toggleExport = useStore((s) => s.toggleExport);
  const favorites = useStore((s) => s.favorites);
  const toggleFav = useStore((s) => s.toggleFavorite);
  const showToast = useStore((s) => s.showToast);
  const setProject = useStore((s) => s.setProject);
  const bulkToggleExport = useStore((s) => s.bulkToggleExport);
  const regenerateCandidates = useStore((s) => s.regenerateCandidates);
  const updateCandidate = useStore((s) => s.updateCandidate);

  const filtered = useFilteredCandidates();
  const selected = useMemo(() => filtered.find((c) => c.id === selectedId) ?? filtered[0], [filtered, selectedId]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const activeRangeRef = useRef<{ start: number; end: number } | null>(null);

  useAudioUrlFallback(project, setProject);

  const { audioRef, playhead, safePlay, safePause, seekTo } = useAudioSegment({
    url: project?.file?.url,
    showToast,
    onTimeUpdate: (t) => {
      const r = activeRangeRef.current;
      if (r && t >= r.end) {
        seekTo(r.start);
        void safePlay();
      }
    },
    onEnded: () => {
      const r = activeRangeRef.current;
      if (r) {
        seekTo(r.start);
        void safePlay();
      }
    },
  });

  const playCandidate = (candidate: (typeof filtered)[number]) => {
    if (!project?.file.url) {
      showToast("error", "音频未就绪");
      return;
    }
    if (playingId === candidate.id) {
      const audio = audioRef.current;
      if (!audio) return;
      if (audio.paused) {
        void safePlay();
        setPlayingId(candidate.id);
      } else {
        safePause();
        setPlayingId(null);
      }
      return;
    }
    safePause();
    activeRangeRef.current = { start: candidate.start, end: candidate.end };
    safePlay((audio) => {
      audio.currentTime = candidate.start;
    }).then((ok) => {
      if (ok) setPlayingId(candidate.id);
    });
  };

  useEffect(() => {
    if (playingId) return () => safePause();
  }, [playingId, safePause]);

  if (!project || !project.analysis) return null;

  return (
    <>
      <div className="grid grid-cols-1 gap-3 lg:gap-4 xl:grid-cols-[200px_minmax(0,1fr)_320px] 2xl:grid-cols-[220px_minmax(0,1fr)_360px]">
      <SegmentNav />

      <div className="min-w-0 flex flex-col gap-4">
        <Toolbar
          filter={filter}
          setFilter={setFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          viewMode={viewMode}
          setViewMode={setViewMode}
          passCount={project.candidates.filter((c) => c.qa.status === "pass").length}
          allCount={project.candidates.length}
        />

        <div className="glass rounded-[10px] sm:rounded-[14px] p-2 sm:p-3">
          <div className="mb-1 text-[10px] sm:text-[11px] text-dim">全曲波形 · 选中区间预览</div>
          <div className="h-[70px] sm:h-[110px]">
            <WaveformCanvas
              peaks={project.analysis?.waveformPeaks ?? []}
              duration={project.analysis?.duration ?? 0}
              height={110}
              segments={project.analysis?.segments ?? []}
              beats={project.analysis?.beats ?? []}
              vocalZones={project.analysis?.vocalSafeZones ?? []}
              candidates={project.candidates.map((c) => ({ start: c.start, end: c.end, id: c.id }))}
              selectedStart={selected?.start}
              selectedEnd={selected?.end}
              progress={playingId ? playhead : undefined}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 sm:gap-2 lg:gap-3">
          <AnimatePresence initial={false}>
            {filtered.map((c, i) => {
              const selected = c.id === selectedId;
              const vm = c.vocalMode ?? "off";
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: i * 0.025 }}
                  onClick={() => selectCandidate(c.id)}
                  className={cn(
                    "group relative cursor-pointer transition-all glass flex items-center",
                    "gap-1.5 sm:gap-2.5 lg:gap-3",
                    "p-1.5 sm:p-2.5 lg:p-3 rounded-[10px] sm:rounded-[14px]",
                    selected && "shadow-card border-[rgba(0,229,255,0.35)]"
                  )}
                  style={selected ? { boxShadow: "0 0 0 1px rgba(0,229,255,0.2), var(--shadow-card)" } : undefined}
                >
                  {selected && (
                    <div className="absolute left-0 top-1 bottom-1 w-[2px] sm:top-1.5 sm:bottom-1.5 rounded-full bg-[var(--accent-cyan)]" />
                  )}

                  <div className="flex items-center shrink-0">
                    <ScoreRing score={c.score} size={22} stroke={2} showLabel className="sm:hidden" />
                    <ScoreRing score={c.score} size={36} stroke={2.8} showLabel className="hidden sm:flex md:hidden" />
                    <ScoreRing score={c.score} size={40} stroke={3} showLabel className="hidden md:flex lg:hidden" />
                    <ScoreRing score={c.score} size={44} stroke={3.5} showLabel className="hidden lg:flex" />
                  </div>

                  <div className="min-w-0 flex-1 flex flex-col gap-0.5 sm:gap-1 lg:gap-1.5">
                    <div className="flex items-center gap-0.5 sm:gap-1.5 flex-wrap min-w-0">
                      <span className="num-mono text-[8.5px] sm:text-[11px] text-dim shrink-0">#{String(c.index).padStart(2, "0")}</span>
                      <span className="font-display text-[11px] sm:text-[14px] font-medium truncate min-w-0 max-w-[45%] sm:max-w-none">{c.segment}</span>
                      <span className="num-mono text-[8px] sm:text-[11px] text-1 shrink-0">·{formatDuration(c.duration)}</span>
                      <Badge variant={c.relaxed ? "amber" : "cyan"} dot className="!text-[8px] !px-1 !py-0 sm:!text-[11px] sm:!px-2 sm:!py-0.5">{c.relaxed ? "放宽" : "AUTO"}</Badge>
                      <Badge variant="muted" className="!text-[8px] !px-1 !py-0 sm:!text-[11px] sm:!px-2 sm:!py-0.5">{c.loopStrategy}</Badge>
                      <QABadge qa={c.qa} className="!text-[8px] !px-1 !py-0 sm:!text-[11px] sm:!px-2 sm:!py-0.5" />
                    </div>

                    <div className="flex items-center gap-1 sm:gap-3 text-[8px] sm:text-[11px] num-mono flex-wrap">
                      <span className="text-muted shrink-0 tabular-nums">{formatTime(c.start)}→{formatTime(c.end)}</span>
                      <span className="text-dim">·</span>
                      <span className="text-muted shrink-0">锚点 {c.anchorType}</span>
                      <span className="text-dim">·</span>
                      <span className="text-muted shrink-0">{(c.anchorConfidence * 100).toFixed(0)}%</span>
                    </div>

                    <div className="flex items-center gap-0.5 sm:gap-1.5 flex-wrap">
                      {[
                        { k: "off", label: "原始" },
                        { k: "vocal", label: "人声聚焦" },
                        { k: "instrumental", label: "伴奏纯净" },
                      ].map((m) => (
                        <button
                          key={m.k}
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = (vm === m.k ? "off" : m.k) as any;
                            useStore.getState().updateCandidate(c.id, { vocalMode: next });
                            showToast("info", next === "off" ? "已恢复原始声像" : next === "vocal" ? "已切换为 · 人声聚焦" : "已切换为 · 伴奏纯净");
                          }}
                          title={m.k === "off" ? "保留全频段" : m.k === "vocal" ? "提取纯净人声" : "去除人声"}
                          className={cn(
                            "rounded-[4px] sm:rounded-[7px] px-1 sm:px-2 py-0 sm:py-1 text-[9px] sm:text-[11px] transition num-mono",
                            vm === m.k
                              ? "bg-[rgba(0,229,255,0.14)] text-[var(--accent-cyan)] ring-1 ring-[rgba(0,229,255,0.35)]"
                              : "text-dim sm:text-muted hover:text-1 hover:bg-[var(--bg-3)]"
                          )}
                        >
                          {m.label}
                        </button>
                      ))}
                      {vm !== "off" && (
                        <span className="text-[8px] sm:text-[10px] num-mono text-[var(--accent-cyan)]">· 声像处理中</span>
                      )}
                    </div>

                    {selected && (
                      <div className="h-6 sm:h-10 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition">
                        <WaveformCanvas
                          peaks={project.analysis?.waveformPeaks ?? []}
                          duration={project.analysis?.duration ?? 0}
                          height={24}
                          interactive={false}
                          showRuler={false}
                          selectedStart={c.start}
                          selectedEnd={c.end}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); playCandidate(c); }}
                      className="flex h-6 w-6 sm:h-8 sm:w-8 lg:h-9 lg:w-9 items-center justify-center rounded-full glass hover:scale-105 active:scale-95 transition"
                      aria-label="播放"
                    >
                      {playingId === c.id ? (
                        <Pause className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4 text-[var(--accent-cyan)]" />
                      ) : (
                        <Play className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4 text-[var(--accent-cyan)]" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExport(c.id);
                        showToast("success", inExport.includes(c.id) ? "已从导出列表移除" : "已加入导出列表");
                      }}
                      aria-label="加入导出"
                      className={cn(
                        "flex h-6 w-6 sm:h-8 sm:w-8 lg:h-9 lg:w-9 items-center justify-center rounded-full glass hover:scale-105 active:scale-95 transition",
                        inExport.includes(c.id) && "bg-[rgba(46,230,168,0.18)]"
                      )}
                    >
                      <Check className={cn("h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4", inExport.includes(c.id) && "text-[var(--accent-green)]")} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFav(c.id); }}
                      aria-label="收藏"
                      className={cn(
                        "flex h-6 w-6 sm:h-8 sm:w-8 lg:h-9 lg:w-9 items-center justify-center rounded-full glass hover:scale-105 active:scale-95 transition",
                        favorites.includes(c.id) && "bg-[rgba(255,176,32,0.18)]"
                      )}
                    >
                      <Flag className={cn("h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4", favorites.includes(c.id) && "text-[var(--accent-amber)]")} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selectCandidate(c.id);
                        router.push("/workspace/editor");
                      }}
                      aria-label="更多"
                      className="flex h-6 w-6 sm:h-8 sm:w-8 lg:h-9 lg:w-9 items-center justify-center rounded-full glass opacity-60 sm:opacity-0 sm:group-hover:opacity-100 hover:opacity-100 hover:scale-105 transition"
                    >
                      <MoreHorizontal className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4 text-muted" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="glass rounded-[14px] p-12 text-center">
              <div className="num-mono text-dim text-[12px] mb-2">空状态</div>
              <div className="font-display text-[15px] text-muted">没有符合条件的候选 · 试试筛选或调整约束</div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selected && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            className="flex flex-col gap-4"
          >
            <DetailPanel candidate={selected} peaks={project.analysis?.waveformPeaks ?? []} duration={project.analysis?.duration ?? 0} />
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      <audio ref={audioRef} preload="auto" />
    </>
  );
}

function SegmentNav() {
  const project = useStore((s) => s.currentProject);
  const selectCandidate = useStore((s) => s.selectCandidate);
  const filtered = useFilteredCandidates();
  if (!project) return null;

  const bySegment = new Map<string, number>();
  filtered.forEach((c) => bySegment.set(c.segment, (bySegment.get(c.segment) ?? 0) + 1));

  return (
    <div className="glass rounded-[14px] p-3 h-fit hidden xl:block sticky top-[80px]">
      <div className="flex items-center gap-2 mb-3">
        <Columns className="h-3.5 w-3.5 text-[var(--accent-cyan)]" />
        <div className="text-[12px] font-medium text-1">结构导航</div>
      </div>
      <div className="flex flex-col gap-1">
        {Array.from(bySegment.entries()).map(([seg, count]) => (
          <button
            key={seg}
            onClick={() => {
              const first = filtered.find((c) => c.segment === seg);
              if (first) selectCandidate(first.id);
            }}
            className="flex items-center justify-between rounded-[8px] px-2.5 py-1.5 text-[12px] text-muted hover:bg-[var(--bg-3)] hover:text-1 transition"
          >
            <span className="truncate">{seg}</span>
            <span className="num-mono text-[10px] text-dim">{count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Toolbar({
  filter,
  setFilter,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  passCount,
  allCount,
}: {
  filter: string;
  setFilter: (s: any) => void;
  sortBy: string;
  setSortBy: (s: any) => void;
  viewMode: string;
  setViewMode: (s: any) => void;
  passCount: number;
  allCount: number;
}) {
  const showToast = useStore((s) => s.showToast);
  const project = useStore((s) => s.currentProject);
  const bulkToggleExport = useStore((s) => s.bulkToggleExport);
  const regenerateCandidates = useStore((s) => s.regenerateCandidates);
  return (
    <div className="glass rounded-[10px] sm:rounded-[14px] flex flex-wrap items-center gap-0.5 sm:gap-1.5 p-1 sm:p-2">
      <div className="flex items-center gap-0.5">
        <Filter className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted mx-0.5 sm:mx-2 shrink-0" />
        {[
          { k: "all", labelAll: `全部 ${allCount}`, labelMobile: `${allCount}` },
          { k: "pass", labelAll: `PASS ${passCount}`, labelMobile: `${passCount}` },
          { k: "relaxed", labelAll: "放宽", labelMobile: "宽" },
          { k: "fail", labelAll: "FAIL", labelMobile: "失" },
        ].map((f) => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k)}
            className={cn(
              "rounded-[6px] sm:rounded-[8px] px-1.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-[12px] transition whitespace-nowrap",
              filter === f.k ? "bg-[rgba(0,229,255,0.14)] text-[var(--accent-cyan)]" : "text-muted hover:text-1 hover:bg-[var(--bg-3)]"
            )}
          >
            <span className="sm:hidden">{f.labelMobile}</span>
            <span className="hidden sm:inline">{f.labelAll}</span>
          </button>
        ))}
      </div>

      <div className="hidden sm:block mx-1 h-4 w-px bg-[var(--border)]" />

      <div className="flex items-center gap-0.5">
        <ArrowUpDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted mx-0.5 sm:mx-2 shrink-0" />
        {[
          { k: "score", label: "评分" },
          { k: "duration", label: "时长" },
          { k: "segment", label: "结构" },
        ].map((s) => (
          <button
            key={s.k}
            onClick={() => setSortBy(s.k)}
            className={cn(
              "rounded-[6px] sm:rounded-[8px] px-1.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-[12px] transition whitespace-nowrap",
              sortBy === s.k ? "bg-[var(--bg-3)] text-1" : "text-muted hover:text-1 hover:bg-[var(--bg-3)]"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="hidden sm:block mx-1 h-4 w-px bg-[var(--border)]" />

      <div className="flex ml-auto items-center gap-0.5 sm:gap-1">
        <button
          onClick={() => setViewMode(viewMode === "list" ? "timeline" : "list")}
          className="rounded-[6px] sm:rounded-[8px] px-1.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-[12px] text-muted hover:text-1 hover:bg-[var(--bg-3)] transition"
          title="切换视图"
        >
          {viewMode === "list" ? <List className="inline h-3 w-3 sm:h-3.5 sm:w-3.5 -mt-0.5" /> : <Columns className="inline h-3 w-3 sm:h-3.5 sm:w-3.5 -mt-0.5" />}
          <span className="ml-0.5 hidden sm:inline">视图</span>
        </button>

        <button
          onClick={() => {
            regenerateCandidates();
            showToast("success", "已生成 3 个新候选");
          }}
          className="flex items-center gap-1 rounded-[6px] sm:rounded-[8px] px-1.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-[12px] text-muted hover:text-1 hover:bg-[var(--bg-3)] transition"
          title="再挖一些"
        >
          <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          <span className="hidden sm:inline">再挖一些</span>
        </button>

        <button
          onClick={() => {
            const passIds = project?.candidates.filter((c) => c.qa.status === "pass").map((c) => c.id) ?? [];
            if (passIds.length === 0) {
              showToast("info", "没有 PASS 的候选");
              return;
            }
            bulkToggleExport(passIds);
            showToast("success", `${passIds.length} 条 PASS 已加入导出队列`);
          }}
          className="flex items-center gap-1 rounded-[6px] sm:rounded-[10px] grad-primary px-1.5 sm:px-3 py-0.5 sm:py-1.5 text-[10px] sm:text-[12px] font-medium text-[var(--bg-0)] transition hover:scale-[1.02]"
          title="批量导出 PASS"
        >
          <Download className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          <span className="hidden sm:inline">批量导出</span>
          <span className="hidden md:inline"> PASS</span>
        </button>
      </div>
    </div>
  );
}

function DetailPanel({
  candidate,
  peaks,
  duration,
}: {
  candidate: ReturnType<typeof useFilteredCandidates>[number];
  peaks: number[];
  duration: number;
}) {
  const router = useRouter();
  const showToast = useStore((s) => s.showToast);
  const selectCandidate = useStore((s) => s.selectCandidate);
  const toggleExport = useStore((s) => s.toggleExport);
  const setView = useStore((s) => s.setViewMode);
  const updateCandidate = useStore((s) => s.updateCandidate);
  const loopStrategy = candidate.loopStrategy;
  return (
    <div className="glass rounded-[14px] p-4 flex flex-col gap-4 shadow-card">
      <div>
        <div className="text-[11px] text-dim mb-2">评分雷达 · 8 维</div>
        <div className="flex justify-center">
          <RadarChart data={candidate.scoreBreakdown} size={240} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[11px] text-dim">切点理由</div>
        <div className="text-[13px] text-1 leading-relaxed">{candidate.reason}</div>
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <Badge variant="violet" dot>{candidate.anchorType}</Badge>
          <Badge variant="cyan" dot>{loopStrategy}</Badge>
          <Badge variant={candidate.qa.status === "pass" ? "green" : "red"} dot>
            循环 {(candidate.loopQuality * 100).toFixed(0)}%
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ParamSlider
          label="淡入"
          unit="ms"
          value={candidate.fadeInMs}
          min={30}
          max={300}
          step={10}
          onChange={(v) => updateCandidate(candidate.id, { fadeInMs: v })}
        />
        <ParamSlider
          label="淡出"
          unit="ms"
          value={candidate.fadeOutMs}
          min={200}
          max={1500}
          step={50}
          onChange={(v) => updateCandidate(candidate.id, { fadeOutMs: v })}
        />
      </div>

      <SeamView
        peaks={peaks}
        tailStart={candidate.start}
        tailEnd={candidate.end}
        duration={duration}
        seamQuality={candidate.loopQuality}
      />

      <div className="rounded-[12px] border border-app bg-[var(--bg-1)] p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] text-dim">QA 明细</div>
          <QABadge qa={candidate.qa} />
        </div>
        <ul className="space-y-1 text-[11px] num-mono">
          {candidate.qa.reasons.map((r, i) => (
            <li key={i} className="flex items-center gap-2">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  candidate.qa.status === "pass" ? "bg-[var(--accent-green)]" : "bg-[var(--accent-amber)]"
                )}
              />
              <span className="text-muted">{r}</span>
            </li>
          ))}
          <li className="flex items-center justify-between pt-2 border-t border-app">
            <span className="text-dim">LUFS / TP</span>
            <span className="text-muted">
              {candidate.qa.loudnessLUFS.toFixed(1)} / {candidate.qa.truePeakDBTP.toFixed(1)} dBTP
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-dim">时长</span>
            <span className="text-muted">{formatDuration(candidate.duration)}</span>
          </li>
        </ul>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1">
        <button
          onClick={() => {
            selectCandidate(candidate.id);
            router.push("/workspace/editor");
          }}
          className="flex items-center justify-center gap-1 rounded-[10px] glass py-2 text-[12px] text-muted hover:text-1 hover:bg-[var(--bg-3)] transition"
        >
          <SkipForward className="h-3.5 w-3.5" />
          精修
        </button>
        <button
          onClick={() => {
            const jitter = (v: number) => Math.max(0, Math.min(100, v + (Math.random() - 0.5) * 10));
            const bd = { ...candidate.scoreBreakdown };
            Object.keys(bd).forEach((k) => { bd[k] = jitter(bd[k]); });
            const values = Object.values(bd);
            const newScore = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
            updateCandidate(candidate.id, { scoreBreakdown: bd, score: newScore });
            showToast("success", `重新评分完成 · ${newScore} 分`);
          }}
          className="flex items-center justify-center gap-1 rounded-[10px] glass py-2 text-[12px] text-muted hover:text-1 hover:bg-[var(--bg-3)] transition"
        >
          重新评分
        </button>
        <button
          onClick={() => {
            toggleExport(candidate.id);
            router.push("/workspace/export");
          }}
          className="flex items-center justify-center gap-1 rounded-[10px] grad-primary py-2 text-[12px] font-medium text-[var(--bg-0)] transition hover:scale-[1.02]"
        >
          <Download className="h-3.5 w-3.5" />
          导出此条
        </button>
      </div>
    </div>
  );
}
