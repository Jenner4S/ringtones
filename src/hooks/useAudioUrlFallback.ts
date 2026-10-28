"use client";

import { useEffect } from "react";
import type { Project } from "@/lib/types";
import { generateTestToneUrl } from "@/lib/testtone";

export function useAudioUrlFallback(
  project: Project | undefined,
  setProject: (p: Project | undefined) => void
) {
  useEffect(() => {
    if (!project) return;
    if (project.file && !project.file.url) {
      const url = generateTestToneUrl(project.file.duration);
      if (url) {
        setProject({ ...project, file: { ...project.file, url } });
      }
    }
  }, [project, setProject]);
}
