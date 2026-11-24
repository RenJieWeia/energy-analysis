import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ComponentProps } from "react";

import { cn } from "~/lib/cn";

export type TabsProps = ComponentProps<typeof TabsPrimitive.Root>;

/** 平级视图切换（同一份数据的多个视角），不要用于页面级导航 */
export function Tabs({ className, ...props }: TabsProps) {
  return <TabsPrimitive.Root className={cn("flex flex-col gap-3", className)} {...props} />;
}

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-md border border-line bg-surface-2 p-1",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm px-3 text-xs font-medium text-fg-muted",
        "transition-colors hover:text-fg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:bg-surface data-[state=active]:text-fg data-[state=active]:shadow-card",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn("focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand", className)}
      {...props}
    />
  );
}
