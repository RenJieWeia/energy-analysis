import { useNavigation } from "react-router";

import type { Route } from "./+types/topology";

import PageHeader from "~/components/layout/page-header";
import FilterBar from "~/components/layout/filter-bar";
import { PeriodControls } from "~/components/layout/period-controls";
import { RouteErrorBoundary } from "~/components/layout/route-error";
import { Alert } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { EmptyState } from "~/components/ui/empty-state";
import { SegmentedControl } from "~/components/ui/segmented";
import { Skeleton, SkeletonCard } from "~/components/ui/skeleton";
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
import type { NodeUsage } from "~/lib/model/types";
import {
  ENERGY_LABEL,
  GRANULARITY_LABEL,
  TOPOLOGY_BALANCE_LABEL,
  TOPOLOGY_KIND_LABEL,
  UNIT_LABEL,
} from "~/lib/model/types";
import { buildTreeRows, depthPadding, nodeTotal, parseTopology, parseViewPeriod, topologyOptions } from "~/lib/model-view";
import { formatQuantity, formatRatio, formatSigned } from "~/lib/format";
import { Link } from "react-router";

export const meta: Route.MetaFunction = () => [
  { title: "拓扑总览 · 能耗分析" },
  { name: "description", content: "多套拓扑各算一套汇总与差额；电与水分开成账" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const model = loadModelFromDisk();
  const period = parseViewPeriod(url.searchParams, model);
  const topology = parseTopology(model, url.searchParams);

  const rows = buildTreeRows(model, topology.topologyId, period.granularity, period.periodStart, period.periodEnd);
  const usages = rows.flatMap((row) => [row.electric, row.water]);
  const caliber = buildCaliber({
    granularity: period.granularity,
    coverages: usages.map((usage) => usage.coverage),
    meterCount: model.registry.meters.size,
  });

  const roots = rows.filter((row) => row.depth === 0);
  const sumOf = (pick: (row: (typeof rows)[number]) => number | null): number | null => {
    const values = roots.map(pick).filter((value): value is number => value !== null);
    return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0);
  };

  return {
    rows,
    period,
    topology: {
      topologyId: topology.topologyId,
      name: topology.name,
      kind: topology.kind,
      scenario: topology.scenario ?? null,
      isPrimary: topology.isPrimary,
      description: topology.description ?? null,
    },
    topologies: topologyOptions(model),
    electricTotal: sumOf((row) => nodeTotal(row.electric)),
    waterTotal: sumOf((row) => nodeTotal(row.water)),
    coverage: caliber.coverage,
    caliberSummary: caliberSummary(caliber),
    caliberVersion: caliber.caliberVersion,
    meterCount: model.registry.meters.size,
    bindingCount: model.config.bindings.length,
  };
}

const BASIS_LABEL: Record<NodeUsage["basis"], string> = {
  measured: "仅本级实测",
  derived_from_children: "下级汇总·非实测",
  mixed: "本级与下级都有",
  unavailable: "不可得",
};

const BASIS_VARIANT: Record<NodeUsage["basis"], "success" | "warning" | "info" | "neutral"> = {
  measured: "success",
  derived_from_children: "warning",
  mixed: "info",
  unavailable: "neutral",
};

const QUALITY_LABEL: Record<NodeUsage["quality"], string> = {
  normal: "正常",
  estimated: "含估算",
  suspect: "可疑",
  insufficient: "不可得",
};

function ValueCell({ usage, kind, unit }: { usage: NodeUsage; kind: "self" | "rollup" | "balance"; unit: string }) {
  if (kind === "self") {
    return (
      <TableCell align="right" className="tnum">
        {usage.selfValue === null ? <span className="text-fg-subtle">无本级表</span> : `${formatQuantity(usage.selfValue)} ${unit}`}
      </TableCell>
    );
  }
  if (kind === "rollup") {
    return (
      <TableCell align="right" className="tnum">
        {usage.rollupValue === null ? <span className="text-fg-subtle">无下级</span> : `${formatQuantity(usage.rollupValue)} ${unit}`}
      </TableCell>
    );
  }
  if (usage.balance === null) {
    return (
      <TableCell align="right">
        <span className="text-xs text-fg-subtle">不可校验</span>
      </TableCell>
    );
  }
  const tone = usage.balance > 0 ? "text-warning" : usage.balance < 0 ? "text-danger" : "text-success";
  return (
    <TableCell align="right" className={`tnum font-medium ${tone}`}>
      {formatSigned(usage.balance)} {unit}
    </TableCell>
  );
}

