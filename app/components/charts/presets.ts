import type { EChartsOption } from "echarts";

/** 序列点：{ ts, value } —— 图表只认这个最小结构 */
export interface SeriesPoint {
  ts: string;
  value: number;
}

/**
 * 图表配色（与 app/app.css 的 `--color-series-1..8` 同值）。
 * 只在这里出现一次：图表 canvas 不吃 Tailwind 类，所以用令牌色值；
 * 深色模式由 `EChart` 读取 CSS 变量重建主题色板自动跟随。
 */
export const CHART_COLORS: readonly string[] = [
  "#1f6feb",
  "#0fa89b",
  "#e07a1f",
  "#7a5af8",
  "#cc3535",
  "#2c9ad8",
  "#8b6f2f",
  "#4f6272",
];

/** 图表内的令牌色（客户端读 CSS 变量，SSR 用回退值） */
function token(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/* ────────────────────────────── 输入类型（结构兼容，页面可直接传领域对象） ────────────────────────────── */

/** 通用条目：兼容 GroupTotal（label/energy）、DeviceRank（name/value）、自定义对象 */
export interface ChartItemInput {
  key?: string;
  label?: string;
  name?: string;
  deviceId?: string;
  value?: number;
  energy?: number;
  share?: number;
  unit?: string;
}

/** 序列入参：兼容 TimeSeries（label/points）与自定义对象 */
export interface ChartSeriesInput {
  label?: string;
  name?: string;
  unit?: string;
  points: SeriesPoint[];
}

/** 热力矩阵行（= AnalysisData.matrix 的元素） */
export interface HeatmapCell {
  dimensionKey: string;
  dimensionLabel: string;
  bucket: string;
  value: number;
}

/** 环比对比行（= AnalysisData.comparison 的元素） */
export interface ComparisonItemInput {
  key?: string;
  label: string;
  current: number;
  previous: number;
  delta?: number | null;
}

/* ────────────────────────────── 内部工具 ────────────────────────────── */

function itemLabel(item: ChartItemInput, fallback = "—"): string {
  return item.label ?? item.name ?? item.deviceId ?? item.key ?? fallback;
}

function itemValue(item: ChartItemInput): number {
  return item.value ?? item.energy ?? 0;
}

function seriesLabel(series: ChartSeriesInput, index: number): string {
  return series.label ?? series.name ?? `序列 ${index + 1}`;
}

/** 坐标轴刻度：ISO 时间戳按粒度压缩，避免标签互相遮挡 */
function tickLabel(ts: string): string {
  if (ts.includes("T")) return ts.slice(5, 16).replace("T", " ");
  if (ts.length === 10) return ts.slice(5);
  return ts;
}

/** 千分位 + 最多 1 位小数（图表内不需要更细） */
function fmtNumber(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const rounded = Math.round(n * 10) / 10;
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function fmtValue(n: number, unit: string): string {
  return unit ? `${fmtNumber(n)} ${unit}` : fmtNumber(n);
}

/** 条形末端标签：大数压缩成 1.02M / 60.4K，避免长标签溢出画布 */
function fmtCompact(n: number): string {
  const abs = Math.abs(n);
  if (!Number.isFinite(n)) return "—";
  if (abs >= 1_000_000) return `${Math.round((n / 1_000_000) * 100) / 100}M`;
  if (abs >= 10_000) return `${Math.round((n / 1_000) * 10) / 10}K`;
  return fmtNumber(n);
}

/** tooltip 数值格式化器（unknown 入参，避免 echarts 联合类型渗透到调用方） */
function valueFormatter(unit: string): (value: unknown) => string {
  return (value) => {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? fmtValue(n, unit) : String(value ?? "—");
  };
}

const GRID = { left: 8, right: 16, top: 32, bottom: 8, containLabel: true } as const;

const TOOLTIP_BASE = {
  confine: true,
  borderWidth: 1,
  borderColor: token("--color-line", "#dde4ee"),
  backgroundColor: token("--color-surface", "#ffffff"),
  textStyle: { color: token("--color-fg", "#0e1726"), fontSize: 12 },
} as const;

function legend(top = 0): NonNullable<EChartsOption["legend"]> {
  return {
    type: "scroll",
    top,
    right: 0,
    itemWidth: 10,
    itemHeight: 10,
    itemGap: 12,
    textStyle: { color: token("--color-fg-muted", "#566682"), fontSize: 11 },
  };
}

function categoryAxis(data: string[], extra?: Record<string, unknown>) {
  return {
    type: "category" as const,
    data,
    boundaryGap: true,
    axisTick: { show: false },
    axisLine: { lineStyle: { color: token("--color-line-strong", "#c2cddd") } },
    axisLabel: { color: token("--color-fg-muted", "#566682"), fontSize: 11, hideOverlap: true },
    ...extra,
  };
}

function valueAxis(unit: string, extra?: Record<string, unknown>) {
  return {
    type: "value" as const,
    name: unit,
    nameGap: 12,
    nameTextStyle: { color: token("--color-fg-subtle", "#8593a9"), fontSize: 11, align: "left" as const },
    axisTick: { show: false },
    axisLine: { show: false },
    axisLabel: { color: token("--color-fg-muted", "#566682"), fontSize: 11 },
    splitLine: { lineStyle: { color: token("--color-line", "#dde4ee"), type: "dashed" as const } },
    ...extra,
  };
}

/* ────────────────────────────── 7 个 option 构造器 ────────────────────────────── */

export interface TrendLineArgs {
  series: ChartSeriesInput[];
  unit: string;
  /** 是否填充面积（单序列趋势建议填充，多序列对比不填） */
  area?: boolean;
}

/** 趋势折线：时间 × 指标（主趋势图） */
export function trendLineOption({ series, unit, area = false }: TrendLineArgs): EChartsOption {
  const categories = series[0]?.points.map((p) => tickLabel(p.ts)) ?? [];
  return {
    color: [...CHART_COLORS],
    grid: GRID,
    legend: legend(),
    tooltip: { ...TOOLTIP_BASE, trigger: "axis", valueFormatter: valueFormatter(unit) },
    xAxis: categoryAxis(categories, { boundaryGap: false }),
    yAxis: valueAxis(unit),
    series: series.map((s, index) => ({
      name: seriesLabel(s, index),
      type: "line" as const,
      smooth: true,
      showSymbol: false,
      connectNulls: true,
      lineStyle: { width: 2 },
      areaStyle: area && series.length === 1 ? { opacity: 0.12 } : undefined,
      emphasis: { focus: "series" as const },
      data: s.points.map((p) => p.value),
    })),
  };
}

export interface StackedBarArgs {
  series: ChartSeriesInput[];
  unit: string;
}

/** 堆叠柱：时间 × 多序列（类型/区域构成随时间变化） */
export function stackedBarOption({ series, unit }: StackedBarArgs): EChartsOption {
  const categories = series[0]?.points.map((p) => tickLabel(p.ts)) ?? [];
  return {
    color: [...CHART_COLORS],
    grid: GRID,
    legend: legend(),
    tooltip: { ...TOOLTIP_BASE, trigger: "axis", axisPointer: { type: "shadow" as const }, valueFormatter: valueFormatter(unit) },
    xAxis: categoryAxis(categories),
    yAxis: valueAxis(unit),
    series: series.map((s, index) => ({
      name: seriesLabel(s, index),
      type: "bar" as const,
      stack: "total",
      barMaxWidth: 28,
      emphasis: { focus: "series" as const },
      data: s.points.map((p) => p.value),
    })),
  };
}

export interface ShareBarArgs {
  items: ChartItemInput[];
  unit: string;
}

/** 分组占比条：横向降序，条尾标注占比（构成看占比，量级看表格） */
export function shareBarOption({ items, unit }: ShareBarArgs): EChartsOption {
  const sorted = [...items].sort((a, b) => Math.abs(itemValue(b)) - Math.abs(itemValue(a)));
  const total = sorted.reduce((sum, item) => sum + Math.abs(itemValue(item)), 0) || 1;
  const shares = sorted.map((item) => {
    const share = typeof item.share === "number" ? item.share : Math.abs(itemValue(item)) / total;
    return Math.round(share * 1000) / 10;
  });
  return {
    color: [...CHART_COLORS],
    grid: { left: 8, right: 52, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      ...TOOLTIP_BASE,
      trigger: "item",
      formatter: (params: unknown) => {
        const point = params as { dataIndex?: number; value?: unknown };
        const index = point.dataIndex ?? 0;
        const label = itemLabel(sorted[index] ?? {}, `项 ${index + 1}`);
        const value = typeof point.value === "number" ? point.value : Number(point.value ?? 0);
        return `${label}<br/>${fmtValue(value, unit)} · 占比 ${shares[index] ?? 0}%`;
      },
    },
    xAxis: valueAxis(unit),
    yAxis: categoryAxis(
      sorted.map((item, index) => itemLabel(item, `项 ${index + 1}`)),
      {
        inverse: true,
        axisLine: { show: false },
        axisLabel: {
          color: token("--color-fg-muted", "#566682"),
          fontSize: 11,
          width: 104,
          overflow: "truncate",
        },
      },
    ),
    series: [
      {
        name: "构成",
        type: "bar" as const,
        barMaxWidth: 16,
        itemStyle: { borderRadius: [0, 3, 3, 0] },
        label: {
          show: true,
          position: "right" as const,
          fontSize: 11,
          color: token("--color-fg-muted", "#566682"),
          formatter: (params: { dataIndex?: number }) => `${shares[params.dataIndex ?? 0] ?? 0}%`,
        },
        emphasis: { focus: "series" as const },
        data: sorted.map((item, index) => ({
          value: Math.abs(itemValue(item)),
          itemStyle: { color: CHART_COLORS[index % CHART_COLORS.length] },
        })),
      },
    ],
  };
}

export interface DonutArgs {
  items: ChartItemInput[];
  unit: string;
  /** 圆心上方文案，如「总能耗」 */
  centerLabel?: string;
  /** 圆心数值（已格式化），如 "12.4 万 kWh" */
  centerValue?: string;
}

/** 环形占比：构成项 ≤6 个时使用；更多用 rankBarOption */
export function donutOption({ items, unit, centerLabel, centerValue }: DonutArgs): EChartsOption {
  return {
    color: [...CHART_COLORS],
    tooltip: { ...TOOLTIP_BASE, trigger: "item", valueFormatter: valueFormatter(unit) },
    legend: { ...legend(), top: "bottom", right: "center" },
    title:
      centerLabel || centerValue
        ? {
            text: centerValue ?? "",
            subtext: centerLabel ?? "",
            left: "center",
            top: "38%",
            textAlign: "center",
            textStyle: { fontSize: 18, fontWeight: 600, color: token("--color-fg", "#0e1726") },
            subtextStyle: { fontSize: 11, color: token("--color-fg-muted", "#566682") },
          }
        : undefined,
    series: [
      {
        type: "pie",
        radius: ["56%", "76%"],
        center: ["50%", "46%"],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        emphasis: { scale: true, scaleSize: 4 },
        data: items.map((item) => ({ name: itemLabel(item), value: Math.abs(itemValue(item)) })),
      },
    ],
  };
}

export interface HeatmapArgs {
  matrix: HeatmapCell[];
  unit: string;
}

/** 热力矩阵：维度 × 时间（analysis 页） */
export function heatmapOption({ matrix, unit }: HeatmapArgs): EChartsOption {
  const buckets = Array.from(new Set(matrix.map((cell) => cell.bucket))).sort();
  const dimensions = Array.from(new Set(matrix.map((cell) => cell.dimensionLabel)));
  const values = matrix.map((cell) => cell.value);
  const max = values.length > 0 ? Math.max(...values) : 1;
  const min = values.length > 0 ? Math.min(...values) : 0;
  const bucketIndex = new Map(buckets.map((bucket, index) => [bucket, index]));
  const dimIndex = new Map(dimensions.map((label, index) => [label, index]));
  return {
    color: [...CHART_COLORS],
    tooltip: {
      ...TOOLTIP_BASE,
      trigger: "item",
      valueFormatter: valueFormatter(unit),
    },
    grid: { left: 8, right: 16, top: 12, bottom: 8, containLabel: true },
    xAxis: categoryAxis(buckets.map(tickLabel), { splitArea: { show: false } }),
    yAxis: categoryAxis(dimensions, {
      axisLabel: { color: token("--color-fg-muted", "#566682"), fontSize: 11, width: 96, overflow: "truncate" },
    }),
    visualMap: {
      min,
      max: max === min ? min + 1 : max,
      /** 色标条不在 canvas 内画（容器窄时排版不稳），改为页面 caption 说明 */
      show: false,
      seriesIndex: 0,
      inRange: {
        color: [
          token("--color-surface-2", "#eef2f8"),
          token("--color-info-soft", "#e6f0fd"),
          token("--color-brand", "#1f6feb"),
          token("--color-warning", "#b57208"),
          token("--color-danger", "#cc3535"),
        ],
      },
    },
    series: [
      {
        type: "heatmap",
        data: matrix.map((cell) => [bucketIndex.get(cell.bucket) ?? 0, dimIndex.get(cell.dimensionLabel) ?? 0, cell.value]),
        label: { show: false },
        emphasis: { itemStyle: { borderColor: token("--color-fg", "#0e1726"), borderWidth: 1 } },
      },
    ],
  };
}

export interface RankBarArgs {
  items: ChartItemInput[];
  unit: string;
}

/** 横向排名条：设备 TOP N、区域排名（降序，长名称截断） */
export function rankBarOption({ items, unit }: RankBarArgs): EChartsOption {
  const sorted = [...items].sort((a, b) => Math.abs(itemValue(b)) - Math.abs(itemValue(a)));
  return {
    color: [...CHART_COLORS],
    grid: { left: 8, right: 56, top: 8, bottom: 8, containLabel: true },
    tooltip: { ...TOOLTIP_BASE, trigger: "item", valueFormatter: valueFormatter(unit) },
    xAxis: valueAxis(unit),
    yAxis: categoryAxis(sorted.map((item) => itemLabel(item)), {
      inverse: true,
      axisLine: { show: false },
      axisLabel: { color: token("--color-fg-muted", "#566682"), fontSize: 11, width: 120, overflow: "truncate" },
    }),
    series: [
      {
        type: "bar" as const,
        barMaxWidth: 14,
        itemStyle: { borderRadius: [0, 3, 3, 0] },
        label: {
          show: true,
          position: "right" as const,
          fontSize: 11,
          color: token("--color-fg-muted", "#566682"),
          formatter: (params: { value?: unknown }) => fmtCompact(Number(params.value ?? 0)),
        },
        data: sorted.map((item) => Math.abs(itemValue(item))),
      },
    ],
  };
}

export interface ComparisonBarArgs {
  items: ComparisonItemInput[];
  unit: string;
}

/** 本期 vs 上期分组柱（环比对比） */
export function comparisonBarOption({ items, unit }: ComparisonBarArgs): EChartsOption {
  return {
    color: [...CHART_COLORS],
    grid: GRID,
    legend: legend(),
    tooltip: {
      ...TOOLTIP_BASE,
      trigger: "axis",
      axisPointer: { type: "shadow" as const },
      valueFormatter: valueFormatter(unit),
    },
    xAxis: categoryAxis(
      items.map((item) => item.label),
      { axisLabel: { color: token("--color-fg-muted", "#566682"), fontSize: 11, width: 88, overflow: "truncate" } },
    ),
    yAxis: valueAxis(unit),
    series: [
      {
        name: "本期",
        type: "bar" as const,
        barMaxWidth: 22,
        data: items.map((item) => item.current),
      },
      {
        name: "上期",
        type: "bar" as const,
        barMaxWidth: 22,
        data: items.map((item) => item.previous),
      },
    ],
  };
}
