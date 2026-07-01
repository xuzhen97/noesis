# Noesis 灵识 React 控制台 UI 原型

基于 `11-ui-ux-design.md` 设计文档实现的 React 控制台原型，用于直观验证人机共生工作台的 UI/UX 设计。所有页面均按设计文档的 ASCII 布局图实现，mock 数据驱动。

> **面向个人的单用户系统**：无登录/账号/用户菜单；审计日志按「来源」（web/cli/skill/ai-agent）而非「操作人」追溯；危险操作为自确认（非审批别人）；设置页无个人资料分区。

## 技术栈

- React 19 + TypeScript
- Vite 7
- 原生 CSS（深色主题，`#0B0E14` 底色 + `#6366F1` 蓝紫强调）
- Mock 数据驱动，无后端依赖

## 运行

```bash
npm install
npm run dev
```

打开 <http://localhost:5173>

## 全局布局骨架（对应设计文档 2.3）

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo Noesis 灵识] 全局搜索 ⌘K      🔔(红点) 🌓 ⚙       │ 顶部全局栏 56px
├──────────┬──────────────────────────────────────────────────┤
│ 仪表盘    │ 面包屑：机器 / win-dev-01 / 命令        ●在线 v1.2.0│ 面包屑条 40px
│ 机器      ├──────────────────────────────────────────────────┤
│ 任务      │                                                  │
│ 发布中心   │              主内容区（各页面填充）                │
│ 安装中心   │                                                  │
│ 云盘      │                                                  │
│ 审计日志   │                                                  │
│ 设置      │                                                  │
└──────────┴──────────────────────────────────────────────────┘
   220px              主内容区自适应
