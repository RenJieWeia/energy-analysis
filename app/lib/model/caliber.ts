/**
 * 口径与能力边界。
 *
 * 每个数字旁边都写着它是什么口径、能算什么、不能算什么（本文件）。
 * 注：校验层已按需求移除，这里只保留口径与能力边界声明。
 */

import type { Caliber, Granularity, Usage } from "./types";
import { GRANULARITY_LABEL, PLATFORM_TIMEZONE } from "./types";

/** 口径版本：口径或关系语义变更时递增，界面必须显示 */
export const CALIBER_VERSION = "model-v0.1";

/** 能力边界文案：直接展示到界面，不是写在文档里的说明 */
export const LIMIT_TEXT = {
  onlyElectricAndWater: "仅支持电、水两类能源；其他品种不接入，也不做折算",
  noCrossEnergySum: "电（kWh）与水（m³）不可相加，汇总与差额一律按能源类型分开计算",
  noExtrapolation: "端点读数缺失时不出数，不外推、不补零",
  rolloverNeedsDigits: "缺表底位数时无法判定表底翻转，该区间标可疑",
  granularityByDensity: "粒度能力由读点密度决定；读点不足的粒度显示为不可用，不显示 0",
  balanceNeedsBoth: "差额仅在本级实测与下级汇总都存在时计算，否则标不可校验",
  categoryShareLeafOnly: "分项占比只统计末端节点的表；中间节点总表只参与总量与对账",
  realtimeCaliber: "实时口径：对应关系由平台维护且可能调整，历史结论不可复现",
} as const;

export function describeLimits(): string[] {
  return Object.values(LIMIT_TEXT);
}

/** 组装口径：粒度、对齐方式、覆盖率、能力边界 */
export interface CaliberInput {
  granularity: Granularity;
  /** 参与计算的覆盖率（多表/多节点取最小）；空数组表示不可得 */
  coverages: (number | null)[];
  /** 参与计算的计量表数量 */
  meterCount: number;
}

export function buildCaliber(input: CaliberInput): Caliber {
  const coverages = input.coverages.filter((value): value is number => typeof value === "number");
  const coverage = coverages.length === 0 ? null : Math.min(...coverages);

  return {
    caliberVersion: CALIBER_VERSION,
    granularity: input.granularity,
    alignment: "natural_boundary_cumulative_diff",
    timezone: PLATFORM_TIMEZONE,
    meterCount: input.meterCount,
    coverage,
    limits: describeLimits(),
  };
}

/** 便捷版：直接用一组表级用量组装口径 */
export function caliberFromUsages(input: { granularity: Granularity; usages: Usage[] }): Caliber {
  const meterIds = new Set(input.usages.map((usage) => usage.meterId));
  return buildCaliber({
    granularity: input.granularity,
    coverages: input.usages.map((usage) => usage.coverage),
    meterCount: meterIds.size,
  });
}

/** 界面上的口径一行文案，例：「日粒度 · 自然边界 · 累计读数差分 · 覆盖率 100% · 口径 model-v0.1」 */
export function caliberSummary(caliber: Caliber): string {
  const coverage = caliber.coverage === null ? "覆盖率不可得" : `覆盖率 ${Math.round(caliber.coverage * 100)}%`;
  return [
    `${GRANULARITY_LABEL[caliber.granularity]}粒度`,
    "自然边界",
    "累计读数差分",
    coverage,
    `口径 ${caliber.caliberVersion}`,
  ].join(" · ");
}
