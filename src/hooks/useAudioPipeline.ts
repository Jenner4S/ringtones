"use client";

import { useCallback, useEffect, useRef } from "react";
import type { VocalMode } from "@/lib/types";

type Ctx = AudioContext;
type Source = MediaElementAudioSourceNode;
type BP = BiquadFilterNode;

const ctxMap = new WeakMap<HTMLAudioElement, Ctx>();
const srcMap = new WeakMap<HTMLAudioElement, Source>();
const chainMap = new WeakMap<HTMLAudioElement, {
  hp: BP;
  peak: BP;
  lp: BP;
  bypass: GainNode;
  source: Source;
  ctx: Ctx;
  dest: AudioDestinationNode;
}>();

function ensureChain(audio: HTMLAudioElement) {
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

  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 200;
  hp.Q.value = 0.7;

  const peak = ctx.createBiquadFilter();
  peak.type = "peaking";
  peak.frequency.value = 3000;
  peak.Q.value = 1.0;
  peak.gain.value = 0;

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 4000;
  lp.Q.value = 0.7;

  const bypass = ctx.createGain();
  bypass.gain.value = 0;

  src.connect(hp);
  hp.connect(peak);
  peak.connect(lp);
  lp.connect(ctx.destination);

  src.connect(bypass);
  bypass.connect(ctx.destination);

  const chain = { hp, peak, lp, bypass, source: src, ctx, dest: ctx.destination };
  chainMap.set(audio, chain);
  return chain;
}

function applyMode(audio: HTMLAudioElement, mode: VocalMode) {
  const chain = ensureChain(audio);
  if (!chain) return;

  const { hp, peak, lp, bypass, ctx } = chain;
  const now = ctx.currentTime;
  const t = 0.08;

  if (mode === "vocal") {
    bypass.gain.cancelScheduledValues(now);
    bypass.gain.linearRampToValueAtTime(0, now + t);

    hp.frequency.cancelScheduledValues(now);
    hp.frequency.linearRampToValueAtTime(200, now + t);
    hp.gain.cancelScheduledValues(now);
    hp.gain.linearRampToValueAtTime(0, now + t);

    peak.frequency.cancelScheduledValues(now);
    peak.frequency.linearRampToValueAtTime(3000, now + t);
    peak.gain.cancelScheduledValues(now);
    peak.gain.linearRampToValueAtTime(6, now + t);

    lp.frequency.cancelScheduledValues(now);
    lp.frequency.linearRampToValueAtTime(4000, now + t);
    lp.gain.cancelScheduledValues(now);
    lp.gain.linearRampToValueAtTime(0, now + t);
  } else {
    bypass.gain.cancelScheduledValues(now);
    bypass.gain.linearRampToValueAtTime(1, now + t);
  }
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
    return () => {
      // no-op: cleanup handled by WeakMap GC
    };
  }, []);

  return { resumeAndApply };
}
