import { type RouteConfig, index, route } from "@react-router/dev/routes";

/**
 * 路由表：业务模型页面（只读）+ 关系维护（单页编辑）。
 * 校验层、模型自检页、场景化编辑页已按需求回退/移除。
 */
export default [
  index("routes/topology.tsx"),
  route("meters", "routes/meters.tsx"),
  route("categories", "routes/categories.tsx"),
  route("topology/edit", "routes/topology-edit.tsx"),
] satisfies RouteConfig;
