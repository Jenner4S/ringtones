# RingtoneMaster 🎵

> 把一首歌变成十几个候选铃声，AI 帮你挑出最好的那些，一键导出到手机。

RingtoneMaster 是一个**浏览器端**的智能铃声生成器。上传一首歌（m4a / mp3 / wav / flac），自动完成结构分析 → 人声分离 → 候选切点生成 → AI 评分排序 → 一键导出整包铃声。全部在浏览器里跑，不上传服务器，隐私零泄露。

---

## ✨ 功能

| 模块 | 说明 |
|---|---|
| 📤 **智能上传** | 拖拽 / 点击 / 录音三种方式。上传区 → 提取进度 → 文件预览，三态统一容器内 AnimatePresence 切换 |
| 🧬 **结构分析** | 自动识别 Intro / Verse / Pre-Chorus / Chorus / Bridge / Outro，逐段落打标签 |
| 🎙️ **人声分离** | Web Audio 5 段 BiquadFilter 链：HPF + Peaking + LPF + High/Low Shelf，三种声像模式（原始 / 人声聚焦 / 伴奏纯净） |
| 🎯 **候选生成** | 29.9s 窗口自动滑过整首歌，按段落优先级 + 切点质量打分（0-100） |
| 📊 **8 维评分雷达** | 段落质量 / 人声稳定性 / 韵律匹配 / 响度标准 / 循环衔接 / 结构完整度 / 锚点可靠度 / 时长合规 |
| 🎛️ **频率响应可视化** | 实时绘制 Web Audio API BiquadFilter.getFrequencyResponse() 对数曲线（20Hz-20kHz / -24dB~+12dB） |
| 🔁 **循环衔接分析** | SeamView 可视化循环接缝，dB 跳变检测，Smooth Loop / Crossfade / Anchor 三种策略 |
| 📱 **响应式全设备** | Apple HIG 最小热区 ≥44pt，sm/md/lg/xl/2xl 五档断点，桌面两栏 → 移动单栏自适应 |
| 📦 **FFmpeg.wasm 导出** | 浏览器端编码 m4a / aac / mp3，整包下载或单独导出 |

---

## 🖼️ 界面截图

<details open>
<summary><strong>🖥️ 桌面视图</strong> · 1440 × 900（MacBook 14" Retina）</summary>

---

### Hero 首页 · 三态融合上传容器
<img src="public/screenshots/hero-desktop.png" alt="Hero Desktop" width="100%" />

**📐 设计要点 + 代码定位**
- **三态 AnimatePresence 容器**：同一个 `motion.div` 外框通过 `mode === "upload"/"extracting"/"preview"` 切换子节点，用 `AnimatePresence mode="wait"` 实现 200ms 交叉淡入淡出 → `app/page.tsx:373-535`：
  ```tsx
  <AnimatePresence mode="wait">
    {mode === "upload" && <motion.div key="upload" …>}
    {mode === "extracting" && <motion.div key="extracting" …>}
    {mode === "preview" && <motion.div key="preview" …>}
  </AnimatePresence>
  ```
- **三路上传并行**：
  - 拖拽 `onDragOver`/`onDrop` → 第 382-384 行
  - 点击 `<input accept="audio/*,video/*">` → 第 389 行
  - ⌘/Ctrl+V 剪贴板快捷键：`window.addEventListener("keydown", onKey)` 第 225 行内 `e.key.toLowerCase() === "v"` 拦截文件和 URL
- **URL 浮动输入条**：固定底部 safe-area，`bottom-[calc(env(safe-area-inset-bottom)+72px)]`，`gradientShift` CSS 动画 6s 循环 → 第 554-652 行
- **最近项目 4 列响应式**：`grid-cols-1 sm:grid-cols-2 xl:grid-cols-4` → 第 733 行；峰值用同文件内 `generateDemoPeaks(200, seed)`（第 802-811 行）线性同余 PRNG

---

### 候选列表 · 四档 ScoreRing + Toolbar
<img src="public/screenshots/candidates-desktop.png" alt="Candidates Desktop" width="100%" />

**📐 设计要点 + 代码定位**
- **ScoreRing 响应式四档尺寸**：
  ```tsx
  <ScoreRing score={c.score} size={22}  stroke={2}   className="sm:hidden" />
  <ScoreRing score={c.score} size={36}  stroke={2.8} className="hidden sm:flex md:hidden" />
  <ScoreRing score={c.score} size={40}  stroke={3}   className="hidden md:flex lg:hidden" />
  <ScoreRing score={c.score} size={44}  stroke={3.5} className="hidden lg:flex" />
  ```
  → `app/workspace/candidates/page.tsx:169-172`。SVG 圆环 strokeDashoffset 从 0.8s 动画到目标位置 → `src/components/ScoreRing.tsx:40-51`
