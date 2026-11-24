import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "~/lib/cn";

/** 按钮视觉规格（导出供 link/asChild 场景复用） */
export const buttonVariants = cva(
  [
    "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium",
    "transition-colors duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: "bg-brand text-brand-fg hover:bg-brand-strong",
        secondary: "border border-line bg-surface-2 text-fg hover:bg-surface-3",
        outline: "border border-line-strong bg-transparent text-fg hover:bg-surface-2",
        ghost: "bg-transparent text-fg-muted hover:bg-surface-2 hover:text-fg",
        danger: "bg-danger text-brand-fg hover:opacity-90",
      },
      size: {
        sm: "h-8 px-2.5 text-xs",
        md: "h-9 px-3.5 text-sm",
        icon: "size-9 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  /** 用 Slot 渲染子元素（如 <Link>），保持样式与可访问性 */
  asChild?: boolean;
}

/**
 * 基础按钮。
 * - 默认 `type="button"`，避免误触发表单提交；需要提交时显式传 `type="submit"`。
 * - `asChild` 时把样式交给子元素（路由 Link、a 标签）。
 */
export function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;
