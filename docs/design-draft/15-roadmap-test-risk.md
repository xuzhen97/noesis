# 15. 落地路线、测试与风险

## 方案一致性审计结果

本轮审计重点检查了 00/01/03/04/07/08/11/14/17/18/20 与原型文档之间的逻辑一致性，已修复以下冲突：

| 问题 | 修复 |
|---|---|
| 路线图缺少 Todo / Context / VCP 协作模块 | 本文新增阶段 10，并把 SDK/CLI/VCP 插件顺序后移到其后 |
| 文档曾统一说 AI Agent 只经 skill + CLI，但 VCP 决策为直接 import SDK | 00/14/18 已改成：通用 Agent 经 skill + CLI；VCP 这类 Node 插件宿主可直接 import SDK |
| 旧 `todo_items` 表与新 Todo 模型冲突 | 08 已废弃旧表，改为 `todos/tags/contexts/todo_tags/todo_task_links` |
| Runbook DSL 旧 `todo.create(title,{due,machine})` 与新模型冲突 | 17 和原型 `runbookDsl.ts/r7.ts` 已改成对象式 `todo.create({ title, description, contextId, ready })` |
| 原型 README 仍把 `vcp.*` 当 Runbook 全局能力 | 已改为：VCP 通过外部插件 + SDK 接入，不是 Runbook DSL 能力 |
| VCP 多 agent 审计 actor 与 Todo assignee 粒度不一致 | 20/18 已明确 claim 时可落 `assignee=vcp:<agentName>`，审计 actor 同步 |

## 实现地图（按依赖顺序）

```text
shared schemas/types
  ↓
server db migrations + resource services
  ↓
HTTP API + WebSocket + audit/idempotency
  ↓
web pages + sdk typed APIs + cli commands
  ↓
skills / external integrations / VCP plugin contract
  ↓
E2E + release packaging
```

各资源落点：

| 能力域 | Shared | DB | Server | Web | SDK | CLI | Client | 外部 |
|---|---|---|---|---|---|---|---|---|
| Machine/Auth/Audit | `packages/shared` | `machines/api_tokens/audit_logs` | `machine-registry/auth-policy/audit-log` | `/machines` | `noesis.machines/auth/audit` | `noesis machines/audit` | WS hello/heartbeat | - |
| Task/Command/File | shared task/file schemas | `tasks/task_events` | `task-orchestrator/file-service` | `/tasks`, machine file tab | `noesis.tasks/commands/files` | `noesis command/file/task` | task runner/file operator | - |
| Storage/Sync | transfer/sync schemas | `transfer_jobs/sync_jobs` | `storage-provider/sync-service` | `/sync` | `noesis.transfers/sync` + node helpers | `noesis sync` | upload/download handlers | StorageProvider |
| Pi | pi schemas | `pi_sessions` | `pi-task-gateway/pi-terminal-gateway` | task page + pi terminal | `noesis.pi/piTerminal` | `noesis pi` | Pi manager/rpc host | Pi Agent |
| Runbook/Approval | runbook schemas/types | `runbooks/runbook_versions/runbook_runs/approvals` | `runbook-runtime/approval-service` | `/runbooks`, approval center | `noesis.runbooks/approvals` | `noesis runbook/approval` | executes child Tasks only | - |
| Todo/Context/Tag | todo/context/tag schemas | `todos/contexts/tags/todo_tags/todo_task_links` | `todo-service/context-service/tag-service` | `/todos`, `/contexts` | `noesis.todos/contexts/tags` | `noesis todo/context/tag` | 不需要 Client 新能力 | VCP plugin |
| Browser/Computer Use | automation schemas | automation tables | automation gateway/report service | `/automation`, machine tabs | `noesis.browser/computer/automation` | `noesis browser/computer` | browser/computer managers | enikk/VLM/WebRTC |

关键依赖：

