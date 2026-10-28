# 验收报告 — Audio Hook 抽取 / Loading Manager / 测试基础设施

> 生成时间：2026-10-28

---

## 一、验证总览

| # | 验证项 | 命令 | 结果 | 耗时 |
|---|---|---|---|---|
| 1 | TypeScript 类型检查 | `tsc --noEmit` | **exit 0 · 零错误** | <1s |
| 2 | 单元测试 | `vitest run` | **2 文件 · 24 测试全绿** | 531ms |
| 3 | E2E 端到端测试 | `playwright test` | **5 测试全绿** | 8.4s |

### 命令执行证据

```
========== [1/3] tsc --noEmit ==========
exit: 0

========== [2/3] vitest run ==========
Test Files  2 passed (2)
     Tests  24 passed (24)
  Duration  531ms

========== [3/3] playwright test ==========
Running 5 tests using 5 workers
  ✓  1  首页 › 加载首页并展示核心元素         (1.9s)
  ✓  2  首页 › 侧边导航三个主入口可点击       (1.9s)
  ✓  3  工作区 › 工作区页面标题或主内容可见   (2.7s)
  ✓  4  工作区 › 进入候选列表页并渲染 mock 数据 (2.8s)
  ✓  5  设置页 › 设置页可访问                 (2.6s)
  5 passed (8.4s)
```

---

## 二、交付清单

### 任务 1：Audio Hook 抽取与重复逻辑重构 ✅

#### 新建文件

| 文件 | 行数 | 职责 |
|---|---|---|
| `src/hooks/useAudioUrlFallback.ts` | ~20 | 封装两页共用的 testtone URL 回退逻辑 |
| `src/hooks/useAudioSegment.ts` | ~70 | 通用音频播放：safePlay/safePause/seekTo/playToken 防竞态/事件自动清理 |

#### 修改文件（重复代码消除）

| 文件 | 变化 | 说明 |
|---|---|---|
| `app/workspace/candidates/page.tsx` | **-45 行** | 删除 audioRef/playTokenRef/urlLoadedRef/timeupdate 监听/ended 监听/src 重建逻辑 |
| `app/workspace/editor/page.tsx` | **-55 行** | 同上 + 移除 generateTestToneUrl 直接调用 |

#### 架构收益
- 两页 audio 行为完全统一，改一处即全局生效
- `playTokenRef` 竞态保护、事件监听自动清理、错误 toast 统一收口
- 每页 audio 相关代码从 ~60 行压到 ~10 行 hook 调用

---

### 任务 2：全局错误边界 + Loading Manager ✅

#### 新建文件

| 文件 | 职责 |
|---|---|
| `app/error.tsx` | Next.js 全局错误边界（重试按钮 + digest 日志） |
| `app/workspace/error.tsx` | 工作区局部错误边界 |

#### 修改文件

| 文件 | 变化 |
|---|---|
| `src/lib/store.ts:62-65, 206-220` | 新增 `loadingLabel` / `_loadingCounter` / `startLoading` / `endLoading`（计数器式并发安全，归零自动隐藏，不会变负） |
| `src/components/AppShell.tsx:22-23, 33-40` | 读取 store loading 状态，全屏 overlay（backdrop-blur + spinner + 文案） |

#### 使用示例
```ts
const start = useStore(s => s.startLoading);
const end   = useStore(s => s.endLoading);

startLoading("正在分析音频…");
try { await doWork(); } finally { endLoading(); }
```

---

### 任务 3：测试基础设施 ✅

#### 新建文件

**Vitest 单元测试**
| 文件 | 说明 |
|---|---|
| `vitest.config.ts` | jsdom 环境 + `@/*` 别名 + setupFiles + coverage 配置 |
| `src/test/setup.ts` | 自动 restore mocks + 清理 storage |
| `src/lib/store.test.ts` | 8 用例：theme 切换、loading 并发计数、toast 超时/手动解除、favorites/export toggle、filter/sort/viewMode |
| `src/lib/utils.test.ts` | 16 用例：cn、formatTime、formatDuration、scoreColor 四档阈值、easeOutExpo 端点/单调性 |

**Playwright E2E**
| 文件 | 说明 |
|---|---|
| `playwright.config.ts` | 系统 Chrome (`channel: "chrome"`) + `webServer` 自动拉起 dev server |
| `e2e/smoke.spec.ts` | 5 测试：首页加载 + 导航三入口、工作区候选页渲染 + 主内容可见、设置页可访问 |

#### npm scripts（新增）

```json
"test":           "vitest run",
"test:watch":     "vitest",
"test:coverage":  "vitest run --coverage",
"test:e2e":       "playwright test",
"test:e2e:ui":    "playwright test --ui"
```

#### E2E 测试用例详情

| # | 描述 | 验证点 |
|---|---|---|
| 1 | 首页加载并展示核心元素 | title 匹配铃声关键词 + header 可见 |
| 2 | 侧边导航三个主入口可点击 | SideNav > a 元素恰好 3 个，href 依次为 / · /workspace/candidates · /settings |
| 3 | 工作区候选页渲染 mock 数据 | body 可见 + main 可见 |
| 4 | 工作区主内容非空 | main.textContent.length > 10 |
| 5 | 设置页可访问 | main 可见 |

#### 单元测试用例详情

**store.test.ts — 8 用例**
1. 默认 theme 为 dark
2. setTheme 切换主题
3. startLoading / endLoading 并发计数正确（counter 递增递减 / label 实时更新 / 归零隐藏）
4. endLoading 不会让 counter 变负
5. showToast 设置 toast 并在 2800ms 后自动清除（fake timers）
6. dismissToast 立即清除
7. toggleFavorite 切换收藏
8. toggleExport + clearExport

**utils.test.ts — 16 用例**
- cn：合并 class 忽略 falsy / 空输入
- formatTime：整秒 mm:ss.s / 包含分钟 / 非整秒一位小数 / pad=false 不带前导 0 / 非有限数归零
- formatDuration：秒数 + s / 非有限数破折号
- scoreColor：>=80 green / >=60 cyan / >=40 amber / <40 red
- easeOutExpo：端点 0→1 / 单调递增

---

## 三、最终产物文件树

```
src/hooks/
├── useAudioUrlFallback.ts          # 新建
└── useAudioSegment.ts               # 新建

src/lib/
├── store.ts                         # 扩展 loading manager
├── store.test.ts                    # 新建（8 tests）
├── utils.ts                         # 未改动
└── utils.test.ts                    # 新建（16 tests）

src/components/
└── AppShell.tsx                     # 加 loading overlay

src/test/
└── setup.ts                         # 新建

app/
├── error.tsx                        # 新建（全局错误边界）
└── workspace/
    ├── error.tsx                    # 新建（局部错误边界）
    ├── candidates/page.tsx          # 重构：-45 行
    └── editor/page.tsx              # 重构：-55 行

vitest.config.ts                     # 新建
playwright.config.ts                 # 新建
tsconfig.json                        # 加 exclude 测试 + vitest/globals types
package.json                         # 加 5 个 test scripts + 6 个 devDeps
```

---

## 四、零回归确认

| 维度 | 状态 |
|---|---|
| TypeScript 严格模式 | ✅ 零错误 |
| Next.js 15 build（10 页） | ✅ 全编译通过（前序已验证） |
| 单元测试 | ✅ 24/24 绿 |
| E2E 测试 | ✅ 5/5 绿 |
| 重复代码 | ✅ 两页 audio 逻辑统一收敛到 2 个 hook |
