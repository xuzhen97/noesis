# 09. 状态机设计

## Task 状态机

```mermaid
stateDiagram-v2
  [*] --> Created
  Created --> Queued
  Queued --> WaitingClient
  WaitingClient --> Dispatched: Client 在线
  WaitingClient --> Failed: 等待超时
  Dispatched --> Running
  Running --> Succeeded
  Running --> Failed
  Running --> Canceling
  Running --> Timeout
  Canceling --> Canceled
  Succeeded --> [*]
  Failed --> [*]
  Canceled --> [*]
  Timeout --> [*]
```

终态四个：`succeeded` / `failed` / `canceled` / `timeout`；图中 PascalCase 仅为 Mermaid 标签，DB/API 使用小写枚举。Timeout 不再转 failed，是独立终态。

### 审批子状态（独立字段，不进入 status）

高风险操作（命中 `requireApprovalFor` / Runbook `approve()` / `cmd({approve:true})`）**不改变 Task 的 `status`**（保持 `running`），而是置 `tasks.approval_status = waiting_confirm`，并创建一条 `Approval(status=waiting)`。用户在 Web/CLI/SDK 决策后：确认通过→Approval=approved，Task `approval_status=approved`，执行继续；拒绝→Approval=rejected，Task `approval_status=rejected`；确认超时→Approval=timeout，Task `approval_status=timeout`，后两者转 `status=failed`。确认流程图见 10。

`approval_status` 取值：`not_required` / `waiting_confirm` / `approved` / `rejected` / `timeout`（见 08 tasks 表）。对个人系统语义为“等待使用者确认”，UI 文案统一用“待确认”（见 11/17）。

## RunbookRun 状态机

```mermaid
stateDiagram-v2
  [*] --> Created
  Created --> Running
  Running --> WaitingApproval: approve()/危险能力
  WaitingApproval --> Running: approved + durable replay
  WaitingApproval --> Failed: rejected/approval timeout
  Running --> Succeeded
  Running --> Failed
  Running --> Canceling
  Running --> Timeout
  Canceling --> Canceled
  Succeeded --> [*]
  Failed --> [*]
  Canceled --> [*]
  Timeout --> [*]
```

RunbookRun 是跨机器编排实例，不等同于单个 Task。能力调用会生成子 Task / TransferJob / Approval；RunbookRun 通过 trace 聚合这些子步骤。

## Approval 状态机

```mermaid
stateDiagram-v2
  [*] --> Waiting
  Waiting --> Approved: 用户确认
  Waiting --> Rejected: 用户拒绝
  Waiting --> Timeout: 超时
  Approved --> [*]
  Rejected --> [*]
  Timeout --> [*]
```

Approval 是一等实体，来源包括 `runbook_gate` / `command_option` / `policy_gate`。RunbookRun 等待审批时状态为 `waiting_approval`；Task 命中审批时 Task.status 仍保持 `running`，由 `approval_status` 跟踪子状态。

## Client 连接状态机

```mermaid
stateDiagram-v2
  [*] --> Starting
  Starting --> LoadingConfig
  LoadingConfig --> Connecting
  Connecting --> Registered: hello accepted
  Connecting --> RetryWaiting: connect failed
  RetryWaiting --> Connecting
  Registered --> Online
  Online --> Reconnecting: ws disconnected
  Reconnecting --> Online: reconnect success
  Reconnecting --> Offline: retry exceeded
  Offline --> Connecting
```

重连后必须 reconcile（见 10）：

```mermaid
stateDiagram-v2
  [*] --> Reconnected
  Reconnected --> Reconciling: client.reconcile
  Reconciling --> Online: 对账完成
  Reconciling --> Online: 本地任务丢失→标记 failed
  Reconciling --> Online: 本地任务存活→恢复事件流
```

## Client 自更新状态机

```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> CheckUpdate: client.update
  CheckUpdate --> Downloading: need update
  CheckUpdate --> Idle: already latest
  Downloading --> Verifying: download done
  Downloading --> Failed: download failed
  Verifying --> Staging: checksum ok
  Verifying --> Failed: checksum failed
  Staging --> StopOldService
  StopOldService --> SwitchVersion
  SwitchVersion --> StartNewService
  StartNewService --> HealthCheck
  HealthCheck --> Success: pass
  HealthCheck --> Rollback: fail
  Rollback --> StartOldService
  StartOldService --> Failed: rollback done
  Success --> ReportSuccess
  Failed --> ReportFailed
  ReportSuccess --> Idle
  ReportFailed --> Idle
```

## Server 自更新状态机

```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> Backup: server.update
  Backup --> Downloading
  Downloading --> Verifying
  Verifying --> MaintenanceMode
  MaintenanceMode --> StopOldServer
  StopOldServer --> SwitchVersion
  SwitchVersion --> StartNewServer
  StartNewServer --> Migration
  Migration --> HealthCheck
  HealthCheck --> Success: pass
  HealthCheck --> Rollback: fail
  Migration --> Rollback: migration failed
  Rollback --> StartOldServer
  Success --> [*]
  StartOldServer --> [*]
```

