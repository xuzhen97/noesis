# Noesis Gateway Owner Token 登录与基础设置 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Gateway 登录与基础设置做成真实端到端闭环：Web、SDK、CLI、Client Agent 都通过同一个 Owner Token 访问 Gateway 控制面，新增 `GET /api/gateway/info`、认证中间件、静态 Web 托管。

**Architecture:** 在 `@noesis/shared` 新增 `GatewayInfo` 类型和认证错误码；`@noesis/server` 提取 owner-token 解析与比较为独立 `auth.ts`，Gateway runtime 对所有控制接口做 Bearer token 校验，并在启动时支持 `--owner-token` / `NOESIS_OWNER_TOKEN`；`@noesis/client` 在 WS upgrade 传 `Authorization` header；`@noesis/sdk` 的 `NoesisClient` 可选 `ownerToken` 并新增 `getGatewayInfo()`；`@noesis/cli` 的 `task run` 支持 `--owner-token`；`@noesis/web` 新增 `gateway-api.ts`，App 启动/登录改为真实 Gateway 验证。

**Tech Stack:** Node 24+, TypeScript strict, vitest, ws, React 19, Vite 7, Tailwind CSS v4.

---

## Pre-flight impact checks

Before editing any listed symbol, run GitNexus impact analysis from this repo root. Known results (all LOW risk) as of plan writing:

| Symbol | Upstream caller(s) | Risk |
|--------|-------------------|------|
| `startGateway` (gateway-runtime.ts) | `runGatewayMain` (main.ts) | LOW |
| `runGatewayMain` (server/main.ts) | `main.ts` | LOW |
| `startClientAgent` (ws-client/index.ts) | `runClientAgentMain` (main.ts) | LOW |
| `NoesisClient` (sdk/index.ts) | `sdk.test.ts` | LOW |
| `runCli` (cli/main.ts) | `main.ts`, `cli.test.ts` | LOW |
| `App` (web/App.tsx) | `main.tsx` | LOW |

If the GitNexus index has been rebuilt or code has changed since plan writing, rerun impact before editing.

---

## File map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `packages/shared/src/errors.ts` | 新增 `OWNER_TOKEN_REQUIRED`、`INVALID_OWNER_TOKEN` 错误码 |
| Modify | `packages/shared/src/protocol.ts` | 新增 `GatewayInfo` 类型 |
| Create | `packages/server/src/auth.ts` | Owner Token 解析与常量时间比较 |
| Modify | `packages/server/src/main.ts` | 解析 `--owner-token`、`--web-dir` |
| Modify | `packages/server/src/gateway-runtime.ts` | 认证中间件、`/api/gateway/info`、静态托管 |
| Modify | `packages/server/src/server.test.ts` | 认证和 info 端点的测试 |
| Modify | `packages/client/src/main.ts` | 解析 `--owner-token` |
| Modify | `packages/client/src/ws-client/index.ts` | `startClientAgent` 传 Authorization header，等 `client.accepted` 回调 |
| Modify | `packages/client/src/client.test.ts` | 更新 supervisor 构造以允许注入 |
| Modify | `packages/sdk/src/index.ts` | 新增 `ownerToken`、`getGatewayInfo()`，受保护请求带 Authorization |
| Modify | `packages/sdk/src/sdk.test.ts` | 测试 `ownerToken` 和 `getGatewayInfo()` |
| Modify | `packages/cli/src/main.ts` | `task run` 解析 `--owner-token` / `NOESIS_OWNER_TOKEN` |
| Modify | `packages/cli/src/cli.test.ts` | CLI owner-token 测试 |
| Create | `packages/web/src/gateway-api.ts` | `getGatewayInfo(ownerToken)` 和错误分类 |
| Modify | `packages/web/src/App.tsx` | 登录/启动验证、设置页改为真实 Gateway info |
| Modify | `packages/web/src/session.ts` | 保持不变（无需改） |
| Modify | `packages/web/src/DashboardPage.tsx` | 从 App.tsx 抽离 DashboardPage 为独立文件 |
| Modify | `packages/web/index.html` | 保持不动 |
| Modify | `packages/web/vite.config.ts` | 新增 `/api` proxy |
| Modify | `scripts/build-distribution.mjs` | 打包 web/dist 到 Gateway artifact |
| Modify | `scripts/verify-distribution.mjs` | 全链路传 `--owner-token` |
| Modify | `README.md` | 手动安装步骤加 Owner Token |

---

### Task 1: 扩展 Shared 协议与错误码

**Files:**

- Modify: `packages/shared/src/errors.ts`
- Modify: `packages/shared/src/protocol.ts`

**Blast radius note:** Changes to `createNoesisError` type will affect all callers. Risk: LOW (only type union changes). Rerun if index stale.

- [ ] **Step 1: 新增 GatewayInfo 类型到 protocol.ts**

In `packages/shared/src/protocol.ts`, append after existing exports (before EOF):

```ts
/** Gateway 基础信息：设置页和控制台使用的只读摘要 */
export interface GatewayInfo {
  name: string;
  service: string;
  protocolVersion: typeof protocolVersion;
  auth: { mode: "owner-token" };
  capabilities: string[];
}
```

- [ ] **Step 2: 新增认证错误码到 errors.ts**

In `packages/shared/src/errors.ts`, extend `NoesisErrorCode` union:

```ts
export type NoesisErrorCode =
  | "BAD_REQUEST"
  | "COMMAND_NOT_ALLOWED"
  | "MACHINE_NOT_FOUND"
  | "NOESIS_UNAVAILABLE"
  | "OWNER_TOKEN_REQUIRED"
  | "INVALID_OWNER_TOKEN"
  | "TASK_NOT_FOUND"
  | "TASK_TIMEOUT"
  | "UNSUPPORTED_TASK_TYPE";
```

- [ ] **Step 3: Re-export GatewayInfo in index.ts**

In `packages/shared/src/index.ts`, no change needed — `export * from "./protocol.js"` already covers it.

- [ ] **Step 4: Build shared**

Run: `pnpm --filter @noesis/shared build`
Expected: Compiles clean, `dist/` contains `GatewayInfo` in declarations.

- [ ] **Step 5: Run shared tests**

