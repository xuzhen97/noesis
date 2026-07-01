# 18. SDK 设计

## 定位

`@noesis/sdk` 是 Gateway 的统一集成层，供 CLI、Node 脚本、桌面程序、Web UI 等上层调用。SDK 只负责完整暴露 Gateway 能力，不内置业务部署模板；一键部署、批量指挥、多机编码流程由上层用 SDK 组合。

核心边界：

- 覆盖 Gateway HTTP API、WebSocket 事件流、Runbook、Transfer、Sync、Pi Terminal 等协议能力。
- CLI 依赖 SDK 实现，CLI 只负责命令解析与展示。
- SDK 不绑定 Electron；Electron 只是 SDK 消费者。
- SDK 不本地执行 Runbook，只管理、上传、触发、观察 Gateway 上的 Runbook。
- 大文件字节不穿 Gateway WebSocket；Gateway WS 只承载控制与进度事件。

## 包与运行时

```text
packages/sdk
  src/index.ts        # core typed API
  src/node.ts         # Node-only helpers
  src/runbook.ts      # Runbook authoring types
```

发布入口：

```text
@noesis/sdk
@noesis/sdk/node
@noesis/sdk/runbook
```

产物：

```text
dist/index.mjs
dist/index.cjs
dist/index.d.ts
```

运行时策略：

- 第一版最低支持 Node.js 20+。
- Core 使用标准 `fetch` / WebSocket 风格接口，并支持注入自定义 transport。
- Node 子入口提供文件、checkpoint、环境变量快捷构造等 helper。
- 不内置 `.env` 加载；用户需要时自行 `import "dotenv/config"`。

```ts
const noesis = new NoesisClient({
  baseUrl,
  token,
  fetch: customFetch,
  WebSocket: CustomWebSocket,
});
```

Node 脚本快捷入口：

```ts
import { createClientFromEnv } from "@noesis/sdk/node";

const noesis = createClientFromEnv({ actor: "deploy-script" });
```

读取环境变量：

```text
NOESIS_BASE_URL
NOESIS_TOKEN
NOESIS_ACTOR
```

## 构造与 Gateway 信息

构造函数不联网：

```ts
const noesis = new NoesisClient({ baseUrl, token });
```

需要能力发现时使用异步入口：

```ts
const noesis = await NoesisClient.connect({ baseUrl, token });
noesis.capabilities.has("runbooks.run");
noesis.capabilities.has("sync.upload");
noesis.capabilities.has("pi.terminal.attach");
```

Gateway 相关 API：

```ts
await noesis.gateway.ping(); // GET /api/health
await noesis.gateway.info(); // GET /api/gateway/info
```

`/api/gateway/info` 返回 Gateway 版本、API 版本、功能 capability、限制参数。Capability 只表示功能可用性，不表示 token 权限；第一版 API Token 不做 scope 或机器范围限制。

## 认证与审计来源

SDK core 只接收显式配置，不默认读取 CLI 登录状态：

```ts
const noesis = new NoesisClient({
  baseUrl: "https://gateway.example.com",
  token: process.env.NOESIS_TOKEN,
  source: "sdk",
  actor: "my-project-deploy",
});
```

也支持动态取 token：

```ts
const noesis = new NoesisClient({
  baseUrl,
  getToken: async () => tokenStore.current(),
});
```

Auth 能力作为普通 API 暴露，不自动保存 token：

```ts
await noesis.auth.login({ password });
await noesis.auth.createApiToken({ name, expiresAt });
await noesis.auth.deleteApiToken(id);
```

第一版 API Token 只做可命名、可撤销、可过期访问凭证；不做 `scopes`、`machineIds`、`tags` 限制。安全先由 Machine Policy、审批、审计承担。

SDK 自动注入审计来源头：

```text
X-Noesis-Source: cli | sdk | desktop | web | skill | ai-agent
X-Noesis-Actor: deploy-script | noesis-cli | vcp:<agentName> | ...
```

## 类型与协议单一事实源

`packages/shared` 是协议类型和 schema 的单一事实源：

```text
packages/shared   # Task/File/Pi/Runbook/Transfer/Sync 类型 + schema
packages/sdk      # HTTP/WS client，依赖 shared
packages/cli      # CLI，依赖 sdk
```

SDK typed API 入参与 Gateway API 字段名保持一致；便捷别名只允许出现在 helper 层。

## 顶层资源分组

SDK 顶层按资源域分组：

