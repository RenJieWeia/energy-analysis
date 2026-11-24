/**
 * 示例读数：按「每个自然边界一个累计值」生成，同一条序列支撑日/月/年三档。
 * 小时档因为读点间隔为一天而不可用——有意保留的边界演示。
 */

import type { MeterReading } from "../types";
import { SEED_METER_SEEDS } from "./seed-config";

const DAY_MS = 86_400_000;
const YEAR_START = "2026-01-01T00:00:00+08:00";

export const DEFAULT_PERIOD = {
  start: "2026-11-17T00:00:00+08:00",
  end: "2026-11-18T00:00:00+08:00",
} as const;

const BOUNDARY_POINTS = [
  "2026-01-01T00:00:00+08:00",
  "2026-06-01T00:00:00+08:00",
  "2026-11-01T00:00:00+08:00",
  "2026-11-16T00:00:00+08:00",
  "2026-11-17T00:00:00+08:00",
  "2026-11-18T00:00:00+08:00",
  "2026-12-01T00:00:00+08:00",
  "2027-01-01T00:00:00+08:00",
];

function daysSinceYearStart(iso: string): number {
  return Math.round((Date.parse(iso) - Date.parse(YEAR_START)) / DAY_MS);
}

export function generateReadings(): MeterReading[] {
  return SEED_METER_SEEDS.flatMap((seed) => {
    const mod = seed.digitCount === null || seed.digitCount === undefined ? null : 10 ** seed.digitCount;
    return BOUNDARY_POINTS.map((iso) => {
      const raw = seed.daily * daysSinceYearStart(iso);
      const cumulative = mod === null ? raw : ((raw % mod) + mod) % mod;
      return { meterId: seed.meterId, readAt: iso, cumulative, sourceQuality: "ok" as const };
    });
  });
}
