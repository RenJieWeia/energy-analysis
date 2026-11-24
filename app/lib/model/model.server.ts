/**
 * 服务端装载：配置（JSON 文件）→ 注册表 + 读数。
 * 按配置哈希做进程内缓存：配置文件变了自动重建，不需要重启。
 */

import { ModelRegistry } from "./topology";
import { readConfig, type ModelConfigFile } from "./config.server";
import { generateReadings, DEFAULT_PERIOD } from "./data/readings";
import type { MeterReading } from "./types";

export interface LoadedModel {
  registry: ModelRegistry;
  readings: MeterReading[];
  defaultPeriod: { start: string; end: string };
  /** 配置哈希：编辑页保存时用于乐观锁 */
  configHash: string;
  /** 配置是否可写（只读文件系统时为 false） */
  config: ModelConfigFile;
}

let cache: { hash: string; model: LoadedModel } | null = null;

export function loadModelFromDisk(): LoadedModel {
  const { config, hash } = readConfig();
  if (cache !== null && cache.hash === hash) return cache.model;

  const model: LoadedModel = {
    registry: ModelRegistry.create({
      topologies: config.topologies,
      nodes: config.nodes,
      meters: config.meters,
      bindings: config.bindings,
      categories: config.categories,
    }),
    readings: generateReadings(),
    defaultPeriod: { start: DEFAULT_PERIOD.start, end: DEFAULT_PERIOD.end },
    configHash: hash,
    config,
  };
  cache = { hash, model };
  return model;
}

/** 保存后清缓存，下次读取立即生效 */
export function invalidateModelCache(): void {
  cache = null;
}
