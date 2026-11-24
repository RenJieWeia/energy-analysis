# 团队实现契约（并行开发，唯一事实源）

项目：能耗分析系统 · React Router v7 framework mode + Radix UI + Tailwind CSS v4 + ECharts + TypeScript
工作目录：`/home/renjie/codespace/energy-analysis`（依赖已 `npm install` 完成，**不要再跑 install**）

## 0. 铁律

1. **只写自己范围内的文件**（见第 5 节）。别人的文件只读，需要改就发消息给 lead。
2. 不许改这些 Lead 冻结文件：`package.json`、`vite.config.ts`、`tsconfig.json`、`react-router.config.ts`、`app/root.tsx`、`app/routes.ts`、`app/lib/energy/types.ts`、`app/lib/cn.ts`。
3. `app/app.css` 的令牌名冻结：可追加新令牌，不许删/改名。
4. 类型只从 `~/lib/energy/types` 导入，不许在各处重复定义同名业务类型。
5. 不许 `any`、不许 `@ts-ignore`、不许 `eslint-disable`。写完自己跑 `npx tsc --noEmit 2>&1 | head -40`，只看自己文件的报错（别人未完成的文件报错先忽略，不许去改别人文件来消除报错）。
6. 中文注释，代码标识符英文。不要 `git commit` / `git push`。
7. 每个模块的 **导出名必须与本文档一致**，页面按名导入，名字不符就会编译失败。

## 1. 设计令牌（Tailwind v4 语义类）

用语义类，不许写死色值：
`bg-bg` `bg-surface` `bg-surface-2` `bg-surface-3` `border-line` `border-line-strong`
`text-fg` `text-fg-muted` `text-fg-subtle` `text-fg-inverse`
`bg-brand` `bg-brand-strong` `bg-brand-soft` `text-brand` `text-brand-fg`
`text-accent` `bg-accent-soft`
`text-success/bg-success-soft` `text-warning/bg-warning-soft` `text-danger/bg-danger-soft` `text-info/bg-info-soft`
`text-tariff-sharp/peak/flat/valley`、`text-series-1..8`
圆角 `rounded-md/lg/xl`，阴影 `shadow-card` `shadow-pop`，数字用 `tnum` 类。

## 2. 数据层（worker-alpha）

`app/lib/energy/source.ts`

```ts
export function createMockDataSource(seed?: number): DataSource; // 默认 seed=20261117
export function getDataSource(): DataSource;                     // 单例
export function setDataSource(next: DataSource): void;           // 将来接真实 API
```

`app/lib/energy/mock-source.ts` 要求：
- 确定性：同一 `deviceId + ts` 永远同一数值（哈希/PRNG，不许 `Math.random()`）。
- 规模：48 台设备（electric 24 / water 8 / chiller 6 / gas 4 / steam 3 / pv 2 / storage 1），
  时间覆盖 `2025-05-01` → 当前（按 `2026-11-17` 生成到 2026-11-17 23:59）。
- **按需生成，不许把全量读数铺进数组**：`listReadings` 按 query 区间与粒度逐片计算。
- 性能护栏：`15min` 粒度窗口 > 7 天、`hour` > 90 天时，自动降级到下一档粒度，并在聚合结果的 `notes` 里写明降级原因。
- 含真实感：工作日/周末、24h 负荷曲线、季节温度因子、峰谷平按时段、约 1.5% 读数缺失 + 2% 估算值、个别设备离线（近 3 天无读数）。

`app/lib/energy/analytics.ts`

```ts
export function buildOverviewData(q: DashboardQuery): Promise<OverviewData>;
export function buildAnalysisData(q: DashboardQuery): Promise<AnalysisData>;
export function buildLedgerPage(q: LedgerQuery): Promise<LedgerPage>;
export function listAreaOptions(): Promise<string[]>;              // 形如 "A园区/A3栋"，去重排序
export function listReportTemplates(): ReportTemplate[];           // 3 个模板
export function buildReport(templateId: string, q: DashboardQuery): Promise<ReportDocument>;
export function reportToCsv(doc: ReportDocument): string;          // UTF-8 BOM + CRLF
export function reportToMarkdown(doc: ReportDocument): string;
```

