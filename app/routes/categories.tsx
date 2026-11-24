import type { Route } from "./+types/categories";

import PageHeader from "~/components/layout/page-header";
import { RouteErrorBoundary } from "~/components/layout/route-error";
import { Alert } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { EmptyState } from "~/components/ui/empty-state";
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
import { ENERGY_LABEL, UNIT_LABEL } from "~/lib/model/types";
import { deriveUsage } from "~/lib/model/derive";
import { loadModelFromDisk } from "~/lib/model/model.server";
import { buildCategoryRows, buildSharePartition, parseViewPeriod } from "~/lib/model-view";

export const meta: Route.MetaFunction = () => [
  { title: "分项分类 · 能耗分析" },
  { name: "description", content: "分项分类树与占比范围划分：只有末端表进入分项占比" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const model = loadModelFromDisk();
  const period = parseViewPeriod(new URL(request.url).searchParams, model);
  const meterUsages = [...model.registry.meters.values()].map((meter) =>
    deriveUsage(meter, period.granularity, period.periodStart, period.periodEnd, model.readings),
  );
  const caliber = buildCaliber({
    granularity: period.granularity,
    coverages: meterUsages.map((usage) => usage.coverage),
    meterCount: meterUsages.length,
  });

  return {
    rows: buildCategoryRows(model),
    partition: buildSharePartition(model),
    caliberSummary: caliberSummary(caliber),
  };
}

export default function CategoriesPage({ loaderData }: Route.ComponentProps) {
  const { rows, partition } = loaderData;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="分项分类"
        description="一级分类由平台内置，二级可自定义。分项标签打在计量表上，而占比只统计末端节点的表——中间节点总表只参与总量与对账。"
      />

      <Alert variant="info" title="为什么总表不参与分项占比">
        同一分项如果既挂在楼栋总表、又挂在楼层分表上，占比会被算两次、甚至超过 100%。所以平台只把末端节点的表计入占比；总表的用途是与下级汇总对账（见「拓扑总览」的差额列）。
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>分类树</CardTitle>
          <CardDescription>
            共 {rows.length} 个分类节点。「可进占比」表示该分类下的表全部位于末端节点，可安全参与用途占比。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState title="没有分项分类" description="先在平台维护一级标准分类，再按项目加二级。" />
          ) : (
            <TableContainer maxHeight={520}>
              <Table>
                <TableCaption>分类与表绑定关系由平台维护；电与水在各自口径下统计，不相加。</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>分类</TableHead>
                    <TableHead>级别</TableHead>
                    <TableHead align="right">表数</TableHead>
                    <TableHead>能源类型</TableHead>
                    <TableHead>可进占比</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.categoryId}>
                      <TableCell truncate={false}>
                        <span style={{ paddingLeft: `${row.depth * 20}px` }} className="font-medium text-fg">
                          {row.name}
                        </span>
                        <span className="ml-2 text-xs text-fg-subtle">{row.categoryId}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.level === 1 ? "brand" : "neutral"}>
                          {row.level === 1 ? "内置一级" : "自定义二级"}
                        </Badge>
                      </TableCell>
                      <TableCell align="right" className="tnum">{row.meterCount}</TableCell>
                      <TableCell>
                        {row.energyTypes.length === 0 ? (
                          <span className="text-xs text-fg-subtle">未使用</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {row.energyTypes.map((type) => (
                              <Badge key={type} variant={type === "electric" ? "info" : "neutral"}>
                                {ENERGY_LABEL[type]}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.meterCount === 0 ? (
                          <span className="text-xs text-fg-subtle">—</span>
                        ) : row.shareEligible ? (
                          <Badge variant="success">是</Badge>
                        ) : (
                          <Badge variant="warning">否（含非末端表）</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>可进入占比的表（{partition.eligible.length}）</CardTitle>
            <CardDescription>占比口径取自「{partition.primaryName}」：表位于末端节点且已打分项标签。</CardDescription>
          </CardHeader>
          <CardContent>
            {partition.eligible.length === 0 ? (
              <EmptyState title="没有可进入占比的表" description="检查末端节点是否挂了表、是否打了分项标签。" />
            ) : (
              <ul className="flex max-h-72 flex-col gap-1.5 overflow-auto pr-1 text-sm">
                {partition.eligible.map((item) => (
                  <li key={item.meterId} className="flex items-center justify-between gap-2 rounded-md bg-surface-2 px-2.5 py-1.5">
                    <span className="min-w-0 truncate">
                      <span className="font-medium text-fg">{item.meterId}</span>
                      <span className="ml-2 text-xs text-fg-muted">{item.nodeName} · {item.categoryName}</span>
                    </span>
                    <span className="shrink-0 text-xs text-fg-subtle">{item.unit === UNIT_LABEL.kWh ? "电" : "水"}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>被排除的表（{partition.excluded.length}）</CardTitle>
            <CardDescription>不进占比并不代表没用：它们仍然参与本级实测与总分对账。</CardDescription>
          </CardHeader>
          <CardContent>
            {partition.excluded.length === 0 ? (
              <EmptyState title="没有被排除的表" description="当前所有表都可参与分项占比。" />
            ) : (
              <ul className="flex max-h-72 flex-col gap-1.5 overflow-auto pr-1 text-sm">
                {partition.excluded.map((item) => (
                  <li key={item.meterId} className="flex flex-col gap-0.5 rounded-md bg-surface-2 px-2.5 py-1.5">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium text-fg">{item.meterId}</span>
                      <span className="text-xs text-fg-subtle">{item.nodeName}</span>
                    </span>
                    <span className="text-xs text-fg-muted">{item.reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary label="分项分类" />;
}
