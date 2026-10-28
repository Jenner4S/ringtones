"use client";

import { cn } from "@/lib/utils";

type Variant = "default" | "cyan" | "violet" | "green" | "amber" | "red" | "muted";

export function Badge({
  children,
  variant = "default",
  className,
  dot,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
  dot?: boolean;
}) {
  const palette: Record<Variant, string> = {
    default:
      "bg-[var(--bg-3)] text-[var(--text-2)] border-[var(--border)]",
    cyan: "bg-[rgba(0,229,255,0.10)] text-[var(--accent-cyan)] border-[rgba(0,229,255,0.22)]",
    violet: "bg-[rgba(124,92,255,0.10)] text-[var(--accent-violet)] border-[rgba(124,92,255,0.22)]",
    green: "bg-[rgba(46,230,168,0.10)] text-[var(--accent-green)] border-[rgba(46,230,168,0.22)]",
    amber: "bg-[rgba(255,176,32,0.12)] text-[var(--accent-amber)] border-[rgba(255,176,32,0.28)]",
    red: "bg-[rgba(255,92,122,0.12)] text-[var(--accent-red)] border-[rgba(255,92,122,0.28)]",
    muted: "bg-transparent text-[var(--text-3)] border-[var(--border)]",
  };

  const dotColor: Record<Variant, string> = {
    default: "bg-[var(--text-3)]",
    cyan: "bg-[var(--accent-cyan)]",
    violet: "bg-[var(--accent-violet)]",
    green: "bg-[var(--accent-green)]",
    amber: "bg-[var(--accent-amber)]",
    red: "bg-[var(--accent-red)]",
    muted: "bg-[var(--text-3)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-none",
        palette[variant],
        className
      )}
    >
      {dot && (
        <span className={cn("inline-block h-1.5 w-1.5 rounded-full", dotColor[variant])} />
      )}
      {children}
    </span>
  );
}
