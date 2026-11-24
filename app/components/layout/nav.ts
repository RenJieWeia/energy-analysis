/**
 * 主导航（业务模型四页）。
 * 只描述「去哪、叫什么、干什么」，图标与高亮由 app-shell 负责。
 */
export interface NavItem {
  to: string;
  label: string;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: "/",
    label: "拓扑总览",
    description: "空间树 · 本级实测与下级汇总",
  },
  {
    to: "/meters",
    label: "计量表",
    description: "表号、能源类型、挂载与区间用量",
  },
  {
    to: "/categories",
    label: "分项分类",
    description: "分类树与占比范围划分",
  },
  {
    to: "/topology/edit",
    label: "关系维护",
    description: "编辑拓扑树、挂表与分项",
  },
];
