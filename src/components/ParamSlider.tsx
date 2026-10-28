"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface ParamSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  unit?: string;
  onChange?: (v: number) => void;
  className?: string;
}

export function ParamSlider({ value, min, max, step = 1, label, unit, onChange, className }: ParamSliderProps) {
  const [focused, setFocused] = useState(false);
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={cn("group", className)}>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-[12px] text-muted">{label}</label>
        <span className="num-mono text-[11px] text-1 font-medium" style={{ color: "var(--accent-cyan)" }}>
          {value}
          {unit ?? ""}
        </span>
      </div>
      <div className="relative h-6">
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-[var(--bg-3)]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg,var(--accent-cyan),var(--accent-violet))",
            }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange?.(Number(e.target.value))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent"
          style={{
            WebkitAppearance: "none",
            accentColor: "transparent",
          }}
        />
        <div
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all",
            focused ? "scale-110" : "scale-100"
          )}
          style={{
            left: `${pct}%`,
            width: 16,
            height: 16,
            background: "var(--bg-2)",
            borderColor: "var(--accent-cyan)",
            boxShadow: focused ? "0 0 18px rgba(0,229,255,0.55)" : "0 0 8px rgba(0,229,255,0.25)",
          }}
        />
      </div>
    </div>
  );
}
