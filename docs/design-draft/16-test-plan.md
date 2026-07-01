# 16. 测试方案设计

> 基于 SOP v3.1 铁律 0（零测试不交付），对 Noesis 各模块的完整测试方案。
> 每个功能的测试模板：正常输入 × 1 + 边界值 × 1 + 非法输入 × 1 + 集成 × 1 + 异常 × 3。

---

## 一、测试金字塔

| 层级 | 数量（估） | 占比 | 运行时间 | 工具 | 谁来写 |
|------|----------|------|---------|------|--------|
| 单元测试 | ~200 条 | 70% | < 1 分钟 | vitest | AI Agent + 人工 review |
| 集成测试 | ~80 条 | 25% | < 3 分钟 | vitest + testcontainers / mock WS | AI Agent + 人工 review |
| E2E 测试 | ~20 条 | 5% | < 5 分钟 | Playwright | 人工设计，AI 辅助 |

总耗时目标：`npm test` < 5 分钟（不含 E2E），含 E2E < 10 分钟。

---

## 二、测试环境

```bash
# 一条命令跑通全部测试
git clone <repo>
cd noesis
pnpm install
pnpm test                 # 全部测试，不依赖外部服务
pnpm test:e2e            # E2E（需要 Docker）
```

| 依赖 | 测试替代 |
|------|---------|
| SQLite | 内存数据库（better-sqlite3 `:memory:`） |
| WebSocket | mock WS server / ws mock client |
| 阿里云盘 | mock StorageProvider 实现 |
| FRP (frps/frpc) | mock FrpcManager |
| Pi Agent 进程 | mock spawn + mock JSONL stream |
| 系统命令 | mock execa / mock shell runner |
| 文件系统 | memfs 或 tmpdir |

**铁律：不依赖外部网络、不依赖真实的阿里云盘 token、不依赖真实的 frps。**

---

## 三、单元测试目录

---

### 3.1 Server 模块

#### API Gateway

| # | 测试项 | 输入 | 预期 |
|---|--------|------|------|
| U-001 | 正常请求路由 | GET /api/machines | 200 + 机器列表 |
| U-002 | 参数校验—缺少必填字段 | POST /api/tasks, 无 machineId | 400 + VALIDATION_ERROR |
| U-003 | 鉴权—无效 token | 请求带错误 Authorization | 401 + UNAUTHORIZED |
| U-004 | 统一响应格式 | 任意 200 响应 | `{ok:true, data:{}, requestId:"..."}` |
| U-005 | requestId 唯一性 | 连续 100 个请求 | 100 个不同的 requestId |
| U-005a | Gateway info | GET /api/gateway/info | 返回 version/apiVersion/capabilities/limits |
| U-005b | 幂等命中 | 同 Idempotency-Key + 同 payload | 返回首次创建资源 |
| U-005c | 幂等冲突 | 同 Idempotency-Key + 不同 payload | 409 IDEMPOTENCY_CONFLICT |

#### Auth & Policy

| # | 测试项 | 输入 | 预期 |
|---|--------|------|------|
| U-006 | owner token 登录 | 正确凭证 | 返回 token |
| U-007 | owner token 登录—错误密码 | 错误密码 | 401 |
| U-008 | API Token 创建 | 创建 cli/sdk 用 token | token 记录入库，不含 scope/机器范围字段 |
| U-009 | API Token 吊销 | DELETE revoked | revoked_at 非空 |
| U-010 | 策略匹配—允许的命令 | allowCommand=true, command.run | 通过 |
| U-011 | 策略匹配—不允许的命令 | allowCommand=false, command.run | 拒绝 + 审计 |
| U-012 | 风险等级判定 | delete_file | riskLevel=high |

#### Machine Registry

| # | 测试项 | 输入 | 预期 |
|---|--------|------|------|
| U-013 | Client 注册 | client.hello | 机器状态 online |
| U-014 | 心跳更新 | client.heartbeat | lastSeenAt 更新 |
| U-015 | 超时离线 | 心跳超时 N 秒 | 状态 offline |
| U-016 | 能力清单解析 | capabilities JSON | 写入 capabilitiesJson |
| U-017 | Machine Policy 读取 | GET /api/machines/:id/policy | 返回 policy_json |
| U-018 | Machine Policy 更新 | PUT policy_json | 落库 + 触发 sync 下发 |

#### Task Orchestrator

| # | 测试项 | 输入 | 预期 |
|---|--------|------|------|
| U-019 | 创建任务 | command.run | status=created |
| U-020 | 状态转换—入队 | created → queued | 写入 queued_at |
| U-021 | 状态转换—下发 | queued → dispatched | Client 在线 |
| U-022 | 状态转换—完成 | running → succeeded | result 写入 |
| U-023 | 状态转换—超时 | running + 超时 | status=timeout |
| U-024 | 状态转换—取消 | cancel | canceling→canceled |
| U-025 | 状态转换—确认 | running 命中 requireApprovalFor | Task approval_status=waiting_confirm + Approval(waiting) |
| U-026 | Client 离线时任务入队 | Client offline | waiting_client, 不 dispatch |
| U-027 | 优先级排序 | priority=5 和 priority=0 同时入队 | 先 dispatch priority=5 |

#### WebSocket Control Channel

| # | 测试项 | 输入 | 预期 |
|---|--------|------|------|
| U-028 | 消息路由—task.dispatch | task.dispatch 消息 | 转发到正确 Client |
| U-029 | 消息路由—task.event | task.event 消息 | 写入 task_events |
| U-030 | 消息路由—pi.terminal.open | 控制消息 | 转发到 PiTerminalGateway |
| U-031 | 消息路由—未知 type | 未知消息类型 | warn 日志，不 crash |

#### Pi Task Gateway

| # | 测试项 | 输入 | 预期 |
|---|--------|------|------|
| U-032 | PiTask JSON 生成 | pi.run 请求 | 生成正确 PiTask JSON |
| U-033 | 策略校验—toolMode=readonly | pi.run constraints.toolMode=readonly | spawn 含 --tools read,grep,find,ls |
| U-034 | 项目上下文自动加载 | pi.run cwd=项目目录 | Pi 自动加载 AGENTS.md（不依赖 loadProjectInstructions） |
| U-035 | PiSession 记录 | pi.run dispatch | pi_sessions 写入 |

#### Pi Terminal Gateway

