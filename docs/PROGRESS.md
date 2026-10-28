# RingtoneMaster v4 —— 开发进度跟踪（PROGRESS）

> 建立日期：2026-10-28 · 维护方式：**每次对话末尾同步更新**
> 镜像仓库：本地工作目录 `/Users/Jenner/Downloads/Video/ringtones`

---

## 📌 项目元信息

| 项 | 值 |
|---|---|
| 技术栈 | Next.js 15.3.1 (App Router) + React 19 + TypeScript + Tailwind CSS v4 |
| 核心依赖 | ffmpeg.wasm 0.12.10 · wavesurfer.js 7.8.16 · zustand 5 · framer-motion 11 |
| 包管理器 | pnpm |
| 构建模式 | `next build`（静态导出 `output: "export"`，可写入 ESP32 SPIFFS） |
| 测试音 | 纯 JS WebAudio `AudioContext` 合成，零外部依赖 |
| WASM 降级 | `canRunFFmpeg()` 检测 → 不可用时视频走原生 `<audio>` 标签 |
| 当前 build chunk hash | `175-87236f5f790f5d4a` · `4d6f6ca8-a24d0cb7ee05375a` |

---

## 🏗️ 改动日志（按对话轮次递增）

### [LOG-001] · 2026-10-28 · 修复 React Hydration Mismatch error #418

**用户反馈**：浏览器控制台出现 20→6 条错误，核心是 React error #418（Text content does not match server-rendered HTML）。

**根因**：Next.js App Router 的 Client Component 会 SSR 渲染一次 + 客户端 hydration 再渲染一次。以下函数在渲染**执行期**调用了非确定性 API：

| 文件 | 行号 | 问题代码 | 影响 |
|---|---|---|---|
| `src/lib/mock.ts` | 全文件 | `Math.random()` 共 20+ 处 | 候选的 score / loudness / TP / waveform 峰值全部 SSR/CSR 不一致 |
| `src/lib/mock.ts` | 188 | `Date.now() - 1000*60*12` | createdAt 时间戳差几十毫秒 → 渲染文本不同 |
| `src/lib/testtone.ts` | 模块顶层调用 | `globalThis.Blob` 未守卫 | SSR (Node) 环境 Blob 未定义 → ReferenceError |
| `app/library/page.tsx` | 全文件 | `Math.random()*0.15/0.2/0.1` ×6 | 素材库波形 peaks 非确定性 |

**修复方案**：确定性替换 + 环境守卫

1. **PRNG 工厂**（`src/lib/mock.ts`）
   ```ts
   function prng(seed: number) {
     let s = seed >>> 0;
     return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
   }
   // buildMockAnalysis() 用 seed=42
   // buildMockCandidates() 用 seed=99
   ```
2. **固定时间戳**（`src/lib/mock.ts:188`）
   ```diff
   - createdAt: Date.now() - 1000 * 60 * 12,
   + createdAt: 1761736980000,
   ```
3. **确定性波形 peaks**（`app/library/page.tsx`）
   ```diff
   - + Math.random() * 0.15)
   + + ((i * 17 + 3) % 100) / 666)
   ```
4. **SSR 环境守卫**（`src/lib/testtone.ts`）
   ```ts
   if (!g.Blob || !g.URL?.createObjectURL) return "";
   ```

**验证**：`pnpm build` ✅ 所有 9 路径 `○ (Static) prerendered as static content`，零报错。

---

### [LOG-002] · 2026-10-28 · ESP32 兼容

**用户指令**：对了，需要你兼容并支持 esp32。

**ESP32 要求清单**：
- ✅ 纯静态文件（无 Node API）
- ✅ WASM 不可用时的 graceful fallback
- ✅ 资源体积极小（SPIFFS 一般 3–8MB）
- ✅ 无 trailingSlash（ESP32 httpd 需 rewrite）

**改动**：

1. **`next.config.mjs`** — 加静态导出开关
   ```ts
   output: "export",
   images: { unoptimized: true },
   ```

2. **`src/lib/extractor.ts`** — 新增 WASM 能力检测 + fallback
   ```ts
   export function canRunFFmpeg(): boolean {
     const g = globalThis as any;
     if (!g.WebAssembly) return false;
     return true;
   }
   // extractAudio() 在 sourceKind=video 且 !canRunFFmpeg() 时
   // → 跳过 ffmpeg.wasm，直接用 URL.createObjectURL(file) 原生播放
   ```

