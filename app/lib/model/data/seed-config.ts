/**
 * 初始模型配置（首次启动时写入 model-config.json，之后以 JSON 文件为准）。
 *
 * 三套拓扑共用同一批表：
 *  - space（主口径）：园区 → 楼栋 → 楼层
 *  - metering：进线 → 楼层配电（同一批表换个视角看总分落差）
 *  - system：空调 / 照明 / 动力 / 给水（同一批表按用途分组）
 */

import type { CategoryNode, Meter, MeterBinding, Topology, TopologyNode } from "../types";

export const SEED_TOPOLOGIES: Topology[] = [
  {
    topologyId: "space",
    name: "空间拓扑",
    kind: "space",
    scenario: "office",
    isPrimary: true,
    description: "园区 / 楼栋 / 楼层 / 房间；分项占比取自主口径拓扑",
  },
  {
    topologyId: "metering",
    name: "计量接线拓扑",
    kind: "metering",
    isPrimary: false,
    description: "进线 → 楼层配电 → 末端表；用于总分表对账",
  },
  {
    topologyId: "system",
    name: "用能系统拓扑",
    kind: "system",
    isPrimary: false,
    description: "空调 / 照明 / 动力 / 给水；用于按系统看用量",
  },
];

export const SEED_CATEGORIES: CategoryNode[] = [
  { categoryId: "hvac", parentId: null, name: "暖通空调", level: 1 },
  { categoryId: "lighting", parentId: null, name: "照明", level: 1 },
  { categoryId: "power", parentId: null, name: "动力", level: 1 },
  { categoryId: "socket", parentId: null, name: "插座与办公设备", level: 1 },
  { categoryId: "water", parentId: null, name: "给水", level: 1 },
  { categoryId: "other", parentId: null, name: "其他", level: 1 },
  { categoryId: "hvac-fan", parentId: "hvac", name: "空调风机", level: 2 },
];

export const SEED_NODES: TopologyNode[] = [
  // 空间拓扑
  { nodeId: "sp-park-a", topologyId: "space", parentId: null, name: "A 园区", level: "园区" },
  { nodeId: "sp-b1", topologyId: "space", parentId: "sp-park-a", name: "1 号楼", level: "楼栋" },
  { nodeId: "sp-b1-3f", topologyId: "space", parentId: "sp-b1", name: "3 层", level: "楼层" },
  { nodeId: "sp-b1-4f", topologyId: "space", parentId: "sp-b1", name: "4 层", level: "楼层" },
  { nodeId: "sp-b1-5f", topologyId: "space", parentId: "sp-b1", name: "5 层", level: "楼层" },
  { nodeId: "sp-b2", topologyId: "space", parentId: "sp-park-a", name: "2 号楼", level: "楼栋" },
  { nodeId: "sp-b2-1f", topologyId: "space", parentId: "sp-b2", name: "1 层", level: "楼层" },

  // 计量接线拓扑
  { nodeId: "md-b1", topologyId: "metering", parentId: null, name: "1 号楼进线", level: "进线" },
  { nodeId: "md-b1-3f", topologyId: "metering", parentId: "md-b1", name: "3 层配电箱", level: "配电箱" },
  { nodeId: "md-b1-4f", topologyId: "metering", parentId: "md-b1", name: "4 层配电箱", level: "配电箱" },
  { nodeId: "md-b1-5f", topologyId: "metering", parentId: "md-b1", name: "5 层配电箱", level: "配电箱" },
  { nodeId: "md-b2", topologyId: "metering", parentId: null, name: "2 号楼进线", level: "进线" },
  { nodeId: "md-b2-1f", topologyId: "metering", parentId: "md-b2", name: "1 层配电箱", level: "配电箱" },

  // 用能系统拓扑
  { nodeId: "sys-hvac", topologyId: "system", parentId: null, name: "空调系统", level: "系统" },
  { nodeId: "sys-lighting", topologyId: "system", parentId: null, name: "照明系统", level: "系统" },
  { nodeId: "sys-power", topologyId: "system", parentId: null, name: "动力与插座", level: "系统" },
  { nodeId: "sys-water", topologyId: "system", parentId: null, name: "给水系统", level: "系统" },
];

interface MeterSeed {
  meterId: string;
  externalMeterId: string;
  energyType: "electric" | "water";
  categoryId: string | null;
  /** 每日用量，用于生成累计读数序列 */
  daily: number;
  digitCount?: number | null;
}

