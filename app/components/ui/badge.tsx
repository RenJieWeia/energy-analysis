import type { ComponentProps } from "react";

import { cn } from "~/lib/cn";

export type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  neutral: "bg-surface-2 text-fg-muted border-line",
  success: "bg-success-soft text-success border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
  info: "bg-brand-soft text-brand border-transparent",
  brand: "bg-brand-soft text-brand border-transparent",
};

export interface BadgeProps extends ComponentProps<"span"> {
  variant?: BadgeVariant;
  /** 前置状态点（颜色跟随 variant），用于表格内状态列 */
  dot?: boolean;
}

/**
 * 状态标签：只用于标签本身，不改变整行背景。
 * 状态词表见 docs/ui-extension.md 第 2 节，颜色角色由 variant 决定。
 */
export function Badge({ className, variant = "neutral", dot = false, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 truncate rounded-md border px-2 py-0.5 text-xs font-medium leading-5",
        VARIANT_CLASS[variant],
        className,
      )}
      {...props}
    >
      {dot ? <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
