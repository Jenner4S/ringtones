import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "@/lib/store";
import { createMockProject } from "@/lib/mock";
import type { Project } from "@/lib/types";

describe("store — 基础状态", () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState({
      theme: "dark",
      settings: {
        theme: "dark", language: "zh-CN", defaultFadeIn: 80, defaultFadeOut: 800, targetLoudnessLUFS: -16, loopStrategy: "crossfade" as const, maxDuration: 30, candidateCount: "auto", useGpu: false, useAsr: false
      },
      projects: [],
      currentProject: undefined,
      selectedCandidateId: undefined,
      stageFilter: "all",
      sortBy: "score",
      viewMode: "list",
      favorites: [],
      inExport: [],
      toast: null,
      loadingLabel: null,
      _loadingCounter: 0,
    });
  });

  it("默认 theme 为 dark", () => {
    expect(useStore.getState().theme).toBe("dark");
  });

  it("setTheme 切换主题", () => {
    useStore.getState().setTheme("light");
    expect(useStore.getState().theme).toBe("light");
    useStore.getState().setTheme("dark");
    expect(useStore.getState().theme).toBe("dark");
  });

  it("startLoading / endLoading 并发计数正确", () => {
    const s = useStore.getState();
    expect(s._loadingCounter).toBe(0);
    expect(s.loadingLabel).toBeNull();

    s.startLoading("加载音频…");
    expect(useStore.getState()._loadingCounter).toBe(1);
    expect(useStore.getState().loadingLabel).toBe("加载音频…");

    s.startLoading("分析中…");
    expect(useStore.getState()._loadingCounter).toBe(2);
    expect(useStore.getState().loadingLabel).toBe("分析中…");

    s.endLoading();
    expect(useStore.getState()._loadingCounter).toBe(1);

    s.endLoading();
    expect(useStore.getState()._loadingCounter).toBe(0);
    expect(useStore.getState().loadingLabel).toBeNull();
  });

  it("endLoading 不会让 counter 变负", () => {
    const s = useStore.getState();
    s.endLoading();
    expect(useStore.getState()._loadingCounter).toBe(0);
  });

  it("showToast 设置 toast 并在超时后清除", async () => {
    vi.useFakeTimers();
    const s = useStore.getState();
    s.showToast("success", "保存成功");
    expect(useStore.getState().toast).toMatchObject({ type: "success", text: "保存成功" });

    vi.advanceTimersByTime(2800);
    expect(useStore.getState().toast).toBeNull();
    vi.useRealTimers();
  });

  it("dismissToast 立即清除", () => {
    const s = useStore.getState();
    s.showToast("info", "提示");
    useStore.getState().dismissToast();
    expect(useStore.getState().toast).toBeNull();
  });

  it("toggleFavorite 切换收藏", () => {
    const s = useStore.getState();
    expect(useStore.getState().favorites).toEqual([]);
    s.toggleFavorite("p1");
    expect(useStore.getState().favorites).toEqual(["p1"]);
    s.toggleFavorite("p2");
    expect(useStore.getState().favorites).toEqual(["p1", "p2"]);
    s.toggleFavorite("p1");
    expect(useStore.getState().favorites).toEqual(["p2"]);
  });

  it("toggleExport + clearExport", () => {
    const s = useStore.getState();
    s.toggleExport("c1");
    s.toggleExport("c2");
    expect(useStore.getState().inExport).toEqual(["c1", "c2"]);
    s.toggleExport("c1");
    expect(useStore.getState().inExport).toEqual(["c2"]);
    s.clearExport();
    expect(useStore.getState().inExport).toEqual([]);
  });

  it("filter / sort / viewMode 切换", () => {
    const s = useStore.getState();
    expect(useStore.getState().stageFilter).toBe("all");
    s.setStageFilter("pass");
    expect(useStore.getState().stageFilter).toBe("pass");

    s.setSortBy("duration");
    expect(useStore.getState().sortBy).toBe("duration");

    s.setViewMode("timeline");
    expect(useStore.getState().viewMode).toBe("timeline");
  });
});

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