export const SEED_METER_SEEDS: MeterSeed[] = [
  { meterId: "M-B1-E-TOT", externalMeterId: "EXT-E-1001", energyType: "electric", categoryId: null, daily: 1000 },
  { meterId: "M-B1-3F-E1", externalMeterId: "EXT-E-1101", energyType: "electric", categoryId: "hvac", daily: 150 },
  { meterId: "M-B1-3F-E2", externalMeterId: "EXT-E-1102", energyType: "electric", categoryId: "lighting", daily: 120 },
  { meterId: "M-B1-3F-E3", externalMeterId: "EXT-E-1103", energyType: "electric", categoryId: "power", daily: 130 },
  { meterId: "M-B1-4F-E1", externalMeterId: "EXT-E-1201", energyType: "electric", categoryId: "hvac-fan", daily: 200 },
  { meterId: "M-B1-4F-E2", externalMeterId: "EXT-E-1202", energyType: "electric", categoryId: "socket", daily: 150 },
  { meterId: "M-B1-5F-E1", externalMeterId: "EXT-E-1301", energyType: "electric", categoryId: "lighting", daily: 150 },
  { meterId: "M-B1-W-TOT", externalMeterId: "EXT-W-1001", energyType: "water", categoryId: null, daily: 30 },
  { meterId: "M-B1-3F-W", externalMeterId: "EXT-W-1101", energyType: "water", categoryId: "water", daily: 8 },
  { meterId: "M-B1-4F-W", externalMeterId: "EXT-W-1201", energyType: "water", categoryId: "water", daily: 7 },
  { meterId: "M-B1-5F-W", externalMeterId: "EXT-W-1301", energyType: "water", categoryId: "water", daily: 6 },
  { meterId: "M-B2-E-TOT", externalMeterId: "EXT-E-2001", energyType: "electric", categoryId: null, daily: 80, digitCount: 4 },
  { meterId: "M-B2-1F-E1", externalMeterId: "EXT-E-2101", energyType: "electric", categoryId: "hvac", daily: 80 },
];

export const SEED_METERS: Meter[] = SEED_METER_SEEDS.map((seed) => ({
  meterId: seed.meterId,
  sourceSystem: "upstream-meters",
  externalMeterId: seed.externalMeterId,
  energyType: seed.energyType,
  unit: seed.energyType === "electric" ? "kWh" : "m3",
  digitCount: seed.digitCount ?? null,
  categoryId: seed.categoryId,
  status: "active",
}));

export const SEED_BINDINGS: MeterBinding[] = [
  // 空间拓扑：表挂在空间节点上
  ...["M-B1-E-TOT", "M-B1-W-TOT"].map((meterId) => ({ meterId, topologyId: "space", nodeId: "sp-b1" })),
  ...["M-B1-3F-E1", "M-B1-3F-E2", "M-B1-3F-E3", "M-B1-3F-W"].map((meterId) => ({
    meterId,
    topologyId: "space",
    nodeId: "sp-b1-3f",
  })),
  ...["M-B1-4F-E1", "M-B1-4F-E2", "M-B1-4F-W"].map((meterId) => ({
    meterId,
    topologyId: "space",
    nodeId: "sp-b1-4f",
  })),
  ...["M-B1-5F-E1", "M-B1-5F-W"].map((meterId) => ({ meterId, topologyId: "space", nodeId: "sp-b1-5f" })),
  { meterId: "M-B2-E-TOT", topologyId: "space", nodeId: "sp-b2" },
  { meterId: "M-B2-1F-E1", topologyId: "space", nodeId: "sp-b2-1f" },

  // 计量接线拓扑：同一批表挂在配电箱/进线上
  ...["M-B1-E-TOT", "M-B1-W-TOT"].map((meterId) => ({ meterId, topologyId: "metering", nodeId: "md-b1" })),
  ...["M-B1-3F-E1", "M-B1-3F-E2", "M-B1-3F-E3", "M-B1-3F-W"].map((meterId) => ({
    meterId,
    topologyId: "metering",
    nodeId: "md-b1-3f",
  })),
  ...["M-B1-4F-E1", "M-B1-4F-E2", "M-B1-4F-W"].map((meterId) => ({
    meterId,
    topologyId: "metering",
    nodeId: "md-b1-4f",
  })),
  ...["M-B1-5F-E1", "M-B1-5F-W"].map((meterId) => ({ meterId, topologyId: "metering", nodeId: "md-b1-5f" })),
  { meterId: "M-B2-E-TOT", topologyId: "metering", nodeId: "md-b2" },
  { meterId: "M-B2-1F-E1", topologyId: "metering", nodeId: "md-b2-1f" },

  // 用能系统拓扑：按用途分组
  ...["M-B1-3F-E1", "M-B1-4F-E1", "M-B2-1F-E1"].map((meterId) => ({
    meterId,
    topologyId: "system",
    nodeId: "sys-hvac",
  })),
  ...["M-B1-3F-E2", "M-B1-5F-E1"].map((meterId) => ({ meterId, topologyId: "system", nodeId: "sys-lighting" })),
  ...["M-B1-3F-E3", "M-B1-4F-E2"].map((meterId) => ({ meterId, topologyId: "system", nodeId: "sys-power" })),
  ...["M-B1-3F-W", "M-B1-4F-W", "M-B1-5F-W"].map((meterId) => ({
    meterId,
    topologyId: "system",
    nodeId: "sys-water",
  })),
];
