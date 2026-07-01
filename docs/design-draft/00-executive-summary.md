# 00. 执行摘要

## 背景

个人 AI Agent 运维场景下，用户通常拥有多台 Windows / Linux 机器，其中多数机器无公网 IP。传统远程控制工具偏人工操作，缺少 AI Agent 可调用的统一 API、任务审计、自更新、脚本复用和大文件中转能力。

Noesis 灵识目标是构建一个面向个人的人机协作共生平台，用于连接人类意图、AI Agent、远程机器与自动化任务，让人、AI 与机器在同一个认知空间中共生。

## 系统目标

- 统一管理多台无公网机器。
- 通过 Web / SDK / CLI / API 暴露能力给用户和 AI Agent，Web 和 CLI 都基于 Gateway API，CLI 依赖 SDK 实现。通用 AI Agent 经 skill + CLI 接入；VCP 这类 Node 插件宿主可直接 import SDK；不提供 MCP Server。
- 安全执行文件管理、命令、脚本、Pi Agent 智能任务。
- 可选支持浏览器自动化和完整桌面 Computer Use；Pi Agent 通过 Gateway CLI/SDK 使用整个机器集群能力。
- 用阿里云盘承接大文件数据面，避免 Server 带宽瓶颈。
- 用 FRP 按需暴露目标机器内部服务。
- 支持一键安装 Client、一键更新 Server 和所有 Client。
- 沉淀脚本库、Runbook、RunbookRun、Pi 会话记录、SyncJob、Todo/Context 和审计日志。

## 总体架构

系统分七个面：

1. 控制面：Gateway / Server，负责 API、任务编排、机器注册、WS 通道、审计、发版、安装、Runbook、Approval、Transfer/Sync。
2. 集成面：SDK / CLI / Skills，负责让 Node 脚本、桌面程序和 AI Agent 统一接入 Gateway。
3. 执行面：Client Agent，负责目标机器的文件、命令、脚本、frpc、Pi、更新。
4. 智能执行面：Pi Agent，由 Client 托管，处理项目级智能任务。
5. 大文件数据面：阿里云盘，用于发布包、大文件、日志包、备份包和 Sync 中转。
6. 服务访问数据面：FRP，用于临时访问目标机器内部服务。
7. 自动化执行面：Browser Use / Computer Use，负责浏览器 DOM/CDP 自动化、桌面 VLM 自动化、宏沉淀、报告和 WebRTC 人工接管（见 19）。
8. 协作计划面：Todo / Context / Tag，负责人机协作事项、可复用执行上下文、VCP 自主领取与用户终判（见 20）。

## 关键决策

| 问题 | 决策 |
|---|---|
| 命令下发 | Gateway -> Client WebSocket |
| 小文件操作 | Gateway -> Client WebSocket / 小文件中转 |
| SDK | `@noesis/sdk` 是 CLI、Node 脚本、桌面程序统一集成层，暴露 Gateway 能力但不内置业务部署模板 |
| 大文件 | StorageProvider 中转（默认阿里云盘），Client/浏览器/SDK 直接上传/下载；Gateway WS 只传控制与进度 |
| FRP | 只做临时服务暴露，不做默认控制面 |
| Pi Agent | Client 托管 Pi；`pi.run` 走 `pi --mode rpc` 单向驱动，`pi.terminal` 走 rpc 双向 attach 的 Web 交互终端（见 05/05b） |
| Browser/Computer Use | `browserUse` 轻量内置，优先 DOM/CDP；`computerUse` 是可选 enikk 能力包，完整桌面控制；两者共用 AutomationMacro/Report（见 19） |
| 更新 | Release Center 管版本，Updater 拉包、校验、切换、回滚 |
| 安装 | Gateway 生成一次性 PowerShell / Bash 安装脚本 |
| Runbook | RunbookVersion 保存代码历史，RunbookRun 是跨机器执行实例，子步骤生成 Task / Transfer / Approval |
| Sync | SyncJob 负责目录同步计划与进度，SDK Node helper 负责本地文件 IO 和 checkpoint |
| Todo / Context / VCP | Todo 是独立资源域；VCP 作为 agent 用户通过 SDK 轮询 ready 的叶子 Todo，Gateway 不保存 VCP 专属配置 |

## MVP 范围

- 单用户 owner token 登录（个人系统，无多账号/RBAC）。
- Client 注册、心跳、机器列表。
- command.run。
- file.list / file.read / file.write。
- 任务日志流。
- StorageProvider 大文件导入/导出（默认阿里云盘）。
- Install Center 一键安装。
- Release Center 简版和 Client 自更新。
- Pi Agent 检测与 pi.run 简版。

## 自动化能力补充

Browser Use / Computer Use 作为 P1+ 能力设计完整覆盖但分期落地：第一期以 Windows `computerUse` 可选能力包 + 报告闭环为主；后续加入 `browserUse` CDP/DOM、AutomationMacro、Runbook 导出和 WebRTC 人工接管。详见 `19-automation-use-design.md`。

## 产品形态

Noesis 灵识不是普通远控工具，而是：

> Human-AI Symbiotic Workspace。让意图被理解，让智能去执行。
