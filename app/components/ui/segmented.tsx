import { useRef } from "react";

import { cn } from "~/lib/cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  /** 无可见组标题时必填 */
  ariaLabel?: string;
  className?: string;
}

const ITEM_SIZE = {
  sm: "h-7 px-2.5 text-xs",
  md: "h-8 px-3 text-sm",
} as const;

/**
 * 分段控制器：少量互斥选项（≤5）用一段按钮表达，比下拉更快。
 * 无障碍：role=radiogroup + 方向键切换；切换后立即生效并反映在 URL 里。
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  ariaLabel = "视图切换",
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const move = (delta: number) => {
    const current = options.findIndex((o) => o.value === value);
    const next = (current + delta + options.length) % options.length;
    const target = options[next];
    if (!target) return;
    onChange(target.value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-md border border-line bg-surface-2 p-0.5",
        className,
      )}
    >
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                move(1);
              } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                move(-1);
              }
            }}
            className={cn(
              "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
              ITEM_SIZE[size],
              active ? "bg-surface text-fg shadow-card" : "text-fg-muted hover:text-fg",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