- SDK 依赖 shared schemas 和 HTTP API 稳定；CLI 依赖 SDK。
- VCP 插件依赖 SDK 的 ESM/CJS 双产物和 Todo typed API，因此必须晚于 Todo API/SDK。
- Runbook `todo.create` 依赖 Todo API；Runbook runtime 可以先落地，但 Todo 能力函数要在 Todo 阶段补齐。
- Todo 不依赖 Client；它复用 Gateway 已有 Task/Runbook/File/Pi 能力和 audit 链路。
- Browser/Computer Use 不阻塞 Todo/VCP；VCP 可先使用 command/file/pi/runbook，后续自然可用 browser/computer。

## 实施路线

### 阶段 0：项目初始化与协议骨架

- pnpm workspace。
- `packages/shared`：基础响应、错误模型、分页、审计头、Idempotency-Key 类型。
- server/client/web/sdk/cli skeleton。
- SQLite migration runner。
- eslint/tsconfig/vitest 基线。

验收：`pnpm test`、`pnpm build` 跑通；server health 返回版本和 capabilities。

### 阶段 1：Auth、Machine 注册和 WS 通道

- owner token / API token。
- `/ws/client`。
- `client.hello` / `client.heartbeat`。
- Machine Registry。
- machine capabilities / disks / policy mirror。
- Web 机器列表。

验收：Client 启动后 Gateway 显示在线，断开后显示离线；API token 可撤销。

### 阶段 2：Task、Audit、Policy 和 command.run

- `tasks` / `task_events`。
- TaskOrchestrator。
- command.run。
- stdout/stderr/progress event。
- Task Detail UI。
- audit_log。
- requireApprovalFor 基础 policy gate。
- Idempotency-Key。

验收：执行 `node -v`，实时显示输出；危险命令触发 Approval；审计能追溯 source/actor。

### 阶段 3：文件管理 MVP

- file.list/read/write/delete/move。
- File Manager UI。
- 路径策略和路径归一化。
- 小文件走 WS 控制通道。

验收：Web/CLI 可读写文件；越权路径被拒绝并审计。

### 阶段 4：StorageProvider 与 TransferJob

- StorageProvider 抽象。
- AliyunDrive v1 provider。
- `file.import_from_cloud` / `file.export_to_cloud`。
- TransferJob 状态机。
- 上传/下载进度事件。

验收：mock StorageProvider 完成导入/导出；链接过期可刷新。

### 阶段 5：Install Center 与 Client 服务化

- install_tokens。
- `/install/client.ps1` / `/install/client.sh`。
- Windows Service。
- systemd。
- 首装 initialPolicy 下发。

验收：Windows/Linux 一条命令安装并上线。

### 阶段 6：Release Center 与 Client 自更新

- releases / manifest / artifact。
- updater。
- 版本目录。
- 健康检查。
- 回滚。

验收：Client 更新成功；模拟失败后回滚到旧版本。

### 阶段 7：Pi Agent 集成（pi.run，rpc 单向驱动）

- pi.check/install/configure。
- Provider Profile 分层注入（`local_only/managed/fallback`）。
- pi.run：prompt → rpc events → agent_end 关进程。
- abort / abort_bash + 超时兜底。
- extension_ui_request 自动拒绝。
- PiEventParser。
- Pi 批处理任务 UI 合并到全局任务页。

验收：mock Pi 事件完整入库；abort 后任务终态正确；Provider Key 不进审计。

### 阶段 7b：Pi 交互式 Web 终端（pi.terminal）

- pi-terminal-gateway / pi-terminal-manager。
- rpc-process-host 共用。
- `/api/pi/terminal*` + `/ws/pi/terminal/:id` attach。
- Web Pi Terminal Console。
- 扩展 UI 弹窗 + policy-gate 确认拦截。
- 会话持久化 / reattach / 重连恢复 / 清理。
- Raw TUI Mirror 可选，不阻塞主线。

验收：打开/断开/重连同一会话不丢上下文；policy gate 可确认/拒绝。

### 阶段 8：FRP 映射

- frp.open/close/list。
- expireAt 自动关闭。
- FRP UI。
- 敏感端口确认。

验收：端口映射可开关；过期自动关闭；审计记录端口和 actor。

### 阶段 9：Runbook 与 Approval 闭环

- Runbook / RunbookVersion / RunbookRun。
- TS DSL 沙箱和能力注入。
- durable execution snapshot。
- approve() 挂起/重放。
- Approval 一等实体。
- Runbook 库 UI。
- 能力调用生成 Task / Transfer / Approval。

