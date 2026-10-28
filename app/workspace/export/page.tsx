"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Folder,
  Check,
  X,
  FileText,
  Copy,
  Settings2,
  ListChecks,
  FileCode,
  ChevronLeft,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { formatTime } from "@/lib/utils";
import { cn, formatDuration } from "@/lib/utils";
import { Badge } from "@/components/Badge";
import { QABadge } from "@/components/QABadge";
import { WaveformCanvas } from "@/components/WaveformCanvas";

type ExportFormat = "m4a" | "m4r" | "both";

export default function ExportPage() {
  const router = useRouter();
  const project = useStore((s) => s.currentProject);
  const inExport = useStore((s) => s.inExport);
  const toggleExport = useStore((s) => s.toggleExport);
  const clearExport = useStore((s) => s.clearExport);
  const showToast = useStore((s) => s.showToast);

  const [format, setFormat] = useState<ExportFormat>("both");
  const [bitrate, setBitrate] = useState(192);
  const [naming, setNaming] = useState("{name}_ringtone_{index}_{start}-{end}");
  const [folder, setFolder] = useState("/Users/Jenner/Music/Ringtones");
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [done, setDone] = useState<string[]>([]);
  const [reportView, setReportView] = useState<"json" | "md">("md");
  const dirInputRef = useRef<HTMLInputElement>(null);

  const candidates = project?.candidates.filter((c) => inExport.includes(c.id)) ?? [];
  const passCandidates = project?.candidates.filter((c) => c.qa.status === "pass") ?? [];

  const pickFolder = async () => {
    const g = globalThis as any;
    if (typeof g.showDirectoryPicker === "function") {
      try {
        const dh = await g.showDirectoryPicker();
        setFolder(dh.name || "/");
        showToast("success", `已选择文件夹：${dh.name || "未知"}`);
      } catch (e: any) {
        if (e?.name !== "AbortError") showToast("error", "文件夹选择已取消");
      }
      return;
    }
    dirInputRef.current?.click();
  };

  const revealInFolder = async () => {
    try {
      await navigator.clipboard.writeText(folder);
      showToast("success", "文件夹路径已复制 · 在 Finder 中按 ⌘⇧G 粘贴前往");
    } catch {
      showToast("info", folder);
    }
  };

  const copyToIPhone = async () => {
    const candidatesStr = candidates
      .map((c, i) => `${i + 1}. ${formatTime(c.start)}→${formatTime(c.end)} · ${c.segment} · ${formatDuration(c.duration)}`)
      .join("\n");
    const payload = `铃声清单（${folder}）：\n${candidatesStr || "暂无"}\n\n在 Finder 中连接 iPhone → 信任设备 → 选中后拖入音乐库即可。`;
    try {
      await navigator.clipboard.writeText(payload);
      showToast("success", "铃声清单已复制到剪贴板");
    } catch {
      showToast("info", "已生成清单（复制失败）");
    }
  };

  useEffect(() => {
    if (!exporting) return;
    const id = setInterval(() => {
      setProgress((prev) => {
        const next = { ...prev };
        let allDone = true;
        candidates.forEach((c) => {
          const cur = next[c.id] ?? 0;
          const step = 6 + Math.random() * 14;
          next[c.id] = Math.min(100, cur + step);
          if (next[c.id] < 100) allDone = false;
          else if (!done.includes(c.id)) setDone((d) => [...d, c.id]);
        });
        if (allDone) {
          setExporting(false);
          showToast("success", `已导出 ${candidates.length} 个铃声`);
        }
        return next;
      });
    }, 280);
    return () => clearInterval(id);
  }, [exporting, candidates, done, showToast]);

  const startExport = () => {
    if (candidates.length === 0) {
      showToast("info", "请先选择要导出的候选");
      return;
    }
    setDone([]);
    setProgress({});
    setExporting(true);
    showToast("info", "开始渲染并导出");
  };

  if (!project) return null;

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => router.push("/workspace/candidates")}
        className="self-start flex items-center gap-1.5 text-[12px] text-dim hover:text-1 transition"
      >
        <ChevronLeft className="h-4 w-4" />
        返回候选列表
      </button>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-4">
        <div className="glass rounded-[14px] p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="font-display text-[15px] font-medium">待导出列表</div>
              <div className="text-[11px] text-dim num-mono">{candidates.length} 条已选 · {passCandidates.length} 条 PASS 可用</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const all = project.candidates.filter((c) => c.qa.status === "pass");
                  all.forEach((c) => {
                    if (!inExport.includes(c.id)) toggleExport(c.id);
                  });
                  showToast("success", `已加入 ${all.length} 条 PASS`);
                }}
                className="rounded-[10px] glass px-3 py-1.5 text-[12px] text-muted hover:text-1 transition"
              >
                加入全部 PASS
              </button>
              <button
                onClick={clearExport}
                className="rounded-[10px] glass px-3 py-1.5 text-[12px] text-muted hover:text-1 transition"
              >
                清空
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {candidates.length === 0 && (
              <div className="rounded-[12px] border border-dashed border-app p-8 text-center text-muted text-[12px]">
                还没有选择候选 · 去候选列表勾选吧
              </div>
            )}

            <AnimatePresence initial={false}>
              {candidates.map((c, i) => {
                const p = progress[c.id] ?? 0;
                const finished = done.includes(c.id);
                return (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="glass rounded-[12px] p-3 flex items-center gap-3 overflow-hidden"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] glass num-mono text-[11px] text-muted">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-display text-[13px] font-medium truncate">
                          {project.name.replace(/\.[^.]+$/, "")}_ringtone_{String(i + 1).padStart(2, "0")}
                        </div>
                        <QABadge qa={c.qa} />
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] num-mono text-dim">
                        <span>{formatDuration(c.duration)}</span>
                        <span>·</span>
                        <span>{c.qa.loudnessLUFS.toFixed(1)} LUFS</span>
                        <span>·</span>
                        <span>TP {c.qa.truePeakDBTP.toFixed(1)} dBTP</span>
                      </div>
                      {exporting && (
                        <div className="mt-2 h-1 rounded-full bg-[var(--bg-3)] overflow-hidden">
                          <motion.div
                            className="h-full grad-primary rounded-full"
                            animate={{ width: `${p}%` }}
                            transition={{ duration: 0.18 }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {finished && (
                        <motion.div
                          initial={{ scale: 0.5 }}
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.4 }}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(46,230,168,0.18)]"
                        >
                          <Check className="h-3.5 w-3.5 text-[var(--accent-green)]" />
                        </motion.div>
                      )}
                      <button
                        onClick={() => toggleExport(c.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-full glass text-muted hover:text-1 transition"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {candidates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-[14px] p-4 shadow-card"
          >
            <div className="flex items-center gap-2 mb-3">
              <ListChecks className="h-3.5 w-3.5 text-[var(--accent-cyan)]" />
              <div className="font-display text-[13px] font-medium">QA 报告</div>
            </div>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setReportView("md")}
                className={cn(
                  "flex items-center gap-1 rounded-[8px] glass px-3 py-1 text-[11px] transition",
                  reportView === "md" && "bg-[rgba(0,229,255,0.14)] text-[var(--accent-cyan)]"
                )}
              >
                <FileText className="h-3 w-3" /> Markdown
              </button>
              <button
                onClick={() => setReportView("json")}
                className={cn(
                  "flex items-center gap-1 rounded-[8px] glass px-3 py-1 text-[11px] transition",
                  reportView === "json" && "bg-[rgba(0,229,255,0.14)] text-[var(--accent-cyan)]"
                )}
              >
                <FileCode className="h-3 w-3" /> JSON
              </button>
            </div>
            {reportView === "md" ? (
              <pre className="rounded-[10px] bg-[var(--bg-1)] border border-app p-4 text-[11px] num-mono text-muted overflow-x-auto whitespace-pre-wrap">
{`# RingtoneMaster Report — ${project.name}
- 总候选：${project.candidates.length}
- PASS：${project.candidates.filter((c) => c.qa.status === "pass").length}
- 平均分：${Math.round(project.candidates.reduce((s, c) => s + c.score, 0) / project.candidates.length)}
- BPM：${project.analysis?.bpm}
- 响度目标：-16 LUFS

## Top 3
${project.candidates.slice(0, 3).map((c, i) => `${i + 1}. \`${formatTime(c.start)} → ${formatTime(c.end)}\` — ${c.segment} · 评分 ${c.score} · ${c.qa.status.toUpperCase()}`).join("\n")}

## 失败模式 Top 3
- 循环接缝爆音 × 2
- 响度偏离目标 × 1
- 时长超限 × 0`}
              </pre>
            ) : (
              <pre className="rounded-[10px] bg-[var(--bg-1)] border border-app p-4 text-[11px] num-mono text-muted overflow-x-auto">
                {JSON.stringify(
                  {
                    project: project.name,
                    bpm: project.analysis?.bpm,
                    candidates: project.candidates.slice(0, 3).map((c) => ({
                      id: c.id,
                      score: c.score,
                      qa: c.qa.status,
                      duration: c.duration,
                    })),
                  },
                  null,
                  2
                )}
              </pre>
            )}
          </motion.div>
        )}
      </div>

      <div className="flex flex-col gap-4 h-fit">
        <div className="glass rounded-[14px] p-4 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="h-3.5 w-3.5 text-[var(--accent-cyan)]" />
            <div className="font-display text-[13px] font-medium">导出设置</div>
          </div>

          <div className="space-y-4 text-[12px]">
            <div>
              <div className="text-dim mb-1.5">格式</div>
              <div className="grid grid-cols-3 gap-1">
                {(["m4a", "m4r", "both"] as ExportFormat[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={cn(
                      "rounded-[8px] glass py-2 transition text-[11px] uppercase num-mono",
                      format === f && "bg-[rgba(0,229,255,0.14)] text-[var(--accent-cyan)]"
                    )}
                  >
                    {f === "both" ? "M4A + M4R" : f}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-dim mb-1.5">码率 · {bitrate} kbps AAC</div>
              <div className="grid grid-cols-4 gap-1">
                {[128, 160, 192, 256].map((b) => (
                  <button
                    key={b}
                    onClick={() => setBitrate(b)}
                    className={cn(
                      "rounded-[8px] glass py-1.5 transition num-mono text-[11px]",
                      bitrate === b && "bg-[rgba(0,229,255,0.14)] text-[var(--accent-cyan)]"
                    )}
                  >
                    {b}k
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-dim mb-1.5">命名规则</div>
              <input
                value={naming}
                onChange={(e) => setNaming(e.target.value)}
                className="w-full rounded-[10px] border border-app bg-[var(--bg-1)] px-3 py-2 text-[11px] num-mono text-1 focus:outline-none focus:border-[var(--accent-cyan)]"
              />
            </div>

            <div>
              <div className="text-dim mb-1.5 flex items-center gap-1.5">
                <Folder className="h-3 w-3" /> 目标文件夹
              </div>
              <div className="flex items-center gap-2 rounded-[10px] border border-app bg-[var(--bg-1)] px-3 py-2">
                <input
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  className="flex-1 bg-transparent num-mono text-[11px] text-muted focus:outline-none"
                  placeholder="/path/to/ringtones"
                />
                <button
                  onClick={pickFolder}
                  className="rounded-[6px] glass px-2 py-1 text-[10px]"
                >
                  选择
                </button>
                <input
                  ref={dirInputRef}
                  type="file"
                  className="hidden"
                  {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      const first = files[0];
                      const parts = first.webkitRelativePath?.split("/") ?? [];
                      const name = parts[0] || folder;
                      setFolder(name);
                      showToast("success", `已选择文件夹：${name}（${files.length} 个文件）`);
                    }
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={startExport}
          disabled={exporting || candidates.length === 0}
          className={cn(
            "flex items-center justify-center gap-2 rounded-[14px] grad-primary h-12 font-display text-[14px] font-semibold text-[var(--bg-0)] shadow-card",
            (exporting || candidates.length === 0) && "opacity-50 cursor-not-allowed"
          )}
        >
          <Download className="h-4 w-4" />
          {exporting ? `导出中 ${Object.values(progress).length > 0 ? Math.round(Object.values(progress).reduce((a, b) => a + b, 0) / Object.values(progress).length) : 0}%` : `导出 ${candidates.length} 个铃声`}
        </motion.button>

        {done.length > 0 && !exporting && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-[14px] p-3 flex flex-col gap-2"
          >
            <button
              onClick={revealInFolder}
              className="flex items-center gap-2 rounded-[10px] glass px-3 py-2 text-[12px] text-muted hover:text-1 transition"
            >
              <Folder className="h-3.5 w-3.5 text-[var(--accent-cyan)]" />
              在文件夹中显示
            </button>
            <button
              onClick={copyToIPhone}
              className="flex items-center gap-2 rounded-[10px] glass px-3 py-2 text-[12px] text-muted hover:text-1 transition"
            >
              <Copy className="h-3.5 w-3.5 text-[var(--accent-violet)]" />
              复制到 iPhone
            </button>
          </motion.div>
        )}
      </div>
      </div>
    </div>
  );
}