`app/lib/energy/dictionary.ts`

```ts
export const DEVICE_TYPE_LABEL: Record<DeviceType, string>;
export const TARIFF_LABEL: Record<TariffPeriod, string>;           // 尖/峰/平/谷
export const STATUS_LABEL: Record<DeviceStatus, string>;
export const QUALITY_LABEL: Record<ReadingQuality, string>;
export const METRIC_LABEL: Record<MetricKey, string>;
export const DIMENSION_LABEL: Record<Dimension, string>;
export const GRANULARITY_LABEL: Record<Granularity, string>;
export const UNIT_LABEL: Record<Unit, string>;
export const DEVICE_TYPE_UNIT: Record<DeviceType, Unit>;
export function areaLabel(device: Device): string;                 // "A园区 / A3栋 / 5F"
export function statusTone(s: DeviceStatus): "success" | "warning" | "danger" | "neutral";
export function qualityTone(q: ReadingQuality): "success" | "warning" | "danger";
```

`app/lib/energy/index.ts`：`export * from "./types"; export * from "./source"; export * from "./analytics"; export * from "./dictionary";`

`app/lib/query.ts`

```ts
export const GRANULARITIES: Granularity[];
export const DIMENSIONS: Dimension[];
export const METRICS: MetricKey[];
export const TARIFF_PERIODS: TariffPeriod[];
export const DEVICE_TYPES: DeviceType[];
export const RANGE_PRESETS: { key: string; label: string; days: number }[]; // 近7天/近30天/近90天/本年

export function todayISO(): string;
export function defaultRange(): { from: string; to: string };      // 近 30 天
export function parseDashboardQuery(sp: URLSearchParams): DashboardQuery;  // 非法值回落默认，不抛错
export function serializeDashboardQuery(q: DashboardQuery): string;        // 返回不含 '?' 的 query string
export function parseLedgerQuery(sp: URLSearchParams): LedgerQuery;        // page≥1, pageSize∈{10,20,50}
export function serializeLedgerQuery(q: LedgerQuery): string;
export function withQuery(path: string, qs: string): string;               // 拼 URL
```

`app/lib/format.ts`（无 React）

```ts
export function formatNumber(n: number, digits?: number): string;   // 千分位
export function formatEnergy(n: number, unit: string): string;      // 自动 K/M 或保留合适小数
export function formatPercent(n: number | null, digits?: number): string; // null → "—"
export function formatDelta(n: number | null): string;               // "+3.2%" / "-1.4%" / "—"
export function formatDate(iso: string): string;                     // 2026-11-17
export function formatDateTime(iso: string): string;                 // 2026-11-17 14:00
export function formatBucket(ts: string, g: Granularity): string;    // 按粒度格式化坐标轴
export function relativeTime(iso: string, now?: Date): string;       // 仅用于非审计场景
```

## 3. 基础件（worker-beta）

`app/components/ui/*` 必须导出（名字严格一致）：

