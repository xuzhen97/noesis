# 07. API 设计

## 统一响应

```json
{ "ok": true, "data": {}, "requestId": "req_001" }
```

错误：

```json
{ "ok": false, "error": { "code": "MACHINE_NOT_FOUND", "message": "机器不存在" }, "requestId": "req_001" }
```

## Gateway

```text
GET /api/health        # 健康检查，供 CLI/SDK/桌面端连通性测试
GET /api/gateway/info  # Gateway 版本、API 版本、功能 capability、限制参数
```

`GET /api/gateway/info` 示例：

```json
{
  "version": "1.0.0",
  "apiVersion": "2026-06-23",
  "capabilities": ["runbooks.run", "sync.upload", "pi.terminal.attach", "browser.run", "computer.run", "automation.macros", "webrtc.remote"],
  "limits": { "maxUploadPartSize": 536870912, "maxFileConcurrency": 3 }
}
```

Capability 只表示功能是否支持，不表示 token 权限。

## 幂等

会创建副作用的 API 支持 `Idempotency-Key` header。

```text
作用域：token + method + path + key
同 key 同 payload：返回第一次创建的 task/run/transfer/sync
同 key 不同 payload：409 IDEMPOTENCY_CONFLICT
TTL：默认 24h，可配置
```

用于 `POST /api/tasks`、`POST /api/commands/run`、`POST /api/pi/run`、`POST /api/transfers/uploads`、`POST /api/sync/*`、`POST /api/runbooks/:id/run` 等创建型请求。

## Auth

个人单用户系统：`/api/auth/login` 用于 owner 登录拿 owner token（Gateway 暴露公网时防裸奔，非多账号体系）；`api-tokens` 是给长期 CLI/SDK/skill/外部 agent 用的可撤销访问凭证。第一版 API Token 只做命名、过期、撤销，不做 scope 或机器范围限制。Pi Agent 不拿长期 token，只拿 Client 启动 Pi 时申请的短期 Gateway Agent Token。

```text
POST /api/auth/login              # owner 登录，返回 owner token
GET  /api/auth/api-tokens         # 列出 API Token（不返回明文 token）
POST /api/auth/api-tokens         # 创建长期 API Token（cli/sdk/skill/外部 agent 用）
DELETE /api/auth/api-tokens/:id
POST /api/auth/agent-tokens       # Client 为 Pi Agent 申请短期 Gateway Agent Token（TTL + 来源审计）
```

## Machines

```text
GET  /api/machines
GET  /api/machines/:id
POST /api/machines/:id/rename
POST /api/machines/:id/tags
GET  /api/machines/:id/capabilities
GET  /api/machines/:id/disks      # 磁盘清单（全盘可见，见 03 DiskInfo）
GET  /api/machines/:id/policy     # 读取 Machine Policy（单一事实源，见 13）
PUT  /api/machines/:id/policy     # 更新 Machine Policy，写审计，触发 machine.policy.sync 下发
```

`GET /api/machines/:id/disks` 返回 DiskInfo[]。在线机器返回 Client 心跳上报的全部盘/分区；离线机器返回空数组。

## Tasks

```text
POST /api/tasks
GET  /api/tasks/:id
GET  /api/tasks/:id/events
POST /api/tasks/:id/cancel

# automation report shortcuts
GET  /api/tasks/:id/automation-report
POST /api/tasks/:id/automation-report/save-bundle
```

创建任务：

```json
{
  "machineId": "win-dev-01",
  "taskType": "command.run",
  "payload": {
    "shell": "powershell",
    "command": "node -v",
    "cwd": "D:/Projects/app"
  }
}
```

## Files

```text
POST /api/files/list
POST /api/files/read
POST /api/files/write
POST /api/files/delete
POST /api/files/move
POST /api/files/import-from-cloud
POST /api/files/export-to-cloud
```

**磁盘空间校验（写/导入类操作）：** Gateway 在下发 `file.write` / `file.import_from_cloud` 前，根据 payload 中的 `targetPath` 定位所在盘（查 `machine.disks`），校验该盘 `freeBytes` ≥ 待写入大小 + 安全余量（如 5%）。不足则返回 `DISK_FULL` 错误，不发起任务。

## Commands

```text
POST /api/commands/run
```

```json
{
  "machineId": "win-dev-01",
  "shell": "powershell",
  "command": "npm install",
  "cwd": "D:/Projects/app",
  "timeoutSeconds": 1800
}
```

## Pi

