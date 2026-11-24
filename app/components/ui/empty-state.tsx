import { CircleAlert, Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "~/lib/cn";

export interface EmptyStateProps {
  /** 第一层结论：为什么没有内容 */
  title: string;
  /** 第二层依据：口径/原因说明 */
  description?: string;
  /** 下一步入口（必须给，空状态不能只有一句话） */
  action?: ReactNode;
  variant?: "empty" | "error";
  className?: string;
}

/**
 * 空状态 / 错误态。
 * - 空状态：说明当前筛选口径 + 提供「清除筛选 / 调整范围」入口。
 * - 错误态：说明失败原因 + 提供重试入口。
 */
export function EmptyState({ title, description, action, variant = "empty", className }: EmptyStateProps) {
  const Icon = variant === "error" ? CircleAlert : Inbox;
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-surface px-6 py-10 text-center",
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn("size-6", variant === "error" ? "text-danger" : "text-fg-subtle")}
      />
      <p className="text-sm font-medium text-fg">{title}</p>
      {description ? <p className="max-w-md text-xs leading-5 text-fg-muted">{description}</p> : null}
      {action ? <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}
