# Noesis Gateway Owner Token 登录与基础设置设计

## 背景

Noesis Web 目前已有本地 Owner Token 门禁，但只是前端 `localStorage` 非空校验；Gateway 运行时目前提供 `/api/health`、Task HTTP API 和 Client Agent WebSocket，但没有统一认证边界。本次目标是把 Gateway 登录与基础设置做成真实端到端闭环：Web、SDK、CLI、Client Agent 都通过同一个 Owner Token 访问 Gateway 控制面，同时保持个人单用户系统的最小复杂度。

本设计取代旧草案中第一版 `/api/auth/login` 和可撤销 API Token 的设想。第一版不发行 session/JWT，也不把 Owner Token 换成其它凭证。

## 已确认范围

### 包含

- Gateway 启动时配置 Owner Token。
- Gateway HTTP 控制接口和 Client Agent WebSocket 认证。
- 新增受保护接口 `GET /api/gateway/info`。
- Web 登录页用 `GET /api/gateway/info` 验证 Owner Token。
- Web 启动时验证已保存的 Owner Token。
- Web 设置页展示只读 Gateway 基础信息。
- SDK、CLI、Client Agent 接入同一 Owner Token。
- Gateway 最小静态 Web 托管，实现 Web 与 API 同源。
- README、Distribution 验证和相关测试同步更新。

### 不包含

- `/api/auth/login`。
- Cookie、session、JWT。
- 多账号、注册、忘记密码、RBAC。
- 可撤销 API Token、Machine Token、短期 agent token。
- 在线修改 Owner Token、保存 Gateway 配置、重启 Gateway、改端口。
- CORS。
- Gateway 认证审计事件。
- Machines/Tasks 列表接口。
- Web 浏览器 E2E。

## 术语约束

- **Owner Token** 是个人单用户系统中用于访问 Gateway 控制面（Web 控制台、SDK、CLI）的拥有者访问凭证，也用于第一版 Client Agent 连接认证。
- Owner Token 不表示 User account、Password account、RBAC role 或 Team member。
- UI 文案使用简体中文；API 错误 code 和协议字段使用英文。

## 方案选择

采用方案 A：单一 Owner Token 直连控制面。

- Web、SDK、CLI、Client Agent 都使用 `Authorization: Bearer <owner-token>`。
- Web 登录只是验证并本地保存 token，不创建服务端会话。
- `GET /api/gateway/info` 是认证探测和设置页数据源。

拒绝方案：

- `/api/auth/login` + session/JWT：没有账号体系时只是重复包装 Owner Token。
- Owner Token + API Token + Machine Token：更适合后续多客户端撤销和权限隔离，但会把第一版变成凭证系统。

相关 ADR：`docs/adr/0003-owner-token-for-first-gateway-control-plane.md`。

## 认证模型

Gateway 启动时必须配置 Owner Token：

1. `--owner-token <token>` 优先。
2. `NOESIS_OWNER_TOKEN` 兜底。
3. 两者都没有时启动失败，错误信息为 `Owner Token is required`。

Owner Token 只做 `trim` 后非空校验。真实使用时文档建议配置高熵随机串，例如 `openssl rand -hex 32`。

调用方统一使用：

```http
Authorization: Bearer <owner-token>
```

认证比较使用 Node 标准库 `crypto.timingSafeEqual`。长度不同直接失败；长度相同才做常量时间比较。token 不记录、不回显、不展示片段。

### 公开入口

- 静态 Web 文件。
- `GET /api/health`。

### 受保护入口

- `GET /api/gateway/info`。
- `POST /api/tasks`。
- `GET /api/tasks/:id`。
- `GET /api/tasks/:id/events`。
- `/ws/client`。

后续新增 `/api/*` 控制接口默认需要 Owner Token，除非明确标注 public。

### 错误语义

新增稳定错误码：

- `OWNER_TOKEN_REQUIRED`：调用方未带 Owner Token。
- `INVALID_OWNER_TOKEN`：调用方带了 token 但不匹配。

HTTP 映射：缺 token 和错 token 都返回 `401`。API message 使用英文：`Owner Token is required` / `Invalid Owner Token`。Web UI 将其翻译为中文提示。

## Gateway API

新增受保护接口：

```http
GET /api/gateway/info
```

返回最小 Gateway 信息：

```ts
{
  name: "Noesis Gateway";
  service: "gateway";
  protocolVersion: "0.1.0";
  auth: { mode: "owner-token" };
  capabilities: ["tasks.command.run", "machines.client-agent"];
}
```

`GET /api/health` 继续公开，用于连通性检查，不证明登录有效。

`@noesis/shared` 新增 `GatewayInfo` 类型。`Authorization` header 机制不抽成 shared 类型。

## Gateway 静态 Web 托管

Gateway 支持最小静态托管：

- `--web-dir <path>` 显式指定 Web build 目录。
- 未指定时默认尝试 `dist/gateway.mjs` 相邻的 `../web`。
- 目录不存在时 API-only 运行，不报错。
- `/` 返回 `index.html`。
- 只服务真实文件；未知路径返回 404。
- HashRouter 已覆盖刷新场景，不做全路径 SPA fallback。
- normalize 后必须仍在 `webDir` 内，防止路径穿越。
- 只做最小 MIME：`.html`、`.js`、`.css`、`.svg`、`.png`、`.ico`、`.json`，其它使用 `application/octet-stream`。
- 不做目录列表、压缩、复杂缓存策略。

