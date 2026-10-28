import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useStore, useFilteredCandidates } from "@/lib/store";
import { createMockProject } from "@/lib/mock";
import type { Project } from "@/lib/types";

function baseSettings() {
  return {
    theme: "dark" as const,
    language: "zh-CN" as const,
    defaultFadeIn: 80,
    defaultFadeOut: 800,
    targetLoudnessLUFS: -16,
    loopStrategy: "crossfade" as const,
    maxDuration: 30,
    candidateCount: "auto" as const,
    useGpu: false,
    useAsr: false,
  };
}

function setup() {
  const proj = createMockProject();
  localStorage.clear();
  useStore.setState({
    theme: "dark",
    settings: baseSettings(),
    projects: [proj],
    currentProject: proj,
    selectedCandidateId: proj.candidates[0]?.id,
    stageFilter: "all",
    sortBy: "score",
    viewMode: "list",
    favorites: [],
    inExport: [],
    toast: null,
    loadingLabel: null,
    _loadingCounter: 0,
  });
  return proj;
}

describe("useFilteredCandidates", () => {
  let proj: Project;

  beforeEach(() => {
    proj = setup();
  });

  it("filter=all 返回全部 candidates", () => {
    useStore.getState().setStageFilter("all");
    const { result } = renderHook(() => useFilteredCandidates());
    expect(result.current.length).toBe(proj.candidates.length);
  });

  it("filter=pass 只返回 qa.status=pass", () => {
    useStore.getState().setStageFilter("pass");
    const { result } = renderHook(() => useFilteredCandidates());
    expect(result.current.every((c) => c.qa.status === "pass")).toBe(true);
  });

  it("filter=relaxed 只返回 relaxed=true", () => {
    useStore.getState().setStageFilter("relaxed");
    const { result } = renderHook(() => useFilteredCandidates());
    expect(result.current.every((c) => c.relaxed)).toBe(true);
  });

  it("filter=fail 只返回 qa.status=fail", () => {
    useStore.getState().setStageFilter("fail");
    const { result } = renderHook(() => useFilteredCandidates());
    expect(result.current.every((c) => c.qa.status === "fail")).toBe(true);
  });

  it("sortBy=score 按分数降序", () => {
    useStore.getState().setSortBy("score");
    const { result } = renderHook(() => useFilteredCandidates());
    for (let i = 1; i < result.current.length; i++) {
      expect(result.current[i - 1].score).toBeGreaterThanOrEqual(result.current[i].score);
    }
  });

  it("sortBy=duration 按 duration 降序", () => {
    useStore.getState().setSortBy("duration");
    const { result } = renderHook(() => useFilteredCandidates());
    for (let i = 1; i < result.current.length; i++) {
      expect(result.current[i - 1].duration).toBeGreaterThanOrEqual(result.current[i].duration);
    }
  });

  it("sortBy=segment 按 segment 字母升序", () => {
    useStore.getState().setSortBy("segment");
    const { result } = renderHook(() => useFilteredCandidates());
    for (let i = 1; i < result.current.length; i++) {
      expect(result.current[i - 1].segment.localeCompare(result.current[i].segment)).toBeLessThanOrEqual(0);
    }
  });

  it("无 currentProject 返回空数组", () => {
    useStore.getState().setProject(undefined);
    const { result } = renderHook(() => useFilteredCandidates());
    expect(result.current).toEqual([]);
  });

  it("filter + sort 组合：pass + score", () => {
    useStore.getState().setStageFilter("pass");
    useStore.getState().setSortBy("score");
    const { result } = renderHook(() => useFilteredCandidates());
    expect(result.current.every((c) => c.qa.status === "pass")).toBe(true);
    for (let i = 1; i < result.current.length; i++) {
      expect(result.current[i - 1].score).toBeGreaterThanOrEqual(result.current[i].score);
    }
  });
});