| # | 测试项 | 输入 | 预期 |
|---|--------|------|------|
| U-036 | 会话登记 | POST /api/pi/terminal | sessionId + attachToken |
| U-037 | 会话鉴权 | attach WS 带 token | 通过 |
| U-038 | 会话鉴权—无效 token | 错误 attachToken | 403 |
| U-039 | 多路复用—Web↔Client 桥接 | Web 发 pi.rpc.command | 转发到 Client 控制通道 |
| U-040 | 多路复用—Client→Web 桥接 | Client 发 pi.rpc.event | 转发到 Web attach WS |
| U-041 | 会话配额—超限 | 第 N+1 个会话 | 拒绝 + 错误码 |
| U-042 | 空闲超时检测 | detached + 超 idleTimeout | 自动 close |

#### Runbook / Approval / Sync

| # | 测试项 | 输入 | 预期 |
|---|--------|------|------|
| U-042a | Runbook 更新版本 | PUT code | 生成 RunbookVersion，latestVersionId 更新 |
| U-042b | RunbookRun 创建 | runbook.run | 记录 runbookVersionId 和 params |
| U-042c | RunbookRun 等待审批 | approve() | status=waiting_approval + Approval(waiting) |
| U-042d | Approval 通过 | approve approval | status=approved，RunbookRun 恢复 running |
| U-042e | SyncJob 计划 | local/remote manifest | missing/changed/conflict 计划正确 |
| U-042f | SyncJob 默认冲突 | conflict=skip | 不覆盖，记录 conflict |
| U-042g | SyncJob 幂等恢复 | 同 idempotencyKey | 返回已有 SyncJob |

#### Todo / Context / Tag

| # | 测试项 | 输入 | 预期 |
|---|--------|------|------|
| U-042h | Tag 创建 | name=前端 | tags 入库，name 唯一 |
| U-042i | Tag 归档 | DELETE /api/tags/:id | archived_at 非空，历史 Todo 仍可展开显示 |
| U-042j | Context 创建 | machineIds 含存在机器 + markdown | contexts 入库，machine_ids_json 正确 |
| U-042k | Context 机器校验 | machineIds 含不存在机器 | 400 MACHINE_NOT_FOUND |
| U-042l | Context 归档保护 | 引用 archived context 的 Todo claim | 409 CONTEXT_ARCHIVED |
| U-042m | Todo 创建顶层 | parentId=null | status=todo, priority 默认 0 |
| U-042n | Todo 创建子任务 | parentId 指向顶层 Todo | 创建成功，继承父 context 可计算 |
| U-042o | 禁止第三层 Todo | parentId 指向子任务 | 400 TODO_DEPTH_LIMIT |
| U-042p | ready 冻结 | doing Todo PATCH ready=false | 409 READY_LOCKED |
| U-042q | leafOnly 查询 | 父 + 子混合数据 | 只返回无子任务 Todo |
| U-042r | claim 原子性 | 两个 VCP 同时 claim | 一个成功，一个 409 ALREADY_CLAIMED |
| U-042s | VCP 顶层 leaf report done | assignee=vcp:诺娃 | status=awaiting_confirmation |
| U-042t | VCP 子任务 report done | parent 有多个子任务 | 子任务 done，父状态按子任务聚合 |
| U-042u | 父 Todo confirm | 所有子任务 done | 父 status=done |
| U-042v | 父 Todo failed 子任务阻止 confirm | 任一子任务 failed | 409 CHILD_NOT_DONE |
| U-042w | report task links | executedTaskIds 存在 | todo_task_links 写入 |
| U-042x | report task links 校验 | executedTaskIds 不存在 | 400 TASK_NOT_FOUND |
| U-042y | Runbook ready=true 校验 | 缺 contextId 或 description | 400 TODO_NOT_READY_ENOUGH |

#### Release Center

| # | 测试项 | 输入 | 预期 |
|---|--------|------|------|
| U-043 | 版本上传 | 上传 manifest + artifact | release 记录入库 |
| U-044 | Manifest 解析 | 正常 manifest JSON | 正确解析所有组件 |
| U-045 | Manifest 解析—格式错误 | 缺少 version 字段 | 错误提示 |
| U-046 | sha256 计算 | artifact 文件 | 正确哈希值 |
| U-047 | 灰度发布 | channel=beta, 部分机器 | 只有 beta 机器收到更新 |
| U-048 | 回滚任务创建 | rollback | 创建回滚 task |

#### Install Script Center

| # | 测试项 | 输入 | 预期 |
|---|--------|------|------|
| U-049 | 安装令牌创建 | 创建 token | token_hash 入库 |
| U-050 | PowerShell 脚本生成 | GET /install/client.ps1?token=xxx | 合法 PowerShell |
| U-051 | Bash 脚本生成 | GET /install/client.sh?token=xxx | 合法 Bash |
| U-052 | 令牌过期 | 过期 token 请求 | 拒绝 |
| U-053 | 令牌使用次数 | usedCount 达到 maxUses | 拒绝 |
| U-054 | 安装配置下发 | GET /api/install/config | 含 initialPolicy |

#### Storage Provider

| # | 测试项 | 输入 | 预期 |
|---|--------|------|------|
| U-055 | upload（mock 实现） | 文件路径 + 文件名 | 返回 fileId, sha256 |
| U-056 | getDownloadUrl（mock 实现） | fileId | 返回 url + expireAt |
| U-057 | createShareLink（mock 实现） | fileId | 返回 url |

#### FRP Control

| # | 测试项 | 输入 | 预期 |
|---|--------|------|------|
| U-058 | 映射创建 | frp.open | frp_mappings 写入 |
| U-059 | 映射过期检测 | 超过 expireAt | 自动 close |
| U-060 | 敏感端口确认 | localPort=22 | 触发 approval_request |

#### Audit Log

| # | 测试项 | 输入 | 预期 |
|---|--------|------|------|
| U-061 | 审计写入 | task.succeeded | audit_logs 写入完整字段 |
| U-062 | 脱敏—token | payload 含 token | token 不出现在 detail_json |
| U-063 | 脱敏—password | payload 含 password | password 不出现在 detail_json |
| U-064 | 脱敏—api_key | payload 含 api_key | api_key 不出现在 detail_json |
| U-065 | source 溯源 | cli + actor=skill-name | source=cli, actor=skill-name |

---

### 3.2 Client 模块

#### Supervisor

| # | 测试项 | 输入 | 预期 |
|---|--------|------|------|
| U-066 | 配置加载 | 正常 config.json | 所有字段正确解析 |
| U-067 | 配置加载—缺少必填字段 | 无 gatewayUrl | 报错 + 退出 |
| U-068 | 模块生命周期管理 | 启动/停止各模块 | 按依赖顺序启动/停止 |

