# 10. 核心流程 Mermaid

## SDK 初始化与能力发现

```mermaid
sequenceDiagram
  participant App as Node脚本/CLI/桌面端
  participant SDK
  participant Gateway
  participant DB

  App->>SDK: new NoesisClient({baseUrl, token})
  Note over SDK: 构造不联网
  App->>SDK: NoesisClient.connect(...)
  SDK->>Gateway: GET /api/health
  Gateway-->>SDK: ok
  SDK->>Gateway: GET /api/gateway/info
  Gateway-->>SDK: version/apiVersion/capabilities/limits
  SDK-->>App: client + capabilities
  App->>SDK: typed API / watch / wait
```

## SDK 事件流 watch / wait

```mermaid
sequenceDiagram
  participant App as CLI/Node脚本/桌面端
  participant SDK
  participant Gateway
  participant DB
  participant WS as WebSocket

  App->>SDK: tasks.watch(taskId)
  SDK->>Gateway: GET /api/tasks/:id/events?sinceEventId=
  Gateway->>DB: 读取历史事件
  Gateway-->>SDK: replay events
  SDK->>WS: connect /ws/tasks/:id/events?sinceEventId=last
  alt WS 可用
    WS-->>SDK: live events
  else WS 不可用
    SDK->>Gateway: 轮询 /api/tasks/:id/events?sinceEventId=last
    Gateway-->>SDK: new events
  end
  SDK-->>App: AsyncIterable<Event>
```

## 命令执行

```mermaid
sequenceDiagram
  participant User as 用户/SDK/AI Agent
  participant Gateway
  participant Task as Task Orchestrator
  participant Client
  participant Cmd as Command Executor
  participant Audit

  User->>Gateway: 创建 command.run
  Gateway->>Gateway: 鉴权/策略/幂等校验
  Gateway->>Task: 创建任务
  Task->>Client: WS 下发 task.dispatch
  Client->>Cmd: 执行命令
  Cmd-->>Client: stdout/stderr
  Client-->>Gateway: task.event
  Cmd-->>Client: exitCode
  Client-->>Gateway: task.result
  Gateway->>Audit: 写审计(source/actor/requestId)
  Gateway-->>User: 展示结果/事件流
```

## Runbook 执行与审批恢复

```mermaid
sequenceDiagram
  participant User as Web/CLI/SDK
  participant Gateway
  participant RB as Runbook Runtime
  participant DB
  participant Task as Task Orchestrator
  participant Approval
  participant Client

  User->>Gateway: POST /api/runbooks/:id/run(params, versionId?)
  Gateway->>Gateway: 鉴权/幂等校验
  Gateway->>DB: 创建 RunbookRun(runbookVersionId)
  Gateway->>RB: 启动 TS DSL durable execution
  RB->>Task: 能力调用 on(m).cmd/pi/file -> 创建子 Task
  Task->>Client: task.dispatch
  Client-->>Task: task.event/result
  Task-->>RB: 子步骤完成
  RB->>Approval: approve()/危险能力 -> 创建 Approval(waiting)
  RB->>DB: 保存 snapshot/trace，RunbookRun=waiting_approval
  User->>Gateway: POST /api/approvals/:id/approve
  Gateway->>Approval: 标记 approved
  Gateway->>RB: 从 snapshot 重放恢复
  RB->>Task: 继续后续能力调用
  RB->>DB: RunbookRun=succeeded/failed
  Gateway-->>User: runbook events / final run
```

## VCP 领取 Todo 并回写结果

```mermaid
sequenceDiagram
  participant User as 用户 Web
  participant VCP as VCP 插件
  participant SDK
  participant Gateway
  participant Todo as Todo Service
  participant Task as Task/Runbook/File/Pi 能力
  participant Audit
  participant DB

  User->>Gateway: 创建 Context/Tag/Todo，手动 ready=true
  Gateway->>Todo: 校验 context 未归档、leaf、ready
  Gateway->>DB: 保存 Todo/Context/Tag
  loop 轮询
    VCP->>SDK: noesis.todos.list({status:todo, ready:true, leafOnly:true, assignee:unassigned})
    SDK->>Gateway: GET /api/todos?...include=context,tags
    Gateway-->>SDK: 候选 Todo[]
  end
  VCP->>VCP: tag/context routingRules 选择 agent
  VCP->>SDK: claim(todoId) with actor=vcp:<agentName>
  SDK->>Gateway: POST /api/todos/:id/claim
  Gateway->>Todo: 原子校验并设置 doing + assignee
  Todo->>Audit: claim 审计
  VCP->>SDK: 调用 commands/files/pi/runbook 等 Gateway 能力
  SDK->>Task: 创建并等待 Task/Runbook
  Task-->>SDK: taskIds / result
  VCP->>SDK: report(done|failed, resultSummary, executedTaskIds)
  SDK->>Gateway: POST /api/todos/:id/report
  Gateway->>Todo: 写 resultSummary + todo_task_links + 状态迁移
  Todo->>Audit: report 审计
  alt 顶层 leaf done 或父 Todo 全子任务 done
    Gateway-->>User: Todo awaiting_confirmation
    User->>Gateway: POST /api/todos/:id/confirm
    Gateway->>Todo: done
  else failed
    Gateway-->>User: failed + resultSummary
  end
```

