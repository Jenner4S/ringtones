"use client";

import { cn } from "@/lib/utils";
import type { QaResult } from "@/lib/types";

export function QABadge({ qa, className }: { qa: QaResult; className?: string }) {
  const isPass = qa.status === "pass";
  const isFail = qa.status === "fail";
  const isPending = qa.status === "pending";

  const palette = isPass
    ? { bg: "rgba(46,230,168,0.12)", fg: "var(--accent-green)", border: "rgba(46,230,168,0.28)" }
    : isFail
    ? { bg: "rgba(255,92,122,0.12)", fg: "var(--accent-red)", border: "rgba(255,92,122,0.28)" }
    : { bg: "rgba(255,176,32,0.14)", fg: "var(--accent-amber)", border: "rgba(255,176,32,0.3)" };

  const label = isPass ? "QA · PASS" : isFail ? "QA · FAIL" : "QA · PENDING";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium num-mono",
        className
      )}
      style={{ background: palette.bg, color: palette.fg, borderColor: palette.border }}
      title={qa.reasons.join(" · ")}
    >
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 rounded-full",
          isPending && "animate-pulse"
        )}
        style={{ background: palette.fg }}
      />
      {label}
    </span>
  );
}