```

## 包含页面（对应设计文档第五章）

### 顶级页面（9 项主导航，分 4 组）

侧栏分 4 组：运行 / 自动化 / 资源 / 治理。

| 分组 | 路由 | 页面 | 设计文档 |
|---|---|---|---|
| 运行 | 仪表盘 | KPI + 图表 + 失败任务 + 活动流 | 5.1 |
| 运行 | 机器 | 机器列表（点行进详情） | 5.2 |
| 运行 | 任务 | 全局任务列表（常规命令/文件/安装 + Pi 批处理合并，按类型筛选） | 5.4 |
| 自动化 | Runbook 库 | 服务侧全局编排脚本，TS 即 DSL，import 能力函数组织跨机器流程 | 17 |
| 自动化 | 自动化资产 | Browser/Computer Macro、候选经验、AutomationRunReport 汇总 | 19 |
| 自动化 | 发布中心 | 版本列表 + 灰度滑块 + 滚动进度 | 5.6 |
| 自动化 | 安装中心 | 创建令牌 + 安装命令 + 令牌表 | 5.7 |
| 资源 | 云盘 | 连接状态 + 中转文件 | 5.8 |
| 治理 | 审批中心 | 聚合等待中的 Approval，处理 approve()/命令级确认产生的审批请求 | 5.11 / 17 |
| 治理 | 审计日志 | 数据表 + 筛选 + 风险色标 | 5.9 |
| 治理 | 设置 | API Token / Pi Provider Profile / 阿里云盘 / 保留策略 | 5.10 |

侧栏可折叠（左下角折叠按钮，折叠后只留图标列）。

### 机器详情 Tab 体系（对应 2.2 / 5.3）

点机器列表某行 → 进入机器详情，顶部 8 个 Tab：

`概览 · 终端 · 会话 · 文件 · 日志 · FRP 映射 · Computer Use · 配置`

- **概览**（5.3.1）：能力条 + 运行时指标 + 磁盘详情 + 近期任务
- **终端**（5.3.2）：纯命令终端（shell 交互，不含 Pi）
- **会话**（5.3.3）：Pi 交互终端（pi.terminal，机器上下文由路由确定不选机器；会话列表侧栏 + 对话区 + 输入框）
- **文件**（5.3.4）：磁盘切换条 + 目录树 + 文件表 + 预览
- **日志**：机器运行日志（INFO/WARN/ERROR 级别筛选 + 导出云盘）
- **FRP 映射**：该机器的 FRP 端口映射
- **Computer Use**：Browser Use / Computer Use 状态、自检、安装修复、任务入口、报告、WebRTC 旁观/接管
- **配置**：Pi 策略（Provider Profile + 运行时策略 + 工具权限 + 危险操作拦截）

> 设计原则：任务跨机器汇总到全局「任务」页，日志是机器自身运行产物放机器详情。Runbook 已上提到服务侧全局库（侧栏「自动化」分组），机器配置不再保存模板。

### 任务详情（5.5）

点任务列表某行 → 任务详情：事件流回放 + 审计关联 + session_stats；待确认任务额外显示审批面板。

### Runbook 能力分层（对应 17）

编排脚本是真实 TS，`import { defineRunbook }` 拿到带类型的能力函数。能力分两层：

- **机器绑机能力** `on(machine)` → `MachineDsl`：`cmd` / `pi` / `file.{read,write,move,delete}`——作用于指定机器
- **全局能力** `RunbookDsl` 顶层：`cloud.*`（跨机云盘搬运）/ `todo.*`（Todo 协作）/ `machines.*`（动态选机不硬编码 id）——不绑机；VCP 通过外部插件 + SDK 接入，不是 Runbook DSL 能力

原型有 7 条 runbook（`r1`–`r7`），其中 `r7` 同时演示两层能力（file 读写 + cloud 跨机 + machines 选机 + todo 记待办）。正式 Todo / Context / VCP 协作模块见 `20-todo-vcp-collaboration.md`，原型已提供 `/todos` 和 `/contexts` 的协作页面。扩展能力只需往对应层接口加方法，模型层零改动。复用片段用 TS 原生 `import`（零新机制），runbook 组合 runbook 暂不做（YAGNI）。详见 `17-runbook-flow-orchestration.md`。

## Pi 交互式 Web 终端（三层结构，对应设计文档第六章 / 5.3.3）

这是本项目最核心、最差异化的页面。点击机器详情的「会话」Tab 进入，**不套用 Tab 条**，采用三层结构：

```
┌─────────────────────────────────────────────────────────────┐
│ 顶部全局栏（外壳）                                            │
├─────────────────────────────────────────────────────────────┤
│ 面包屑：机器 / win-dev-01 / 会话         ●在线 v1.2.0         │
├──────────┬──────────────────────────────────────────────────┤
│ 主导航    │ Panel 头：Pi 会话                          [+ 新会话] │
│          ├──────────────────────────────────────────────────┤
│          │ 子顶栏：[win-dev-01 · Win11] Sonnet4▾ thinking高▾ abort▾  ⚡12.3k $0.42│
│          ├─────┬────────────────────────────────────────────┤
│          │会话 │ 搜索会话… │ 对话区（流式）                  │
│          │列表 │ ●修复依赖  │ [user] 把 src 下所有.ts 文件列出来│
│          │     │  清理日志  │ [asst] ▾思考过程                 │
│          │     │  部署脚本  │ [asst] 我来读取目录：            │
│          │     │  重构配置  │ [tool] bash: ls src/**/*.ts 1.2s │
│          │     │            │ [asst] 共 3 个 TypeScript 文件：  │
│          │     │            │ ── turn 收口 ── 1turn·1.2s·840tok│
│          │     │            ├──────────────────────────────────┤
│          │     │            │ 输入消息，/触发命令… [steer][发送↵]│
└──────────┴─────┴────────────┴──────────────────────────────────┘
  220px   220px          对话区自适应
