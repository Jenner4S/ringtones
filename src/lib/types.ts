export type SourceKind = "audio" | "video";

export interface ProjectFile {
  id: string;
  name: string;
  path: string;
  duration: number;
  sizeBytes: number;
  format: string;
  sourceKind: SourceKind;
  sourceFormat: string;
  sourceName: string;
  url?: string;
}

export interface Segment {
  label: string;
  start: number;
  end: number;
  color: string;
}

export interface BeatTick {
  time: number;
  strength: number;
  isDownbeat: boolean;
}

export interface Anchor {
  time: number;
  type: AnchorType;
  confidence: number;
}

export type AnchorType =
  | "downbeat"
  | "phrase_start"
  | "chorus_hook"
  | "vocal_safe"
  | "silence"
  | "fade_zone";

export type LoopStrategy = "crossfade" | "beatloop" | "seamless" | "hard";

export type QaStatus = "pass" | "fail" | "pending";

export interface QaResult {
  status: QaStatus;
  reasons: string[];
  loudnessLUFS: number;
  truePeakDBTP: number;
  durationOk: boolean;
  seamOk: boolean;
}

export interface ScoreBreakdown {
  [key: string]: number;
  integrity: number;
  recognizability: number;
  opening: number;
  ending: number;
  loop: number;
  vocal: number;
  energy: number;
  technical: number;
}

export interface Candidate {
  id: string;
  index: number;
  start: number;
  end: number;
  duration: number;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  anchorType: AnchorType;
  anchorConfidence: number;
  fadeInMs: number;
  fadeOutMs: number;
  agentStart: number;
  agentEnd: number;
  agentFadeInMs: number;
  agentFadeOutMs: number;
  loopStrategy: LoopStrategy;
  loopQuality: number;
  segment: string;
  reason: string;
  relaxed: boolean;
  qa: QaResult;
}

export interface AnalysisResult {
  bpm: number;
  duration: number;
  segments: Segment[];
  anchors: Anchor[];
  beats: BeatTick[];
  vocalSafeZones: Array<{ start: number; end: number }>;
  waveformPeaks: number[];
}

export type StageKey =
  | "decode"
  | "structure"
  | "vocal"
  | "anchor"
  | "candidates"
  | "render"
  | "qa";

export interface Stage {
  key: StageKey;
  label: string;
  status: "pending" | "running" | "done" | "error";
  progress: number;
  log: string[];
}

export interface Project {
  id: string;
  name: string;
  file: ProjectFile;
  createdAt: number;
  stage: StageKey;
  completedStages: StageKey[];
  stages: Stage[];
  analysis?: AnalysisResult;
  candidates: Candidate[];
  selectedCandidateId?: string;
  exported: Candidate[];
}

export interface AppSettings {
  theme: "dark" | "light";
  language: "zh-CN" | "en";
  defaultFadeIn: number;
  defaultFadeOut: number;
  targetLoudnessLUFS: number;
  loopStrategy: LoopStrategy;
  maxDuration: number;
  candidateCount: "auto" | number;
  useGpu: boolean;
  useAsr: boolean;
}
