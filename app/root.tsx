import type { ReactNode } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
} from "react-router";

import type { Route } from "./+types/root";
import AppShell from "~/components/layout/app-shell";
import stylesheet from "./app.css?url";

export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "icon", href: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%231f6feb'/%3E%3Cpath d='M17.5 6 9 18h5.5L13 26l9-12.5h-5.7L17.5 6Z' fill='%23fff'/%3E%3C/svg%3E" },
];

export const meta: Route.MetaFunction = () => [
  { title: "能耗分析系统" },
  { name: "description", content: "基于设备抄表数据的多维度能耗分析与报表平台" },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-dvh bg-bg text-fg antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const isHttp = isRouteErrorResponse(error);

  const title = isHttp ? `${error.status} · ${error.statusText}` : "页面加载失败";
  const detail = isHttp
    ? error.data
      ? String(error.data)
      : "请求的资源不存在或无权限访问。"
    : error instanceof Error
      ? error.message
      : "未知错误。";

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-6">
      <p className="text-xs font-medium tracking-widest text-fg-subtle uppercase">
        ENERGY ANALYSIS
      </p>
      <h1 className="text-2xl font-semibold text-fg">{title}</h1>
      <p className="text-sm leading-6 text-fg-muted">{detail}</p>
      <div className="flex gap-3">
        <a
          href="/"
          className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-brand-fg hover:bg-brand-strong"
        >
          返回总览看板
        </a>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium text-fg hover:bg-surface-2"
        >
          重新加载
        </button>
      </div>
    </main>
  );
}
