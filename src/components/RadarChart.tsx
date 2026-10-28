"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RadarChartProps {
  data: Record<string, number>;
  labels?: string[];
  size?: number;
  className?: string;
  compact?: boolean;
}

const AXIS_LABELS_FULL = [
  ["integrity", "完整性"],
  ["recognizability", "识别度"],
  ["opening", "开头"],
  ["ending", "结尾"],
  ["loop", "循环"],
  ["vocal", "人声"],
  ["energy", "能量"],
  ["technical", "技术"],
] as const;

const AXIS_LABELS_COMPACT = [
  ["integrity", "完整"],
  ["recognizability", "识别"],
  ["loop", "循环"],
  ["energy", "能量"],
] as const;

export function RadarChart({ data, labels, size = 220, className, compact = false }: RadarChartProps) {
  const axes = (compact ? AXIS_LABELS_COMPACT : AXIS_LABELS_FULL).map(([k, l]) => ({ key: k, label: l }));
  const n = axes.length;
  const levels = 4;

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const point = (i: number, v: number) => {
    const a = angle(i);
    const r = (v / 100) * radius;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
  };

  const dataPoints = axes.map((ax, i) => point(i, Math.min(100, Math.max(0, data[ax.key] ?? 0))));
  const pathD = dataPoints.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ") + "Z";

  const labelOffset = compact ? 20 : 18;
  const fontSize = compact ? 11 : 10.5;

  return (
    <div className={cn("relative w-full max-w-full aspect-square", className)}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
        {Array.from({ length: levels }, (_, li) => {
          const r = (radius * (li + 1)) / levels;
          const pts = axes.map((_, i) => {
            const a = angle(i);
            return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
          });
          return (
            <polygon
              key={li}
              points={pts.join(" ")}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
          );
        })}
        {axes.map((_, i) => {
          const a = angle(i);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={cx + Math.cos(a) * radius}
              y2={cy + Math.sin(a) * radius}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
          );
        })}
        <motion.path
          d={pathD}
          fill="url(#radar-grad)"
          fillOpacity={0.28}
          stroke="url(#radar-stroke)"
          strokeWidth={1.6}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
        />
        <defs>
          <linearGradient id="radar-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent-cyan)" />
            <stop offset="100%" stopColor="var(--accent-violet)" />
          </linearGradient>
          <linearGradient id="radar-stroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent-cyan)" />
            <stop offset="100%" stopColor="var(--accent-violet)" />
          </linearGradient>
        </defs>
        {axes.map((ax, i) => {
          const a = angle(i);
          const lx = cx + Math.cos(a) * (radius + labelOffset);
          const ly = cy + Math.sin(a) * (radius + labelOffset);
          const v = Math.round(Math.min(100, Math.max(0, data[ax.key] ?? 0)));
          return (
            <g key={ax.key}>
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                className="num-mono"
                fill="var(--text-2)"
                fontSize={fontSize}
              >
                {v}
              </text>
              <text
                x={lx}
                y={ly + (compact ? 11 : 10)}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted"
                fontSize={compact ? 9 : 8.5}
              >
                {ax.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
