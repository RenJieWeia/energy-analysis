import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { useId } from "react";

import { cn } from "~/lib/cn";

export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** 半选（表头三态：当前页部分选中）。优先级高于 checked */
  indeterminate?: boolean;
  /** 可见标签；无标签时用 ariaLabel */
  label?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * 复选框（Radix Checkbox）：支持半选态。
 * 表头「当前页全选」三态：全选 / 半选 / 未选，范围只代表当前页（L1）。
 */
export function Checkbox({
  checked,
  onCheckedChange,
  indeterminate = false,
  label,
  ariaLabel,
  disabled,
  className,
}: CheckboxProps) {
  const id = useId();
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <CheckboxPrimitive.Root
        id={label ? id : undefined}
        disabled={disabled}
        checked={indeterminate ? "indeterminate" : checked}
        onCheckedChange={(next) => onCheckedChange(next === true)}
        aria-label={label ? undefined : (ariaLabel ?? "选择")}
        className={cn(
          "peer inline-flex size-4 shrink-0 items-center justify-center rounded-sm border border-line-strong bg-surface",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus-visible:ring-offset-surface",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "data-[state=checked]:border-brand data-[state=checked]:bg-brand",
          "data-[state=indeterminate]:border-brand data-[state=indeterminate]:bg-brand",
        )}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-brand-fg">
          {indeterminate ? (
            <Minus aria-hidden="true" className="size-3" />
          ) : (
            <Check aria-hidden="true" className="size-3" />
          )}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label ? (
        <label htmlFor={id} className="cursor-pointer select-none text-sm text-fg">
          {label}
        </label>
      ) : null}
    </span>
  );
}
