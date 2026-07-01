# 20. Todo / Context / VCP 协作模块设计

## 定位

Todo 是 Noesis 的独立资源域，和 Machines / Tasks / Runbooks 平级。它不是 Runbook 的附属能力，也不是第二套任务调度器。

Todo 模块的职责是：

- 记录待办事项、标签分类、执行上下文。
- 让 VCP 这类外部 Agent 用户自主领取可执行事项。
- 保留足够审计引用，便于 VCP 后续总结工作流。
- 让用户最终判断顶层 Todo 是否真正完成。

## VCP 与 Gateway 的关系

VCP 是 Gateway 的 **agent 用户**，不是 Gateway 的执行面，也不是 Gateway 的子模块。

```text
VCPToolBox / VCP Agent
  └─ VCP 插件 import @noesis/sdk
       └─ Gateway HTTP API / WS
            └─ Machines / Tasks / Files / Pi / Runbooks / Todos
```

原则：

1. Gateway 不主动调用 VCP，不保存 VCP 专属配置，不知道 VCP 内部 agent 列表。
2. VCP 插件使用普通 API Token 调 Gateway。
3. VCP 请求用审计头标记来源：
   - `X-Noesis-Source: ai-agent`
   - `X-Noesis-Actor: vcp:<agentName>`，拿不到 agentName 时 fallback `vcp`
4. VCP 插件自行轮询可领取 Todo，自行决定能做多少。
5. Gateway 只提供通用 Todo/Context/Task API。

## 领域模型

### Tag

Tag 是纯分类资源，不绑定上下文。