#### WS Client

| # | 测试项 | 输入 | 预期 |
|---|--------|------|------|
| U-069 | 连接成功 | 正常 gatewayUrl | connected |
| U-070 | 连接失败—重试 | gateway 不可达 | 按退避策略重试 |
| U-071 | 断线重连 | 主动断开 WS | 自动重连 |
| U-072 | 心跳定时发送 | 连接中 | 按间隔发送 client.heartbeat |
| U-073 | 消息接收—task.dispatch | 收到 dispatch | 交给 TaskRunner |

#### Task Runner

| # | 测试项 | 输入 | 预期 |
|---|--------|------|------|
| U-074 | taskType 路由 | command.run | 交给 CommandExecutor |
| U-075 | taskType 路由 | file.read | 交给 FileOperator |
| U-076 | taskType 路由 | pi.run | 交给 PiAgentManager |
| U-077 | taskType 路由—未知类型 | unknown.type | 上报 task.failed |
| U-078 | 并发控制—未超限 | 并发数 < 限制 | 同时执行 |
| U-079 | 并发控制—超限 | 并发数 ≥ 限制 | 排队等待 |
| U-080 | 优先级队列 | priority=5 和 0 | 先执行 5 |
| U-081 | Pi 任务独立池 | pi.run + command.run 并发 | pi 不饿死 command |
| U-082 | 超时控制 | 超时后 | 上报 timeout |
| U-083 | 取消任务 | cancel | 停止执行 + 上报 canceled |
| U-083a | taskType 路由—browser.run | browser.run | 交给 BrowserUseManager |
| U-083b | taskType 路由—computer.run | computer.run | 交给 ComputerUseManager |
| U-083c | desktop lock | 同一 desktop session 两个 computer.run | 第二个默认 COMPUTER_DESKTOP_BUSY |

#### File Operator

| # | 测试项 | 输入 | 预期 |
|---|--------|------|------|
| U-084 | file.list | 正常目录 | 文件列表 |
| U-085 | file.read | 正常文件路径 | 文件内容 |
| U-086 | file.write | 正常路径 + 内容 | 文件创建 |
| U-087 | file.delete | 正常文件路径 | 文件删除 |
| U-088 | file.rename | 正常路径 | 文件重命名 |
| U-089 | file.move | 正常路径 | 文件移动 |
| U-090 | file.copy | 正常源+目标 | 文件复制 |
| U-091 | file.mkdir | 正常路径 | 目录创建 |
| U-092 | file.stat | 正常路径 | 文件元信息 |
| U-093 | file.checksum | 正常路径 | sha256 |
| U-094 | file.compress | 正常目录 | 压缩包 |
| U-095 | 路径策略—允许路径 | allowedPaths 内 | 正常执行 |
| U-096 | 路径策略—禁止路径 | blockedPaths 内 | 拒绝 + 上报 |
| U-097 | 路径策略—路径遍历 attack | `../../../etc/passwd` | 归一化后拒绝 |
| U-098 | 路径策略—符号链接 attack | 符号链接到 blocked | 拒绝 |
| U-099a | disk.list—Windows | 枚举所有盘符 | 返回 C:/D:/E:… 全部 DiskInfo |
| U-099b | disk.list—Linux | 枚举所有挂载点 | 返回 / /home /var /data… 全部 DiskInfo |
| U-099c | disk.list—包含只读盘 | 只读挂载 | readonly=true |
| U-099d | disk.list—包含网络挂载 | NFS/SMB 挂载 | 正常上报，fsType 标记 |
| U-099e | disk.list—系统盘标记 | 枚举结果 | C: / / 的 system=true |
| U-099f | file.write—空间充足 | 目标盘 free ≥ 文件大小+余量 | 正常写入 |
| U-099g | file.write—空间不足 | 目标盘 free < 文件大小 | task.failed + DISK_FULL 错误码 |
| U-099h | file.import_from_cloud—空间不足 | 云盘文件 > 目标盘 free | 拒绝下发 + DISK_FULL |
| U-099i | pi.run—工作目录盘空间不足 | 项目盘 free < 阈值 | 告警但仍允许（仅预警，不阻断）|

#### Command Executor

| # | 测试项 | 输入 | 预期 |
|---|--------|------|------|
| U-099 | powershell 执行 | `node -v` | stdout + exitCode 0 |
| U-100 | cmd 执行 | `dir` | stdout + exitCode 0 |
| U-101 | bash 执行 | `whoami` | stdout + exitCode 0 |
| U-102 | 超时 | `sleep 999` + timeout=1s | 超时上报 |
| U-103 | cwd 指定 | cwd=/tmp | 在该目录执行 |
| U-104 | env 注入 | env={KEY:val} | 子进程可见 KEY |
| U-105 | stdout/stderr 流式 | 流输出命令 | 分 chunk 回传 |
| U-106 | 高风险命令确认 | `rm -rf /` | 触发 approval_request |
| U-107 | 取消执行 | cancel | SIGTERM → 上报 canceled |

#### Script Runner

| # | 测试项 | 输入 | 预期 |
|---|--------|------|------|
| U-108 | 脚本执行 | 正常脚本内容 | stdout + exitCode |
| U-109 | 脚本 sha256 校验 | 正确哈希 | 通过 |
| U-110 | 脚本 sha256 校验—不匹配 | 错误哈希 | 拒绝执行 |

#### Pi Agent Manager

