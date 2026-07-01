# 04. Server / Client 模块设计

## Server 模块

```text
server/
  api-gateway
  auth-policy
  machine-registry
  task-orchestrator
  ws-control-channel
  file-transfer-service
  sync-service
  runbook-runtime
  approval-service
  pi-task-gateway
  pi-terminal-gateway
  automation-gateway
  browser-use-gateway
  computer-use-gateway
  webrtc-signaling-gateway
  release-center
  install-script-center
  storage-provider
  frp-control
  todo-service
  context-service
  tag-service
  audit-log
  idempotency-store
  gateway-info
  db
```

### API Gateway

- HTTP API 入口。
- 参数校验。
- 鉴权。
- 统一响应。
- requestId。
- 限流。
- Gateway info / health：`/api/health`、`/api/gateway/info`，供 SDK/CLI/桌面端做能力发现。

### Auth & Policy

MVP 单用户 token（一个 owner token）。第一版 API Token 只做命名、过期、撤销，不做 scope 或机器范围限制（个人单用户系统，不做多角色 RBAC）。

策略示例：

```json
{
  "allowCommand": true,
  "allowFileWrite": true,
  "allowPiRun": true,
  "requireApprovalFor": ["delete_file", "system_service_change", "database_write", "git_push"]
}
```

### Machine Registry

- Client 注册。
- 心跳。
- 能力清单。
- 版本状态。
- 上下线。
- 标签分组。

### Idempotency Store

- 处理创建型 API 的 `Idempotency-Key`。
- 作用域：token + method + path + key。
- 同 key 同 payload 返回首次创建资源；同 key 不同 payload 返回 `IDEMPOTENCY_CONFLICT`。
- 默认 TTL 24h，可配置。

### WebSocket Control Channel

消息类型：

```text
client.hello
client.heartbeat
client.capabilities
client.reconcile
task.dispatch
task.event
task.cancel
task.result
task.approval_request
task.approval_decision
machine.policy.sync
pi.terminal.open
pi.terminal.close
pi.terminal.status
pi.terminal.closed
pi.rpc.command
pi.rpc.event
pi.ui.request
pi.ui.response
browser.remote.*
computer.remote.*
webrtc.signal.*
client.update_status
```

### Task Orchestrator

- 创建任务。
- 入队。
- Client 在线判断。
- 下发任务。
- 超时、取消、重试。
- 更新任务状态。
- 写入事件和审计。

### Runbook Runtime

- 管理 Runbook / RunbookVersion / RunbookRun。
- 执行 TS 即 DSL 编排脚本。
- 注入能力函数：`on(machine).cmd/pi/file`、`cloud`、`machines`、`todo`、`approve/log/sleep`。
- durable execution：`approve()` 挂起时落库 snapshot，运行时释放；审批后重放恢复。
- 每次能力调用生成可观测 Task / TransferJob / Approval。
- 不支持一次性 `runCode`；执行已保存 RunbookVersion。

### Approval Service

- 管理 Approval 一等实体。
- 统一承接 `runbook_gate` / `command_option` / `policy_gate`。
- 提供列表、详情、approve、reject API。
- 决策后恢复 RunbookRun 或继续/中止 Task。

### Todo / Context / Tag Service

- Todo 是独立资源域，负责待办、子任务、ready、claim、report、confirm 和归档。
- Context 是可复用执行信息包，含结构化 machineIds 和 markdown；删除=归档。
- Tag 是纯分类资源；删除=归档。
- VCP 通过 SDK 轮询 ready 的叶子 Todo，自主 claim；Gateway 不保存 VCP 专属配置。
- Todo 不复制执行日志，只用 `todo_task_links` 关联既有 Task/audit 链路。完整设计见 `20-todo-vcp-collaboration.md`。

### Sync Service

