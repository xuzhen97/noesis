# 14. Node 技术栈与项目结构

## 选型原则

- TypeScript 优先。
- Server / Client / Web / CLI 统一语言。
- Windows / Linux 跨平台。
- 方便打包和分发。
- Web UI 用 utility-first + 组件抽象，避免维护独立样式系统。
- SQLite 起步。
- WebSocket 控制通道。
- 大文件不经 Server 应用中转。

## 推荐技术栈

### Monorepo

- pnpm workspace。
- TypeScript。
- tsup / esbuild。
- vitest。
- eslint / prettier。

### Server

- Node.js。
- Fastify 或 Hono。
- ws。
- better-sqlite3 或 drizzle + sqlite。
- zod。
- pino。
- jose。

### Client

- Node.js。
- TypeScript。
- ws client。
- execa。
- fs-extra。
- tar / zip。
- Windows Service / systemd。
- 独立 updater。

### Web UI

- React。
- Vite。
- TypeScript。
- Tailwind CSS v4（`@tailwindcss/vite` 插件，utility-first）。
- shadcn/ui（基于 Radix UI + Tailwind 的可复制组件，Dialog/Select/Tabs/DropdownMenu 等开箱即用）。
- `@tailwindcss/typography`（Pi 流式 markdown / diff 富文本区域用 `prose` 排版，避免逐元素手写 utility）。
- TanStack Query。
- Zustand。
- React Router。
- xterm.js。
- Monaco Editor。

> Web UI 样式策略：utility-first + 组件抽象。原子小组件（Badge/Button/Card/Dialog）抽成 shadcn/ui 式可复用组件，业务页面才直接铺 utility；xterm.js / Monaco 自带主题与尺寸系统，只用 Tailwind 包外层容器，不覆盖内部样式。

### SDK

- TypeScript。
- tsup 双产物（ESM + CJS）。
- Node.js 20+。
- 原生 `fetch` 优先，支持自定义 transport 注入。
- WebSocket 事件流封装为 `AsyncIterable`。
- Node 子入口提供文件上传下载、目录同步、checkpoint、`createClientFromEnv()`。

### CLI

- commander。
- prompts。
- ora。
- chalk。
- 依赖 `@noesis/sdk`，只负责命令解析、人类可读输出和 `--json` 输出。

## Monorepo 结构

```text
noesis/
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json

  packages/
    shared/
      src/protocol/
      src/schemas/
      src/types/

    server/
      src/main.ts
      src/api/
      src/auth/
      src/db/
      src/machine-registry/
      src/task-orchestrator/
      src/ws-control/
      src/pi-task-gateway/
      src/pi-terminal-gateway/
      src/release-center/
      src/install-script-center/
      src/storage-provider/
      src/frp-control/
      src/todos/
      src/contexts/
      src/tags/
      src/audit-log/
      migrations/

    client/
      src/main.ts
      src/supervisor/
      src/ws-client/
      src/task-runner/
      src/file-operator/
      src/command-executor/
      src/script-runner/
      src/pi-agent-manager/
      src/pi-terminal-manager/
      src/frpc-manager/
      src/updater/
      src/policy-engine/

    web/
      src/pages/
      src/components/
      src/features/
      src/api/
      src/store/

    sdk/
      src/index.ts        # core typed API
      src/node.ts         # Node helpers: env/config/file/sync/checkpoint
      src/runbook.ts      # Runbook authoring types

    cli/
      src/main.ts
      src/commands/

    updater/
      src/main.ts

    skills/
      manage-machines/SKILL.md
      run-commands/SKILL.md
      transfer-files/SKILL.md
      run-pi-tasks/SKILL.md
      manage-frp/SKILL.md
      manage-releases/SKILL.md
      review-audit/SKILL.md
```

## CLI 命令

```bash
noesis login                                   # 存 API token
noesis machines                                # 列机器
noesis machines :id                            # 机器详情 + capabilities
noesis command run --machine X -- "node -v"    # 执行命令
noesis file read   --machine X --path P        # 读小文件
noesis file write  --machine X --path P --stdin # 写小文件（内容走 stdin）
noesis file import --machine X --cloud-url U --dest D  # 从云盘导入大文件
noesis file export --machine X --path P        # 导出大文件到云盘，返回链接
noesis pi run     --machine X --project P --goal "修复依赖"
noesis pi sessions --machine X                 # 列 Pi 会话
noesis pi session :id                          # 会话详情
noesis task status --id T                      # 任务状态/事件流
noesis runbook list                            # 列 Runbook
noesis runbook run :id --params params.json    # 触发 RunbookRun
noesis todo list --ready --leaf-only --json    # 列可领取 Todo
noesis todo claim :id --assignee vcp --json    # 领取 Todo
noesis todo report :id --status done --summary "..." # 回写结果
noesis context list                            # 列 Context
noesis tag list                                # 列 Tag
noesis sync upload --machine X ./dist /opt/app/dist   # 目录同步上传
noesis sync download --machine X /opt/app/logs ./logs # 目录同步下载
noesis frp open   --machine X --local 5432 --remote 15432
noesis frp close  --machine X --id F
noesis frp list   --machine X
noesis releases                                 # 列发布包
noesis install   --machine X --release R        # 下发安装/升级
noesis audit     --machine X --limit N          # 审计日志
```

