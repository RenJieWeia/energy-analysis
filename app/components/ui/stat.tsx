import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { ComponentProps } from "react";

/** 对比口径：同比 / 环比 */
export type DeltaKind = "yoy" | "mom";
import { cn } from "~/lib/cn";

export type StatTone = "neutral" | "brand" | "success" | "warning" | "danger";

const TONE_CLASS: Record<StatTone, string> = {
  neutral: "text-fg",
  brand: "text-brand",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

export interface StatProps extends ComponentProps<"div"> {
  /** 指标名，如「总能耗」 */
  label: string;
  /** 已格式化的数值文本（页面用 formatNumber 等生成，不要在此重复格式化） */
  value: string;
  /** 单位，如 kWh */
  unit?: string;
  /** 变化率（percent）。null/undefined = 无基期，显示「—」 */
  delta?: number | null;
  /** 对比口径：同比 / 环比 */
  deltaKind?: DeltaKind;
  /** 样本量：参与统计的设备数或读数条数，必填（百分比必须附样本量） */
  sampleSize: number;
  /** 口径说明（必填），如「口径：全部电表 · 日粒度」，直接写 ui-extension 第 7.1 节原句 */
  formula: string;
  /** 迷你趋势，≤12 点，仅作形状提示 */
  spark?: number[];
  /** 数值主色 */
  tone?: StatTone;
  /**
   * 变化方向的好坏约定。能耗/成本类默认越低越好（上升=危险色），
   * 「完成率」「覆盖率」类指标传 higher-is-better。
   */
  deltaPolarity?: "lower-is-better" | "higher-is-better";
}

const DELTA_LABEL: Record<DeltaKind, string> = { yoy: "同比", mom: "环比" };

/** 千分位（避免依赖locale，保证 SSR/CSR 输出一致） */
function groupNumber(n: number): string {
  const fixed = Math.abs(n) >= 1000 ? Math.round(n) : Math.round(n * 10) / 10;
  return fixed.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatDelta(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const digits = abs >= 100 ? 0 : 1;
  return `${sign}${abs.toFixed(digits)}%`;
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const step = 100 / (points.length - 1);
  const coords = points.map((p, i) => `${(i * step).toFixed(2)},${(28 - ((p - min) / span) * 26).toFixed(2)}`);
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 28"
      preserveAspectRatio="none"
      className="h-7 w-20 shrink-0 text-brand"
    >
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * KPI 指标卡：数值 + 单位 + 同环比 + 样本量 + 口径 + 迷你趋势。
 * 硬约束：sampleSize 必填，delta 必须说明是同比还是环比。
 */
export function Stat({
  className,
  label,
  value,
  unit,
  delta,
  deltaKind = "mom",
  sampleSize,
  formula,
  spark,
  tone = "neutral",
  deltaPolarity = "lower-is-better",
  ...props
}: StatProps) {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const rising = hasDelta && delta > 0;
  const falling = hasDelta && delta < 0;
  const good = deltaPolarity === "lower-is-better" ? falling : rising;
  const bad = deltaPolarity === "lower-is-better" ? rising : falling;
  const deltaTone = good ? "text-success" : bad ? "text-danger" : "text-fg-muted";

  return (
    <div
      className={cn("rounded-lg border border-line bg-surface p-4 shadow-card sm:p-5", className)}
      {...props}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-xs font-medium text-fg-muted" title={label}>
          {label}
        </p>
        {spark && spark.length > 1 ? <Sparkline points={spark} /> : null}
      </div>

      <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
        <span className={cn("tnum text-2xl font-semibold leading-tight", TONE_CLASS[tone])}>{value}</span>
        {unit ? <span className="text-xs text-fg-muted">{unit}</span> : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className={cn("tnum inline-flex items-center gap-0.5 font-medium", deltaTone)}>
          {rising ? (
            <ArrowUp aria-hidden="true" className="size-3.5" />
          ) : falling ? (
            <ArrowDown aria-hidden="true" className="size-3.5" />
          ) : (
            <Minus aria-hidden="true" className="size-3.5" />
          )}
          {hasDelta ? formatDelta(delta) : "—"}
        </span>
        <span className="text-fg-muted">{DELTA_LABEL[deltaKind]}</span>
        <span className="text-fg-subtle">·</span>
        <span className="tnum text-fg-subtle">样本量 n={groupNumber(sampleSize)}</span>
      </div>

      <p className="mt-2 truncate text-[11px] leading-4 text-fg-subtle" title={formula}>
        {formula}
      </p>
    </div>
  );
}
