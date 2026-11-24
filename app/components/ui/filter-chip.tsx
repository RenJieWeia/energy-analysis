import { X } from "lucide-react";

import { cn } from "~/lib/cn";

export interface FilterChipProps {
  /** 条件名，如「设备类型」「区域」 */
  label: string;
  /** 已生效的取值，如「电表 · 水表」；缺省表示布尔型条件已开启 */
  value?: string;
  /** 移除回调；不传则不可移除（用于只读展示场景） */
  onRemove?: () => void;
  className?: string;
}

/**
 * 已生效筛选条件标签。
 * 硬约束：筛选条件必须外显在页面上，不能只藏在筛选抽屉里；
 * 每次条件变化都要同步一个 chip，并提供逐条移除入口。
 */
export function FilterChip({ label, value, onRemove, className }: FilterChipProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-md border border-line bg-surface-2 py-0.5 pl-2 pr-1 text-xs text-fg",
        className,
      )}
    >
      <span className="truncate">
        <span className="text-fg-muted">{label}</span>
        <span className="px-1 text-fg-subtle">:</span>
        <span className="font-medium" title={value ?? "已启用"}>
          {value ?? "已启用"}
        </span>
      </span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`移除筛选：${label}${value ? ` ${value}` : ""}`}
          className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-fg-subtle hover:bg-surface-3 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <X aria-hidden="true" className="size-3" />
        </button>
      ) : null}
    </span>
  );
}