Distribution 打包时把 `packages/web/dist` 放到 Gateway artifact 的 `web/` 目录，所以默认同源可用。开发期 Vite 只代理 `/api` 到 `http://127.0.0.1:8080`，不代理 WebSocket。

## Web 登录与设置

Web 保持 HashRouter，同源调用 Gateway API。

### 启动流程

1. 没有本地 `noesis.ownerToken`：显示登录页。
2. 有本地 token：进入 `checking` 状态，调用 `GET /api/gateway/info` 验证。
3. 验证成功：进入控制台并缓存 `GatewayInfo`。
4. `401`：清除本地 token，回登录页，提示 Token 已失效。
5. 网络失败：不清除 token，显示“无法连接 Gateway”，提供“重试”和“退出清除 Token”。

### 登录流程

1. 用户输入 Owner Token。
2. 前端 `trim`，空值直接提示。
3. 调用带 Bearer token 的 `GET /api/gateway/info`。
4. 成功后保存到 `localStorage["noesis.ownerToken"]`，进入 `/dashboard`。
5. 失败按类型显示：
   - `401`：`Owner Token 无效。`
   - 网络失败：`无法连接 Gateway。`
   - 其它服务端错误：`Gateway 暂时不可用。`
   - 本地存储失败：`无法保存 Owner Token，请检查浏览器本地存储权限。`

### 设置页

设置页第一版只读，显示：

- Gateway 地址：`window.location.origin`。
- 协议版本。
- 认证模式。
- 能力摘要。
- 认证状态。

设置页不显示 token 明文或片段。它只提供退出并清除本地 token，不提供修改 token、保存 Gateway 配置、重启 Gateway 或改端口。

### Web API 文件

新增 `packages/web/src/gateway-api.ts`，只包含：

- `getGatewayInfo(ownerToken)`。
- 最小错误分类。

不新增 `packages/web/src/api/` 目录，不引入 React Query，不建立通用 request client。后续 Machines/Tasks 页面需要真实数据时，再扩展同一个文件或重新评估边界。

## SDK、CLI、Client Agent

### SDK

`NoesisClientOptions` 新增可选 `ownerToken`。

以下方法自动带 `Authorization`：

- `getGatewayInfo()`。
- `createTask()`。
- `getTask()`。
- `getTaskEvents()`。

`ping()` 保持本地 deterministic，不发 HTTP，不验证 Gateway 或 Owner Token。SDK 不读取环境变量，避免隐式全局状态。

### CLI

`task run` 新增 `--owner-token <token>`，优先于 `NOESIS_OWNER_TOKEN`。缺 token 时本地提前报错，不发必失败请求。

`version` 继续保持离线命令，不请求 Gateway。帮助文本只更新最小必要说明。

### Client Agent

Client Agent 新增 `--owner-token <token>`，优先于 `NOESIS_OWNER_TOKEN`。WebSocket upgrade 使用 `Authorization` header。

只有收到 Gateway 的 `client.accepted` 后才输出 `NOESIS_CLIENT_AGENT_READY`。token 错误时不输出 ready，进程失败退出。

## Distribution 与文档

`pnpm verify:distribution` 使用固定测试 token 跑通 Gateway、Client Agent、CLI：

- Gateway 使用 `--owner-token`。
- Client Agent 使用同一个 `--owner-token`。
- CLI `task run` 使用同一个 `--owner-token`。

README 手动安装测试步骤同步传 Owner Token，并提示真实使用换成高熵随机串。

## 测试策略

### Server

- `GET /api/gateway/info` 带正确 token 成功。
- `GET /api/gateway/info` 缺 token / 错 token 返回 `401`。
- `POST /api/tasks` 缺 token / 错 token 返回 `401`。
- `/ws/client` 缺 token / 错 token 拒绝连接。
- 静态托管只返回真实文件，路径穿越返回失败。

### SDK

- 受保护请求带 `Authorization: Bearer <token>`。
- `getGatewayInfo()` 解析 `GatewayInfo`。
- `ping()` 继续不发 HTTP。

### CLI

- `--owner-token` 传给 SDK。
- `NOESIS_OWNER_TOKEN` 可用。
- 缺 token 本地用法错误。

### Web

- `gateway-api.ts` 错误分类。
- 现有 storage helper 继续覆盖 `localStorage` 行为。

### 收尾验证

- `pnpm verify`。
- `pnpm verify:distribution`。

## 实现边界

- 保持包依赖方向：`web` 只依赖 `shared`，不依赖 `sdk`。
- 不创建 `packages/web/src/api/`、`features/`、`routes/`、`store/` 等初始化边界禁止目录。
- Server 不引入 Express 或中间件框架，继续使用 Node 标准库 HTTP。
- 不增加数据库、配置文件层、AuthService/AuthConfig 抽象。
- 非平凡逻辑必须有最小测试覆盖。