```text
POST /api/pi/check
POST /api/pi/install
POST /api/pi/configure
POST /api/pi/run
GET  /api/pi/sessions/:id

POST   /api/pi/terminal             # 打开交互会话，返回 sessionId + attachToken
GET    /api/pi/terminal             # 列出会话
GET    /api/pi/terminal/:id         # 会话状态
POST   /api/pi/terminal/:id/close   # 主动关闭
POST   /api/pi/terminal/:id/export  # 导出 session HTML/JSONL

GET    /api/pi/profiles                 # 列出 Provider Profile（支持 ?scope=global|machine&machineId=）
GET    /api/pi/profiles/:id             # 获取单个 Profile（不返回明文 Key）
POST   /api/pi/profiles                 # 创建 Profile（含 URL/Key/API类型/模型清单）
PUT    /api/pi/profiles/:id             # 更新 Profile
DELETE /api/pi/profiles/:id             # 删除 Profile
```

**Provider Profile API 说明：** 取代旧 Provider Key API。Profile 包含完整 Provider 配置（baseUrl/apiType/apiKey/models/headers/compat），支持全局和机器级两层。响应不返回明文 Key（只返回 apiKeyPreview / hasApiKey）。旧 API 路径 `/api/pi/provider-keys` 重定向到 `/api/pi/profiles`。

**创建/更新 Profile 请求体示例：**

```json
{
  "name": "公司代理",
  "scope": "global",
  "machineId": null,
  "providerKey": "my-custom",
  "baseUrl": "https://proxy.corp.com/v1",
  "apiType": "openai-completions",
  "apiKeySource": "encrypted",
  "apiKey": "sk-xxx",
  "headers": {},
  "compat": {},
  "models": [
    { "id": "claude-sonnet-4", "name": "Sonnet 4", "reasoning": true, "contextWindow": 200000 }
  ],
  "isDefault": true
}
```

## Browser Use / Computer Use / Automation（见 19）

Browser Use 负责浏览器 DOM/CDP 自动化；Computer Use 负责完整桌面控制；Automation 管宏、候选、报告和 Runbook 导出。

```text
POST /api/browser/run
POST /api/browser/macro/run
POST /api/browser/doctor
POST /api/browser/repair

POST /api/computer/install
POST /api/computer/enable
POST /api/computer/disable
POST /api/computer/doctor
POST /api/computer/repair
POST /api/computer/run
POST /api/computer/macro/run
POST /api/computer/report/:taskId/save-bundle

GET  /api/automation/macros
GET  /api/automation/macros/:id
GET  /api/automation/macros/:id/versions
GET  /api/automation/macro-candidates
POST /api/automation/macro-candidates/:id/approve
POST /api/automation/macros/:id/export-runbook
GET  /api/automation/reports/:taskId
GET  /api/automation/reports/:taskId/replay
POST /api/automation/reports/:taskId/save-bundle
```

`browser.run` 示例：

```json
{
  "machineId": "win-dev-01",
  "instruction": "导出今天日报",
  "mode": "macroFirst",
  "profileMode": "existingProfileManaged",
  "maxSteps": 80,
  "timeoutSeconds": 1800
}
```

`computer.run` 示例：

```json
{
  "machineId": "win-dev-01",
  "instruction": "打开桌面软件导出今天日报",
  "mode": "macroFirst",
  "sessionMode": "dedicatedDesktop",
  "providerProfileId": "profile_vision_001",
  "maxSteps": 80,
  "timeoutSeconds": 1800
}
```

Macro 采纳后成为版本化 AutomationMacro；报告由 Gateway 从 TaskEvent / Approval / StorageObject 聚合生成。文件产物默认只记录本地 path/sha256，明确要求时才上传到 StorageProvider。

## WebRTC Remote Session（见 19）

```text
POST /api/webrtc/remote-sessions           # 创建旁观/接管 session，返回 sessionId + attachToken + iceServers
GET  /api/webrtc/remote-sessions/:id
POST /api/webrtc/remote-sessions/:id/close
WS   /ws/webrtc/remote-sessions/:id/signaling

GET  /api/settings/webrtc/turn-profiles
POST /api/settings/webrtc/turn-profiles
PUT  /api/settings/webrtc/turn-profiles/:id
DELETE /api/settings/webrtc/turn-profiles/:id
```

Gateway 只做 signaling，不中转媒体。默认 P2P-first + 公共 STUN；托管 TURN / 自建 TURN 需用户显式配置。

## FRP

```text
POST /api/frp/open
POST /api/frp/:id/close
GET  /api/frp/mappings
```

## Releases

```text
POST /api/releases
POST /api/releases/upload-artifact
POST /api/releases/:id/publish
POST /api/releases/:id/rollout
POST /api/releases/:id/rollback
GET  /api/releases
GET  /api/releases/:id
```

