"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Music2,
  Video,
  Zap,
  GitBranch,
  Volume2,
  FileAudio2,
  ArrowRight,
  PlayCircle,
  Sparkles,
  Loader2,
  Plus,
  X,
  Link2,
  Globe,
  ClipboardPaste,
  Keyboard,
  Trash2,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { formatTime, cn } from "@/lib/utils";
import { WaveformCanvas } from "@/components/WaveformCanvas";
import { AppShell } from "@/components/AppShell";
import { Toast } from "@/components/Toast";
import { createMockProject } from "@/lib/mock";
import { generateTestToneUrl } from "@/lib/testtone";
import {
  extractAudio,
  extractFromURL,
  extractFromClipboard,
  detectSourceKind,
  guessKindFromUrl,
  revokeExtractUrl,
  type ExtractResult,
} from "@/lib/extractor";
import Link from "next/link";
import { useRouter } from "next/navigation";

const FEATURE_TAGS = [
  { icon: Sparkles, text: "智能选段" },
  { icon: GitBranch, text: "循环接缝优化" },
  { icon: Volume2, text: "响度统一 -16 LUFS" },
  { icon: FileAudio2, text: "AAC 192k" },
];

type ExtractionSource = "file" | "url" | "clipboard";

type FileState = {
  name: string;
  duration: number;
  size: number;
  format: string;
  sourceKind: "audio" | "video";
  sourceFormat: string;
  sourceName: string;
  extractionSource: ExtractionSource;
  sourceHint?: string;
};

type ExtractingState = {
  fileName: string;
  pct: number;
  stage: string;
  source: ExtractionSource;
  sourceHint?: string;
};

const URL_REGEX = /^https?:\/\/.+\.(mp3|m4a|wav|flac|aac|ogg|opus|webm|mp4|mov|mkv|avi|wmv|flv|m4v|mpg|mpeg|ts|3gp)(\?.*)?$/i;