```ts
noesis.gateway.*
noesis.auth.*
noesis.machines.*
noesis.tasks.*
noesis.commands.*
noesis.files.*
noesis.pi.*
noesis.piTerminal.*
noesis.frp.*
noesis.releases.*
noesis.install.*
noesis.transfers.*
noesis.sync.*
noesis.storage.*      # StorageProvider 状态/配置；第一版含 AliyunDrive v1 helper
noesis.runbooks.*
noesis.approvals.*
noesis.todos.*
noesis.tags.*
noesis.contexts.*
noesis.audit.*
noesis.request(...)
noesis.ws.connect(...)
```

`request/ws` 是低级 escape hatch，供 Gateway 新 API 暂未封装时使用；稳定业务优先使用 typed API。

## 错误模型

所有非 2xx、`ok:false`、网络错误、超时、协议解析失败都转为 `NoesisError`：

```ts
try {
  await noesis.commands.run(input);
} catch (error) {
  if (error instanceof NoesisError) {
    console.log(error.code, error.status, error.requestId);
  }
}
```

最少字段：

```ts
code: string;
message: string;
status?: number;
requestId?: string;
details?: unknown;
cause?: unknown;
retryable: boolean;
```

SDK 在 debug/error 序列化中默认脱敏：`Authorization`、`token`、`apiKey`、`providerKey`、`password`、`clientSecret`、`attachToken`。

## 幂等与重试

所有会创建副作用的 SDK 方法支持 `idempotencyKey`：

```ts
await noesis.commands.run(input, { idempotencyKey: "deploy-v1-build" });
await noesis.runbooks.run("deploy", params, { idempotencyKey: "deploy-v1" });
await noesis.node.syncUpload({ ..., idempotencyKey: "deploy-v1-dist" });
```

Gateway 契约：

```text
Header: Idempotency-Key
作用域: token + method + path + key
同 key 同 payload: 返回首次创建的 task/run/transfer/sync
同 key 不同 payload: 409 IDEMPOTENCY_CONFLICT
TTL: 默认 24h，可配置
```

重试策略：

- `GET/list/status/watch` 可自动重试。
- `POST create/run/write/delete` 默认不自动重试。
- 提供 `createIdempotencyKey()` 辅助，但业务幂等 key 应由调用方显式传入。

## 事件流与等待

主 API 使用 `AsyncIterable`，裸 WebSocket 只作为低级接口：

```ts
for await (const event of noesis.tasks.watch(task.id)) {
  console.log(event.type, event.payload);
}
```

`watch()` 默认行为：

```text
transport: "auto"       # ws -> polling fallback
replay: true             # 先补历史事件，再进入 live
cursor: event.id         # 断线用 sinceEventId 恢复
```

可选：

```ts
noesis.tasks.watch(task.id, { transport: "ws" });
noesis.tasks.watch(task.id, { transport: "polling" });
noesis.tasks.watch(task.id, { from: "now" });
```

事件游标统一用 `event.id / sinceEventId`，不靠时间戳。游标过旧返回 `EVENT_CURSOR_EXPIRED`。

`wait()` 复用 `watch({ transport: "auto" })`，不可用时降级轮询对象状态。默认无总超时，只受 `AbortSignal` 控制，可显式传 `timeoutMs`。

```ts
const task = await noesis.tasks.wait(taskId);
const run = await noesis.runbooks.waitRun(runId);
const sync = await noesis.sync.wait(syncId);
```

终态失败默认抛 `NoesisError`，错误详情带最终对象；可用 `throwOnFailure:false` 改成返回终态对象。

审批等待语义：

```ts
await noesis.runbooks.waitRun(run.id, {
  onApproval: (approval) => console.log(approval.message),
  approvalBehavior: "wait", // wait | return | throw
});
```

默认 `wait`：遇到待审批继续等待；桌面端/CLI 可用回调展示确认入口。

## 取消语义

本地取消和远端取消分开：

```ts
await noesis.tasks.wait(task.id, { signal }); // 只取消本地等待
await noesis.tasks.cancel(task.id);           // 取消远端执行
await noesis.transfers.cancel(transfer.id);
await noesis.runbooks.cancel(run.id);
await noesis.sync.cancel(sync.id);
```

## Todo / Tag / Context 支持

SDK 首版暴露 Todo / Tag / Context typed API，供 Web、CLI、VCP 插件和其他 Agent 集成使用。VCP 插件直接 import SDK，不依赖 CLI，并用 `source=ai-agent`、`actor=vcp:<agentName>` 标记审计来源。

