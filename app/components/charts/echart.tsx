import type { ECharts, EChartsOption } from "echarts";
import { useEffect, useRef, useState } from "react";

import { cn } from "~/lib/cn";
import { CHART_COLORS } from "./presets";

export interface EChartProps {
  option: EChartsOption;
  /** 固定高度，默认 280（SSR 与客户端同尺寸，避免布局跳动） */
  height?: number;
  className?: string;
  /** 图表可访问名，必填语义：读屏用户靠它知道这张图画什么；表格化数据由页面提供 */
  ariaLabel?: string;
  loading?: boolean;
}

/** 读取当前主题下的令牌色（客户端）；SSR 用回退值 */
function cssVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

const SERIES_VARS = [
  "--color-series-1",
  "--color-series-2",
  "--color-series-3",
  "--color-series-4",
  "--color-series-5",
  "--color-series-6",
  "--color-series-7",
  "--color-series-8",
] as const;

/**
 * ECharts 主题：文字/轴线/图例/提示框统一走令牌色，切换 .dark 后重建主题即自动跟随。
 * 只依赖令牌，不写死色值。
 */
function buildTheme(): Record<string, unknown> {
  const text = cssVar("--color-fg", "#0e1726");
  const muted = cssVar("--color-fg-muted", "#566682");
  const subtle = cssVar("--color-fg-subtle", "#8593a9");
  const line = cssVar("--color-line", "#dde4ee");
  const lineStrong = cssVar("--color-line-strong", "#c2cddd");
  const surface = cssVar("--color-surface", "#ffffff");
  const palette = SERIES_VARS.map((name, index) => cssVar(name, CHART_COLORS[index] ?? "#1f6feb"));

  const axis = {
    axisLine: { lineStyle: { color: lineStrong } },
    axisTick: { lineStyle: { color: lineStrong } },
    axisLabel: { color: muted },
    splitLine: { lineStyle: { color: line } },
    nameTextStyle: { color: subtle },
  };

  return {
    color: palette,
    backgroundColor: "transparent",
    textStyle: { color: text },
    title: { textStyle: { color: text }, subtextStyle: { color: muted } },
    legend: { textStyle: { color: muted } },
    tooltip: {
      backgroundColor: surface,
      borderColor: line,
      textStyle: { color: text },
    },
    categoryAxis: axis,
    valueAxis: axis,
    logAxis: axis,
    timeAxis: axis,
  };
}

/**
 * ECharts 客户端封装。
 * - 只在客户端初始化（动态 import + useEffect），SSR 期间渲染同尺寸骨架。
 * - ResizeObserver 跟随容器宽度、卸载 dispose()、option 变化 setOption(option, true)。
 * - 容器有 role="img" + aria-label；图表数据必须另有表格出口（页面负责 caption）。
 */
export function EChart({ option, height = 280, className, ariaLabel, loading = false }: EChartProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ECharts | null>(null);
  const latest = useRef({ option, loading });
  latest.current = { option, loading };
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let observer: ResizeObserver | null = null;
    let themeObserver: MutationObserver | null = null;
    let mod: typeof import("echarts") | null = null;

    const applyLoading = (chart: ECharts, isLoading: boolean) => {
      if (isLoading) {
        chart.showLoading("default", {
          text: "加载中…",
          color: cssVar("--color-brand", "#1f6feb"),
          textColor: cssVar("--color-fg-muted", "#566682"),
          maskColor: "transparent",
          fontSize: 12,
        });
      } else {
        chart.hideLoading();
      }
    };

    const mount = () => {
      if (!mod) return;
      chartRef.current?.dispose();
      const chart = mod.init(host, buildTheme(), { renderer: "canvas" });
      chart.setOption(latest.current.option, true);
      applyLoading(chart, latest.current.loading);
      chartRef.current = chart;
      setReady(true);
    };

    void import("echarts").then((m) => {
      if (cancelled) return;
      mod = m;
      mount();
      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(() => {
          chartRef.current?.resize();
        });
        observer.observe(host);
      }
      themeObserver = new MutationObserver(() => {
        mount();
      });
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      themeObserver?.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, true);
  }, [option]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (loading) {
      chart.showLoading("default", {
        text: "加载中…",
        color: cssVar("--color-brand", "#1f6feb"),
        textColor: cssVar("--color-fg-muted", "#566682"),
        maskColor: "transparent",
        fontSize: 12,
      });
    } else {
      chart.hideLoading();
    }
  }, [loading]);

  return (
    <div className={cn("relative w-full", className)} style={{ height }}>
      <div
        ref={hostRef}
        role="img"
        aria-label={ariaLabel ?? "图表"}
        aria-busy={loading || !ready ? true : undefined}
        className="h-full w-full"
      />
      {!ready ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-pulse rounded-lg border border-line bg-surface-2"
        />
      ) : null}
    </div>
  );
}
