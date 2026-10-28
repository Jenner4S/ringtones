"use client";

import { useRouter, usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { Toast } from "@/components/Toast";
import { StageIndicator } from "@/components/StageIndicator";
import Link from "next/link";
import { motion } from "framer-motion";
import { List, Scissors, Download, Activity, Trash2 } from "lucide-react";

const STAGES = [
  { key: "candidates", label: "候选列表", icon: List, href: "/workspace/candidates" },
  { key: "editor", label: "精修", icon: Scissors, href: "/workspace/editor" },
  { key: "export", label: "导出", icon: Download, href: "/workspace/export" },
];

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const project = useStore((s) => s.currentProject);
  const setProject = useStore((s) => s.setProject);
  const removeProject = useStore((s) => s.removeProject);
  const showToast = useStore((s) => s.showToast);

  if (!project) {
    return (
      <AppShell>
        <div className="flex h-[50vh] items-center justify-center text-muted">
          还没有项目 —— <Link href="/" className="text-[var(--accent-cyan)] hover:underline">去首页拖入一首歌</Link>
        </div>
      </AppShell>
    );
  }

  const onDelete = () => {
    if (!confirm(`确定删除「${project.name}」吗？此操作不可恢复`)) return;
    setProject(undefined);
    removeProject(project.id);
    showToast("success", "项目已删除");
    router.push("/");
  };

  return (
    <AppShell>
      <Toast />
      <div className="mb-2 sm:mb-4 lg:mb-6 flex flex-col gap-1.5 sm:gap-3 lg:gap-4">
        <div className="flex items-center gap-1 sm:gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[14px] sm:text-[22px] font-semibold leading-tight truncate">{project.name}</h1>
            <div className="mt-0.5 text-[9px] sm:text-[12px] text-dim num-mono truncate">
              {project.analysis?.bpm}BPM·{project.file.duration.toFixed(0)}s·{project.candidates.length}♪
            </div>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 glass rounded-[10px] sm:rounded-[12px] p-0.5 sm:p-1 shrink-0">
            <button
              onClick={onDelete}
              aria-label="删除此项目"
              title="删除此项目"
              className="flex items-center rounded-[8px] sm:rounded-[10px] px-1.5 sm:px-2 py-1.5 sm:py-1.5 text-dim hover:text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <div className="mx-0.5 h-4 w-px bg-[var(--border-strong)]/60" />
            {STAGES.map((s) => {
              const active = pathname?.startsWith(s.href);
              return (
                <Link
                  key={s.key}
                  href={s.href}
                  aria-label={s.label}
                  aria-current={active ? "page" : undefined}
                  className={
                    "flex items-center rounded-[8px] sm:rounded-[10px] " +
                    "px-2 sm:px-3 py-1.5 sm:py-1.5 text-[10px] sm:text-[12px] transition " +
                    (active
                      ? "bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)]"
                      : "text-muted hover:text-1 hover:bg-[var(--bg-3)]")
                  }
                >
                  <s.icon className="h-3.5 w-3.5" strokeWidth={active ? 2.4 : 2} />
                  <span className="hidden sm:inline ml-1.5 sm:ml-2">{s.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
        <StageIndicator stages={project.stages} />
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {children}
      </motion.div>
    </AppShell>
  );
}