```ts
await noesis.todos.list({ status: 'todo', ready: true, leafOnly: true, assignee: 'unassigned', include: ['context', 'tags'] });
await noesis.todos.claim(id, { assignee: 'vcp' });
await noesis.todos.report(id, { status: 'done', resultSummary, executedTaskIds });
await noesis.todos.confirm(id);
await noesis.contexts.create({ name, machineIds, markdown });
await noesis.tags.create({ name });
```

Gateway 不返回预组装 agent prompt，只返回 Todo / Context / Tag 原始结构；VCP 插件按自身 agent 规范组装提示词。详见 `20-todo-vcp-collaboration.md`。

## Runbook 支持

SDK 不本地执行 Runbook。Gateway 负责 TS DSL 沙箱、durable execution、`approve()` 挂起/恢复、审计和版本记录。SDK 负责管理、上传、触发、观察、审批。

```ts
await noesis.runbooks.list();
await noesis.runbooks.get(id);
await noesis.runbooks.create({ name, code, paramsSchema });
await noesis.runbooks.update(id, { code, paramsSchema });
await noesis.runbooks.delete(id);
await noesis.runbooks.run(id, params);
await noesis.runbooks.run(id, params, { versionId });
await noesis.runbooks.watchRun(runId);
await noesis.runbooks.waitRun(runId);
```

Runbook 是定义层；`RunbookRun` 是执行实例层；子步骤生成多个 Task / Transfer / Approval：

```text
Runbook
  └─ RunbookVersion
       └─ RunbookRun
            ├─ Task(command.run)
            ├─ TransferJob(...)
            ├─ Approval(...)
            └─ Task(pi.run)
```

版本策略：

```text
create/update -> 生成 RunbookVersion -> latestVersionId 指向它
run(id) -> 默认运行 latestVersionId
run(id, { versionId }) -> 运行指定历史版本
RunbookRun 固定记录 runbookVersionId
```

第一版不做草稿/发布工作流，不做一次性 `runCode()`。动态发布流程是先 `upsert`，再 `run`。

参数 schema 使用 JSON Schema 子集，便于 Web UI 渲染表单、CLI/SDK 校验、Gateway 存储：

```json
{
  "type": "object",
  "required": ["machineId", "projectPath"],
  "properties": {
    "machineId": { "type": "string", "title": "目标机器" },
    "projectPath": { "type": "string", "title": "项目目录" }
  }
}
```

Runbook authoring 类型入口：

```ts
import { defineRunbook } from "@noesis/sdk/runbook";

export default defineRunbook({ name: "deploy" }, async (ctx, { on, approve }) => {
  await on(ctx.machineId).cmd("npm run build");
  await approve("确认发布？");
});
```

`@noesis/sdk/runbook` 只导出类型和 `defineRunbook()` 壳，不执行脚本。

Node helper 第一版只支持单文件上传：

```ts
await noesis.node.uploadRunbookFile("./runbooks/deploy.ts");
```

不做 TS bundler 或依赖树打包；需要复用片段时由上层项目构建成单文件。

## Approval 支持

Approval 是一等实体，Task / RunbookRun 只保留审批状态摘要。

```ts
await noesis.approvals.list({ status: "waiting" });
await noesis.approvals.approve(id);
await noesis.approvals.reject(id, { reason });
```

Approval 覆盖 `runbook_gate`、`command_option`、`policy_gate` 等来源。

## Pi Terminal 支持

SDK 支持交互式 `pi.terminal` attach，但只到协议层，不做终端 UI：

```ts
const session = await noesis.piTerminal.open({ machineId, projectPath });
const terminal = noesis.piTerminal.attach(session.id, session.attachToken);

terminal.send({ type: "input", data: "帮我检查项目\n" });

for await (const event of terminal.events) {
  // output / tool_approval_request / status / closed
}
```

xterm.js、快捷键、布局、渲染由 Web UI / 桌面端负责。

## Transfer 与大文件

SDK 分两层：

```text
协议层: noesis.transfers.*      # 创建、状态、事件、URL 续期、取消
Node helper: noesis.node.*      # 本地文件上传/下载、checkpoint、断点续传
```

默认传输模式是 `auto`：

```text
auto         Gateway 优先默认 StorageProvider，未授权时降级 direct/frps_chunked
provider     强制默认 StorageProvider，不可用就报错
aliyundrive  兼容别名，强制 AliyunDrive v1，不可用就报错
direct       强制 FRP 分块直传，不可用就报错
```

SDK 不让大文件字节穿 Gateway WebSocket；文件数据面走 StorageProvider 直传或 FRP chunked direct，Gateway WS 只承载状态和进度。