export default function HomePage() {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<FileState | null>(null);
  const [extracting, setExtracting] = useState<ExtractingState | null>(null);
  const [urlPanelOpen, setUrlPanelOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlHoverKind, setUrlHoverKind] = useState<"audio" | "video" | null>(null);
  const extractedUrlRef = useRef<string | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const showToast = useStore((s) => s.showToast);
  const setProject = useStore((s) => s.setProject);
  const router = useRouter();

  const startExtraction = useCallback(
    async (source: ExtractionSource, payload: File | string | Blob | { url: string }) => {
      const cleanupPrev = () => {
        if (extractedUrlRef.current) {
          revokeExtractUrl(extractedUrlRef.current);
          extractedUrlRef.current = null;
        }
      };

      let result: ExtractResult;
      let stateName = "";
      let sourceHint: string | undefined;

      cleanupPrev();
      setFile(null);

      try {
        if (source === "file") {
          const f = payload as File;
          const kind = detectSourceKind(f);
          if (!kind) { showToast("error", "不识别的文件格式"); return; }
          stateName = f.name;
          setExtracting({ fileName: stateName, pct: 0, stage: "准备中…", source });
          result = await extractAudio(f, { onProgress: (p, s) => setExtracting((c) => (c ? { ...c, pct: p, stage: s } : c)) });
        } else if (source === "url") {
          const url = typeof payload === "string" ? payload : (payload as { url: string }).url;
          const kind = guessKindFromUrl(url);
          if (!kind) { showToast("error", "URL 未识别出格式后缀，需 .mp3/.mp4/.mov 等"); return; }
          stateName = url.split("/").pop() || url.slice(0, 40);
          sourceHint = url.slice(0, 60) + (url.length > 60 ? "…" : "");
          setExtracting({ fileName: stateName, pct: 0, stage: "解析 URL…", source, sourceHint });
          result = await extractFromURL(url, { onProgress: (p, s) => setExtracting((c) => (c ? { ...c, pct: Number(p) || p, stage: s } : c)) });
        } else {
          const f = payload as File | Blob;
          const kind = detectSourceKind(f instanceof File ? f : { name: "clipboard.bin", type: f.type });
          if (!kind) { showToast("error", "剪贴板内容不是音视频文件"); return; }
          stateName = f instanceof File ? f.name || "clipboard_" + Date.now() : "clipboard_" + Date.now();
          sourceHint = "Cmd/Ctrl + V";
          setExtracting({ fileName: stateName, pct: 0, stage: "处理剪贴板…", source, sourceHint });
          result = await extractFromClipboard(f, stateName, { onProgress: (p, s) => setExtracting((c) => (c ? { ...c, pct: p, stage: s } : c)) });
        }

        extractedUrlRef.current = result.audioUrl;
        setFile({
          name: stateName.replace(/\.[^.]+$/, "") + (result.sourceKind === "video" ? "（视频）" : ""),
          duration: result.duration,
          size: source === "file" ? (payload as File).size : 0,
          format: result.format,
          sourceKind: result.sourceKind,
          sourceFormat: result.sourceFormat,
          sourceName: result.sourceName,
          extractionSource: source,
          sourceHint,
        });
        setExtracting(null);
        if (source === "url") showToast("success", `已从 URL 下载并提取 ${result.format}`);
        else if (source === "clipboard") showToast("success", `剪贴板文件已加载 · ${result.format}`);
      } catch (e: any) {
        setExtracting(null);
        showToast("error", e?.message || "处理失败，请重试");
      }
    },
    [showToast]
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const f = Array.from(files)[0];
      if (!f) return;
      startExtraction("file", f);
    },
    [startExtraction]
  );

  const submitUrl = useCallback(() => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!URL_REGEX.test(trimmed)) {
      showToast("error", "URL 需包含音视频后缀（.mp3/.mp4/.mov 等）");
      return;
    }
    setUrlPanelOpen(false);
    setUrlInput("");
    startExtraction("url", trimmed);
  }, [urlInput, showToast, startExtraction]);

  const startAnalysis = () => {
    if (!extractedUrlRef.current) {
      showToast("error", "请先加载音视频文件");
      return;
    }
    const p = createMockProject();
    if (file) {
      p.name = file.name.replace(/\.[^.]+$/, "");
      p.file.name = file.sourceName;
      p.file.duration = file.duration;
      p.file.format = file.format;
      p.file.sourceKind = file.sourceKind;
      p.file.sourceFormat = file.sourceFormat;
      p.file.sourceName = file.sourceName;
    }
    p.file.url = extractedUrlRef.current;
    setProject(p);
    showToast("success", "分析完成 · 10 个候选已就绪");
    setTimeout(() => router.push("/workspace/candidates"), 600);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (urlPanelOpen) setUrlPanelOpen(false);
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== "v") return;
      setTimeout(() => {
        const cd = (e as any).clipboardData;
        if (!cd) return;
        for (let i = 0; i < cd.items.length; i++) {
          const it = cd.items[i];
          if (it.kind === "file" && (it.type.startsWith("audio") || it.type.startsWith("video") || it.type === "")) {
            const f = it.getAsFile();
            if (f) { e.preventDefault(); startExtraction("clipboard", f); return; }
          }
        }
        const text = cd.getData("text");
        if (text && URL_REGEX.test(text.trim())) {
          e.preventDefault();
          startExtraction("url", text.trim());
        }
      }, 0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startExtraction, urlPanelOpen]);

  useEffect(() => {
    if (urlPanelOpen && urlInputRef.current) {
      setTimeout(() => urlInputRef.current?.focus(), 150);
    }
  }, [urlPanelOpen]);

  useEffect(() => {
    const kind = guessKindFromUrl(urlInput.trim());
    setUrlHoverKind(kind);
  }, [urlInput]);

  return (
    <AppShell>
      <Toast />
      <div className="flex min-h-[calc(100vh-140px)] flex-col gap-10 pb-24">
        <Hero dragOver={dragOver} setDragOver={setDragOver} handleFiles={handleFiles} />

        <AnimatePresence>
          {extracting && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="glass rounded-[16px] p-5 shadow-card"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[12px] bg-[var(--bg-2)]">
                  <Loader2 className="h-6 w-6 text-[var(--accent-cyan)] animate-spin" strokeWidth={2.4} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-[14px] font-medium truncate">{extracting.fileName}</span>
                    <SourceBadge source={extracting.source} />
                  </div>
                  {extracting.sourceHint && (
                    <div className="mt-0.5 text-[10px] text-dim truncate num-mono">{extracting.sourceHint}</div>
                  )}
                  <div className="mt-2 text-[11px] text-dim">
                    {sourceStageText(extracting.source)}
                  </div>
                  <div className="mt-3 h-1.5 w-full rounded-full bg-[var(--bg-3)] overflow-hidden">
                    <motion.div
                      className="h-full grad-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${extracting.pct}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-dim num-mono">
                    <span>{extracting.stage}</span>
                    <span>{extracting.pct}%</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {file && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="glass rounded-[16px] p-5 shadow-card"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[12px] grad-primary">
                    {file.sourceKind === "video" ? (
                      <Video className="h-6 w-6 text-[var(--bg-0)]" strokeWidth={2.4} />
                    ) : (
                      <Music2 className="h-6 w-6 text-[var(--bg-0)]" strokeWidth={2.4} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-[15px] font-medium truncate">{file.name}</span>
                      <SourceBadge source={file.extractionSource} />
                      {file.sourceKind === "video" && file.extractionSource === "file" && (
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[var(--bg-3)] px-2 py-0.5 text-[10px] text-[var(--accent-cyan)] num-mono">
                          <Video className="h-2.5 w-2.5" /> 来自 {file.sourceFormat}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-dim num-mono">
                      <span>{formatTime(file.duration)}</span>
                      <span>·</span>
                      <span>{file.format}</span>
                      {file.size > 0 && (
                        <>
                          <span>·</span>
                          <span>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={startAnalysis}
                  className="group relative flex h-11 items-center gap-2 overflow-hidden rounded-[12px] px-5 text-[13px] font-semibold text-[var(--bg-0)] grad-primary shadow-card transition hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Zap className="h-4 w-4" strokeWidth={2.4} />
                  开始智能分析
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </button>
              </div>
              <div className="mt-4 h-20">
                <WaveformCanvas
                  peaks={generateDemoPeaks(200, file.duration)}
                  duration={file.duration}
                  height={80}
                  interactive={false}
                  showRuler={false}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <RecentSection />
        <FeatureBar />
      </div>

      <FloatingInputBar
        urlPanelOpen={urlPanelOpen}
        setUrlPanelOpen={setUrlPanelOpen}
        urlInput={urlInput}
        setUrlInput={setUrlInput}
        urlInputRef={urlInputRef}
        urlHoverKind={urlHoverKind}
        submitUrl={submitUrl}
        disabled={!!extracting}
      />
    </AppShell>
  );
}

function Hero({
  dragOver,
  setDragOver,
  handleFiles,
}: {
  dragOver: boolean;
  setDragOver: (b: boolean) => void;
  handleFiles: (f: FileList | File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="pt-8">
      <div className="mb-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-3 inline-flex items-center gap-2 rounded-full glass px-3 py-1"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-cyan)] animate-pulse" />
          <span className="text-[11px] text-muted">Agent 后端在线 · 7 阶段流水线已就绪</span>
        </motion.div>
        <h1 className="font-display text-[42px] md:text-[52px] font-semibold leading-[1.05] tracking-tight">
          把一首歌<span className="text-dim">（或一段视频、一个 URL）</span>，
          <br className="md:hidden" />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(135deg,#00E5FF,#7C5CFF)" }}
          >
            变成一段丝滑的铃声
          </span>
          。
        </h1>
        <p className="mx-auto mt-4 max-w-[580px] text-[14px] md:text-[15px] text-muted leading-relaxed">
          ≤ 29.99s · 自动分析 · 循环丝滑 · AAC 192k · 三种输入方式任选。
          <br className="hidden md:block" />
          <span className="text-dim">拖拽文件 · 粘贴文件（⌘/Ctrl+V） · 贴 URL</span>
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={`group relative cursor-pointer overflow-hidden rounded-[24px] border-[1.5px] border-dashed p-10 md:p-14 text-center transition-all ${
          dragOver ? "border-transparent grad-primary scale-[1.01]" : "border-[var(--border-strong)] hover:border-[rgba(0,229,255,0.4)]"
        }`}
        style={{
          background: dragOver
            ? "linear-gradient(180deg, rgba(0,229,255,0.12), rgba(124,92,255,0.10))"
            : "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.005))",
        }}
      >
        <input ref={inputRef} type="file" accept="audio/*,video/*" className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />

        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[16px] glass-strong mb-5 group-hover:animate-pulse-glow">
          <motion.div animate={{ rotate: dragOver ? 180 : 0 }} transition={{ duration: 0.4 }}>
            <Upload className="h-8 w-8 text-[var(--accent-cyan)]" strokeWidth={1.8} />
          </motion.div>
        </div>

        <div className="font-display text-[18px] md:text-[20px] font-semibold">
          把音频 / 视频拖到这里，或点击选择
        </div>
        <div className="mt-2 text-[12px] text-dim">
          也可以按 <kbd className="inline-block rounded bg-[var(--bg-3)] px-1.5 py-0.5 text-[10px] num-mono text-muted mx-0.5">⌘</kbd>+<kbd className="inline-block rounded bg-[var(--bg-3)] px-1.5 py-0.5 text-[10px] num-mono text-muted mx-0.5">V</kbd> 粘贴，或点下方 <kbd className="inline-block rounded bg-[var(--bg-3)] px-1.5 py-0.5 text-[10px] num-mono text-muted mx-0.5">+</kbd> 输入 URL
        </div>

        <div className="mt-6 flex justify-center gap-2 text-[11px] flex-wrap">
          {[
            { icon: Music2, label: "音频直进" },
            { icon: Video, label: "视频抽音" },
            { icon: Link2, label: "URL 下载" },
            { icon: ClipboardPaste, label: "剪贴板粘贴" },
          ].map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-app bg-[var(--bg-2)] px-3 py-1 text-muted">
              <Icon className="h-3 w-3 text-[var(--accent-cyan)]" />
              {label}
            </span>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function FloatingInputBar({
  urlPanelOpen, setUrlPanelOpen, urlInput, setUrlInput, urlInputRef, urlHoverKind, submitUrl, disabled,
}: {
  urlPanelOpen: boolean;
  setUrlPanelOpen: (v: boolean) => void;
  urlInput: string;
  setUrlInput: (v: string) => void;
  urlInputRef: React.RefObject<HTMLInputElement | null>;
  urlHoverKind: "audio" | "video" | null;
  submitUrl: () => void;
  disabled: boolean;
}) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-[min(680px,calc(100vw-32px))] pointer-events-none">
      <AnimatePresence>
        {urlPanelOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto mb-3 rounded-[20px] p-[1.5px] glass-strong overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(0,229,255,0.4), rgba(124,92,255,0.4), rgba(0,229,255,0.4))",
              backgroundSize: "200% 200%",
              animation: "gradientShift 6s ease infinite",
            }}
          >
            <div className="rounded-[18px] bg-[var(--bg-0)]/95 backdrop-blur-xl p-5 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-[var(--accent-cyan)]" />
                  <span className="font-display text-[13px] font-medium">从 URL 加载音视频</span>
                  <span className="text-[10px] text-dim num-mono">（需 CORS 允许）</span>
                </div>
                <button onClick={() => setUrlPanelOpen(false)} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-[var(--bg-2)] text-dim hover:text-muted transition">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    ref={urlInputRef}
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") submitUrl(); }}
                    placeholder="粘贴包含音频或视频的 URL…  例：https://cdn.example.com/song.mp3"
                    className="w-full h-11 rounded-[12px] bg-[var(--bg-2)] border border-[var(--border-strong)] pl-10 pr-3 text-[13px] placeholder:text-dim/60 focus:outline-none focus:border-[rgba(0,229,255,0.6)] focus:bg-[var(--bg-3)]/60 transition num-mono"
                  />
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--accent-violet)]" />
                  {urlHoverKind && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-full bg-[var(--bg-3)] px-2 py-0.5 text-[10px] num-mono">
                      {urlHoverKind === "audio" ? (
                        <Music2 className="h-2.5 w-2.5 text-[var(--accent-cyan)]" />
                      ) : (
                        <Video className="h-2.5 w-2.5 text-[var(--accent-violet)]" />
                      )}
                      {urlHoverKind.toUpperCase()}
                    </div>
                  )}
                </div>
                <button
                  onClick={submitUrl}
                  disabled={!urlInput.trim() || !urlHoverKind}
                  className="flex h-11 items-center gap-2 rounded-[12px] px-5 text-[12px] font-semibold grad-primary text-[var(--bg-0)] disabled:opacity-40 disabled:cursor-not-allowed transition hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Zap className="h-3.5 w-3.5" />
                  下载
                </button>
              </div>

              <div className="mt-3 flex items-center gap-3 text-[11px] text-dim">
                <Keyboard className="h-3 w-3" />
                <span>
                  <kbd className="rounded bg-[var(--bg-3)] px-1.5 py-0.5 text-[10px] num-mono">⌘</kbd>
                  <kbd className="rounded bg-[var(--bg-3)] px-1.5 py-0.5 text-[10px] num-mono">V</kbd> 可直接粘贴 URL 或文件
                  <span className="mx-1.5">·</span>
                  <kbd className="rounded bg-[var(--bg-3)] px-1.5 py-0.5 text-[10px] num-mono">Esc</kbd> 关闭
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setUrlPanelOpen(!urlPanelOpen)}
        whileHover={{ scale: disabled ? 1 : 1.04 }}
        whileTap={{ scale: disabled ? 1 : 0.97 }}
        disabled={disabled}
        className={`pointer-events-auto mx-auto flex h-11 items-center gap-2 rounded-full px-5 text-[12px] font-medium transition ${
          urlPanelOpen
            ? "glass-strong text-muted"
            : "grad-primary text-[var(--bg-0)] shadow-card"
        } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
        style={{
          boxShadow: urlPanelOpen ? undefined : "0 0 24px rgba(0,229,255,0.25), 0 0 48px rgba(124,92,255,0.18)",
        }}
      >
        {urlPanelOpen ? (
          <><X className="h-4 w-4" /> 关闭 URL 输入</>
        ) : (
          <>
            <Plus className="h-4 w-4" strokeWidth={2.8} />
            URL / 剪贴板
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[var(--bg-0)]/30 px-1.5 py-0.5 text-[10px] num-mono">
              ⌘V
            </span>
          </>
        )}
      </motion.button>
    </div>
  );
}

function SourceBadge({ source }: { source: ExtractionSource }) {
  if (source === "url") {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] num-mono bg-[rgba(124,92,255,0.18)] text-[var(--accent-violet)] border border-[rgba(124,92,255,0.3)]">
        <Globe className="h-2.5 w-2.5" /> URL
      </span>
    );
  }
  if (source === "clipboard") {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] num-mono bg-[rgba(0,229,255,0.12)] text-[var(--accent-cyan)] border border-[rgba(0,229,255,0.3)]">
        <ClipboardPaste className="h-2.5 w-2.5" /> 剪贴板
      </span>
    );
  }
  return null;
}

function sourceStageText(source: ExtractionSource): string {
  if (source === "url") return "URL 下载中 → 音轨处理中";
  if (source === "clipboard") return "剪贴板文件处理中";
  return "音视频处理中";
}

function RecentSection() {
  const router = useRouter();
  const projects = useStore((s) => s.projects);
  const setProject = useStore((s) => s.setProject);
  const removeProject = useStore((s) => s.removeProject);
  const showToast = useStore((s) => s.showToast);
  const currentId = useStore((s) => s.currentProject?.id);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const items = projects.slice(0, 4);
  const hasAny = items.length > 0;

  const onOpen = (p: typeof items[number]) => {
    setProject(p);
    router.push("/workspace/candidates");
  };

  const onRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("确定删除此项目吗？此操作不可恢复")) return;
    if (currentId === id) {
      setProject(undefined);
    }
    removeProject(id);
    showToast("success", "项目已删除");
  };

  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="font-display text-[18px] font-semibold">最近项目</h2>
          <p className="text-[12px] text-dim">{hasAny ? "继续你的铃声创作" : "拖入一首歌开始你的第一个项目"}</p>
        </div>
        <Link
          href="/workspace/candidates"
          className={cn(
            "group flex items-center gap-1 text-[12px] transition",
            hasAny ? "text-muted hover:text-1" : "text-dim pointer-events-none opacity-50"
          )}
        >
          打开工作区
          <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
        </Link>
      </div>
      {!hasAny ? (
        <div className="glass rounded-[14px] p-8 text-center text-muted">
          <Music2 className="mx-auto h-8 w-8 text-dim mb-2" />
          <div className="text-[13px]">还没有项目 —— 拖入或选择一首歌开始</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((p, i) => {
            const topScore = p.candidates.reduce((m, c) => Math.max(m, c.score), 0);
            const timeAgo = mounted ? formatTimeAgo(p.createdAt) : "刚刚";
            const peaks = p.analysis?.waveformPeaks ?? generateDemoPeaks(100, p.file.duration);
            const isCurrent = p.id === currentId;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
                whileHover={{ y: -2 }}
                onClick={() => onOpen(p)}
                className="group glass rounded-[14px] p-3 cursor-pointer shadow-card hover:border-[rgba(0,229,255,0.3)] hover:shadow-[0_0_0_1px_rgba(0,229,255,0.2)] transition-all"
              >
                <div className="relative h-16 rounded-[10px] overflow-hidden mb-3 bg-[var(--bg-2)]">
                  <WaveformCanvas peaks={peaks} duration={p.file.duration} height={64} interactive={false} showRuler={false} />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/30">
                    <PlayCircle className="h-8 w-8 text-white drop-shadow" />
                  </div>
                  <button
                    onClick={(e) => onRemove(p.id, e)}
                    className="absolute top-1.5 right-1.5 h-6 w-6 flex items-center justify-center rounded-md bg-black/50 opacity-0 group-hover:opacity-100 transition text-white/70 hover:text-white hover:bg-[var(--accent-red)]/80"
                    title="删除项目"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  {isCurrent && (
                    <div className="absolute top-1.5 left-1.5 h-1.5 w-1.5 rounded-full bg-[var(--accent-green)] animate-pulse" title="当前工作区" />
                  )}
                </div>
                <div className="font-display text-[13px] font-medium truncate">{p.name}</div>
                <div className="mt-1 flex items-center justify-between text-[11px] num-mono text-dim">
                  <span>{p.candidates.length} 候选</span>
                  <span className="text-[var(--accent-cyan)]">{topScore} 分</span>
                  <span suppressHydrationWarning>{timeAgo}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.section>
  );
}

function formatTimeAgo(ts: number): string {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} 天前`;
  return new Date(ts).toLocaleDateString("zh-CN");
}

function FeatureBar() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="flex flex-wrap items-center justify-center gap-3">
      {FEATURE_TAGS.map((t) => (
        <span key={t.text} className="inline-flex items-center gap-2 rounded-full border border-app bg-[var(--bg-2)]/60 px-3 py-1.5 text-[12px] text-muted">
          <t.icon className="h-3.5 w-3.5 text-[var(--accent-cyan)]" />
          {t.text}
        </span>
      ))}
    </motion.div>
  );
}

function generateDemoPeaks(n: number, seed = 42) {
  const peaks: number[] = [];
  let s = seed * 9301 + 49297;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    const env = Math.sin((i / n) * Math.PI) * 0.6 + 0.3 * Math.sin((i / n) * Math.PI * 4);
    peaks.push(Math.min(1, Math.max(0.04, 0.1 + Math.abs(env) * 0.8 * (0.5 + r))));
  }
  return peaks;
}
