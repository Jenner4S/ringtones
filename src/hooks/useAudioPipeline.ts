"use client";

import { useCallback, useEffect, useRef } from "react";
import type { VocalMode } from "@/lib/types";

type Ctx = AudioContext;
type Source = MediaElementAudioSourceNode;
type BP = BiquadFilterNode;

const ctxMap = new WeakMap<HTMLAudioElement, Ctx>();
const srcMap = new WeakMap<HTMLAudioElement, Source>();

const FLAT = { frequency: 1000, Q: 1, gain: 0 };

interface Chain {
  lowshelf: BP;
  hp: BP;
  peak: BP;
  lp: BP;
  highshelf: BP;
  bypass: GainNode;
  source: Source;
  ctx: Ctx;
}

const chainMap = new WeakMap<HTMLAudioElement, Chain>();

function ensureChain(audio: HTMLAudioElement): Chain | null {
  const existing = chainMap.get(audio);
  if (existing) return existing;

  const AC: typeof AudioContext =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;

  let ctx = ctxMap.get(audio);
  if (!ctx) {
    ctx = new AC();
    ctxMap.set(audio, ctx);
  }

  let src = srcMap.get(audio);
  if (!src) {
    src = ctx.createMediaElementSource(audio);
    srcMap.set(audio, src);
  }

  const lowshelf = ctx.createBiquadFilter();
  lowshelf.type = "lowshelf";
  lowshelf.frequency.value = FLAT.frequency;
  lowshelf.gain.value = FLAT.gain;

  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 50;
  hp.Q.value = 0.7;

  const peak = ctx.createBiquadFilter();
  peak.type = "peaking";
  peak.frequency.value = FLAT.frequency;
  peak.Q.value = 1.0;
  peak.gain.value = FLAT.gain;

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 20000;
  lp.Q.value = 0.7;

  const highshelf = ctx.createBiquadFilter();
  highshelf.type = "highshelf";
  highshelf.frequency.value = FLAT.frequency;
  highshelf.gain.value = FLAT.gain;

  const bypass = ctx.createGain();
  bypass.gain.value = 0;

  src.connect(lowshelf);
  lowshelf.connect(hp);
  hp.connect(peak);
  peak.connect(lp);
  lp.connect(highshelf);
  highshelf.connect(ctx.destination);

  src.connect(bypass);
  bypass.connect(ctx.destination);

  const chain: Chain = { lowshelf, hp, peak, lp, highshelf, bypass, source: src, ctx };
  chainMap.set(audio, chain);
  return chain;
}

function ramp(
  filter: BP,
  param: "frequency" | "gain" | "Q",
  value: number,
  now: number,
  t: number
) {
  filter[param].cancelScheduledValues(now);
  filter[param].linearRampToValueAtTime(value, now + t);
}

type ModeParams = {
  lowshelf_f: number;
  lowshelf_g: number;
  hp_f: number;
  hp_Q: number;
  peak_f: number;
  peak_Q: number;
  peak_g: number;
  lp_f: number;
  lp_Q: number;
  highshelf_f: number;
  highshelf_g: number;
  bypass: number;
};

const MODES: Record<VocalMode, ModeParams> = {
  off: {
    lowshelf_f: FLAT.frequency, lowshelf_g: FLAT.gain,
    hp_f: 50, hp_Q: 0.7,
    peak_f: FLAT.frequency, peak_Q: 1.0, peak_g: FLAT.gain,
    lp_f: 20000, lp_Q: 0.7,
    highshelf_f: FLAT.frequency, highshelf_g: FLAT.gain,
    bypass: 1,
  },
  vocal: {
    lowshelf_f: 150, lowshelf_g: 0,
    hp_f: 200, hp_Q: 0.7,
    peak_f: 3000, peak_Q: 1.2, peak_g: 6,
    lp_f: 4500, lp_Q: 0.7,
    highshelf_f: 5000, highshelf_g: 0,
    bypass: 0,
  },
  instrumental: {
    lowshelf_f: 150, lowshelf_g: 4,
    hp_f: 60, hp_Q: 0.7,
    peak_f: 1200, peak_Q: 1.4, peak_g: -14,
    lp_f: 18000, lp_Q: 0.7,
    highshelf_f: 5000, highshelf_g: 5,
    bypass: 0,
  },
};

function applyMode(audio: HTMLAudioElement, mode: VocalMode) {
  const chain = ensureChain(audio);
  if (!chain) return;

  const { lowshelf, hp, peak, lp, highshelf, bypass, ctx } = chain;
  const now = ctx.currentTime;
  const t = 0.08;
  const p = MODES[mode];

  bypass.gain.cancelScheduledValues(now);
  bypass.gain.linearRampToValueAtTime(p.bypass, now + t);

  ramp(lowshelf, "frequency", p.lowshelf_f, now, t);
  ramp(lowshelf, "gain", p.lowshelf_g, now, t);

  ramp(hp, "frequency", p.hp_f, now, t);
  ramp(hp, "Q", p.hp_Q, now, t);

  ramp(peak, "frequency", p.peak_f, now, t);
  ramp(peak, "Q", p.peak_Q, now, t);
  ramp(peak, "gain", p.peak_g, now, t);

  ramp(lp, "frequency", p.lp_f, now, t);
  ramp(lp, "Q", p.lp_Q, now, t);

  ramp(highshelf, "frequency", p.highshelf_f, now, t);
  ramp(highshelf, "gain", p.highshelf_g, now, t);
}

export function useAudioPipeline(
  audioRef: React.RefObject<HTMLAudioElement | null>,
  mode: VocalMode
) {
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const resumeAndApply = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const chain = ensureChain(audio);
    if (chain && chain.ctx.state === "suspended") {
      void chain.ctx.resume();
    }
    applyMode(audio, modeRef.current);
  }, [audioRef]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    applyMode(audio, mode);
  }, [audioRef, mode]);

  useEffect(() => {
    return () => {};
  }, []);

  return { resumeAndApply };
}
