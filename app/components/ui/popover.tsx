import * as PopoverPrimitive from "@radix-ui/react-popover";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "~/lib/cn";
import { Button } from "./button";

export interface PopoverProps {
  /** 触发器（通常是一个 Button）；必须可聚焦 */
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  /** 浮层标题：筛选/选择型浮层必填 */
  title?: string;
  /** 无可见标题时的可访问名（有 title 时自动使用 title） */
  ariaLabel?: string;
  /** 自定义底部；不传但给了 onConfirm 时渲染「取消 + 确认」 */
  footer?: ReactNode;
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  className?: string;
}

/**
 * 轻量浮层（Radix Popover）：筛选面板、图例说明、行内快捷操作。
 * Esc / 点外部关闭由 Radix 负责；需要决策的浮层必须给 title + onConfirm。
 */
export function Popover({
  trigger,
  children,
  align = "start",
  sideOffset = 6,
  title,
  ariaLabel,
  footer,
  onConfirm,
  confirmLabel = "确认",
  cancelLabel = "取消",
  className,
}: PopoverProps) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          sideOffset={sideOffset}
          aria-label={title ?? ariaLabel}
          className={cn(
            "z-50 w-max min-w-[12rem] max-w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-line bg-surface p-3 shadow-card",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
            className,
          )}
        >
          {title ? (
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="text-xs font-semibold text-fg">{title}</p>
              <PopoverPrimitive.Close asChild>
                <Button variant="ghost" size="icon" aria-label="关闭浮层" className="size-6">
                  <X aria-hidden="true" className="size-3.5" />
                </Button>
              </PopoverPrimitive.Close>
            </div>
          ) : null}

          {children}

          {footer ??
            (onConfirm ? (
              <div className="mt-3 flex items-center justify-end gap-2 border-t border-line pt-2">
                <PopoverPrimitive.Close asChild>
                  <Button variant="outline" size="sm">
                    {cancelLabel}
                  </Button>
                </PopoverPrimitive.Close>
                <PopoverPrimitive.Close asChild>
                  <Button size="sm" onClick={onConfirm}>
                    {confirmLabel}
                  </Button>
                </PopoverPrimitive.Close>
              </div>
            ) : null)}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