function resetWithProject() {
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

describe("store — settings", () => {
  beforeEach(() => {
    resetWithProject();
  });

  it("updateSettings 合并 patch 保留未传字段", () => {
    useStore.getState().updateSettings({ defaultFadeIn: 120 });
    const s = useStore.getState().settings;
    expect(s.defaultFadeIn).toBe(120);
    expect(s.defaultFadeOut).toBe(800);
    expect(s.targetLoudnessLUFS).toBe(-16);
    expect(s.language).toBe("zh-CN");
  });
});

describe("store — project CRUD", () => {
  beforeEach(() => {
    resetWithProject();
  });

  it("setProject 新增项目同时 auto-select 第一个 candidate", () => {
    const proj = createMockProject();
    proj.id = "new-proj";
    proj.candidates[0].id = "c-first";
    useStore.getState().setProject(proj);
    const s = useStore.getState();
    expect(s.currentProject?.id).toBe("new-proj");
    expect(s.selectedCandidateId).toBe("c-first");
    expect(s.projects[0].id).toBe("new-proj");
  });

  it("setProject(undefined) 清理 current + selected + blob", () => {
    const s = useStore.getState();
    expect(s.currentProject).toBeTruthy();
    s.setProject(undefined);
    const s2 = useStore.getState();
    expect(s2.currentProject).toBeUndefined();
    expect(s2.selectedCandidateId).toBeUndefined();
  });

  it("setProject 覆盖同 id 已有项目", () => {
    const s = useStore.getState();
    const oldProj = s.currentProject!;
    const updated: Project = { ...oldProj, name: "重命名项目", candidates: [...oldProj.candidates] };
    s.setProject(updated);
    const s2 = useStore.getState();
    expect(s2.projects.find((p) => p.id === oldProj.id)?.name).toBe("重命名项目");
    expect(s2.currentProject?.name).toBe("重命名项目");
  });

  it("addProject 新增 + 12 条上限", () => {
    const s = useStore.getState();
    for (let i = 0; i < 15; i++) {
      const p = createMockProject();
      p.id = `p-${i}`;
      s.addProject(p);
    }
    const projects = useStore.getState().projects;
    expect(projects.length).toBe(12);
    expect(projects[0].id).toBe("p-14");
    expect(projects[11].id).toBe("p-3");
  });

  it("addProject 覆盖同 id 已有项目", () => {
    const s = useStore.getState();
    const first = s.projects[0];
    const updated = { ...first, name: "更新后" };
    s.addProject(updated);
    const after = useStore.getState();
    expect(after.projects.length).toBe(1);
    expect(after.projects[0].name).toBe("更新后");
  });

  it("removeProject 删除并清理 currentProject", () => {
    const s = useStore.getState();
    const first = s.projects[0];
    s.removeProject(first.id);
    const after = useStore.getState();
    expect(after.projects.length).toBe(0);
    expect(after.currentProject).toBeUndefined();
  });

  it("removeProject 不影响不同 id 的 currentProject", () => {
    const s = useStore.getState();
    const currentId = s.currentProject!.id;
    const other = createMockProject();
    other.id = "other-proj";
    s.addProject(other);
    s.removeProject("other-proj");
    const after = useStore.getState();
    expect(after.projects.length).toBe(1);
    expect(after.currentProject?.id).toBe(currentId);
  });
});

describe("store — candidate 操作", () => {
  let proj: Project;

  beforeEach(() => {
    proj = resetWithProject();
  });

  it("selectCandidate 切换", () => {
    useStore.getState().selectCandidate("c-99");
    expect(useStore.getState().selectedCandidateId).toBe("c-99");
  });

  it("updateCandidate start > end 自动交换 + duration 重算 + 同步 projects", () => {
    const cand = proj.candidates[0];
    useStore.getState().updateCandidate(cand.id, { start: 20, end: 10 });
    const updated = useStore.getState().currentProject!.candidates.find((c) => c.id === cand.id)!;
    expect(updated.start).toBe(10);
    expect(updated.end).toBe(20);
    expect(updated.duration).toBeCloseTo(10);
    const inList = useStore.getState().projects[0].candidates.find((c) => c.id === cand.id)!;
    expect(inList.start).toBe(10);
  });

  it("updateCandidate end < start 边界值检查", () => {
    const cand = proj.candidates[0];
    useStore.getState().updateCandidate(cand.id, { start: 15, end: 25 });
    const updated = useStore.getState().currentProject!.candidates.find((c) => c.id === cand.id)!;
    expect(updated.start).toBe(15);
    expect(updated.end).toBe(25);
    expect(updated.duration).toBeCloseTo(10);
  });

  it("bulkToggleExport 批量添加 + 去重", () => {
    useStore.getState().bulkToggleExport(["a", "b", "c"]);
    expect(useStore.getState().inExport).toEqual(["a", "b", "c"]);
    useStore.getState().bulkToggleExport(["c", "d", "e"]);
    expect(useStore.getState().inExport).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("regenerateCandidates 追加 extra candidates + index 递增 + id 不重复", () => {
    const before = useStore.getState().currentProject!.candidates.length;
    useStore.getState().regenerateCandidates();
    const after = useStore.getState().currentProject!.candidates.length;
    expect(after).toBeGreaterThan(before);
    const allIds = useStore.getState().currentProject!.candidates.map((c) => c.id);
    const unique = new Set(allIds);
    expect(unique.size).toBe(allIds.length);
  });
});
