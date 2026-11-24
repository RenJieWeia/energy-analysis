/**
 * 差分派生：累计读数 → 区间用量；再按拓扑汇总成节点用量（本级实测 + 下级汇总共存）。
 *
 * 本模块只做计算，不做校验、不产出问题清单：
 *  - 区间端点找不到读数 → value 为 null（这是数据事实，不是告警）；
 *  - 端点存在则直接差分；表底翻转按 digitCount 修正（属于计算规则，不是校验）；
 *  - 汇总用「可得的那些」相加；全都不可得则为 null。
 */

import type { EnergyType, Granularity, Meter, MeterReading, NodeUsage, Usage, UsageQuality } from "./types";
import { ENERGY_UNIT } from "./types";
import { capabilityOf, parseIso, periodEndOf, periodStartOf } from "./granularity";
import { ModelRegistry } from "./topology";

/** 区间覆盖率：实际读点 / 按最小读点间隔应有的读点（封顶 1） */
function coverageOf(readings: MeterReading[], gapMs: number | null, periodStart: string, periodEnd: string): number {
  if (readings.length === 0) return 0;
  const startMs = parseIso(periodStart);
  const endMs = parseIso(periodEnd);
  if (endMs <= startMs) return 0;
  if (gapMs === null || gapMs <= 0) {
    const hasBoth =
      readings.some((reading) => parseIso(reading.readAt) === startMs) &&
      readings.some((reading) => parseIso(reading.readAt) === endMs);
    return hasBoth ? 1 : 0;
  }
  const expected = Math.floor((endMs - startMs) / gapMs) + 1;
  if (expected <= 0) return 0;
  const present = readings.filter((reading) => {
    const ms = parseIso(reading.readAt);
    return ms >= startMs && ms <= endMs;
  }).length;
  return Math.min(1, present / expected);
}

/** 单块表、单个区间、单个粒度的用量 */
export function deriveUsage(
  meter: Meter,
  granularity: Granularity,
  periodStart: string,
  periodEnd: string,
  allReadings: MeterReading[],
): Usage {
  const own = allReadings
    .filter((reading) => reading.meterId === meter.meterId)
    .sort((a, b) => parseIso(a.readAt) - parseIso(b.readAt));
  const capability = capabilityOf(own);
  const coverage = coverageOf(own, capability.gapMs, periodStart, periodEnd);

  const startMs = parseIso(periodStart);
  const endMs = parseIso(periodEnd);
  const startReading = own.find((reading) => parseIso(reading.readAt) === startMs);
  const endReading = own.find((reading) => parseIso(reading.readAt) === endMs);

  if (startReading === undefined || endReading === undefined) {
    return {
      meterId: meter.meterId,
      energyType: meter.energyType,
      granularity,
      periodStart,
      periodEnd,
      value: null,
      unit: ENERGY_UNIT[meter.energyType],
      method: null,
      quality: "insufficient",
      coverage,
    };
  }

  let value = endReading.cumulative - startReading.cumulative;
  let method: Usage["method"] = "diff";
  if (value < 0 && meter.digitCount !== null) {
    value += 10 ** meter.digitCount;
    method = "diff_rollover";
  }

  const quality: UsageQuality = startReading.sourceQuality === "estimated" || endReading.sourceQuality === "estimated"
    ? "estimated"
    : "normal";

  return {
    meterId: meter.meterId,
    energyType: meter.energyType,
    granularity,
    periodStart,
    periodEnd,
    value,
    unit: ENERGY_UNIT[meter.energyType],
    method,
    quality,
    coverage,
  };
}

