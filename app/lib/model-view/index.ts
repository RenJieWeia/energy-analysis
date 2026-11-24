/**
 * 页面视图数据（只读）：把模型层的派生结果整理成页面可直接渲染的形状。
 *
 * 约束：
 *  - 只在 loader 里调用，页面不自己算数；
 *  - 电与水永远分开成两组，不混算；
 *  - 多拓扑：汇总/差额按拓扑算，分项占比只取主口径拓扑；
 *  - 所有数值都带 quality / basis / coverage。
 */

import { ModelRegistry } from "~/lib/model/topology";
import { computeNodeUsage, deriveUsage, effectiveValue } from "~/lib/model/derive";
import { buildCaliber } from "~/lib/model/caliber";
import { capabilityOf, granularityAvailable, parseIso, periodEndOf, periodStartOf } from "~/lib/model/granularity";
import type {
  CategoryNode,
  EnergyType,
  Granularity,
  Meter,
  MeterReading,
  NodeUsage,
  Topology,
  Usage,
} from "~/lib/model/types";
import { ENERGY_UNIT } from "~/lib/model/types";

/* ────────────────────────── 模型装载结果（结构类型） ────────────────────────── */

/** loader 里传入的模型装载结果（来自 model.server.ts，这里只声明结构） */
export interface ModelView {
  registry: ModelRegistry;
  readings: MeterReading[];
  defaultPeriod: { start: string; end: string };
}

/* ────────────────────────── 查询状态（进 URL） ────────────────────────── */

export const VIEW_GRANULARITIES: Granularity[] = ["hour", "day", "month", "year"];

export interface ViewPeriod {
  granularity: Granularity;
  periodStart: string;
  periodEnd: string;
  label: string;
  /** 该粒度是否被数据支撑（读点密度不足时为 false） */
  available: boolean;
}

function formatLabel(iso: string, granularity: Granularity): string {
  const day = iso.slice(0, 10);
  switch (granularity) {
    case "hour":
      return `${day} ${iso.slice(11, 16)}`;
    case "day":
      return day;
    case "month":
      return day.slice(0, 7);
    case "year":
      return day.slice(0, 4);
  }
}

export function parseViewPeriod(searchParams: URLSearchParams, model: ModelView): ViewPeriod {
  const rawGranularity = searchParams.get("g");
  const granularity: Granularity = VIEW_GRANULARITIES.includes(rawGranularity as Granularity)
    ? (rawGranularity as Granularity)
    : "day";

  const rawDate = searchParams.get("d");
  const fallback = model.defaultPeriod.start;
  let anchor = fallback;
  if (rawDate !== null && /^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
    const parsed = Date.parse(rawDate.length === 10 ? `${rawDate}T00:00:00+08:00` : rawDate);
    if (!Number.isNaN(parsed)) anchor = rawDate;
  }

  const periodStart = periodStartOf(anchor, granularity);
  const periodEnd = periodEndOf(periodStart, granularity);

  const capability = capabilityOf(model.readings);
  const available = granularityAvailable(capability, granularity);

  return {
    granularity,
    periodStart,
    periodEnd,
    label: formatLabel(periodStart, granularity),
    available,
  };
}

export function viewHref(granularity: Granularity, periodStart: string, extra?: Record<string, string>): string {
  const params = new URLSearchParams();
  params.set("g", granularity);
  params.set("d", periodStart.slice(0, 10));
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value !== "") params.set(key, value);
  }
  return `?${params.toString()}`;
}

/* ────────────────────────── 拓扑切换 ────────────────────────── */

export interface TopologyOption {
  topologyId: string;
  name: string;
  kind: Topology["kind"];
  isPrimary: boolean;
  description: string | null;
}

export function topologyOptions(model: ModelView): TopologyOption[] {
  return model.registry.topologyList().map((topology) => ({
    topologyId: topology.topologyId,
    name: topology.name,
    kind: topology.kind,
    isPrimary: topology.isPrimary,
    description: topology.description ?? null,
  }));
}

