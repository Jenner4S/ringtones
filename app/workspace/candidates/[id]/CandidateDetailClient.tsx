"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAudioUrlFallback } from "@/hooks/useAudioUrlFallback";
import { CandidateDetail } from "@/components/CandidateDetail";

export default function CandidateDetailClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const project = useStore((s) => s.currentProject);
  const selectCandidate = useStore((s) => s.selectCandidate);
  const setProject = useStore((s) => s.setProject);

  useAudioUrlFallback(project, setProject);

  const candidate = useMemo(
    () => project?.candidates.find((c) => c.id === params.id),
    [project, params.id]
  );

  useEffect(() => {
    if (candidate) selectCandidate(candidate.id);
  }, [candidate, selectCandidate]);

  if (!project) {
    return (
      <div className="glass rounded-[14px] p-8 text-center">
        <div className="text-muted">没有打开的项目</div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="glass rounded-[14px] p-8 text-center">
        <AlertTriangle className="mx-auto h-6 w-6 text-[var(--accent-amber)] mb-3" />
        <div className="text-[14px] text-1 mb-1">找不到这条候选</div>
        <div className="text-[11px] text-dim mb-4 num-mono">id: {params.id}</div>
        <button
          onClick={() => router.push("/workspace/candidates")}
          className="rounded-[10px] glass px-4 py-2 text-[12px] text-muted hover:text-1 hover:bg-[var(--bg-3)] transition"
        >
          返回列表
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full pb-8">
      <CandidateDetail
        candidate={candidate}
        peaks={project.analysis?.waveformPeaks ?? []}
        duration={project.analysis?.duration ?? 0}
      />
    </div>
  );
}
