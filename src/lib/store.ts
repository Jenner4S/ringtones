import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppSettings, Candidate, Project } from "./types";
import { createMockProject } from "./mock";
import { revokeTestToneUrl } from "./testtone";

function isBlobUrl(url?: string): url is string {
  return !!url && url.startsWith("blob:");
}

function stripBlobUrl(p?: Project): Project | undefined {
  if (!p?.file) return p;
  if (!p.file.url) return p;
  if (!isBlobUrl(p.file.url)) return p;
  return { ...p, file: { ...p.file, url: undefined } };
}

function revokeBlobUrl(url?: string) {
  if (!isBlobUrl(url)) return;
  try { URL.revokeObjectURL(url); } catch {}
  revokeTestToneUrl();
}

function revokeProjectBlob(p?: Project) {
  if (!p) return;
  revokeBlobUrl(p.file?.url);
}

interface StoreState {
  theme: "dark" | "light";
  setTheme: (t: "dark" | "light") => void;

  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;

  currentProject?: Project;
  setProject: (p?: Project) => void;

  projects: Project[];
  addProject: (p: Project) => void;
  removeProject: (id: string) => void;

  selectedCandidateId?: string;
  selectCandidate: (id: string) => void;
  updateCandidate: (id: string, patch: Partial<Candidate>) => void;
  bulkToggleExport: (ids: string[]) => void;
  regenerateCandidates: () => void;

  stageFilter: "all" | "pass" | "relaxed" | "fail";
  setStageFilter: (f: StoreState["stageFilter"]) => void;

  sortBy: "score" | "duration" | "segment";
  setSortBy: (s: StoreState["sortBy"]) => void;

  viewMode: "list" | "timeline";
  setViewMode: (v: StoreState["viewMode"]) => void;

  favorites: string[];
  toggleFavorite: (id: string) => void;

  inExport: string[];
  toggleExport: (id: string) => void;
  clearExport: () => void;

  toast: { id: number; type: "success" | "error" | "info"; text: string } | null;
  showToast: (type: "success" | "error" | "info", text: string) => void;
  dismissToast: () => void;

  loadingLabel: string | null;
  startLoading: (label?: string) => void;
  endLoading: () => void;
  _loadingCounter: number;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      theme: "dark",
      setTheme: (t) => set({ theme: t }),

      settings: {
        theme: "dark",
        language: "zh-CN",
        defaultFadeIn: 80,
        defaultFadeOut: 800,
        targetLoudnessLUFS: -16,
        loopStrategy: "crossfade",
        maxDuration: 29.99,
        candidateCount: "auto",
        useGpu: true,
        useAsr: false,
      },
      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      currentProject: createMockProject(),
      projects: [createMockProject()],
      setProject: (p) =>
        set((s) => {
          revokeProjectBlob(s.currentProject);
          if (!p) {
            return { currentProject: undefined, selectedCandidateId: undefined };
          }
          const existing = s.projects.find((x) => x.id === p.id);
          const projects = existing
            ? s.projects.map((x) => (x.id === p.id ? p : x))
            : [p, ...s.projects].slice(0, 12);
          return {
            currentProject: p,
            selectedCandidateId: p.candidates[0]?.id,
            projects,
          };
        }),
      addProject: (p) =>
        set((s) => {
          const existing = s.projects.find((x) => x.id === p.id);
          return {
            projects: existing
              ? s.projects.map((x) => (x.id === p.id ? p : x))
              : [p, ...s.projects].slice(0, 12),
          };
        }),
      removeProject: (id) =>
        set((s) => {
          const target = s.projects.find((p) => p.id === id);
          revokeProjectBlob(target);
          return {
            projects: s.projects.filter((x) => x.id !== id),
            currentProject: s.currentProject?.id === id ? undefined : s.currentProject,
          };
        }),

