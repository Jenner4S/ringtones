import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpegPromise: Promise<FFmpeg> | null = null;

export function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegPromise) return ffmpegPromise;
  ffmpegPromise = (async () => {
    const ffmpeg = new FFmpeg();
    const baseURL = "/ffmpeg";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    return ffmpeg;
  })();
  return ffmpegPromise;
}

export function resetFFmpeg() {
  if (ffmpegPromise) {
    ffmpegPromise.then((ff) => { try { (ff as any).terminate?.(); } catch {} }).catch(() => {});
  }
  ffmpegPromise = null;
}

function safeUnlink(ff: FFmpeg, path: string) {
  try { (ff as any).unlink?.(path); } catch {}
}

const AUDIO_EXTS = ["mp3", "m4a", "wav", "flac", "aac", "ogg", "opus", "wma", "aiff", "alac"];
const VIDEO_EXTS = [
  "mp4", "mov", "mkv", "avi", "wmv", "flv", "webm", "m4v", "mpg", "mpeg",
  "ts", "mts", "m2ts", "vob", "3gp", "3gpp", "hevc", "h265", "h264",
];

export function canRunFFmpeg(): boolean {
  const g = globalThis as any;
  if (!g.WebAssembly) return false;
  if (typeof g.isSecureContext === "boolean" && !g.isSecureContext && location.protocol !== "http:") {
    return false;
  }
  if (typeof g.crossOriginIsolated === "boolean" && !g.crossOriginIsolated) {
    // SharedArrayBuffer 非必须，但某些 WASM 构建需要
  }
  return true;
}

const AUDIO_MIMES = new Set([
  "audio/mpeg", "audio/mp3", "audio/mp4", "audio/ogg", "audio/wav",
  "audio/flac", "audio/aac", "audio/webm", "audio/x-m4a",
]);
const VIDEO_MIMES = new Set([
  "video/mp4", "video/quicktime", "video/x-matroska", "video/x-msvideo",
  "video/webm", "video/ogg", "video/mpeg", "video/3gpp",
]);

export function detectSourceKind(file: File | { name: string; type?: string }): "audio" | "video" | null {
  const type = (file.type || "").toLowerCase();
  if (AUDIO_MIMES.has(type) || type.startsWith("audio/")) return "audio";
  if (VIDEO_MIMES.has(type) || type.startsWith("video/")) return "video";
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  if (AUDIO_EXTS.includes(ext)) return "audio";
  if (VIDEO_EXTS.includes(ext)) return "video";
  return null;
}

export function guessKindFromUrl(url: string): "audio" | "video" | null {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const ext = pathname.split(".").pop()?.split("?")[0];
    if (!ext) return null;
    if (AUDIO_EXTS.includes(ext)) return "audio";
    if (VIDEO_EXTS.includes(ext)) return "video";
  } catch {}
  return null;
}

export function extractFilenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const raw = pathname.split("/").pop() || "remote_media";
    return decodeURIComponent(raw);
  } catch {
    return "remote_media";
  }
}

export interface ExtractOptions {
  onProgress?: (pct: number, stage: string) => void;
  outputFormat?: "wav" | "m4a" | "mp3";
}

export interface ExtractResult {
  audioBlob: Blob;
  audioUrl: string;
  format: string;
  duration: number;
  sourceKind: "audio" | "video";
  sourceFormat: string;
  sourceName: string;
}

