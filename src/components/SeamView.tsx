"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface SeamViewProps {
  peaks: number[];
  tailStart: number;
  tailEnd: number;
  duration: number;
  overlap?: number;
  className?: string;
  seamQuality?: number;
}

export function SeamView({
  peaks,
  tailStart,
  tailEnd,
  duration,
  overlap = 0.3,
  className,
  seamQuality = 0.85,
}: SeamViewProps) {
  const W = 480;
  const H = 96;

  const pair = useMemo(() => {
    const winSec = overlap;
    const tailStartT = tailEnd - winSec;
    const headEndT = winSec;
    const peakIdx = (t: number) => Math.min(peaks.length - 1, Math.floor((t / duration) * peaks.length));

    const tail = peaks.slice(peakIdx(tailStartT), peakIdx(tailEnd));
    const head = peaks.slice(peakIdx(0), peakIdx(headEndT));
    const n = Math.min(tail.length, head.length);
    return { tail: tail.slice(0, n), head: head.slice(0, n), n };
  }, [peaks, tailEnd, overlap, duration]);

  const toPath = (arr: number[], yOff: number, amp: number) => {
    const step = W / Math.max(1, arr.length);
    let d = `M 0 ${yOff}`;
    arr.forEach((v, i) => {
      const x = i * step;
      const h = Math.max(2, v * amp * H);
      d += ` L ${x} ${yOff - h}`;
    });
    arr.forEach((v, i) => {
      const x = (arr.length - i - 1) * step;
      const h = Math.max(2, v * amp * H);
      d += ` L ${x} ${yOff + h}`;
    });
    return d + " Z";
  };

  const mid = H / 2;
  const amp = 0.38;

  const fail = seamQuality < 0.7;
  const qualityColor = fail ? "var(--accent-red)" : seamQuality < 0.8 ? "var(--accent-amber)" : "var(--accent-green)";

  return (
    <div className={cn("glass rounded-[12px] p-3", className)}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] text-dim">循环接缝 · 尾部 300ms ↔ 开头 300ms</div>
        <div className="num-mono text-[11px]" style={{ color: qualityColor }}>
          相似度 {(seamQuality * 100).toFixed(1)}% · {fail ? "⚠ 可听见爆音" : "✓ 丝滑"}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-20 w-full">
        <defs>
          <linearGradient id="seam-tail" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="seam-head" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--accent-violet)" stopOpacity="0.1" />
            <stop offset="100%" stopColor="var(--accent-violet)" stopOpacity="0.8" />
          </linearGradient>
          <pattern id="xfade-pat" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill="rgba(0,229,255,0.05)" />
            <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(0,229,255,0.18)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect x={0} y={0} width={W} height={H} fill="pattern:url(#xfade-pat)" />
        <path d={toPath(pair.tail, mid, amp)} fill="url(#seam-tail)" opacity={0.8} />
        <path d={toPath(pair.head, mid, amp)} fill="url(#seam-head)" opacity={0.8} />
        <line x1={W / 2} x2={W / 2} y1={0} y2={H} stroke={fail ? "var(--accent-red)" : "var(--accent-cyan)"} strokeWidth={1.4} strokeDasharray="4 3" />
        <line x1={0} x2={W} y1={mid} y2={mid} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      </svg>
      <div className="mt-1 flex items-center justify-between text-[10px] text-dim num-mono">
        <span style={{ color: "var(--accent-cyan)" }}>● CROSSFADE IN {((tailEnd - tailStart) * 1000).toFixed(0)}ms</span>
        <span>● {((W / 2 / W) * 600).toFixed(0)}ms 重叠</span>
        <span style={{ color: "var(--accent-violet)" }}>● CROSSFADE OUT</span>
      </div>
    </div>
  );
}