```ts
interface Tag {
  id: string;
  name: string;
  archivedAt?: string | null;
  source: string;
  actor?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

Tag 删除即归档：历史 Todo 仍显示已归档 Tag，新 Todo 不可再选已归档 Tag。

### Context

Context 是独立执行信息包，可被多个 Todo 复用。Context 是活文档，改即生效，不做版本。

```ts
interface Context {
  id: string;
  name: string;
  machineIds: string[];  // 可空；只校验机器存在，不要求在线
  markdown: string;      // 纯 markdown，不做模板渲染
  archivedAt?: string | null;
  source: string;
  actor?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

设计约束：

- `machineIds` 结构化，因为 Machine 是 Gateway 受管实体，需要引用完整性。
- path / repo / 工作流 / VCP 元能力提示都写进 markdown，因为上下文可能涉及多个目录和自由组织。
- Context markdown 不支持模板变量；Gateway 返回原始结构，VCP 插件自己组 prompt。
- Context 不支持附件；需要文件/URL 时写在 markdown 中，由 VCP 用 Gateway 能力读取。
- Context 删除即归档。已引用的 Todo 保留引用；新 Todo 不可选择已归档 Context。
- 引用已归档 Context 的 ready Todo 不可 claim，服务端返回 `CONTEXT_ARCHIVED`。

### Todo

Todo 使用单表自引用模型，限两层：顶层 Todo + 子任务。子任务不可再有子任务。

```ts
interface Todo {
  id: string;
  parentId?: string | null;        // null = 顶层 Todo
  title: string;
  description?: string | null;     // markdown；父子都支持
  due?: string | null;
  priority: number;                // 默认 0，越大越优先
  contextId?: string | null;       // 子任务为空时继承父 context
  ready?: boolean | null;          // 只对叶子有意义，用户手拨
  status: "todo" | "doing" | "awaiting_confirmation" | "done" | "failed";
  assignee?: "me" | "vcp" | `vcp:${string}` | null; // null = VCP 可自主领取；me = 用户锁定/执行
  resultSummary?: string | null;
  archivedAt?: string | null;
  source: string;
  actor?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

关系：

- Todo 与 Tag 多对多：`todo_tags(todo_id, tag_id)`。
- Todo 与执行 Task 多对多：`todo_task_links(todo_id, task_id, link_type)`。
- 顶层 Todo 可有子任务；有子任务的顶层 Todo 是容器，不可 claim。
- 无子任务的顶层 Todo 自身是叶子，可 claim。
- 子任务是叶子，可 claim。
- 子任务 contextId 可选；为空时继承父 Todo 的 contextId。

## 状态机

### 叶子 Todo

```text
todo <-> doing <-> done
todo <-> failed
doing -> failed
failed -> todo
done -> todo
```

迁移开放，所有迁移必须走 API 并写审计。`ready` 只在 `status=todo` 时可改；`doing` 时冻结；回退到 `todo` 后解冻。

### 父 Todo

父 Todo status 由服务端在子任务变更时事务内联动维护：

- 任一子任务 `doing` -> 父 `doing`
- 任一子任务 `failed` -> 父 `failed`
- 所有子任务 `done` -> 父 `awaiting_confirmation`
- 用户 `POST /confirm` 后父 `done`

父 Todo done 的前提是所有子任务 done。不支持 failed 子任务下强制 confirm。

### VCP 完成后的终判

- VCP report done 到 **顶层无子任务 Todo**：该 Todo 进入 `awaiting_confirmation`，用户 confirm 后 done。
- VCP report done 到 **子任务**：子任务直接 done；父 Todo 等所有子任务 done 后进入 `awaiting_confirmation`，用户 confirm 父 Todo。
- 用户自己完成的 leaf 可直接 done，因为用户就是终判者。

## VCP 领取与协作

### 候选查询

VCP 插件轮询叶子 Todo：

```text
GET /api/todos?status=todo&ready=true&assignee=unassigned&leafOnly=true&archived=false&include=context,tags&pageSize=20
```

服务端排序：

```text
priority DESC, due ASC NULLS LAST, created_at ASC
```

VCP 插件拿到候选后读取 title / description / tags / context.machineIds / context.markdown，自主判断能不能做。

如果 VCP 判断不能做：

- 不 claim，不写 Gateway。
- 插件本地按 `todoId + updatedAt` 做冷却，避免反复判断同一版本。
- Todo 更新后冷却失效，重新评估。

### Claim

```text
POST /api/todos/:id/claim
```

请求：

```json
{ "assignee": "vcp" }
```

前置条件：

- 目标是叶子 Todo。
- `status=todo`
- `ready=true`
- `assignee IS NULL`（或调用者为用户 claim 自己的 Todo）
- 未归档。
- 关联 Context 未归档。

成功：

- 原子设置 `status=doing`。
- `assignee` 优先取 `X-Noesis-Actor` 中的 `vcp:<agentName>`；没有具体 agent 时用 `vcp`。
- 写 audit_log。

冲突返回 409，例如 `ALREADY_CLAIMED` / `NOT_READY` / `CONTEXT_ARCHIVED`。

### Report

```text
POST /api/todos/:id/report
```

请求：

```json
{
  "status": "done",
  "resultSummary": "完成了依赖升级和验证，剩余：请人工观察线上指标 30 分钟。",
  "executedTaskIds": ["task_001", "task_002"]
}
```

前置条件：

- `status=doing`
- VCP 回写时，`assignee` 必须为 `vcp` 或等于当前 `X-Noesis-Actor`；用户回写自己的 Todo 时 `assignee=me`。

规则：

- `executedTaskIds` 必须引用存在的 Task；不校验 actor，可引用用户或系统已有 Task 作为证据。
- `todo_task_links` 记录关联。
- VCP 做不完整时 report `failed`，并在 resultSummary 写明已完成部分和剩余人工事项；不新增 handing_back 状态。

## API 设计

### Tags

```text
GET    /api/tags
POST   /api/tags
GET    /api/tags/:id
PATCH  /api/tags/:id
DELETE /api/tags/:id        # archive
POST   /api/tags/:id/unarchive
```

### Contexts

```text
GET    /api/contexts
POST   /api/contexts
GET    /api/contexts/:id
PATCH  /api/contexts/:id
DELETE /api/contexts/:id    # archive
POST   /api/contexts/:id/unarchive
```

Context 创建/更新时校验 `machineIds[]` 中的机器存在，不检查在线状态。

### Todos

```text
GET    /api/todos
POST   /api/todos
GET    /api/todos/:id
PATCH  /api/todos/:id
DELETE /api/todos/:id       # archive，父归档时子任务一起归档
POST   /api/todos/:id/unarchive
POST   /api/todos/:id/claim
POST   /api/todos/:id/report
POST   /api/todos/:id/confirm
POST   /api/todos/:id/status
```

创建使用统一端点，`parentId` 区分顶层/子任务：

```json
{
  "title": "修复 VCP 插件配置热重载",
  "description": "复现配置保存后 AgentAssistant 未刷新，修复并验证。",
  "parentId": null,
  "tagIds": ["tag_vcp"],
  "contextId": "ctx_vcp",
  "due": "2026-06-25",
  "priority": 1,
  "ready": true,
  "assignee": null
}
```

子任务创建时 `parentId` 必须指向顶层 Todo。服务端禁止第三层。

查询参数：

```text
status=todo|doing|awaiting_confirmation|done|failed
ready=true|false
tagId=tag_x
contextId=ctx_x
assignee=me|vcp|unassigned    # vcp 匹配 vcp 和 vcp:<agentName>
parentId=null|todo_x
q=关键词
archived=false|true|all
leafOnly=true|false
include=tags,context,machines,tasks
page=1&pageSize=50
```

默认不返回 archived。`include` 按需展开关联资源；Gateway 不返回预组装 agentPrompt。

## 数据库草案

旧 `todo_items` 表废弃，替换为新表。

```sql
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'web',
  actor TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contexts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  machine_ids_json TEXT NOT NULL DEFAULT '[]',
  markdown TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'web',
  actor TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  parent_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  due TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  context_id TEXT,
  ready INTEGER,
  status TEXT NOT NULL DEFAULT 'todo',
  assignee TEXT,
  result_summary TEXT,
  source TEXT NOT NULL DEFAULT 'web',
  actor TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(parent_id) REFERENCES todos(id),
  FOREIGN KEY(context_id) REFERENCES contexts(id)
);