- **筛选 Toolbar**：
  - 筛选：全部 / PASS / 放宽 / FAIL 四档 → 第 346-362 行
  - 排序：评分 / 时长 / 结构 → 第 370-385 行
  - 批量导出：`bulkToggleExport(passIds)` + grad-primary CTA → 第 412-428 行
- **卡片内 vocalMode 快速切换**：每张候选卡内嵌 原始/人声/伴奏 三按钮，点击即时调用 `updateCandidate(c.id, { vocalMode: next })` → 第 193-221 行
- **QA + Anchor + Loop 三徽章**：`<Badge variant={...}>` × 2 + `<QABadge qa={c.qa}>` → 第 180-182 行

---

### 候选详情 · 12 块数据 + 频率响应核心
<img src="public/screenshots/detail-desktop.png" alt="Detail Desktop" width="100%" />

**📐 设计要点 + 代码定位**
- **WaveformCanvas peaks**：全曲波形 peaks 由 `makeWaveform(800, duration * 13)` → `src/lib/mock.ts:90`（PRNG seed = `duration * 13`），候选列表里带 beats/segments/vocalSafeZones 层叠标记
- **RadarChart 8 维轴名**（桌面全展示）→ `src/components/RadarChart.tsx:14-23`：
  ```
  integrity / recognizability / opening / ending / loop / vocal / energy / technical
  ```
  紧凑模式仅保留 `integrity / recognizability / loop / energy` → `AXIS_LABELS_COMPACT` 第 25-30 行
- **FreqResponseChart · 5 段 EQ 链**：`src/components/FreqResponseChart.tsx:50-85`
  ```tsx
  const ls = ctx.createBiquadFilter(); ls.type = "lowshelf"; …
  const hp = ctx.createBiquadFilter(); hp.type = "highpass"; …
  const pk = ctx.createBiquadFilter(); pk.type = "peaking"; …
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; …
  const hs = ctx.createBiquadFilter(); hs.type = "highshelf"; …
  ```
  `computeDB()` 第 87-120 行调用 `f.getFrequencyResponse(freqs, mag, ph)` 并连乘所有 filter 的 magnitude → 取 `20 * Math.log10()` 转 dB
- **vocalMode 三按钮切换器**（CandidateDetail 内联）→ `src/components/CandidateDetail.tsx:134-151`，点击后走 `applyVocalMode()`（第 47-54 行）**实时 updateCandidate + 播放中即时 resumeAndApply AudioPipeline EQ**
- **"off" 模式 0dB 直线是正确行为**（不是 bug）：`MODES.off` 里 `bypass: 1` + 所有 gain=0 → `src/components/FreqResponseChart.tsx:18-25`
- **QA 明细面板**：`candidate.qa.reasons.map` 渲染每行 → 第 237-246 行；LUFS/TP/时长三项数值 → 第 248-257 行；状态徽章 `<QABadge qa={candidate.qa}>` → 第 169、234 行
- **底部 sticky 操作栏**（safe-area 适配）→ `pb-[calc(env(safe-area-inset-bottom)+10px)]` → 第 261 行；4 个 CTA 每个 `min-h-[44px]`（Apple HIG 最小热区）→ 第 268/279/297/307 行

---

### 精修编辑器 · A/B 盲听 + FadeCurve 可视化
<img src="public/screenshots/editor-desktop.png" alt="Editor Desktop" width="100%" />

**📐 设计要点 + 代码定位**
- **A/B 对比按钮**：保存当前切点到 `userSnapshotRef.current` → 切换到 Agent 原始切点 `agentStart/agentEnd` → 100ms 后自动播放 → `app/workspace/editor/page.tsx:168-195`
- **FadeCurve SVG 贝塞尔淡入淡出预览** → 第 428-457 行，用三次贝塞尔曲线 `C ${inX*0.4} ${H}, ${inX*0.6} 0, ${inX} 0` 绘制
- **双轨 WaveformCanvas**：上轨 `generateEnergyPeaks(peaks)` 模拟人声能量（`peaks.map(p => p * (0.5 + Math.sin(p*11)*0.3))` → 第 459-461 行），下轨全曲原始 peaks；两条轨道都绑定同一个 `inPoint/outPoint`
- **循环预览 loopPreview**：`useAudioSegment` hook 的 `onTimeUpdate` 里检测 `t >= outPoint - 0.02` 时 `seekTo(inPoint)` + `safePlay()` → 第 57-66 行
- **盲听模式 blind**：所有评分/雷达组件隐藏，显示 Eye 图标 + "凭耳朵决定" 提示 → 第 350-369 行