## 大文件导入：StorageProvider 到目标机器

```mermaid
sequenceDiagram
  participant User
  participant Cloud as StorageProvider（默认阿里云盘）
  participant Gateway
  participant Transfer
  participant Client
  participant FS

  User->>Gateway: POST /api/transfers/uploads(auto/provider/aliyundrive/direct)
  Gateway->>Transfer: 创建 TransferJob + 上传 URL
  Gateway-->>User: transferId + uploadParts/accessToken
  User->>Cloud: 直传分片
  User->>Gateway: web/cli-upload-complete
  Gateway->>Client: WS transfer.download.start
  Client->>Gateway: refresh-download-url
  Client->>Cloud: 直接下载
  Cloud-->>Client: 文件流
  Client->>Client: sha256 校验
  Client->>FS: 写 .part 后 rename
  Client-->>Gateway: progress / complete
  Gateway-->>User: completed events
```

## SDK 断点续传上传

```mermaid
sequenceDiagram
  participant Script as Node脚本
  participant SDK
  participant Gateway
  participant Cloud as StorageProvider（默认阿里云盘）
  participant Checkpoint as .noesis-transfer

  Script->>SDK: uploadFile(localPath, remotePath, idempotencyKey)
  SDK->>Checkpoint: 读取 checkpoint
  SDK->>Gateway: POST /api/transfers/uploads + Idempotency-Key
  Gateway-->>SDK: TransferJob + uploadParts
  SDK->>SDK: 校验 file fingerprint / partSize
  loop 未完成分片
    SDK->>Cloud: PUT uploadUrl(part)
    Cloud-->>SDK: ok
    SDK->>Checkpoint: 记录 completedParts
    SDK->>Gateway: cli-progress
  end
  SDK->>Gateway: cli-upload-complete
  Gateway-->>SDK: completed / waiting_client_download
```

## Sync 目录同步上传

```mermaid
sequenceDiagram
  participant Script as Node脚本/桌面端
  participant SDK
  participant Gateway
  participant Sync as Sync Service
  participant Client
  participant Transfer

  Script->>SDK: syncUpload(localDir, remoteDir, idempotencyKey)
  SDK->>SDK: 生成本地 manifest
  SDK->>Gateway: POST /api/sync/upload
  Gateway->>Sync: 创建/恢复 SyncJob
  Sync->>Client: 请求远端 manifest
  Client-->>Sync: remote manifest
  Sync->>Sync: 计算 missing/changed/conflict plan
  Sync-->>SDK: SyncJob + file plan
  loop 每个需同步文件
    SDK->>Transfer: 创建/恢复 TransferJob
    SDK->>Transfer: 分片上传 + checkpoint + progress
    Transfer-->>Sync: 文件完成/失败/跳过
  end
  Sync->>Gateway: SyncJob completed/failed
  Gateway-->>Script: sync events / final sync
```

## Sync 目录同步下载

```mermaid
sequenceDiagram
  participant Script as Node脚本/桌面端
  participant SDK
  participant Gateway
  participant Sync as Sync Service
  participant Client
  participant Transfer
  participant Local as 本地目录

  Script->>SDK: syncDownload(remoteDir, localDir, idempotencyKey)
  SDK->>SDK: 生成本地 manifest
  SDK->>Gateway: POST /api/sync/download
  Gateway->>Sync: 创建/恢复 SyncJob
  Sync->>Client: 生成远端 manifest
  Client-->>Sync: remote manifest
  Sync->>Sync: 计算 missing/changed/conflict plan
  Sync-->>SDK: SyncJob + file plan
  loop 每个需下载文件
    SDK->>Transfer: refresh-download-url / file transfer
    SDK->>Local: 续写 .part，校验后 rename
    SDK->>Gateway: sync progress
  end
  Sync->>Gateway: SyncJob completed/failed
  Gateway-->>Script: sync events / final sync
```

## Pi Agent 任务

