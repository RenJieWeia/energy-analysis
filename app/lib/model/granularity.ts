/**
 * 自然边界与粒度能力。
 *
 * 两条硬规矩：
 *  1. 边界由平台定义（东八区、无夏令时）：小时=整点、日=本地 00:00、月=1 日 00:00、年=1 月 1 日 00:00。
 *  2. 某块表能出哪一档粒度，由「读点最小间隔」推导，不由配置声明；读点不够就是不可用，不显示 0。
 */

import type { Granularity } from "./types";

const TZ_MINUTES = 8 * 60;
const MS_MINUTE = 60_000;
const MS_HOUR = 3_600_000;
const MS_DAY = 24 * MS_HOUR;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** 毫秒时间戳 → 东八区 ISO 字符串（带 +08:00） */
export function formatIso(ms: number): string {
  const d = new Date(ms + TZ_MINUTES * MS_MINUTE);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}T${pad2(
    d.getUTCHours(),
  )}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}+08:00`;
}

/** ISO 字符串 → 毫秒时间戳；非法输入直接抛错（配置文件/上游数据错误应当立刻暴露） */
export function parseIso(iso: string): number {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new Error(`时间格式无法解析：${iso}`);
  return ms;
}

function localParts(ms: number): { y: number; mo: number; d: number; h: number } {
  const d = new Date(ms + TZ_MINUTES * MS_MINUTE);
  return { y: d.getUTCFullYear(), mo: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours() };
}

function localToMs(y: number, mo: number, d: number, h = 0): number {
  return Date.UTC(y, mo, d, h) - TZ_MINUTES * MS_MINUTE;
}

/** 该时间点所属自然区间的起点（毫秒） */
function periodStartMs(ms: number, granularity: Granularity): number {
  const { y, mo, d, h } = localParts(ms);
  switch (granularity) {
    case "hour":
      return localToMs(y, mo, d, h);
    case "day":
      return localToMs(y, mo, d);
    case "month":
      return localToMs(y, mo, 1);
    case "year":
      return localToMs(y, 0, 1);
  }
}

/** 区间起点 → 下一个同粒度区间的起点（毫秒） */
function nextPeriodMs(startMs: number, granularity: Granularity): number {
  const { y, mo, d, h } = localParts(startMs);
  switch (granularity) {
    case "hour":
      return localToMs(y, mo, d, h + 1);
    case "day":
      return localToMs(y, mo, d + 1);
    case "month":
      return localToMs(y, mo + 1, 1);
    case "year":
      return localToMs(y + 1, 0, 1);
  }
}

/** ISO → 该时间点所属自然区间的起点 ISO */
export function periodStartOf(iso: string, granularity: Granularity): string {
  return formatIso(periodStartMs(parseIso(iso), granularity));
}

/** 区间起点 → 区间终点（左闭右开） */
export function periodEndOf(startIso: string, granularity: Granularity): string {
  return formatIso(nextPeriodMs(parseIso(startIso), granularity));
}

/** 是否为某粒度的自然边界 */
export function isNaturalBoundary(iso: string, granularity: Granularity): boolean {
  const ms = parseIso(iso);
  return ms === periodStartMs(ms, granularity);
}

/** 读点是否可承载任意粒度：必须是整点（分秒为 0），且落在小时边界上 */
export function isReadingBoundary(iso: string): boolean {
  return isNaturalBoundary(iso, "hour");
}

const RANK: Record<Granularity, number> = { hour: 1, day: 2, month: 3, year: 4 };

/** 粒度粗细：hour < day < month < year */
export function granularityRank(granularity: Granularity): number {
  return RANK[granularity];
}

export interface Capability {
  /** 该表能支撑的最细粒度；读点不足 2 个时为 null（任何粒度都不可用） */
  lowest: Granularity | null;
  /** 读点最小间隔（毫秒） */
  gapMs: number | null;
  sampleSize: number;
}

/**
 * 由读点序列推导粒度能力。
 * 只看间隔，不看数量：间隔 1 小时的表能出小时；只有日读点的表只能出日/月/年。
 */
export function capabilityOf(readings: { readAt: string }[]): Capability {
  const points = readings.map((reading) => parseIso(reading.readAt)).sort((a, b) => a - b);
  if (points.length < 2) return { lowest: null, gapMs: null, sampleSize: points.length };

  let gapMs = Number.POSITIVE_INFINITY;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const cur = points[i];
    if (prev === undefined || cur === undefined) continue;
    gapMs = Math.min(gapMs, cur - prev);
  }
  if (!Number.isFinite(gapMs)) return { lowest: null, gapMs: null, sampleSize: points.length };

  let lowest: Granularity;
  if (gapMs <= MS_HOUR) lowest = "hour";
  else if (gapMs <= MS_DAY) lowest = "day";
  else if (gapMs <= 31 * MS_DAY) lowest = "month";
  else lowest = "year";

  return { lowest, gapMs, sampleSize: points.length };
}

/** 目标粒度是否可用：可用当且仅当目标粒度不细于该表能支撑的最细粒度 */
export function granularityAvailable(capability: Capability, target: Granularity): boolean {
  if (capability.lowest === null) return false;
  return granularityRank(target) >= granularityRank(capability.lowest);
}

/** 区间内按目标粒度应有几个边界点（左闭右开区间内的起点数量 + 1） */
export function expectedBoundaryPoints(startIso: string, endIso: string, granularity: Granularity): number {
  const startMs = parseIso(startIso);
  const endMs = parseIso(endIso);
  if (endMs <= startMs) return 0;
  let count = 0;
  let cursor = periodStartMs(startMs, granularity);
  while (cursor < endMs) {
    count += 1;
    cursor = nextPeriodMs(cursor, granularity);
    if (count > 500_000) break; // 防御：异常区间不允许无界循环
  }
  return count;
}
