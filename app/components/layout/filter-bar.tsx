import type { ReactNode } from "react";

import { cn } from "~/lib/cn";

export interface FilterFieldProps {
  label: string;
  children: ReactNode;
  /** 字段级说明（口径、取值范围、非法输入提示），与控件同层展示 */
  hint?: string;
}

/** 单个筛选字段：标签 + 控件 + 提示。标签用 label 语义包裹控件。 */
export function FilterField({ label, children, hint }: FilterFieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-medium tracking-wide text-fg-subtle">{label}</span>
      {children}
      {hint ? <span className="text-[11px] leading-4 text-fg-subtle">{hint}</span> : null}
    </div>
  );
}

export interface FilterBarProps {
  children: ReactNode;
  /** 右侧动作区（重置、导出、刷新等） */
  actions?: ReactNode;
  /** 吸顶：表格/图表页滚动时筛选条件保持可见 */
  sticky?: boolean;
}

/**
 * 筛选条容器：所有筛选条件外显在一条可见区域内。
 * 条件必须写进 URL（由页面负责 serialize），刷新/回退不丢。
 */
export default function FilterBar({ children, actions, sticky }: FilterBarProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-surface px-3 py-2.5 shadow-card",
        sticky && "sticky top-14 z-20",
      )}
    >
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-x-3 gap-y-2">{children}</div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