### 断点续传

第一版支持分片级 checkpoint。

上传：

```text
本地保存 transferId、file fingerprint、partSize、completedParts
恢复时校验 fingerprint，相同则跳过已完成 part
uploadUrl 过期时调 refresh-upload-url
```

下载：

```text
使用 .part 临时文件 + 已写 bytes/range 继续下载
完成后校验 size/sha256，再 rename
```

默认 checkpoint 目录：

```text
.noesis-transfer/
  checkpoints/
  tmp/
```

可覆盖：

```ts
await noesis.node.uploadFile({ ..., checkpointDir: ".noesis-transfer" });
```

Checkpoint 最少字段：

```ts
{
  sdkVersion,
  baseUrl,
  machineId,
  direction,
  localPath,
  remotePath,
  size,
  mtimeMs,
  sha256?,
  transferId,
  partSize,
  completedParts,
  updatedAt,
}
```

恢复时校验 baseUrl / machineId / path / direction / file fingerprint / transfer 状态 / partSize。不匹配就丢弃 checkpoint，重新开始。

## Sync 目录同步

目录同步是一等 `SyncJob`，下面挂多个 `TransferJob`：

```text
SyncJob(sync_upload ./dist -> /opt/app/dist)
  ├─ TransferJob(file A)
  ├─ TransferJob(file B)
  └─ TransferJob(file C)
```

API：

```ts
await noesis.node.syncUpload({
  machineId,
  localDir: "./dist",
  remoteDir: "/opt/app/dist",
  mode: "missing-or-changed",
  deleteExtra: false,
  idempotencyKey: "deploy-v1-dist",
});

await noesis.node.syncDownload({
  machineId,
  remoteDir: "/opt/app/logs",
  localDir: "./logs",
  mode: "missing-or-changed",
});
```

边界：

- 支持文件级续传 + 目录级缺失/变更同步。
- 不做 rsync 块级 diff。
- 本地多余文件 / 远端多余文件默认不删除。
- 默认比较 `size + mtime`；可选 `compare:"sha256"`。
- 默认冲突策略 `skip`；可选 `overwrite` / `fail`。
- 默认并发：`fileConcurrency:3`、`partConcurrency:4`。
- 默认保留内容、相对路径、mtime、Unix 可执行位；不完整保留 owner/group/ACL/xattr。
- 远端路径不自动转换；`remotePath` 原样传给 Gateway/Client。

分工：

```text
Gateway:
  创建 SyncJob
  生成/保存远端 manifest
  记录文件级计划、进度、冲突、失败
  暴露 sync watch/cancel/resume API

SDK Node helper:
  生成本地 manifest
  上传/下载实际文件分片
  写 checkpoint
  上报每个文件进度
```

恢复入口：

```ts
await noesis.node.syncUpload({ ..., idempotencyKey: "deploy-v1-dist" }); // 推荐
await noesis.node.resumeSync(syncId);                                    // 桌面端按钮
```

## 机器选择与并发 helper

提供轻量机器查找 helper，不做调度决策：

```ts
const machine = await noesis.machines.findOne({ tag: "prod", online: true });
const machines = await noesis.machines.findMany({ tags: ["db"], online: true });
```

提供最薄并发 helper：

```ts
await noesis.helpers.mapMachines(machineIds, { concurrency: 3 }, async (machineId) => {
  return noesis.commands.run({ machineId, command: "git status" });
});
```

复杂跨机器流程交给 Runbook，不在 SDK 里做第二套 workflow engine。

## Debug 与测试

SDK 不内置 logger 依赖，只提供可选回调：

```ts
const noesis = new NoesisClient({
  baseUrl,
  token,
  onDebug: (event) => console.debug(event),
});
```

导出接口类型供业务项目测试替换：

```ts
import type { Noesis } from "@noesis/sdk";

function makeDeployScript(noesis: Noesis) { ... }
```

第一版最多提供轻量 `createFakeNoesis()`，不做完整 mock server。

## README 第一入口

SDK README 第一屏给 Node 脚本快速开始：

```ts
import { createClientFromEnv } from "@noesis/sdk/node";

const noesis = createClientFromEnv({ actor: "deploy-script" });
const task = await noesis.commands.run({
  machineId: "linux-prod-01",
  command: "cd /opt/app && git pull && npm ci && npm run build",
});
await noesis.tasks.wait(task.id);
```

部署/多机 Pi 指挥是文档示例，不进入 SDK 业务 API。
