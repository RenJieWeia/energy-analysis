import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "~/lib/cn";
import { Button } from "./button";

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 必填：浮层没有标题就无法回答「我在看什么」 */
  title: string;
  description?: string;
  /** 自定义底部；不传则渲染固定的「取消 + 确认」 */
  footer?: ReactNode;
  width?: "sm" | "md" | "lg";
  /** 确认回调（默认底部的「确认」按钮触发）；缺省时等同于关闭 */
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  children: ReactNode;
  className?: string;
}

const WIDTH_CLASS = {
  sm: "sm:w-[360px]",
  md: "sm:w-[440px]",
  lg: "sm:w-[560px]",
} as const;

/**
 * 右侧抽屉（Radix Dialog）：列表 → 明细的首选容器。
 * 关闭方式：Esc、点遮罩、右上角关闭、底部取消。
 * 底部按钮固定，内容区独立滚动，抽屉高度不随内容变化。
 */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  footer,
  width = "md",
  onConfirm,
  confirmLabel = "确认",
  cancelLabel = "取消",
  children,
  className,
}: DrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-fg/40" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-full flex-col border-l border-line bg-surface shadow-card",
            "focus-visible:outline-none",
            WIDTH_CLASS[width],
            className,
          )}
        >
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3">
            <div className="min-w-0">
              <DialogPrimitive.Title className="truncate text-sm font-semibold text-fg">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-0.5 text-xs leading-5 text-fg-muted">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="关闭抽屉">
                <X aria-hidden="true" className="size-4" />
              </Button>
            </DialogPrimitive.Close>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>

          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-line bg-surface px-4 py-3">
            {footer ?? (
              <>
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                  {cancelLabel}
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    onConfirm?.();
                    onOpenChange(false);
                  }}
                >
                  {confirmLabel}
                </Button>
              </>
            )}
          </footer>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
