import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

export interface TooltipProps {
  content: ReactNode;
  /** 触发器；必须是可聚焦元素（按钮/链接），否则键盘用户看不到提示 */
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  delayDuration?: number;
}

/**
 * 悬浮说明：解释口径、样本量、截断文本、禁用原因。
 * 只做解释，不承载操作——需要点击的用 Popover。
 */
export function Tooltip({ content, children, side = "top", delayDuration = 200 }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            className="z-50 max-w-xs rounded-md border border-line bg-fg px-2 py-1 text-xs leading-5 text-brand-fg shadow-card"
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-fg" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
