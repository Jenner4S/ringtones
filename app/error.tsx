"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
      <div className="glass rounded-[14px] p-8 text-center max-w-md">
        <div className="text-5xl mb-3">⚠️</div>
        <h2 className="text-lg font-semibold text-1 mb-2">出现意外错误</h2>
        <p className="text-sm text-muted mb-5 break-words">
          {error.message || "应用遇到了问题，我们已记录此错误。"}
        </p>
        <button
          onClick={reset}
          className="rounded-[10px] bg-primary/90 px-4 py-2 text-sm font-medium text-bg transition hover:bg-primary"
        >
          重试
        </button>
      </div>
    </div>
  );
}
