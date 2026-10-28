import { test, expect } from "@playwright/test";

test("播放按钮事件链全审计", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", msg => {
    if (msg.type() === "error" || msg.type() === "warning") {
      const t = msg.text().slice(0, 200);
      if (!t.includes("404") && !t.includes("icon-192") && !t.includes("icon-512")) {
        errs.push(`[${msg.type()}] ${t}`);
      }
    }
  });
  page.on("pageerror", err => errs.push(`[pageerror] ${err.message}`));

  await page.goto("http://localhost:3000/workspace/candidates");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  await page.waitForFunction(() => {
    const a = document.querySelector("audio");
    return !!a && a.src.startsWith("blob:") && a.readyState >= 2 && !a.error;
  }, { timeout: 5000 });

  const firstGroup = await page.evaluate(() => {
    const flexContainers = Array.from(document.querySelectorAll('div[class*="flex"]'));
    for (const fc of flexContainers) {
      const circles = fc.querySelectorAll('button[class*="rounded-full"]');
      if (circles.length >= 4 && circles.length <= 6) {
        const first = circles[0];
        return Array.from(document.querySelectorAll("button")).indexOf(first as HTMLButtonElement);
      }
    }
    return null;
  });
  expect(firstGroup).not.toBeNull();
  const btnIdx = firstGroup!;

  // 1. 初始状态
  const before = await page.evaluate(() => {
    const a = document.querySelector("audio") as HTMLAudioElement;
    return { paused: a.paused, currentTime: a.currentTime };
  });
  console.log("\n[1] 初始:", before);
  expect(before.paused).toBe(true);

  // 2. Play
  await page.evaluate((idx) => {
    const all = Array.from(document.querySelectorAll("button"));
    all[idx]?.click();
  }, btnIdx);
  await page.waitForTimeout(900);

  const afterPlay = await page.evaluate(() => {
    const a = document.querySelector("audio") as HTMLAudioElement;
    return { paused: a.paused, currentTime: a.currentTime };
  });
  console.log("[2] Play:", afterPlay);
  expect(afterPlay.paused).toBe(false);
  expect(afterPlay.currentTime).toBeGreaterThan(0);

  // 3. playhead 推进
  await page.waitForTimeout(1500);
  const afterTick = await page.evaluate(() => {
    const a = document.querySelector("audio") as HTMLAudioElement;
    return { paused: a.paused, currentTime: a.currentTime };
  });
  console.log("[3] +1.5s:", afterTick);
  expect(afterTick.paused).toBe(false);
  expect(afterTick.currentTime).toBeGreaterThan(afterPlay.currentTime);

  // 4. Pause
  await page.evaluate((idx) => {
    const all = Array.from(document.querySelectorAll("button"));
    all[idx]?.click();
  }, btnIdx);
  await page.waitForTimeout(500);

  const afterPause = await page.evaluate(() => {
    const a = document.querySelector("audio") as HTMLAudioElement;
    return { paused: a.paused, currentTime: a.currentTime };
  });
  console.log("[4] Pause:", afterPause);
  expect(afterPause.paused).toBe(true);
  expect(Math.abs(afterPause.currentTime - afterTick.currentTime)).toBeLessThan(0.5);

  // 5. Resume
  await page.evaluate((idx) => {
    const all = Array.from(document.querySelectorAll("button"));
    all[idx]?.click();
  }, btnIdx);
  await page.waitForTimeout(600);

  const afterResume = await page.evaluate(() => {
    const a = document.querySelector("audio") as HTMLAudioElement;
    return { paused: a.paused, currentTime: a.currentTime };
  });
  console.log("[5] Resume:", afterResume);
  expect(afterResume.paused).toBe(false);

  if (errs.length > 0) console.log("\n[!] err/warn:", errs);
  else console.log("\n[OK] console clean");
  console.log("\n=== 播放按钮事件链审计 PASSED ===");
});