Run: `pnpm --filter @noesis/shared test`
Expected: All existing tests pass (no new test code needed for type-only additions).

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/errors.ts packages/shared/src/protocol.ts
git commit -m "feat(shared): 新增 GatewayInfo 类型和认证错误码 OWNER_TOKEN_REQUIRED / INVALID_OWNER_TOKEN"
```

---

### Task 2: Server — Owner Token 解析与比较

**Files:**

- Create: `packages/server/src/auth.ts`

**Blast radius note:** New file, no existing callers. No impact.

- [ ] **Step 1: 创建 auth.ts**

Create `packages/server/src/auth.ts`:

```ts
import { timingSafeEqual } from "node:crypto";

/** 解析启动参数和环境变量中的 Owner Token。返回 trim 后的 token 或 null。 */
export function readOwnerTokenFromEnv(args: readonly string[]): string | null {
  const flagIndex = args.indexOf("--owner-token");
  if (flagIndex !== -1) {
    const value = args[flagIndex + 1];
    if (value === undefined) {
      throw new Error("--owner-token requires a value");
    }
    return value.trim();
  }
  const env = process.env.NOESIS_OWNER_TOKEN?.trim();
  if (env && env.length > 0) return env;
  return null;
}

/**
 * 从 HTTP 请求的 Authorization header 提取 Bearer token。
 * 返回 token 字符串或 null。
 */
export function readBearerToken(
  authorization: string | undefined,
): string | null {
  if (authorization === undefined) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (match === null) return null;
  const token = match[1].trim();
  return token.length === 0 ? null : token;
}

/**
 * 常量时间比较两个 token。长度不同直接失败；长度相同用 timingSafeEqual。
 */
export function ownerTokenEquals(
  expected: string,
  actual: string,
): boolean {
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(actual),
  );
}
```

- [ ] **Step 2: Build server**

Run: `pnpm --filter @noesis/server build`
Expected: Compiles clean.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/auth.ts
git commit -m "feat(server): 新增 Owner Token 解析与常量时间比较 auth.ts"
```

---

### Task 3: Server — Gateway 整合认证、/api/gateway/info 和静态托管

**Files:**

- Modify: `packages/server/src/main.ts`
- Modify: `packages/server/src/gateway-runtime.ts`

**Blast radius note:** `startGateway` upstream → `runGatewayMain` (LOW). Rerun if stale.

- [ ] **Step 1: 更新 GatewayRuntimeOptions 添加 ownerToken 和 webDir**

In `packages/server/src/gateway-runtime.ts`, extend `GatewayRuntimeOptions`:

```ts
export interface GatewayRuntimeOptions {
  /** 监听端口 */
  port: number;
  /** Owner Token：Gateway 控制面凭证 */
  ownerToken: string;
  /** Web 静态文件目录（可选） */
  webDir?: string;
}
```

- [ ] **Step 2: 添加 import 到 gateway-runtime.ts**

At top of `packages/server/src/gateway-runtime.ts`, add:

```ts
import { readFile } from "node:fs/promises";
import { join, normalize, isAbsolute, resolve } from "node:path";
import { readBearerToken, ownerTokenEquals } from "./auth.js";
```

- [ ] **Step 3: 在 createServer 请求处理开头插入认证中间件（在现有路由分派之前）**

In `startGateway`, after `const server = createServer(...)`, before the first `if (request.method === "GET" ...)`, insert auth check:

In the handler, after `const url = new URL(...)`, add:

```ts
// 静态 Web 文件和 /api/health 公开；其它接口需要 Owner Token
const isPublic =
  (request.method === "GET" &&
    (url.pathname === "/api/health" || !url.pathname.startsWith("/api"))) ||
  (options.webDir !== undefined &&
    request.method === "GET" &&
    !url.pathname.startsWith("/api"));
if (!isPublic) {
  const bearer = readBearerToken(request.headers.authorization);
  if (bearer === null) {
    json(
      response,
      401,
      fail("OWNER_TOKEN_REQUIRED", "Owner Token is required"),
    );
    return;
  }
  if (!ownerTokenEquals(options.ownerToken, bearer)) {
    json(
      response,
      401,
      fail("INVALID_OWNER_TOKEN", "Invalid Owner Token"),
    );
    return;
  }
}
```

- [ ] **Step 4: 新增 GET /api/gateway/info 路由**

After the health check route, before the tasks routes, add:

```ts
if (request.method === "GET" && url.pathname === "/api/gateway/info") {
  json<GatewayInfo>(response, 200, ok({
    name: "Noesis Gateway",
    service: "gateway",
    protocolVersion,
    auth: { mode: "owner-token" },
    capabilities: ["tasks.command.run", "machines.client-agent"],
  }));
  return;
}
```

Also add `GatewayInfo` to the shared import:

```ts
import {
  // ... existing imports
  type GatewayInfo,
} from "@noesis/shared";
```

- [ ] **Step 5: WebSocket upgrade 认证**

In the `server.on("upgrade", ...)` handler, after `const url = new URL(...)`, add auth check:

```ts
server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  if (url.pathname !== "/ws/client") {
    socket.destroy();
    return;
  }
  const bearer = readBearerToken(request.headers.authorization);
  if (
    bearer === null ||
    !ownerTokenEquals(options.ownerToken ?? "", bearer)
  ) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, (ws) =>
    wss.emit("connection", ws, request),
  );
});
```

- [ ] **Step 6: 静态文件托管**

After all API routes, before the final 404, add static file serving. In `startGateway`, after api route handling and before the final `json(response, 404, ...)`:

```ts
// 静态 Web 文件
if (
  options.webDir !== undefined &&
  request.method === "GET" &&
  !url.pathname.startsWith("/api")
) {
  let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
  // 防路径穿越
  const resolved = resolve(
    options.webDir,
    "." + normalize(filePath),
  );
  if (!resolved.startsWith(options.webDir)) {
    json(response, 403, fail("BAD_REQUEST", "Forbidden"));
    return;
  }
  try {
    const content = await readFile(resolved);
    const ext = filePath.split(".").pop() ?? "";
    const mime: Record<string, string> = {
      html: "text/html; charset=utf-8",
      js: "application/javascript; charset=utf-8",
      css: "text/css; charset=utf-8",
      svg: "image/svg+xml",
      png: "image/png",
      ico: "image/x-icon",
      json: "application/json; charset=utf-8",
    };
    response.writeHead(200, {
      "content-type": mime[ext] ?? "application/octet-stream",
    });
    response.end(content);
    return;
  } catch {
    json(response, 404, fail("BAD_REQUEST", "Not found"));
    return;
  }
}
```

- [ ] **Step 7: 更新 main.ts 解析新增参数**

Replace `packages/server/src/main.ts` `readPort` region and add `readOwnerToken` + `readWebDir`:

