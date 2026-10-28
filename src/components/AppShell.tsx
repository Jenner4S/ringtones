"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Music2, Settings, Search, Home, FolderOpen, Moon, Sun, ChevronRight, Command } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { FeedbackDialog } from "./FeedbackDialog";

const NAV = [
  { href: "/", label: "首页", icon: Home },
  { href: "/workspace/candidates", label: "工作区", icon: FolderOpen },
  { href: "/settings", label: "设置", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const project = useStore((s) => s.currentProject);
  const loadingLabel = useStore((s) => s.loadingLabel);
  const isLoading = useStore((s) => s._loadingCounter > 0);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useKeyboardShortcuts();

  return (
    <div className="min-h-screen">
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass rounded-[14px] px-6 py-4 flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted">{loadingLabel ?? "处理中…"}</span>
          </div>
        </div>
      )}
      <TopBar />
      <div className="mx-auto flex min-h-[calc(100vh-56px)] max-w-[1600px] gap-6 px-4 py-6 md:px-8 pb-24 lg:pb-6">
        <SideNav pathname={pathname} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <MobileTabBar pathname={pathname} />
      <FeedbackDialog floating />
    </div>
  );
}

function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
      }
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;

      if (e.key === " ") e.preventDefault();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}

function TopBar() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const router = useRouter();
  const project = useStore((s) => s.currentProject);

  return (
    <header className="sticky top-0 z-40 border-b border-app backdrop-blur-xl bg-[var(--bg-0)]/70">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-[10px] overflow-hidden">
            <div className="absolute inset-0 grad-primary opacity-90" />
            <Music2 className="relative h-4 w-4 text-[var(--bg-0)]" strokeWidth={2.6} />
          </div>
          <div className="hidden sm:block">
            <div className="font-display text-[14px] font-semibold tracking-tight leading-tight">
              RingtoneMaster
            </div>
            <div className="num-mono text-[10px] text-dim leading-tight">v4 · Agent</div>
          </div>
        </Link>

        {project && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-dim" />
            <div className="flex items-center gap-2 rounded-full glass px-3 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent-green)]" />
              <div className="text-[12px] text-muted truncate max-w-[220px]">{project.name}</div>
            </div>
          </>
        )}

        <div className="ml-auto hidden md:flex items-center gap-2">
          <button
            onClick={() => router.push("/settings")}
            className="group flex h-9 items-center gap-2 rounded-[10px] glass px-3 text-[12px] text-muted hover:text-1 transition"
          >
            <Search className="h-3.5 w-3.5" />
            <span>搜索命令</span>
            <kbd className="ml-2 flex items-center gap-0.5 rounded-md border border-app px-1.5 py-0.5 num-mono text-[10px] text-dim">
              <Command className="h-2.5 w-2.5" /> K
            </kbd>
          </button>
        </div>

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="切换主题"
          className="flex h-9 w-9 items-center justify-center rounded-[10px] glass hover:text-1 text-muted transition"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}

function SideNav({ pathname }: { pathname: string }) {
  return (
    <aside className="hidden lg:flex w-[200px] shrink-0 flex-col gap-1 sticky top-[80px] self-start">
      <div className="px-2 pb-1 pt-2 text-[10px] uppercase tracking-wider text-dim">导航</div>
      {NAV.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] transition",
              active
                ? "glass text-1"
                : "text-muted hover:text-1 hover:bg-[var(--bg-2)]"
            )}
          >
            <item.icon className={cn("h-4 w-4", active && "text-[var(--accent-cyan)]")} />
            {item.label}
          </Link>
        );
      })}

      <div className="mt-6 rounded-[12px] glass p-3">
        <div className="text-[11px] text-muted mb-2">快捷操作</div>
        <div className="space-y-1 text-[11px] text-dim">
          <div className="flex justify-between"><span>播放/暂停</span><span className="num-mono">Space</span></div>
          <div className="flex justify-between"><span>微调 10ms</span><span className="num-mono">← →</span></div>
          <div className="flex justify-between"><span>循环</span><span className="num-mono">L</span></div>
          <div className="flex justify-between"><span>导出</span><span className="num-mono">E</span></div>
        </div>
      </div>
    </aside>
  );
}

function MobileTabBar({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex lg:hidden items-center justify-around border-t border-app backdrop-blur-xl bg-[var(--bg-0)]/85 pb-[env(safe-area-inset-bottom)]">
      {NAV.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 transition",
              active ? "text-[var(--accent-cyan)]" : "text-muted"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