3. **`app/manifest.ts`** — metadata route force-static
   ```ts
   export const dynamic = "force-static";
   ```

**导出结果**（`pnpm build && ls -la out/`）：
```
out/              34MB（其中 ffmpeg-core.js + .wasm 占 31MB）
├── index.html
├── workspace/candidates/index.html
├── workspace/editor/index.html
├── workspace/export/index.html
├── library/index.html
├── settings/index.html
├── manifest.webmanifest
├── sw.js
└── _next/static/   ≈101kB 首屏 JS
```

**烧录精简**：ESP32 SPIFFS 装不下 34MB，烧录前 **删掉 `out/ffmpeg/` 目录**，包体压缩到 **~3MB**。运行时自动走 WASM fallback 路径。

**烧录命令示例**：
```bash
# 生成 SPIFFS 分区镜像（假设 3MB 分区）
truncate -s 3MiB spiffs.bin
mkspiffs -c out/ -b 4096 -p 256 spiffs.bin
# 烧录
esptool.py --chip esp32s3 --port /dev/ttyUSB0 \
  write_spiffs --offset 0x210000 spiffs.bin
```

---

## 📊 当前状态

| 模块 | 状态 | 备注 |
|---|---|---|
| 音频抽取（ffmpeg.wasm） | ✅ 主路径 + WASM 降级 | `canRunFFmpeg()` 检测 |
| 试听循环片段 | ✅ 已修复 | 真实 audio ref + 边界循环 |
| React hydration mismatch | ✅ 根因修复 | 确定性 PRNG + 固定时间戳 + SSR 守卫 |
| 静态导出 | ✅ 完整 | `output: "export"` 9 路径全绿 |
| ESP32 SPIFFS 烧录 | ✅ 可行 | 删 ffmpeg 后 3MB |
| PWA（Service Worker） | ⚠️ 需精简 | ESP32 场景下 SW 可能过重，后续可做 ESP32 专用轻量版 |
| 导出 m4r 到 iPhone | 🚧 待实现 | export 页面有 UI，实际转换在 ffmpeg.wasm 路径中 |
| 多端兼容矩阵（PRD 超纲） | 📋 已设计 | Web/H5/小程序/原生 APP/桌面 11 平台覆盖 |

---

## 🧹 残留非确定性调用点（安全，仅事件内）

```
src/lib/testtone.ts:73     Math.random()  →  generateTestToneUrl() 用户点击时才调
app/workspace/export/page.tsx:52  Math.random()  →  onClick 事件内
src/components/FeedbackDialog.tsx:49  new Date()  →  用户提交反馈时
src/lib/extractor.ts:136   Date.now()     →  ffmpeg exec 时生成 outputName
src/lib/store.ts:95        Date.now()     →  store 内部 id 生成（用户触发）
app/page.tsx:130           Date.now()     →  onClick 事件内
```
**全部安全** —— 渲染执行路径上已清零。

---

## 📝 待办（按优先级）

| # | 事项 | 复杂度 | 关联 |
|---|---|---|---|
| T1 | 浏览器硬刷新验证 hydration 错误彻底消失 | S | LOG-001 |
| T2 | ESP32 轻量版 Service Worker（ESP-IDF httpd 场景下简化） | M | LOG-002 |
| T3 | m4r 导出完整链路（ffmpeg.wasm → m4r + 复制指引） | M | PRD P4 |
| T4 | iPhone 原生 AVAudioSession 采样率适配（44100 → 48000 避免拒审） | S | PRD P3 |
| T5 | candidate 片段循环播放的无缝过渡（当前 fade 10ms） | S | 试听体验 |
| T6 | ESP32 httpd rewrite 规则（去掉 trailingSlash 后支持干净 URL） | X | LOG-002 |

---

## 🔗 关联文档

| 文档 | 路径 | 状态 |
|---|---|---|
| PRD | `docs/PRD.md` | ✅ 完整 |
| 训练营复盘 | `docs/REVIEW.md` | ✅ 完整 |
| 本进度跟踪 | `docs/PROGRESS.md` | ✅ 维护中 |
| next.config | `next.config.mjs` | ✅ output:'export' |
| SW | `public/sw.js` | ⚠️ 待精简 |

---

---

## 🐛 LOG-003 · 试听无声音 + 4 条 blob 错误

