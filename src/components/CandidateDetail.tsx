"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SkipForward, Download, ArrowLeft, Play, Pause } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatTime, formatDuration, cn } from "@/lib/utils";
import { RadarChart } from "@/components/RadarChart";
import { WaveformCanvas } from "@/components/WaveformCanvas";
import { Badge } from "@/components/Badge";
import { QABadge } from "@/components/QABadge";
import { SeamView } from "@/components/SeamView";
import { ParamSlider } from "@/components/ParamSlider";
import { ScoreRing } from "@/components/ScoreRing";
import type { Candidate } from "@/lib/types";

export function CandidateDetail({
  candidate,
  peaks,
  duration,
}: {
  candidate: Candidate;
  peaks: number[];
  duration: number;
}) {
  const router = useRouter();
  const showToast = useStore((s) => s.showToast);
  const selectCandidate = useStore((s) => s.selectCandidate);
  const toggleExport = useStore((s) => s.toggleExport);
  const updateCandidate = useStore((s) => s.updateCandidate);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const favorites = useStore((s) => s.favorites);
  const inExport = useStore((s) => s.inExport);
  const project = useStore((s) => s.currentProject);
  const loopStrategy = candidate.loopStrategy;

  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const audioUrl = project?.file?.url ?? "";

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      if (!audio.src || audio.src !== audioUrl) audio.src = audioUrl;
      audio.currentTime = candidate.start;
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      if (audio.currentTime >= candidate.end) {
        audio.currentTime = candidate.start;
        void audio.play();
      }
    };
    const onPause = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("pause", onPause);
    };
  }, [candidate.start, candidate.end]);

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="glass rounded-[12px] sm:rounded-[14px] p-3 sm:p-4 shadow-card">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <button
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-1 hover:bg-[var(--bg-3)] transition"
            aria-label="返回列表"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <ScoreRing score={candidate.score} size={44} stroke={3} showLabel />
          <div className="min-w-0 flex-1">
            <div className="font-display text-[14px] sm:text-[16px] font-semibold truncate">
              #{String(candidate.index).padStart(2, "0")} · {candidate.segment}
            </div>
            <div className="mt-0.5 num-mono text-[10px] sm:text-[12px] text-dim">
              {formatTime(candidate.start)} → {formatTime(candidate.end)} · {formatDuration(candidate.duration)}
            </div>
          </div>
          <button
            onClick={togglePlay}
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full glass hover:scale-105 active:scale-95 transition"
            aria-label={playing ? "暂停" : "播放"}
          >
            {playing ? <Pause className="h-4 w-4 text-[var(--accent-cyan)]" /> : <Play className="h-4 w-4 text-[var(--accent-cyan)]" />}
          </button>
        </div>

        <div className="mb-3">
          <div className="h-[60px] sm:h-[80px]">
            <WaveformCanvas
              peaks={peaks}
              duration={duration}
              height={80}
              selectedStart={candidate.start}
              selectedEnd={candidate.end}
              progress={playing ? undefined : undefined}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={candidate.relaxed ? "amber" : "cyan"} dot>
            {candidate.relaxed ? "放宽" : "AUTO"}
          </Badge>
          <Badge variant="violet" dot>{candidate.anchorType}</Badge>
          <Badge variant="cyan" dot>{loopStrategy}</Badge>
          <QABadge qa={candidate.qa} />
          <Badge variant={candidate.loopQuality >= 0.85 ? "green" : "red"} dot>
            循环 {(candidate.loopQuality * 100).toFixed(0)}%
          </Badge>

          <div className="ml-auto flex items-center gap-1">
            {[
              { k: "off", label: "原始" },
              { k: "vocal", label: "人声" },
              { k: "instrumental", label: "伴奏" },
            ].map((m) => {
              const vm = candidate.vocalMode ?? "off";
              const active = vm === m.k;
              return (
                <button
                  key={m.k}
                  onClick={() => {
                    const next = (active ? "off" : m.k) as any;
                    updateCandidate(candidate.id, { vocalMode: next });
                    showToast("info", next === "off" ? "已恢复原始声像" : next === "vocal" ? "已切换为 · 人声聚焦" : "已切换为 · 伴奏纯净");
                  }}
                  className={cn(
                    "rounded-[8px] px-2.5 py-1 text-[11px] transition",
                    active
                      ? "bg-[rgba(0,229,255,0.14)] text-[var(--accent-cyan)] ring-1 ring-[rgba(0,229,255,0.35)]"
                      : "text-dim hover:text-1 hover:bg-[var(--bg-3)]"
                  )}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="glass rounded-[12px] sm:rounded-[14px] p-3 sm:p-4">
        <div className="text-[11px] text-dim mb-2">切点理由</div>
        <div className="text-[13px] sm:text-[14px] text-1 leading-relaxed">{candidate.reason}</div>
        <div className="mt-3 text-[11px] sm:text-[12px] text-dim num-mono">
          锚点 {candidate.anchorType} · 置信度 {(candidate.anchorConfidence * 100).toFixed(0)}%
        </div>
      </div>

      <div className="glass rounded-[12px] sm:rounded-[14px] p-3 sm:p-4">
        <div className="text-[11px] text-dim mb-2">评分雷达 · 8 维</div>
        <div className="flex justify-center">
          <RadarChart data={candidate.scoreBreakdown} size={220} />
        </div>
      </div>

      <div className="glass rounded-[12px] sm:rounded-[14px] p-3 sm:p-4">
        <div className="text-[11px] text-dim mb-3">参数微调</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      </div>

      <SeamView
        peaks={peaks}
        tailStart={candidate.start}
        tailEnd={candidate.end}
        duration={duration}
        seamQuality={candidate.loopQuality}
      />

      <div className="glass rounded-[12px] sm:rounded-[14px] p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] text-dim">QA 明细</div>
          <QABadge qa={candidate.qa} />
        </div>
        <ul className="space-y-1 text-[11px] sm:text-[12px] num-mono">
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => {
            selectCandidate(candidate.id);
            router.push("/workspace/editor");
          }}
          className="flex items-center justify-center gap-1.5 rounded-[10px] glass py-2.5 text-[12px] text-muted hover:text-1 hover:bg-[var(--bg-3)] transition"
        >
          <SkipForward className="h-3.5 w-3.5" />
          精修
        </button>
        <button
          onClick={() => {
            toggleFavorite(candidate.id);
          }}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-[10px] glass py-2.5 text-[12px] transition",
            favorites.includes(candidate.id)
              ? "text-[var(--accent-amber)] bg-[rgba(255,176,32,0.12)]"
              : "text-muted hover:text-1 hover:bg-[var(--bg-3)]"
          )}
        >
          {favorites.includes(candidate.id) ? "★ 已收藏" : "☆ 收藏"}
        </button>
        <button
          onClick={() => {
            const jitter = (v: number) => Math.max(0, Math.min(100, v + (Math.random() - 0.5) * 10));
            const bd = { ...candidate.scoreBreakdown };
            Object.keys(bd).forEach((k) => { bd[k] = jitter(bd[k] as number); });
            const values = Object.values(bd) as number[];
            const newScore = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
            updateCandidate(candidate.id, { scoreBreakdown: bd, score: newScore });
            showToast("success", `重新评分完成 · ${newScore} 分`);
          }}
          className="flex items-center justify-center gap-1.5 rounded-[10px] glass py-2.5 text-[12px] text-muted hover:text-1 hover:bg-[var(--bg-3)] transition"
        >
          重新评分
        </button>
        <button
          onClick={() => {
            toggleExport(candidate.id);
            showToast("success", inExport.includes(candidate.id) ? "已从导出列表移除" : "已加入导出列表");
          }}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-[10px] py-2.5 text-[12px] font-medium transition",
            inExport.includes(candidate.id)
              ? "glass text-[var(--accent-green)]"
              : "grad-primary text-[var(--bg-0)] hover:scale-[1.02]"
          )}
        >
          <Download className="h-3.5 w-3.5" />
          {inExport.includes(candidate.id) ? "已加入" : "加入导出"}
        </button>
      </div>

      <audio ref={audioRef} preload="auto" />
    </div>
  );
}
