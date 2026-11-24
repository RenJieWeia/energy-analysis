/**
 * 能耗平台 · 业务模型层（v0.1）
 *
 * 定位：平台只做「读取 + 派生」，不做落库。
 *   上游给：计量表号、自然边界的累计读数
 *   平台维护：拓扑（空间树）、分项分类、表与拓扑/分项的绑关系
 *   平台计算：累计读数差分 → 小时/日/月/年用量；本级实测与下级汇总共存
 *
 * 本文件只有类型，无运行时代码。
 */

/* ────────────────────────── 能源与单位 ────────────────────────── */

/** 平台只接两类能源；其他能源品种一律拒绝，不做折算 */
export type EnergyType = "electric" | "water";

export type EnergyUnit = "kWh" | "m3";

/** 能源与单位硬绑定：电=kWh、水=m³，不允许出现第三种映射 */
export const ENERGY_UNIT: Record<EnergyType, EnergyUnit> = {
  electric: "kWh",
  water: "m3",
};

export const ENERGY_LABEL: Record<EnergyType, string> = {
  electric: "用电",
  water: "用水",
};

export const UNIT_LABEL: Record<EnergyUnit, string> = {
  kWh: "kWh",
  m3: "m³",
};

/* ────────────────────────── 时间粒度 ────────────────────────── */

/** 四档自然粒度。粒度能力由「读点密度」推导，不由配置声明。 */
export type Granularity = "hour" | "day" | "month" | "year";

export const GRANULARITY_LABEL: Record<Granularity, string> = {
  hour: "小时",
  day: "日",
  month: "月",
  year: "年",
};

/** 平台时区固定东八区（无夏令时，自然边界唯一） */
export const PLATFORM_TIMEZONE = "Asia/Shanghai";

/* ────────────────────────── 拓扑定义 ────────────────────────── */

/**
 * 拓扑种类：同一批表可以同时属于多套拓扑，每套各算一套汇总与差额。
 *  - space    空间拓扑（园区/楼栋/楼层/房间）——默认主口径，分项占比取自这里
 *  - metering 计量接线拓扑（进线/配电箱/末端表）
 *  - system   用能系统拓扑（空调/照明/动力/给水…）
 *  - org      组织责任拓扑（部门/班组）
 */
export type TopologyKind = "space" | "metering" | "system" | "org";

export const TOPOLOGY_KIND_LABEL: Record<TopologyKind, string> = {
  space: "空间",
  metering: "计量接线",
  system: "用能系统",
  org: "组织责任",
};

/** 差额在不同拓扑下的含义不同，必须分开说明 */
export const TOPOLOGY_BALANCE_LABEL: Record<TopologyKind, string> = {
  space: "差额（未计量/公共/线损）",
  metering: "差额（总分表落差）",
  system: "差额（未分摊用量）",
  org: "差额（责任缺口）",
};

/** 空间拓扑实例的业态场景（决定用哪个编辑页；非空间拓扑为 null） */
export type ScenarioKey = "residential" | "office";

export interface Topology {
  topologyId: string;
  name: string;
  kind: TopologyKind;
  /** 业态场景：小区 / 办公园区；空表示该拓扑没有场景页（走通用编辑页） */
  scenario?: ScenarioKey | null;
  /** 主口径拓扑：分项占比只认它；有且只能有一个 */
  isPrimary: boolean;
  description?: string;
}

/* ────────────────────────── 拓扑节点 ────────────────────────── */

/**
 * 拓扑节点 = 空间节点，父子关系本身即计量层级。
 * 规则：
 *  - 深度不限；
 *  - 末端节点必须挂表（≥1 块）；
 *  - 中间节点可以挂表（总表），也可以不挂；
 *  - 中间节点既有本级总表、又有下级表时，两套数据共存，用于对账。
 */
export interface TopologyNode {
  nodeId: string;
  /** 所属拓扑：一个节点只属于一套拓扑 */
  topologyId: string;
  parentId: string | null;
  name: string;
  /** 层级名称，仅用于展示（园区/楼栋/楼层/房间/机房…） */
  level: string;
}

/* ────────────────────────── 计量表 ────────────────────────── */