| # | 测试项 | 输入 | 预期 |
|---|--------|------|------|
| U-111 | pi.check—已安装 | pi 可执行 | installed=true, ready=true |
| U-112 | pi.check—未安装 | pi 不可执行 | installed=false |
| U-113 | pi.install | 触发安装 | 安装成功 |
| U-114 | pi.configure | 写 settings | settings.json 正确 |
| U-115 | pi.run—rpc 单向驱动 | spawn, stdin prompt | 读取事件流 |
| U-116 | pi.run—收到 agent_end | agent_end 事件 | 关闭进程 + 采集结果 |
| U-117 | PiEventParser—message | message 事件 | → pi.message |
| U-118 | PiEventParser—tool_call | tool_execution_start | → pi.tool_call |
| U-119 | PiEventParser—command | 命令事件 | → pi.command |
| U-120 | PiEventParser—file_changed | 文件变更事件 | → pi.file_changed |
| U-121 | PiEventParser—summary | 总结事件 | → pi.summary |
| U-122 | abort_bash | 单条 bash hang | 停止该 bash，会话继续 |
| U-123 | abort | 优雅停止 | agent_end(aborted) + 干净收口 |
| U-124 | abort 无响应—兜底 SIGTERM→SIGKILL | abort 后无 agent_end | SIGTERM→SIGKILL, partial=true |
| U-125 | extension_ui_request 自动拒绝 | 批处理中弹窗 | 回 cancelled + 写审计 |
| U-126 | get_session_stats | 请求统计 | token/cost 回传 |
| U-127 | Provider Profile—local_only | keyInjection=local_only | 直接用本地 ~/.pi/agent/，不创建临时目录 |
| U-128 | Provider Profile—managed | keyInjection=managed | 创建临时目录 + 设置 Pi 配置目录环境变量（兼容设置 PI_AGENT_DIR 与 PI_CODING_AGENT_DIR） |
| U-129 | Provider Profile—fallback | 本地缺 provider | 用 Gateway Profile 创建临时目录 |
| U-130 | Provider Profile 脱敏 | Key 写入 | 不出现在任何事件/日志/审计 |
| U-131 | toolMode=full | pi.run toolMode=full | 不加 --tools flag |
| U-132 | toolMode=custom | customTools=[read,bash] | spawn 含 --tools read,bash |
| U-133 | approveMode=always | environment.approveMode=always | spawn 含 --approve |
| U-134 | approveMode=never | environment.approveMode=never | spawn 含 --no-approve |
| U-135 | policyGate 拦截 | pi.terminal 命中 rule | 弹确认 |
| U-136 | policyGate 自动拒绝 | pi.run 命中 rule | 自动拒绝+审计 |
| U-137 | Profile CRUD | 创建全局/机器级 Profile | 正确落库 |
| U-138 | Profile Key 加密 | 创建含 Key 的 Profile | 存密文，API 不返回明文 |
| U-139 | Profile Key 环境引用 | apiKeyEnvRef=$MY_KEY | 不落 Key，Client 从 env 读 |
| U-140 | 临时目录清理 | pi 进程退出 | <tmp>/noesis-pi-<taskId>/ 被删除 |

#### Pi Terminal Manager

| # | 测试项 | 输入 | 预期 |
|---|--------|------|------|
| U-141 | spawn pi --mode rpc | terminal.open | 进程启动 + sessionFile 产生 |
| U-142 | Web↔Client 双向桥接 | Web 发 prompt | stdin → pi 进程 |
| U-143 | pi 事件 → Web | pi 产生 message_update | stdout → Gateway → Web |
| U-144 | Detach 不杀进程 | Web attach WS 断开 | pi 进程继续运行 |
| U-145 | Idle 超时自动 close | detached + 超 idleTimeout | 自动 close |
| U-146 | Reattach | 重新 attach | 恢复事件流 |
| U-147 | Client 重启恢复 | 读 session-store | 重新 spawn + switch_session |
| U-148 | 会话清理—LRU | closed 超配 | 删最旧文件 |
| U-149 | 会话清理—保留引用 | 有 DB 引用 | 不删 |
| U-150 | 会话清理—配额检查 | 数量/大小超限 | 清理到配额内 |

#### Browser Use / Computer Use / Automation

| # | 测试项 | 输入 | 预期 |
|---|--------|------|------|
| U-150a | Browser macroFirst 高置信 | 匹配 macro score=0.9 | 自动执行 MacroVersion |
| U-150b | Browser profile busy | existing profile 已运行无 CDP | 触发 requestRestart Approval |
| U-150c | Browser fallback | 重启拒绝 | fallback computerUse 或 human required |
| U-150d | Computer pack 未安装 | computer.run | 返回 pack_not_installed |
| U-150e | Computer doctor | mock runtime/ocr/provider/storage | 返回 check 列表和 blocking 项 |
| U-150f | Computer repair 普通修复 | model_missing | 下载模型并重新自检 |
| U-150g | Elevated repair | install service | 创建 Approval + allowlist action，不接受任意命令 |
| U-150h | VLM 请求脱敏 | screenshot 含邮箱/token | 发送前打码，事件标记 redacted=true |
| U-150i | Macro step 失败修复 | step failure | VLM 修复继续，生成 candidate，不覆盖 active |
| U-150j | AutomationRunReport | task events + artifacts | 汇总 outcome/evidence/steps/artifacts |
| U-150k | Evidence 不足 | 只有模型自述完成 | outcome=needs_review |
| U-150l | Runbook 导出 | macro version=3 | 生成调用 runMacro(version:3) 的薄 Runbook |
| U-150m | WebRTC 接管 | control_taken | AI pause，报告记录 manualIntervention |
| U-150n | TURN Profile 脱敏 | credential_enc | API 不返回明文 credential |

#### Frpc Manager

| # | 测试项 | 输入 | 预期 |
|---|--------|------|------|
| U-151 | frpc 配置文件生成 | frp.open 参数 | 正确 frpc.ini |
| U-152 | frpc 启动 | 正常配置 | 进程启动 |
| U-153 | frpc 停止 | frp.close | 进程退出 |
| U-154 | 自动过期 | 到达 expireAt | 自动停止 frpc |

#### Updater

| # | 测试项 | 输入 | 预期 |
|---|--------|------|------|
| U-155 | 下载包 | downloadUrl | 文件下载到 staging |
| U-156 | sha256 校验—匹配 | 正确哈希 | 通过 |
| U-157 | sha256 校验—不匹配 | 错误哈希 | 拒绝 + 上报 |
| U-158 | 解压 staging | zip/tar.gz | 解压到 versions |
| U-159 | 切换 current | 更新完成 | current → 新版本 |
| U-160 | 健康检查—通过 | 新服务正常 | 上报成功 |
| U-161 | 健康检查—失败 | 新服务异常 | 自动回滚 |
| U-162 | 回滚 | rollback | current → 旧版本 |
| U-163 | 不覆盖 data 目录 | 更新 | data/machine-id 保持 |

#### Policy Engine

| # | 测试项 | 输入 | 预期 |
|---|--------|------|------|
| U-164 | machine.policy.sync 接收 | 收到 sync | 更新本地只读镜像 |
| U-165 | revision 判断 | revision 递增 | 更新；否则跳过 |
| U-166 | 断网时使用最后缓存 | WS 断连 | 仍可用本地镜像判定 |
| U-167 | 路径判定 | allowedPaths/blockedPaths | 正确判定 |
| U-168 | 命令判定 | allowCommand | 正确判定 |
| U-169 | Pi 判定 | allowPiRun | 正确判定 |
| U-170 | FRP 判定 | allowFrp | 正确判定 |
| U-171 | 确认判定 | requireApprovalFor | 正确判定 |

