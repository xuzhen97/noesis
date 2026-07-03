# Noesis Web 登录与控制台基础布局设计

## 背景

Noesis 当前 Web 仅展示 P0 控制闭环占位。本次目标是在正式 Web 包中建立第一层可用控制台外壳：单用户登录门禁、基础导航、主题切换和诚实占位的仪表盘。`docs/design-draft/agent_gateway_react_console_prototype` 只作为布局与氛围参考，不搬运旧原型的大量 mock 页面。

## 已确认范围

### 包含

- 单用户 **Owner Token** 登录页。
- 登录后进入控制台外壳。
- 路由：`/dashboard`、`/machines`、`/tasks`、`/settings`。
- 仪表盘展示 P0 诚实占位状态：Gateway、Machines、Tasks、Protocol、安全状态。
- 左侧导航、顶栏、面包屑、主内容区。
- 暗色优先，支持亮色主题并本地记忆。
- 适度科技风视觉：蓝紫/青色光晕、轻网格、半透明面板、active nav 微光、克制动效。

### 不包含

- 多用户账号、注册、忘记密码、RBAC。
- 真实 `/api/auth/login` 后端接入。
- 复杂机器表格、Task 表格、Runbook、FRP、Pi Terminal、Approval 等完整页面。
- 从旧原型复制大文件或大量 mock 数据。

## 用户流

1. 用户打开 Web。
2. 如果本地没有 `noesis.ownerToken`，显示登录页。
3. 用户输入 Owner Token。
4. 前端做非空校验；通过后保存到 `localStorage`。
5. 登录后进入 `/dashboard`。
6. 用户可在控制台内退出；退出会清除本地 Owner Token 并回到登录页。

## 术语约束

- 登录是个人单用户系统的 **Owner Token** 门禁，不表示多账号体系。
- 审计、Machine、Task、Task Event 等术语沿用根目录 `CONTEXT.md`。
- UI 文案使用简体中文。

## 信息架构

```text
┌─────────────────────────────────────────────────────────────┐
│ Noesis 灵识         搜索占位          主题切换   退出        │
├──────────────┬──────────────────────────────────────────────┤
│ 仪表盘        │ 面包屑：仪表盘                              │
│ 机器          ├──────────────────────────────────────────────┤
│ 任务          │ 主内容区                                    │
│ 设置          │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

### 路由

- `/dashboard`：仪表盘，占位状态卡。
- `/machines`：机器页，显示等待 Client Agent 接入。
- `/tasks`：任务页，显示暂无 Task。
- `/settings`：设置页，显示本地 Owner Token 状态和退出入口。

未知路由回到 `/dashboard`。

## 技术方案

### UI 技术栈

采用更适合 AI 控制台视觉扩展的组合：

- `shadcn/ui` 风格组件。
- `tailwindcss` 作为样式基础。
- `lucide-react` 提供 SVG 图标。
- `react-router-dom` 提供正式前端路由。

本阶段只落最少组件能力：button、input、label、card、separator。复杂表格和表单后续需要时再引入 `@tanstack/react-table`、`react-hook-form`、`zod` 等专用库。

### 文件结构

```text
packages/web/
├── components.json
├── src/
│   ├── App.tsx
│   ├── styles.css
│   ├── lib/utils.ts
│   └── components/ui/
│       ├── button.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── card.tsx
│       └── separator.tsx
```

允许按 shadcn/Tailwind 需要补最小配置文件。不得新增与当前范围无关的页面、mock 数据层或抽象层。

## 状态存储

- `localStorage["noesis.ownerToken"]`：保存本地 Owner Token。
- `localStorage["noesis.theme"]`：保存 `dark` / `light` 主题偏好。

Owner Token 只保存在当前浏览器本地。本阶段不做加密存储、不做服务端校验。

## 视觉规则

- 暗色主题为主体验。
- 科技炫技强度约 6/10：一眼有科技感，但仍像生产工具。
- 背景使用暗色、蓝紫/青色径向光晕和轻微网格纹理。
- 面板使用半透明深色、细描边、轻微 glow。
- 当前导航使用蓝紫左边线和微光。
- 动效控制在 150–250ms：页面淡入、卡片 hover 轻微上浮、按钮状态过渡。
- 尊重 `prefers-reduced-motion`。
- 不使用 emoji 作为结构图标。
- 亮色主题保持可用，但不作为主视觉。

## 可访问性与响应式

- 表单字段必须有可见 label。
- 交互元素保留明显 focus 状态。
- 点击目标不小于 44px。
- 正文基准字号不低于 16px。
- 颜色通过主题 token 管理，避免组件内散落硬编码色值。
- 375px 小屏不出现横向滚动；移动端侧栏可退化为顶部/卡片式导航。

## 错误处理

- Owner Token 为空时，在输入框附近显示明确错误。
- 本地存储不可用时，显示登录失败提示，不进入控制台。
- 退出时清除 token 并回到登录页。
- 未知路由回到 `/dashboard`。

## 验证标准

- `pnpm --filter @noesis/web build` 通过。
- 收尾 `pnpm verify` 通过。
- 浏览器手动检查：登录、导航、主题切换、退出。
- 375px 小屏无横向滚动。
- 暗色和亮色主题文字对比可读。

## 后续扩展点

- 接入真实 `/api/auth/login` 后，替换本地非空校验。
- 做 Machines/Tasks 时再引入表格与数据请求层。
- 做复杂设置表单时再引入 `react-hook-form` 和 `zod`。
- 做命令面板时再引入 shadcn command/dialog 等组件。
