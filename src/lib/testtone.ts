const SR = 22050;

const _cache = new Map<number, string>();

function encodeWav(samples: Float32Array): Blob {
  const BlobCtor = (globalThis as any).Blob;
  if (!BlobCtor) throw new Error("Blob not available");
  const n = samples.length;
  const pcm = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytesPerSample = 2;
  const dataSize = n * bytesPerSample;
  const buf = new ArrayBuffer(44 + dataSize);
  const v = new DataView(buf);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  v.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, SR, true);
  v.setUint32(28, SR * bytesPerSample, true);
  v.setUint16(32, bytesPerSample, true);
  v.setUint16(34, 16, true);
  writeStr(36, "data");
  v.setUint32(40, dataSize, true);
  new Int16Array(buf, 44).set(pcm);
  return new Blob([buf], { type: "audio/wav" });
}

export function generateTestToneUrl(durationSec = 213): string {
  const cached = _cache.get(durationSec);
  if (cached) return cached;

  const total = Math.floor(SR * durationSec);
  const out = new Float32Array(total);

  const melodyNotes = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63];
  const bassNotes = [130.81, 164.81, 196.0, 130.81];
  const bpm = 132;
  const beat = 60 / bpm;
  const samplesPerBeat = Math.floor(SR * beat);

  for (let beatIdx = 0; beatIdx < Math.floor(durationSec / beat); beatIdx++) {
    const melodyFreq = melodyNotes[beatIdx % melodyNotes.length];
    const bassFreq = bassNotes[beatIdx % bassNotes.length];
    const beatStart = beatIdx * samplesPerBeat;

    for (let i = 0; i < samplesPerBeat; i++) {
      const t = i / SR;
      const sampleIdx = beatStart + i;
      if (sampleIdx >= total) break;

      const melodyEnv = Math.min(1, t * 8) * Math.pow(1 - Math.min(1, t / beat), 2);
      const melody =
        (0.22 * Math.sin(2 * Math.PI * melodyFreq * t) +
          0.08 * Math.sin(2 * Math.PI * melodyFreq * 2 * t)) *
        melodyEnv;

      const bassEnv = Math.min(1, t * 6) * Math.pow(1 - Math.min(1, t / beat), 1.5);
      const bass = 0.18 * Math.sin(2 * Math.PI * bassFreq * t) * bassEnv;

      let kick = 0;
      if (beatIdx % 4 === 0) {
        const kT = t / 0.15;
        kick = 0.6 * Math.sin(2 * Math.PI * (120 * Math.pow(1 - kT, 2)) * t) * Math.pow(1 - kT, 2);
      }

      let hat = 0;
      if (beatIdx % 2 === 1) {
        hat = 0.06 * (Math.random() * 2 - 1) * Math.pow(1 - t / 0.05, 3);
      }

      out[sampleIdx] += melody + bass + kick + hat;
    }
  }

  let peak = 0;
  for (let i = 0; i < total; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0) {
    const gain = 0.75 / peak;
    for (let i = 0; i < total; i++) out[i] *= gain;
  }

  const g = globalThis as any;
  if (!g.Blob || !g.URL?.createObjectURL) return "";
  const url = g.URL.createObjectURL(encodeWav(out));
  _cache.set(durationSec, url);
  return url;
}

export function revokeTestToneUrl(durationSec?: number) {
  if (durationSec !== undefined) {
    const url = _cache.get(durationSec);
    if (url) {
      try { URL.revokeObjectURL(url); } catch {}
      _cache.delete(durationSec);
    }
    return;
  }
  for (const [, url] of _cache) {
    try { URL.revokeObjectURL(url); } catch {}
  }
  _cache.clear();
}
