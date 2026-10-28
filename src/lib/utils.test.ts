import { describe, it, expect } from "vitest";
import { cn, formatTime, formatDuration, scoreColor, easeOutExpo } from "./utils";

describe("utils — cn", () => {
  it("合并 class，忽略 falsy", () => {
    expect(cn("a", false, null, undefined, "b", 0, "c")).toBe("a b c");
  });

  it("空输入返回空", () => {
    expect(cn()).toBe("");
  });
});

describe("utils — formatTime", () => {
  it("整秒格式化为 mm:ss.s", () => {
    expect(formatTime(5)).toBe("00:05.0");
    expect(formatTime(0)).toBe("00:00.0");
  });

  it("包含分钟", () => {
    expect(formatTime(95)).toBe("01:35.0");
  });

  it("非整秒保留一位小数", () => {
    expect(formatTime(5.67)).toBe("00:05.7");
  });

  it("pad=false 不带前导 0", () => {
    expect(formatTime(5, false)).toBe("0:5.0");
  });

  it("非有限数归零", () => {
    expect(formatTime(NaN)).toBe("00:00.0");
    expect(formatTime(-10)).toBe("00:00.0");
  });
});

describe("utils — formatDuration", () => {
  it("秒数直接带一位小数 + s", () => {
    expect(formatDuration(45.2)).toBe("45.2s");
    expect(formatDuration(0)).toBe("0.0s");
  });

  it("非有限数返回破折号", () => {
    expect(formatDuration(NaN)).toBe("—");
    expect(formatDuration(Infinity)).toBe("—");
  });
});

describe("utils — scoreColor", () => {
  it(">= 80 绿色", () => {
    expect(scoreColor(95)).toBe("var(--accent-green)");
    expect(scoreColor(80)).toBe("var(--accent-green)");
  });
  it(">= 60 cyan", () => {
    expect(scoreColor(70)).toBe("var(--accent-cyan)");
    expect(scoreColor(60)).toBe("var(--accent-cyan)");
  });
  it(">= 40 amber", () => {
    expect(scoreColor(50)).toBe("var(--accent-amber)");
    expect(scoreColor(40)).toBe("var(--accent-amber)");
  });
  it("< 40 red", () => {
    expect(scoreColor(30)).toBe("var(--accent-red)");
    expect(scoreColor(0)).toBe("var(--accent-red)");
  });
});

describe("utils — easeOutExpo", () => {
  it("端点值正确", () => {
    expect(easeOutExpo(0)).toBeCloseTo(0);
    expect(easeOutExpo(1)).toBeCloseTo(1);
  });

  it("单调递增", () => {
    expect(easeOutExpo(0.5)).toBeGreaterThan(easeOutExpo(0.1));
    expect(easeOutExpo(0.9)).toBeGreaterThan(easeOutExpo(0.5));
  });
});
