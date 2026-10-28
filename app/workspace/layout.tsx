"use client";

import { useRouter } from "next/navigation";
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
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              <h1 className="font-display text-[14px] sm:text-[22px] font-semibold leading-tight truncate min-w-0 flex-1">{project.name}</h1>
              <button
                onClick={onDelete}
                className="flex-shrink-0 h-5 w-5 sm:h-7 sm:w-7 flex items-center justify-center rounded-md text-dim hover:text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 transition"
                title="删除此项目"
              >
                <Trash2 className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
              </button>
            </div>
            <div className="mt-0.5 text-[9px] sm:text-[12px] text-dim num-mono truncate">
              {project.analysis?.bpm}BPM·{project.file.duration.toFixed(0)}s·{project.candidates.length}♪
            </div>
          </div>
          <nav className="flex items-center gap-0.5 glass rounded-[8px] sm:rounded-[12px] p-0.5 sm:p-1 shrink-0">
            {STAGES.map((s, i) => (
              <Link
                key={s.key}
                href={s.href}
                aria-label={s.label}
                className={
                  "flex items-center rounded-[6px] sm:rounded-[10px] px-1 sm:px-3 py-0.5 sm:py-1.5 text-[10px] sm:text-[12px] transition " +
                  "hover:text-1 hover:bg-[var(--bg-3)] text-muted"
                }
              >
                <s.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline ml-1 sm:ml-2">{s.label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <StageIndicator stages={project.stages} />
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {children}
      </motion.div>
    </AppShell>
  );
}