---

### 3.3 Shared 模块

| # | 测试项 | 输入 | 预期 |
|---|--------|------|------|
| U-172 | 协议 envelope 解析 | 正常 envelope | 正确解析 |
| U-173 | 协议 envelope 解析—缺少 version | 缺字段 | 报错 |
| U-174 | 消息类型注册表 | 所有已知 type | 正确映射 |
| U-175 | 消息类型—未知 type | 未知 type | 不 crash |

---

### 3.4 数据库

| # | 测试项 | 输入 | 预期 |
|---|--------|------|------|
| U-176 | Migration up | 执行迁移 | 所有表创建 + 索引 + 外键 |
| U-177 | Migration down | 回滚迁移 | 所有表删除 |
| U-178 | Migration 往返 | up + down + up | 数据一致性 |
| U-179 | 外键约束 | 插入无效 machine_id 的 task | 约束报错 |
| U-180 | WAL 模式 | 检查 journal_mode | = 'wal' |
| U-181 | VACUUM | VACUUM | 回收空间 |

---

## 四、集成测试目录

---

### 4.1 Gateway ↔ Client 通道

| # | 测试项 | 参与方 | 验证点 |
|---|--------|--------|--------|
| I-001 | Client 注册完整闭环 | Client + Gateway + DB | hello → 记录入库 → 状态 online |
| I-002 | 心跳保活 | Client + Gateway | heartbeat → lastSeenAt 更新 |
| I-003 | 超时离线 | Client + Gateway | 停止心跳 N 秒 → 状态 offline |
| I-004 | command.run 完整闭环 | Web/CLI + Gateway + Client | 创建→下发→执行→stdout→result |
| I-005 | file.read 完整闭环 | Web/CLI + Gateway + Client | 创建→下发→读取→返回内容 |
| I-006 | file.write 完整闭环 | Web/CLI + Gateway + Client | 创建→下发→写入→确认→file.read 验证 |
| I-007 | file.delete 完整闭环 | Web/CLI + Gateway + Client | 删除→file.list 验证不存在 |
| I-008 | file.import_from_cloud | Gateway + Client + mock StorageProvider | downloadUrl→下载→校验→写目标路径 |
| I-009 | file.export_to_cloud | Gateway + Client + mock StorageProvider | 读源文件→上传→返回 fileId/shareLink |
| I-010 | task.cancel | Gateway + Client | 下发 cancel→Client 停止执行→status=canceled |
| I-011 | task.approval—通过 | Gateway + Web + Client | 命中 requireApprovalFor→Approval(waiting)→确认通过→继续执行 |
| I-012 | task.approval—拒绝 | Gateway + Web + Client | 命中→确认拒绝→status=failed |
| I-013 | task.approval—超时 | Gateway + Client | Approval timeout→status=failed |
| I-014 | task 超时 | Gateway + Client | timeoutSeconds 到期→status=timeout |
| I-015 | Client 断连重连 reconcile | Client + Gateway | 断连→重连→hello→reconcile→对账 |
| I-016 | reconcile—任务存活 | Client + Gateway | 本地 running→恢复事件流 |
| I-017 | reconcile—任务丢失 | Client + Gateway | 本地 lost→Gateway 标记 `failed` |
| I-018 | machine.policy.sync | Gateway + Client | 更新 policy→sync 下发→Client 镜像更新 |
| I-018a | 磁盘上报—注册时 | Client + Gateway | hello.disks → 落库 machine.disksJson |
| I-018b | 磁盘上报—心跳更新 | Client + Gateway | heartbeat.disks → 刷新 disksJson |
| I-018c | 磁盘上报—Windows 多盘 | Client + Gateway | C:/D:/E: 全部入库 |
| I-018d | 磁盘上报—Linux 多分区 | Client + Gateway | / /home /var /data 全部入库 |
| I-018e | GET /api/machines/:id/disks | Web + Gateway | 返回 disksJson，离线机器返回空数组 |
| I-018f | computerUse capability 上报 | Client hello | Gateway 写入 capabilitiesJson，机器详情显示 Computer Use 状态 |
| I-018g | browserUse capability 上报 | Client hello | Gateway 写入 capabilitiesJson，可创建 browser.run |

### 4.2 Pi Agent 集成

| # | 测试项 | 参与方 | 验证点 |
|---|--------|--------|--------|
| I-019 | pi.run 完整闭环（mock Pi） | Gateway + Client + mock Pi | 创建→dispatch→spawn→事件流→agent_end→result |
| I-020 | pi.run—abort_bash（mock Pi） | Gateway + Client + mock Pi | bash hang→发 abort_bash→bash 停止→会话继续 |
| I-021 | pi.run—超时 partial | Gateway + Client + mock Pi | 超时→abort→无响应→SIGKILL→result 带 partial=true |
| I-022 | pi.run—Provider Profile local_only | Gateway + Client + mock Pi | 不创建临时目录→用本地 ~/.pi/agent/→spawn 成功 |
| I-023 | pi.run—Provider Profile managed | Gateway + Client + mock Pi | 创建临时目录→设置 Pi 配置目录环境变量（兼容 PI_AGENT_DIR 与 PI_CODING_AGENT_DIR）→models.json/auth.json 合成 |
| I-024 | pi.run—Provider Profile fallback | Gateway + Client + mock Pi | 本地缺 provider→用 Gateway Profile 创建临时目录 |
| I-025 | pi.run—extension_ui_request 自动拒绝 | Gateway + Client + mock Pi | 批处理中弹窗→自动 cancelled→审计 |
| I-026 | pi.terminal 打开 | Web + Gateway + Client + mock Pi | POST→Gateway dispatch→Client spawn→sessionId 返回 |
| I-027 | pi.terminal attach | Web + Gateway + Client + mock Pi | Web 连接 attach WS→双向桥接建立 |
| I-028 | pi.terminal 双向消息 | Web + Gateway + Client + mock Pi | Web 发 prompt→pi 收到→pi 事件→Web 收到 |
| I-029 | pi.terminal detach | Web + Gateway + Client | Web 断开 attach WS→pi 进程仍然存活 |
| I-030 | pi.terminal reattach | Web + Gateway + Client | 重新 attach→恢复事件流 |
| I-031 | pi.terminal idle 超时关闭 | Gateway + Client | detached 超 idleTimeout→自动 close |
| I-032 | pi.terminal 扩展 UI 弹窗 | Web + Gateway + Client + mock Pi | pi 弹 confirm→Web 渲染对话框→用户确认→pi 收到 |
| I-033 | pi.terminal policy-gate 确认拦截 | Web + Gateway + Client + mock Pi | 命中 policyGate.rules→Gateway 拦截→Web 确认→继续/拒绝 |