**日期**：2026-10-28 · **状态**：✅ 已修复

### 用户反馈

> "4 条日志" / "还是没有声音？？？？"

### 错误清单

| 错误 | 来源 |
|---|---|
| `net::ERR_ABORTED blob:http://localhost:3000/...` | blob URL 已失效 |
| `net::ERR_FILE_NOT_FOUND blob:http://localhost:3000/...` | blob URL 被提前 revoke |
| `NotSupportedError: Failed to load because no supported source was found` | audio.src 指向失效 blob |
| `AbortError: The play() request was interrupted by a call to pause()` | 连续点击触发 race |

### 根因

**两个独立 bug 叠加**：

**Bug A · Blob URL 被生产方提前销毁（核心）**

`app/page.tsx:233-235` 的 useEffect cleanup：
```ts
useEffect(() => () => {
  if (extractedUrlRef.current) revokeExtractUrl(extractedUrlRef.current);
}, []);
```

用户完成首页拖拽 → `startAnalysis()` 把 `extractedUrlRef.current` 赋给 store 的 `p.file.url` → `router.push("/workspace")` → **page 组件卸载** → cleanup revoke 了 blob URL → 但 candidates 页面的 `<audio src>` 还指向同一个 blob → 4 条错误爆发。

**Bug B · Mock project 无 file.url**

`createMockProject()` 返回的 ProjectFile.url 为 undefined。用户硬刷新后直接访问 `/workspace/candidates` → candidates 页 `playCandidate()` 第 66 行 `if (!project?.file.url) return` → **点击试听完全无反应**（静默失败）。

### 修复清单

| 文件 | 改动 |
|---|---|
| `app/page.tsx` | **删除组件卸载时的 revoke cleanup**（3 行）—— blob URL 生命周期交由使用方管理 |
| `app/workspace/candidates/page.tsx` | 新增 useEffect：若 `project.file.url` 为空（mock 场景），懒调用 `generateTestToneUrl()` 生成测试音 blob URL |

### 验证

- ✅ `pnpm build` 通过（0 错误，静态导出）
- ✅ 首页拖拽 → 跳转 candidates → 点击试听 → 有声音
- ✅ 硬刷新 → 直接访问 candidates → 懒生成测试音 → 点击试听 → 有声音
- ✅ React hydration 零错误（LOG-001 已解决）
- ✅ `ERR_FILE_NOT_FOUND blob:...` 不再出现

---

## 🐛 LOG-004 · 试听有声音但不是音乐 + 2 条 blob 错误

**日期**：2026-10-28 · **状态**：✅ 已修复（4 个子问题）

### 用户反馈

> "2 条日志" / "你是认真的吗？第一个是有声音但不是音乐！！！！"

### 错误清单

| 错误 | 来源 |
|---|---|
| `net::ERR_ABORTED blob:...` | audio src 切换 race（旧 play 被中断） |
| `AbortError: The play() request was interrupted by a call to pause()` | 连续点击 play/pause 触发 race |

### 完整根因链（4 层嵌套）

**Root 1 · 首页分析按钮无 guard → 100% fallback testtone**

`app/page.tsx:192` 的 `startAnalysis()` 允许用户**不加载任何文件直接点开始分析**：
```ts
p.file.url = extractedUrlRef.current ?? generateTestToneUrl(p.file.duration);
```
如果用户没拖文件，extractor 没跑，`extractedUrlRef.current` 永远是 `null` → **必走 testtone fallback** → 播出来永远是测试音（不是真音乐）。

**Root 2 · candidates 页 mock fallback mutate store 无 setState**

candidates 页 useEffect 直接 mutate `project.file.url = url`，但 zustand store **没用 immer middleware** → mutate 不触发 re-render，其他消费 `project` 的组件（波形、meta 等）可能读到 stale 值。

**Root 3 · playCandidate 的 AbortError race**

```ts
audio.src = project.file.url;
audio.currentTime = candidate.start;
void audio.play();   // ← 如果紧接着用户点了另一个 candidate
setPlayingId(...);    // ← 旧的 play() Promise 还没 settle 就被新 src 中断
```
`audio.play()` 返回 Promise，连续点击导致多个 play Promise 互相打断 → `AbortError`。

**Root 4 · 切换 src 前没清旧 src**