```ts
import { startGateway } from "./gateway-runtime.js";

function readFlag(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function readPort(args: readonly string[]): number {
  const value = readFlag(args, "--port");
  if (value === undefined) return 8080;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("--port must be an integer between 0 and 65535");
  }
  return port;
}

function readOwnerToken(args: readonly string[]): string {
  const flag = readFlag(args, "--owner-token");
  if (flag !== undefined) return flag.trim();
  const env = process.env.NOESIS_OWNER_TOKEN?.trim();
  if (env && env.length > 0) return env;
  throw new Error("Owner Token is required (--owner-token or NOESIS_OWNER_TOKEN)");
}

function readWebDir(args: readonly string[]): string | undefined {
  const flag = readFlag(args, "--web-dir");
  if (flag !== undefined) return flag;
  // 默认尝试 dist/gateway.mjs 相邻的 ../web
  const { join, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const candidate = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "web",
  );
  const { existsSync } = await import("node:fs");
  return existsSync(candidate) ? candidate : undefined;
}

/**
 * Gateway 入口：解析命令行参数 --port、--owner-token、--web-dir，启动 Gateway，输出 JSON 就绪消息到 stdout。
 */
export async function runGatewayMain(
  args: readonly string[] = process.argv.slice(2),
): Promise<void> {
  const gateway = await startGateway({
    port: readPort(args),
    ownerToken: readOwnerToken(args),
    webDir: readWebDir(args),
  });
  console.log(
    JSON.stringify({
      type: "NOESIS_GATEWAY_READY",
      httpUrl: gateway.httpUrl,
      wsUrl: gateway.wsUrl,
      port: gateway.port,
    }),
  );
}
```

Note: The `readWebDir` uses top-level `await`, so mark `runGatewayMain` as `async` (already is). The function body needs to use `await import` for dynamic path resolution in the conditional default path. Alternatively, move the default path logic inline.

Better approach — keep `readWebDir` non-async and resolve path at call site in `runGatewayMain`:

```ts
function readWebDir(args: readonly string[], distDir: string): string | undefined {
  const flag = readFlag(args, "--web-dir");
  if (flag !== undefined) return flag;
  const { join } = require("node:path") as typeof import("node:path");
  const { existsSync } = require("node:fs") as typeof import("node:fs");
  const candidate = join(distDir, "..", "web");
  return existsSync(candidate) ? candidate : undefined;
}
```

That's dirty with `require`. Use the ESM approach in `runGatewayMain` body:

In `runGatewayMain`, after reading port and ownerToken, resolve webDir:

```ts
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { existsSync } from "node:fs";

export async function runGatewayMain(
  args: readonly string[] = process.argv.slice(2),
): Promise<void> {
  const webDirFlag = readFlag(args, "--web-dir");
  let webDir: string | undefined;
  if (webDirFlag !== undefined) {
    webDir = webDirFlag;
  } else {
    const distDir = dirname(fileURLToPath(import.meta.url));
    const candidate = join(distDir, "..", "web");
    webDir = existsSync(candidate) ? candidate : undefined;
  }

  const gateway = await startGateway({
    port: readPort(args),
    ownerToken: readOwnerToken(args),
    webDir,
  });
  // ... rest
}
```

Keep `readPort` and `readOwnerToken` as standalone functions; inline webDir logic in `runGatewayMain`.

- [ ] **Step 8: Update main.ts imports**

At top of `packages/server/src/main.ts`, update imports:

```ts
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { startGateway } from "./gateway-runtime.js";
```

- [ ] **Step 9: Build server**

Run: `pnpm --filter @noesis/server build`
Expected: Compiles clean.

- [ ] **Step 10: Commit**

```bash
git add packages/server/src/main.ts packages/server/src/gateway-runtime.ts
git commit -m "feat(server): Gateway 认证中间件、GET /api/gateway/info、最小静态 Web 托管"
```

---

### Task 4: Server 测试

**Files:**

- Modify: `packages/server/src/server.test.ts`

**Blast radius note:** Test file only, no upstream callers.

- [ ] **Step 1: 写认证失败和 info 端点测试**

Replace `packages/server/src/server.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createGatewayApp } from "./index.js";
import { readBearerToken, ownerTokenEquals } from "./auth.js";

describe("Gateway health slice", () => {
  it("exposes a minimal Gateway app shape", () => {
    const app = createGatewayApp();
    expect(app.name).toBe("Noesis Gateway");
    expect(app.health).toEqual({
      ok: true,
      service: "gateway",
      protocolVersion: "0.1.0",
    });
    expect(app.slices).toEqual(["health", "machines", "tasks", "ws", "db"]);
  });
});

describe("readBearerToken", () => {
  it("extracts Bearer token from Authorization header", () => {
    expect(readBearerToken("Bearer my-token")).toBe("my-token");
  });

  it("returns null for missing header", () => {
    expect(readBearerToken(undefined)).toBeNull();
  });

  it("returns null for non-Bearer header", () => {
    expect(readBearerToken("Basic abc")).toBeNull();
  });

  it("returns null for empty token", () => {
    expect(readBearerToken("Bearer ")).toBeNull();
  });
});

describe("ownerTokenEquals", () => {
  it("matches identical tokens", () => {
    expect(ownerTokenEquals("abc", "abc")).toBe(true);
  });

  it("rejects different tokens", () => {
    expect(ownerTokenEquals("abc", "abd")).toBe(false);
  });

  it("rejects different length tokens", () => {
    expect(ownerTokenEquals("abc", "ab")).toBe(false);
  });

  it("matches with timing-safe comparison", () => {
    const token = "dev-owner-token-12345";
    expect(ownerTokenEquals(token, token)).toBe(true);
  });
});
```

- [ ] **Step 2: Run server tests**