### 4.3 发布与更新

| # | 测试项 | 参与方 | 验证点 |
|---|--------|--------|--------|
| I-034 | Client 自更新—成功 | Gateway + Client + mock Cloud | download→校验→解压→切换→健康检查→上报成功 |
| I-035 | Client 自更新—下载失败 | Gateway + Client | download 失败→上报 failed |
| I-036 | Client 自更新—校验失败 | Gateway + Client | sha256 不匹配→上报 failed |
| I-037 | Client 自更新—健康检查失败回滚 | Gateway + Client | 健康检查失败→rollback→切回旧版本→上报 failed |
| I-038 | 一键安装 Windows | Gateway + Target | token 创建→ps1 下载→执行→Client hello→注册 |
| I-039 | 一键安装 Linux | Gateway + Target | token 创建→sh 下载→执行→Client hello→注册 |
| I-040 | 安装令牌过期 | Gateway | 过期 token→拒绝 |

### 4.4 FRP

| # | 测试项 | 参与方 | 验证点 |
|---|--------|--------|--------|
| I-041 | FRP 映射开启 | Gateway + Client + mock frpc | frp.open→配置文件生成→frpc 启动→active→返回入口 |
| I-042 | FRP 映射关闭 | Gateway + Client + mock frpc | frp.close→frpc 停止→status=closed |
| I-043 | FRP 自动过期 | Gateway + Client | expireAt 到达→自动 closed |

### 4.5 审计

| # | 测试项 | 参与方 | 验证点 |
|---|--------|--------|--------|
| I-044 | 审计完整覆盖 | 所有模块 | 每个操作→audit_logs 有对应记录 |
| I-045 | 审计脱敏—Provider Profile Key | Pi 相关操作 | Key 明文不出现在 audit_logs.detail_json |
| I-046 | 审计脱敏—token/password | Auth 相关操作 | 不出现在 audit_logs |
| I-047 | 审计 source 溯源—web | Web 操作 | source=web |
| I-048 | 审计 source 溯源—cli | CLI 操作 | source=cli, actor=skill 名 |
| I-048a | 审计 source 溯源—sdk | SDK 操作 | source=sdk, actor=deploy-script |
| I-048aa | 审计 source 溯源—VCP | VCP SDK 操作 | source=ai-agent, actor=vcp:<agentName>, Todo assignee 同步 |

### 4.6 Todo / Context / VCP 协作

| # | 测试项 | 参与方 | 验证点 |
|---|--------|--------|--------|
| I-048ab | VCP 候选查询 | Gateway + DB | 只返回 unassigned + ready + leaf + status=todo + 未归档 context |
| I-048ac | VCP claim/report done 顶层 leaf | SDK mock VCP + Gateway | claim→doing，report done→awaiting_confirmation，confirm→done |
| I-048ad | VCP 子任务聚合 | SDK mock VCP + Gateway | 子任务 done 后父 awaiting_confirmation，用户 confirm 父 done |
| I-048ae | VCP report failed | SDK mock VCP + Gateway | Todo failed，resultSummary 记录已完成/剩余 |
| I-048af | todo_task_links | VCP 执行 command.run 后 report | Todo 详情 include=tasks 展开 Task 证据 |
| I-048ag | Runbook todo.create ready=true | RunbookRuntime + TodoService | 有 contextId+description 才可 ready=true |
| I-048ah | Context 编辑触发重新评估依据 | Context 更新 | Todo updatedAt/context updatedAt 可用于 VCP skipCache 失效 |
| I-048ai | CLI Todo 命令 | CLI + Gateway | `noesis todo list/claim/report --json` 合法且审计正确 |

### 4.7 Browser / Computer / Automation

| # | 测试项 | 参与方 | 验证点 |
|---|--------|--------|--------|
| I-048b | computer.install | Web + Gateway + Client + mock StorageProvider | 下载 pack→sha256→解压→doctor→capability available |
| I-048c | computer.run 完整闭环 | CLI + Gateway + Client + mock enikk | 创建→dispatch→step events→result→AutomationRunReport |
| I-048d | computer.run 敏感动作 | Client + Gateway + Web | proposed send/delete→Approval waiting→确认后继续 |
| I-048e | browser.run DOM 成功 | CLI + Gateway + Client + mock browser | DOM click→download artifact→report success |
| I-048f | browser.run fallback computerUse | mock browser CDP 失败 | report kind=mixed，fallback reason 记录 |
| I-048g | macro candidate approve | Web + Gateway + DB | candidate→macro version active→下次 macroFirst 命中 |
| I-048h | report save bundle | Web + Gateway + mock StorageProvider | 关键帧/replay bundle 上传 storage_files |
| I-048i | WebRTC signaling | Web + Gateway + Client | offer/answer/ice 转发，媒体不经 Gateway |
| I-048j | Pi 通过 noesis 调 computer | mock Pi + CLI + Gateway | 短期 Agent Token source=ai-agent，审计 actor=pi-session |

### 4.8 SDK / CLI

| # | 测试项 | 参与方 | 验证点 |
|---|--------|--------|--------|
| I-049 | SDK connect | SDK + Gateway | /health + /gateway/info，capabilities 可用 |
| I-050 | SDK watch fallback | SDK + Gateway | WS 失败后轮询 /events，sinceEventId 不丢事件 |
| I-051 | SDK wait 失败语义 | SDK + Gateway | failed 终态抛 NoesisError，details 带最终对象 |
| I-052 | SDK Node upload 断点续传 | SDK + mock Cloud + Gateway | 中断后 checkpoint 恢复未完成分片 |
| I-053 | SDK syncUpload | SDK + Gateway + Client | SyncJob→TransferJob→完成，默认 conflict=skip |
| I-054 | SDK syncDownload | SDK + Gateway + Client | .part 续写→校验→rename |
| I-055 | `noesis machines` | CLI + Gateway | 返回机器列表 |
| I-056 | `noesis command run` | CLI + Gateway | 任务创建 + 返回 taskId |
| I-057 | `noesis file read` | CLI + Gateway + Client | 返回文件内容 |
| I-058 | `noesis pi run` | CLI + Gateway + Client + mock Pi | pi.run 任务创建 + 事件流 |
| I-059 | `noesis runbook run` | CLI + Gateway | 创建 RunbookRun，输出 runId |
| I-060 | `noesis sync upload/download` | CLI + SDK + Gateway | 创建 SyncJob，显示进度 |
| I-061 | `noesis --json` 输出 | CLI | 合法 JSON, 可被 jq 解析 |
| I-062 | 每个 skill SKILL.md 端到端 | skill 描述 + CLI | 按 skill 步骤执行完整 |
| I-063 | `noesis computer run/report` | CLI + Gateway + Client | 返回 taskId，report --json 合法 |
| I-064 | `noesis browser run` | CLI + Gateway + Client | browser.run 创建，事件流可 watch |
| I-065 | `noesis computer macro export-runbook` | CLI + Gateway | 生成 RunbookVersion，锁定 MacroVersion |
| I-066 | SDK Todo typed API | SDK + Gateway | todos/contexts/tags 方法类型和请求响应匹配 shared schema |
| I-067 | SDK ESM/CJS 双产物 | Node ESM/CJS sample | VCP 插件可直接 import/require SDK |