验收：RunbookRun 遇 approve() 挂起，Web 确认后恢复；历史版本可复现。

### 阶段 10：Todo / Context / Tag 协作模块

- shared Todo/Context/Tag schemas。
- DB：`todos/tags/contexts/todo_tags/todo_task_links`。
- Todo Service：两层限制、leafOnly、ready 冻结、claim/report/confirm、父状态事务联动、archive/unarchive。
- Context Service：`machineIds[]` 校验机器存在，markdown 原样保存，归档保护。
- Tag Service：纯分类，归档后历史可见新建不可选。
- API：`/api/todos`、`/api/contexts`、`/api/tags`。
- Web：`/todos`、`/contexts`，Tag inline 管理。
- Runbook `todo.create` 升级为新 API；`ready=true` 必须 `contextId + description`。
- 审计：ready/claim/report/confirm/status/archive 全记录。

验收：

- VCP 候选查询只返回 unassigned + ready + leaf + status=todo。
- 顶层 leaf 经 VCP report done 后进入 `awaiting_confirmation`，用户 confirm 后 done。
- 子任务经 VCP report done 后子任务 done；所有子任务 done 后父 Todo 进入 `awaiting_confirmation`。
- failed 子任务存在时父 Todo 不可 confirm。
- Context 归档后引用它的 ready Todo 不可 claim。

### 阶段 11：SDK / CLI / Skills / VCP 插件契约

- `@noesis/sdk` core：typed API、NoesisError、幂等、AsyncIterable watch/wait。
- SDK ESM+CJS 双产物。
- SDK Node helper：env/config/file/sync/checkpoint。
- SDK runbook authoring：`@noesis/sdk/runbook`。
- SDK Todo/Context/Tag typed API。
- CLI 全命令补齐：machines/command/file/pi/frp/releases/install/audit/runbook/sync/todo/context/tag/browser/computer/automation。
- `--json` 机器可读输出。
- Skills 包：每个能力一个 SKILL.md，含 manage-todos。
- VCP 插件契约文档：使用 SDK、source=ai-agent、actor=vcp:<agentName>、轮询/claim/report、tag/context routingRules。

验收：

- 外部 Node 脚本 import SDK 完成 command.run + wait。
- CLI `noesis todo list/claim/report` JSON 可解析。
- VCP 插件 mock 可轮询 ready Todo、claim、创建 Task 证据、report。

### 阶段 12A：Computer Use 最小闭环

- `computerUse` 可选能力包：Windows enikk runtime sidecar + OCR/YOLO weights。
- Web 机器详情 Computer Use Tab。
- `computer.run` Task。
- AutomationRunReport。
- `noesis computer install/enable/doctor/repair/run/report`。
- Pi Agent 通过短期 Gateway Agent Token 调 CLI 使用集群能力。

验收：mock enikk 完成 run→events→report；敏感动作走 Approval。

### 阶段 12B：Browser Use、Macro 复用与省 token

- AutomationMacro JSON DSL、版本、候选、采纳。
- Macro 匹配评分和 VLM 修复候选版本。
- Macro 导出 Runbook，默认锁定 MacroVersion。
- `browserUse`：Chrome/Edge + CDP/DOM + existingProfileManaged。
- 浏览器 Profile busy 时 requestRestart 审批，失败 fallback Computer Use。
- `/automation` 资产页。

验收：首次 agent 成功生成候选；采纳后二次 macroFirst 命中。

### 阶段 12C：WebRTC 旁观与接管

- WebRTC signaling gateway。
- Client WebRTC remote manager。
- P2P-first + STUN；托管/自建 TURN Profile。
- 人工接管时暂停 AI，释放后 resume/cancel。
- Report 记录 manualIntervention 摘要和关键帧。

验收：Web 端可旁观；接管后 AI pause，释放后可继续或取消。

## 个人开发排期建议

