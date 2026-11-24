import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation, useMatches } from "react-router";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ChartSpline,
  FileText,
  LayoutDashboard,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Server,
  Sun,
  X,
  Zap,
} from "lucide-react";

import { cn } from "~/lib/cn";
import { formatDateTime, formatPercent } from "~/lib/format";
import { NAV_ITEMS } from "./nav";

/* ─────────────────────────── 常量与工具 ─────────────────────────── */

const THEME_KEY = "ea.theme";
const COLLAPSE_KEY = "ea.nav.collapsed";

/** 首屏主题引导：在内容绘制前给 <html> 加 .dark，避免深色用户看到白色闪屏 */
const THEME_BOOT_SCRIPT = `(function(){try{var k="${THEME_KEY}",s=window.localStorage.getItem(k),d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

type ShellMeta = {
  generatedAt: string | null;
  freshness: {
    lastReadingAt: string | null;
    deviceTotal: number;
    deviceWithReading: number;
    missingRatio: number;
  } | null;
  /** 页面的口径一行文案（模型层 caliberSummary 的输出） */
  caliberSummary: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** 从一个对象里抽 freshness / generatedAt（页面 loader 会把它放在返回值根上或 data 下） */
function metaFrom(record: Record<string, unknown>): ShellMeta | null {
  const generatedAt = typeof record.generatedAt === "string" ? record.generatedAt : null;
  const raw = record.freshness;
  if (isRecord(raw)) {
    const lastReadingAt = raw.lastReadingAt;
    const deviceTotal = raw.deviceTotal;
    const deviceWithReading = raw.deviceWithReading;
    const missingRatio = raw.missingRatio;
    if (
      (typeof lastReadingAt === "string" || lastReadingAt === null) &&
      typeof deviceTotal === "number" &&
      typeof deviceWithReading === "number" &&
      typeof missingRatio === "number"
    ) {
      return {
        generatedAt,
        freshness: { lastReadingAt, deviceTotal, deviceWithReading, missingRatio },
        caliberSummary: null,
      };
    }
  }
  const caliberSummary = typeof record.caliberSummary === "string" ? record.caliberSummary : null;
  return generatedAt || caliberSummary ? { generatedAt, freshness: null, caliberSummary } : null;
}

/**
 * 从当前匹配的路由 loaderData 中取「数据新鲜度 / 生成时间」。
 * 外壳在 root 层，拿不到页面 loader 的静态类型，因此做一次运行时收窄；
 * 兼容两种 loader 形状：字段在根上，或包在 `data` 里（总览/分析页）。
 * 页面没有这些字段（如台账、报表）时退回占位提示。
 */
function readShellMeta(data: unknown): ShellMeta | null {
  if (!isRecord(data)) return null;
  const direct = metaFrom(data);
  if (direct) return direct;
  const nested = data.data;
  return isRecord(nested) ? metaFrom(nested) : null;
}

function isActivePath(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

/** 侧栏图标：按路由映射，避免把图标塞进 NAV_ITEMS 的数据结构 */
function NavIcon({ to, className }: { to: string; className?: string }) {
  const common = { className, "aria-hidden": true } as const;
  if (to === "/") return <LayoutDashboard {...common} />;
  if (to === "/meters") return <Server {...common} />;
  if (to === "/categories") return <ChartSpline {...common} />;
  return <FileText {...common} />;
}

/* ─────────────────────────── 导航列表 ─────────────────────────── */

function NavList({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { pathname } = useLocation();

  return (
    <ul className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const active = isActivePath(pathname, item.to);
        return (
          <li key={item.to}>
            <Link
              to={item.to}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              title={collapsed ? `${item.label} · ${item.description}` : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-brand-soft font-medium text-brand"
                  : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                collapsed && "justify-center px-0",
              )}
            >
              <NavIcon to={item.to} className="size-4 shrink-0" />
              {collapsed ? (
                <span className="sr-only">{item.label}</span>
              ) : (
                <span className="min-w-0">
                  <span className="block truncate">{item.label}</span>
                  <span
                    className={cn(
                      "block truncate text-[11px] leading-4",
                      active ? "text-brand/80" : "text-fg-subtle",
                    )}
                  >
                    {item.description}
                  </span>
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/* ─────────────────────────── 品牌区 ─────────────────────────── */

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={cn(
        "flex h-14 shrink-0 items-center gap-2 border-b border-line",
        collapsed ? "justify-center px-2" : "px-4",
      )}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-brand text-brand-fg">
        <Zap className="size-4" aria-hidden="true" />
      </span>
      {collapsed ? (
        <span className="sr-only">能耗分析系统</span>
      ) : (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-fg">能耗分析系统</span>
          <span className="block truncate text-[11px] tracking-wide text-fg-subtle uppercase">
            Energy Analysis
          </span>
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────── 数据新鲜度 ─────────────────────────── */

function FreshnessPill({ meta }: { meta: ShellMeta | null }) {
  if (!meta) {
    return (
      <span className="hidden text-xs text-fg-subtle sm:inline" title="当前页面未提供数据新鲜度指标">
        数据新鲜度：—
      </span>
    );
  }

  if (!meta.freshness) {
    return (
      <span className="hidden items-center gap-1.5 text-xs text-fg-muted sm:flex">
        <span className="size-1.5 rounded-full bg-fg-subtle" aria-hidden="true" />
        {meta.caliberSummary ?? (meta.generatedAt ? `生成于 ${formatDateTime(meta.generatedAt)}` : "口径：—")}
      </span>
    );
  }

  const { lastReadingAt, deviceTotal, deviceWithReading, missingRatio } = meta.freshness;
  const stale = missingRatio >= 0.05;
  const fresh = missingRatio < 0.01;

  return (
    <span
      className="hidden items-center gap-1.5 text-xs text-fg-muted sm:flex"
      title={`最新读数：${lastReadingAt ? formatDateTime(lastReadingAt) : "无"} · 有读数设备 ${deviceWithReading}/${deviceTotal} · 缺失率 ${formatPercent(missingRatio, 2)}`}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          stale ? "bg-danger" : fresh ? "bg-success" : "bg-warning",
        )}
        aria-hidden="true"
      />
      <span className="tnum">
        数据截至 {lastReadingAt ? formatDateTime(lastReadingAt) : "无读数"}
      </span>
      <span className="hidden text-fg-subtle lg:inline">·</span>
      <span className="tnum hidden text-fg-subtle lg:inline">
        缺失 {formatPercent(missingRatio, 2)}
      </span>
    </span>
  );
}

/* ─────────────────────────── 主题切换 ─────────────────────────── */

function ThemeToggle({
  theme,
  onToggle,
  className,
}: {
  theme: "light" | "dark";
  onToggle: () => void;
  className?: string;
}) {
  const next = theme === "dark" ? "浅色" : "深色";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`切换到${next}主题`}
      title={`切换到${next}主题`}
      className={cn(
        "grid size-9 place-items-center rounded-md border border-line bg-surface text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg",
        className,
      )}
    >
      {theme === "dark" ? (
        <Sun className="size-4" aria-hidden="true" />
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}

/* ─────────────────────────── 外壳 ─────────────────────────── */

export default function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const matches = useMatches();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // 主题：读 localStorage → 应用到 <html>，切换时写回
  useEffect(() => {
    let next: "light" | "dark" = "light";
    try {
      const stored = window.localStorage.getItem(THEME_KEY);
      if (stored === "dark" || stored === "light") {
        next = stored;
      } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        next = "dark";
      }
    } catch {
      // 隐私模式下 localStorage 不可用：跟随系统即可，不阻断渲染
    }
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }, []);

  // 侧栏折叠状态持久化
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // 忽略不可用存储
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // 忽略不可用存储
    }
  };

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
    } catch {
      // 忽略不可用存储
    }
  };

  // 路由切换后关闭移动端抽屉
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  let shellMeta: ShellMeta | null = null;
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    shellMeta = readShellMeta(matches[index]?.data);
    if (shellMeta) break;
  }

  const currentLabel =
    NAV_ITEMS.find((item) => isActivePath(pathname, item.to))?.label ?? "页面";

  return (
    <div className="flex min-h-dvh bg-bg">
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-brand focus:px-3 focus:py-2 focus:text-sm focus:text-brand-fg"
      >
        跳到主内容
      </a>

      {/* 桌面侧栏：可折叠 */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 md:flex",
          collapsed ? "w-[76px]" : "w-[252px]",
        )}
      >
        <Brand collapsed={collapsed} />
        <nav aria-label="主导航" className="min-h-0 flex-1 overflow-y-auto p-2">
          <NavList collapsed={collapsed} />
        </nav>
        <div className={cn("border-t border-line p-2", collapsed && "flex justify-center")}>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-pressed={collapsed}
            aria-label={collapsed ? "展开侧边导航" : "折叠侧边导航"}
            title={collapsed ? "展开侧边导航" : "折叠侧边导航"}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-xs text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg",
              collapsed && "px-2",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="size-4" aria-hidden="true" />
            )}
            {collapsed ? null : <span>折叠导航</span>}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* 顶栏：抽屉入口 + 面包屑 + 数据新鲜度 + 主题切换 */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-surface/85 px-3 backdrop-blur-sm sm:px-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="打开导航菜单"
            className="grid size-9 place-items-center rounded-md border border-line bg-surface text-fg-muted hover:bg-surface-2 hover:text-fg md:hidden"
          >
            <Menu className="size-4" aria-hidden="true" />
          </button>

          <nav aria-label="当前位置" className="min-w-0 flex-1">
            <ol className="flex min-w-0 items-center gap-1.5 text-xs">
              <li className="hidden text-fg-subtle sm:block">能耗分析</li>
              <li aria-hidden="true" className="hidden text-line-strong sm:block">
                /
              </li>
              <li className="truncate font-medium text-fg">{currentLabel}</li>
            </ol>
          </nav>

          <FreshnessPill meta={shellMeta} />
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </header>

        <main id="main-content" className="mx-auto w-full max-w-[1440px] flex-1 px-3 py-5 sm:px-5 lg:px-8">
          {children}
        </main>
      </div>

      {/* <768px：抽屉导航（Radix Dialog 负责焦点陷阱 / Esc 关闭 / 背景不可点） */}
      <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-fg/40 backdrop-blur-[2px] md:hidden" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 flex w-[min(84vw,19rem)] flex-col border-r border-line bg-surface shadow-card md:hidden"
          >
            <DialogPrimitive.Title className="sr-only">主导航</DialogPrimitive.Title>
            <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-line pr-2 pl-4">
              <span className="flex min-w-0 items-center gap-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-brand text-brand-fg">
                  <Zap className="size-4" aria-hidden="true" />
                </span>
                <span className="truncate text-sm font-semibold text-fg">能耗分析系统</span>
              </span>
              <DialogPrimitive.Close
                aria-label="关闭导航菜单"
                className="grid size-9 shrink-0 place-items-center rounded-md border border-line bg-surface text-fg-muted hover:bg-surface-2 hover:text-fg"
              >
                <X className="size-4" aria-hidden="true" />
              </DialogPrimitive.Close>
            </div>
            <nav aria-label="主导航（移动端）" className="min-h-0 flex-1 overflow-y-auto p-2">
              <NavList collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </nav>
            <div className="flex items-center justify-between gap-2 border-t border-line p-3">
              <span className="text-xs text-fg-subtle">主题</span>
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
