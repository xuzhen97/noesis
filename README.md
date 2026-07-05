# Noesis 灵识

Noesis 灵识 is a personal Human-AI Symbiotic Workspace. 本仓库是新实现的独立项目根目录。

## 当前范围

本 workspace 刻意保持小规模。初始化阶段只创建 P0 控制闭环骨架，围绕以下概念：

- Gateway
- Client Agent
- Machine
- Task
- Task Event

## 开发

```bash
pnpm install
pnpm build
pnpm test
```

## Noesis Distribution

第一阶段 Distribution 产出 Gateway、Client Agent、SDK 和 CLI 的 core artifacts，并用打包产物验证端到端闭环。

```bash
pnpm build:distribution
pnpm verify:distribution
```

目标环境需要 Node 24+。CLI 使用本地 tgz 安装和升级；SDK 使用 npm tgz 集成。第一阶段不包含 Web、FRP、Computer Use、自更新或 Release Center。

### 手动安装测试步骤

构建产物位于 `release/noesis-distribution/`：

```
release/noesis-distribution/
├── manifest.json              # sha256 清单
├── noesis-gateway-0.0.0.tar.gz
├── noesis-client-agent-0.0.0.tar.gz
├── noesis-sdk-0.0.0.tgz
├── noesis-cli-0.0.0.tgz
└── noesis-gateway-0.0.0/      # Gateway vendor 目录
    └── node_modules/ws/
```

**步骤 1：提取 Gateway 和 Client Agent**

```bash
# Windows (PowerShell)
tar -xzf release/noesis-distribution/noesis-gateway-0.0.0.tar.gz -C /tmp/noesis-test
tar -xzf release/noesis-distribution/noesis-client-agent-0.0.0.tar.gz -C /tmp/noesis-test

# macOS / Linux
tar -xzf release/noesis-distribution/noesis-gateway-0.0.0.tar.gz -C /tmp/noesis-test
tar -xzf release/noesis-distribution/noesis-client-agent-0.0.0.tar.gz -C /tmp/noesis-test
```

**步骤 2：安装 CLI**

```bash
npm install -g ./release/noesis-distribution/noesis-cli-0.0.0.tgz
```

以后升级只需重新执行此命令覆盖即可。

**步骤 3：安装 SDK（可选，供第三方项目集成）**

```bash
# 在目标项目中
npm install ./path/to/noesis-sdk-0.0.0.tgz
```

**步骤 4：启动 Gateway**

```bash
node /tmp/noesis-test/noesis-gateway-0.0.0/dist/gateway.mjs --port 6375 --owner-token "dev-owner-token"
```

启动后会在 stdout 输出一条 JSON 格式就绪信息：
`{"type":"NOESIS_GATEWAY_READY","httpUrl":"http://127.0.0.1:6375",...}`

**步骤 5：启动 Client Agent**

新开一个终端：

```bash
node /tmp/noesis-test/noesis-client-agent-0.0.0/dist/agent.mjs \
  --gateway http://127.0.0.1:6375 \
  --machine my-dev-machine \
  --owner-token "dev-owner-token"
```

Client Agent 会通过 WebSocket 连接到 Gateway 并等待 Task 派发。

**步骤 6：执行命令**

```bash
noesis task run \
  --gateway http://127.0.0.1:6375 \
  --machine my-dev-machine \
  --owner-token "dev-owner-token" \
  --json \
  -- node -e "console.log('noesis-ok')"
```

成功输出示例：

```json
{
  "taskId": "...",
  "status": "succeeded",
  "events": [
    { "type": "task.running", "level": "info" },
    { "type": "task.succeeded", "level": "info",
      "data": { "exitCode": 0, "stdout": "noesis-ok" } }
  ]
}
```

> 生产使用建议将 `dev-owner-token` 替换为高熵随机串，例如：`openssl rand -hex 32`。

**步骤 7：清理**

按 `Ctrl+C` 停止 Gateway 和 Client Agent，然后：

```bash
npm uninstall -g @noesis/cli
rm -rf /tmp/noesis-test
```

### 架构说明

```
CLI ──HTTP──▶ Gateway ──WebSocket──▶ Client Agent
                │
                └── 内存中维护 Machine / Task / Task Event 状态
```

- **Gateway**：HTTP API + WebSocket 服务，接收 CLI/SDK 请求，通过 WebSocket 派发 Task 到 Client Agent
- **Client Agent**：WebSocket 客户端，连接到 Gateway 后等待 Task，执行仅有白名单命令（当前仅 `node -e "console.log('noesis-ok')"`）
- **CLI**：命令行工具，通过 HTTP 与 Gateway 交互
- **SDK**：Node.js 库，封装 HTTP API 调用

## 本地开发验证

从源码快速启动全链路，无需构建 distribution tarball。

### 一键启动

```bash
node scripts/dev-serve.mjs
```

自动启动 Gateway（端口 8080）+ Client Agent，并托管 Web 控制台。
输出就绪信息后，打开 `http://127.0.0.1:8080` 输入 `dev-owner-token` 进入控制台。

可通过环境变量定制端口和 Token：

```bash
# PowerShell
$env:NOESIS_PORT="3000"
$env:NOESIS_OWNER_TOKEN="my-token"
node scripts/dev-serve.mjs

# Bash
export NOESIS_PORT=3000
export NOESIS_OWNER_TOKEN="my-token"
node scripts/dev-serve.mjs
```

按 `Ctrl+C` 停止所有进程。

### CLI 手动验证

Gateway 和 Client Agent 运行后，另开终端执行：

```bash
node packages/cli/dist/main.js task run \
  --gateway http://127.0.0.1:8080 \
  --machine local-dev-machine \
  --owner-token "dev-owner-token" \
  --json \
  -- node -e "console.log('noesis-ok')"
```

或设环境变量免输 token：

```bash
export NOESIS_OWNER_TOKEN="dev-owner-token"
node packages/cli/dist/main.js task run \
  --gateway http://127.0.0.1:8080 \
  --machine local-dev-machine \
  --json \
  -- node -e "console.log('noesis-ok')"
```

### 测试错误场景

```bash
# 错误 token → 401
node packages/cli/dist/main.js task run \
  --gateway http://127.0.0.1:8080 \
  --machine local-dev-machine \
  --owner-token "wrong-token" \
  --json \
  -- node -e "console.log('noesis-ok')"

# 缺 token → 本地立即失败
node packages/cli/dist/main.js task run \
  --gateway http://127.0.0.1:8080 \
  --machine local-dev-machine \
  --json \
  -- node -e "console.log('noesis-ok')"
```

## 项目语言

业务文档默认使用简体中文。代码标识符、包名、协议字段、数据库字段、枚举值使用英文。
