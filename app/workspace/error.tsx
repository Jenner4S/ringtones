"use client";

import { useEffect } from "react";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Workspace Error]", error);
  }, [error]);

  return (
    <div className="glass rounded-[14px] p-10 text-center">
      <div className="text-4xl mb-3">🖼️</div>
      <h2 className="text-base font-semibold text-1 mb-2">工作区出现错误</h2>
      <p className="text-sm text-muted mb-4 break-words">{error.message || "无法加载此工作区"}</p>
      <button
        onClick={reset}
        className="rounded-[10px] bg-primary/90 px-3 py-1.5 text-sm font-medium text-bg hover:bg-primary transition"
      >
        重试
      </button>
    </div>
  );
}
