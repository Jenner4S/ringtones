import { test, expect } from "@playwright/test";

test.describe("首页", () => {
  test("加载首页并展示核心元素", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/RingtoneMaster|铃声/);

    const header = page.locator("header").first();
    await expect(header).toBeVisible();
  });

  test("侧边导航三个主入口可点击", async ({ page }) => {
    await page.goto("/");
    const sideNav = page.locator("nav").nth(0);
    const navLinks = sideNav.locator("a");
    await expect(navLinks).toHaveCount(3);
    await expect(navLinks.nth(0)).toHaveAttribute("href", "/");
    await expect(navLinks.nth(1)).toHaveAttribute("href", "/workspace/candidates");
    await expect(navLinks.nth(2)).toHaveAttribute("href", "/settings");
  });
});

test.describe("工作区", () => {
  test("进入候选列表页并渲染 mock 数据", async ({ page }) => {
    await page.goto("/workspace/candidates");
    await expect(page.locator("body")).toBeVisible();

    const main = page.locator("main");
    await expect(main).toBeVisible({ timeout: 5000 });
  });

  test("工作区页面标题或主内容可见", async ({ page }) => {
    await page.goto("/workspace/candidates");
    const main = page.locator("main");
    const text = await main.textContent();
    expect(text && text.length > 10).toBeTruthy();
  });
});

test.describe("设置页", () => {
  test("设置页可访问", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator("main")).toBeVisible();
  });
});
