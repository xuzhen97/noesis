# Noesis Distribution 设计

## 目标

设计 Noesis Distribution 第一阶段机制：从源码工作区构建出 Gateway、Client Agent、SDK 和 CLI 的独立发布产物，并用这些产物在干净临时环境中跑通端到端串联验证。

该机制用于证明 Noesis 的核心架构边界成立：Gateway 负责 API、Machine 注册、Task 编排和 Task Event 汇聚；Client Agent 主动连接 Gateway 并执行安全受限的 Task；SDK 是 CLI 访问 Gateway 的统一客户端；CLI 是用户和验收脚本的操作入口。

## 范围

第一阶段只覆盖 core artifacts：

- `noesis-gateway-<version>.tar.gz`
- `noesis-client-agent-<version>.tar.gz`
- `noesis-sdk-<version>.tgz`
- `noesis-cli-<version>.tgz`
- `manifest.json`

Gateway 和 Client Agent 是跨平台 Node 应用压缩包，不按 `win-x64` / `linux-x64` 拆分。目标环境要求已安装 Node 24+，但不需要联网安装运行依赖。

SDK 和 CLI 使用 npm tgz。CLI 可以通过 npm 安装和升级，但 CLI 的命令入口应 bundle SDK 和 shared 依赖，避免安装时解析 workspace 依赖或访问网络。

## 范围外

第一阶段不包含：

- Web artifact；
- FRP、Computer Use 或其他 native capability packs；
- Gateway / Client Agent 自更新、版本目录、`current` 指针或安装器；
- Release Center；
- SQLite 或持久化数据库；
- 任意 shell 命令执行；
- 真实鉴权、权限策略、重连补偿和多机器部署体验。

FRP、Computer Use 等含平台原生二进制的能力后续作为独立 capability pack 设计，不污染 Gateway 和 Client Agent 主包。

## 产物形态

### Gateway artifact

```text
noesis-gateway-<version>/
  bin/
    noesis-gateway.sh
    noesis-gateway.ps1
  dist/
    gateway.mjs
  package.json
```

`gateway.mjs` 由现有 `packages/server` 入口 bundle 得到。启动参数第一阶段只需要：

```bash
noesis-gateway --port 8080
```

### Client Agent artifact

```text
noesis-client-agent-<version>/
  bin/
    noesis-client-agent.sh
    noesis-client-agent.ps1
  dist/
    client-agent.mjs
  package.json
```

`client-agent.mjs` 由现有 `packages/client` 入口 bundle 得到。启动参数第一阶段只需要：

```bash
noesis-client-agent --gateway http://127.0.0.1:8080 --machine-id local-dev-machine
```

Machine 身份由启动参数指定，不做首次启动生成和本地持久化。

### SDK artifact

SDK 产出 npm tgz，供开发者和 CLI 共享 Gateway API client 语义。第一阶段 SDK 仍保持库包形态，不做平台压缩包。

### CLI artifact

CLI 产出 npm tgz，支持本地安装和升级：

```bash
npm install -g ./noesis-cli-<version>.tgz
```

CLI 的 bin 使用 bundle 后的入口，内含 CLI、SDK 和 shared 的运行依赖。安装本地 tgz 时不应访问网络或解析 workspace 依赖。

第一阶段只需要一个可断言 JSON 输出命令：

```bash
noesis task run \
  --gateway http://127.0.0.1:8080 \
  --machine local-dev-machine \
  --json \
  -- node -e "console.log('noesis-ok')"
```

成功输出示例：

```json
{"taskId":"task_...","status":"succeeded","stdout":"noesis-ok\n"}
```

## Manifest

Distribution 目录包含轻量 `manifest.json`，记录 core artifacts 文件名、版本和 sha256。它不是 Release Center manifest，不包含 channel、平台矩阵、自更新策略或 capability pack 元数据。

示例：

```json
{
  "version": "0.1.0",
  "artifacts": {
    "gateway": {
      "file": "noesis-gateway-0.1.0.tar.gz",
      "sha256": "..."
    },
    "clientAgent": {
      "file": "noesis-client-agent-0.1.0.tar.gz",
      "sha256": "..."
    },
    "sdk": {
      "file": "noesis-sdk-0.1.0.tgz",
      "sha256": "..."
    },
    "cli": {
      "file": "noesis-cli-0.1.0.tgz",
      "sha256": "..."
    }
  }
}
```

