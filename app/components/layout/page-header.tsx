import type { ReactNode } from "react";
import { Link } from "react-router";

import { cn } from "~/lib/cn";

/** 面包屑项：有 to 可点击，无 to 表示当前位置 */
export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: BreadcrumbItem[];
  actions?: ReactNode;
  /** 标题下方的口径/状态信息（样本量、数据新鲜度、更新时间等），与标题同层可见 */
  meta?: ReactNode;
}

/**
 * 页面标题区：面包屑 + 标题 + 说明 + 元信息 + 操作区。
 * 元信息（meta）必须与标题同一屏可见，用于承载样本量、口径、新鲜度等审计信息。
 */
export default function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  meta,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-line pb-4">
      {breadcrumb && breadcrumb.length > 0 ? (
        <nav aria-label="面包屑">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-fg-subtle">
            {breadcrumb.map((item, index) => {
              const isLast = index === breadcrumb.length - 1;
              return (
                <li key={`${index}-${item.label}`} className="flex items-center gap-1.5">
                  {index > 0 ? (
                    <span aria-hidden="true" className="text-line-strong">
                      /
                    </span>
                  ) : null}
                  {item.to && !isLast ? (
                    <Link
                      to={item.to}
                      className="rounded-sm transition-colors hover:text-fg hover:underline hover:underline-offset-2"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span aria-current={isLast ? "page" : undefined} className="text-fg-muted">
                      {item.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-3xl text-sm leading-6 text-fg-muted">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>

      {meta ? (
        <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-fg-muted")}>
          {meta}
        </div>
      ) : null}
    </div>
  );
}