```

**机器上下文**：会话 Tab 位于机器详情页内，机器已由路由 `/machines/:id` 确定，**不再设机器切换器**。子顶栏左侧以只读徽章展示当前机器（`{m.id} · {m.os}`），与面包屑一致。跨机器的会话浏览请使用「任务」Tab 的全局任务列表。

**对话区消息类型**：user 气泡 / assistant 文本 / thinking 折叠卡 / bash 工具卡（命令+输出）/ markdown 列表 / turn 收口分隔线。

**steer vs abort**（放不同位置的设计理由）：

| | steer | abort |
|---|---|---|
| 模型还在跑吗 | 是，**不停止**，把新 prompt 注入流 | 是，**立即停止** |
| 心智模型 | “等等，换个方向” — 模型继续 turn 但改变目标 | “停下，别动了” — 拿回控制权 |
| RPC 命令 | `prompt` 带 `streamingBehavior: "steer"` | `abort` / `abort_bash` / `abort_retry` |
| 副作用 | turn 继续，token 继续涨 | turn 终止，计费停止 |
| 放置位置 | 输入框旁（消息级："我要说话"） | 子顶栏（会话级："我要让模型闭嘴"） |

**abort ▾ 下拉的三档粒度**：

| 命令 | 停止范围 | 用途 |
|---|---|---|
| `abort` | 停整个 turn | 模型明显走偏，不想让它继续任何动作 |
| `abort_bash` | 只停当前 bash toolcall | 命令在跑但跑歪了（如 `npm install` 卡死），停这一个、保留 turn |
| `abort_retry` | 停自动重试循环 | API 限流触发了 `auto_retry_*`，不想再烧 token 重试 |

> 为什么是下拉：单一 abort 按钮做不到三档粒度—用户可能只想停那条卡死的 bash 而不想丢掉模型已经做完的一半工作。下拉既保留语义又不过度占顶栏空间。

**abort 与 token 统计的关联**：子顶栏右侧 `⚡ 12.3k · $0.42` 与 abort 物理相邻，强化"运行时状态"语义—用户 abort 往往就是为了止住 token 燃烧。长会话持续消耗模型 token，靠 `get_session_stats` 在顶栏实时展示 token/费用，并在 `maxLifetimeSeconds` 到期前提示用户。

**abort 与 policy-gate（危险操作拦截）的关系**：policy-gate 是系统自动暂停（命中 `rm -rf`/`git push` 规则 → Web 弹确认 → 用户拒绝 → Client 回 `abort` 该 toolcall）；abort 按钮是这条路径之外的**独立手动逃生口**—即使没命中规则，用户看到模型在做蠢事也能一键叫停。

> 可交互验证：点击子顶栏的模型下拉可切换模型（Sonnet 4 / GPT-4o / DeepSeek Chat）；会话列表项可选中切换。

## 截图

`screenshots/` 目录包含 16 张页面截图：

- `proto-01-dashboard.png` 仪表盘
- `proto-03-machine-detail-overview.png` 机器详情 Overview
- `proto-04-command.png` / `proto-04b-files.png` 命令控制台 / 文件管理
- `proto-05-pi-workbench.png` Pi 工作台（批处理）
- `proto-06-pi-terminal-win-dev-01.png` / `proto-06-pi-terminal-linux-db-02.png` Pi 终端（两台机器）
- `proto-07-tasks.png` ~ `proto-12-settings.png` 其余顶级页
- `proto-audit-personal.png` / `proto-settings-personal.png` / `proto-tasks-personal.png` 面向个人优化后复摄

## 文件结构

```
src/
├── App.tsx          外壳 + 路由状态机（Sidebar/Topbar/Breadcrumb）
├── components.tsx   共享 UI 组件（Badge/Button/Panel/StatusBadge 等）
├── pages.tsx        页面组件（含自动化资产和 Computer Use 原型）
├── mockData.ts      Mock 数据 + Route 类型
├── styles.css       样式（设计文档对齐层在文件末尾）
└── main.tsx
```

## 设计要点

- 深色技术控制台风格，桌面端优先
- 全部简体中文 UI
- **面向个人单用户**：无账号体系，审计按来源追溯，危险操作自确认
- 所有页面布局严格对应 `11-ui-ux-design.md` 的 ASCII 布局图
- Pi 会话三层结构体现机器上下文 + 会话管理 + 流式 AI 交互

## 下一步建议

1. 将 `mockData.ts` 替换为真实 API
2. 接入 WebSocket（命令终端 / Pi 事件流 / Pi 终端流式）
3. 图标替换为 lucide-react，表格替换为 TanStack Table
4. 终端用 xterm.js，代码预览用 Monaco Editor
