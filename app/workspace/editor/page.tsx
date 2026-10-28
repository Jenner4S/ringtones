"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  SkipBack,
  RotateCcw,
  Save,
  Download,
  GitCompare,
  Shuffle,
  Eye,
  ChevronLeft,
  FolderOpen,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn, formatTime, formatDuration } from "@/lib/utils";
import { WaveformCanvas } from "@/components/WaveformCanvas";
import { ParamSlider } from "@/components/ParamSlider";
import { RadarChart } from "@/components/RadarChart";
import { ScoreRing } from "@/components/ScoreRing";
import { Badge } from "@/components/Badge";
import { SeamView } from "@/components/SeamView";
import { useAudioUrlFallback } from "@/hooks/useAudioUrlFallback";
import { useAudioSegment } from "@/hooks/useAudioSegment";

export default function EditorPage() {
  const router = useRouter();
  const project = useStore((s) => s.currentProject);
  const selectedId = useStore((s) => s.selectedCandidateId);
  const showToast = useStore((s) => s.showToast);
  const setProject = useStore((s) => s.setProject);
  const updateCandidate = useStore((s) => s.updateCandidate);
  const toggleExport = useStore((s) => s.toggleExport);

  const selectedCandidate = project?.candidates.find((c) => c.id === selectedId) ?? project?.candidates[0];
  const [fadeIn, setFadeIn] = useState(selectedCandidate?.fadeInMs ?? 80);
  const [fadeOut, setFadeOut] = useState(selectedCandidate?.fadeOutMs ?? 800);
  const [inPoint, setInPoint] = useState(selectedCandidate?.start ?? 0);
  const [outPoint, setOutPoint] = useState(selectedCandidate?.end ?? 30);
  const [preset, setPreset] = useState<"natural" | "equal" | "linear">("natural");
  const [loopPreview, setLoopPreview] = useState(false);
  const [blind, setBlind] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [abToggle, setAbToggle] = useState(false);

  const userSnapshotRef = useRef<{ inPoint: number; outPoint: number; fadeIn: number; fadeOut: number } | null>(null);

  useAudioUrlFallback(project, setProject);

  const { audioRef, playhead, safePlay, safePause, seekTo } = useAudioSegment({
    url: project?.file?.url,
    showToast,
    onTimeUpdate: (t) => {
      if (t >= outPoint - 0.02) {
        if (loopPreview) {
          seekTo(inPoint);
          void safePlay();
        } else {
          safePause();
          setPlaying(false);
        }
      }
    },
    onEnded: () => {
      setPlaying(false);
    },
  });

  useEffect(() => {
    if (!selectedCandidate) return;
    setFadeIn(selectedCandidate.fadeInMs);
    setFadeOut(selectedCandidate.fadeOutMs);
    setInPoint(selectedCandidate.start);
    setOutPoint(selectedCandidate.end);
    setPlaying(false);
    setAbToggle(false);
    userSnapshotRef.current = null;
    seekTo(selectedCandidate.start);
  }, [selectedId, selectedCandidate?.id]);

  const togglePlay = useCallback(() => {
    if (playing) {
      safePause();
      setPlaying(false);
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.currentTime >= outPoint - 0.05 || audio.currentTime < inPoint - 0.05) {
      seekTo(inPoint);
    }
    safePlay().then((ok) => {
      if (ok) setPlaying(true);
    });
  }, [playing, inPoint, outPoint, safePlay, safePause, seekTo]);

  if (!project || !project.analysis || !selectedCandidate) {
    return (
      <div className="glass rounded-[14px] p-12 text-center text-muted">
        请先选择一个候选（去候选列表）
      </div>
    );
  }

  const duration = outPoint - inPoint;
  const agent = selectedCandidate;

  return (
    <div className="flex flex-col gap-4">
      <audio ref={audioRef} preload="auto" />
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/workspace/candidates")}
          className="flex items-center gap-1.5 text-[12px] text-dim hover:text-1 transition"
        >
          <ChevronLeft className="h-4 w-4" />
          返回候选列表
        </button>
        <button
          onClick={() => router.push("/workspace/export")}
          className="flex items-center gap-1.5 rounded-[10px] glass px-3 py-1.5 text-[12px] text-muted hover:text-1 hover:bg-[var(--bg-3)] transition"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          去导出
        </button>
      </div>
      <div className="glass rounded-[14px] p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] glass">
              <SkipBack className="h-4 w-4 text-[var(--accent-cyan)]" />
            </div>
            <div>
              <div className="font-display text-[15px] font-medium">
                精修 · 片段 #{selectedCandidate.index.toString().padStart(2, "0")}
              </div>
              <div className="text-[11px] text-dim num-mono">
                {formatTime(inPoint)} → {formatTime(outPoint)} · {formatDuration(duration)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBlind(!blind)}
              className={cn(
                "flex items-center gap-1 rounded-[10px] glass px-3 py-1.5 text-[12px] transition",
                blind && "bg-[rgba(0,229,255,0.14)] text-[var(--accent-cyan)]"
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              盲听
            </button>
            <button
              onClick={() => setLoopPreview(!loopPreview)}
              className={cn(
                "flex items-center gap-1 rounded-[10px] glass px-3 py-1.5 text-[12px] transition",
                loopPreview && "bg-[rgba(124,92,255,0.14)] text-[var(--accent-violet)]"
              )}
            >
              <Shuffle className="h-3.5 w-3.5" />
              循环 3 次
            </button>
            <button
              onClick={() => {
                const next = !abToggle;
                if (next) {
                  userSnapshotRef.current = { inPoint, outPoint, fadeIn, fadeOut };
                  setInPoint(agent.agentStart);
                  setOutPoint(agent.agentEnd);
                  showToast("info", "A/B → Agent 原始切点");
                } else {
                  const snap = userSnapshotRef.current;
                  if (snap) {
                    setInPoint(snap.inPoint);
                    setOutPoint(snap.outPoint);
                    setFadeIn(snap.fadeIn);
                    setFadeOut(snap.fadeOut);
                  }
                  showToast("info", "A/B → 你的编辑切点");
                }
                setAbToggle(next);
                setTimeout(() => togglePlay(), 100);
              }}
              className={cn(
                "flex items-center gap-1 rounded-[10px] glass px-3 py-1.5 text-[12px] transition",
                abToggle && "bg-[rgba(255,176,32,0.14)] text-[var(--accent-cyan)]"
              )}
            >
              <GitCompare className="h-3.5 w-3.5" />
              A/B 对比
            </button>
          </div>
        </div>

        <div className="h-[140px]">
          <WaveformCanvas
            peaks={project.analysis.waveformPeaks}
            duration={project.analysis.duration}
            height={140}
            segments={project.analysis.segments}
            beats={project.analysis.beats}
            vocalZones={project.analysis.vocalSafeZones}
            selectedStart={inPoint}
            selectedEnd={outPoint}
            showLoopMarker={outPoint}
            progress={playing ? playhead : undefined}
            playing={playing}
            onSelect={(a, b) => {
              setInPoint(a);
              setOutPoint(b);
            }}
          />
        </div>
      </div>

      <div className="glass rounded-[14px] p-4 shadow-card">
        <div className="mb-1 text-[11px] text-dim">双轨预览 · 上人声能量 · 下全曲波形</div>
        <div className="h-[80px] grid grid-rows-2 gap-2">
          <WaveformCanvas
            peaks={generateEnergyPeaks(project.analysis.waveformPeaks)}
            duration={project.analysis.duration}
            height={36}
            interactive={false}
            showRuler={false}
            selectedStart={inPoint}
            selectedEnd={outPoint}
          />
          <WaveformCanvas
            peaks={project.analysis.waveformPeaks}
            duration={project.analysis.duration}
            height={36}
            interactive={false}
            showRuler={false}
            selectedStart={inPoint}
            selectedEnd={outPoint}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="glass rounded-[14px] p-4 shadow-card">
          <div className="mb-4 text-[12px] text-muted font-medium">参数</div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-[11px] text-dim mb-1">入点 / 出点</div>
              <div className="num-mono text-[13px]">
                <span className="text-[var(--accent-cyan)]">{formatTime(inPoint)}</span>
                <span className="text-dim"> → </span>
                <span className="text-[var(--accent-violet)]">{formatTime(outPoint)}</span>
              </div>
              <div className="num-mono text-[11px] text-dim mt-1">
                时长 {formatDuration(duration)} · ≤ 29.99s ✓
              </div>
            </div>
          <div className="flex items-center justify-end gap-4">
              <div className="text-right">
                <div className="text-[11px] text-dim">锚点</div>
                <Badge variant="cyan">{selectedCandidate.anchorType}</Badge>
              </div>
              {!blind && <ScoreRing score={selectedCandidate.score} size={44} />}
              {blind && (
                <div className="h-11 w-11 rounded-full glass flex items-center justify-center">
                  <Eye className="h-4 w-4 text-muted" />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <ParamSlider label="淡入" unit="ms" value={fadeIn} min={30} max={300} step={10} onChange={setFadeIn} />
            <ParamSlider label="淡出" unit="ms" value={fadeOut} min={200} max={1500} step={50} onChange={setFadeOut} />
          </div>

          <div className="mb-2 text-[11px] text-dim">预设曲线</div>
          <div className="flex gap-1">
            {[
              { k: "natural", label: "自然" },
              { k: "equal", label: "等功率" },
              { k: "linear", label: "线性" },
            ].map((p) => (
              <button
                key={p.k}
                onClick={() => setPreset(p.k as any)}
                className={cn(
                  "rounded-[8px] px-3 py-1.5 text-[12px] transition",
                  preset === p.k ? "bg-[rgba(0,229,255,0.14)] text-[var(--accent-cyan)]" : "glass text-muted hover:text-1"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            <div className="text-[11px] text-dim mb-2">淡入淡出曲线</div>
            <FadeCurve inMs={fadeIn} outMs={fadeOut} totalMs={Math.max(100, duration * 1000)} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setFadeIn(agent.agentFadeInMs);
                setFadeOut(agent.agentFadeOutMs);
                showToast("info", "已重置为 Agent 原始参数");
              }}
              className="flex items-center justify-center gap-1 rounded-[10px] glass py-2 text-[12px] text-muted hover:text-1 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              重置
            </button>
            <button
              onClick={() => {
                if (!selectedId) return;
                updateCandidate(selectedId, { start: inPoint, end: outPoint, fadeInMs: fadeIn, fadeOutMs: fadeOut });
                showToast("success", "已保存当前编辑");
              }}
              className="flex items-center justify-center gap-1 rounded-[10px] glass py-2 text-[12px] hover:text-1 hover:bg-[var(--bg-3)] transition"
            >
              <Save className="h-3.5 w-3.5" />
              保存
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="glass rounded-[14px] p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[12px] text-muted font-medium">循环接缝</div>
              <button
                onClick={togglePlay}
                className="flex h-8 w-8 items-center justify-center rounded-full grad-primary"
              >
                {playing ? <Pause className="h-4 w-4 text-[var(--bg-0)]" /> : <Play className="h-4 w-4 text-[var(--bg-0)]" />}
              </button>
            </div>
            <SeamView
              peaks={project.analysis.waveformPeaks}
              tailStart={inPoint}
              tailEnd={outPoint}
              duration={project.analysis.duration}
              seamQuality={selectedCandidate.loopQuality}
            />
          </div>

          {!blind ? (
          <div className="glass rounded-[14px] p-4 shadow-card">
            <div className="mb-2 text-[12px] text-muted font-medium">评分明细</div>
            <div className="flex items-center gap-3">
              <RadarChart data={selectedCandidate.scoreBreakdown} size={190} />
              <div className="flex-1 text-[12px] text-muted leading-relaxed">
                <div className="mb-2">
                  综合评分 <span className="num-mono text-[var(--accent-cyan)] text-[18px] font-semibold">{selectedCandidate.score}</span>
                </div>
                <div className="text-dim">{selectedCandidate.reason}</div>
              </div>
            </div>
          </div>
          ) : (
          <div className="glass rounded-[14px] p-4 shadow-card flex flex-col items-center justify-center gap-2 text-dim">
            <Eye className="h-5 w-5" />
            <div className="text-[12px]">盲听模式 · 评分已隐藏</div>
            <div className="text-[11px] text-dim">凭耳朵决定，关闭后看分数</div>
          </div>
          )}
        </div>
      </div>

      <motion.div
        initial={false}
        className="sticky bottom-0 z-20 -mx-4 -mb-4 px-4 py-3 glass-strong flex items-center gap-3 shadow-card"
      >
        <button
          onClick={togglePlay}
          className="flex items-center gap-1.5 rounded-full h-11 px-4 glass-strong text-[12px] hover:bg-[var(--bg-3)] transition"
        >
          {playing ? <Pause className="h-4 w-4 text-[var(--accent-cyan)]" /> : <Play className="h-4 w-4 text-[var(--accent-cyan)]" />}
          <span>{playing ? "暂停" : "播放"}</span>
        </button>
        <div className="num-mono text-[12px] text-dim ml-2">
          {formatTime(inPoint)} <span className="text-dim">—</span> {formatTime(outPoint)}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => {
              setInPoint(agent.agentStart);
              setOutPoint(agent.agentEnd);
              setFadeIn(agent.agentFadeInMs);
              setFadeOut(agent.agentFadeOutMs);
              showToast("info", "已重置为 Agent 原始切点");
            }}
            className="flex items-center gap-1 rounded-[10px] glass px-3 py-2 text-[12px] text-muted hover:text-1 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            重置
          </button>
          <button
            onClick={() => {
              if (!selectedId) return;
              updateCandidate(selectedId, { start: inPoint, end: outPoint, fadeInMs: fadeIn, fadeOutMs: fadeOut });
              showToast("success", "已保存候选修改");
            }}
            className="flex items-center gap-1 rounded-[10px] glass px-3 py-2 text-[12px] text-muted hover:text-1 transition"
          >
            <Save className="h-3.5 w-3.5" />
            保存
          </button>
          <button
            onClick={() => {
              if (selectedId) toggleExport(selectedId);
              router.push("/workspace/export");
            }}
            className="flex items-center gap-1 rounded-[12px] grad-primary px-4 py-2 text-[12px] font-medium text-[var(--bg-0)] hover:scale-[1.02] transition"
          >
            <Download className="h-3.5 w-3.5" />
            导出
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function FadeCurve({ inMs, outMs, totalMs }: { inMs: number; outMs: number; totalMs: number }) {
  const W = 400;
  const H = 64;
  const inX = (inMs / totalMs) * W;
  const outStartX = W - (outMs / totalMs) * W;

  let d = `M 0 ${H}`;
  d += ` C ${inX * 0.4} ${H}, ${inX * 0.6} 0, ${inX} 0`;
  d += ` L ${outStartX} 0`;
  d += ` C ${W - (W - outStartX) * 0.6} 0, ${W - (W - outStartX) * 0.4} ${H}, ${W} ${H}`;
  d += ` L ${W} ${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-16 w-full">
      <defs>
        <linearGradient id="fade-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity="0.9" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.4)" />
          <stop offset="100%" stopColor="var(--accent-violet)" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={W} height={H} fill="rgba(0,229,255,0.04)" rx={6} />
      <path d={d} fill="url(#fade-grad)" opacity={0.7} />
      <line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
      <line x1={inX} x2={inX} y1={0} y2={H} stroke="var(--accent-cyan)" strokeWidth={1} strokeDasharray="2 2" opacity={0.7} />
      <line x1={outStartX} x2={outStartX} y1={0} y2={H} stroke="var(--accent-violet)" strokeWidth={1} strokeDasharray="2 2" opacity={0.7} />
      <line x1={W} x2={W} y1={0} y2={H} stroke="var(--accent-violet)" strokeWidth={1} strokeDasharray="2 2" opacity={0.7} />
    </svg>
  );
}

function generateEnergyPeaks(peaks: number[]) {
  return peaks.map((p) => Math.max(0, p * (0.5 + Math.sin(p * 11) * 0.3)));
}
