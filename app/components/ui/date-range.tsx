import { useEffect, useId, useState } from "react";

import { cn } from "~/lib/cn";

export interface DateRangeFieldProps {
  /** YYYY-MM-DD，闭区间起始 */
  from: string;
  /** YYYY-MM-DD，闭区间结束 */
  to: string;
  /** 只在区间合法时触发；非法区间不落库、不发起请求 */
  onChange: (from: string, to: string) => void;
  /** 可选下界（数据覆盖起点） */
  min?: string;
  /** 可选上界（数据覆盖终点） */
  max?: string;
  /** 可见标签，默认「统计周期」 */
  label?: string;
  className?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 区间校验：返回错误文案，null 表示合法 */
function validate(from: string, to: string, min?: string, max?: string): string | null {
  if (!from || !to) return "请选择完整的起止日期";
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) return "日期格式应为 YYYY-MM-DD";
  if (from > to) return "起始日期不能晚于结束日期";
  if (min && from < min) return `起始日期早于数据覆盖范围（${min}）`;
  if (max && to > max) return `结束日期晚于数据覆盖范围（${max}）`;
  return null;
}

/**
 * 日期区间（原生 date 输入）：闭区间，含起止两天。
 * 硬约束：非法区间当场报错且不触发 onChange；刷新后区间由 URL 还原（页面负责）。
 */
export function DateRangeField({
  from,
  to,
  onChange,
  min,
  max,
  label = "统计周期",
  className,
}: DateRangeFieldProps) {
  const fromId = useId();
  const toId = useId();
  const [draft, setDraft] = useState({ from, to });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft({ from, to });
  }, [from, to]);

  const commit = (next: { from: string; to: string }) => {
    setDraft(next);
    const message = validate(next.from, next.to, min, max);
    setError(message);
    if (!message) onChange(next.from, next.to);
  };

  const inputClass = cn(
    "h-9 w-full min-w-[9.5rem] rounded-md border border-line-strong bg-surface px-2.5 text-sm text-fg",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus-visible:ring-offset-surface",
    "aria-[invalid=true]:border-danger",
  );

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs font-medium text-fg-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={fromId} className="sr-only">
          {label}起始日期
        </label>
        <input
          id={fromId}
          type="date"
          value={draft.from}
          min={min}
          max={max}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fromId}-error` : `${fromId}-hint`}
          onChange={(event) => commit({ ...draft, from: event.target.value })}
          className={inputClass}
        />
        <span aria-hidden="true" className="text-xs text-fg-subtle">
          至
        </span>
        <label htmlFor={toId} className="sr-only">
          {label}结束日期
        </label>
        <input
          id={toId}
          type="date"
          value={draft.to}
          min={min}
          max={max}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${toId}-error` : `${toId}-hint`}
          onChange={(event) => commit({ ...draft, to: event.target.value })}
          className={inputClass}
        />
      </div>
      {error ? (
        <p id={`${fromId}-error`} role="alert" className="text-[11px] text-danger">
          {error}（当前区间未生效）
        </p>
      ) : (
        <p id={`${fromId}-hint`} className="text-[11px] text-fg-subtle">
          闭区间，含起止两天；结束日可选到今天，选择后按天汇总
        </p>
      )}
    </div>
  );
}
