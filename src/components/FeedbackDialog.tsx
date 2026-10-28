"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquarePlus, X, Send, Smile, Bug, Lightbulb, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

type FeedbackType = "feature" | "bug" | "experience" | "other";

const FEEDBACK_TYPES: { k: FeedbackType; label: string; icon: typeof Lightbulb; color: string }[] = [
  { k: "feature", label: "功能建议", icon: Lightbulb, color: "text-[var(--accent-violet)]" },
  { k: "bug", label: "Bug 报告", icon: Bug, color: "text-[var(--accent-red)]" },
  { k: "experience", label: "体验问题", icon: Smile, color: "text-[var(--accent-amber)]" },
  { k: "other", label: "其他", icon: Info, color: "text-muted" },
];

export function FeedbackDialog({ floating = false }: { floating?: boolean }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("feature");
  const [content, setContent] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const showToast = useStore((s) => s.showToast);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("ringtone-master-feedback");
    if (stored) {
      try {
        const d = JSON.parse(stored);
        if (d.email) setEmail(d.email);
      } catch {}
    }
  }, []);

  const submit = () => {
    if (!content.trim()) {
      showToast("error", "请填写反馈内容");
      return;
    }
    const feedback = {
      type,
      content: content.trim(),
      email: email.trim() || undefined,
      platform: typeof navigator !== "undefined" ? navigator.platform : "unknown",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      version: "4.0",
      createdAt: new Date().toISOString(),
    };

    try {
      const key = "ringtone-master-feedback-list";
      const list = JSON.parse(localStorage.getItem(key) || "[]");
      list.unshift(feedback);
      localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
      if (email) localStorage.setItem("ringtone-master-feedback", JSON.stringify({ email }));
    } catch {}

    setSubmitted(true);
    showToast("success", "感谢你的反馈！已提交");
    setTimeout(() => {
      setOpen(false);
      setContent("");
      setSubmitted(false);
    }, 1600);
  };

  if (floating) {
    return (
      <>
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full grad-primary shadow-lg"
          aria-label="反馈"
        >
          <MessageSquarePlus className="h-5 w-5 text-[var(--bg-0)]" />
        </motion.button>
        <AnimatePresence>
          {open && <FeedbackPanel onClose={() => setOpen(false)} />}
        </AnimatePresence>
      </>
    );
  }

  return (
    <AnimatePresence>
      {open ? (
        <FeedbackPanel onClose={() => setOpen(false)} />
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="rounded-[10px] glass px-4 py-2 text-[12px] text-muted hover:text-1 transition flex items-center gap-1.5"
        >
          <MessageSquarePlus className="h-3.5 w-3.5 text-[var(--accent-cyan)]" />
          提交反馈 / 意见
        </button>
      )}
    </AnimatePresence>
  );

  function FeedbackPanel({ onClose }: { onClose: () => void }) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="glass rounded-[16px] p-5 w-full max-w-md shadow-card"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="font-display text-[15px] font-semibold">提交反馈</div>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full glass text-muted hover:text-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-10 text-center"
            >
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(46,230,168,0.15)]">
                <Send className="h-6 w-6 text-[var(--accent-green)]" />
              </div>
              <div className="font-display text-[14px] font-medium">反馈已收到！</div>
              <div className="text-[12px] text-dim mt-1">感谢你帮助 RingtoneMaster 变得更好</div>
            </motion.div>
          ) : (
            <>
              <div className="mb-3 text-[12px] text-muted">选择反馈类型</div>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {FEEDBACK_TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = type === t.k;
                  return (
                    <button
                      key={t.k}
                      onClick={() => setType(t.k)}
                      className={cn(
                        "rounded-[10px] py-2 flex flex-col items-center gap-1 transition",
                        active ? "bg-[rgba(0,229,255,0.14)] text-[var(--accent-cyan)]" : "glass text-muted hover:text-1"
                      )}
                    >
                      <Icon className={cn("h-4 w-4", active && t.color)} />
                      <span className="text-[11px]">{t.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mb-2 text-[12px] text-muted">描述你的想法</div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder="比如：希望支持批量导入多个音频..."
                className="w-full rounded-[10px] border border-app bg-[var(--bg-1)] px-3 py-2 text-[13px] text-1 placeholder:text-dim resize-none focus:outline-none focus:border-[var(--accent-cyan)]"
              />

              <div className="mb-2 mt-3 text-[12px] text-muted">邮箱（可选，用于跟进）</div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-[10px] border border-app bg-[var(--bg-1)] px-3 py-2 text-[13px] text-1 placeholder:text-dim focus:outline-none focus:border-[var(--accent-cyan)]"
              />

              <div className="mt-4 flex items-center justify-between">
                <div className="text-[11px] text-dim">平台：{typeof navigator !== "undefined" ? navigator.platform : "unknown"}</div>
                <button
                  onClick={submit}
                  className="flex items-center gap-1.5 rounded-[10px] grad-primary px-4 py-2 text-[12px] font-medium text-[var(--bg-0)] hover:scale-[1.02] transition"
                >
                  <Send className="h-3.5 w-3.5" />
                  提交
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    );
  }
}
