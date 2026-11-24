/**
 * 模型配置文件的读写（仅在服务端使用，文件名带 .server 由框架排除出客户端包）。
 *
 * 存储：app/lib/model/data/model-config.json
 * 本模块不做任何校验：文件不存在就写初始配置，写盘失败就抛错由调用方兜底。
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type { CategoryNode, Meter, MeterBinding, Topology, TopologyNode } from "./types";
import { SEED_BINDINGS, SEED_CATEGORIES, SEED_METERS, SEED_NODES, SEED_TOPOLOGIES } from "./data/seed-config";

export interface ModelConfigFile {
  version: number;
  updatedAt: string;
  topologies: Topology[];
  nodes: TopologyNode[];
  meters: Meter[];
  bindings: MeterBinding[];
  categories: CategoryNode[];
}

export function configPath(): string {
  return resolve(process.cwd(), "app/lib/model/data/model-config.json");
}

export function serializeConfig(config: ModelConfigFile): string {
  return `${JSON.stringify(config, null, 2)}\n`;
}

/** 内容哈希：只用于进程内缓存键，不做乐观锁 */
export function hashConfig(text: string): string {
  return createHash("sha1").update(text).digest("hex").slice(0, 12);
}

export function seedConfig(): ModelConfigFile {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    topologies: SEED_TOPOLOGIES,
    nodes: SEED_NODES,
    meters: SEED_METERS,
    bindings: SEED_BINDINGS,
    categories: SEED_CATEGORIES,
  };
}

export interface ReadConfigResult {
  config: ModelConfigFile;
  hash: string;
  seeded: boolean;
}

/** 老配置没有 scenario 字段：空间拓扑默认按办公处理，其他留空 */
function normalize(config: ModelConfigFile): ModelConfigFile {
  return {
    ...config,
    topologies: config.topologies.map((topology) => ({
      ...topology,
      scenario: topology.scenario ?? (topology.kind === "space" ? "office" : null),
    })),
  };
}

export function readConfig(): ReadConfigResult {
  const path = configPath();
  if (!existsSync(path)) {
    const seed = seedConfig();
    const text = serializeConfig(seed);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text, "utf8");
    return { config: normalize(seed), hash: hashConfig(text), seeded: true };
  }
  const text = readFileSync(path, "utf8");
  return { config: normalize(JSON.parse(text) as ModelConfigFile), hash: hashConfig(text), seeded: false };
}

/** 写入配置；失败直接抛错（由 action 兜底成页面提示） */
export function writeConfig(patch: Omit<ModelConfigFile, "version" | "updatedAt">): { hash: string; updatedAt: string; version: number } {
  const path = configPath();
  let version = 0;
  if (existsSync(path)) {
    try {
      version = (JSON.parse(readFileSync(path, "utf8")) as ModelConfigFile).version ?? 0;
    } catch {
      version = 0;
    }
  }
  const next: ModelConfigFile = {
    version: version + 1,
    updatedAt: new Date().toISOString(),
    topologies: patch.topologies,
    nodes: patch.nodes,
    meters: patch.meters,
    bindings: patch.bindings,
    categories: patch.categories,
  };
  const text = serializeConfig(next);
  writeFileSync(path, text, "utf8");
  return { hash: hashConfig(text), updatedAt: next.updatedAt, version: next.version };
}
