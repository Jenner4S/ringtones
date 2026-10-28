"use client";

import { useEffect, useRef } from "react";
import type { VocalMode } from "@/lib/types";

const FLAT = { frequency: 1000, Q: 1, gain: 0 };

type ModeParams = {
  lowshelf_f: number; lowshelf_g: number;
  hp_f: number; hp_Q: number;
  peak_f: number; peak_Q: number; peak_g: number;
  lp_f: number; lp_Q: number;
  highshelf_f: number; highshelf_g: number;
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

const COLORS: Record<VocalMode, string> = {
  off: "rgba(140,140,155,0.85)",
  vocal: "rgba(0,229,255,0.95)",
  instrumental: "rgba(168,85,247,0.95)",
};

function buildFilters(ctx: AudioContext, p: ModeParams): BiquadFilterNode[] {
  const nodes: BiquadFilterNode[] = [];

  const ls = ctx.createBiquadFilter();
  ls.type = "lowshelf";
  ls.frequency.value = p.lowshelf_f;
  ls.gain.value = p.lowshelf_g;
  nodes.push(ls);

  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = p.hp_f;
  hp.Q.value = p.hp_Q;
  nodes.push(hp);

  const pk = ctx.createBiquadFilter();
  pk.type = "peaking";
  pk.frequency.value = p.peak_f;
  pk.Q.value = p.peak_Q;
  pk.gain.value = p.peak_g;
  nodes.push(pk);

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = p.lp_f;
  lp.Q.value = p.lp_Q;
  nodes.push(lp);

  const hs = ctx.createBiquadFilter();
  hs.type = "highshelf";
  hs.frequency.value = p.highshelf_f;
  hs.gain.value = p.highshelf_g;
  nodes.push(hs);

  return nodes;
}

function computeDB(mode: VocalMode, freqs: Float32Array): Float32Array {
  const AC: typeof AudioContext | undefined =
    (typeof window !== "undefined" && ((window as any).AudioContext || (window as any).webkitAudioContext));
  if (!AC) {
    return new Float32Array(freqs.length);
  }
  const ctx = new AC();
  try {
    if (mode === "off") {
      const out = new Float32Array(freqs.length);
      for (let i = 0; i < out.length; i++) out[i] = 0;
      void ctx.close();
      return out;
    }
    const filters = buildFilters(ctx, MODES[mode]);
    const totalMag = new Float32Array(freqs.length).fill(1);
    const phase = new Float32Array(freqs.length);
    for (const f of filters) {
      const mag = new Float32Array(freqs.length);
      const ph = new Float32Array(freqs.length);
      f.getFrequencyResponse(freqs, mag, ph);
      for (let i = 0; i < freqs.length; i++) totalMag[i] *= mag[i];
    }
    const out = new Float32Array(freqs.length);
    for (let i = 0; i < freqs.length; i++) {
      out[i] = 20 * Math.log10(Math.max(1e-6, totalMag[i]));
    }
    void ctx.close();
    return out;
  } catch {
    try { void ctx.close(); } catch {}
    return new Float32Array(freqs.length);
  }
}

interface FreqResponseChartProps {
  mode: VocalMode;
  height?: number;
  className?: string;
}

export function FreqResponseChart({ mode, height = 100, className }: FreqResponseChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 1200;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = "100%";
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const padL = 42;
    const padR = 12;
    const padT = 10;
    const padB = 20;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    const fMin = 20;
    const fMax = 20000;
    const dbMin = -24;
    const dbMax = 12;

    const nPoints = 256;
    const freqs = new Float32Array(nPoints);
    for (let i = 0; i < nPoints; i++) {
      const t = i / (nPoints - 1);
      freqs[i] = fMin * Math.pow(fMax / fMin, t);
    }

    const dbData = computeDB(modeRef.current, freqs);

    const xToPx = (f: number) =>
      padL + (Math.log10(f) - Math.log10(fMin)) / (Math.log10(fMax) - Math.log10(fMin)) * plotW;
    const yToPx = (db: number) =>
      padT + (1 - (db - dbMin) / (dbMax - dbMin)) * plotH;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(140,140,155,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let db = dbMin; db <= dbMax; db += 6) {
      const y = Math.round(yToPx(db)) + 0.5;
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
    }
    ctx.stroke();

    ctx.beginPath();
    const tickFreqs = [30, 100, 300, 1000, 3000, 10000];
    for (const f of tickFreqs) {
      const x = Math.round(xToPx(f)) + 0.5;
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + plotH);
    }
    ctx.stroke();

    ctx.font = "10px ui-monospace, SFMono-Regular, monospace";
    ctx.fillStyle = "rgba(140,140,155,0.6)";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let db = dbMin; db <= dbMax; db += 6) {
      const y = yToPx(db);
      ctx.fillText(`${db > 0 ? "+" : ""}${db}`, padL - 4, y);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (const f of tickFreqs) {
      const x = xToPx(f);
      const label = f >= 1000 ? `${f / 1000}k` : `${f}`;
      ctx.fillText(label, x, padT + plotH + 4);
    }

    const zeroY = yToPx(0);
    ctx.strokeStyle = "rgba(200,200,215,0.35)";
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(padL, zeroY);
    ctx.lineTo(padL + plotW, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    const color = COLORS[modeRef.current];
    ctx.strokeStyle = color;
    ctx.fillStyle = color.replace(/[\d.]+\)$/, "0.18)");
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < nPoints; i++) {
      const x = xToPx(freqs[i]);
      const y = yToPx(dbData[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(xToPx(freqs[nPoints - 1]), zeroY);
    ctx.lineTo(xToPx(freqs[0]), zeroY);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    for (let i = 0; i < nPoints; i++) {
      const x = xToPx(freqs[i]);
      const y = yToPx(dbData[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [mode, height]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label={`频率响应 · ${mode === "off" ? "原始" : mode === "vocal" ? "人声聚焦" : "伴奏纯净"}`}
    />
  );
}