- 管理 SyncJob 一等实体。
- 生成/保存远端 manifest，比较本地/远端 manifest。
- 记录文件级计划、冲突、失败、进度。
- SyncJob 下挂多个 TransferJob。
- 与 SDK Node helper 分工：Gateway 负责计划与状态，SDK 负责本地文件 IO、checkpoint、分片上传/下载。

### Pi Task Gateway

- 用户请求转 PiTask JSON。
- 应用策略。
- 注入项目上下文。
- 记录 PiSession。
- 不直接运行 Pi。

### Pi Terminal Gateway

- 交互式 Web 终端的会话登记 / 鉴权 / 多路复用（见 05b）。
- Web attach WS 与 Client 控制通道之间的多路复用。
- 高风险工具确认拦截（policy-gate）。
- 高频事件审计采样。
- 会话配额与空闲超时。

### Automation Gateway

- 统一管理 AutomationMacro / AutomationMacroVersion / AutomationMacroCandidate / AutomationRunReport（见 19）。
- `browser.run` / `computer.run` 报告汇总：从 TaskEvent、Approval、StorageObject、Artifact 聚合最终报告。
- Macro 匹配：按 intent、app/site/os、machine tags、成功率评分；高置信自动执行，中置信给 VLM/LLM 参考。
- Macro 采纳与版本化：候选经用户确认后成为 active version。
- Runbook 导出：生成薄 Runbook，调用 `on(machine).browser.runMacro()` 或 `on(machine).computer.runMacro()`，默认锁定 macro version。

### Browser Use Gateway

- 创建 `browser.*` Task。
- 处理浏览器 Profile 策略、重启审批、fallback 到 `computerUse` 的编排。
- 汇总 DOM/CDP 步骤、下载产物、fallback 和人工处理事件。

### Computer Use Gateway

- 创建 `computer.*` Task。
- 管理能力包安装/启用/自检/修复任务。
- 处理完整桌面控制的 Approval、desktop lock、报告、证据包保存。

### WebRTC Signaling Gateway

- 创建远程旁观/接管 session。
- Web 与 Client 之间转发 offer/answer/ICE，不中转媒体字节。
- 鉴权 attachToken，审计 session open/close/control 事件。
- TURN/STUN 配置从系统设置读取；失败 fallback 到关键帧旁观。

### Release Center

- 上传版本。
- 解析 manifest。
- 计算 sha256。
- 上传 artifact 到 StorageProvider（默认阿里云盘）。
- 创建更新任务。
- 灰度和回滚。

### Install Script Center

- 创建安装令牌。
- 生成 Windows PowerShell 脚本。
- 生成 Linux Bash 脚本。
- 提供安装配置。
- 记录安装结果。

### Storage Provider

抽象大文件数据面；第一版默认 AliyunDrive，后续可换 S3 / WebDAV / MinIO。

```ts
interface StorageProvider {
  upload(input: UploadInput): Promise<StorageObject>;
  getDownloadUrl(fileId: string): Promise<string>;
  createShareLink(fileId: string): Promise<string>;
}
```

## Client 模块

```text
client/
  supervisor
  ws-client
  task-runner
  file-operator
  command-executor
  script-runner
  pi-agent-manager
  pi-terminal-manager
  browser-use-manager
  computer-use-manager
  webrtc-remote-manager
  frpc-manager
  updater
  storage-client
  policy-engine
  log-reporter
  local-store
```

### Policy Engine

