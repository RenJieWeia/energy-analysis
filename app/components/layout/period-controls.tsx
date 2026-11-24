import { useNavigate } from "react-router";

import { SegmentedControl } from "~/components/ui/segmented";
import { GRANULARITY_LABEL, type Granularity } from "~/lib/model/types";
import { VIEW_GRANULARITIES, viewHref } from "~/lib/model-view";

const OPTIONS = VIEW_GRANULARITIES.map((value) => ({
  value,
  label: GRANULARITY_LABEL[value],
}));

/**
 * 粒度 + 日期锚点：改动即改 URL（刷新、分享、返回都保持）。
 * 三个只读页共用。
 */
export function PeriodControls({
  granularity,
  periodStart,
  extra,
}: {
  granularity: Granularity;
  periodStart: string;
  extra?: Record<string, string>;
}) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-fg-muted">时间粒度</span>
        <SegmentedControl
          ariaLabel="时间粒度"
          options={OPTIONS}
          value={granularity}
          size="sm"
          onChange={(value) => navigate(viewHref(value, periodStart, extra))}
        />
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-fg-muted">日期（区间按粒度对齐）</span>
        <input
          type="date"
          value={periodStart.slice(0, 10)}
          onChange={(event) => {
            const next = event.target.value;
            if (next === "") return;
            navigate(viewHref(granularity, `${next}T00:00:00+08:00`, extra));
          }}
          className="h-8 rounded-md border border-line bg-surface px-2.5 text-sm text-fg"
        />
      </label>
    </div>
  );
}