---

## 五、E2E 测试目录

| # | 测试项 | 场景 | Playwright 验证点 |
|---|--------|------|-----------------|
| E-001 | Windows Client 注册上线 | 安装 + 启动 | Gateway 仪表盘显示机器 online |
| E-002 | Linux Client 注册上线 | 安装 + 启动 | Gateway 仪表盘显示机器 online |
| E-003 | 命令执行 + 实时日志 | Web 输入 `node -v` | 实时 stdout 展示 + task.status=succeeded |
| E-004 | 文件浏览 + 读取 | Web 文件管理器 | 展开目录 + 点击文件预览内容 |
| E-005 | 文件写入 | Web 编辑 + 保存 | 保存后读取验证内容一致 |
| E-006 | 大文件导入 | Web 导入 | 进度条 + 完成 + 机器上文件存在 |
| E-007 | 大文件导出 | Web 导出 | 返回下载链接 + sha256 |
| E-008 | Client 自更新 | Web 触发更新 | 机器短暂离线→重新上线→新版本号 |
| E-009 | Client 自更新失败回滚 | 模拟失败 | 版本未变 + 仪表盘显示更新失败 |
| E-010 | Pi 批处理任务 | Web 创建 pi.run | 事件流展示 + task.result 含 summary |
| E-011 | Pi 交互终端 | Web 打开 pi.terminal | 输入 prompt→流式响应→工具卡渲染 |
| E-012 | Pi 终端 detach + reattach | 关闭浏览器标签→重新打开 | 会话恢复 + 历史消息可见 |
| E-013 | FRP 临时映射 | Web 开启映射 | 显示公网入口 + 可访问 + 自动过期 |
| E-014 | 机器详情仪表盘 | Web 浏览 machine detail | 5 个 Tab 均正常渲染 + 数据正确 |
| E-015 | 审计日志查询 | Web 审计页面 | 操作记录完整 + 脱敏正确 |
| E-016 | 安装令牌创建 + 使用 | Web 创建 token→目标机器安装 | 机器上线 |
| E-017 | 暗色/亮色主题切换 | Web 设置 | 全部页面正常渲染 |
| E-018 | 移动端响应式 | 移动端视口 | 布局自适应 |
| E-019 | Runbook 执行 + 审批 | Web 创建 RunbookRun | trace 展示，Approval 待确认→通过→继续 |
| E-020 | Sync 目录上传恢复 | Web/CLI/SDK 触发同步 | 中断后恢复，最终远端文件一致 |
| E-021 | SDK Node 脚本快速开始 | 外部项目脚本 | `createClientFromEnv`→command.run→wait 成功 |
| E-022 | Todo / Context / VCP 协作 | Web 创建 Context/Tag/Todo，VCP mock 领取 | ready leaf 被 claim→report→用户 confirm 后 done |
| E-023 | Todo 子任务父确认 | Web 创建父 Todo + 子任务，VCP mock 完成子任务 | 父进入 awaiting_confirmation，failed 子任务阻止 confirm |
| E-024 | Computer Use 安装自检 | Web 机器详情 | 安装能力包→自检通过→启用按钮可用 |
| E-025 | Computer Use 运行报告 | Web/CLI 发起任务 | step timeline + evidence + outcome 展示 |
| E-026 | Browser Use 导出文件 | Web/CLI 发起 browser.run | 下载文件存在，报告记录 artifact |
| E-027 | Macro 采纳复用 | 首次 agent 成功→采纳候选→二次执行 | 二次命中 macroFirst，VLM 调用减少 |
| E-028 | WebRTC 人工接管 | 运行中任务打开接管 | AI pause→用户控制→释放→resume/cancel |

---

## 六、属性测试（Property-Based Testing）

适用于算法密集、边界丰富的模块：

| # | 模块 | 属性 |
|---|------|------|
| P-001 | Task Orchestrator | 任意合法任务入队后，队列长度 +1；出队后 -1 |
| P-002 | Task 状态机 | 任意合法状态转换，终态只能是 succeeded/failed/canceled/timeout |
| P-003 | FileOperator 路径归一化 | 对任意路径，归一化后不含 `..` 且以 allowedPaths 为前缀 |
| P-004 | PolicyEngine | 对任意策略 + 任意操作，判定结果只依赖策略字段 |
| P-005 | Manifest 解析 | 对任意合法 manifest，解析后组件版本与输入一致 |
| P-006 | sha256 计算 | 对任意相同输入，两次计算完全一致 |
| P-007 | Script 编解码 | content 编码再解码 = 原 content |
| P-008 | Pi Session 清理 LRU | 对任意 closed 会话集合，清理后数量 ≤ 配额 |
| P-009 | 安装令牌 | 对任意令牌使用，usedCount ≤ maxUses |
| P-010 | 幂等记录 | 同 scope/key/payload 任意重试只创建一个资源 |
| P-011 | Sync manifest diff | 任意本地/远端 manifest，missing/changed/conflict 分类互斥且完整 |

---

## 七、契约测试（Contract Testing）

适用于 Gateway ↔ Client 协议：