## Pi Task 状态机（pi.run，rpc 单向驱动）

```mermaid
stateDiagram-v2
  [*] --> Created
  Created --> Preparing
  Preparing --> CheckingPi
  CheckingPi --> InstallingPi: not installed and allowed
  CheckingPi --> Running: ready
  InstallingPi --> Configuring
  Configuring --> Running
  Running --> StreamingEvents
  StreamingEvents --> CollectingResult: agent_end
  StreamingEvents --> Aborting: abort / abort_bash / cancel
  StreamingEvents --> Failed: pi error
  StreamingEvents --> Timeout: wall-clock 或静默 watchdog
  Aborting --> CollectingResult: agent_end(aborted)
  Aborting --> Timeout: abort 无响应→SIGTERM→SIGKILL
  Timeout --> Failed
  CollectingResult --> Succeeded
  Succeeded --> [*]
  Failed --> [*]
```

与 05 一致：收到 `agent_end` 后主动关进程；卡住先 `abort` 优雅停，无响应再 SIGTERM→SIGKILL，结果带 `partial=true`。

## Pi Terminal Session 状态机（pi.terminal，见 05b）

```mermaid
stateDiagram-v2
  [*] --> Opened
  Opened --> Attaching
  Attaching --> Attached
  Attached --> Detached: Web 全断开
  Detached --> Attached: reattach
  Detached --> Closing: idle 超时 / 配额超限
  Attached --> Closing: 用户关闭
  Opened --> Closing: maxLifetime 到期
  Closing --> Closed
  Closed --> [*]
  Opened --> Error
  Attached --> Error
  Error --> Closed
```

## FRP Mapping 状态机

```mermaid
stateDiagram-v2
  [*] --> Requested
  Requested --> CreatingConfig
  CreatingConfig --> StartingFrpc
  StartingFrpc --> Active: tunnel ready
  StartingFrpc --> Failed
  Active --> Expiring: expire time reached
  Active --> Closing: user close
  Expiring --> Closed
  Closing --> Closed
  Failed --> [*]
  Closed --> [*]
```

## TransferJob 状态机

```mermaid
stateDiagram-v2
  [*] --> Created
  Created --> WaitingCliUpload
  WaitingCliUpload --> CliUploading
  CliUploading --> ProviderUploaded
  ProviderUploaded --> WaitingClientDownload
  WaitingClientDownload --> ClientDownloading
  ClientDownloading --> Completed
  CliUploading --> Failed
  ClientDownloading --> Failed
  WaitingCliUpload --> Cancelled
  WaitingClientDownload --> Cancelled
  Completed --> [*]
  Failed --> [*]
  Cancelled --> [*]
```

上传/下载 URL 过期不改变状态，调用 refresh-upload-url / refresh-download-url 后继续。SDK Node helper 用 checkpoint 做分片级断点续传。

## SyncJob 状态机

```mermaid
stateDiagram-v2
  [*] --> Created
  Created --> Planning: 生成本地/远端 manifest
  Planning --> Syncing: 创建文件级计划
  Syncing --> Paused: 进程中断/等待恢复
  Paused --> Syncing: resume / 同 idempotencyKey 重跑
  Syncing --> Completed
  Syncing --> Failed
  Syncing --> Cancelled: cancel
  Paused --> Cancelled: cancel
  Completed --> [*]
  Failed --> [*]
  Cancelled --> [*]
```

SyncJob 是目录级同步实例，下面挂多个 TransferJob。默认不删除多余文件，不做块级 diff；冲突默认 skip。

## Todo 状态机（见 20）

### 叶子 Todo

```mermaid
stateDiagram-v2
  [*] --> Todo
  Todo --> Doing: claim / user start
  Doing --> Done: user done / VCP child report done
  Doing --> AwaitingConfirmation: VCP top-level leaf report done
  Doing --> Failed: report failed
  Todo --> Failed: user mark failed
  Failed --> Todo: reopen
  Done --> Todo: reopen
  AwaitingConfirmation --> Done: user confirm
  AwaitingConfirmation --> Todo: user reopen
  Done --> [*]
```

规则：

- `ready` 只在 `status=todo` 的叶子 Todo 上有效；`doing` 时冻结。
- VCP report done 到顶层 leaf：进入 `awaiting_confirmation`。
- VCP report done 到子任务 leaf：子任务直接 `done`，父 Todo 负责最终确认。
- 用户自己完成 leaf 可直接 `done`。

### 父 Todo

```mermaid
stateDiagram-v2
  [*] --> Todo
  Todo --> Doing: 任一子任务 doing
  Todo --> Failed: 任一子任务 failed
  Doing --> Failed: 任一子任务 failed
  Doing --> AwaitingConfirmation: 所有子任务 done
  Failed --> Todo: failed 子任务 reopen
  AwaitingConfirmation --> Done: user confirm
  Done --> Todo: reopen / 子任务重开
```

父 Todo 状态由服务端在子任务变更事务中维护；父 Todo 不可 claim，且存在 failed 子任务时不可 confirm。