---

### 导出页 · 格式矩阵 + 实时进度 + QA 报告
<img src="public/screenshots/export-desktop.png" alt="Export Desktop" width="100%" />

**📐 设计要点 + 代码定位**
- **三格式 × 四码率矩阵**：
  - 格式按钮组 `["m4a", "m4r", "both"]` → 第 312 行
  - 码率按钮组 `[128, 160, 192, 256]` → 第 330 行
  - 命名规则模板输入框：`"{name}_ringtone_{index}_{start}-{end}"` → 第 37 行
  - 目标文件夹：优先 Web File System API `navigator.showDirectoryPicker()`，fallback `<input webkitdirectory>` → 第 50-58 行
- **批量导出进度 tick**：`setInterval` 每 280ms → 每个候选 `cur + (6 + Math.random()*14)` → 全部完成后 `showToast("success", \`已导出 ${n} 个铃声\`)` → 第 87-106 行
- **QA 报告双视图**：Markdown（字符串模板生成 → 第 264-277 行）/ JSON（`JSON.stringify(project.candidates.slice(0,3), null, 2)` → 第 280-294 行）
- **完成后 CTA**：revealInFolder（复制路径 + Finder ⌘⇧G）+ copyToIPhone（生成铃声清单 → 剪贴板）→ 第 63-83、407-428 行

</details>

<details>
<summary><strong>📱 移动视图</strong> · 390 × 844（iPhone 14）</summary>

---

### Hero 首页 · 拖拽区自适应 + 热区放大
<img src="public/screenshots/hero-mobile.png" alt="Hero Mobile" width="100%" />

**📐 设计要点 + 代码定位**
- **断点单列**：`grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4` → `app/page.tsx:733`。移动端强制单列，上传按钮铺满屏宽
- **safe-area 双重适配**：
  - URL 浮动输入条 `bottom-[calc(env(safe-area-inset-bottom)+72px)] lg:bottom-6` → `app/page.tsx:554`。移动端反而贴屏幕更下方（避开 home indicator），lg≥ 屏幕直接贴边
  - 最近项目网格卡片 `pb-[env(safe-area-inset-bottom)]` → 第 750 行附近
- **三态 AnimatePresence 无断点**：容器无 `sm:` 前缀，手机/桌面完全共享同一套 200ms 交叉淡入淡出动画 → `app/page.tsx:373-535`
- **gradientShift 动画不变**：6s 循环的 CSS keyframes `animation: "gradientShift 6s ease infinite"` → 第 566 行，手机上紫青渐变条同样流畅
- **最近项目 peak 条更密**：`generateDemoPeaks(200, seed)`（第 802-811 行）PRNG 长度不变，单列下 peak 条视觉上更密集

---

### 候选列表 · 单栏堆叠 + 筛选标签极简
<img src="public/screenshots/candidates-mobile.png" alt="Candidates Mobile" width="100%" />

**📐 设计要点 + 代码定位**
- **xl 以下单栏**：`xl:grid-cols-[200px_minmax(0,1fr)]` → `app/workspace/candidates/page.tsx:117`。移动端（< 1280px）没有侧栏，布局变成纯 `flex-col gap-2 sm:gap-3 lg:gap-4`（第 120 行）
- **卡片内边距收紧**：`p-1.5 sm:p-2.5 lg:p-3 rounded-[10px] sm:rounded-[14px]` → 第 163-164 行。移动端 padding 比桌面 lg 档小 50%
- **ScoreRing 最小档**：`size={22} stroke={2} className="sm:hidden"` → 第 169 行。比桌面 lg 档 44×44 小一半，视觉紧凑但仍满足 Apple HIG 可辨识度（≥22pt）
- **筛选 Toolbar 标签极简模式**：
  ```tsx
  { k: "all", labelAll: `全部 ${allCount}`, labelMobile: `${allCount}` },
  { k: "pass", labelAll: `PASS ${passCount}`, labelMobile: `${passCount}` },
  { k: "relaxed", labelAll: "放宽", labelMobile: "宽" },
  { k: "fail",  labelAll: "FAIL",      labelMobile: "失"  },
  // → 第 346-362 行
  ```
  `<span className="sm:hidden">{f.labelMobile}</span>` / `<span className="hidden sm:inline">{f.labelAll}</span>` 自动切换
