# 01. PRD 产品需求文档

## 产品定位

Noesis 灵识，是一个面向个人的人机协作共生平台，用于连接人类意图、AI Agent、远程机器与自动化任务。它统一管理多台无公网 Windows / Linux 机器，并为用户和 AI Agent 提供安全、可审计、可自动化的目标机器操作能力。

## 用户画像

### 个人开发者

- 有多台开发机、服务器、NAS、内网机器。
- 需要部署、排错、传文件、运行脚本。
- 希望 AI Agent 能辅助操作远端环境。

### AI Agent 使用者

- 使用 Pi Agent、Codex、Claude Code、自建 Agent。
- 需要给 Agent 一个安全的远程机器工具层。
- 希望 Agent 可以调用文件、命令、Pi、FRP、大文件等能力。

## 核心痛点

1. 目标机器没有公网 IP。
2. Server 带宽有限，不适合中转大文件。
3. 远程命令风险高，需要统一审计。
4. AI Agent 和外部项目需要标准化工具入口。
5. 外部项目希望引用 SDK 快速编写 Node 自动化脚本。
6. Client 和 Server 需要持续自更新。
7. Pi Agent 需要纳入目标机器基础能力。
8. AI Agent 需要在授权桌面/浏览器上处理没有 API 的任务，并把试错过程沉淀为可复用自动化。
9. 用户需要把长期事项拆成可审计 Todo，让外部 Agent（如 VCP）自主领取可执行部分，剩余由用户终判。
10. 目标机器初次安装需要一条命令完成。

## 功能需求

### P0

- Gateway 登录与基础设置。
- 机器注册、心跳、上下线。
- 命令执行和日志流。
- 文件列表、读取、写入、删除、重命名。
- StorageProvider 大文件导入/导出（第一版默认阿里云盘）。
- 一键安装 Client。
- Client 自更新。
- Pi Agent 检测和简单运行。
- 审计日志。

### P1

- FRP 临时映射。
- Pi 会话 Workspace（批处理）+ Pi 交互式 Web 终端（见 05b）。
- SDK（供 CLI、Node 脚本、桌面程序统一接入 Gateway）。
- 脚本库 / Runbook / RunbookRun。
- 目录同步 SyncJob（断点续传、冲突可见）。
- Release 灰度发布与回滚。
- 机器标签与分组。
- 任务取消、超时、重试。
- AI Agent Token。
- Todo / Context / Tag 协作模块（见 20）：ready 叶子 Todo 可由 VCP 通过 SDK 自主领取，用户最终确认顶层 Todo。
- Browser Use / Computer Use 自动化能力（见 19）：浏览器优先 DOM/CDP，桌面通过可选 enikk 能力包完整控制；默认 macroFirst，优先脚本化省 token。

### P2

- 插件系统。
- 多 Storage Provider。
- Browser Use 高级插件 / 多浏览器扩展。
- WebRTC 人工接管增强和托管/自建 TURN 管理。
- 定时任务和工作流编排。

## 详细功能

### 机器管理

- 机器 ID、名称、OS、架构、主机名。
- 在线/离线/更新中/异常状态。
- Client 版本、Pi 版本、frpc 状态。
- 能力清单：file、command、script、piAgent、frpc、selfUpdate、browserUse、computerUse。
  - 其中 piAgent 包含 `installed` / `ready` / `version` 等子状态（见 03 领域模型），`ready` 即 Pi 是否就绪的标志。仪表盘"Pi 就绪率"KPI 即聚合所有在线机器的此字段。
  - `browserUse` 表示浏览器 DOM/CDP 自动化能力；`computerUse` 表示完整桌面控制能力，Windows 第一版通过可选 enikk 能力包启用。
- 标签、分组、最后心跳。

### 任务系统

所有远程动作都转换为 Task：

```text
file.*
command.run
script.run
pi.*
frp.*
browser.*
computer.*
automation.*
client.update
server.update
install.register
```

### 文件管理

- 小文件走控制通道。
- 大文件走 StorageProvider（默认阿里云盘）。
- 路径策略限制。
- 所有写操作可审计。

### 命令执行

- 支持 powershell / cmd / bash / node / python。
- 支持 cwd、env、timeout、cancel。
- stdout/stderr 实时回传。
- 高风险命令进入确认。

### Pi Agent

- 安装、检测、配置、升级。
- Provider Profile 配置：默认可读本地 `~/.pi/agent/settings.json`，也可按 Machine Policy 的 keyInjection 使用 Gateway 集中注入（见 05/13）。
- 自动批处理 `pi.run`（底层 `pi --mode rpc` 单向驱动）。
- 交互式 Web 终端 `pi.terminal`（长会话、双向 RPC、流式渲染、扩展弹窗，见 05b）。
- Pi 事件流回传、采集文件变更/命令记录/最终总结/token 费用。

