"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface WaveformCanvasProps {
  peaks: number[];
  duration: number;
  height?: number;
  className?: string;
  progress?: number;
  selectedStart?: number;
  selectedEnd?: number;
  segments?: Array<{ start: number; end: number; color: string }>;
  beats?: Array<{ time: number; isDownbeat?: boolean }>;
  vocalZones?: Array<{ start: number; end: number }>;
  candidates?: Array<{ start: number; end: number; id?: string }>;
  onSeek?: (time: number) => void;
  onSelect?: (start: number, end: number) => void;
  interactive?: boolean;
  showRuler?: boolean;
  showLoopMarker?: number;
  playing?: boolean;
}

export function WaveformCanvas({
  peaks,
  duration,
  height = 120,
  className,
  progress = 0,
  selectedStart,
  selectedEnd,
  segments,
  beats,
  vocalZones,
  candidates,
  onSeek,
  onSelect,
  interactive = true,
  showRuler = true,
  showLoopMarker,
  playing = false,
}: WaveformCanvasProps) {
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [dragging, setDragging] = useState<null | { startX: number; type: "seek" | "select" }>(null);

  const width = 1200;
  const round = (n: number) => Math.round(n * 100) / 100;
  const padTop = segments ? 16 : 0;
  const padBottom = vocalZones ? 8 : 0;
  const barAreaTop = padTop + 6;
  const barAreaBottom = height - padBottom - 6;
  const barAreaH = barAreaBottom - barAreaTop;
  const midY = barAreaTop + barAreaH / 2;

  const maxPeak = useMemo(() => Math.max(0.001, ...peaks), [peaks]);

  const barCount = Math.min(peaks.length, 600);
  const step = Math.max(1, Math.floor(peaks.length / barCount));

  const toTime = (x: number) => Math.max(0, Math.min(duration, (x / width) * duration));

  const bars = useMemo(() => {
    const out: Array<{ x: number; h: number; pct: number; idx: number; y: number; w: number }> = [];
    for (let i = 0; i < peaks.length; i += step) {
      const p = peaks[i] / maxPeak;
      const h = round(Math.max(2, p * barAreaH * 0.92));
      const x = round((i / peaks.length) * width);
      out.push({
        x,
        h,
        pct: i / peaks.length,
        idx: i,
        y: round(midY - h / 2),
        w: round(Math.max(1.2, width / (peaks.length / step) - 0.4)),
      });
    }
    return out;
  }, [peaks, step, maxPeak, barAreaH, midY]);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    setDragging({ startX: x, type: "select" });
    const t = toTime(x);
    if (onSeek) onSeek(t);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    setHoverX(x);
    if (dragging && onSelect) {
      const t = toTime(x);
      const st = toTime(dragging.startX);
      const [a, b] = st < t ? [st, t] : [t, st];
      onSelect(a, b);
    } else if (dragging && onSeek) {
      onSeek(toTime(x));
    }
  };

  const handlePointerUp = () => {
    setDragging(null);
  };

  const progressX = (progress / duration) * width;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("h-full w-full select-none", className)}
      style={{ cursor: interactive ? (dragging ? "ew-resize" : "crosshair") : "default" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        setHoverX(null);
        setDragging(null);
      }}
    >
      <defs>
        <linearGradient id="wave-unplayed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(107,112,128,0.9)" />
          <stop offset="100%" stopColor="rgba(107,112,128,0.5)" />
        </linearGradient>
        <linearGradient id="wave-played" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-cyan)" />
          <stop offset="100%" stopColor="var(--accent-violet)" />
        </linearGradient>
        <linearGradient id="wave-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--accent-cyan)" />
          <stop offset="100%" stopColor="var(--accent-violet)" />
        </linearGradient>
      </defs>

      {showRuler && (
        <g>
          {Array.from({ length: Math.ceil(duration / 10) }, (_, i) => {
            const t = i * 10;
            const x = (t / duration) * width;
            return (
              <g key={i}>
                <line x1={x} x2={x} y1={height - 10} y2={height} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                <text x={x + 2} y={height - 1} fontSize={9} fill="var(--text-3)" className="num-mono">
                  {String(Math.floor(t / 60)).padStart(2, "0")}:{String(t % 60).padStart(2, "0")}
                </text>
              </g>
            );
          })}
        </g>
      )}

      {segments && (
        <g>
          {segments.map((seg, i) => {
            const x1 = (seg.start / duration) * width;
            const x2 = (seg.end / duration) * width;
            const w = Math.max(1, x2 - x1);
            return <rect key={i} x={x1} y={0} width={w} height={padTop} fill={seg.color} opacity={0.3} />;
          })}
        </g>
      )}

      {vocalZones && (
        <g>
          {vocalZones.map((v, i) => {
            const x1 = (v.start / duration) * width;
            const x2 = (v.end / duration) * width;
            return (
              <rect
                key={i}
                x={x1}
                y={barAreaBottom}
                width={Math.max(1, x2 - x1)}
                height={padBottom}
                fill="var(--accent-red)"
                opacity={0.35}
              />
            );
          })}
        </g>
      )}

      {beats && (
        <g>
          {beats.map((b, i) => {
            if (b.time <= 0 || b.time >= duration) return null;
            const x = (b.time / duration) * width;
            const h = b.isDownbeat ? 10 : 5;
            return (
              <line
                key={i}
                x1={x}
                x2={x}
                y1={barAreaBottom - h}
                y2={barAreaBottom}
                stroke={b.isDownbeat ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.09)"}
                strokeWidth={1}
              />
            );
          })}
        </g>
      )}

      {candidates && (
        <g>
          {candidates.map((c, i) => {
            const x1 = (c.start / duration) * width;
            const x2 = (c.end / duration) * width;
            return (
              <rect
                key={i}
                x={x1}
                y={barAreaTop}
                width={Math.max(2, x2 - x1)}
                height={barAreaH}
                fill="var(--accent-cyan)"
                fillOpacity={0.06}
                stroke="var(--accent-cyan)"
                strokeOpacity={0.35}
                strokeWidth={1}
              />
            );
          })}
        </g>
      )}

      {bars.map((b, i) => {
        const bProgress = b.pct * duration;
        const isPlayed = bProgress <= progress;
        const selected =
          selectedStart !== undefined &&
          selectedEnd !== undefined &&
          bProgress >= selectedStart &&
          bProgress <= selectedEnd;
        const fill = isPlayed ? "url(#wave-played)" : selected ? "var(--accent-cyan)" : "url(#wave-unplayed)";
        return (
          <rect
            key={i}
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            rx={0.6}
            fill={fill}
            opacity={selected ? 0.95 : 1}
          />
        );
      })}

      {selectedStart !== undefined && selectedEnd !== undefined && (
        <g>
          <rect
            x={(selectedStart / duration) * width}
            y={barAreaTop}
            width={((selectedEnd - selectedStart) / duration) * width}
            height={barAreaH}
            fill="var(--accent-cyan)"
            fillOpacity={0.14}
          />
          <line x1={(selectedStart / duration) * width} x2={(selectedStart / duration) * width} y1={barAreaTop} y2={barAreaBottom} stroke="var(--accent-cyan)" strokeWidth={1.5} />
          <line x1={(selectedEnd / duration) * width} x2={(selectedEnd / duration) * width} y1={barAreaTop} y2={barAreaBottom} stroke="var(--accent-cyan)" strokeWidth={1.5} />
        </g>
      )}

      <motion.line
        x1={progressX}
        x2={progressX}
        y1={barAreaTop - 4}
        y2={barAreaBottom + 4}
        stroke="var(--accent-cyan)"
        strokeWidth={1.6}
        initial={false}
        animate={{ x1: progressX, x2: progressX }}
        transition={{ duration: 0.08 }}
      />

      {playing && (
        <motion.circle
          cx={progressX}
          cy={barAreaTop - 6}
          r={2.6}
          fill="var(--accent-cyan)"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
      )}

      {showLoopMarker !== undefined && showLoopMarker >= 0 && (
        <line
          x1={(showLoopMarker / duration) * width}
          x2={(showLoopMarker / duration) * width}
          y1={barAreaTop}
          y2={barAreaBottom}
          stroke="var(--accent-violet)"
          strokeWidth={1.2}
          strokeDasharray="4 4"
          opacity={0.7}
        />
      )}

      {hoverX !== null && !dragging && (
        <g pointerEvents="none">
          <line x1={hoverX} x2={hoverX} y1={barAreaTop} y2={barAreaBottom} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
          <text x={hoverX + 4} y={barAreaTop - 6} fontSize={10} fill="var(--text-1)" className="num-mono">
            {toTime(hoverX).toFixed(1)}s
          </text>
        </g>
      )}
    </svg>
  );
}
