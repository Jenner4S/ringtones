"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseAudioSegmentOpts {
  url?: string;
  showToast: (type: "success" | "error" | "info", text: string) => void;
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
  timeThreshold?: number;
}

export function useAudioSegment(opts: UseAudioSegmentOpts) {
  const { url, showToast, onTimeUpdate, onEnded, timeThreshold = 0 } = opts;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playTokenRef = useRef(0);
  const urlLoadedRef = useRef<string | null>(null);
  const [playhead, setPlayhead] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !url) return;
    if (urlLoadedRef.current === url) return;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    audio.src = url;
    urlLoadedRef.current = url;
  }, [url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      setPlayhead(audio.currentTime);
      onTimeUpdate?.(audio.currentTime);
    };
    const onEnd = () => {
      onEnded?.();
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
    };
  }, [onTimeUpdate, onEnded]);

  const safePlay = useCallback(
    async (whenReady?: (audio: HTMLAudioElement) => void) => {
      const audio = audioRef.current;
      if (!audio || !url) {
        showToast("error", "音频未就绪");
        return false;
      }
      const token = ++playTokenRef.current;
      whenReady?.(audio);
      try {
        await audio.play();
        return playTokenRef.current === token;
      } catch {
        if (playTokenRef.current === token) {
          showToast("error", "播放失败");
        }
        return false;
      }
    },
    [url, showToast]
  );

  const safePause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = time;
  }, []);

  return {
    audioRef,
    playhead,
    playTokenRef,
    safePlay,
    safePause,
    seekTo,
    timeThreshold,
  };
}
