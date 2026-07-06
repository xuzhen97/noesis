# Noesis 灵识

Noesis 灵识 is a personal Human-AI Symbiotic Workspace. 本仓库是新实现的独立项目根目录。

## 当前范围

本 workspace 保持最小可用闭环。

- **Gateway** + **Client Agent** + **Machine** + **Task** + **Task Event**
- 持久化用 SQLite（`data/gateway.db`），表包括 `machines`、`tasks`、`task_events`、`aliyundrive_*`、`transfer_*`
- **StorageProvider（阿里云盘 v1）+ 单文件 file.* + 存储中转 TransferJob + Web 文件 Tab**
- Web 控制台当前提供固定导航/顶栏、轻标题区、细圆角主滚动条和内容区滚动；「设置」页只保留 `Owner Token` / `阿里云盘` 两个真实 Tab，阿里云盘状态表展示配置/授权/远程校验/账号/Drive ID/过期/最近检测时间
- 文件操作通过 `task.dispatch` 同步等待；大文件走中转 CLI/Web PUT 直传；token AES-256-GCM 落库
- 存储实现先作为 server 内部模块维护在 `packages/server/src/storage/`，暂不新增独立 workspace package

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

### 手动 E2E 步骤

```bash
# 终端 1：Gateway
node packages/server/dist/main.js --port 6375 --owner-token "dev-owner-token"

# 终端 2：Client Agent
node packages/client/dist/agent.mjs --gateway http://127.0.0.1:6375 --machine my-dev-machine --owner-token "dev-owner-token"

# 终端 3：文件直写（通过文件选择器路径）
noesis task run --gateway http://127.0.0.1:6375 --machine my-dev-machine --owner-token "dev-owner-token" --json -- node -e "console.log('noesis-ok')"

# 终端 4（可选）：Web 控制台
# pnpm dev:serve 后访问 http://127.0.0.1:8080
# 左侧导航和顶部栏固定，只有内容区滚动
# 在「设置」→「阿里云盘」输入任意 client_id 后用 NOESIS_STORAGE_MOCK=1 调通 UI
```

### 无云盘密钥开发（mock）

设置 `NOESIS_STORAGE_MOCK=1` 后，阿里云盘中转的创建/完成链路全部使用 `mock://` URL 与 data-URI 下载，无需真实 OpenAPI 密钥，便于 CI 与本地 UI 联调。

```bash
NOESIS_STORAGE_MOCK=1
pnpm dev:serve
```

### 云盘中转 CLI 验证

```bash
# 本机文件 → 云盘 → 盘中转记录
tar -czf /tmp/sample.tar.gz -C /path/to/dir .
noesis transfer upload --gateway http://127.0.0.1:6375 --machine my-dev-machine --file /tmp/sample.tar.gz --path ./ --owner-token "dev-owner-token" --json

# 取出中转记录
noesis transfer download --gateway http://127.0.0.1:6375 --transfer tr_xxxx --out /tmp/sample-out.tar.gz --owner-token "dev-owner-token" --json
```

## Noesis Distribution

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
# npm script（推荐）
pnpm dev:serve

# 或直接调用
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

### 冒烟测试

从源码全自动验证：构建 → Gateway → Client Agent → CLI → 错误场景 → 清理。

```bash
pnpm test:smoke
```

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