| # | 消费方 | 提供方 | 契约 |
|---|--------|--------|------|
| C-001 | Client | Gateway WS | client.hello 消息格式 + 响应格式 |
| C-001a | Client | Gateway WS | browserUse/computerUse capability 子对象格式 |
| C-001b | Client | Gateway WS | automation.step / recovered_by_vlm / webrtc.control_taken event 格式 |
| C-002 | Client | Gateway WS | task.dispatch 消息格式 |
| C-003 | Gateway | Client | task.event 消息格式 |
| C-004 | Gateway | Client | task.result 消息格式 |
| C-005 | Web | Gateway HTTP | POST /api/tasks 请求/响应格式 |
| C-006 | Web | Gateway HTTP | GET /api/machines 响应格式 |
| C-007 | Web | Gateway WS | /ws/pi/terminal/:id attach 帧格式 |
| C-008 | CLI | Gateway HTTP | 所有 noesis 命令的 --json 输出格式 |
| C-009 | SDK | Gateway HTTP/WS | typed API 请求/响应 + NoesisError 格式 |
| C-010 | SDK | Gateway event streams | event.id / sinceEventId 游标契约 |
| C-011 | SDK | Gateway Sync API | SyncJob / TransferJob / progress 事件格式 |

---

## 八、故障注入测试

| # | 故障 | 注入方法 | 预期行为 |
|---|------|---------|---------|
| F-001 | Gateway 进程崩溃 | kill gateway 进程 | Client 断连→重试→Gateway 重启→Client 重连→reconcile |
| F-002 | Client 进程崩溃 | kill client 进程 | Gateway 检测离线→reconnect→reconcile |
| F-003 | WebSocket 断连 | 断开 WS 连接 | Client 自动重连→reconcile |
| F-004 | SQLite 文件损坏 | 破坏 DB 文件 | 启动时检测→报错→提示恢复 |
| F-005 | 磁盘空间满 | 填充磁盘 | 文件写入失败→task.failed + 明确错误信息 |
| F-006 | 内存压力 | 大文件操作 + 长时间 Pi 会话 | 不 OOM + 无内存泄漏 |
| F-007 | 并发任务风暴 | 同时下发 50 个任务 | 不丢任务 + 不 crash + 按优先级执行 |
| F-008 | Pi 进程僵尸 | kill -9 pi 进程 | PiAgentManager 检测→上报 pi.error |
| F-009 | 大量事件流 | 模拟高频 stdout（yes 命令） | 窗口限流生效 + 不撑爆 WS 通道 |
| F-010 | SDK 上传进程中断 | kill Node 脚本 | checkpoint 保留，同 idempotencyKey 恢复 |
| F-011 | WS 被代理阻断 | 拒绝 WS 握手 | SDK watch 自动降级 polling |
| F-012 | Runbook 挂起后 Gateway 重启 | approve() 后 kill Gateway | snapshot 落库，重启后审批恢复 |

---

## 九、架构适应度函数

| # | 约束 | 检测方式 |
|---|------|---------|
| A-001 | Server 模块间无循环依赖 | madge / dependency-cruiser, CI 阻断 |
| A-002 | Client 模块间无循环依赖 | madge, CI 阻断 |
| A-003 | 数据库写只经过 Repository 抽象层 | eslint rule + grep 测试 |
| A-004 | 敏感字段（password/token/api_key）不出现日志 | 测试扫描 pino 输出 |
| A-005 | 所有 HTTP 路由有 requestId | supertest 遍历所有路由 |
| A-006 | shared/protocol 不依赖 server/client | madge 验证 |
| A-007 | Client 不依赖 server 任何模块 | madge 验证 |

---

## 十、CI 流水线

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm lint          # eslint + prettier
      - run: pnpm typecheck     # tsc --noEmit

  unit-test:
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test:unit --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  integration-test:
    needs: unit-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test:integration

  e2e-test:
    needs: integration-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm exec playwright install --with-deps
      - run: pnpm test:e2e

  architecture-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm madge --circular packages/
      - run: pnpm test:architecture  # 架构适应度函数
```

时间线：

```
lint + typecheck        < 30 秒
unit-test               < 1 分钟
integration-test        < 3 分钟
e2e-test                < 5 分钟
architecture-check      < 30 秒

总计：< 10 分钟
```

---

## 十一、测试覆盖率底线

| 指标 | 最低 | 目标 |
|------|------|------|
| 行覆盖率（全局） | ≥ 60% | ≥ 80% |
| 分支覆盖率（全局） | ≥ 50% | ≥ 70% |
| Task Orchestrator 行覆盖率 | ≥ 80% | ≥ 95% |
| Policy Engine 行覆盖率 | ≥ 80% | ≥ 95% |
| Pi Agent Manager 行覆盖率 | ≥ 80% | ≥ 95% |
| File Operator 行覆盖率 | ≥ 80% | ≥ 95% |
| Updater 行覆盖率 | ≥ 80% | ≥ 95% |
| 异常路径覆盖率 | 100%（每个异常 ≥ 1 个测试）| — |
| 变异测试存活率 | ≤ 30% | ≤ 10%（核心模块阶段性跑）|

---

## 十二、测试数据管理

```text
tests/
├── fixtures/              # 静态测试数据
│   ├── configs/           # client-config, server-config 各场景
│   ├── policies/          # machine policy 各场景
│   ├── manifests/         # release manifest 各版本
│   ├── files/             # 测试用文件
│   └── rpc-events/        # mock Pi RPC JSONL 事件流
├── helpers/               # 测试工具函数
│   ├── create-test-machine.ts
│   ├── create-test-task.ts
│   ├── mock-ws-server.ts
│   ├── mock-ws-client.ts
│   ├── mock-pi-process.ts
│   ├── mock-storage-provider.ts
│   └── test-db.ts         # 内存 SQLite 初始化 + 迁移
└── e2e/
    └── fixtures/          # Playwright test fixtures
```

**铁律：**

- 每个测试独立，不依赖其他测试的执行顺序
- 使用 factory 函数而非静态 JSON 文件（防止数据腐化）
- 敏感数据（token/key）在 fixtures 中用 `replace_with_*` 占位

---

## 十三、缺失对照（15 原版 vs 本方案）

| 原版 15 覆盖 | 本方案新增 |
|-------------|-----------|
| 8 条单元测试 | 190 条单元测试 |
| 13 条集成测试 | 54 条集成测试 |
| 9 条 E2E | 18 条 E2E |
| 0 条属性测试 | 9 条属性测试 |
| 0 条契约测试 | 8 条契约测试 |
| 0 条故障注入 | 9 条故障注入 |
| 0 条架构适应度 | 7 条架构适应度 |
| 无 CI 设计 | 完整 CI 流水线 |
| 无覆盖率目标 | 分层覆盖率底线 |
| 无测试环境说明 | 完整 mock 策略 + 测试目录结构 |

---

> 本测试方案基于 SOP v3.1 铁律 0 设计，目标：`npm test` 一次跑通，CI < 10 分钟，核心模块覆盖率 ≥ 80%。