/** 解析 URL 上的拓扑；非法/缺省回落到主口径拓扑 */
export function parseTopology(model: ModelView, searchParams: URLSearchParams): Topology {
  const requested = searchParams.get("topo");
  const list = model.registry.topologyList();
  const hit = list.find((topology) => topology.topologyId === requested);
  return hit ?? model.registry.primaryTopology() ?? list[0] ?? {
    topologyId: "space",
    name: "空间拓扑",
    kind: "space",
    isPrimary: true,
  };
}

/* ────────────────────────── 拓扑总览 ────────────────────────── */

export interface TreeNodeRow {
  nodeId: string;
  name: string;
  level: string;
  depth: number;
  isLeaf: boolean;
  childCount: number;
  meterCount: number;
  electric: NodeUsage;
  water: NodeUsage;
}

export function buildTreeRows(
  model: ModelView,
  topologyId: string,
  granularity: Granularity,
  periodStart: string,
  periodEnd: string,
): TreeNodeRow[] {
  const { registry, readings } = model;
  const rows: TreeNodeRow[] = [];

  const walk = (nodeId: string, depth: number): void => {
    const node = registry.node(nodeId);
    if (node === undefined) return;
    rows.push({
      nodeId,
      name: node.name,
      level: node.level,
      depth,
      isLeaf: registry.isLeaf(nodeId),
      childCount: registry.children(nodeId).length,
      meterCount: registry.metersOf(nodeId).length,
      electric: computeNodeUsage(registry, nodeId, "electric", granularity, periodStart, periodEnd, readings),
      water: computeNodeUsage(registry, nodeId, "water", granularity, periodStart, periodEnd, readings),
    });
    for (const childId of registry.children(nodeId)) walk(childId, depth + 1);
  };

  for (const root of registry.rootsOf(topologyId)) walk(root.nodeId, 0);
  return rows;
}

/* ────────────────────────── 计量表清单 ────────────────────────── */

export interface MeterBindingView {
  topologyId: string;
  topologyName: string;
  nodeId: string | null;
  nodePath: string | null;
}

export interface MeterRow {
  meter: Meter;
  nodeName: string;
  nodePath: string;
  /** 该表在所有拓扑中的位置 */
  allBindings: MeterBindingView[];
  categoryName: string | null;
  unit: string;
  usage: Usage;
  gapLabel: string;
  readingCount: number;
}

function pathOf(model: ModelView, nodeId: string): { name: string; path: string } {
  const names: string[] = [];
  let cursor: string | null = nodeId;
  const guard = new Set<string>();
  while (cursor !== null && !guard.has(cursor)) {
    guard.add(cursor);
    const node = model.registry.node(cursor);
    if (node === undefined) break;
    names.unshift(node.name);
    cursor = node.parentId;
  }
  return { name: names[names.length - 1] ?? "—", path: names.join(" / ") || "—" };
}

export function buildMeterRows(
  model: ModelView,
  topologyId: string,
  granularity: Granularity,
  periodStart: string,
  periodEnd: string,
): MeterRow[] {
  const { registry, readings } = model;
  return [...registry.meters.values()].map((meter) => {
    const nodeId = registry.nodeOf(meter.meterId, topologyId);
    const place = nodeId === null ? { name: "—", path: "未在本拓扑挂载" } : pathOf(model, nodeId);

    const allBindings: MeterBindingView[] = [...registry.bindingsOf(meter.meterId).entries()].map(
      ([bindingTopology, bindingNodeId]) => {
        const topology = registry.topologies.get(bindingTopology);
        const bound = pathOf(model, bindingNodeId);
        return {
          topologyId: bindingTopology,
          topologyName: topology?.name ?? bindingTopology,
          nodeId: bindingNodeId,
          nodePath: bound.path,
        };
      },
    );
    for (const topology of registry.topologyList()) {
      if (!allBindings.some((binding) => binding.topologyId === topology.topologyId)) {
        allBindings.push({
          topologyId: topology.topologyId,
          topologyName: topology.name,
          nodeId: null,
          nodePath: null,
        });
      }
    }

    const own = readings.filter((reading) => reading.meterId === meter.meterId);
    const capability = capabilityOf(own);
    return {
      meter,
      nodeName: place.name,
      nodePath: place.path,
      allBindings,
      categoryName: meter.categoryId === null ? null : registry.categories.get(meter.categoryId)?.name ?? "—",
      unit: ENERGY_UNIT[meter.energyType],
      usage: deriveUsage(meter, granularity, periodStart, periodEnd, readings),
      gapLabel: capability.gapMs === null ? "读点不足" : `${Math.round(capability.gapMs / 3_600_000)} 小时`,
      readingCount: own.length,
    };
  });
}

