import { AlertTriangle, CircleAlert, CircleCheck, Info } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "~/lib/cn";

export type AlertVariant = "info" | "warning" | "danger" | "success";

const VARIANT: Record<AlertVariant, { wrap: string; icon: string; Icon: typeof Info }> = {
  info: { wrap: "border-transparent bg-brand-soft text-brand", icon: "text-brand", Icon: Info },
  warning: { wrap: "border-transparent bg-warning-soft text-warning", icon: "text-warning", Icon: AlertTriangle },
  danger: { wrap: "border-transparent bg-danger-soft text-danger", icon: "text-danger", Icon: CircleAlert },
  success: { wrap: "border-transparent bg-success-soft text-success", icon: "text-success", Icon: CircleCheck },
};

export interface AlertProps {
  variant?: AlertVariant;
  /** 一句话结论（第一层） */
  title: string;
  /** 依据/原因/恢复路径（第二层），可含列表 */
  children?: ReactNode;
  /** 右侧操作（如「重试」「查看原因」「去处理」） */
  action?: ReactNode;
  className?: string;
}

/** 内嵌提示条：告警级别配色见 docs/ui-extension.md 第 3 节 */
export function Alert({ variant = "info", title, children, action, className }: AlertProps) {
  const { wrap, icon, Icon } = VARIANT[variant];
  return (
    <div
      role={variant === "danger" ? "alert" : "status"}
      className={cn("flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm", wrap, className)}
    >
      <Icon aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0", icon)} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        {children ? <div className="mt-1 text-xs leading-5 opacity-90">{children}</div> : null}
      </div>
      {action ? <div className="ml-2 flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}
