/**
 * 数值与时间格式化（独立，不依赖旧分析层）。
 */

/** 千分位，默认最多 2 位小数 */
export function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

/** 用量数字：大数压缩，避免表格撑破 */
export function formatQuantity(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${formatNumber(value / 1_000_000, 2)}M`;
  if (abs >= 10_000) return `${formatNumber(value / 1_000, 1)}K`;
  return formatNumber(value, digits);
}

/** 百分比：入参是 0..1 的比率 */
export function formatRatio(ratio: number | null, digits = 1): string {
  if (ratio === null || !Number.isFinite(ratio)) return "—";
  return `${(ratio * 100).toFixed(digits)}%`;
}

/** 带符号数值（差额）：正数加 +，负数保留 - */
export function formatSigned(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, digits)}`;
}

export function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

export function formatDateTime(iso: string): string {
  return iso.length >= 16 ? `${iso.slice(0, 10)} ${iso.slice(11, 16)}` : iso.slice(0, 10);
}

/** 兼容旧调用：比率 → 百分比文案（与 formatRatio 同语义） */
export function formatPercent(ratio: number | null, digits = 1): string {
  return formatRatio(ratio, digits);
}
