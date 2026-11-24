import type { ReactNode } from "react";

import { cn } from "~/lib/cn";
import { Separator } from "./separator";

export interface ScrollAreaProps {
  /** 最大高度，超过后内部滚动（不撑高外层容器） */
  maxHeight?: number | string;
  children: ReactNode;
  className?: string;
  /** 内容区额外类名 */
  viewportClassName?: string;
}

/**
 * 内部滚动容器：固定/最大高度 + 内部滚动，用于卡片内列表、日志、事件流。
 * 表格请用 TableContainer（表头 sticky 依赖自己的滚动容器）。
 */
export function ScrollArea({ maxHeight = 320, children, className, viewportClassName }: ScrollAreaProps) {
  return (
    <div
      tabIndex={-1}
      className={cn("relative overflow-y-auto overflow-x-hidden overscroll-contain", className)}
      style={{ maxHeight }}
    >
      <div className={cn("min-h-0", viewportClassName)}>{children}</div>
    </div>
  );
}

/** 折叠式「查看全部」出口：列表截断后必须给出完整访问入口 */
export function ScrollAreaFooter({ children }: { children: ReactNode }) {
  return (
    <>
      <Separator />
      <div className="flex items-center justify-end gap-2 px-3 py-2 text-xs text-fg-muted">{children}</div>
    </>
  );
}
