import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "~/lib/cn";
import { Button } from "./button";
import { Select } from "./select";

export interface PaginationProps {
  page: number;
  pageSize: number;
  /** 当前筛选条件下的精确总数（不是近似值） */
  total: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
}

/** 千分位（不依赖 locale，保证 SSR/CSR 一致） */
function group(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** 页码序列：1 ... 4 5 6 ... 20 */
function pageItems(page: number, pageCount: number): Array<number | "gap"> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const items: Array<number | "gap"> = [1];
  const start = Math.max(2, Math.min(page - 1, pageCount - 4));
  const end = Math.min(pageCount - 1, Math.max(page + 1, 5));
  if (start > 2) items.push("gap");
  for (let i = start; i <= end; i += 1) items.push(i);
  if (end < pageCount - 1) items.push("gap");
  items.push(pageCount);
  return items;
}

/**
 * 分页：默认 10/20/50；任何筛选/排序/pageSize 变化都回到第 1 页（由页面负责，勿在这里猜）。
 * 第一行文字必须写清「当前范围 + 精确总数」。
 */
export function Pagination({
  page,
  pageSize,
  total,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const first = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const last = Math.min(total, safePage * pageSize);

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 text-xs text-fg-muted", className)}>
      <p className="tnum">
        第 {group(first)}–{group(last)} 条 / 共 <span className="font-medium text-fg">{group(total)}</span> 条
        <span className="ml-1 text-fg-subtle">（当前筛选结果）</span>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange ? (
          <label className="flex items-center gap-1.5">
            <span className="whitespace-nowrap text-fg-muted">每页</span>
            <Select
              size="sm"
              className="min-w-[4.5rem]"
              ariaLabel="每页条数"
              value={String(pageSize)}
              onValueChange={(next) => onPageSizeChange(Number(next))}
              options={pageSizeOptions.map((size) => ({ value: String(size), label: `${size} 条` }))}
            />
          </label>
        ) : null}

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label="上一页"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </Button>

          {pageItems(safePage, pageCount).map((item, index) =>
            item === "gap" ? (
              <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-fg-subtle">
                …
              </span>
            ) : (
              <Button
                key={item}
                variant={item === safePage ? "primary" : "outline"}
                size="icon"
                aria-label={`第 ${item} 页`}
                aria-current={item === safePage ? "page" : undefined}
                onClick={() => onPageChange(item)}
                className="tnum w-9"
              >
                {item}
              </Button>
            ),
          )}

          <Button
            variant="outline"
            size="icon"
            aria-label="下一页"
            disabled={safePage >= pageCount}
            onClick={() => onPageChange(safePage + 1)}
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
        </div>

        <span className="tnum text-fg-subtle">
          {safePage} / {pageCount} 页
        </span>
      </div>
    </div>
  );
}