/* ────────────────────────── 分项分类 ────────────────────────── */

export interface CategoryRow {
  categoryId: string;
  name: string;
  level: 1 | 2;
  depth: number;
  meterCount: number;
  energyTypes: EnergyType[];
  shareEligible: boolean;
}

export function buildCategoryRows(model: ModelView): CategoryRow[] {
  const { registry } = model;
  const share = registry.partitionMetersForCategoryShare();
  const eligibleIds = new Set(share.eligible.map((meter) => meter.meterId));

  const rows: CategoryRow[] = [];
  const walk = (category: CategoryNode, depth: number): void => {
    const meters = [...registry.meters.values()].filter((meter) => meter.categoryId === category.categoryId);
    rows.push({
      categoryId: category.categoryId,
      name: category.name,
      level: category.level,
      depth,
      meterCount: meters.length,
      energyTypes: [...new Set(meters.map((meter) => meter.energyType))],
      shareEligible: meters.length > 0 && meters.every((meter) => eligibleIds.has(meter.meterId)),
    });
    for (const child of registry.categories.values()) {
      if (child.parentId === category.categoryId) walk(child, depth + 1);
    }
  };
  for (const category of registry.categories.values()) {
    if (category.parentId === null) walk(category, 0);
  }
  return rows;
}

export interface SharePartition {
  eligible: { meterId: string; nodeName: string; categoryName: string; unit: string }[];
  excluded: { meterId: string; nodeName: string; reason: string }[];
  primaryName: string;
}

export function buildSharePartition(model: ModelView): SharePartition {
  const { registry } = model;
  const primary = registry.primaryTopology();
  const partition = registry.partitionMetersForCategoryShare();
  const primaryId = primary?.topologyId ?? "";

  const placeOf = (meterId: string): string => {
    const nodeId = registry.nodeOf(meterId, primaryId);
    return nodeId === null ? "—" : pathOf(model, nodeId).path;
  };

  return {
    primaryName: primary?.name ?? "（未设置主口径）",
    eligible: partition.eligible.map((meter) => ({
      meterId: meter.meterId,
      nodeName: placeOf(meter.meterId),
      categoryName: registry.categories.get(meter.categoryId ?? "")?.name ?? "—",
      unit: ENERGY_UNIT[meter.energyType],
    })),
    excluded: partition.excluded.map((item) => ({
      meterId: item.meter.meterId,
      nodeName: placeOf(item.meter.meterId),
      reason: item.reason,
    })),
  };
}

/* ────────────────────────── 通用 ────────────────────────── */

export function depthPadding(depth: number): string {
  return `${depth * 20}px`;
}

export function nodeTotal(usage: NodeUsage): number | null {
  return effectiveValue(usage);
}

export function assertPeriod(period: ViewPeriod): void {
  const start = parseIso(period.periodStart);
  const end = parseIso(period.periodEnd);
  if (end <= start) throw new Error(`区间非法：${period.periodStart} ~ ${period.periodEnd}`);
}

