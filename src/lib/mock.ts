import type { AnalysisResult, Candidate, Project, Stage } from "./types";

function buildStages(): Stage[] {
  return [
    { key: "decode", label: "解码", status: "pending", progress: 0, log: [] },
    { key: "structure", label: "结构", status: "pending", progress: 0, log: [] },
    { key: "vocal", label: "人声", status: "pending", progress: 0, log: [] },
    { key: "anchor", label: "锚点", status: "pending", progress: 0, log: [] },
    { key: "candidates", label: "候选", status: "pending", progress: 0, log: [] },
    { key: "render", label: "渲染", status: "pending", progress: 0, log: [] },
    { key: "qa", label: "QA", status: "pending", progress: 0, log: [] },
  ];
}

function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function makeWaveform(n = 800, seed = 1) {
  const peaks: number[] = [];
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    const env =
      Math.sin((i / n) * Math.PI) * 0.75 +
      0.25 * Math.sin((i / n) * Math.PI * 6.0) +
      0.2 * Math.sin((i / n) * Math.PI * 11.0);
    peaks.push(Math.min(1, Math.max(0.03, 0.08 + Math.abs(env) * 0.85 * (0.6 + r * 0.8))));
  }
  return peaks;
}

export function buildMockAnalysis(duration: number, bpm: number): AnalysisResult {
  const rand = prng(42);
  const beats: { time: number; strength: number; isDownbeat: boolean }[] = [];
  const beatSec = 60 / bpm;
  const totalBeats = Math.floor(duration / beatSec);
  for (let i = 0; i < totalBeats; i++) {
    beats.push({
      time: i * beatSec,
      strength: i % 4 === 0 ? 1 : 0.6 + rand() * 0.3,
      isDownbeat: i % 4 === 0,
    });
  }

  const r = duration / 213;
  const segments: AnalysisResult["segments"] = [
    { label: "Intro / 前奏", start: 0, end: Math.round(12 * r), color: "#7C5CFF" },
    { label: "Verse 1 / 主歌", start: Math.round(12 * r), end: Math.round(34 * r), color: "#00E5FF" },
    { label: "Pre-Chorus / 预备副歌", start: Math.round(34 * r), end: Math.round(48 * r), color: "#2EE6A8" },
    { label: "Chorus / 副歌", start: Math.round(48 * r), end: Math.round(76 * r), color: "#FFB020" },
    { label: "Verse 2 / 主歌二", start: Math.round(76 * r), end: Math.round(100 * r), color: "#00E5FF" },
    { label: "Chorus / 副歌", start: Math.round(100 * r), end: Math.round(130 * r), color: "#FFB020" },
    { label: "Bridge / 桥段", start: Math.round(130 * r), end: Math.round(150 * r), color: "#7C5CFF" },
    { label: "Outro / 尾奏", start: Math.round(150 * r), end: duration, color: "#6B7080" },
  ];

  const anchors: AnalysisResult["anchors"] = [];
  for (const seg of segments) {
    if (seg.start > 1)
      anchors.push({ time: seg.start + 0.05, type: "phrase_start", confidence: 0.85 });
  }
  let t = 0;
  while (t < duration) {
    anchors.push({ time: t, type: "downbeat", confidence: 0.9 });
    t += beatSec * 4;
  }

  const vocalZones: { start: number; end: number }[] = [
    { start: Math.round(14 * r), end: Math.round(32 * r) },
    { start: Math.round(36 * r), end: Math.round(48 * r) },
    { start: Math.round(50 * r), end: Math.round(74 * r) },
    { start: Math.round(78 * r), end: Math.round(98 * r) },
    { start: Math.round(102 * r), end: Math.round(128 * r) },
  ];

  return {
    bpm,
    duration,
    segments,
    anchors,
    beats,
    vocalSafeZones: vocalZones,
    waveformPeaks: makeWaveform(800, Math.round(duration * 13)),
  };
}

const ANCHOR_POOL = ["downbeat", "phrase_start", "chorus_hook", "vocal_safe", "fade_zone"] as const;
const LOOP_POOL = ["crossfade", "beatloop", "seamless"] as const;