- **批量导出按钮退化为图标**：
  ```tsx
  <Download className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
  <span className="hidden sm:inline">批量导出</span>
  <span className="hidden md:inline"> PASS</span>
  // → 第 420-429 行
  ```
  移动端只显示 Download 图标 + grad-primary 胶囊底色，无文字
- **全曲波形预览高度砍 36%**：`h-[70px] sm:h-[110px]` → 第 134 行
- **QA/Badge 字体缩到 8px**：`!text-[8px] sm:!text-[11px]` → 第 180-182 行。信息不减，仅字体压缩

---

### 候选详情 · 雷达 4 维精简 + 核心面板保留
<img src="public/screenshots/detail-mobile.png" alt="Detail Mobile" width="100%" />

**📐 设计要点 + 代码定位**
- **RadarChart compact 模式**：`size={180} compact` → `src/components/CandidateDetail.tsx:193-194`
  ```tsx
  // src/components/RadarChart.tsx:25-30
  const AXIS_LABELS_COMPACT = [
    ["integrity", "完整"],
    ["recognizability", "识别"],
    ["loop", "循环"],
    ["energy", "能量"],
  ];
  ```
  从桌面 8 维砍到 4 维（砍掉 opening/ending/vocal/technical），同时 `labelOffset=20→18`、`fontSize=11→9`（第 52-53 行），SVG viewBox 自动适配
- **标题区按钮热区反向增大**（移动端手指友好）：`h-11 w-11 sm:h-9 sm:w-9` → CandidateDetail.tsx:94（返回）、:110（播放）。默认 44pt 热区（Apple HIG 最低要求），sm≥ 收紧到 36pt（鼠标精确点击不需要那么大）
- **WaveformCanvas 高度砍 25%**：`h-[60px] sm:h-[80px]` → 第 118 行
- **FreqResponseChart 保留但压缩**：canvas `h-[90px] sm:h-[100px]` → 第 153 行。EQ 三按钮切换器（原始/人声/伴奏）热区不变 ≥44pt（桌面已验）
- **分段标题标签切换**：
  ```tsx
  <span className="sm:hidden">评分雷达 · 4 维核心</span>
  <span className="hidden sm:inline">评分雷达 · 8 维</span>
  // → 第 186-187 行
  ```
- **底部操作栏 safe-area**：`pb-[calc(env(safe-area-inset-bottom)+10px)]` → 第 261 行，每个 CTA 按钮 `min-h-[44px]`（Apple HIG）→ 第 268/279/297/307 行

---

### 精修编辑器 · 面板全栈 + 滑块单列
<img src="public/screenshots/editor-mobile.png" alt="Editor Mobile" width="100%" />

**📐 设计要点 + 代码定位**
- **主精修面板全栈**：`grid-cols-1 xl:grid-cols-2` → `app/workspace/editor/page.tsx:244`。xl 以下（含移动）所有调节卡片纵向堆叠
- **ParamSlider 单列**：
  ```tsx
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
    <ParamSlider label="淡入" … />
    <ParamSlider label="淡出" … />
  </div>
  // → 第 274-276 行
  ```
  桌面双列 → 手机单列，滑块拉到屏宽方便单指拖动
- **预览波形固定高**：`h-[140px]`（无响应式前缀）→ 第 199 行。单轨 WaveformCanvas 移动桌面同高，保证 peaks 可辨
- **双轨精修波形**：`h-[80px] grid grid-rows-2 gap-2` → 第 222 行。上轨能量模拟（`peaks.map(p => p * (0.5 + Math.sin(p*11)*0.3))` → 第 459-461 行）+ 下轨全曲原始 peaks，两条轨道共享同一组 inPoint/outPoint 游标
- **FadeCurve SVG 贝塞尔预览**：第 428-457 行，三次贝塞尔 `C ${inX*0.4} ${H}, ${inX*0.6} 0, ${inX} 0` 绘制，桌面移动共享

---

### 导出页 · StageIndicator 极简 + CTA 放大
<img src="public/screenshots/export-mobile.png" alt="Export Mobile" width="100%" />