## Install

```text
POST /api/install/tokens
GET  /api/install/tokens
DELETE /api/install/tokens/:id
GET  /install/client.ps1?token=xxx&computerUse=0|install-only
GET  /install/client.sh?token=xxx&computerUse=0|install-only
GET  /api/install/config?token=xxx    # 含 initialPolicy，首装写入 Client 本地镜像并回传 Gateway 落库
POST /api/install/report
```

## Runbooks

Runbook 是定义层，RunbookRun 是执行实例层。Gateway 负责 TS DSL 运行时、版本、审批挂起/恢复；SDK/CLI 只管理、触发和观察。

```text
GET    /api/runbooks
GET    /api/runbooks/:id
POST   /api/runbooks
PUT    /api/runbooks/:id
DELETE /api/runbooks/:id
GET    /api/runbooks/:id/versions
GET    /api/runbook-versions/:id
POST   /api/runbooks/:id/run
GET    /api/runbook-runs/:id
GET    /api/runbook-runs/:id/events
POST   /api/runbook-runs/:id/cancel
```

创建 / 更新 Runbook 请求体使用 JSON Schema 子集描述参数：

```json
{
  "name": "deploy",
  "desc": "部署项目并用 Pi 检查健康状态",
  "code": "export default defineRunbook(...)",
  "paramsSchema": {
    "type": "object",
    "required": ["machineId", "projectPath"],
    "properties": {
      "machineId": { "type": "string", "title": "目标机器" },
      "projectPath": { "type": "string", "title": "项目目录" }
    }
  }
}
```

每次更新代码生成 `RunbookVersion`，`run(id)` 默认运行最新版本，也可指定 `versionId`：

```json
{ "params": { "machineId": "linux-prod-01" }, "versionId": "rbv_123" }
```

`RunbookRun.status`：`created` / `running` / `waiting_approval` / `succeeded` / `failed` / `canceling` / `canceled` / `timeout`。

## Todo / Tag / Context

Todo 是独立资源域；Tag 只做分类；Context 是给用户和 VCP 读取的执行信息包。Gateway 不主动调用 VCP，VCP 插件通过 SDK 轮询可领取 Todo。完整语义见 `20-todo-vcp-collaboration.md`。

```text
# Tags
GET    /api/tags
POST   /api/tags
GET    /api/tags/:id
PATCH  /api/tags/:id
DELETE /api/tags/:id
POST   /api/tags/:id/unarchive

# Contexts
GET    /api/contexts
POST   /api/contexts
GET    /api/contexts/:id
PATCH  /api/contexts/:id
DELETE /api/contexts/:id
POST   /api/contexts/:id/unarchive

# Todos
GET    /api/todos
POST   /api/todos
GET    /api/todos/:id
PATCH  /api/todos/:id
DELETE /api/todos/:id
POST   /api/todos/:id/unarchive
POST   /api/todos/:id/claim
POST   /api/todos/:id/report
POST   /api/todos/:id/confirm
POST   /api/todos/:id/status
```

Todo 查询支持：`status` / `ready` / `tagId` / `contextId` / `assignee` / `parentId` / `q` / `archived` / `leafOnly` / `include=tags,context,machines,tasks`。VCP 插件轮询示例：

```text
GET /api/todos?status=todo&ready=true&assignee=unassigned&leafOnly=true&archived=false&include=context,tags&pageSize=20
```

## Approvals

Approval 是一等实体，覆盖 Runbook 确认门、命令级确认和 policy gate。Task / RunbookRun 只保留审批状态摘要。

```text
GET  /api/approvals
GET  /api/approvals/:id
POST /api/approvals/:id/approve
POST /api/approvals/:id/reject
```

`Approval.status`：`waiting` / `approved` / `rejected` / `timeout`。

## Audit

```text
GET /api/audit
GET /api/audit/:id
```

客户端可通过请求头标注审计来源：

```text
X-Noesis-Source: web | cli | sdk | desktop | skill | ai-agent
X-Noesis-Actor: noesis-cli | deploy-script | ...
```

## Transfers