CREATE TABLE IF NOT EXISTS todo_tags (
  todo_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY(todo_id, tag_id),
  FOREIGN KEY(todo_id) REFERENCES todos(id) ON DELETE CASCADE,
  FOREIGN KEY(tag_id) REFERENCES tags(id)
);

CREATE TABLE IF NOT EXISTS todo_task_links (
  todo_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  link_type TEXT NOT NULL DEFAULT 'executed',
  created_at TEXT NOT NULL,
  PRIMARY KEY(todo_id, task_id, link_type),
  FOREIGN KEY(todo_id) REFERENCES todos(id) ON DELETE CASCADE,
  FOREIGN KEY(task_id) REFERENCES tasks(id)
);

CREATE INDEX IF NOT EXISTS idx_todos_parent ON todos(parent_id);
CREATE INDEX IF NOT EXISTS idx_todos_status_ready ON todos(status, ready);
CREATE INDEX IF NOT EXISTS idx_todos_assignee_status ON todos(assignee, status);
CREATE INDEX IF NOT EXISTS idx_todos_context ON todos(context_id);
CREATE INDEX IF NOT EXISTS idx_todos_priority_due_created ON todos(priority, due, created_at);
CREATE INDEX IF NOT EXISTS idx_todos_archived ON todos(archived_at);
CREATE INDEX IF NOT EXISTS idx_todo_tags_tag ON todo_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_todo_task_links_task ON todo_task_links(task_id);
```

两层限制和父状态联动在服务端事务中实现，不靠 SQLite 触发器。

## SDK / CLI

SDK 顶层新增：

```ts
noesis.todos.*
noesis.tags.*
noesis.contexts.*
```

关键 SDK 方法：

```ts
await noesis.todos.list({ status: 'todo', ready: true, leafOnly: true, assignee: 'unassigned', include: ['context', 'tags'] });
await noesis.todos.claim(id, { assignee: 'vcp' }); // 服务端可按 X-Noesis-Actor 落为 vcp:<agentName>
await noesis.todos.report(id, { status: 'done', resultSummary, executedTaskIds });
await noesis.todos.confirm(id);
```

CLI 首版也提供 todo/tag/context 命令，供其他 Agent 使用；VCP 插件首版直接 import SDK，不依赖 CLI。

## VCP 插件职责

VCP 插件不属于 Gateway 项目实现，但 Gateway 设计需要给它留契约。

插件职责：

1. import `@noesis/sdk`。
2. 使用普通 API Token 连接 Gateway。
3. 轮询可领取 Todo。
4. 根据 tag/context 路由到 VCP 内部 agent：
   - defaultAgentName 兜底。
   - routingRules 可按 tag/context 匹配 agent。
5. 由 VCP agent 自己判断能做多少。
6. claim 时设置 `X-Noesis-Actor: vcp:<agentName>`，让 Gateway 把 assignee 和审计都落到具体 agent。
7. 执行时调用 Gateway 完整能力：machines/files/commands/pi/runbooks/tasks。
8. report done/failed，写 resultSummary 和 executedTaskIds。
9. 对已完成 Task/Runbook 主动拉取审计轨迹，调用 VCP 元能力总结后回写 Todo 或外部记录。

示例配置：

```json
{
  "gateway": { "baseUrl": "https://gateway.example.com", "token": "..." },
  "todo": {
    "enabled": true,
    "pollIntervalSeconds": 30,
    "pollLimit": 20,
    "defaultAgentName": "诺娃",
    "routingRules": [
      { "tag": "前端", "agentName": "可可" },
      { "contextName": "VCPToolBox", "agentName": "诺娃" }
    ]
  }
}
```

## UI

新增两个一等资源页，放在控制台侧栏「协作」分组下：`/todos` 和 `/contexts`。Gateway 不做 VCP 专用配置页；VCP 只通过 SDK/API 使用通用 Todo/Context/Tag 资源。

### `/todos`

页面职责：让用户创建、筛选、拆分、终判 Todo；让 VCP 领取状态和执行证据对用户可见。

布局采用「左侧 Todo 队列 + 右侧详情」，避免 Todo 很多时全展开树撑爆页面：

- 左侧列表展示筛选后的扁平 Todo 队列，不默认展开整棵树。
- 每页默认 20 条，可切 20 / 50 / 100；筛选变化回到第 1 页。
- 行内展示父子关系：顶层 leaf / 父容器 / 子任务及父 Todo 名称。
- 顶层 Todo 有子任务时标为「父容器」，不可 claim。
- 无子任务顶层 Todo 和所有子任务标为「leaf」，可按规则 claim。
- 行内展示 status、ready、assignee、priority、due、context。
- 筛选：status / ready / tag / context / assignee / q / archived。
- 排序后再分页；默认按服务端候选排序展示：`priority DESC, due ASC NULLS LAST, created_at ASC`。
- 大规模场景（数千条以上）切后端分页或游标查询；前端不做无限滚动。

右侧详情展示：

- title、description markdown 原文、due、priority、tags、context、ready、assignee。
- 父 Todo 的子任务进度。
- `resultSummary`。
- `todo_task_links` 对应的 linked tasks，可跳转 Task 详情。
- audit 摘要，至少显示 ready/claim/report/confirm/status/archive 最近记录。
- 操作按钮：claim、report done/failed、confirm、archive/unarchive。

交互规则：

- `ready` 只在 `status=todo` 时可拨；`doing` / `awaiting_confirmation` / `done` / `failed` 时 UI 显示冻结态。
- Claim 按钮仅在「未归档、leaf、status=todo、ready=true、assignee=null、Context 未归档」时可用；禁用时展示具体原因。
- 引用已归档 Context 的 ready Todo 行内显示红色 Context 徽章，claim 返回/提示 `CONTEXT_ARCHIVED`。
- VCP report done 到顶层 leaf 后，状态显示 `awaiting_confirmation`，右侧显示用户 confirm 按钮。
- VCP report done 到子任务后，子任务直接 done；父 Todo 全部子任务 done 后进入 `awaiting_confirmation`。
- 用户自己执行的 leaf 可直接 done；VCP 执行的完成结果必须由用户终判。
- Tag 支持 inline 创建和归档；已归档 Tag 仍在历史 Todo 上显示，新建/编辑时不可选。

### `/contexts`

页面职责：管理给用户和 VCP 读取的执行信息包，避免把路径、仓库、机器和执行说明散落在 Todo description 里。

布局采用「左侧 Context 列表 + 右侧编辑/预览」：

- 左侧列表支持搜索和 archived 筛选，显示机器数、引用 Todo 数、更新时间、归档状态。
- 右侧编辑 name、machineIds、多行 markdown。
- 右侧同时展示 markdown preview；首版可轻量预览，不要求完整 Markdown 渲染。
- 右侧展示引用该 Context 的 Todo 列表和状态。
- 操作：保存、归档、恢复。

交互规则：

- `machineIds` 可空；创建/更新时只校验机器存在，不要求在线。
- markdown 原样保存，不支持模板变量。
- Context 不支持附件；文件/URL 写入 markdown，由 VCP 用 Gateway 能力读取。
- Context 归档后历史 Todo 保留引用，新 Todo 不可选。
- 已有 ready Todo 引用归档 Context 时，UI 保持可见但 claim 禁用。

## Runbook DSL

保留并升级全局能力 `todo.create`，使其调用新 Todo API。

```ts
interface TodoDsl {
  create(input: {
    title: string;
    description?: string;
    due?: string;
    priority?: number;
    tagIds?: string[];
    contextId?: string;
    parentId?: string;
    ready?: boolean;
    assignee?: 'me' | null;
  }): Promise<TodoItem>;
  list(filter?: TodoListFilter): Promise<TodoItem[]>;
}
```

Runbook 创建 `ready=true` 的 Todo 时，服务端要求：

- `contextId` 存在且未归档。
- `description` 非空。

否则返回 `TODO_NOT_READY_ENOUGH`。source=runbook 不影响 VCP 领取，ready/context/status 才是领取依据。

## 审计与总结

所有 Todo/Tag/Context 创建、更新、归档、ready 变更、claim、report、confirm、状态迁移都写 audit_log。

VCP 总结时的数据来源：

1. Todo title / description / resultSummary。
2. Context machineIds / markdown。
3. todo_task_links 关联的 Task。
4. TaskEvent / PiSession / RunbookRun trace。
5. audit_logs 的 source / actor / action / result。

Todo 模块不复制执行日志；执行轨迹保留在现有 Task/audit 链路中。
