# 响应式适配规范

> **核心原则**: 用户的核心需求就是"一首歌 → 可选铃声"。所有响应式策略围绕这条路径的易用性展开 —— 手机聚焦核心操作、平板平衡信息密度、桌面全量丰富体验。
>
> **技术原则**: 纯 Tailwind CSS 断点实现，零 JS 运行时开销。断点逻辑可在浏览器 DevTools 直接验证，无需构建。

---

## 一、断点基线

采用 Tailwind 默认断点，**全应用不自定义断点值**，避免维护成本：

| 断点 | 宽度阈值 | 典型设备 | 布局模式 |
|------|---------|---------|---------|
| 默认（手机） | < 640px | iPhone SE / iPhone 13 / Pixel 5 | 单列垂直流动 + MobileTabBar |
| `sm:` | ≥ 640px | iPhone 14 Pro Max / iPad mini | 2 列 + 状态 pill |
| `md:` | ≥ 768px | iPad 10" | 完整 2 列 + 副标双行 |
| `lg:` | ≥ 1024px | iPad Air / MacBook Air | 双栏主从布局 + 隐藏 MobileTabBar |
| `xl:` | ≥ 1280px | MacBook Pro 14" | 三栏 + 侧边栏全量展开 |
| `2xl:` | ≥ 1536px | 4K 显示器 | 最大容器 1600px |

**容器最大宽度分层** (`AppShell.tsx:42`)：

```
max-w-full sm:max-w-[1000px] lg:max-w-[1300px] xl:max-w-[1500px] 2xl:max-w-[1600px]
```

---

## 二、全局设备适配层

### 2.1 iOS Safe-Area 穿透

iPhone X+ 的 Home Indicator（≈34pt 底部安全区）和刘海屏需要 `env(safe-area-inset-bottom)` 补偿。

**使用场景与计算方式**：

| 场景 | 计算公式 | 原因 |
|------|---------|------|
| **浮动 CTA**（首页 URL/剪贴板、反馈 FAB） | `bottom-[calc(env(safe-area-inset-bottom)+72px)] lg:bottom-6` | 72px = MobileTabBar 高度 (49pt) + 间距 (23px)，避开底部导航栏区域；桌面还原 24px |
| **MobileTabBar 本身** | `pb-[env(safe-area-inset-bottom)]` | TabBar 底部 padding 直接接系统值 |
| **主容器底部 padding** | `pb-[calc(env(safe-area-inset-bottom)+80px)] sm:pb-[calc(env(safe-area-inset-bottom)+96px)] lg:pb-6` | 给 TabBar + safe-area 预留空间；桌面不需要 safe-area |
| **sticky 底部操作栏** | `pb-[calc(env(safe-area-inset-bottom)+10px)]` | CandidateDetail / candidates 详情页底部按钮 |

**为什么 MobileTabBar 用 49pt？**
Apple HIG Tab Bar 标准高度是 49pt。加上 safe-area-inset-bottom 后总高度会到 83pt（iPhone 15 Pro）或 102pt（iPhone 15 Pro Max）。

### 2.2 橡皮筋滚动抑制

```
overscroll-behavior-y-contain  （AppShell 根容器）
```

防止 Safari iOS 在滚动到边界时触发整页橡皮筋效果（会让 Tab Bar 也跟着抖动）。

### 2.3 MobileTabBar 强化反馈

```
min-h-[49px] py-2.5              ← 符合 HIG 最小高度
active 态: 顶部 2px highlight + icon scale-110
```

---

## 三、视觉元素断点矩阵

### 3.1 Hero 首页

| 元素 | 手机 < sm | sm+ | md+ | 设计意图 |
|------|----------|-----|-----|---------|
| **h1 主标语** | `sm:hidden` 版本 · 单渐变 · 32px · 极简句 | `hidden sm:block` 版本 · 双渐变 · 42→52px | 同 sm | 手机收敛冗余词，桌面展现完整承诺 |
| **状态 pill** | `hidden sm:inline-flex` | 显示 | 显示 | 非核心信息，小屏优先 |
| **副标语** | 单行硬货承诺 | 单行硬货承诺 | 完整两行（Agent + 结果） | 信息密度递增 |
| **输入 tag bar** | 3 核心（音频/视频/URL） | 4 全量 | 4 全量 | 剪贴板有独立按钮，手机不重复 |
| **快捷键提示** | `hidden sm:block` | 显示 | 显示 | 无物理键盘的设备不需要 |
| **WaveformCanvas** | height=64 | height=80 | height=120 | 视觉权重递增 |

