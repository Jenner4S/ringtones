"use client";

import { Check, Loader2, AlertTriangle, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Stage } from "@/lib/types";

export function StageIndicator({ stages }: { stages: Stage[] }) {
  return (
    <div className="glass rounded-[14px] px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        {stages.map((s, i) => {
          const active = s.status === "running";
          const done = s.status === "done";
          const err = s.status === "error";
          return (
            <div key={s.key} className="flex flex-1 items-center gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border",
                    active && "border-[var(--accent-cyan)] bg-[rgba(0,229,255,0.12)]",
                    done && "border-[var(--accent-green)] bg-[rgba(46,230,168,0.12)]",
                    err && "border-[var(--accent-red)] bg-[rgba(255,92,122,0.12)]",
                    !active && !done && !err && "border-[var(--border-strong)] bg-[var(--bg-2)]"
                  )}
                >
                  {active && <Loader2 className="h-3 w-3 animate-spin" style={{ color: "var(--accent-cyan)" }} />}
                  {done && <Check className="h-3 w-3" style={{ color: "var(--accent-green)" }} />}
                  {err && <AlertTriangle className="h-3 w-3" style={{ color: "var(--accent-red)" }} />}
                  {!active && !done && !err && <CircleDot className="h-3 w-3 text-[var(--text-3)]" />}
                </div>
                <span
                  className={cn(
                    "hidden text-[12px] md:inline",
                    active && "neon-cyan font-medium",
                    done && "text-[var(--accent-green)]",
                    !active && !done && !err && "text-dim"
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < stages.length - 1 && (
                <div
                  className={cn(
                    "h-[2px] flex-1 rounded-full",
                    done ? "bg-[var(--accent-green)]" : "bg-[var(--border)]"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
