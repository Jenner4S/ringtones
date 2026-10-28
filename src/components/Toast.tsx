"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertTriangle, Info, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Toast() {
  const toast = useStore((s) => s.toast);
  const dismiss = useStore((s) => s.dismissToast);

  return (
    <div className="pointer-events-none fixed right-6 top-20 z-[100] flex flex-col items-end gap-2">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            initial={{ opacity: 0, x: 20, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 16, y: -4 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "glass pointer-events-auto flex w-[320px] items-center gap-3 rounded-[12px] px-4 py-3 shadow-card"
            )}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
              style={{
                background:
                  toast.type === "success"
                    ? "rgba(46,230,168,0.18)"
                    : toast.type === "error"
                    ? "rgba(255,92,122,0.18)"
                    : "rgba(0,229,255,0.18)",
                color:
                  toast.type === "success"
                    ? "var(--accent-green)"
                    : toast.type === "error"
                    ? "var(--accent-red)"
                    : "var(--accent-cyan)",
              }}
            >
              {toast.type === "success" ? (
                <CheckCircle className="h-4 w-4" />
              ) : toast.type === "error" ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <Info className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0 flex-1 text-[13px] text-1">{toast.text}</div>
            <button
              onClick={dismiss}
              className="rounded-md p-1 text-dim hover:bg-[var(--bg-3)] hover:text-1"
              aria-label="关闭"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