**Hero h1 两个版本的写法**：

```tsx
// 手机版 —— 极简单渐变（无 Agent 前缀，无括号说明）
<h1 className="sm:hidden text-[32px] ... from-[#00E5FF] to-[#00E5FF]/60 ...">
  一首歌，丝滑铃声一键出
</h1>

// 桌面版 —— 双渐变（Agent + 结果承诺差异化高亮）
<h1 className="hidden sm:block text-[42px] lg:text-[52px] ... from-[#00E5FF] via-[#7C5CFF] to-[#7C5CFF] ...">
  让 Agent 挑出最炸的那段
  <span className="block ... from-[#7C5CFF] via-[#00E5FF] to-[#00E5FF] ...">
    一首歌 · 一段视频 · 一个链接 → 丝滑铃声
  </span>
</h1>
```

### 3.2 RadarChart 评分雷达

| 模式 | 触发条件 | 维度 | 尺寸 | 标签 |
|------|---------|------|------|------|
| `compact` | `< sm`（手机） | 4 维：完整度 + 辨识度 + 循环 + 能量 | 180px / 220px max-w | 数值 + 中文短标签（9px） |
| full | `≥ sm`（平板/桌面） | 8 维：完整/识别/循环/能量/音色/均衡/动态/密度 | 220px（容器 280px） | 数值 + 中文标签（8.5px） |

**SVG 响应式实现** (`RadarChart.tsx`)：

```tsx
// SVG 使用 viewBox，内部坐标系固定 0-300
<svg viewBox="0 0 300 300" className="w-full h-full aspect-square">

// 外层容器用 w-full 或固定 max-w，RadarChart 自动填满
<div className="sm:hidden w-full max-w-[220px]">
  <RadarChart data={...} size={180} compact />
</div>
<div className="hidden sm:block w-[280px]">
  <RadarChart data={...} size={220} />
</div>
```

### 3.3 底部操作栏（sticky 模式）

**CandidateDetail 底部** 与 **candidates 详情页底部** 采用相同结构：

```
sticky bottom-0 z-20 -mx-3 sm:-mx-4
border-t border-app bg-[var(--bg-0)]/85 backdrop-blur-xl
px-3 sm:px-4 py-2.5 sm:py-3
pb-[calc(env(safe-area-inset-bottom)+10px)]
```

| 设备 | 列数 | 功能收敛 |
|------|------|---------|
| 手机 | `grid-cols-2` | 精修 + 收藏/导出（次要按钮隐藏） |
| ≥ sm | `grid-cols-3` | 精修 + 重新评分 + 加入导出 |
| ≥ md | `grid-cols-4` | 精修 + 重新评分 + 收藏 + 加入导出 |

### 3.4 TopBar Project Name

```
max-w-[100px] sm:max-w-[160px] md:max-w-[220px]
```

| 设备 | 实际可用宽度估算 | max-w 设置 |
|------|----------------|------------|
| iPhone SE 375px | 257px（TopBar padding + logo + Chevron + 主题按钮 ≈ 118px） | 100px 足够 |
| iPhone 14 390px | 272px | 160px |
| MacBook 1280px | ~1100px | 220px |

---

## 四、人体工学指标

严格遵循 [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) 可点击热区规范：

### 4.1 最小可点击热区

