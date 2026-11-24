import { Link, isRouteErrorResponse, useRouteError } from "react-router";

import { Button } from "~/components/ui/button";
import { EmptyState } from "~/components/ui/empty-state";

/**
 * 路由级错误边界（总览/分析页共用）。
 * 只处理「这一页取数或渲染失败」，不替换整个外壳，导航仍然可用。
 */
export function RouteErrorBoundary({ label }: { label: string }) {
  const error = useRouteError();
  const isHttp = isRouteErrorResponse(error);
  const title = isHttp ? `${error.status} · ${error.statusText}` : `${label}加载失败`;
  const detail = isHttp
    ? typeof error.data === "string" && error.data.length > 0
      ? error.data
      : "请求的资源不存在或暂不可访问。"
    : error instanceof Error
      ? error.message
      : "未知错误，请稍后重试。";

  return (
    <div className="py-8">
      <EmptyState
        variant="error"
        title={title}
        description={detail}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="primary" size="sm">
              <Link to="/">返回总览看板</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.location.reload();
              }}
            >
              重新加载
            </Button>
          </div>
        }
      />
    </div>
  );
}