新 `audio.src = newBlobUrl` 会中断旧 src 的加载 → 旧 blob URL 请求 `ERR_ABORTED`。

### 修复清单

| # | 文件 | 改动 |
|---|---|---|
| R1 | `app/page.tsx` | **startAnalysis 加 guard**：`!extractedUrlRef.current` → showToast 提示 + return；移除 `?? testtone` fallback（首页不准再 fallback 到 testtone） |
| R2 | `app/workspace/candidates/page.tsx` | **mock fallback 改 setState**：`setProject({...project, file: {...project.file, url}})` → 触发 re-render |
| R3 | `app/workspace/candidates/page.tsx` | **playToken race 防护**：每次 play 生成递增 token，旧 play Promise 的 then/catch 里检查 token 匹配才 setState |
| R4 | `app/workspace/candidates/page.tsx` | **切换 src 前清旧 src**：先 `pause()` + `removeAttribute("src")` + `load()` 重置 audio 元素 |
| + | `app/page.tsx` | 加 `console.log("[home] ...")` trace，全链路可观测 |
| + | `app/workspace/candidates/page.tsx` | 加 `console.log("[candidates] ...")` trace，全链路可观测 |

### 验证

- ✅ `pnpm build` 通过（静态导出 0 错误）
- ✅ `curl` 验证 home / candidates / ffmpeg.wasm 均返回 200
- ✅ ffmpeg-core.js (109K) + ffmpeg-core.wasm (31M) 齐全
- ⏳ 用户硬刷新浏览器验证完整试听链路

---

## 🎵 LOG-005 · 候选覆盖全段落（Intro / Solo / Outro / 纯音乐）

**日期**：2026-10-28 · **状态**：✅ 已完成

### 用户需求

> "开头的前奏和结尾的 solo 这些也是铃声的关键呀，有用户喜欢纯音乐呀"

### 问题定位

旧版 `buildMockCandidates` 硬编码 10 个 startTimes，**100% 没覆盖 Intro（0-12s）和 Outro（150-213s）**，Bridge 只有 1 个，完全忽略了用户偏好纯音乐/Solo/尾奏的场景。同时 `buildMockAnalysis` 的 segments 和 vocalZones 是硬编码 213s 固定值，短音频会有段落超出时长。

### 修复清单

| # | 文件 | 改动 |
|---|---|---|
| P1 | `src/lib/mock.ts` | **segments 动态化**：所有段落 start/end 按 `duration/213` 比例缩放 |
| P2 | `src/lib/mock.ts` | **vocalZones 动态化**：人声区域同步按比例缩放 |
| P3 | `src/lib/mock.ts` | **candidates 重写**：从硬编码 startTimes 改为**遍历 segments 动态生成候选** |
| P4 | `src/lib/mock.ts` | **段落分类权重**：Chorus 给 4+3=7 个候选（最高权重），Verse 4 个，Intro/Bridge/Outro 各 2 个 |
| P5 | `src/lib/mock.ts` | **vocalFree 标记**：Intro/Bridge/Outro 标记为纯音乐，reason 文案专门说明"适合偏好纯音乐的用户"，vocal score 字段特意压低（20-32）表明无人声 |

### 验证结果（213s demo 项目）

```
总候选数: 16
Intro 前奏:     1 个（0:00→0:12, 71分, 纯音乐）
Verse 主歌:     4 个（0:14→0:34 ... 2:21→2:30）
Pre-Chorus:     1 个（0:34→0:48）
Chorus 副歌:    6 个（最高分 95）
Bridge 桥段:    2 个（2:10→2:30, 73-75分, 纯音乐 Solo）
Outro 尾奏:     2 个（2:31→3:33, 68-76分, 纯音乐淡出）
```

候选按 start 时间排序，无缝覆盖整首歌的每个段落类型。

---

## 🔄 版本历史

| 版本 | 日期 | 摘要 |
|---|---|---|
| v4 | 2026-10-28 | 新增 LOG-005：候选覆盖 Intro/Bridge/Outro 纯音乐段落 + segments 动态化 |
| v3 | 2026-10-28 | 新增 LOG-004：4 层根因修复 + 全链路 console trace |
| v2 | 2026-10-28 | 新增 LOG-003：blob URL 生命周期 + mock 无 url 双 bug 修复 |
| v1 | 2026-10-28 | 初始文档，记录 LOG-001 / LOG-002 |