export type MeterStatus = "active" | "inactive" | "replaced";

export interface Meter {
  /** 平台内计量点编号（业务身份，稳定） */
  meterId: string;
  /** 上游系统名与上游表号：这是「对应关系」的锚点 */
  sourceSystem: string;
  externalMeterId: string;
  energyType: EnergyType;
  unit: EnergyUnit;
  /** 表底位数：表底翻转识别的唯一依据；缺失则翻转一律标 suspect，不猜 */
  digitCount: number | null;
  /** 分项标签；末端表必须挂，中间节点总表不挂（null），避免占比重复统计 */
  categoryId: string | null;
  status: MeterStatus;
}

/**
 * 计量表在某套拓扑中的位置。
 * 同一 (meterId, topologyId) 只允许一条；跨拓扑可以各挂一个节点。
 */
export interface MeterBinding {
  meterId: string;
  topologyId: string;
  nodeId: string;
}

/* ────────────────────────── 分项分类 ────────────────────────── */

/** 一级分类由平台内置，二级及以下允许自定义 */
export type CategoryLevel = 1 | 2;

export interface CategoryNode {
  categoryId: string;
  parentId: string | null;
  name: string;
  level: CategoryLevel;
}

/* ────────────────────────── 上游读数 ────────────────────────── */

/**
 * 累计读数（表底值）：平台只读，不写、不落库。
 * readAt 必须落在自然边界上（分秒为 0），否则该读点被拒用。
 */
export interface MeterReading {
  meterId: string;
  /** ISO 8601，带 +08:00 偏移 */
  readAt: string;
  /** 表底累计值（未乘倍率；倍率不在本模型范围内） */
  cumulative: number;
  /** 上游给的读数质量；平台原样传递，不改写 */
  sourceQuality: "ok" | "estimated";
}

/* ────────────────────────── 派生用量 ────────────────────────── */

export type UsageMethod = "diff" | "diff_rollover";

/** normal 正常 / estimated 含估算读点 / suspect 可疑（已拒用或翻转无法修正）/ insufficient 不成立 */
export type UsageQuality = "normal" | "estimated" | "suspect" | "insufficient";

/** 区间用量（派生结果，不落库） */
export interface Usage {
  meterId: string;
  energyType: EnergyType;
  granularity: Granularity;
  periodStart: string;
  periodEnd: string;
  /** 用量；不可得为 null —— 不外推、不补零 */
  value: number | null;
  unit: EnergyUnit;
  method: UsageMethod | null;
  quality: UsageQuality;
  /** 区间内读点覆盖率 0..1 */
  coverage: number;
}

/** 节点用量：本级实测 与 下级汇总 共存 */
export interface NodeUsage {
  nodeId: string;
  energyType: EnergyType;
  granularity: Granularity;
  periodStart: string;
  periodEnd: string;
  /** 本级绑定表的实测用量；无表或不可得 → null */
  selfValue: number | null;
  /** 直接子节点用量之和；无子节点或全不可得 → null */
  rollupValue: number | null;
  /** 差额 = selfValue − rollupValue；两者都存在才计算 */
  balance: number | null;
  /** 差额占本级实测的比例；selfValue 为 0 或缺失 → null */
  balanceRatio: number | null;
  unit: EnergyUnit;
  /** measured 仅本级实测 / derived_from_children 仅下级汇总 / mixed 两侧都有 / unavailable 都不可得 */
  basis: "measured" | "derived_from_children" | "mixed" | "unavailable";
  quality: UsageQuality;
  /** 该节点区间覆盖率：本级与下级取最小；全不可得为 null */
  coverage: number | null;
}

/* ────────────────────────── 口径 ────────────────────────── */

/** 对齐方式：平台只接受「自然边界 + 累计读数差分」这一种 */
export type Alignment = "natural_boundary_cumulative_diff";

export interface Caliber {
  caliberVersion: string;
  granularity: Granularity;
  alignment: Alignment;
  timezone: string;
  /** 参与计算的计量表数量 */
  meterCount: number;
  /** 区间覆盖率（多表取最小） */
  coverage: number | null;
  /** 能力边界标签：供界面直接展示，不是文档 */
  limits: string[];
}
