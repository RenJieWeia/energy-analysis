import type { ComponentProps } from "react";

import { cn } from "~/lib/cn";

/**
 * 表格容器：横向滚动 + 最大高度，表头 sticky。
 * 列多时保持列宽、由容器横向滚动，不要压缩列宽（列宽策略见 docs/ui-extension.md 第 8 节）。
 */
export interface TableContainerProps extends ComponentProps<"div"> {
  /** 最大高度，默认 560px；超过后内部纵向滚动，表头保持可见 */
  maxHeight?: number | string;
}

export function TableContainer({ className, maxHeight = 560, style, ...props }: TableContainerProps) {
  return (
    <div
      className={cn("relative w-full overflow-auto rounded-lg border border-line bg-surface", className)}
      style={{ maxHeight, ...style }}
      {...props}
    />
  );
}

export function Table({ className, ...props }: ComponentProps<"table">) {
  return <table className={cn("w-full min-w-full border-collapse text-sm tnum", className)} {...props} />;
}

export function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return <thead className={cn("bg-surface-2", className)} {...props} />;
}

export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={cn("divide-y divide-line", className)} {...props} />;
}

export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "transition-colors hover:bg-surface-2 data-[state=selected]:bg-brand-soft",
        className,
      )}
      {...props}
    />
  );
}

export interface TableHeadProps extends ComponentProps<"th"> {
  align?: "left" | "right" | "center";
  /** 列说明（如口径、样本量），悬浮可见 */
  hint?: string;
}

const ALIGN_CLASS = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

export function TableHead({ className, align = "left", hint, children, ...props }: TableHeadProps) {
  return (
    <th
      scope="col"
      title={hint}
      className={cn(
        "sticky top-0 z-10 whitespace-nowrap border-b border-line bg-surface-2 px-3 py-2.5",
        "text-xs font-medium text-fg-muted",
        ALIGN_CLASS[align],
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export interface TableCellProps extends ComponentProps<"td"> {
  align?: "left" | "right" | "center";
  /** 单行截断；数字/状态列可关掉 */
  truncate?: boolean;
  /** 悬浮提示文案，不传时自动取文本子节点（截断内容必须可读） */
  hint?: string;
}

export function TableCell({
  className,
  align = "left",
  truncate = true,
  hint,
  children,
  ...props
}: TableCellProps) {
  const fallbackHint = typeof children === "string" || typeof children === "number" ? String(children) : undefined;
  return (
    <td
      title={hint ?? fallbackHint}
      className={cn(
        "px-3 py-2.5 align-middle text-fg",
        truncate ? "max-w-[22rem] overflow-hidden text-ellipsis whitespace-nowrap" : "whitespace-nowrap",
        ALIGN_CLASS[align],
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}

/** 表格说明：写清口径、样本量、数据新鲜度（不是装饰性 caption） */
export function TableCaption({ className, ...props }: ComponentProps<"caption">) {
  return <caption className={cn("caption-bottom px-3 py-2 text-xs text-fg-muted", className)} {...props} />;
}
