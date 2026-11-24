import { useEffect, useState } from "react";
import { Form, Link, useNavigation } from "react-router";

import type { Route } from "./+types/topology-edit";

import PageHeader from "~/components/layout/page-header";
import { RouteErrorBoundary } from "~/components/layout/route-error";
import { Alert } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { EmptyState } from "~/components/ui/empty-state";
import { Select } from "~/components/ui/select";
import { invalidateModelCache, loadModelFromDisk } from "~/lib/model/model.server";
import { writeConfig } from "~/lib/model/config.server";
import { buildCaliber, caliberSummary } from "~/lib/model/caliber";
import type { CategoryNode, Meter, MeterBinding, Topology, TopologyKind, TopologyNode } from "~/lib/model/types";
import { TOPOLOGY_KIND_LABEL } from "~/lib/model/types";

export const meta: Route.MetaFunction = () => [{ title: "编辑拓扑关系 · 能耗分析" }];

interface Draft {
  topologies: Topology[];
  nodes: TopologyNode[];
  meters: Meter[];
  bindings: MeterBinding[];
  categories: CategoryNode[];
}

export async function loader({ request }: Route.LoaderArgs) {
  const model = loadModelFromDisk();
  const requested = new URL(request.url).searchParams.get("topo") ?? "";
  const topology =
    model.registry.topologies.get(requested) ??
    model.registry.primaryTopology() ??
    model.registry.topologyList()[0];

  const caliber = buildCaliber({
    granularity: "day",
    coverages: [],
    meterCount: model.registry.meters.size,
  });

  return {
    caliberSummary: caliberSummary(caliber),
    draft: {
      topologies: model.config.topologies,
      nodes: model.config.nodes,
      meters: model.config.meters,
      bindings: model.config.bindings,
      categories: model.config.categories,
    } satisfies Draft,
    topologyId: topology?.topologyId ?? "",
    updatedAt: model.config.updatedAt,
    version: model.config.version,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const raw = formData.get("draft");
  if (typeof raw !== "string") {
    return { ok: false as const, error: "提交内容为空" };
  }

  let draft: Draft;
  try {
    draft = JSON.parse(raw) as Draft;
  } catch {
    return { ok: false as const, error: "提交内容不是合法 JSON" };
  }

  try {
    const written = writeConfig(draft);
    invalidateModelCache();
    return { ok: true as const, updatedAt: written.updatedAt, version: written.version };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? `写入配置文件失败：${error.message}` : "写入配置文件失败",
    };
  }
}

/* ────────────────────────── 树工具 ────────────────────────── */

interface TreeRow {
  node: TopologyNode;
  depth: number;
  childCount: number;
  meterCount: number;
}

function childrenOf(nodes: TopologyNode[], nodeId: string): TopologyNode[] {
  return nodes.filter((node) => node.parentId === nodeId);
}

function buildRows(nodes: TopologyNode[], topologyId: string, bindings: MeterBinding[]): TreeRow[] {
  const rows: TreeRow[] = [];
  const scoped = nodes.filter((node) => node.topologyId === topologyId);
  const meterCount = (nodeId: string) => bindings.filter((binding) => binding.nodeId === nodeId).length;

  const walk = (node: TopologyNode, depth: number): void => {
    const children = scoped.filter((item) => item.parentId === node.nodeId);
    rows.push({ node, depth, childCount: children.length, meterCount: meterCount(node.nodeId) });
    for (const child of children) walk(child, depth + 1);
  };
  for (const root of scoped.filter((node) => node.parentId === null)) walk(root, 0);
  return rows;
}

function descendantsOf(nodes: TopologyNode[], nodeId: string): string[] {
  const result: string[] = [];
  const queue = childrenOf(nodes, nodeId).map((node) => node.nodeId);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    result.push(current);
    queue.push(...childrenOf(nodes, current).map((node) => node.nodeId));
  }
  return result;
}

