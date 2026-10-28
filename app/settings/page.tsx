"use client";

import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { ParamSlider } from "@/components/ParamSlider";
import { AppShell } from "@/components/AppShell";

const SETTINGS_GROUPS = [
  {
    title: "分析引擎",
    items: [
      { key: "useGpu", label: "使用 GPU 加速", type: "toggle" as const },
      { key: "useAsr", label: "启用 ASR 歌词识别", type: "toggle" as const },
    ],
  },
];

export default function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h1 className="font-display text-[22px] font-semibold">设置</h1>
          <p className="text-[12px] text-dim mt-1">所有修改即时保存到本地</p>
        </div>

        <GroupCard title="外观">
          <Row title="主题">
            <div className="flex gap-2">
              {[
                { k: "dark", label: "深色" },
                { k: "light", label: "浅色" },
              ].map((t) => (
                <button
                  key={t.k}
                  onClick={() => setTheme(t.k as any)}
                  className={
                    "rounded-[10px] glass px-4 py-1.5 text-[12px] transition " +
                    (theme === t.k ? "bg-[rgba(0,229,255,0.14)] text-[var(--accent-cyan)]" : "text-muted hover:text-1")
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Row>
          <Row title="语言">
            <div className="flex gap-2">
              {[
                { k: "zh-CN", label: "简体中文" },
                { k: "en", label: "English" },
              ].map((t) => (
                <button
                  key={t.k}
                  onClick={() => update({ language: t.k as any })}
                  className={
                    "rounded-[10px] glass px-4 py-1.5 text-[12px] transition " +
                    (settings.language === t.k ? "bg-[rgba(0,229,255,0.14)] text-[var(--accent-cyan)]" : "text-muted hover:text-1")
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Row>
        </GroupCard>

        <GroupCard title="分析">
          <Row title="GPU 加速">
            <Toggle value={settings.useGpu} onChange={(v) => update({ useGpu: v })} />
          </Row>
          <Row title="ASR 歌词识别（实验）">
            <Toggle value={settings.useAsr} onChange={(v) => update({ useAsr: v })} />
          </Row>
          <Row title="声像处理">
            <div className="flex flex-wrap gap-1.5">
              {[
                { k: "off", label: "原始", hint: "保留全频段" },
                { k: "vocal", label: "人声聚焦", hint: "提取纯净人声" },
                { k: "instrumental", label: "伴奏纯净", hint: "去除人声" },
              ].map((m) => (
                <button
                  key={m.k}
                  onClick={() => update({ vocalMode: m.k as any })}
                  title={m.hint}
                  className={
                    "rounded-[8px] glass px-3 py-1.5 text-[12px] transition " +
                    (settings.vocalMode === m.k
                      ? "bg-[rgba(0,229,255,0.14)] text-[var(--accent-cyan)] ring-1 ring-[rgba(0,229,255,0.4)]"
                      : "text-muted hover:text-1 hover:bg-[var(--bg-3)]")
                  }
                >
                  {m.label}
                </button>
              ))}
            </div>
          </Row>
        </GroupCard>

        <GroupCard title="时长与响度">
          <Row title="最大时长">
            <div className="w-full max-w-full max-w-[320px]">
              <ParamSlider
                label="最大时长"
                unit="s"
                value={settings.maxDuration}
                min={15}
                max={29.99}
                step={0.1}
                onChange={(v) => update({ maxDuration: v })}
              />
            </div>
          </Row>
          <Row title="目标响度 (LUFS)">
            <div className="w-full max-w-full max-w-[320px]">
              <ParamSlider
                label="目标响度"
                unit=" LUFS"
                value={settings.targetLoudnessLUFS}
                min={-24}
                max={-12}
                step={1}
                onChange={(v) => update({ targetLoudnessLUFS: v })}
              />
            </div>
          </Row>
        </GroupCard>

        <GroupCard title="默认参数">
          <Row title="默认淡入">
            <div className="w-full max-w-[320px]">
              <ParamSlider
                label="淡入"
                unit="ms"
                value={settings.defaultFadeIn}
                min={30}
                max={300}
                step={10}
                onChange={(v) => update({ defaultFadeIn: v })}
              />
            </div>
          </Row>
          <Row title="默认淡出">
            <div className="w-full max-w-[320px]">
              <ParamSlider
                label="淡出"
                unit="ms"
                value={settings.defaultFadeOut}
                min={200}
                max={1500}
                step={50}
                onChange={(v) => update({ defaultFadeOut: v })}
              />
            </div>
          </Row>
        </GroupCard>

        <GroupCard title="循环策略">
          <Row title="默认循环">
            <div className="flex gap-2">
              {[
                { k: "crossfade", label: "Crossfade" },
                { k: "beatloop", label: "Beat Loop" },
                { k: "seamless", label: "Seamless" },
                { k: "hard", label: "Hard Cut" },
              ].map((s) => (
                <button
                  key={s.k}
                  onClick={() => update({ loopStrategy: s.k as any })}
                  className={
                    "rounded-[10px] glass px-3 py-1.5 text-[12px] transition num-mono " +
                    (settings.loopStrategy === s.k ? "bg-[rgba(0,229,255,0.14)] text-[var(--accent-cyan)]" : "text-muted hover:text-1")
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
          </Row>
        </GroupCard>

        <GroupCard title="快捷键">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[12px] text-muted">
            {[
              ["播放/暂停", "Space"],
              ["微调 10ms", "← →"],
              ["微调 100ms", "Shift + ← →"],
              ["循环试听", "L"],
              ["打开导出", "E"],
              ["命令面板", "⌘ + K"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span>{k}</span>
                <span className="num-mono text-dim">{v}</span>
              </div>
            ))}
          </div>
        </GroupCard>
      </motion.div>
    </AppShell>
  );
}

function GroupCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-[14px] p-4 shadow-card">
      <div className="font-display text-[13px] font-semibold mb-3">{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-t border-app first:border-t-0">
      <div className="text-[12px] text-muted">{title}</div>
      <div>{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={
        "relative h-6 w-11 rounded-full transition " +
        (value ? "bg-[var(--accent-cyan)]" : "bg-[var(--bg-3)]")
      }
    >
      <span
        className={
          "absolute top-0.5 h-5 w-5 rounded-full bg-[var(--bg-1)] shadow transition-all " +
          (value ? "left-[22px]" : "left-0.5")
        }
      />
    </button>
  );
}
