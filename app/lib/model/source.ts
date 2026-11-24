/**
 * 上游读数来源接口。
 *
 * 平台只读不写：不落库、不改写上游数据、不做倍率换算。
 * 上游契约（平台按此约定解析，不在读取层做修正）：
 *  1. readAt 落在自然边界上（分秒为 0）；
 *  2. cumulative 是表底累计值，单调不减（表底翻转由平台按 digitCount 修正）；
 *  3. 单位与能源类型匹配（电 kWh / 水 m³），平台不做折算；
 *  4. 每块表给得出 digitCount，否则翻转只能标可疑；
 *  5. 与平台计量表的对应关系靠 (sourceSystem, externalMeterId) 对齐。
 */

import type { Meter, MeterReading } from "./types";

export interface ReadingRequest {
  /** 平台计量点编号 */
  meterIds: string[];
  /** 左闭右开区间，ISO 8601 */
  from: string;
  to: string;
}

export interface ExternalReadingSource {
  /** 上游系统名，写入口径 */
  readonly name: string;
  /** 上游的计量表档案（表号、能源类型、表底位数、状态） */
  listMeters(): Promise<Meter[]>;
  /** 指定计量表、指定区间的累计读数 */
  listReadings(request: ReadingRequest): Promise<MeterReading[]>;
  /** 可选：上游数据覆盖范围，用于禁用非法日期 */
  dataRange?(): Promise<{ first: string | null; last: string | null }>;
}

/** 按 (sourceSystem, externalMeterId) 建立上游表号 → 平台计量点的索引 */
export function indexByExternalId(meters: Meter[]): Map<string, Meter> {
  const index = new Map<string, Meter>();
  for (const meter of meters) {
    index.set(`${meter.sourceSystem}::${meter.externalMeterId}`, meter);
  }
  return index;
}