Artifact version 统一来自根 `package.json` 的 `version`。第一阶段不做各包独立版本矩阵，也不从 git tag 推导版本。

## 运行通信

端到端验收使用真实 HTTP + WebSocket：

```text
CLI -> Gateway HTTP POST /api/tasks
CLI -> Gateway HTTP GET /api/tasks/:id/events
Client Agent -> Gateway WebSocket client.hello
Gateway -> Client Agent WebSocket task.dispatch
Client Agent -> Gateway WebSocket task.event
```

Gateway 使用内存状态保存 Machine、Task 和 Task Event。进程退出后状态丢弃。

Task 生命周期沿用当前 shared 协议中的状态枚举，最小路径为：

```text
created -> queued -> waiting_client -> dispatched -> running -> succeeded
```

失败时返回稳定错误 code 和安全 message，不泄露 stack、环境变量或任意本地文件内容。

## command.run 安全边界

第一阶段只允许固定验收命令：

```json
{"command":["node","-e","console.log('noesis-ok')"]}
```

Client Agent 是目标机器安全边界，必须在执行前校验白名单。Gateway 可以记录请求和状态，但不作为唯一安全防线。

第一阶段不支持任意 shell、`cwd`、`env`、流式 stdin 或任意命令字符串。

## 构建命令

根目录新增 distribution 命令：

```bash
pnpm build:distribution
pnpm verify:distribution
```

`pnpm build:distribution` 负责：

1. 运行现有构建；
2. 使用 esbuild bundle Gateway、Client Agent 和 CLI；
3. 打包 Gateway / Client Agent 压缩包；
4. 打包 SDK / CLI npm tgz；
5. 生成 sha256；
6. 写入 `manifest.json`。

`pnpm verify:distribution` 负责：

1. 构建 distribution artifacts；
2. 解压 Gateway 和 Client Agent 到临时目录；
3. 使用临时 npm prefix 安装 CLI tgz；
4. 启动 Gateway；
5. 启动 Client Agent 并注册 `local-dev-machine`；
6. 通过 CLI 创建 `command.run` Task；
7. 断言 Task 终态为 `succeeded`；
8. 断言 stdout 包含 `noesis-ok`；
9. 清理子进程和临时目录。

`pnpm verify` 不默认包含 distribution 验收，避免日常验证变慢。发布或架构边界验收时显式运行 `pnpm verify:distribution`。

## 包内入口

现有包增加可运行入口，但不新增组装包：

```text
packages/server/src/main.ts
packages/client/src/main.ts
```

CLI 继续使用现有 `packages/cli/src/main.ts` 作为命令入口。SDK 不需要进程入口。

## 测试设计

测试分三层：

1. 包内单元/冒烟测试：继续验证 shared、server、client、sdk、cli 的公开入口；
2. distribution 构建测试：证明 artifacts 可生成并带 sha256 manifest；
3. distribution e2e：只使用打包后的 artifacts，在临时安装环境跑通 Gateway、Client Agent、SDK 和 CLI 串联。

最关键的验收证据是 `pnpm verify:distribution` 的输出，而不是源码 workspace 内的直接调用。

## 已记录 ADR

分发边界决策记录在：

- `docs/adr/0002-noesis-distribution-core-artifacts.md`

## 规格自审

- 占位检查：无 TBD、TODO 或未定项。
- 一致性检查：术语使用 `Gateway`、`Client Agent`、`Machine`、`Task`、`Task Event` 和 `Noesis Distribution`，与 `CONTEXT.md` 一致。
- 范围检查：第一阶段只覆盖 core artifacts 和 distribution e2e，未混入 Web、Release Center、自更新、SQLite 或 native capability packs。
- 模糊性检查：目标环境要求 Node 24+；不安装运行依赖；Gateway/Client Agent 不做升级目录；CLI 使用 npm tgz 且 bin bundle 依赖；安全命令限定为固定 Node 验收命令。