### SDK / CLI

- `@noesis/sdk` 完整暴露 Gateway HTTP API、WebSocket 事件流、Runbook、Transfer、Sync、Pi Terminal、Browser Use、Computer Use 协议能力。
- CLI 依赖 SDK 实现，CLI 只负责命令解析和输出格式。
- SDK 提供 Node helper：`createClientFromEnv()`、上传/下载断点续传、syncUpload/syncDownload、Runbook 文件上传。
- SDK 不内置业务部署模板；部署脚本由上层项目组合 commands/files/pi/runbook/sync/browser/computer 能力。
- Pi Agent 通过 Client 注入的短期 Gateway Agent Token 调用 `noesis` CLI，反向使用整个集群能力；长期 owner token / client token 不暴露给 Pi。

### Browser Use / Computer Use（见 19）

- Browser Use 是独立 Client capability，优先用 DOM / CDP / 下载事件 / 页面状态处理网页任务；必要时 fallback 到 Computer Use。
- Computer Use 是可选 Client capability，Windows 第一版以内置 enikk runtime sidecar 提供完整桌面控制。
- 默认 `macroFirst`：先匹配已采纳 AutomationMacro，失败或无经验时才调用云端 VLM/LLM。
- 每次运行生成 AutomationRunReport，记录步骤、证据、产物、人工接管和是否需要复核。
- 成功轨迹可生成 AutomationMacro 候选；用户采纳后下次优先执行；Macro 可导出 Runbook 且默认锁定版本。
- Web 支持安装能力包、自检、修复、提权修复审批、WebRTC 旁观/接管。

### Todo / Context / VCP 协作（见 20）

- Todo 是独立资源域，不依附 Runbook；支持 Tag、多级仅两层的子任务、ready、claim、report、confirm。
- Context 是可复用执行信息包，结构化绑定 `machineIds[]`，执行说明写 markdown。
- VCP 是 Gateway 的 agent 用户，通过 VCP 插件 import `@noesis/sdk` 轮询 ready 的叶子 Todo；Gateway 不主动调用 VCP，不保存 VCP 专属配置。
- VCP 完成顶层 leaf 后进入 `awaiting_confirmation`；子任务完成后由父 Todo 统一等待用户终判。
- Todo 通过 `todo_task_links` 关联执行 Task，审计仍走现有 TaskEvent / audit_log。

### Runbook / Sync

- Runbook 是服务端保存的 TS DSL 编排定义。
- RunbookVersion 保存历史代码版本，RunbookRun 表示一次跨机器执行。
- Approval 是一等实体，统一承接 approve()/命令级确认/policy gate。
- SyncJob 表示目录级上传/下载同步，下面挂多个 TransferJob。
- Sync 默认不删除、不覆盖冲突；支持 checkpoint 断点续传。

### 发版与安装

- Release Center 管 Server / Client / SDK / CLI / Pi 能力包 / frpc / computer-use-pack。
- Install Center 生成 Windows / Linux 一键安装脚本，可提示是否附带安装 Computer Use 能力包。
- 发布包和安装包通过 StorageProvider 分发，第一版默认阿里云盘。

## 非功能需求

| 项目 | 要求 |
|---|---|
| 技术栈 | Node.js / TypeScript |
| 数据库 | SQLite 起步 |
| 通信 | HTTP API + WebSocket |
| SDK | TypeScript / Node.js 20+ / ESM+CJS 双产物 |
| UI | React / Vite |
| Client | Windows / Linux |
| 大文件 | StorageProvider 中转（默认阿里云盘） |
| 安全 | 默认不暴露 Client 控制端口 |
| 审计 | 所有任务、命令、Pi、文件变更可追踪 |
| 更新 | 支持健康检查和回滚 |

## 验收标准

- Windows 和 Linux Client 均可安装并上线。
- Web 可执行命令并实时看日志。
- Web 可读取和写入文件。
- Client 可从 StorageProvider 下载大文件。
- Client 可上传文件到 StorageProvider 并返回链接。
- Client 可自更新并失败回滚。
- Gateway 可触发 Pi Agent 任务。
- Pi Agent 可通过 `noesis` CLI 使用 Gateway 集群能力，调用 browser/computer/file/command/runbook 等任务。
- VCP 插件可通过 SDK 领取 ready Todo、执行 Gateway 能力并 report 结果，审计 actor 标记为 `vcp:<agentName>`。
- SDK 可被外部 Node 项目导入，完成 command.run + wait。
- RunbookRun 可执行并在 Approval 后恢复。
- SyncJob 可中断后恢复，最终文件一致。
- 审计日志记录完整。