| 文件 | 导出 |
| --- | --- |
| `button.tsx` | `Button`、`buttonVariants`；`variant: primary\|secondary\|outline\|ghost\|danger`，`size: sm\|md\|icon`，支持 `asChild` |
| `card.tsx` | `Card`、`CardHeader`、`CardTitle`、`CardDescription`、`CardContent`、`CardFooter`、`CardActions` |
| `badge.tsx` | `Badge`（`variant: neutral\|success\|warning\|danger\|info\|brand`） |
| `table.tsx` | `TableContainer`（横向滚动 + 最大高度）、`Table`、`TableHeader`、`TableBody`、`TableRow`、`TableHead`、`TableCell`、`TableCaption` |
| `stat.tsx` | `Stat`（`label, value: string, unit?, delta?: number\|null, deltaKind?: DeltaKind, sampleSize: number, formula?: string, spark?: number[], tone?`） |
| `tabs.tsx` | `Tabs`、`TabsList`、`TabsTrigger`、`TabsContent` |
| `select.tsx` | `Select`（`value, onValueChange, options: {value,label}[], placeholder?, size?, ariaLabel?`）、`SelectGroup` |
| `checkbox.tsx` | `Checkbox`（`checked, onCheckedChange, indeterminate?, label?, ariaLabel?`） |
| `switch.tsx` | `Switch`（`checked, onCheckedChange, label?`） |
| `segmented.tsx` | `SegmentedControl<T extends string>`（`options: {value:T,label:string}[], value:T, onChange(v:T):void, size?`） |
| `drawer.tsx` | `Drawer`（`open, onOpenChange, title, description?, footer?, width?: "sm"\|"md"\|"lg", children`） |
| `dialog.tsx` | `Dialog`（`open, onOpenChange, title, description?, footer?, children`） |
| `popover.tsx` | `Popover`（`trigger: ReactNode, children, align?`） |
| `tooltip.tsx` | `Tooltip`（`content: ReactNode, children, side?`） |
| `pagination.tsx` | `Pagination`（`page, pageSize, total, pageSizeOptions?, onPageChange, onPageSizeChange`） |
| `skeleton.tsx` | `Skeleton`、`SkeletonText`、`SkeletonCard` |
| `empty-state.tsx` | `EmptyState`（`title, description?, action?, variant?: "empty"\|"error"`） |
| `alert.tsx` | `Alert`（`variant: info\|warning\|danger\|success, title, children?, action?`） |
| `scroll-area.tsx` | `ScrollArea`（`maxHeight?, children`） |
| `separator.tsx` | `Separator` |
| `date-range.tsx` | `DateRangeField`（`from, to, onChange(from,to), min?, max?, label?`，原生 date 输入，含"包含今天"提示与非法区间校验） |
| `filter-chip.tsx` | `FilterChip`（`label, onRemove?, value?`）——已生效条件必须外显 |

`app/components/charts/*`：

| 文件 | 导出 |
| --- | --- |
| `echart.tsx` | `EChart`（`{ option: EChartsOption; height?: number; className?: string; ariaLabel?: string; loading?: boolean }`） |
| `presets.ts` | `CHART_COLORS`、`trendLineOption({series, unit, area?})`、`stackedBarOption({series, unit})`、`shareBarOption({items, unit})`、`donutOption({items, unit, centerLabel?, centerValue?})`、`heatmapOption({matrix, unit})`、`rankBarOption({items, unit})`、`comparisonBarOption({items, unit})` |

图表硬要求：
- `EChart` 只在客户端初始化（`useEffect` + `echarts.init`），容器 `ResizeObserver` 自适应、卸载 `dispose()`、`option` 变化 `setOption(option, true)`。
- 高度固定（默认 280），SSR 期间渲染同尺寸骨架占位，避免布局跳动。
- 图表必须有可访问名（`ariaLabel`）+ 表格化数据出口（页面侧负责，提供 `caption`）。
- 配色只用 CSS 变量（`getComputedStyle` 读取或直接用令牌色值），深色模式自动跟随。

`docs/ui-extension.md`：按 admin-ui-spec 附录 A 九项写（术语表、状态枚举与颜色、告警级别、操作名、敏感字段、归属字段、指标口径、页面清单、待补项）。

## 4. 外壳与页面

`app/components/layout/*`（worker-gamma）