> 所有 CLI 命令通过 `@noesis/sdk` 走 Gateway HTTP API / WebSocket；`--json` 输出供通用 AI Agent 解析。通用 Agent 经 CLI 调用时审计为 `source=cli`、`actor` 标注具体 skill / agent 名；VCP 插件直接用 SDK，审计为 `source=ai-agent`、`actor=vcp:<agentName>`。

## Skills + CLI（AI Agent 集成）

Noesis 不提供 MCP Server。通用 AI Agent 通过 **skill + CLI** 接入；VCP 这类可直接运行 Node 插件的宿主可以 import `@noesis/sdk` 接入，不经过 CLI。

```text
通用 AI Agent（pi / Claude Code / Cursor / 任意能跑 shell + 读 markdown 的 agent）
  │ 读取 SKILL.md（工作流 + 用哪个 noesis 命令）
  │ 执行 noesis CLI
  ▼
noesis CLI  ──HTTPS──▶  Gateway HTTP API

VCP 插件 / Node 自动化宿主
  │ import @noesis/sdk
  ▼
Gateway HTTP API / WebSocket
```

### 为什么不用 MCP

- **单一协议面**：SDK/CLI 都基于同一 HTTP API，MCP 是重复的平行协议路径，每个能力要维护两份。
- **可移植**：任何能跑 shell、读 markdown 的 agent 都可用；MCP 需客户端支持协议。
- **可组合**：skill 是工作流脚本，能串联多个 `noesis` 命令成完整动作；MCP 工具是扁平原子调用。
- **认证统一**：CLI 用 `noesis login` 存的 API token，skill 不带凭证，审计自然归 `source=cli`；VCP 插件使用普通 API Token，审计归 `source=ai-agent`、`actor=vcp:<agentName>`。

### skill 目录

`packages/skills/` 下每个能力一个 `SKILL.md`，描述触发条件 + 对应 `noesis` 命令 + 参数 + 输出解析。skill 随 CLI 包一起发布，也可独立安装到用户的 agent skill 目录（如 pi 的 `~/.pi/agent/skills/`）。

| skill | 覆盖能力 | 主要命令 |
|---|---|---|
| manage-machines | 列/查机器与 capabilities | `noesis machines` / `noesis machines :id` |
| run-commands | 远程命令执行 | `noesis command run` |
| transfer-files | 小文件读写 + 大文件 StorageProvider 中转 | `noesis file read/write/import/export` |
| run-pi-tasks | Pi 批处理任务 + 会话查询 | `noesis pi run` / `noesis pi sessions` / `noesis task status` |
| manage-frp | FRP 映射开关 | `noesis frp open/close/list` |
| manage-releases | 发布包与一键安装/升级 | `noesis releases` / `noesis install` |
| review-audit | 审计日志查询 | `noesis audit` |
| manage-todos | Todo/Tag/Context 协作 | `noesis todo` / `noesis context` / `noesis tag` |

> 交互式 `pi.terminal` 是 Web 人类操作面，不暴露给 AI Agent（Agent 本身就是智能体，用 `pi.run` 批处理即可）。

## 配置示例

Server：

```json
{
  "server": { "host": "0.0.0.0", "port": 8080, "publicUrl": "https://gateway.example.com" },
  "database": { "path": "./data/gateway.db" },
  "storage": { "provider": "aliyundrive" },
  "frp": { "serverAddr": "x.x.x.x", "serverPort": 7000, "token": "...", "selfHosted": true },
  "retention": {
    "taskEventsDays": 30,
    "auditArchiveDays": 365,
    "piSessionLocalMaxCount": 50,
    "piSessionLocalMaxMB": 512
  },
  "pi": { "providerKeyEncryptionKey": "<env:PI_KEY_ENC>" }
}
```

Client：

```json
{
  "machineId": "win-dev-01",
  "gatewayUrl": "https://gateway.example.com",
  "clientToken": "xxx",
  "features": {
    "file": true,
    "command": true,
    "script": true,
    "piAgent": { "enabled": true, "rpcMode": true, "piTerminal": true },
    "frpc": true,
    "selfUpdate": true
  }
}
```

> Client config 仅保留 bootstrap 字段。Machine Policy（allowedPaths / blockedPaths / keyInjection 等）以 Gateway `machines.policy_json` 为单一事实源，经 `machine.policy.sync` 下发到 Client 本地只读镜像。

> frps 由用户自备公网服务端（`frp.selfHosted: true` 表示使用仓库 `deploy/frps/` 可选示例自托管），frpc 随 Client 打包。