| 元素类型 | 手机（HIG 标准） | 桌面 | 实现方式 |
|---------|----------------|------|---------|
| **主要按钮** | ≥ 44 × 44 pt | ≥ 36 × 36 pt | `min-h-[44px]` 或 `py-2.5` 配合 padding |
| **返回按钮** | h-11 w-11（44pt） | h-9 w-9（36pt） | `h-11 w-11 sm:h-9 sm:w-9` |
| **Tab Bar icon** | icon 24pt + 容器 49pt | 无 Tab Bar | `min-h-[49px]` |
| **小图标按钮**（收藏、分享） | ≥ 44 × 44 | ≥ 36 × 36 | 点击区域用 padding 撑大 |
| **sticky 底部按钮** | min-h-[44px] | min-h-[44px] | Apple HIG 强制 |

### 4.2 底部操作永远吸底

> 用户的核心操作路径就是"听到了候选 → 点导出"。
>
> 如果导出按钮需要滚屏才能看到，那就是反人体工学。

**策略**：所有详情页底部 CTA 使用 `sticky bottom-0` + safe-area 补偿，永远在可见区域。

### 4.3 移动端功能收敛

> 手机上看到的功能越多，决策成本越高。核心路径上的次要元素必须收敛。

| 页面 | 手机隐藏 | 原因 |
|------|---------|------|
| Hero 首页 | 状态 pill、快捷键提示 | 非用户价值、非物理键盘 |
| candidates 详情 | 重新评分按钮 | 非核心，精修 + 导出足够 |
| CandidateDetail | 重新评分 + 收藏 | 2 vs 3 列，信息密度太高 |

---

## 五、固定 / Sticky / Bottom 元素全景

```
┌─ 首页 Hero ─────────────────────────────────────┐
│  fixed bottom-[calc(env+72px)] lg:bottom-6     │  ← URL/剪贴板 CTA
│  fixed bottom-[calc(env+72px)] lg:bottom-6     │  ← 反馈 FAB（FeedbackDialog）
└────────────────────────────────────────────────┘

┌─ AppShell 全局 ─────────────────────────────────┐
│  fixed bottom-0 pb-[env(safe)]                 │  ← MobileTabBar (lg:hidden)
│  主容器 pb-[calc(env+80px)] sm:pb-[calc(env+96px)] lg:pb-6 │
└────────────────────────────────────────────────┘

┌─ 详情页（CandidateDetail / candidates）─────────┐
│  sticky bottom-0 pb-[calc(env+10px)]           │  ← 底部操作栏
└────────────────────────────────────────────────┘
```

---

## 六、断点调试指南

在浏览器 DevTools 中手动切换以下尺寸验证所有断点层：

| 模拟设备 | 尺寸 | 验证点 |
|---------|------|--------|
| iPhone SE (3rd) | 375 × 667 | Hero h1 极简版 / RadarChart compact 4 维 / 底部 2 列 / safe-area |
| iPhone 15 Pro | 393 × 852 | 同手机断点 + 动态岛 safe-area 测试 |
| iPad mini | 744 × 1133 | sm 断点触发 / RadarChart full 8 维 / 副标双行 |
| iPad Air | 820 × 1180 | md 断点 / 双栏主从布局 |
| MacBook Air | 1280 × 800 | lg 断点 / MobileTabBar 消失 / TopBar 完整 |
| 4K 显示器 | 1920 × 1080 | 2xl / max-w-[1600px] 生效 |

**Safari iOS 专属测试**：
- Home Indicator 区域内容是否被遮挡（safe-area-inset-bottom）
- 滚动边界是否触发橡皮筋（overscroll-behavior-y-contain）
- 底部 TabBar 点击热区是否 ≥ 44pt

---

## 七、Git 提交历史

```
4072846 feat: RadarChart 响应式 + candidates 页底部 sticky + TopBar 精细化
da900c4 fix: 全应用响应式断点加固 · 人体工学优化
fb46d26 feat: Hero 响应式差异化 — 手机极简 / 桌面丰富
```

### 未做 / 后续优化

| 项目 | 原因 | 优先级 |
|------|------|--------|
| WaveformCanvas height 响应式 | 375px 屏上 height=64 视觉 OK，桌面页有独立 height=120 实例 | P2 |
| export 页 grid-cols-3/4 小屏测试 | 320px 屏上每格 ≥ 69px，num-mono 11px 字可接受 | P3 |
| editor 页底部 CTA | 结构在页面中段，不需要 sticky | — |