- 持有 Gateway `machines.policy_json` 的本地只读镜像（经 `machine.policy.sync` 下发，断网时用最后缓存）。
- 为 File Operator / Command Executor / Pi Agent Manager / Frpc Manager 提供统一策略判定：路径、命令、Pi、FRP、确认。
- 本地 config 不再定义路径策略，仅 bootstrap 最小字段（machineId / gatewayUrl / clientToken / features 开关）。
- **allowedPaths/blockedPaths 只约束 file.* 操作**（file.read/write/delete/import_from_cloud 等），不约束 Pi 工作目录。Pi 的 projectPath 由每次任务指定，不受路径白名单限制。
- piPolicy 子对象由 Policy Engine 单独提取供 PiAgentManager/PiTerminalManager 使用。
- `requireApprovalFor` 使用固定语义码：`delete_file` 由 file.delete / file.move 覆盖等文件类操作触发；`git_push` 由命令/脚本危险模式匹配触发；`system_service_change` 由 systemctl/sc/服务管理命令触发；`database_write` 由常见数据库 CLI 写操作模式触发。命中时必须在执行前暂停，上报 `task.approval_request`，用户确认后才执行。

### Client Supervisor

- 主入口。
- 加载配置。
- 连接 Gateway。
- 注册机器。
- 管理任务执行。
- 管理模块生命周期。
- 健康检查。

### WS Client

- 主动连接 Gateway。
- 断线重连。
- 心跳。
- 任务接收。
- 事件上报。

### Task Runner

- 根据 taskType 路由。
- 并发控制：每机器最大并发任务数（可配），Pi 任务走独立低优先级池，不饿死命令/文件任务。
- 优先级队列：按 `priority` 排序，同优先级 FIFO。
- 超时。
- 取消。
- 重连后 reconcile（见 09/10）。
- 统一上报。

### File Operator

支持 list/read/write/delete/move/copy/rename/mkdir/stat/checksum/compress/import/export，以及目录 manifest 生成（供 SyncJob 比较）。

**磁盘枚举与空间校验：**

- `disk.list`：枚举本机所有盘/分区，返回 DiskInfo[]（Windows 盘符、Linux 挂载点、macOS 卷全部上报，不设人为限制——用户对机器有权限即全盘可见可管）。
- 写/导入类操作执行前，校验目标路径所在盘 `freeBytes` 是否充足；不足则 task.failed 并回传 `DISK_FULL` 错误码。

必须做路径策略：按 **Client 本地策略镜像**（Gateway `machines.policy_json` 经 `machine.policy.sync` 下发的只读副本）执行 `allowedPaths`、`blockedPaths`、路径归一化、防止 `../`。Client 本地 config 不再单独定义路径策略（见 13 / 09 Client 连接状态机）。

### Command Executor

- powershell。
- cmd。
- bash。
- node。
- python。
- 自定义 shell。

必须支持 timeout、cwd、env、stdout/stderr stream、exitCode。

### Pi Agent Manager

- 检查 Pi。
- 安装 Pi。
- 管理 settings。
- 初始化项目配置。
- 托管 `pi --mode rpc`：`pi.run` 单向驱动 + `pi.terminal` 双向 attach 共用 `rpc-process-host`（见 05 / 05b）。
- Provider Profile 注入：按 machinePolicy.piPolicy.keyInjection 决定是否创建临时配置目录，通过 Pi 配置目录环境变量指向。落地时优先实测 `pi --mode rpc` 支持的变量名；兼容方案是同时设置 `PI_AGENT_DIR=<tmpDir>` 与 `PI_CODING_AGENT_DIR=<tmpDir>`（已知 pi-webui 读取 `PI_AGENT_DIR`）。managed/fallback 模式下合成为 settings.json + models.json + auth.json；local_only 模式直接用本地 ~/.pi/agent/。
- 工具权限：按 constraints.toolMode 映射到 `--tools`/`--exclude-tools` flag。
- 项目信任：按 environment.approveMode 映射到 `--approve`/`--no-approve` flag。
- 安全提示：按 constraints.appendSystemPrompt 映射到 `--append-system-prompt` flag（软约束）。
- policy-gate：Client 订阅 `tool_execution_start`，命中 policyGate.rules 时拦截——pi.terminal 弹确认，pi.run 自动拒绝。
- 临时配置目录清理：进程退出后删除 `<system-tmp>/noesis-pi-<taskId>/`。
- 解析 RPC JSONL 事件流（AgentEvent），规范化为 `pi.event`。
- 采集文件变更 / `get_session_stats`。
- 卡住时 `abort` / `abort_bash` 优雅停止，超时兜底 SIGTERM→SIGKILL。
- 自动批处理中 `extension_ui_request` 自动回 `cancelled`，写审计。
- 会话 JSONL 文件清理（见 05b 会话清理策略）。
- 回传 Pi 事件。

