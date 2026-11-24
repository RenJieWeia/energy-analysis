import type { ComponentProps } from "react";

import { cn } from "~/lib/cn";

/**
 * 卡片容器。内容区唯一允许的投影是 `shadow-card`，页面里不要自定义阴影。
 * 卡片内列表必须给最大高度 + 内部滚动，别让列表把卡片撑高（见 ui-extension 第 9 节页面清单）。
 */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-lg border border-line bg-surface shadow-card", className)} {...props} />;
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1 p-4 sm:p-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return <h3 className={cn("text-sm font-semibold text-fg", className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-xs leading-5 text-fg-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("px-4 pb-4 sm:px-5 sm:pb-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-2 border-t border-line px-4 py-3 sm:px-5", className)}
      {...props}
    />
  );
}

/** 卡片右上角操作区（放在 CardHeader 内或 CardFooter 里都贴右） */
export function CardActions({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("ml-auto flex flex-wrap items-center gap-2", className)} {...props} />;
}