| 文件 | 导出 |
| --- | --- |
| `app-shell.tsx` | **default** `AppShell({ children })`：左侧导航（可折叠）+ 顶栏（面包屑/主题切换/数据新鲜度）+ 主内容区；<768px 转抽屉导航 |
| `nav.ts` | `NAV_ITEMS`（`{to,label,description}[]`，4 条，顺序：总览看板 `/`、多维分析 `/analysis`、设备与抄表台账 `/devices`、分析报表 `/reports`） |
| `page-header.tsx` | **default** `PageHeader({ title, description?, breadcrumb?: {label, to?}[], actions?, meta? })` |
| `filter-bar.tsx` | **default** `FilterBar({ children, actions?, sticky? })`，`FilterField({ label, children, hint? })` |

页面文件（`app/routes/`）：每个页面必须 `export async function loader({ request }: Route.LoaderArgs)`、`export default function Page({ loaderData }: Route.ComponentProps)`、`export const meta`。
- 用 `useNavigation()` 判断 `navigation.state === "loading"` → 渲染与真实内容同尺寸骨架。
- loader 里用 `new URL(request.url).searchParams` + `parseDashboardQuery / parseLedgerQuery` 解析，页面用 `serializeDashboardQuery` 生成 URL（**筛选必须进 URL，刷新不丢**）。
- 空状态用 `EmptyState`（含下一步入口），错误用路由 `ErrorBoundary`。

| 文件 | 归属 | 内容 |
| --- | --- | --- |
| `routes/overview.tsx` | gamma | 总览看板：KPI 行（含样本量与口径）→ 主趋势 → 区域/类型构成 + 尖峰平谷 → 设备 TOP10 → 数据新鲜度与质量告警 |
| `routes/analysis.tsx` | gamma | 多维分析：维度切换（时间/区域/类型/时段/回路）+ 粒度切换 + 分组条形 + 热力矩阵 + 环比对比表 + 明细序列 |
| `routes/devices.tsx` | delta | 设备与抄表台账：QueryState 表格（关键词/类型/状态/排序/分页全部进 URL）+ L1 全选（当前页，状态栏常显范围）+ 行抽屉（最近抄表明细）+ 导出当前筛选 |
| `routes/reports.tsx` | delta | 分析报表：模板选择 + 周期/维度参数 + 生成预览（KPI/表格/序列 section）+ 下载 CSV / Markdown |
| `routes/reports.export.ts` | delta | 资源路由：`loader` 读 `template/format/from/to/...`，返回 CSV（`text/csv; charset=utf-8`）或 Markdown，`Content-Disposition: attachment` |

跨页要求：从表格进抽屉返回后，筛选/分页/排序/滚动位置必须保持（URL 承载 QueryState 即可满足）。

## 5. 写入范围（谁写哪）

| 成员 | 可写路径 |
| --- | --- |
| lead | `package.json`、`vite.config.ts`、`tsconfig.json`、`react-router.config.ts`、`app/root.tsx`、`app/routes.ts`、`app/app.css`、`app/lib/cn.ts`、`app/lib/energy/types.ts`、`README.md`、`docs/CONTRACT.md` |
| worker-alpha | `app/lib/energy/**`（除 `types.ts`）、`app/lib/query.ts`、`app/lib/format.ts`、`scripts/**` |
| worker-beta | `app/components/ui/**`、`app/components/charts/**`、`docs/ui-extension.md` |
| worker-gamma | `app/components/layout/**`、`app/routes/overview.tsx`、`app/routes/analysis.tsx` |
| worker-delta | `app/routes/devices.tsx`、`app/routes/reports.tsx`、`app/routes/reports.export.ts` |

## 6. 交付口径

- 页面数据必须来自 `buildOverviewData / buildAnalysisData / buildLedgerPage / buildReport`，不许在页面里另行拼假数据。
- 所有百分比必须同时给出样本量（`Stat.sampleSize`、表格列的样本量说明、报告表头 `header`）。
- 数据质量（缺失/估算/覆盖率）与新鲜度必须在一层可见，不许只藏在第二层。
- 依赖别人的模块时按本契约签名调用；对方还没写完就照契约写，最终由 lead 统一 `npx tsc --noEmit` + `npm run build` 收口。
