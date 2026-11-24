/**
 * 拓扑注册表（多拓扑）。
 *
 * 只做「结构索引」：拓扑、节点树、计量表、绑定、分项分类。
 * 本模块不含任何校验/门禁逻辑——非法引用会被跳过，不做拦截。
 */

import type {
  CategoryNode,
  EnergyType,
  Meter,
  MeterBinding,
  Topology,
  TopologyKind,
  TopologyNode,
} from "./types";
import { ENERGY_UNIT } from "./types";

export interface ModelInput {
  topologies: Topology[];
  nodes: TopologyNode[];
  meters: Meter[];
  bindings: MeterBinding[];
  categories: CategoryNode[];
}

export class ModelRegistry {
  readonly topologies: ReadonlyMap<string, Topology>;
  readonly nodes: ReadonlyMap<string, TopologyNode>;
  readonly meters: ReadonlyMap<string, Meter>;
  readonly categories: ReadonlyMap<string, CategoryNode>;

  private readonly childIndex: Map<string, string[]>;
  private readonly nodeMeterIndex: Map<string, string[]>;
  private readonly meterTopologyIndex: Map<string, Map<string, string>>;

  constructor(input: ModelInput) {
    this.topologies = new Map(input.topologies.map((topology) => [topology.topologyId, topology]));
    this.nodes = new Map(input.nodes.map((node) => [node.nodeId, node]));
    this.meters = new Map(input.meters.map((meter) => [meter.meterId, meter]));
    this.categories = new Map(input.categories.map((category) => [category.categoryId, category]));

    const childIndex = new Map<string, string[]>();
    for (const node of this.nodes.values()) {
      if (node.parentId === null) continue;
      const siblings = childIndex.get(node.parentId) ?? [];
      siblings.push(node.nodeId);
      childIndex.set(node.parentId, siblings);
    }
    this.childIndex = childIndex;

    const nodeMeterIndex = new Map<string, string[]>();
    const meterTopologyIndex = new Map<string, Map<string, string>>();
    for (const binding of input.bindings) {
      const list = nodeMeterIndex.get(binding.nodeId) ?? [];
      list.push(binding.meterId);
      nodeMeterIndex.set(binding.nodeId, list);

      const perMeter = meterTopologyIndex.get(binding.meterId) ?? new Map<string, string>();
      perMeter.set(binding.topologyId, binding.nodeId);
      meterTopologyIndex.set(binding.meterId, perMeter);
    }
    this.nodeMeterIndex = nodeMeterIndex;
    this.meterTopologyIndex = meterTopologyIndex;
  }

  static create(input: ModelInput): ModelRegistry {
    return new ModelRegistry(input);
  }

  /* ───────────── 拓扑 ───────────── */

  topologyList(): Topology[] {
    return [...this.topologies.values()];
  }

  primaryTopology(): Topology | undefined {
    return this.topologyList().find((topology) => topology.isPrimary);
  }

  nodesOf(topologyId: string): TopologyNode[] {
    return [...this.nodes.values()].filter((node) => node.topologyId === topologyId);
  }

  rootsOf(topologyId: string): TopologyNode[] {
    return this.nodesOf(topologyId).filter((node) => node.parentId === null);
  }

  children(nodeId: string): string[] {
    return this.childIndex.get(nodeId) ?? [];
  }

  isLeaf(nodeId: string): boolean {
    return this.children(nodeId).length === 0;
  }

  node(nodeId: string): TopologyNode | undefined {
    return this.nodes.get(nodeId);
  }

  meter(meterId: string): Meter | undefined {
    return this.meters.get(meterId);
  }

  /** 节点本级绑定的计量表 */
  metersOf(nodeId: string): Meter[] {
    return (this.nodeMeterIndex.get(nodeId) ?? [])
      .map((meterId) => this.meters.get(meterId))
      .filter((meter): meter is Meter => meter !== undefined);
  }

  metersOfType(nodeId: string, energyType: EnergyType): Meter[] {
    return this.metersOf(nodeId).filter((meter) => meter.energyType === energyType);
  }

  /** 该表在各拓扑中的节点（拓扑 id → 节点 id） */
  bindingsOf(meterId: string): Map<string, string> {
    return new Map(this.meterTopologyIndex.get(meterId) ?? []);
  }

  nodeOf(meterId: string, topologyId: string): string | null {
    return this.meterTopologyIndex.get(meterId)?.get(topologyId) ?? null;
  }

  ancestors(nodeId: string): string[] {
    const result: string[] = [];
    let cursor = this.nodes.get(nodeId)?.parentId ?? null;
    const guard = new Set<string>();
    while (cursor !== null && !guard.has(cursor)) {
      guard.add(cursor);
      result.push(cursor);
      cursor = this.nodes.get(cursor)?.parentId ?? null;
    }
    return result;
  }

  descendants(nodeId: string): string[] {
    const result: string[] = [];
    const queue = [...this.children(nodeId)];
    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) break;
      result.push(current);
      queue.push(...this.children(current));
    }
    return result;
  }

  /** 该节点及其后代中，末端节点上的全部计量表 */
  leafMeters(nodeId: string): Meter[] {
    const scope = [nodeId, ...this.descendants(nodeId)];
    return scope.filter((id) => this.isLeaf(id)).flatMap((id) => this.metersOf(id));
  }

  /**
   * 分项占比的计算范围：只在主口径拓扑内、末端节点的表参与。
   * 这里只做范围划分，不判定配置对错。
   */
  partitionMetersForCategoryShare(): {
    eligible: Meter[];
    excluded: { meter: Meter; reason: string }[];
  } {
    const eligible: Meter[] = [];
    const excluded: { meter: Meter; reason: string }[] = [];
    const primary = this.primaryTopology();

    for (const meter of this.meters.values()) {
      if (meter.categoryId === null) {
        excluded.push({ meter, reason: "未打分项标签" });
        continue;
      }
      if (primary === undefined) {
        excluded.push({ meter, reason: "缺少主口径拓扑" });
        continue;
      }
      const nodeId = this.nodeOf(meter.meterId, primary.topologyId);
      if (nodeId === null) {
        excluded.push({ meter, reason: `未在「${primary.name}」中挂载` });
        continue;
      }
      if (!this.isLeaf(nodeId)) {
        excluded.push({ meter, reason: `在「${primary.name}」中位于非末端节点（总表不参与分项占比）` });
        continue;
      }
      eligible.push(meter);
    }
    return { eligible, excluded };
  }
}

/** 单位查询（不校验，仅展示与计算用） */
export function unitOf(meter: Meter): string {
  return ENERGY_UNIT[meter.energyType];
}

export const TOPOLOGY_KIND_ORDER: TopologyKind[] = ["space", "metering", "system", "org"];