function UsageCells({ usage, unit }: { usage: NodeUsage; unit: string }) {
  return (
    <>
      <ValueCell usage={usage} kind="self" unit={unit} />
      <ValueCell usage={usage} kind="rollup" unit={unit} />
      <ValueCell usage={usage} kind="balance" unit={unit} />
      <TableCell>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={BASIS_VARIANT[usage.basis]}>{BASIS_LABEL[usage.basis]}</Badge>
          {usage.basis !== "unavailable" && usage.quality !== "normal" ? (
            <Badge variant={usage.quality === "suspect" || usage.quality === "insufficient" ? "danger" : "warning"}>
              {QUALITY_LABEL[usage.quality]}
            </Badge>
          ) : null}
        </div>
      </TableCell>
    </>
  );
}

export default function TopologyPage({ loaderData }: Route.ComponentProps) {
  const {
    rows,
    period,
    topology,
    topologies,
    electricTotal,
    waterTotal,
    coverage,
    caliberVersion,
    meterCount,
    bindingCount,
  } = loaderData;
  const navigation = useNavigation();
  const loading = navigation.state === "loading";
  const extra = { topo: topology.topologyId };

  if (loading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
        <div className="flex flex-col gap-2 border-b border-line pb-4">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-3 w-full max-w-2xl" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonCard key={index} lines={2} />
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  const topologySwitch = (
    <SegmentedControl
      ariaLabel="拓扑切换"
      size="sm"
      value={topology.topologyId}
      options={topologies.map((item) => ({
        value: item.topologyId,
        label: item.isPrimary ? `${item.name}·主` : item.name,
      }))}
      onChange={(value) => {
        const query = new URLSearchParams({ g: period.granularity, d: period.periodStart.slice(0, 10), topo: value });
        window.location.assign(`?${query.toString()}`);
      }}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="拓扑总览"
        description="同一批表同时属于多套拓扑：空间、计量接线、用能系统。每套拓扑各算一套「本级实测 / 下级汇总 / 差额」，差额的含义随拓扑不同。电与水永远分成两组，不混算。"
        meta={
          <span className="tnum">
            {period.label} · {GRANULARITY_LABEL[period.granularity]}粒度 · 当前拓扑：{topology.name} · 口径 {caliberVersion}
          </span>
        }
        actions={
          <Link
            to={`/topology/edit?topo=${topology.topologyId}`}
            className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface-2"
          >
            编辑拓扑关系
          </Link>
        }
      />

      <FilterBar
        actions={
          <span className="text-xs text-fg-subtle">
            {period.available ? "当前粒度由读点密度支撑" : "当前粒度读点不足"}
          </span>
        }
      >
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-fg-muted">拓扑</span>
          {topologySwitch}
        </div>
        <PeriodControls granularity={period.granularity} periodStart={period.periodStart} extra={extra} />
      </FilterBar>

      <Alert
        variant={topology.isPrimary ? "info" : "warning"}
        title={`${TOPOLOGY_KIND_LABEL[topology.kind]}拓扑：${TOPOLOGY_BALANCE_LABEL[topology.kind]}`}
      >
        <span className="block">{topology.description ?? "该拓扑的汇总与差额独立计算。"}</span>
        <span className="block">
          {topology.isPrimary ? "它是主口径：分项占比只取自这套拓扑。" : "它不是主口径：只产出汇总与差额，不产出分项占比。"}
        </span>
      </Alert>

      {!period.available ? (
        <Alert variant="warning" title="该粒度不被读点支撑">
          示例读点最小间隔为一天，因此「小时」档无法差分，各项显示为不可得而不是 0。
        </Alert>
      ) : null}

      <section aria-label="合计" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>电合计（{topology.name}）</CardDescription>
            <CardTitle className="tnum text-2xl">
              {electricTotal === null ? "—" : formatQuantity(electricTotal)} {UNIT_LABEL.kWh}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>水合计（{topology.name}）</CardDescription>
            <CardTitle className="tnum text-2xl">
              {waterTotal === null ? "—" : formatQuantity(waterTotal)} {UNIT_LABEL.m3}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>计量表 / 绑定</CardDescription>
            <CardTitle className="tnum text-2xl">
              {meterCount} / {bindingCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>区间读数覆盖率</CardDescription>
            <CardTitle className="tnum text-2xl">{formatRatio(coverage)}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{topology.name}用量</CardTitle>
          <CardDescription>
            差额 = 本级实测 − 下级汇总，仅两侧都存在时计算；含义：{TOPOLOGY_BALANCE_LABEL[topology.kind]}。
            「下级汇总·非实测」表示该节点没有本级表，数字由子节点相加得到。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState
              title="该拓扑还没有节点"
              description="去「编辑拓扑关系」里新建根节点，或切换到其他拓扑查看。"
              action={
                <Link
                  to={`/topology/edit?topo=${topology.topologyId}`}
                  className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-fg"
                >
                  去维护
                </Link>
              }
            />
          ) : (
            <TableContainer maxHeight={640}>
              <Table>
                <TableCaption>
                  拓扑：{topology.name}；单位：电 {UNIT_LABEL.kWh}、水 {UNIT_LABEL.m3}；共 {rows.length} 个节点。
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>节点</TableHead>
                    <TableHead align="right" hint="该节点自己绑定的表的实测用量">电 · 本级实测</TableHead>
                    <TableHead align="right" hint="直接子节点用量之和">电 · 下级汇总</TableHead>
                    <TableHead align="right" hint={TOPOLOGY_BALANCE_LABEL[topology.kind]}>电 · 差额</TableHead>
                    <TableHead>电 · 口径</TableHead>
                    <TableHead align="right">水 · 本级实测</TableHead>
                    <TableHead align="right">水 · 下级汇总</TableHead>
                    <TableHead align="right">水 · 差额</TableHead>
                    <TableHead>水 · 口径</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.nodeId}>
                      <TableCell truncate={false}>
                        <div className="flex items-center gap-2" style={{ paddingLeft: depthPadding(row.depth) }}>
                          <span className="font-medium text-fg">{row.name}</span>
                          <Badge variant="neutral">{row.level}</Badge>
                          <Badge variant={row.isLeaf ? "info" : "neutral"}>
                            {row.isLeaf ? "末端" : `中间·${row.childCount} 子级`}
                          </Badge>
                          <span className="text-xs text-fg-subtle">{row.meterCount} 块表</span>
                        </div>
                      </TableCell>
                      <UsageCells usage={row.electric} unit={UNIT_LABEL.kWh} />
                      <UsageCells usage={row.water} unit={UNIT_LABEL.m3} />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>同一批表，三套视角</CardTitle>
          <CardDescription>{ENERGY_LABEL.electric}与{ENERGY_LABEL.water}量纲不同，永远分成两组列；同一块表在空间、接线、系统三套拓扑里各有一个位置。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-xs leading-5 text-fg-muted">
          <p>· 空间拓扑：回答「哪个房间/楼层用得多」，差额指向未计量与公共用电。</p>
          <p>· 计量接线拓扑：回答「总分表差多少」，差额是进线与各配电箱之和的落差。</p>
          <p>· 用能系统拓扑：回答「空调/照明/动力各占多少」，差额是未归入任何系统的用量。</p>
          <p>· 切换拓扑不改变读数与派生用量，只改变汇总口径。</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary label="拓扑总览" />;
}
