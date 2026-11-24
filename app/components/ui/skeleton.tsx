import type { ComponentProps } from "react";

import { cn } from "~/lib/cn";

/**
 * 骨架屏。必须与真实内容同尺寸，避免加载完成时布局跳动。
 * 不要在页面里手写脉冲 div，统一用这里的组件。
 */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-surface-2", className)}
      {...props}
    />
  );
}

export interface SkeletonTextProps extends ComponentProps<"div"> {
  /** 行数，默认 3 行 */
  lines?: number;
  /** 末行宽度（百分比），接近真实段落 */
  lastLineWidth?: string;
}

export function SkeletonText({ className, lines = 3, lastLineWidth = "60%", ...props }: SkeletonTextProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      {Array.from({ length: Math.max(1, lines) }, (_, i) => (
        <Skeleton key={i} className="h-3.5" style={i === lines - 1 ? { width: lastLineWidth } : undefined} />
      ))}
    </div>
  );
}

export interface SkeletonCardProps extends ComponentProps<"div"> {
  /** 正文行数，默认 3 行；标题 + 正文 + 底部操作占位与真实卡片同高 */
  lines?: number;
  /** 是否渲染底部操作占位 */
  withFooter?: boolean;
}

export function SkeletonCard({ className, lines = 3, withFooter = false, ...props }: SkeletonCardProps) {
  return (
    <div className={cn("rounded-lg border border-line bg-surface p-4 shadow-card sm:p-5", className)} {...props}>
      <Skeleton className="h-4 w-32" />
      <div className="mt-3">
        <SkeletonText lines={lines} />
      </div>
      {withFooter ? (
        <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      ) : null}
    </div>
  );
}