```text
第 1 周：Monorepo + shared + auth + machine WS
第 2 周：Task/Audit/Policy + command.run
第 3 周：文件管理 MVP
第 4 周：Install Center + Client 服务化
第 5 周：StorageProvider + TransferJob
第 6 周：Release Center + Client 自更新
第 7 周：pi.run
第 8 周：pi.terminal + FRP
第 9 周：RunbookVersion/RunbookRun/Approval
第10 周：Todo/Context/Tag + /todos /contexts
第11 周：SDK/CLI/Skills + VCP 插件 mock
第12 周：Sync 完整化 + E2E 回归 + 文档冻结
P1+：Computer Use / Browser Use / Macro / WebRTC 分阶段追加
```

> 旧 10 周排期已经装不下 Todo/VCP 和 pi.terminal。现在按 12 周保守计划；Computer/Browser Use 属 P1+，不阻塞 Noesis 的远程控制 + Todo/VCP 协作主闭环。

## 测试方案摘要

完整测试矩阵见 `16-test-plan.md`；本文只列阶段验收必须覆盖的主路径。

### 单元测试

- TaskOrchestrator 状态转换。
- MachineRegistry 上下线。
- PolicyEngine 策略判断。
- Manifest 解析。
- FileOperator 路径归一化。
- CommandExecutor 超时。
- PiEventParser。
- Updater 状态机。
- Runbook durable execution snapshot / replay。
- Todo 父子两层限制、ready 冻结、父状态联动。
- Todo claim/report/confirm 前置条件。
- Context machineIds 校验与归档保护。
- Tag 归档后历史显示。
- SDK 错误模型和幂等冲突。

### 集成测试

- Client 连接 Server。
- command.run 完整闭环。
- file.read/write 完整闭环。
- task.cancel / task.approval。
- StorageProvider mock 下载/上传。
- update task 成功/失败回滚。
- pi.run mock。
- pi.terminal attach/reattach。
- client.reconcile。
- SDK watch/wait。
- RunbookRun + Approval 审批恢复。
- Runbook `todo.create({ ready:true })` 必须 contextId + description。
- Todo VCP 候选查询 → claim → report done/failed → task link → audit。
- 顶层 leaf `awaiting_confirmation` 和子任务父聚合。
- CLI `--json` 输出 + skill 端到端。
- Browser/Computer Use mock adapter。

### E2E 验收

- Windows Client 注册。
- Linux Client 注册。
- 命令执行。
- 文件读取/写入。
- 大文件导入/导出。
- SDK Node 脚本一键 command.run + wait。
- Client 更新成功和失败回滚。
- Pi 任务事件流。
- FRP 临时映射。
- Runbook 执行 + Approval 恢复。
- Todo 页面创建 Context/Tag/Todo，ready 后被 VCP mock 领取并 report。
- 顶层 Todo 用户 confirm 后 done。
- syncUpload/syncDownload 中断恢复。
- Computer Use Pack 安装、自检、运行示例任务、报告查看。

## 主要风险与缓解

