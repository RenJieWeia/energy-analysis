import { useState } from "react";

import type { Route } from "./+types/meters";
import { Link, useNavigate, useNavigation, useSearchParams } from "react-router";

import PageHeader from "~/components/layout/page-header";
import FilterBar, { FilterField } from "~/components/layout/filter-bar";
import { PeriodControls } from "~/components/layout/period-controls";
import { RouteErrorBoundary } from "~/components/layout/route-error";
import { Alert } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Drawer } from "~/components/ui/drawer";
import { EmptyState } from "~/components/ui/empty-state";
import { Pagination } from "~/components/ui/pagination";
import { Select } from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { buildCaliber, caliberSummary } from "~/lib/model/caliber";
import { loadModelFromDisk } from "~/lib/model/model.server";
import { ENERGY_LABEL, GRANULARITY_LABEL, UNIT_LABEL, type MeterStatus, type UsageQuality } from "~/lib/model/types";
import { buildMeterRows, parseTopology, parseViewPeriod, topologyOptions } from "~/lib/model-view";
import { formatDateTime, formatQuantity, formatRatio } from "~/lib/format";

export const meta: Route.MetaFunction = () => [
  { title: "计量表 · 能耗分析" },
  { name: "description", content: "计量表清单：表号来自上游，绑定关系由平台维护" },
];

const PAGE_SIZES = [10, 20, 50];
const SORTS = ["meterId", "externalMeterId", "nodeName", "usage", "coverage"] as const;
type SortKey = (typeof SORTS)[number];

const QUALITY_LABEL: Record<UsageQuality, string> = {
  normal: "正常",
  estimated: "含估算",
  suspect: "可疑",
  insufficient: "不可得",
};

const QUALITY_VARIANT: Record<UsageQuality, "success" | "warning" | "danger" | "neutral"> = {
  normal: "success",
  estimated: "warning",
  suspect: "danger",
  insufficient: "neutral",
};

const STATUS_LABEL: Record<MeterStatus, string> = {
  active: "在用",
  inactive: "停用",
  replaced: "已换表",
};

function pickSort(raw: string | null): SortKey {
  return SORTS.includes(raw as SortKey) ? (raw as SortKey) : "meterId";
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const model = loadModelFromDisk();
  const period = parseViewPeriod(searchParams, model);
  const topology = parseTopology(model, searchParams);

  const keyword = (searchParams.get("q") ?? "").trim().toLowerCase();
  const energyType = searchParams.get("e") ?? "";
  const nodeId = searchParams.get("node") ?? "";
  const categoryId = searchParams.get("cat") ?? "";
  const status = searchParams.get("status") ?? "";
  const sort = pickSort(searchParams.get("sort"));
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const rawSize = Number(searchParams.get("size") ?? "10");
  const size = PAGE_SIZES.includes(rawSize) ? rawSize : 10;
  const rawPage = Number(searchParams.get("page") ?? "1");
  const requestedPage = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;

  let rows = buildMeterRows(model, topology.topologyId, period.granularity, period.periodStart, period.periodEnd);

  if (keyword !== "") {
    rows = rows.filter(
      (row) =>
        row.meter.meterId.toLowerCase().includes(keyword) ||
        row.meter.externalMeterId.toLowerCase().includes(keyword) ||
        row.nodePath.toLowerCase().includes(keyword),
    );
  }
  if (energyType !== "") rows = rows.filter((row) => row.meter.energyType === energyType);
  if (nodeId !== "") rows = rows.filter((row) => row.allBindings.some((binding) => binding.nodeId === nodeId));
  if (categoryId !== "") rows = rows.filter((row) => row.meter.categoryId === categoryId);
  if (status !== "") rows = rows.filter((row) => row.meter.status === status);

  rows = [...rows].sort((a, b) => {
    const dir = order === "asc" ? 1 : -1;
    switch (sort) {
      case "externalMeterId":
        return dir * a.meter.externalMeterId.localeCompare(b.meter.externalMeterId, "zh-CN");
      case "nodeName":
        return dir * a.nodePath.localeCompare(b.nodePath, "zh-CN");
      case "usage":
        return dir * ((a.usage.value ?? -1) - (b.usage.value ?? -1));
      case "coverage":
        return dir * (a.usage.coverage - b.usage.coverage);
      case "meterId":
      default:
        return dir * a.meter.meterId.localeCompare(b.meter.meterId, "zh-CN");
    }
  });

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const page = Math.min(requestedPage, pageCount);
  const offset = (page - 1) * size;

  const caliber = buildCaliber({
    granularity: period.granularity,
    coverages: rows.map((row) => row.usage.coverage),
    meterCount: model.registry.meters.size,
  });

  return {
    rows: rows.slice(offset, offset + size),
    readings: model.readings,
    total,
    page,
    size,
    sort,
    order,
    period,
    coverage: caliber.coverage,
    caliberSummary: caliberSummary(caliber),
    topology: { topologyId: topology.topologyId, name: topology.name },
    topologies: topologyOptions(model),
    options: {
      nodes: model.registry
        .nodesOf(topology.topologyId)
        .map((node) => ({ value: node.nodeId, label: node.name })),
      categories: [...model.registry.categories.values()].map((category) => ({
        value: category.categoryId,
        label: category.name,
      })),
    },
    filters: { keyword, energyType, nodeId, categoryId, status },
  };
}

