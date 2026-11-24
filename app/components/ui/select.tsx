import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "~/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  /** 当前值；空串表示未选择（显示 placeholder）。Radix 不允许空值 Item，选项里别放空串 */
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  size?: "sm" | "md";
  /** 无可见 label 时必填，供读屏使用 */
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

const TRIGGER_SIZE = {
  sm: "h-8 px-2.5 text-xs",
  md: "h-9 px-3 text-sm",
} as const;

/**
 * 单选下拉（Radix Select）。
 * 键盘：↑↓ 移动、Enter 选中、Esc 关闭；触发器必有可见焦点环。
 * 分组用法：`<SelectGroup label="设备类型">{...<SelectItem/>}</SelectGroup>`。
 */
export function Select({
  value,
  onValueChange,
  options,
  placeholder = "请选择",
  size = "md",
  ariaLabel,
  disabled,
  className,
}: SelectProps) {
  const selectedLabel = options.find((o) => o.value === value)?.label;
  return (
    <SelectPrimitive.Root value={value === "" ? undefined : value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={cn(
          "inline-flex w-full min-w-[8rem] items-center justify-between gap-2 rounded-md border border-line-strong bg-surface text-fg",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus-visible:ring-offset-surface",
          "disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-fg-subtle",
          TRIGGER_SIZE[size],
          className,
        )}
      >
        <span className="truncate">{selectedLabel ?? placeholder}</span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown aria-hidden="true" className="size-3.5 shrink-0 text-fg-muted" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className={cn(
            "z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-line bg-surface shadow-card",
          )}
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </SelectItem>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export interface SelectItemProps extends ComponentProps<typeof SelectPrimitive.Item> {
  children: ReactNode;
}

/** 单项；也用于自组合分组（配合 SelectGroup） */
export function SelectItem({ className, children, ...props }: SelectItemProps) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-7 text-sm text-fg outline-none",
        "data-[highlighted]:bg-surface-2 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2 inline-flex items-center">
        <Check aria-hidden="true" className="size-3.5 text-brand" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export interface SelectGroupProps {
  /** 分组名（同时作为组的可访问标签） */
  label: string;
  children: ReactNode;
  className?: string;
}

/** 选项分组。组内自行放 SelectItem */
export function SelectGroup({ label, children, className }: SelectGroupProps) {
  return (
    <SelectPrimitive.Group className={cn("border-b border-line last:border-0", className)}>
      <SelectPrimitive.Label className="px-2 py-1 text-[11px] font-medium text-fg-subtle">{label}</SelectPrimitive.Label>
      {children}
    </SelectPrimitive.Group>
  );
}