Run: `pnpm --filter @noesis/server test`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/server.test.ts
git commit -m "test(server): 认证 helper 和 Bearer token 解析单元测试"
```

---

### Task 5: Client Agent — 接入 Owner Token 认证

**Files:**

- Modify: `packages/client/src/main.ts`
- Modify: `packages/client/src/ws-client/index.ts`

**Blast radius note:** `startClientAgent` upstream → `runClientAgentMain` (LOW). Rerun if stale.

- [ ] **Step 1: 更新 startClientAgent 签名接受 ownerToken**

In `packages/client/src/ws-client/index.ts`, extend `ClientAgentOptions`:

```ts
export interface ClientAgentOptions {
  gatewayUrl: string;
  machineId: string;
  /** Owner Token：Gateway 认证凭证 */
  ownerToken: string;
}
```

- [ ] **Step 2: WS upgrade 传 Authorization header**

In `startClientAgent`, pass `Authorization` header when creating WebSocket. `ws` 包的 `WebSocket` 构造支持 `headers` 选项：

Replace the `new WebSocket(toWsUrl(...))` line with:

```ts
const ws = new WebSocket(toWsUrl(options.gatewayUrl), {
  headers: { Authorization: `Bearer ${options.ownerToken}` },
});
```

- [ ] **Step 3: 等 client.accepted 后再输出 ready**

In `startClientAgent`, change the ready signal. Currently the ready log happens in `runClientAgentMain` after `startClientAgent` resolves. Since `ws.once("open")` resolves early, we need to wait for `client.accepted`. Add a promise that resolves on `client.accepted`:

```ts
const accepted = new Promise<void>((resolve) => {
  const originalOnMessage = ws.on.bind(ws, "message");
  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(String(raw)) as GatewayToClientMessage;
      if (msg.type === "client.accepted") {
        resolve();
        return;
      }
    } catch {
      // ignore non-JSON
    }
  });
});
await accepted;
```

Actually, the `ws.on("message")` already handles dispatch. We just need to add the accepted detection before returning. Adjust the function:

After the `ws.once("open", ...)`, add:

```ts
await new Promise<void>((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("Client Agent not accepted within 5s")), 5000);
  const handler = (raw: WebSocket.Data) => {
    try {
      const msg = JSON.parse(String(raw)) as GatewayToClientMessage;
      if (msg.type === "client.accepted") {
        clearTimeout(timer);
        resolve();
      }
    } catch {
      // ignore
    }
  };
  ws.on("message", handler);
});
```

Then re-register the task handler:

```ts
ws.on("message", (raw) => {
  void (async () => {
    let message: GatewayToClientMessage;
    try {
      message = JSON.parse(String(raw)) as GatewayToClientMessage;
    } catch {
      return;
    }
    if (message.type !== "task.dispatch") return;
    // ... existing dispatch handling ...
  })();
});
```

This requires care: we need to handle the first messages (including `client.accepted`) and then switch to task dispatch. A cleaner approach: use a single `message` handler with a guard.

```ts
let accepted = false;
const acceptedPromise = new Promise<void>((resolve, reject) => {
  const timer = setTimeout(
    () => reject(new Error("Client Agent not accepted within 5s")),
    5000,
  );
  const check = (raw: WebSocket.Data) => {
    try {
      const msg = JSON.parse(String(raw)) as GatewayToClientMessage;
      if (msg.type === "client.accepted") {
        clearTimeout(timer);
        accepted = true;
        resolve();
      }
    } catch {
      // ignore
    }
  };
  ws.on("message", check);
  // Wrap to also pass through to dispatch handler after acceptance
});

await acceptedPromise;
```

Then register the dispatch handler separately (it won't fire until after accepted since message events are queued and the handler above only runs the check function — but we replace it below).

Simpler: use a single handler that delegates:

```ts
ws.on("message", (raw) => {
  void (async () => {
    let msg: GatewayToClientMessage;
    try {
      msg = JSON.parse(String(raw)) as GatewayToClientMessage;
    } catch {
      return;
    }
    if (msg.type === "client.accepted") {
      if (!accepted) {
        accepted = true;
        acceptResolve();
      }
      return;
    }
    if (!accepted) return; // ignore non-accepted messages before accept
    if (msg.type !== "task.dispatch") return;
    // ... existing dispatch handling with makeEvent etc ...
  })();
});

let accepted = false;
let acceptResolve: () => void;
const acceptPromise = new Promise<void>((resolve) => {
  acceptResolve = resolve;
});

await acceptPromise;
```

This is the approach. Replace the entire message handler block.

- [ ] **Step 4: Remove redundant accepted log in the dispatch handler area**

The existing code after ws.once("open") sends client.hello then resolves. Keep that. After `await new Promise<void>((resolve, reject) => ws.once("open", ...))`, replace the `ws.on("message", ...)` with the single-handler pattern described above. Then `await acceptPromise;`.

- [ ] **Step 5: 更新 runClientAgentMain 解析 --owner-token**

In `packages/client/src/main.ts`, add `readOwnerToken` helper and pass to `startClientAgent`:

```ts
import { startClientAgent } from "./ws-client/index.js";

function readRequired(args: readonly string[], name: string): string {
  const index = args.indexOf(name);
  const value = index === -1 ? undefined : args[index + 1];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function readOwnerToken(args: readonly string[]): string {
  const flag = args.indexOf("--owner-token");
  if (flag !== -1) {
    const value = args[flag + 1];
    if (value === undefined) throw new Error("--owner-token requires a value");
    return value.trim();
  }
  const env = process.env.NOESIS_OWNER_TOKEN?.trim();
  if (env && env.length > 0) return env;
  throw new Error("Owner Token is required (--owner-token or NOESIS_OWNER_TOKEN)");
}

export async function runClientAgentMain(
  args: readonly string[] = process.argv.slice(2),
): Promise<void> {
  const gatewayUrl = readRequired(args, "--gateway");
  const machineId = readRequired(args, "--machine-id");
  const ownerToken = readOwnerToken(args);
  await startClientAgent({ gatewayUrl, machineId, ownerToken });
  console.log(
    JSON.stringify({
      type: "NOESIS_CLIENT_AGENT_READY",
      gatewayUrl,
      machineId,
    }),
  );
}
```

- [ ] **Step 6: Build client**

Run: `pnpm --filter @noesis/client build`
Expected: Compiles clean.

- [ ] **Step 7: Commit**

```bash
git add packages/client/src/main.ts packages/client/src/ws-client/index.ts
git commit -m "feat(client): Client Agent 接入 Owner Token WS 认证，等 client.accepted 后输出 ready"
```

---

### Task 6: SDK — ownerToken 与 getGatewayInfo

**Files:**

- Modify: `packages/sdk/src/index.ts`
- Modify: `packages/sdk/src/sdk.test.ts`

**Blast radius note:** `NoesisClient` upstream → `sdk.test.ts` (LOW). Rerun if stale.

- [ ] **Step 1: 添加 ownerToken 到 NoesisClientOptions**

In `packages/sdk/src/index.ts`, extend `NoesisClientOptions`:

```ts
export interface NoesisClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
  /** Owner Token：Gateway 控制面凭证 */
  ownerToken?: string;
}
```

- [ ] **Step 2: 存储并生成 Authorization header**

Add private field and helper in `NoesisClient`:

```ts
export class NoesisClient {
  readonly baseUrl: string;
  readonly #fetch: typeof fetch;
  readonly #ownerToken?: string;