export async function extractAudio(
  file: File,
  opts: ExtractOptions = {}
): Promise<ExtractResult> {
  const sourceKind = detectSourceKind(file);
  if (!sourceKind) throw new Error("无法识别的文件格式");

  const sourceFormat = (file.type.split("/")[1]?.toUpperCase() ||
    file.name.split(".").pop()?.toUpperCase() || "UNKNOWN").replace("X-", "");

  if (sourceKind === "audio") {
    opts.onProgress?.(100, "音频文件就绪");
    const audioUrl = URL.createObjectURL(file);
    const duration = await probeDuration(audioUrl);
    return {
      audioBlob: file,
      audioUrl,
      format: sourceFormat,
      duration,
      sourceKind: "audio",
      sourceFormat,
      sourceName: file.name,
    };
  }

  if (!canRunFFmpeg()) {
    opts.onProgress?.(30, "WASM 不可用 · 直接播放原文件");
    const audioUrl = URL.createObjectURL(file);
    const duration = await probeDuration(audioUrl).catch(() => 0);
    opts.onProgress?.(100, "就绪（设备不支持 WASM，使用原视频音轨）");
    return {
      audioBlob: file,
      audioUrl,
      format: sourceFormat,
      duration,
      sourceKind: "video",
      sourceFormat,
      sourceName: file.name,
    };
  }

  const outputFormat = opts.outputFormat ?? "wav";
  const outputName = `extracted_${Date.now()}.${outputFormat}`;
  const safeInputName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

  opts.onProgress?.(5, "加载 FFmpeg 核心…");
  const ffmpeg = await getFFmpeg();

  try {
    opts.onProgress?.(15, "写入数据…");
    await ffmpeg.writeFile(safeInputName, await fetchFile(file));

    opts.onProgress?.(25, "正在抽取音轨…");
    await ffmpeg.exec([
      "-i", safeInputName,
      "-vn",
      "-acodec", outputFormat === "wav" ? "pcm_s16le" : outputFormat === "m4a" ? "aac" : "libmp3lame",
      "-ar", "44100",
      "-ac", "2",
      outputName,
    ]);

    opts.onProgress?.(85, "读取提取结果…");
    const data = await ffmpeg.readFile(outputName);
    const mime = outputFormat === "wav" ? "audio/wav" : outputFormat === "m4a" ? "audio/mp4" : "audio/mpeg";
    const blob = new Blob([data], { type: mime });
    const audioUrl = URL.createObjectURL(blob);
    const duration = await probeDuration(audioUrl);

    opts.onProgress?.(100, "完成");
    return {
      audioBlob: blob,
      audioUrl,
      format: outputFormat.toUpperCase(),
      duration,
      sourceKind: "video",
      sourceFormat,
      sourceName: file.name,
    };
  } catch (e) {
    resetFFmpeg();
    throw e;
  } finally {
    safeUnlink(ffmpeg, safeInputName);
    safeUnlink(ffmpeg, outputName);
  }
}

export async function extractFromURL(
  url: string,
  opts: ExtractOptions = {}
): Promise<ExtractResult> {
  const kind = guessKindFromUrl(url);
  if (!kind) {
    throw new Error("URL 未识别出音频或视频格式（需包含后缀如 .mp3/.mp4）");
  }

  const filename = extractFilenameFromUrl(url);
  opts.onProgress?.(5, `下载 ${filename}…`);

  let resp: Response;
  try {
    resp = await fetch(url, { mode: "cors" });
  } catch (e) {
    throw new Error("无法访问 URL：可能是 CORS 限制，建议下载到本地后再拖入");
  }
  if (!resp.ok) {
    throw new Error(`下载失败：HTTP ${resp.status}`);
  }

  const contentType = resp.headers.get("content-type") || "";
  const bytes = new Uint8Array(await resp.arrayBuffer());
  const mimeKind = contentType.startsWith("audio") ? "audio" : contentType.startsWith("video") ? "video" : kind;
  const mime = mimeKind === "audio" ? "application/octet-stream" : "video/mp4";
  const file = new File([bytes], filename, { type: mime });
  Object.defineProperty(file, "type", { value: contentType || (mimeKind === "audio" ? "audio/octet-stream" : "video/mp4") });

  opts.onProgress?.(kind === "video" ? 60 : 90, kind === "video" ? "下载完成，准备提取音轨…" : "下载完成");
  return extractAudio(file, opts);
}

export async function extractFromClipboard(
  item: File | Blob,
  nameHint: string = "clipboard_media",
  opts: ExtractOptions = {}
): Promise<ExtractResult> {
  const file = item instanceof File ? item : new File([item], nameHint);
  return extractAudio(file, opts);
}

function probeDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const el = new Audio();
    el.preload = "metadata";
    el.src = url;
    const cleanup = () => {
      el.removeEventListener("loadedmetadata", onLoad);
      el.removeEventListener("error", onError);
    };
    const onLoad = () => { cleanup(); resolve(isFinite(el.duration) ? el.duration : 0); };
    const onError = () => { cleanup(); resolve(0); };
    el.addEventListener("loadedmetadata", onLoad);
    el.addEventListener("error", onError);
    setTimeout(() => { cleanup(); resolve(0); }, 8000);
  });
}

export function revokeExtractUrl(url: string) {
  try { URL.revokeObjectURL(url); } catch {}
}