export default function TopologyEditPage({ loaderData, actionData }: Route.ComponentProps) {
  const { draft: initial, topologyId: initialTopology, version } = loaderData;
  const navigation = useNavigation();

  const [draft, setDraft] = useState<Draft>(initial);
  const [activeTopology, setActiveTopology] = useState<string>(initialTopology);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [newTopologyName, setNewTopologyName] = useState("");
  const [newTopologyKind, setNewTopologyKind] = useState<TopologyKind>("system");
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const rows: TreeRow[] = buildRows(draft.nodes, activeTopology, draft.bindings);
  const topology = draft.topologies.find((item) => item.topologyId === activeTopology);

  const node = selectedNode === null ? null : draft.nodes.find((item) => item.nodeId === selectedNode) ?? null;
  const boundMeterIds = new Set(
    draft.bindings.filter((binding) => binding.topologyId === activeTopology).map((binding) => binding.meterId),
  );
  const nodeBindings = node === null ? [] : draft.bindings.filter((binding) => binding.nodeId === node.nodeId);
  const unboundMeters = draft.meters.filter((meter) => !boundMeterIds.has(meter.meterId));

  useEffect(() => {
    if (actionData !== undefined && actionData.ok) {
      setDirty(false);
      setSavedAt(new Date().toLocaleTimeString("zh-CN"));
    }
  }, [actionData]);

  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const update = (mutate: (next: Draft) => void) => {
    setDraft((current) => {
      const next: Draft = {
        topologies: [...current.topologies],
        nodes: [...current.nodes],
        meters: [...current.meters],
        bindings: [...current.bindings],
        categories: [...current.categories],
      };
      mutate(next);
      return next;
    });
    setDirty(true);
    setSavedAt(null);
  };

  const addNode = (parentId: string | null) => {
    const name = window.prompt(parentId === null ? "新根节点名称" : "新节点名称", "新节点");
    if (name === null || name.trim() === "") return;
    const nodeId = `n-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
    update((next) => {
      next.nodes.push({
        nodeId,
        topologyId: activeTopology,
        parentId,
        name: name.trim(),
        level: parentId === null ? "根节点" : "子节点",
      });
    });
    setSelectedNode(nodeId);
  };

  const renameNode = (nodeId: string, name: string) => {
    update((next) => {
      const target = next.nodes.find((item) => item.nodeId === nodeId);
      if (target !== undefined) target.name = name;
    });
  };

  const moveNode = (nodeId: string, parentId: string | null) => {
    const banned = new Set([nodeId, ...descendantsOf(draft.nodes, nodeId)]);
    if (parentId !== null && banned.has(parentId)) {
      window.alert("不能移动到自身或自己的子节点下（会形成环）");
      return;
    }
    update((next) => {
      const target = next.nodes.find((item) => item.nodeId === nodeId);
      if (target !== undefined) target.parentId = parentId;
    });
  };

  const deleteNode = (nodeId: string) => {
    const children = childrenOf(draft.nodes, nodeId);
    const bindings = draft.bindings.filter((binding) => binding.nodeId === nodeId);
    if (children.length > 0) {
      window.alert(`该节点还有 ${children.length} 个子节点，先移走或删除子节点`);
      return;
    }
    if (bindings.length > 0) {
      window.alert(`该节点还挂着 ${bindings.length} 块表，先在右侧摘表`);
      return;
    }
    if (!window.confirm("确认删除该节点？")) return;
    update((next) => {
      next.nodes = next.nodes.filter((item) => item.nodeId !== nodeId);
    });
    setSelectedNode(null);
  };

  const bindMeter = (meterId: string) => {
    if (node === null) return;
    update((next) => {
      next.bindings.push({ meterId, topologyId: activeTopology, nodeId: node.nodeId });
    });
  };

  const unbindMeter = (meterId: string) => {
    update((next) => {
      next.bindings = next.bindings.filter(
        (binding) => !(binding.meterId === meterId && binding.topologyId === activeTopology),
      );
    });
  };

  const addTopology = () => {
    const name = newTopologyName.trim();
    if (name === "") return;
    const topologyId = `t-${Date.now().toString(36)}`;
    update((next) => {
      next.topologies.push({ topologyId, name, kind: newTopologyKind, isPrimary: false });
    });
    setActiveTopology(topologyId);
    setNewTopologyName("");
  };

  const saving = navigation.state === "submitting";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="编辑拓扑关系"
        description="平台维护自己的业务关系：拓扑树、节点、挂表。改动点「保存配置」写入配置文件，不需重启即生效。"
        meta={
          <span className="tnum">
            配置版本 v{version}
            {savedAt === null ? "" : ` · 已保存于 ${savedAt}`}
          </span>
        }
        actions={
          <Link
            to={`/?topo=${activeTopology}`}
            className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface-2"
          >
            返回总览
          </Link>
        }
      />

      {actionData !== undefined && actionData.ok === false ? (
        <Alert variant="danger" title="保存失败">{actionData.error}</Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>{topology?.name ?? "拓扑"}</CardTitle>
                <CardDescription>
                  {topology === undefined
                    ? "选择或新建一套拓扑"
                    : `${TOPOLOGY_KIND_LABEL[topology.kind]}拓扑${topology.isPrimary ? " · 主口径（分项占比来自这里）" : ""} · ${rows.length} 个节点`}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  size="sm"
                  value={activeTopology}
                  ariaLabel="切换拓扑"
                  options={draft.topologies.map((item) => ({
                    value: item.topologyId,
                    label: item.isPrimary ? `${item.name}（主）` : item.name,
                  }))}
                  onValueChange={(value) => {
                    setActiveTopology(value);
                    setSelectedNode(null);
                  }}
                />
                <Button size="sm" variant="outline" onClick={() => addNode(null)}>
                  新建根节点
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <EmptyState
                title="这套拓扑还没有节点"
                description="先建一个根节点，再往下挂子节点；末端节点挂表。"
                action={
                  <Button size="sm" variant="primary" onClick={() => addNode(null)}>
                    新建根节点
                  </Button>
                }
              />
            ) : (
              <ul className="flex flex-col">
                {rows.map((row) => {
                  const active = row.node.nodeId === selectedNode;
                  return (
                    <li key={row.node.nodeId}>
                      <div
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${active ? "bg-brand-soft" : "hover:bg-surface-2"}`}
                        style={{ marginLeft: `${row.depth * 18}px` }}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedNode(row.node.nodeId)}
                          className="min-w-0 flex-1 truncate text-left text-sm"
                        >
                          <span className="font-medium text-fg">{row.node.name}</span>
                          <span className="ml-2 text-xs text-fg-subtle">
                            {row.childCount === 0 ? "末端" : `${row.childCount} 子级`} · {row.meterCount} 块表
                          </span>
                        </button>
                        <Button size="sm" variant="ghost" onClick={() => addNode(row.node.nodeId)}>
                          + 子节点
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteNode(row.node.nodeId)}>
                          删除
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{node === null ? "节点详情" : node.name}</CardTitle>
              <CardDescription>
                {node === null
                  ? "在左侧选一个节点编辑"
                  : `上级：${node.parentId === null ? "（根节点）" : draft.nodes.find((item) => item.nodeId === node.parentId)?.name ?? "—"}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {node === null ? (
                <p className="text-sm text-fg-subtle">未选择节点。</p>
              ) : (
                <div className="flex flex-col gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-fg-muted">名称</span>
                    <input
                      value={node.name}
                      onChange={(event) => renameNode(node.nodeId, event.target.value)}
                      className="h-8 rounded-md border border-line bg-surface px-2.5 text-sm text-fg"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-fg-muted">上级节点</span>
                    <Select
                      size="sm"
                      value={node.parentId ?? "__root__"}
                      ariaLabel="上级节点"
                      options={[
                        { value: "__root__", label: "（作为根节点）" },
                        ...draft.nodes
                          .filter(
                            (item) =>
                              item.topologyId === activeTopology &&
                              item.nodeId !== node.nodeId &&
                              !descendantsOf(draft.nodes, node.nodeId).includes(item.nodeId),
                          )
                          .map((item) => ({ value: item.nodeId, label: item.name })),
                      ]}
                      onValueChange={(value) => moveNode(node.nodeId, value === "__root__" ? null : value)}
                    />
                  </label>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-fg-muted">已挂表（{nodeBindings.length}）</span>
                    {nodeBindings.length === 0 ? (
                      <p className="text-xs text-fg-subtle">该节点还没有表。</p>
                    ) : (
                      nodeBindings.map((binding) => (
                        <div key={binding.meterId} className="flex items-center justify-between gap-2 rounded-md bg-surface-2 px-2 py-1 text-xs">
                          <span className="truncate">{binding.meterId}</span>
                          <Button size="sm" variant="ghost" onClick={() => unbindMeter(binding.meterId)}>
                            摘除
                          </Button>
                        </div>
                      ))
                    )}
                  </div>

                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-fg-muted">挂表（本拓扑未绑定的表）</span>
                    <Select
                      size="sm"
                      value=""
                      ariaLabel="挂表"
                      placeholder={unboundMeters.length === 0 ? "没有可挂的表" : "选择一块表"}
                      options={unboundMeters.map((meter) => ({
                        value: meter.meterId,
                        label: `${meter.meterId}（${meter.energyType === "electric" ? "电" : "水"}）`,
                      }))}
                      onValueChange={(value) => {
                        if (value !== "") bindMeter(value);
                      }}
                    />
                  </label>
                  <p className="text-xs leading-5 text-fg-subtle">
                    一块表在同一套拓扑里只能挂一个节点；跨拓扑可以各挂一次（这正是多拓扑的用法）。
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>新建拓扑</CardTitle>
              <CardDescription>同一批表可以再挂一套视角（例如组织责任）。</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <input
                value={newTopologyName}
                onChange={(event) => setNewTopologyName(event.target.value)}
                placeholder="拓扑名称，如：组织责任拓扑"
                className="h-8 rounded-md border border-line bg-surface px-2.5 text-sm text-fg"
              />
              <Select
                size="sm"
                value={newTopologyKind}
                ariaLabel="拓扑种类"
                options={(Object.keys(TOPOLOGY_KIND_LABEL) as TopologyKind[]).map((kind) => ({
                  value: kind,
                  label: TOPOLOGY_KIND_LABEL[kind],
                }))}
                onValueChange={(value) => setNewTopologyKind(value as TopologyKind)}
              />
              <Button size="sm" variant="outline" onClick={addTopology} disabled={newTopologyName.trim() === ""}>
                新建
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>保存</CardTitle>
              <CardDescription>{dirty ? "有未保存改动" : "没有改动"}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form method="post">
                <input type="hidden" name="draft" value={JSON.stringify(draft)} />
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" variant="primary" size="sm" disabled={saving}>
                    {saving ? "保存中…" : "保存配置"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDraft(initial);
                      setDirty(false);
                      setSelectedNode(null);
                    }}
                  >
                    放弃改动
                  </Button>
                  {dirty ? <Badge variant="warning">未保存</Badge> : <Badge variant="success">已同步</Badge>}
                </div>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary label="编辑拓扑关系" />;
}