  constructor(options: NoesisClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.#fetch = options.fetch ?? fetch;
    this.#ownerToken = options.ownerToken;
  }

  #headers(): Record<string, string> {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (this.#ownerToken !== undefined) {
      headers.authorization = `Bearer ${this.#ownerToken}`;
    }
    return headers;
  }
```

- [ ] **Step 3: 更新 createTask / getTask / getTaskEvents 使用 #headers()**

Replace inline headers with `this.#headers()`:

```ts
async createTask(input: {
  machineId: string;
  taskType: "command.run";
  payload: CommandRunPayload;
}): Promise<Task> {
  const response = await this.#fetch(`${this.baseUrl}/api/tasks`, {
    method: "POST",
    headers: this.#headers(),
    body: JSON.stringify(input),
  });
  return await this.#readApi<Task>(response);
}

async getTask(taskId: string): Promise<Task> {
  return await this.#readApi<Task>(
    await this.#fetch(`${this.baseUrl}/api/tasks/${taskId}`, {
      headers: this.#headers(),
    }),
  );
}

async getTaskEvents(taskId: string): Promise<TaskEvent[]> {
  return await this.#readApi<TaskEvent[]>(
    await this.#fetch(`${this.baseUrl}/api/tasks/${taskId}/events`, {
      headers: this.#headers(),
    }),
  );
}
```

- [ ] **Step 4: 新增 getGatewayInfo()**

```ts
/** 获取 Gateway 基础信息（需要 Owner Token） */
async getGatewayInfo(): Promise<GatewayInfo> {
  const response = await this.#fetch(`${this.baseUrl}/api/gateway/info`, {
    headers: this.#headers(),
  });
  return await this.#readApi<GatewayInfo>(response);
}
```

Also add `GatewayInfo` to shared imports at top:

```ts
import {
  protocolVersion,
  type ApiResponse,
  type CommandRunPayload,
  type GatewayInfo,
  type Task,
  type TaskEvent,
  type TaskStatus,
} from "@noesis/shared";
```

- [ ] **Step 5: ping() 保持现行实现不变**

No change.

- [ ] **Step 6: 更新 SDK 测试**

In `packages/sdk/src/sdk.test.ts`, add tests for ownerToken header and getGatewayInfo:

```ts
it("passes ownerToken in Authorization header", async () => {
  let capturedHeaders: Record<string, string> = {};
  const fakeFetch: typeof fetch = async (input, init) => {
    capturedHeaders = (init?.headers ?? {}) as Record<string, string>;
    return Response.json(
      { ok: true, requestId: "req_1", data: { taskId: "task_1", status: "succeeded", stdout: "" } },
    );
  };

  const client = new NoesisClient({
    baseUrl: "http://127.0.0.1:8080",
    fetch: fakeFetch,
    ownerToken: "test-token",
  });

  await client.runCommandAndWait({
    machineId: "m1",
    command: ["node", "-e", "console.log('noesis-ok')"],
    timeoutMs: 100,
    pollIntervalMs: 1,
  });

  expect(capturedHeaders.authorization).toBe("Bearer test-token");
});

it("getGatewayInfo returns GatewayInfo shape", async () => {
  const fakeFetch: typeof fetch = async () =>
    Response.json({
      ok: true,
      requestId: "req_1",
      data: {
        name: "Noesis Gateway",
        service: "gateway",
        protocolVersion: "0.1.0",
        auth: { mode: "owner-token" },
        capabilities: ["tasks.command.run", "machines.client-agent"],
      },
    });

  const client = new NoesisClient({
    baseUrl: "http://127.0.0.1:8080",
    fetch: fakeFetch,
    ownerToken: "test-token",
  });

  await expect(client.getGatewayInfo()).resolves.toEqual({
    name: "Noesis Gateway",
    service: "gateway",
    protocolVersion: "0.1.0",
    auth: { mode: "owner-token" },
    capabilities: ["tasks.command.run", "machines.client-agent"],
  });
});
```

- [ ] **Step 7: Run SDK tests**

Run: `pnpm --filter @noesis/sdk test`
Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add packages/sdk/src/index.ts packages/sdk/src/sdk.test.ts
git commit -m "feat(sdk): NoesisClient 支持 ownerToken、所有受保护请求带 Authorization、新增 getGatewayInfo()"
```

---

### Task 7: CLI — owner-token 支持

**Files:**

- Modify: `packages/cli/src/main.ts`
- Modify: `packages/cli/src/cli.test.ts`

**Blast radius note:** `runCli` upstream → `main.ts`, `cli.test.ts` (LOW). Rerun if stale.

- [ ] **Step 1: 新增 readOwnerToken 和 readOwnerTokenFromFlag helper**

In `packages/cli/src/main.ts`, add helper:

```ts
function readOwnerTokenFromArgs(args: readonly string[]): string {
  const flagIndex = args.indexOf("--owner-token");
  if (flagIndex !== -1) {
    const value = args[flagIndex + 1];
    if (value === undefined) throw new Error("--owner-token requires a value");
    return value.trim();
  }
  const env = process.env.NOESIS_OWNER_TOKEN?.trim();
  if (env && env.length > 0) return env;
  throw new Error(
    "Owner Token is required for task run (--owner-token or NOESIS_OWNER_TOKEN)",
  );
}
```

- [ ] **Step 2: task run 使用 owner token**

In `runCli`, in the `task run` branch, read ownerToken and pass to NoesisClient:

```ts
if (args[0] === "task" && args[1] === "run") {
  const gateway = readFlag(args, "--gateway");
  const machineId = readFlag(args, "--machine");
  const separator = args.indexOf("--");
  const command = separator === -1 ? [] : args.slice(separator + 1);
  const json = args.includes("--json");

  if (
    !gateway ||
    !machineId ||
    !json ||
    command.join("\u0000") !==
      ["node", "-e", "console.log('noesis-ok')"].join("\u0000")
  ) {
    return {
      exitCode: 1,
      stdout: "",
      stderr:
        "Usage: noesis task run --gateway <url> --machine <id> --json [--owner-token <token>] -- node -e \"console.log('noesis-ok')\"\n",
    };
  }

  // ownerToken: require before making HTTP request
  let ownerToken: string;
  try {
    ownerToken = readOwnerTokenFromArgs(args);
  } catch (e) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: (e as Error).message + "\n",
    };
  }

  const client =
    options.client ??
    new NoesisClient({ baseUrl: gateway, ownerToken });
  // ... rest unchanged ...
}
```

Update help text to include `--owner-token`:

```ts
const help =
  "Noesis CLI\n\nCommands:\n  noesis --help\n  noesis version\n  noesis task run --gateway <url> --machine <id> --json [--owner-token <token>] -- node -e \"console.log('noesis-ok')\"\n";
