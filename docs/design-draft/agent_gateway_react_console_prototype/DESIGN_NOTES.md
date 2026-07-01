# UI 原型设计说明

## 布局

- 左侧固定导航。
- 顶部全局状态栏。
- 中间为页面内容区。
- 关键页面采用“主工作区 + 右侧详情/状态栏”结构。

## 核心组件

- Sidebar
- Topbar
- Panel
- MetricCard
- Badge
- StatusBadge
- Machine Table
- Terminal Panel
- File Explorer
- Pi Event Timeline
- FRP Mapping Form
- Release Rollout Panel
- Install Token Generator
- Audit Table

## 可替换方向

如果后续进入正式工程，建议：

- 图标替换为 lucide-react。
- 表格替换为 TanStack Table。
- 表单替换为 react-hook-form + zod。
- 请求层使用 TanStack Query。
- 终端使用 xterm.js。
- 代码预览使用 Monaco Editor。
