import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAudioSegment } from "./useAudioSegment";

describe("useAudioSegment", () => {
  let showToast: ReturnType<typeof vi.fn>;
  let mockAudio: HTMLAudioElement;

  beforeEach(() => {
    showToast = vi.fn();
    mockAudio = new Audio();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初始状态 playhead=0 / playTokenRef=0 / audioRef=null", () => {
    const { result } = renderHook(() =>
      useAudioSegment({ showToast, url: undefined })
    );
    expect(result.current.playhead).toBe(0);
    expect(result.current.playTokenRef.current).toBe(0);
    expect(result.current.audioRef.current).toBeNull();
  });

  it("无 url 时 safePlay 返回 false 且提示音频未就绪", async () => {
    const { result } = renderHook(() =>
      useAudioSegment({ showToast, url: undefined })
    );
    let ok = true;
    await act(async () => {
      ok = await result.current.safePlay();
    });
    expect(ok).toBe(false);
    expect(showToast).toHaveBeenCalledWith("error", "音频未就绪");
  });

  it("有 url 但 audioRef 为 null 时 safePlay 返回 false", async () => {
    const { result } = renderHook(() =>
      useAudioSegment({ showToast, url: "https://example.com/audio.mp3" })
    );
    let ok = true;
    await act(async () => {
      ok = await result.current.safePlay();
    });
    expect(ok).toBe(false);
    expect(showToast).toHaveBeenCalledWith("error", "音频未就绪");
  });

  it("safePause 不抛错", () => {
    const { result } = renderHook(() =>
      useAudioSegment({ showToast, url: undefined })
    );
    expect(() => result.current.safePause()).not.toThrow();
  });

  it("seekTo 在无 audio 时不抛错", () => {
    const { result } = renderHook(() =>
      useAudioSegment({ showToast, url: undefined })
    );
    expect(() => result.current.seekTo(5)).not.toThrow();
  });

  it("seekTo 在有 audioRef 时设置 currentTime", () => {
    const { result } = renderHook(() =>
      useAudioSegment({ showToast, url: "https://example.com/audio.mp3" })
    );
    result.current.audioRef.current = mockAudio;
    act(() => {
      result.current.seekTo(5.5);
    });
    expect(mockAudio.currentTime).toBe(5.5);
  });

  it("safePlay 有 url + audioRef 时 playToken 自增并调用 audio.play", async () => {
    const playSpy = vi.spyOn(mockAudio, "play").mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAudioSegment({ showToast, url: "https://example.com/audio.mp3" })
    );
    result.current.audioRef.current = mockAudio;
    expect(result.current.playTokenRef.current).toBe(0);

    let ok = false;
    await act(async () => {
      ok = await result.current.safePlay();
    });
    expect(playSpy).toHaveBeenCalled();
    expect(result.current.playTokenRef.current).toBe(1);
    expect(ok).toBe(true);

    await act(async () => {
      ok = await result.current.safePlay();
    });
    expect(result.current.playTokenRef.current).toBe(2);
  });

  it("safePlay 播放失败时返回 false 并提示", async () => {
    vi.spyOn(mockAudio, "play").mockRejectedValue(new Error("blocked"));
    const { result } = renderHook(() =>
      useAudioSegment({ showToast, url: "https://example.com/audio.mp3" })
    );
    result.current.audioRef.current = mockAudio;

    let ok = true;
    await act(async () => {
      ok = await result.current.safePlay();
    });
    expect(ok).toBe(false);
    expect(showToast).toHaveBeenCalledWith("error", "播放失败");
  });

  it("safePlay 竞态：失败时新 token 才弹 toast", async () => {
    vi.spyOn(mockAudio, "play").mockRejectedValue(new Error("aborted"));
    const { result } = renderHook(() =>
      useAudioSegment({ showToast, url: "https://example.com/audio.mp3" })
    );
    result.current.audioRef.current = mockAudio;

    await act(async () => {
      await result.current.safePlay();
    });
    expect(result.current.playTokenRef.current).toBe(1);
    expect(showToast).toHaveBeenCalledWith("error", "播放失败");
  });

  it("whenReady 回调在 play 前被调用", async () => {
    vi.spyOn(mockAudio, "play").mockResolvedValue(undefined);
    const whenReady = vi.fn();
    const { result } = renderHook(() =>
      useAudioSegment({ showToast, url: "https://example.com/audio.mp3" })
    );
    result.current.audioRef.current = mockAudio;

    await act(async () => {
      await result.current.safePlay(whenReady);
    });
    expect(whenReady).toHaveBeenCalledWith(mockAudio);
  });

  it("URL 变化时重新加载 audio src", async () => {
    const { result, rerender } = renderHook(
      ({ url }) => useAudioSegment({ showToast, url }),
      { initialProps: { url: "https://audio.a.mp3" } }
    );
    result.current.audioRef.current = mockAudio;

    rerender({ url: "https://b.io.mp3" });
    await vi.waitFor(() => {
      expect(mockAudio.src).toContain("b.io.mp3");
    });
  });

  it("URL 未变化时不重复设置 src", async () => {
    const loadSpy = vi.spyOn(mockAudio, "load");
    const setAttributeSpy = vi.spyOn(mockAudio, "setAttribute");
    const { result, rerender } = renderHook(
      ({ url }) => useAudioSegment({ showToast, url }),
      { initialProps: { url: "https://same.mp3" } }
    );
    result.current.audioRef.current = mockAudio;

    rerender({ url: "https://same.mp3" });
    await vi.waitFor(() => {
      expect(loadSpy).not.toHaveBeenCalled();
      expect(setAttributeSpy).not.toHaveBeenCalledWith("src", "https://same.mp3");
    });
  });
});