| 风险 | 缓解 |
|---|---|
| 远程命令危险 | 路径限制、危险命令识别、确认、审计 |
| Pi Agent 操作不可控 | PiTask constraints、本地 PolicyEngine、事件审计、policy-gate 确认拦截 |
| Pi 交互终端渲染复杂 / 高频事件带宽 | 窗口限流、增量替换、采样审计；形态 A 默认避开 PTY |
| Provider Profile Key 泄露 | 分层注入、加密落库、不写入持久配置、不进审计、TLS 传输 |
| SDK 脚本重跑导致重复执行 | Idempotency-Key，创建型 API 命中返回首次资源，payload 冲突报错 |
| Todo ready 被误打开导致 VCP 误领 | ready 手动拨；Runbook ready=true 必须 contextId + description；claim 前服务端校验 context 未归档 |
| VCP claim 后崩溃导致 Todo 卡 doing | 增加人工 reclaim/status API；列表按 doing + assignee 筛选；第一版不做自动超时抢占，避免误判长期任务 |
| VCP 不能做的 Todo 反复被评估 | VCP 插件本地按 todoId+updatedAt 冷却，Gateway 不写 skip 状态 |
| 多个 VCP agent 抢同一 Todo | claim 原子 compare-and-set；assignee 落 `vcp:<agentName>`；409 冲突后插件丢弃本地执行 |
| 父 Todo 终判语义混乱 | 顶层 leaf VCP done → awaiting_confirmation；子任务 done 后父聚合 awaiting_confirmation；failed 子任务不允许父 confirm |
| Context 编辑影响多个 Todo | Context 是活文档；更新时间进入 VCP skipCache 失效条件；必要时用户复制 Context 而不是做版本系统 |
| Context markdown 引用路径失效 | 不结构化 path；由用户/agent 在执行时发现并 report failed，resultSummary 写明缺失 |
| Tag/Context 删除破坏历史 | 删除=归档；历史 Todo 仍可显示已归档引用，新建/claim 时限制 |
| 目录同步误覆盖/误删除 | 默认 conflict=skip、deleteExtra=false，覆盖/删除必须显式开启 |
| 大文件传输中断 | SDK checkpoint + TransferJob/SyncJob 状态机恢复 |
| 重连后任务状态错乱 | client.reconcile 对账，丢失任务标记 `failed` |
| 长期 SQLite 膨胀 | 事件采样 + 轮转 + 归档云盘 + 定期 VACUUM |
| 自更新失败 | 独立 updater、版本目录、健康检查、回滚 |
| Server 更新失败 | 备份 DB/config、维护模式、回滚 |
| StorageProvider 链接失效 | 刷新下载链接、保存 fileId、重试 |
| FRP 暴露风险 | 短生命周期、过期关闭、敏感端口确认 |
| Computer Use 误操作 | macroFirst、desktop lock、敏感动作 Approval、报告 evidence、WebRTC 可暂停/接管 |
| 云端 VLM 截图泄露 | 本地 OCR 脱敏、裁剪/压缩、敏感页面确认、Provider Profile Key 脱敏 |
| WebRTC 跨网失败 | P2P-first + 可配置托管/自建 TURN，失败 fallback 关键帧旁观 |
| 浏览器 Profile 被占用 | requestRestart 审批，失败 fallback Computer Use |
| Windows/Linux 差异 | 平台适配层、路径封装、双平台测试 |

## 架构决策

- ADR-001：命令和小文件走 WebSocket 控制通道。
- ADR-002：大文件走 StorageProvider，第一版默认 AliyunDrive。
- ADR-003：FRP 只做临时服务访问（frps 用户自备）。
- ADR-004：Pi Agent 由 Client 托管。
- ADR-005：Node.js / TypeScript 作为主技术栈。
- ADR-006：pi.run 底层用 `pi --mode rpc` 单向驱动（弃用 json），与 pi.terminal 共用 rpc-process-host。
- ADR-007：新增 pi.terminal 交互式 Web 终端，形态 A 结构化渲染为默认，形态 B Raw TUI Mirror 可选。
- ADR-008：Pi Provider Profile 分层注入（keyInjection: local_only/managed/fallback；默认策略由 Machine Policy 决定，Gateway 可集中加密下发）。
- ADR-009：Client 重连后 client.reconcile 对账在跑任务。
- ADR-010：通用 AI Agent 接入用 skill + CLI；VCP 这类 Node 插件宿主可直接 import SDK；不提供 MCP Server。
- ADR-011：Browser Use 和 Computer Use 是 Client capability；Pi Agent 通过短期 Gateway Agent Token + CLI 反向使用集群能力。
- ADR-012：Browser Use 独立于 Computer Use，优先 DOM/CDP，失败 fallback 完整桌面控制。
- ADR-013：Computer Use Windows 第一版以内置 enikk runtime sidecar 作为可选能力包，不在 Node Client 主进程重写 OCR/YOLO。
- ADR-014：自动化沉淀统一为 AutomationMacro/AutomationRunReport，默认 macroFirst，Runbook 导出锁定版本。
- ADR-015：WebRTC 是人工旁观/接管通道，不是 AI 主执行通道；Gateway 只做 signaling。
- ADR-016：Todo 是独立资源域；Tag 纯分类，Context 是活文档，VCP 通过 SDK 轮询 ready 叶子 Todo，Gateway 不主动调用 VCP。
- ADR-017：Todo 顶层事项由用户终判；VCP 完成顶层 leaf 后进入 awaiting_confirmation，子任务完成后由父 Todo 统一终判。
