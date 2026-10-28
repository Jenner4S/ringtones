import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAudioUrlFallback } from "./useAudioUrlFallback";
import type { Project } from "@/lib/types";

vi.mock("@/lib/testtone", () => ({
  generateTestToneUrl: vi.fn((duration: number) => `blob:testtone-${duration}`),
}));

function makeProj(opts: { hasFile: boolean; hasUrl: boolean; duration?: number }): Project | undefined {
  if (!opts.hasFile) return undefined;
  return {
    id: "p1",
    name: "test",
    file: {
      id: "f1",
      name: "a.m4a",
      path: "/a.m4a",
      url: opts.hasUrl ? "/a.m4a" : undefined,
      duration: opts.duration ?? 29.9,
      sizeBytes: 1000,
      format: "M4A",
      sourceKind: "audio",
      sourceFormat: "M4A",
      sourceName: "a.m4a",
    },
    createdAt: 0,
    stage: "qa",
    completedStages: [],
    stages: [],
    analysis: { bpm: 120, duration: 30, segments: [], anchors: [], beats: [], vocalSafeZones: [], waveformPeaks: [] },
    candidates: [],
    selectedCandidateId: undefined,
    exported: [],
  };
}

describe("useAudioUrlFallback", () => {
  let generateTestToneUrl: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/lib/testtone");
    generateTestToneUrl = mod.generateTestToneUrl as unknown as ReturnType<typeof vi.fn>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("无 project 时不做任何事", () => {
    const setProject = vi.fn();
    renderHook(() => useAudioUrlFallback(undefined, setProject));
    expect(setProject).not.toHaveBeenCalled();
    expect(generateTestToneUrl).not.toHaveBeenCalled();
  });

  it("有 project.file 且已有 url 时不触发回退", () => {
    const setProject = vi.fn();
    const proj = makeProj({ hasFile: true, hasUrl: true })!;
    renderHook(() => useAudioUrlFallback(proj, setProject));
    expect(setProject).not.toHaveBeenCalled();
    expect(generateTestToneUrl).not.toHaveBeenCalled();
  });

  it("有 project.file 但 url 为空时生成 testtone 并 setProject", () => {
    const setProject = vi.fn();
    const proj = makeProj({ hasFile: true, hasUrl: false, duration: 30 })!;
    renderHook(() => useAudioUrlFallback(proj, setProject));

    expect(generateTestToneUrl).toHaveBeenCalledWith(30);
    expect(setProject).toHaveBeenCalledTimes(1);
    const updated = setProject.mock.calls[0][0] as Project;
    expect(updated.file?.url).toBe("blob:testtone-30");
  });

  it("generateTestToneUrl 返回 falsy 时不触发 setProject", () => {
    vi.mocked(generateTestToneUrl).mockReturnValueOnce("");
    const setProject = vi.fn();
    const proj = makeProj({ hasFile: true, hasUrl: false })!;
    renderHook(() => useAudioUrlFallback(proj, setProject));
    expect(setProject).not.toHaveBeenCalled();
  });

  it("project 引用不变时 effect 不重复执行（去重）", () => {
    const setProject = vi.fn();
    const proj = makeProj({ hasFile: true, hasUrl: false, duration: 10 })!;
    const { rerender } = renderHook(
      ({ p }) => useAudioUrlFallback(p, setProject),
      { initialProps: { p: proj } }
    );
    rerender({ p: proj });
    expect(setProject).toHaveBeenCalledTimes(1);
  });

  it("project 引用变化时重新评估", () => {
    const setProject = vi.fn();
    const p1 = makeProj({ hasFile: true, hasUrl: false, duration: 10 })!;
    const p2 = makeProj({ hasFile: true, hasUrl: false, duration: 20 })!;
    const { rerender } = renderHook(
      ({ p }) => useAudioUrlFallback(p, setProject),
      { initialProps: { p: p1 } }
    );
    rerender({ p: p2 });
    expect(setProject).toHaveBeenCalledTimes(2);
    expect(generateTestToneUrl).toHaveBeenCalledWith(10);
    expect(generateTestToneUrl).toHaveBeenCalledWith(20);
  });
});
