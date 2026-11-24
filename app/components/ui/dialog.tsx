import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "~/lib/cn";
import { Button } from "./button";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 必填：说明这一次确认要做什么 */
  title: string;
  description?: string;
  /** 自定义底部；不传则渲染固定的「取消 + 确认」 */
  footer?: ReactNode;
  /** 确认回调；破坏性操作时把按钮文案改成明确动作，如「删除」 */
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 破坏性操作：确认按钮用危险色 */
  destructive?: boolean;
  children?: ReactNode;
  className?: string;
}

/**
 * 居中对话框（Radix Dialog）：≤6 字段的表单或简短确认。
 * 关闭方式：Esc、点遮罩、右上角关闭、底部取消；焦点陷阱与初始焦点由 Radix 负责。
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  onConfirm,
  confirmLabel = "确认",
  cancelLabel = "取消",
  destructive = false,
  children,
  className,
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-fg/40" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 flex w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col",
            "max-h-[calc(100vh-4rem)] rounded-xl border border-line bg-surface shadow-card focus-visible:outline-none",
            className,
          )}
        >
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-sm font-semibold text-fg">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-0.5 text-xs leading-5 text-fg-muted">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="关闭对话框">
                <X aria-hidden="true" className="size-4" />
              </Button>
            </DialogPrimitive.Close>
          </header>

          {children ? <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div> : null}

          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-line bg-surface px-4 py-3">
            {footer ?? (
              <>
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                  {cancelLabel}
                </Button>
                <Button
                  variant={destructive ? "danger" : "primary"}
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