/** 基于当前 URL 生成新 URL（QueryState 唯一事实源） */
function hrefWith(current: URLSearchParams, patch: Record<string, string | number>): string {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(patch)) {
    if (value === "" || value === undefined) next.delete(key);
    else next.set(key, String(value));
  }
  return `?${next.toString()}`;
}

export default function MetersPage({ loaderData }: Route.ComponentProps) {
  const { rows, readings, total, page, size, sort, order, period, coverage, filters, options, topology, topologies } = loaderData;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const [selectedMeterId, setSelectedMeterId] = useState<string | null>(null);
  const loading = navigation.state === "loading";

  const selected = rows.find((row) => row.meter.meterId === selectedMeterId) ?? null;
  const selectedReadings = selectedMeterId === null
    ? []
    : readings
        .filter((reading) => reading.meterId === selectedMeterId)
        .sort((a, b) => Date.parse(a.readAt) - Date.parse(b.readAt));

  const sortHref = (key: SortKey): string =>
    hrefWith(searchParams, {
      sort: key,
      order: sort === key && order === "desc" ? "asc" : "desc",
      page: 1,
    });

  const ariaSort = (key: SortKey): "ascending" | "descending" | "none" =>
    sort === key ? (order === "asc" ? "ascending" : "descending") : "none";

  const sortMark = (key: SortKey): string => (sort === key ? (order === "asc" ? " ↑" : " ↓") : "");

  const hasFilter =
    filters.keyword !== "" ||
    filters.energyType !== "" ||
    filters.nodeId !== "" ||
    filters.categoryId !== "" ||
    filters.status !== "";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="计量表"
        description="表号与读数来自上游系统；表挂在哪个节点、算什么分项，由平台维护。区间用量由累计读数差分得到，不可得就是不可得。"
        meta={
          <span className="tnum">
            {period.label} · {GRANULARITY_LABEL[period.granularity]}粒度 · 覆盖率 {formatRatio(coverage)} · 共 {total} 块表
          </span>
        }
      />

      <FilterBar
        sticky
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-fg-subtle">
              {hasFilter ? "已筛选" : "全部计量表"} · 第 {page} / {Math.max(1, Math.ceil(total / size))} 页
            </span>
            {hasFilter ? (
              <Button asChild size="sm" variant="ghost">
                <Link to="?">清除筛选</Link>
              </Button>
            ) : null}
          </div>
        }
      >
        <PeriodControls
          granularity={period.granularity}
          periodStart={period.periodStart}
          extra={Object.fromEntries(
            Object.entries(filters).filter(([, value]) => value !== ""),
          )}
        />
        <FilterField label="关键词">
          <input
            type="search"
            defaultValue={filters.keyword}
            placeholder="表号 / 上游表号 / 节点"
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              const value = event.currentTarget.value.trim();
              navigate(hrefWith(searchParams, { q: value, page: 1 }));
            }}
            className="h-8 w-44 rounded-md border border-line bg-surface px-2.5 text-sm text-fg"
          />
        </FilterField>
        <FilterField label="能源">
          <Select
            size="sm"
            value={filters.energyType}
            ariaLabel="能源类型"
            placeholder="全部"
            options={[
              { value: "electric", label: ENERGY_LABEL.electric },
              { value: "water", label: ENERGY_LABEL.water },
            ]}
            onValueChange={(value) => navigate(hrefWith(searchParams, { e: value, page: 1 }))}
          />
        </FilterField>
        <FilterField label="节点">
          <Select
            size="sm"
            value={filters.nodeId}
            ariaLabel="节点"
            placeholder="全部"
            options={options.nodes}
            onValueChange={(value) => navigate(hrefWith(searchParams, { node: value, page: 1 }))}
          />
        </FilterField>
        <FilterField label="分项">
          <Select
            size="sm"
            value={filters.categoryId}
            ariaLabel="分项"
            placeholder="全部"
            options={options.categories}
            onValueChange={(value) => navigate(hrefWith(searchParams, { cat: value, page: 1 }))}
          />
        </FilterField>
        <FilterField label="状态">
          <Select
            size="sm"
            value={filters.status}
            ariaLabel="状态"
            placeholder="全部"
            options={[
              { value: "active", label: "在用" },
              { value: "inactive", label: "停用" },
              { value: "replaced", label: "已换表" },
            ]}
            onValueChange={(value) => navigate(hrefWith(searchParams, { status: value, page: 1 }))}
          />
        </FilterField>
      </FilterBar>

      {!period.available ? (
        <Alert variant="info" title="该粒度没有可用读点">
          示例读点最小间隔为一天，「小时」档算不出端点差，用量显示为空。
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>计量表清单</CardTitle>
          <CardDescription>
            服务端筛选/排序/分页；每页 {size} 条，当前筛选共 {total} 条。点击行查看读点序列与各拓扑位置。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-2" aria-busy="true">
              {Array.from({ length: size }, (_, index) => (
                <Skeleton key={index} className="h-11 w-full" />
              ))}
            </div>
          ) : total === 0 ? (
            <EmptyState
              title="没有匹配的计量表"
              description="当前筛选条件下没有结果，可以清除筛选重新查看。"
              action={
                <Button asChild size="sm" variant="outline">
                  <Link to="?">清除筛选</Link>
                </Button>
              }
            />
          ) : (
            <>
              <TableContainer maxHeight={640}>
                <Table>
                  <TableCaption>
                    单位随能源类型固定（电 {UNIT_LABEL.kWh} / 水 {UNIT_LABEL.m3}），平台不做折算；表底位数为空时无法判定翻转，该区间标可疑。
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead aria-sort={ariaSort("meterId")}>
                        <Link to={sortHref("meterId")}>平台表号{sortMark("meterId")}</Link>
                      </TableHead>
                      <TableHead aria-sort={ariaSort("externalMeterId")}>
                        <Link to={sortHref("externalMeterId")}>上游表号{sortMark("externalMeterId")}</Link>
                      </TableHead>
                      <TableHead>能源</TableHead>
                      <TableHead align="right">单位</TableHead>
                      <TableHead aria-sort={ariaSort("nodeName")}>
                        <Link to={sortHref("nodeName")}>节点路径（{topology.name}）{sortMark("nodeName")}</Link>
                      </TableHead>
                      <TableHead>分项</TableHead>
                      <TableHead align="right" hint="缺表底位数时无法判定表底翻转">
                        表底位数
                      </TableHead>
                      <TableHead align="right">读点数</TableHead>
                      <TableHead align="right" hint="读点最小间隔，决定能出哪一档粒度">
                        最小间隔
                      </TableHead>
                      <TableHead align="right" aria-sort={ariaSort("usage")}>
                        <Link to={sortHref("usage")}>区间用量{sortMark("usage")}</Link>
                      </TableHead>
                      <TableHead align="right" aria-sort={ariaSort("coverage")}>
                        <Link to={sortHref("coverage")}>覆盖率{sortMark("coverage")}</Link>
                      </TableHead>
                      <TableHead>质量</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow
                        key={row.meter.meterId}
                        className="cursor-pointer"
                        onClick={() => setSelectedMeterId(row.meter.meterId)}
                      >
                        <TableCell className="font-medium">{row.meter.meterId}</TableCell>
                        <TableCell className="text-fg-muted">{row.meter.externalMeterId}</TableCell>
                        <TableCell>{ENERGY_LABEL[row.meter.energyType]}</TableCell>
                        <TableCell align="right">{row.unit}</TableCell>
                        <TableCell hint={row.nodePath}>{row.nodePath}</TableCell>
                        <TableCell>{row.categoryName ?? <span className="text-fg-subtle">未打标签</span>}</TableCell>
                        <TableCell align="right" className="tnum">
                          {row.meter.digitCount === null ? <span className="text-fg-subtle">—</span> : row.meter.digitCount}
                        </TableCell>
                        <TableCell align="right" className="tnum">{row.readingCount}</TableCell>
                        <TableCell align="right" className="tnum">{row.gapLabel}</TableCell>
                        <TableCell align="right" className="tnum">
                          {row.usage.value === null ? (
                            <span className="text-fg-subtle">不可得</span>
                          ) : (
                            `${formatQuantity(row.usage.value)} ${row.unit}`
                          )}
                        </TableCell>
                        <TableCell align="right" className="tnum">{formatRatio(row.usage.coverage)}</TableCell>
                        <TableCell>
                          <Badge variant={QUALITY_VARIANT[row.usage.quality]}>{QUALITY_LABEL[row.usage.quality]}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <div className="mt-3">
                <Pagination
                  page={page}
                  pageSize={size}
                  total={total}
                  onPageChange={(next) => navigate(hrefWith(searchParams, { page: next }))}
                  onPageSizeChange={(next) => navigate(hrefWith(searchParams, { size: next, page: 1 }))}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Drawer
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedMeterId(null);
        }}
        title={selected === null ? "计量表明细" : `${selected.meter.meterId} · ${ENERGY_LABEL[selected.meter.energyType]}`}
        description={selected === null ? undefined : `${selected.meter.sourceSystem} / ${selected.meter.externalMeterId}`}
        width="lg"
      >
        {selected === null ? null : (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-fg-subtle">节点路径</dt>
                <dd className="text-fg">{selected.nodePath}</dd>
              </div>
              <div>
                <dt className="text-xs text-fg-subtle">分项</dt>
                <dd className="text-fg">{selected.categoryName ?? "未打标签"}</dd>
              </div>
              <div>
                <dt className="text-xs text-fg-subtle">单位</dt>
                <dd className="text-fg">{selected.unit}</dd>
              </div>
              <div>
                <dt className="text-xs text-fg-subtle">表底位数</dt>
                <dd className="text-fg">{selected.meter.digitCount ?? "未提供（无法判翻转）"}</dd>
              </div>
              <div>
                <dt className="text-xs text-fg-subtle">状态</dt>
                <dd className="text-fg">{STATUS_LABEL[selected.meter.status]}</dd>
              </div>
              <div>
                <dt className="text-xs text-fg-subtle">本区间用量</dt>
                <dd className="tnum text-fg">
                  {selected.usage.value === null
                    ? "不可得"
                    : `${formatQuantity(selected.usage.value)} ${selected.unit} · 覆盖率 ${formatRatio(selected.usage.coverage)}`}
                </dd>
              </div>
            </dl>

            <div>
              <h4 className="mb-1.5 text-xs font-medium text-fg-muted">读点序列（自然边界累计值）</h4>
              <div className="max-h-52 overflow-auto rounded-md border border-line">
                <table className="w-full text-xs">
                  <thead className="bg-surface-2 text-fg-muted">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium">读数时间</th>
                      <th className="px-2 py-1.5 text-right font-medium">表底累计值</th>
                      <th className="px-2 py-1.5 text-left font-medium">上游质量</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReadings.map((reading) => (
                      <tr key={reading.readAt} className="border-t border-line">
                        <td className="px-2 py-1.5">{formatDateTime(reading.readAt)}</td>
                        <td className="tnum px-2 py-1.5 text-right">{formatQuantity(reading.cumulative, 3)}</td>
                        <td className="px-2 py-1.5 text-fg-muted">
                          {reading.sourceQuality === "ok" ? "正常" : "估算"}
                        </td>
                      </tr>
                    ))}
                    {selectedReadings.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-2 py-3 text-center text-fg-subtle">
                          该表没有读点
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="mb-1.5 text-xs font-medium text-fg-muted">该表在各拓扑中的位置</h4>
              <ul className="flex flex-col gap-1">
                {selected.allBindings.map((binding) => (
                  <li key={binding.topologyId} className="flex items-center justify-between gap-2 rounded-md bg-surface-2 px-2 py-1 text-xs">
                    <span className="text-fg-muted">{binding.topologyName}</span>
                    <span className={binding.nodePath === null ? "text-fg-subtle" : "text-fg"}>
                      {binding.nodePath ?? "未挂载"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs leading-5 text-fg-subtle">
              用量 = 区间终点表底 − 区间起点表底；端点缺失时用量为空；表底翻转按位数修正。倍率不在本模型范围内。
            </p>
          </div>
        )}
      </Drawer>
    </div>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary label="计量表" />;
}