```text
POST /api/transfers/uploads                           # 创建上传任务
GET  /api/transfers                                    # 列出传输任务
GET  /api/transfers/:id                                # 查询单个任务
GET  /api/transfers/:id/events                         # 任务事件流
POST /api/transfers/:id/cli-progress                   # CLI 上报上传进度
POST /api/transfers/:id/cli-upload-complete            # CLI 上传完成
POST /api/transfers/:id/web-upload-complete            # 浏览器上传完成
POST /api/transfers/:id/client-progress                # Client 上报下载进度
POST /api/transfers/:id/client-complete                # Client 下载完成
POST /api/transfers/:id/fail                           # 标记失败
POST /api/transfers/:id/cancel                         # 取消传输
POST /api/transfers/:id/refresh-upload-url             # 刷新上传 URL
POST /api/transfers/:id/refresh-download-url           # 刷新下载 URL
```

创建上传任务：

```json
{
  "machineId": "win-dev-01",
  "rootId": "root-0",
  "path": "D:/Projects",
  "filename": "bundle.tar",
  "size": 1288490188,
  "transfer": "auto"
}
```

`machineId` 是目标机器 ID。旧字段名 `clientId` 不再使用，避免与阿里云盘 OAuth `clientId` 混淆。

`transfer` 模式：`auto`（优先默认 StorageProvider，未授权降级 FRP 直传）/ `provider`（强制走默认 StorageProvider，未授权报错）/ `aliyundrive`（兼容别名，强制 AliyunDrive v1）/ `direct`（强制 FRP 分块直传）。

状态机见 13。

## Sync

目录同步是一等 `SyncJob`，下面挂多个 `TransferJob`。Gateway 记录同步计划、远端 manifest、冲突、进度；SDK Node helper 负责本地文件 IO、checkpoint 和分片上传/下载。

```text
POST /api/sync/upload                    # 创建 / 恢复上传同步任务
POST /api/sync/download                  # 创建 / 恢复下载同步任务
POST /api/sync/download-manifest         # 生成远端目录 manifest
GET  /api/sync/:id                       # 查询同步任务
GET  /api/sync/:id/events                # 同步事件流
POST /api/sync/:id/progress              # SDK 上报文件级进度
POST /api/sync/:id/resume                # 显式恢复同步任务
POST /api/sync/:id/cancel                # 取消同步任务
```

同步请求示例：

```json
{
  "machineId": "linux-prod-01",
  "localDir": "./dist",
  "remoteDir": "/opt/app/dist",
  "mode": "missing-or-changed",
  "compare": "size-mtime",
  "deleteExtra": false,
  "conflict": "skip"
}
```

默认不删除目标多余文件，不做 rsync 块级 diff。比较默认 `size-mtime`，可选 `sha256`。

## StorageProvider / AliyunDrive v1

```text
GET  /api/aliyundrive/status           # 认证状态（configured/authorized/expiresAt/accountName 等）
PUT  /api/aliyundrive/config           # 保存配置（clientId/clientSecret/scope/transferFolder/cleanupTtlMs）
POST /api/aliyundrive/oauth/start      # 发起 OAuth，返回 authorizationUrl + state
POST /api/aliyundrive/oauth/complete   # 完成 OAuth { state, code }
POST /api/aliyundrive/oauth/revoke     # 撤销授权
POST /api/aliyundrive/test             # 测试授权有效性
```

Server 管理云盘 OAuth 凭证和 token 生命周期，Client/浏览器仅通过 Server 下发的临时 accessToken + uploadUrl/downloadUrl 进行直传。详见 13。

## WebSocket

Client：

```text
/ws/client?machineId=xxx&token=xxx
```

Web UI / SDK 事件流：

```text
/ws/tasks/:taskId/events
/ws/transfers/:id/events
/ws/sync/:id/events
/ws/runbook-runs/:id/events
```

事件流支持 `sinceEventId` 游标。SDK 默认先回放历史事件再进入实时监听；WebSocket 不可用时可降级 HTTP 轮询对应 `/events` API。

Web UI Pi 交互终端 attach（双向，见 05b）：

```text
/ws/pi/terminal/:id?token=xxx
```

**传输相关推送**：

- Server → Client：`{ type: "transfer.download.start", payload: { transferId, machineId } }` — 通知 Client 开始从 StorageProvider 下载
- Client → Server：`{ type: "client.transfer.progress", payload: { transferId, machineId, phase, downloadedBytes, writtenBytes, totalBytes } }` — 上报下载进度
- Client → Server：`{ type: "client.transfer.complete", payload: { transferId, machineId, rootId, path, size } }` — 下载完成
- Client → Server：`{ type: "client.transfer.failed", payload: { transferId, machineId, errorCode, errorMessage } }` — 下载失败

WS 不可达时不使用 Client 直连 HTTP 回退（Client 默认不暴露控制 HTTP 端口）。Server 将传输保持在 `waiting_client_download`，Client 重连后通过 `client.reconcile` / transfer 队列补偿拉取并继续下载。