```

Also update the usage error stderr:

```ts
stderr:
  "Usage: noesis task run --gateway <url> --machine <id> --json [--owner-token <token>] -- node -e \"console.log('noesis-ok')\"\n",
```

- [ ] **Step 3: 更新 CLI 测试**

In `packages/cli/src/cli.test.ts`, update fakeClient to track ownerToken:

```ts
import { describe, expect, it } from "vitest";
import { runCli, type CliClient } from "./main.js";

const fakeClient: CliClient = {
  runCommandAndWait: async () => ({
    taskId: "task_1",
    status: "succeeded",
    stdout: "noesis-ok\n",
  }),
};

describe("Noesis CLI shell", () => {
  // ... existing tests unchanged ...

  it("fails task run without owner token", async () => {
    await expect(
      runCli(
        [
          "task",
          "run",
          "--gateway",
          "http://127.0.0.1:8080",
          "--machine",
          "local-dev-machine",
          "--json",
          "--",
          "node",
          "-e",
          "console.log('noesis-ok')",
        ],
        { client: fakeClient },
      ),
    ).resolves.toEqual({
      exitCode: 1,
      stdout: "",
      stderr:
        "Owner Token is required for task run (--owner-token or NOESIS_OWNER_TOKEN)\n",
    });
  });

  it("reads owner token from NOESIS_OWNER_TOKEN env", async () => {
    process.env.NOESIS_OWNER_TOKEN = "env-token";
    const result = await runCli(
      [
        "task",
        "run",
        "--gateway",
        "http://127.0.0.1:8080",
        "--machine",
        "local-dev-machine",
        "--json",
        "--",
        "node",
        "-e",
        "console.log('noesis-ok')",
      ],
      { client: fakeClient },
    );
    delete process.env.NOESIS_OWNER_TOKEN;
    expect(result.exitCode).toBe(0);
  });
});
```

- [ ] **Step 4: Build CLI**

Run: `pnpm --filter @noesis/cli build`
Expected: Compiles clean.

- [ ] **Step 5: Run CLI tests**

Run: `pnpm --filter @noesis/cli test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/main.ts packages/cli/src/cli.test.ts
git commit -m "feat(cli): task run 支持 --owner-token / NOESIS_OWNER_TOKEN"
```

---

### Task 8: Client Agent 测试更新

**Files:**

- Modify: `packages/client/src/client.test.ts`

**Blast radius note:** Test-only, no upstream callers.

- [ ] **Step 1: 更新 supervisor 构造**

In `packages/client/src/client.test.ts`, the `createClientSupervisor` call may need `ownerToken` if the interface changed. Check if `createClientSupervisor` accepts `ownerToken` — currently it doesn't since supervisor is tested without WS. The current test creates `createClientSupervisor({ gatewayUrl })` and asserts on shape. No change needed since `client.test.ts` doesn't call `startClientAgent`.

- [ ] **Step 2: Run client tests**

Run: `pnpm --filter @noesis/client test`
Expected: All existing tests pass.

- [ ] **Step 3: No commit needed if no change**

---

### Task 9: Web — gateway-api.ts

**Files:**

- Create: `packages/web/src/gateway-api.ts`

**Blast radius note:** New file, no callers.

- [ ] **Step 1: 创建 gateway-api.ts**

Create `packages/web/src/gateway-api.ts`:

```ts
import type { GatewayInfo } from "@noesis/shared";

/** Gateway API 错误分类 */
export type GatewayApiError =
  | { kind: "unauthorized" }
  | { kind: "unreachable" }
  | { kind: "server-error"; message: string };

/**
 * 使用 Owner Token 请求 Gateway info 端点。
 * 成功返回 GatewayInfo；失败返回分类后的错误。
 */