### Pi Terminal Manager

- 见 05b。托管 `pi --mode rpc` 长会话：rpc-process-host、session-store、reattach、raw-pty-host（可选）。
- Web attach WS 与 Client 控制通道之间的双向桥接。
- Provider Profile 注入与临时配置目录：与 Pi Agent Manager 共用逻辑。
- detached 不杀进程、空闲超时自动 close。
- Client 重启后按 piSessionFile 重新 `pi --mode rpc` + `switch_session` 恢复。
- spawn cwd=projectPath（**不是 --cwd flag**，Pi 没有 --cwd flag）。

### Browser Use Manager

- 轻量内置，使用本机 Chrome / Edge；第一版主走 CDP/DOM，不捆绑浏览器二进制。
- 默认 `macroFirst`，执行 Browser AutomationMacro JSON DSL。
- 操作阶梯：DOM/Accessibility → CDP input → extension helper（预留）→ Computer Use native input → human required。
- 使用 existing profile 时，若浏览器已运行且无 CDP，按策略 `requestRestart` 请求确认后重启；失败 fallback `computerUse`。
- 记录浏览器步骤、下载、URL、selector、fallback 和 evidence。

### Computer Use Manager

- 可选能力包管理：安装/更新/卸载 `computer-use-pack-windows-x64`，内含 enikk runtime、OCR/YOLO weights、launcher、manifest。
- enikk 作为本地 sidecar runtime；Client 管生命周期并通过 localhost API 调用，不把 Python/OCR/YOLO 重写进 Node 主进程。
- 默认 `macroFirst`，执行 Computer AutomationMacro JSON DSL；无宏或失败时调用云端 Vision Provider 修复。
- 本地负责截图、OCR、图标检测、Accessibility tree、鼠标键盘、剪贴板、trajectory。
- 云端 VLM/LLM 只做新任务规划、卡住修复、总结和候选宏生成；截图发出前按策略脱敏/压缩/裁剪。
- 同一 desktop session 使用独占 desktop lock；默认忙则失败，显式 queue 才排队。
- 高风险 GUI 动作（支付、发送、删除、提交、授权、登录凭据等）统一走 Approval。
- 自检与修复：普通修复可自动执行；提权修复只允许固定 allowlist，需 Gateway Approval + OS 原生 UAC/sudo。

### WebRTC Remote Manager

- 捕获屏幕并建立 WebRTC peer；Gateway 只做 signaling。
- 支持实时观看和人工接管鼠标键盘；接管时暂停 AI，释放后用户选择 resume/cancel。
- 默认不录完整视频，只上报摘要和关键帧；失败 fallback 到关键帧旁观/审批。

### Frpc Manager

- 管理 frpc 二进制。
- 生成临时配置。
- 启动/停止映射。
- 到期自动关闭。

### Updater

- 下载包。
- sha256 校验。
- 解压 staging。
- 切换 current。
- 重启服务。
- 健康检查。
- 失败回滚。

### Local Store

Windows：

```text
C:\ProgramData\Noesis\
  current\
  versions\
  data\config.json
  data\machine-id
  data\scripts\
  data\capabilities\computer-use\
  data\automation\
  data\logs\
  data\tmp\
```

Linux：

```text
/opt/noesis/
  current -> versions/1.2.0
  versions/
  data/config.json
  data/machine-id
  data/scripts/
  data/capabilities/computer-use/
  data/automation/
  data/logs/
  data/tmp/
```