      selectedCandidateId: undefined,
      selectCandidate: (id) => set({ selectedCandidateId: id }),
      updateCandidate: (id, patch) =>
        set((s) => {
          if (!s.currentProject) return s;
          const candidates = s.currentProject.candidates.map((c) => {
            if (c.id !== id) return c;
            let start = patch.start ?? c.start;
            let end = patch.end ?? c.end;
            if (end < start) {
              [start, end] = [end, start];
            }
            const patched = { ...c, ...patch, start, end };
            patched.duration = end - start;
            return patched;
          });
          const updated = { ...s.currentProject, candidates };
          return {
            currentProject: updated,
            projects: s.projects.map((p) => (p.id === updated.id ? updated : p)),
          };
        }),
      bulkToggleExport: (ids) =>
        set((s) => {
          const next = new Set(s.inExport);
          ids.forEach((id) => {
            if (!next.has(id)) next.add(id);
          });
          return { inExport: Array.from(next) };
        }),
      regenerateCandidates: () =>
        set((s) => {
          if (!s.currentProject) return s;
          const extras = createMockProject().candidates.slice(0, 3).map((c, i) => ({
            ...c,
            id: `${c.id}-extra-${Date.now().toString(36)}-${i}`,
            index: s.currentProject!.candidates.length + i,
          }));
          const merged = [...s.currentProject.candidates, ...extras];
          const updated = { ...s.currentProject, candidates: merged };
          return {
            currentProject: updated,
            projects: s.projects.map((p) => (p.id === updated.id ? updated : p)),
          };
        }),

      stageFilter: "all",
      setStageFilter: (f) => set({ stageFilter: f }),

      sortBy: "score",
      setSortBy: (s) => set({ sortBy: s }),

      viewMode: "list",
      setViewMode: (v) => set({ viewMode: v }),

      favorites: [],
      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id)
            ? s.favorites.filter((x) => x !== id)
            : [...s.favorites, id],
        })),

      inExport: [],
      toggleExport: (id) =>
        set((s) => ({
          inExport: s.inExport.includes(id)
            ? s.inExport.filter((x) => x !== id)
            : [...s.inExport, id],
        })),
      clearExport: () => set({ inExport: [] }),

      toast: null,
      showToast: (type, text) => {
        const id = Date.now();
        set({ toast: { id, type, text } });
        setTimeout(() => set((s) => (s.toast?.id === id ? { toast: null } : s)), 2800);
      },
      dismissToast: () => set({ toast: null }),

      loadingLabel: null,
      _loadingCounter: 0,
      startLoading: (label) =>
        set((s) => ({
          _loadingCounter: s._loadingCounter + 1,
          loadingLabel: label ?? s.loadingLabel ?? "处理中…",
        })),
      endLoading: () =>
        set((s) => {
          const next = Math.max(0, s._loadingCounter - 1);
          return {
            _loadingCounter: next,
            loadingLabel: next === 0 ? null : s.loadingLabel,
          };
        }),
    }),
    {
      name: "ringtonemaster-v4",
      version: 3,
      partialize: (s) => ({
        theme: s.theme,
        settings: s.settings,
        favorites: s.favorites,
        projects: s.projects.map(stripBlobUrl),
        currentProject: stripBlobUrl(s.currentProject),
      }),
      migrate: (persistedState) => {
        const mock = createMockProject();
        const ps = (persistedState as Record<string, unknown>) ?? {};
        const cur = stripBlobUrl(ps.currentProject as Project | undefined) ?? mock;
        const projs = ((ps.projects as Project[]) ?? []).map(stripBlobUrl).filter(Boolean) as Project[];
        return {
          theme: (ps.theme ?? "dark") as "dark" | "light",
          settings: (ps.settings ?? {}) as AppSettings,
          favorites: (ps.favorites ?? []) as string[],
          ...ps,
          currentProject: cur,
          projects: projs.length ? projs : [mock],
        };
      },
    }
  )
);

export function useFilteredCandidates(): Candidate[] {
  const project = useStore((s) => s.currentProject);
  const filter = useStore((s) => s.stageFilter);
  const sortBy = useStore((s) => s.sortBy);
  if (!project) return [];
  let list = [...project.candidates];
  if (filter === "pass") list = list.filter((c) => c.qa.status === "pass");
  if (filter === "relaxed") list = list.filter((c) => c.relaxed);
  if (filter === "fail") list = list.filter((c) => c.qa.status === "fail");

  list.sort((a, b) => {
    if (sortBy === "score") return b.score - a.score;
    if (sortBy === "duration") return b.duration - a.duration;
    return a.segment.localeCompare(b.segment);
  });
  return list;
}


