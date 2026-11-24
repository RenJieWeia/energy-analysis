import * as SwitchPrimitive from "@radix-ui/react-switch";
import { useId } from "react";

import { cn } from "~/lib/cn";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** 可见标签；无标签时由外层给 aria-label 或 title */
  label?: string;
  disabled?: boolean;
  className?: string;
}

/** 开关（Radix Switch）：即时生效的二元设置，切换后立即给出反馈文案 */
export function Switch({ checked, onCheckedChange, label, disabled, className }: SwitchProps) {
  const id = useId();
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <SwitchPrimitive.Root
        id={label ? id : undefined}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label ? undefined : "开关"}
        className={cn(
          "inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "data-[state=unchecked]:bg-surface-3 data-[state=checked]:bg-brand",
        )}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            "pointer-events-none block size-3.5 rounded-full bg-surface shadow-card transition-transform",
            "translate-x-0.5 data-[state=checked]:translate-x-[1.15rem]",
          )}
        />
      </SwitchPrimitive.Root>
      {label ? (
        <label htmlFor={id} className="cursor-pointer select-none text-sm text-fg">
          {label}
        </label>
      ) : null}
    </span>
  );
}