/** 单块表在 [from, to) 内按目标粒度逐期派生 */
export function deriveMeterSeries(
  meter: Meter,
  granularity: Granularity,
  from: string,
  to: string,
  readings: MeterReading[],
): Usage[] {
  const result: Usage[] = [];
  const endMs = parseIso(to);
  let cursor = periodStartOf(from, granularity);
  let guard = 0;
  while (parseIso(cursor) < endMs && guard < 20_000) {
    const periodEnd = periodEndOf(cursor, granularity);
    result.push(deriveUsage(meter, granularity, cursor, periodEnd, readings));
    cursor = periodEnd;
    guard += 1;
  }
  return result;
}

/** 节点用量的有效值：本级实测优先，否则用下级汇总 */
export function effectiveValue(usage: NodeUsage): number | null {
  return usage.selfValue ?? usage.rollupValue;
}

function sumValues(values: (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) return null;
  return present.reduce((sum, value) => sum + value, 0);
}

/**
 * 节点用量：本级实测与下级汇总共存。
 * 一个节点可能同时挂电表和水表，因此必须按能源类型分别计算——电与水不可相加。
 */
export function computeNodeUsage(
  registry: ModelRegistry,
  nodeId: string,
  energyType: EnergyType,
  granularity: Granularity,
  periodStart: string,
  periodEnd: string,
  readings: MeterReading[],
): NodeUsage {
  const unit = ENERGY_UNIT[energyType];

  const ownMeters = registry.metersOfType(nodeId, energyType);
  const ownUsages = ownMeters.map((meter) => deriveUsage(meter, granularity, periodStart, periodEnd, readings));
  const selfValue = ownUsages.length === 0 ? null : sumValues(ownUsages.map((usage) => usage.value));

  const childIds = registry.children(nodeId);
  const childUsages = childIds.map((childId) =>
    computeNodeUsage(registry, childId, energyType, granularity, periodStart, periodEnd, readings),
  );
  const rollupValue = childIds.length === 0 ? null : sumValues(childUsages.map((usage) => effectiveValue(usage)));

  const balance = selfValue !== null && rollupValue !== null ? selfValue - rollupValue : null;
  const balanceRatio = balance !== null && selfValue !== null && selfValue !== 0 ? balance / selfValue : null;

  let basis: NodeUsage["basis"];
  if (selfValue !== null && rollupValue !== null) basis = "mixed";
  else if (selfValue !== null) basis = "measured";
  else if (rollupValue !== null) basis = "derived_from_children";
  else basis = "unavailable";

  const qualities: UsageQuality[] = [...ownUsages.map((usage) => usage.quality), ...childUsages.map((usage) => usage.quality)];
  const quality: UsageQuality = qualities.includes("insufficient")
    ? "insufficient"
    : qualities.includes("suspect")
      ? "suspect"
      : qualities.includes("estimated")
        ? "estimated"
        : "normal";

  const coverages = [...ownUsages.map((usage) => usage.coverage), ...childUsages.map((usage) => usage.coverage)].filter(
    (value): value is number => typeof value === "number",
  );
  const coverage = coverages.length === 0 ? null : Math.min(...coverages);

  return {
    nodeId,
    energyType,
    granularity,
    periodStart,
    periodEnd,
    selfValue,
    rollupValue,
    balance,
    balanceRatio,
    unit,
    basis,
    quality,
    coverage,
  };
}

/** 某套拓扑的整棵树按能源类型各算一遍（电/水分开，永不混算） */
export function computeTreeUsage(
  registry: ModelRegistry,
  topologyId: string,
  granularity: Granularity,
  periodStart: string,
  periodEnd: string,
  readings: MeterReading[],
): NodeUsage[] {
  const result: NodeUsage[] = [];
  const energyTypes: EnergyType[] = ["electric", "water"];
  const roots = registry.rootsOf(topologyId).map((node) => node.nodeId);
  const scope = roots.flatMap((rootId) => [rootId, ...registry.descendants(rootId)]);
  for (const energyType of energyTypes) {
    for (const nodeId of scope) {
      result.push(computeNodeUsage(registry, nodeId, energyType, granularity, periodStart, periodEnd, readings));
    }
  }
  return result;
}