type _SegType = "intro" | "verse" | "prechorus" | "chorus" | "bridge" | "outro";

interface _SegPlan {
  kind: _SegType;
  label: string;
  start: number;
  end: number;
  baseScore: number;
  counts: number;
  vocalFree?: boolean;
  reasonPrefix: string;
}

export function buildMockCandidates(analysis: AnalysisResult): Candidate[] {
  const rand = prng(99);
  const out: Candidate[] = [];
  const windowDur = 29.9;
  const minWindowDur = 28.9;
  let idx = 0;

  const planBySeg = new Map<number, _SegPlan>();
  analysis.segments.forEach((seg, segIdx) => {
    const low = seg.label.toLowerCase();
    let p: _SegPlan;
    if (low.startsWith("intro")) {
      p = { kind: "intro", label: "Intro 前奏", start: seg.start, end: seg.end, baseScore: 70, counts: 2, vocalFree: true, reasonPrefix: "前奏纯音乐" };
    } else if (low.includes("pre-chorus") || low.includes("预备")) {
      p = { kind: "prechorus", label: seg.label.includes("/") ? seg.label.split("/")[0].trim() : "Pre-Chorus", start: seg.start, end: seg.end, baseScore: 74, counts: 2, reasonPrefix: "预备副歌" };
    } else if (low.includes("chorus") && [...planBySeg.values()].filter((x) => x.kind === "chorus").length === 0) {
      p = { kind: "chorus", label: "Chorus 副歌", start: seg.start, end: seg.end, baseScore: 88, counts: 3, reasonPrefix: "副歌核心" };
    } else if (low.includes("chorus")) {
      p = { kind: "chorus", label: "Chorus 副歌 2", start: seg.start, end: seg.end, baseScore: 85, counts: 3, reasonPrefix: "第二遍副歌" };
    } else if (low.startsWith("verse")) {
      const n = [...planBySeg.values()].filter((x) => x.kind === "verse").length + 1;
      p = { kind: "verse", label: n === 1 ? "Verse 主歌" : `Verse ${n} 主歌`, start: seg.start, end: seg.end, baseScore: 78, counts: 2, reasonPrefix: n === 1 ? "主歌叙述" : "主歌二叙述" };
    } else if (low.includes("bridge")) {
      p = { kind: "bridge", label: "Bridge 桥段", start: seg.start, end: seg.end, baseScore: 76, counts: 2, vocalFree: true, reasonPrefix: "桥段纯音乐/Solo" };
    } else {
      p = { kind: "outro", label: "Outro 尾奏", start: seg.start, end: seg.end, baseScore: 72, counts: 3, vocalFree: true, reasonPrefix: "尾奏淡出" };
    }
    planBySeg.set(segIdx, p);
  });

  const total = analysis.duration;
  if (total < minWindowDur + 0.5) {
    return out;
  }

  const windowStarts: number[] = [];
  const step = Math.min(14, Math.max(6, (total - windowDur) / 9));
  let t = 0.5;
  while (t <= total - minWindowDur) {
    const clamped = Math.max(0, Math.min(t, total - windowDur));
    windowStarts.push(Number(clamped.toFixed(2)));
    t += step;
  }

  for (const ws of windowStarts) {
    const we = Number(Math.min(total, ws + windowDur).toFixed(2));
    const dur = Number((we - ws).toFixed(2));
    if (dur < minWindowDur) continue;

    const center = ws + dur / 2;
    let segIdx = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < analysis.segments.length; i++) {
      const s = analysis.segments[i];
      const mid = (s.start + s.end) / 2;
      const d = Math.abs(center - mid);
      if (d < bestDist) {
        bestDist = d;
        segIdx = i;
      }
    }
    const p = planBySeg.get(segIdx)!;

    idx++;
    const variation = Math.round(rand() * 10 - 3 + (p.vocalFree ? -2 : 0));
    const score = Math.max(40, Math.min(97, p.baseScore + variation));
    const anchor = ANCHOR_POOL[idx % ANCHOR_POOL.length];
    const loop = LOOP_POOL[idx % LOOP_POOL.length];

    const breakdown = {
      integrity: Math.round(score * (0.9 + rand() * 0.08)),
      recognizability: Math.round(score * (0.82 + rand() * 0.14)),
      opening: Math.round(score * (0.78 + rand() * 0.16)),
      ending: Math.round(score * (0.76 + rand() * 0.16)),
      loop: Math.round(score * (0.68 + rand() * 0.22)),
      vocal: p.vocalFree
        ? Math.round(20 + rand() * 12)
        : Math.round(score * (0.8 + rand() * 0.14)),
      energy: Math.round(score * (0.82 + rand() * 0.12)),
      technical: Math.round(score * (0.88 + rand() * 0.1)),
    };

    const pass = score >= 55;
    const isSolo = p.vocalFree && p.kind !== "intro";
    const reasonTail = p.vocalFree
      ? `，无干扰人声段落，${isSolo ? "Solo/尾奏" : "前奏"}切入自然，适合偏好纯音乐的用户。`
      : `，人声安全 + 节奏稳定，结尾可无缝接回。`;
    const reason =
      rand() > 0.4
        ? `${p.reasonPrefix} · 从 ${anchor} 切入，${loop === "crossfade" ? "交叉淡化" : loop === "beatloop" ? "节拍循环" : "无缝"} 接缝质量高，识别度强${reasonTail}`
        : `${p.reasonPrefix} · 覆盖 ${p.label} 核心段落${reasonTail}`;

    const fadeInMs = 60 + Math.round(rand() * 80);
    const fadeOutMs = 600 + Math.round(rand() * 400);

    out.push({
      id: `c-${String(idx).padStart(2, "0")}`,
      index: idx,
      start: ws,
      end: we,
      duration: dur,
      score,
      scoreBreakdown: breakdown,
      anchorType: anchor,
      anchorConfidence: 0.72 + rand() * 0.25,
      fadeInMs,
      fadeOutMs,
      agentStart: ws,
      agentEnd: we,
      agentFadeInMs: fadeInMs,
      agentFadeOutMs: fadeOutMs,
      loopStrategy: loop,
      loopQuality: 0.78 + rand() * 0.2,
      segment: p.label,
      reason,
      relaxed: !pass && score > 45,
      qa: {
        status: pass ? "pass" : score > 45 ? "pending" : "fail",
        reasons: pass
          ? ["时长 29.9s 左右", "响度 -16 LUFS", "循环接缝 ≤ 0.3 dB 差异"]
          : ["响度偏低", "循环接缝存在 1.2dB 跳变"],
        loudnessLUFS: -17 + rand() * 3,
        truePeakDBTP: -6 + rand() * 2,
        durationOk: dur < 29.99,
        seamOk: pass,
      },
    });
  }
  return out.sort((a, b) => a.start - b.start);
}

export function createMockProject(duration = 213, bpm = 132): Project {
  const analysis = buildMockAnalysis(duration, bpm);
  const candidates = buildMockCandidates(analysis);

  return {
    id: "demo-proj-001",
    name: "再见我的孤独 · ZARD",
    file: {
      id: "f-01",
      name: "再见我的孤独-ZARD.m4a",
      path: "/audio/再见我的孤独-ZARD.m4a",
      url: "/audio/再见我的孤独-ZARD.m4a",
      duration,
      sizeBytes: Math.round(5_000_000 * (duration / 213)),
      format: "M4A / AAC",
      sourceKind: "audio",
      sourceFormat: "M4A",
      sourceName: "再见我的孤独-ZARD.m4a",
    },
    createdAt: 1761736980000,
    stage: "qa",
    completedStages: ["decode", "structure", "vocal", "anchor", "candidates", "render", "qa"],
    stages: buildStages().map((s) => ({ ...s, status: "done", progress: 100 })),
    analysis,
    candidates,
    selectedCandidateId: candidates[0].id,
    exported: [],
  };
}