export async function getGatewayInfo(
  ownerToken: string,
): Promise<GatewayInfo | GatewayApiError> {
  try {
    const response = await fetch("/api/gateway/info", {
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    if (response.status === 401) {
      return { kind: "unauthorized" };
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message =
        typeof body?.error?.message === "string"
          ? body.error.message
          : "Unknown error";
      return { kind: "server-error", message };
    }

    const body = await response.json();
    if (body?.ok === true && body.data !== undefined) {
      return body.data as GatewayInfo;
    }

    return { kind: "server-error", message: "Unexpected Gateway response" };
  } catch {
    return { kind: "unreachable" };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/gateway-api.ts
git commit -m "feat(web): 新增 gateway-api.ts — Gateway info 请求与错误分类"
```

---

### Task 10: Web — Vite proxy 配置

**Files:**

- Modify: `packages/web/vite.config.ts`

- [ ] **Step 1: 添加 /api proxy**

In `packages/web/vite.config.ts`, add `server.proxy`:

```ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8080",
    },
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/vite.config.ts
git commit -m "feat(web): Vite dev proxy /api → http://127.0.0.1:8080"
```

---

### Task 11: Web — App 登录验证、启动检查、设置页

**Files:**

- Modify: `packages/web/src/App.tsx`

**Blast radius note:** `App` upstream → `main.tsx` (LOW). Rerun if stale.

- [ ] **Step 1: 添加 import 和 auth state 类型**

At top of `packages/web/src/App.tsx`, add:

```ts
import { getGatewayInfo, type GatewayApiError } from "./gateway-api.js";
import type { GatewayInfo } from "@noesis/shared";
```

- [ ] **Step 2: 修改 App 组件 — 添加 loading state**

In `App()`, replace the simple `ownerToken` state with an auth state machine:

```ts
type AuthState =
  | { phase: "checking" }
  | { phase: "login" }
  | { phase: "authenticated"; token: string; info: GatewayInfo };

export function App() {
  const [auth, setAuth] = useState<AuthState>(() => {
    const stored = readStoredOwnerToken();
    return stored !== null ? { phase: "checking" } : { phase: "login" };
  });
  const [theme, setTheme] = useState<NoesisTheme>(() => readStoredTheme());
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() =>
    readStoredSidebarCollapsed(),
  );

  // Verify stored token on mount
  useEffect(() => {
    if (auth.phase !== "checking") return;
    const stored = readStoredOwnerToken();
    if (stored === null) {
      setAuth({ phase: "login" });
      return;
    }
    let cancelled = false;
    getGatewayInfo(stored).then((result) => {
      if (cancelled) return;
      if ("kind" in result) {
        // Token invalid or unreachable
        clearOwnerToken(browserStorage()!);
        setAuth({ phase: "login" });
        return;
      }
      setAuth({ phase: "authenticated", token: stored, info: result });
    });
    return () => { cancelled = true; };
  }, [auth.phase]);

  // theme effect unchanged ...
```

- [ ] **Step 3: 修改 handleLogin 为异步 Gateway 验证**

Replace `handleLogin`:

```ts
async function handleLogin(token: string): Promise<GatewayApiError | null> {
  const result = await getGatewayInfo(token);
  if ("kind" in result) return result;
  const storage = browserStorage();
  if (storage === null) {
    return { kind: "server-error", message: "本地存储不可用" };
  }
  if (!saveOwnerToken(storage, token)) {
    return { kind: "server-error", message: "无法保存 Owner Token" };
  }
  setAuth({ phase: "authenticated", token: token.trim(), info: result });
  return null;
}
```

- [ ] **Step 4: 修改 handleLogout**

```ts
function handleLogout() {
  const storage = browserStorage();
  if (storage !== null) clearOwnerToken(storage);
  setAuth({ phase: "login" });
}
```

- [ ] **Step 5: 修改渲染分支**

Replace the render conditional:

```tsx
return (
  <HashRouter>
    <div className="noesis-background">
      {auth.phase === "checking" ? (
        <CheckingPage />
      ) : auth.phase === "login" ? (
        <LoginPage
          onLogin={handleLogin}
          onToggleTheme={toggleTheme}
          theme={theme}
        />
      ) : (
        <ConsoleShell
          gatewayInfo={auth.info}
          onLogout={handleLogout}
          onToggleSidebarCollapsed={toggleSidebarCollapsed}
          onToggleTheme={toggleTheme}
          sidebarCollapsed={sidebarCollapsed}
          theme={theme}
        />
      )}
    </div>
  </HashRouter>
);
```

- [ ] **Step 6: 新增 CheckingPage 组件**

```tsx
function CheckingPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Card className="noesis-panel max-w-md text-center">
        <CardHeader>
          <Activity className="mx-auto size-8 animate-spin text-primary" aria-hidden="true" />
          <CardTitle className="pt-4">正在连接 Gateway…</CardTitle>
          <CardDescription>正在验证本地保存的 Owner Token。</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
```

Add `Activity` to lucide imports if not already:

```ts
import {
  Activity,
  // ... existing
} from "lucide-react";
```

Note: `Activity` already imported (line 6 of current App.tsx). Good.

- [ ] **Step 7: 修改 LoginPage — 异步登录 + 错误分类**

Replace `handleSubmit` to call async `onLogin`:

```tsx
function LoginPage({
  onLogin,
  onToggleTheme,
  theme,
}: {
  onLogin: (token: string) => Promise<GatewayApiError | null>;
  onToggleTheme: () => void;
  theme: NoesisTheme;
}) {
  const navigate = useNavigate();
  const [ownerToken, setOwnerToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = ownerToken.trim();
    if (normalized.length === 0) {
      setError("请输入 Owner Token。");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await onLogin(normalized);
    setSubmitting(false);
    if (result === null) {
      // success — wait for auth state to propagate via parent
      navigate("/dashboard", { replace: true });
      return;
    }
    if (result.kind === "unauthorized") {
      setError("Owner Token 无效。");
    } else if (result.kind === "unreachable") {
      setError("无法连接 Gateway。");
    } else {
      setError("Gateway 暂时不可用。");
    }
  }

  // ... rest of JSX unchanged, but add disabled={submitting} to submit button
```

Update submit button:

```tsx
<Button className="w-full" disabled={submitting} type="submit">
  {submitting ? "正在验证…" : "进入控制台"}
</Button>
```

- [ ] **Step 8: 修改 ConsoleShell — 不再需要 ownerToken prop，用 gatewayInfo**

Change ConsoleShell props:

```tsx
function ConsoleShell({
  gatewayInfo,
  onLogout,
  onToggleSidebarCollapsed,
  onToggleTheme,
  sidebarCollapsed,
  theme,
}: {
  gatewayInfo: GatewayInfo;
  onLogout: () => void;
  onToggleSidebarCollapsed: () => void;
  onToggleTheme: () => void;
  sidebarCollapsed: boolean;
  theme: NoesisTheme;
}) {
```

Pass `gatewayInfo` to `DashboardPage` and `SettingsPage` instead of `ownerToken`. Update routes:

```tsx
<Route
  element={<DashboardPage gatewayInfo={gatewayInfo} />}
  path="/dashboard"
/>
<Route element={<MachinesPage />} path="/machines" />
<Route element={<TasksPage />} path="/tasks" />
<Route
  element={
    <SettingsPage gatewayInfo={gatewayInfo} onLogout={handleLogout} />
  }
  path="/settings"
/>
```

- [ ] **Step 9: 修改 DashboardPage — 使用 gatewayInfo**

```tsx
function DashboardPage({ gatewayInfo }: { gatewayInfo: GatewayInfo }) {
  return (
    <div className="space-y-6">
      <PageHeading
        description="当前只展示 P0 控制闭环的真实边界：Gateway、Machine、Task 与协议版本。"
        title="仪表盘"
      />

      <section
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        aria-label="P0 控制闭环占位状态"
      >
        {statusCards.map((card) => (
          <Card className="noesis-panel noesis-card-hover" key={card.title}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div>
                <CardDescription>{card.title}</CardDescription>
                <CardTitle className="mt-2 text-2xl">{card.value}</CardTitle>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-2 text-primary">
                <card.icon className="size-5" aria-hidden="true" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}

        {/* Gateway 真实状态卡 */}
        <Card className="noesis-panel noesis-card-hover">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
            <div>
              <CardDescription>Gateway Info</CardDescription>
              <CardTitle className="mt-2 text-lg">{gatewayInfo.name}</CardTitle>
            </div>
            <div className="rounded-lg border border-accent/30 bg-accent/10 p-2 text-accent">
              <CheckCircle2 className="size-5" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              协议 {gatewayInfo.protocolVersion} · 认证 {gatewayInfo.auth.mode} · 能力 {gatewayInfo.capabilities.join(", ")}
            </p>
          </CardContent>
        </Card>
      </section>

      <Card className="noesis-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-primary" aria-hidden="true" />
            控制面状态
          </CardTitle>
          <CardDescription>
            Gateway 已连接并完成 Owner Token 认证。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <StatusChip icon={ShieldCheck} label="认证模式" value={gatewayInfo.auth.mode} />
          <StatusChip icon={Network} label="Gateway" value={gatewayInfo.name} />
          <StatusChip icon={Bot} label="协议版本" value={gatewayInfo.protocolVersion} />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 10: 修改 SettingsPage — 使用 gatewayInfo**

```tsx
function SettingsPage({
  gatewayInfo,
  onLogout,
}: {
  gatewayInfo: GatewayInfo;
  onLogout: () => void;
}) {
  return (
    <div className="space-y-6">
      <PageHeading
        description="Gateway 基础信息和本地认证状态。"
        title="设置"
      />
      <Card className="noesis-panel max-w-2xl">
        <CardHeader>
          <CardTitle>Owner Token</CardTitle>
          <CardDescription>
            已认证，Token 不会在界面显示明文。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/70 bg-secondary/40 p-4 text-sm text-muted-foreground">
            当前状态：
            <span className="font-medium text-foreground">已认证</span>
          </div>
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Gateway：</span>
              <span className="font-medium">{window.location.origin}</span>
            </div>
            <div>
              <span className="text-muted-foreground">协议版本：</span>
              <span className="font-medium">{gatewayInfo.protocolVersion}</span>
            </div>
            <div>
              <span className="text-muted-foreground">认证模式：</span>
              <span className="font-medium">{gatewayInfo.auth.mode}</span>
            </div>
            <div>
              <span className="text-muted-foreground">能力：</span>
              <span className="font-medium">
                {gatewayInfo.capabilities.join(", ")}
              </span>
            </div>
          </div>
          <Separator />
          <Button onClick={onLogout} variant="destructive">
            <LogOut aria-hidden="true" />
            退出并清除本地 Token
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 11: Build web**

Run: `pnpm --filter @noesis/web build`
Expected: Compiles clean, no TS errors.

- [ ] **Step 12: Run web tests**

Run: `pnpm --filter @noesis/web test`
Expected: Tests pass. The `session.test.ts` tests should pass (they don't depend on App).

- [ ] **Step 13: Commit**

```bash
git add packages/web/src/App.tsx
git commit -m "feat(web): Gateway 登录验证、启动检查、设置页改为真实 GatewayInfo"
```

---

### Task 12: Distribution 与文档更新

**Files:**

- Modify: `scripts/build-distribution.mjs`
- Modify: `scripts/verify-distribution.mjs`
- Modify: `README.md`

- [ ] **Step 1: 更新 build-distribution.mjs 打包 web/dist**

In `scripts/build-distribution.mjs`, after bundling Gateway, copy web/dist into the Gateway staging dir. After the `await vendorWs(gatewayDir)` line:

```js
// Copy web/dist into gateway artifact
const webDist = join(root, "packages", "web", "dist");
if (existsSync(webDist)) {
  const webDest = join(gatewayDir, "web");
  await mkdir(webDest, { recursive: true });
  run(process.platform === "win32" ? "xcopy" : "cp", [
    process.platform === "win32" ? webDist + "\\*" : webDist,
    webDest,
    process.platform === "win32" ? "/E /I /Q" : "-r",
  ]);
}
```

Need to add `await` before this block since it's in an async context. Also ensure `webDest` path uses `posix` if needed for tar — but since we use `-C stagingDir`, relative paths should be fine. The `cp` copies directory contents; for `xcopy` we need the trailing `*`.

- [ ] **Step 2: 更新 verify-distribution.mjs 传 --owner-token**

In `scripts/verify-distribution.mjs`, update Gateway start command:

```js
const gateway = startNode(join(gatewayDir, "dist", "gateway.mjs"), [
  "--port", "0",
  "--owner-token", "dev-owner-token",
]);
```

Update Client Agent start command:

```js
const client = startNode(join(clientDir, "dist", "client-agent.mjs"), [
  "--gateway", ready.httpUrl,
  "--machine-id", "local-dev-machine",
  "--owner-token", "dev-owner-token",
]);
```

Update CLI run args (add `--owner-token` before `--`) :

```js
const stdout = runCapture(process.execPath, [
  cliScript,
  "task", "run",
  "--gateway", ready.httpUrl,
  "--machine", "local-dev-machine",
  "--owner-token", "dev-owner-token",
  "--json",
  "--",
  "node", "-e", "console.log('noesis-ok')",
]);
```

Note: `--owner-token` must appear before `--` separator since the command after `--` is the node command.

- [ ] **Step 3: 更新 README.md 手动步骤**

In `README.md`, update step 4 (Start Gateway):

```bash
node /tmp/noesis-test/noesis-gateway-0.0.0/dist/gateway.mjs --port 6375 --owner-token "dev-owner-token"
```

Update step 5 (Start Client Agent):

```bash
node /tmp/noesis-test/noesis-client-agent-0.0.0/dist/agent.mjs \
  --gateway http://127.0.0.1:6375 \
  --machine my-dev-machine \
  --owner-token "dev-owner-token"
```

Update step 6 (Execute command):

```bash
noesis task run \
  --gateway http://127.0.0.1:6375 \
  --machine my-dev-machine \
  --owner-token "dev-owner-token" \
  --json \
  -- node -e "console.log('noesis-ok')"
```

Add a short note after step 6:

> 生产使用建议将 `dev-owner-token` 替换为高熵随机串，例如：`openssl rand -hex 32`。

- [ ] **Step 4: Run verify:distribution**

Run: `pnpm verify:distribution`
Expected: Distribution builds and verifies clean with `dev-owner-token`.

- [ ] **Step 5: Run full verify**

Run: `pnpm verify`
Expected: All checks pass (builds, tests, boundaries).

- [ ] **Step 6: Commit**

```bash
git add scripts/build-distribution.mjs scripts/verify-distribution.mjs README.md
git commit -m "feat(distribution): 集成 Owner Token 认证和 Web 静态托管"
```

---

## Post-implementation verification

After all tasks complete, run:

```bash
pnpm verify
pnpm verify:distribution
```

Expected: All builds, tests, and boundary checks pass. Distribution smoke test passes with `dev-owner-token` end-to-end.