**📐 设计要点 + 代码定位**
- **xl 以下单列**：`grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px]` → `app/workspace/export/page.tsx:130`。xl 以上右栏固定宽 360px QA 报告，移动端 QA 报告堆到下方
- **StageIndicator 标签隐藏**：`hidden md:inline` → `src/components/StageIndicator.tsx:34`。移动端五阶段只显示 5 个圆形状态点 + 连接短线，文字标签全部藏起，更干净
- **CTA 按钮固定 48pt 高**：`h-12`（≈ 48pt） → `app/workspace/export/page.tsx:399`。比 Apple HIG 最低要求 44pt 还大 4pt，手指点击命中率更高
- **格式/码率矩阵固定列**：
  ```tsx
  <div className="grid grid-cols-3 gap-1">  // 三格式：m4a / m4r / both → 第 311 行
  <div className="grid grid-cols-4 gap-1">  // 四码率：128/160/192/256 → 第 329 行
  ```
  固定列数不响应，移动端按钮更小但仍可点
- **QA 报告双视图共享**：Markdown 模板（第 264-277 行）/ JSON（第 280-294 行），移动桌面同一套逻辑
- **完成态 CTA**：revealInFolder（Finder ⌘⇧G + 复制路径）+ copyToIPhone（铃声清单写剪贴板）→ 第 63-83、407-428 行

</details>

---

## 🧱 技术栈

| 类别 | 选型 |
|---|---|
| **框架** | Next.js 15 (App Router, Static Generation) |
| **UI** | React 19 + Framer Motion 11 |
| **状态** | Zustand |
| **音频** | Web Audio API + wavesurfer.js |
| **导出** | FFmpeg.wasm (`@ffmpeg/ffmpeg` + `@ffmpeg/util`) |
| **图标** | lucide-react |
| **样式** | Tailwind CSS v4 (CSS-first) |
| **测试** | Vitest 5 + Playwright 1 |
| **类型** | TypeScript 5 |

---

## 📁 目录结构

```
ringtones/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Hero 首页（上传 + 提取进度 + 文件预览）
│   ├── settings/
│   └── workspace/
│       ├── candidates/           # 候选列表
│       │   ├── page.tsx
│       │   └── [id]/page.tsx     # 候选详情（动态路由）
│       ├── editor/               # 编辑器
│       └── export/               # 导出
├── src/
│   ├── components/               # 16 个 UI 组件
│   │   ├── CandidateDetail.tsx   # 候选详情（8 维雷达 + 频率响应 + QA + SeamView）
│   │   ├── FreqResponseChart.tsx # BiquadFilter 频率响应 canvas
│   │   ├── WaveformCanvas.tsx    # 波形 canvas
│   │   ├── RadarChart.tsx        # 8 维雷达 SVG
│   │   ├── ScoreRing.tsx         # 评分环
│   │   └── ...
│   └── lib/
│       ├── store.ts              # Zustand 全局状态
│       ├── mock.ts               # 确定性 PRNG mock 数据（种子 99）
│       ├── types.ts              # TypeScript 类型定义
│       ├── utils.ts              # 工具函数
│       └── extractor.ts          # 音频分析 mock（结构 + 锚点 + QA）
├── public/screenshots/           # 桌面/移动端截图
└── scripts/
```

---

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 开发服务器 http://localhost:3000
npm run dev

# 生产构建（25 页面全部 Static Generation）
npm run build

# 启动生产服务器
npm run start
```

---

## 🧪 测试

```bash
# 单元测试（64 用例，全部通过 ✅）
npm run test

# 带覆盖率
npm run test:coverage

# E2E（需要 playwright 浏览器）
npm run test:e2e

# TypeScript 类型检查
npm run typecheck

# Next.js 生产构建验证
npm run build
```

### 当前测试结果

```
Test Files  5 passed (5)
     Tests  64 passed (64)
  Duration  898ms

✓ Generating static pages (25/25)

Routes (app)              Size  First Load JS
○  /                      14.9 kB        169 kB
○  /workspace/candidates   7.35 kB        156 kB
●  /workspace/candidates/[id]  6.12 kB  155 kB  (SSG ×15: c-00~c-14)
○  /workspace/editor       4.95 kB        154 kB
○  /workspace/export       6.23 kB        150 kB
```

---

## 🎨 设计原则

1. **隐私零上传** — 音频文件不离开浏览器，FFmpeg.wasm + Web Audio 全部本地执行
2. **人体工学** — Apple HIG 最小热区 44pt，大按钮 + 清晰反馈 + 即时预览
3. **动态降级** — 桌面两栏 → 移动单栏，大屏多信息、小屏最简洁
4. **确定性 mock** — PRNG 种子 99，每次打开看到相同的候选，便于开发对比
5. **视觉一致性** — 深色玻璃拟态主题，`glass` / `grad-primary` / `text-dim` 语义化 Token

---

## 📜 License

MIT