```mermaid
sequenceDiagram
  participant User as 用户/SDK/AI Agent
  participant Gateway
  participant Client
  participant PiMgr as PiAgentManager
  participant Pi as pi --mode rpc（单向驱动）
  participant Repo as 项目目录

  User->>Gateway: 创建 pi.run
  Gateway->>Gateway: 生成 PiTask JSON/策略校验/Provider Profile 注入
  Gateway->>Client: task.dispatch pi.run
  Client->>PiMgr: 执行 PiTask
  PiMgr->>PiMgr: 检查 Pi/Node/Git/settings
  PiMgr->>Pi: spawn pi --mode rpc
  PiMgr->>Pi: stdin: {type: prompt, message: goal}
  Pi->>Repo: 分析/修改/执行命令
  Pi-->>PiMgr: stdout: RPC 事件流（AgentEvent JSONL）
  PiMgr-->>Client: 规范化事件
  Client-->>Gateway: task.event pi.event
  Pi-->>PiMgr: agent_end
  PiMgr->>Pi: 关闭进程
  PiMgr->>PiMgr: 采集变更/命令/总结/session_stats
  Client-->>Gateway: task.result
```

## Pi Terminal Attach

```mermaid
sequenceDiagram
  participant UI as Web/桌面端
  participant SDK
  participant Gateway
  participant Client
  participant PiMgr as PiTerminalManager
  participant Pi as pi --mode rpc

  UI->>SDK: piTerminal.open(machineId, projectPath)
  SDK->>Gateway: POST /api/pi/terminal
  Gateway->>Client: pi.terminal.open
  Client->>PiMgr: 创建/恢复 rpc-process-host
  PiMgr->>Pi: spawn/attach pi --mode rpc
  Gateway-->>SDK: sessionId + attachToken
  UI->>SDK: attach(sessionId, attachToken)
  SDK->>Gateway: WS /ws/pi/terminal/:id
  UI->>SDK: input/steer/abort
  SDK->>Gateway: pi.rpc.command
  Gateway->>Client: 转发
  Client->>Pi: 写入命令
  Pi-->>Client: pi.rpc.event
  Client-->>Gateway: 转发事件
  Gateway-->>SDK: output/tool/status/closed
```

## 高风险确认

```mermaid
sequenceDiagram
  participant User
  participant Gateway
  participant Approval
  participant Client
  participant Audit

  Client->>Gateway: task.event（命中 requireApprovalFor 的工具/命令）
  Gateway->>Approval: 创建 Approval(waiting)
  Gateway->>Gateway: Task approval_status=waiting_confirm
  Gateway->>User: approval event / approvals list
  User->>Gateway: approve / reject
  Gateway->>Approval: 标记结果
  Gateway->>Client: 继续 / abort 该工具
  Gateway->>Audit: 写确认结果
```

## Client 重连 Reconcile

```mermaid
sequenceDiagram
  participant Client
  participant Gateway
  participant DB

  Client->>Gateway: client.hello（重连）
  Client->>Gateway: client.reconcile（在跑任务清单 + 本地状态）
  Gateway->>DB: 查询 dispatched/running 任务
  Gateway->>Gateway: 对账
  alt 本地任务存活
    Gateway-->>Client: 恢复事件流，状态不变
  else 本地任务丢失/进程已死
    Gateway->>DB: 标记 failed（原因: client_lost_task）
    Gateway-->>Client: 下发 cancel/清理
  end
```

## Client 一键安装

```mermaid
sequenceDiagram
  participant User
  participant Gateway
  participant Target as 目标机器
  participant Cloud as StorageProvider（默认阿里云盘）
  participant Client

  User->>Gateway: 创建安装令牌
  Gateway-->>User: PowerShell/Bash 命令
  User->>Target: 执行安装命令
  Target->>Gateway: 请求安装配置
  Gateway-->>Target: serverUrl/token/packageUrl
  Target->>Cloud: 下载 Client 包
  Target->>Target: 解压/写配置/注册服务
  Target->>Client: 启动 Client
  Client->>Gateway: client.hello
  Gateway-->>User: 机器在线
```

## 一键更新所有 Client

```mermaid
sequenceDiagram
  participant User
  participant Gateway
  participant Release as Release Center
  participant Cloud as StorageProvider（默认阿里云盘）
  participant Client
  participant Updater

  User->>Gateway: 上传发布包
  Gateway->>Release: 解析 manifest
  Release->>Cloud: 上传 artifact
  User->>Gateway: 点击更新所有 Client
  Gateway->>Client: client.update
  Client->>Updater: 启动更新
  Updater->>Cloud: 下载新版本
  Updater->>Updater: 校验/解压/切换/重启
  Client->>Gateway: 重新连接并上报新版本
  Gateway-->>User: 展示更新结果
```

## FRP 临时映射

```mermaid
sequenceDiagram
  participant User
  participant Gateway
  participant Client
  participant Frpc
  participant Frps
  participant Service as 目标服务

  User->>Gateway: 请求开启映射
  Gateway->>Client: frp.open
  Client->>Frpc: 生成配置并启动
  Frpc->>Frps: 建立隧道
  Gateway-->>User: 返回公网入口
  User->>Frps: 访问入口
  Frps->>Frpc: 转发
  Frpc->>Service: 访问本地服务
  User->>Gateway: 关闭映射
  Gateway->>Client: frp.close
  Client->>Frpc: 停止
```
