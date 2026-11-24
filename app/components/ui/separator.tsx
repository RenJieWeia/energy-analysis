import * as SeparatorPrimitive from "@radix-ui/react-separator";
import type { ComponentProps } from "react";

import { cn } from "~/lib/cn";

export type SeparatorProps = ComponentProps<typeof SeparatorPrimitive.Root>;

/** 分割线：默认水平 1px；垂直方向需要在 flex 容器里使用 */
export function Separator({ className, orientation = "horizontal", decorative = true, ...props }: SeparatorProps) {
  return (
    <SeparatorPrimitive.Root
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-line",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
}
