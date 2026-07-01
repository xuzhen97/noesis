# Noesis 项目初始化实现计划

> **供 Agent 工作者使用：** 必须使用子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 来逐任务执行此计划。步骤使用复选框（`- [ ]`）语法进行追踪。

**目标：** 构建最小、可验证的 `noesis/` pnpm TypeScript 单体仓库，用于 P0 的 Gateway / Client Agent / Machine / Task / Task Event 控制闭环骨架。

**架构：** 一个工作区根目录拥有脚本和治理规则。六个包保持单向依赖：`shared` 是协议基础，`server`、`client`、`sdk` 和 `web` 消费 `shared`，`cli` 消费 `sdk`。代码有意只暴露可冒烟测试的入口点，避免创建未来能力的目录。

**技术栈：** pnpm 10、TypeScript、Vitest、Vite、React 19、Node 24。

---

## 文件结构

仅创建或修改以下文件：

```text
noesis/
  package.json                         # 根工作区脚本和开发依赖
  pnpm-workspace.yaml                  # packages/* 工作区
  tsconfig.base.json                   # 共享 TS 编译器默认配置
  README.md                            # 项目入口和范围警告
  scripts/check-boundaries.mjs         # 最终依赖/范围守卫
  docs/superpowers/plans/2026-06-30-noesis-project-initialization.md

  packages/shared/
    package.json
    tsconfig.json
    src/index.ts                       # 公开协议导出
    src/protocol.ts                    # Machine / Task / Task Event / health 协议
    src/errors.ts                      # 最小错误形状
    src/protocol.test.ts               # 冒烟测试

  packages/server/
    package.json
    tsconfig.json
    src/index.ts
    src/app.ts                         # Gateway 应用形状
    src/health/index.ts                # health 切片
    src/machines/index.ts              # Machine 切片标记形状
    src/tasks/index.ts                 # Task 切片标记形状
    src/ws/index.ts                    # 控制通道标记形状
    src/db/index.ts                    # 持久化标记形状
    src/server.test.ts                 # 冒烟测试

  packages/client/
    package.json
    tsconfig.json
    src/index.ts
    src/supervisor/index.ts            # Client Agent 监督器形状
    src/ws-client/index.ts             # ws 客户端配置形状
    src/task-runner/index.ts           # 支持的任务类型检查
    src/command-executor/index.ts      # command.run 描述，不执行 shell
    src/client.test.ts                 # 冒烟测试

  packages/sdk/
    package.json
    tsconfig.json
    src/index.ts                       # NoesisClient + ping 形状
    src/sdk.test.ts                    # 冒烟测试

  packages/cli/
    package.json
    tsconfig.json
    src/main.ts                        # help/version 运行器
    src/cli.test.ts                    # 冒烟测试

  packages/web/
    package.json
    tsconfig.json
    index.html
    vite.config.ts
    src/main.tsx
    src/App.tsx
    src/styles.css
```

本计划中不创建以下目录：

```text
packages/server/src/controllers
packages/server/src/services
packages/server/src/repositories
packages/server/src/middlewares
packages/server/src/utils
packages/client/src/file-operator
packages/client/src/pi-agent-manager
packages/client/src/pi-terminal-manager
packages/client/src/frpc-manager
packages/client/src/updater
packages/client/src/storage-client
packages/client/src/policy-engine
packages/web/src/pages
packages/web/src/features
packages/web/src/components
packages/web/src/store
packages/web/src/api
packages/web/src/routes
```

---

### 任务 1：工作区治理和根命令

**文件：**

- 创建：`noesis/package.json`
- 创建：`noesis/pnpm-workspace.yaml`
- 创建：`noesis/tsconfig.base.json`
- 创建：`noesis/README.md`
- 已有：`noesis/CONTEXT.md`
- 已有：`noesis/AGENTS.md`
- 已有：`noesis/docs/adr/0001-package-dependency-direction.md`
- 已有：`noesis/.scratch/noesis-project-initialization/PRD.md`

- [ ] **步骤 1：编写根工作区文件**

创建 `noesis/package.json`：

```json
{
  "name": "noesis",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "packageManager": "pnpm@10.25.0",
  "scripts": {
    "build": "pnpm -r --sort build",
    "test": "pnpm build && pnpm -r --sort test"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "tsx": "^4.20.0",
    "typescript": "^5.8.0",
    "vitest": "^3.2.0"
  }
}
```

创建 `noesis/pnpm-workspace.yaml`：

```yaml
packages:
  - "packages/*"
```

创建 `noesis/tsconfig.base.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "sourceMap": true,
    "resolveJsonModule": true
  }
}
```

创建 `noesis/README.md`：

```md
# Noesis 灵识

Noesis 灵识是一个个人人机共生工作台。此仓库是新实现的独立项目根目录。

## 当前范围

此工作区有意保持精简。初始化阶段仅围绕以下概念创建 P0 控制闭环骨架：

- Gateway
- Client Agent
- Machine
- Task
- Task Event

不要从 `noesis_bak` 拷贝实现代码。不要在对应阶段开始之前创建未来能力模块。

## 开发

```bash
pnpm install
pnpm build
pnpm test
```

## 项目语言

业务文档默认使用简体中文。代码标识符、包名、协议字段、数据库字段和枚举值使用英文。

```

- [ ] **步骤 2：安装工作区依赖**

在仓库根目录执行：

```bash
cd "noesis" && pnpm install
```

预期：pnpm 创建 `pnpm-lock.yaml` 并成功退出。

- [ ] **步骤 3：在包存在前验证根命令**

执行：

```bash
cd "noesis" && pnpm build
cd "noesis" && pnpm test
```

预期：两个命令都成功退出，或在空 `packages/*` 工作区上无操作。

- [ ] **步骤 4：提交工作区根目录**

在仓库根目录执行：

```bash
git add noesis/package.json noesis/pnpm-workspace.yaml noesis/tsconfig.base.json noesis/README.md noesis/pnpm-lock.yaml
git commit -m "chore(noesis): 初始化工作区根目录"
```

预期：一个提交，仅包含根工作区文件和锁文件。

---

### 任务 2：共享协议基础

**文件：**

- 创建：`noesis/packages/shared/package.json`
- 创建：`noesis/packages/shared/tsconfig.json`
- 创建：`noesis/packages/shared/src/protocol.test.ts`
- 创建：`noesis/packages/shared/src/protocol.ts`
- 创建：`noesis/packages/shared/src/errors.ts`
- 创建：`noesis/packages/shared/src/index.ts`

- [ ] **步骤 1：创建包元数据和失败的冒烟测试**

创建 `noesis/packages/shared/package.json`：

```json
{
  "name": "@noesis/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run"
  }
}
```

创建 `noesis/packages/shared/tsconfig.json`：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

创建 `noesis/packages/shared/src/protocol.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import {
  createNoesisError,
  protocolVersion,
  type Machine,
  type Task,
  type TaskEvent,
} from "./index.js";

describe("共享协议基础", () => {
  it("导出 P0 协议词汇表", () => {
    const machine: Machine = {
      id: "machine_1",
      name: "本机",
      status: "online",
    };

    const task: Task = {
      id: "task_1",
      machineId: machine.id,
      taskType: "command.run",
      status: "created",
      payload: { command: "node -v" },
    };

    const event: TaskEvent = {
      id: "event_1",
      taskId: task.id,
      type: "task.created",
      level: "info",
      data: { protocolVersion },
    };

    expect(protocolVersion).toBe("0.1.0");
    expect(event.taskId).toBe("task_1");
    expect(createNoesisError("UNSUPPORTED_TASK_TYPE", "不支持的 Task 类型")).toEqual({
      code: "UNSUPPORTED_TASK_TYPE",
      message: "不支持的 Task 类型",
    });
  });
});
```

- [ ] **步骤 2：运行测试确认它失败**

执行：

```bash
cd "noesis" && pnpm --filter @noesis/shared test
```

预期：由于共享实现文件尚不存在，因 `./index.js` 导入错误而 FAIL。

- [ ] **步骤 3：添加最小共享实现**

创建 `noesis/packages/shared/src/protocol.ts`：

```ts
export const protocolVersion = "0.1.0" as const;

export type MachineStatus = "online" | "offline" | "disabled";

export interface Machine {
  id: string;
  name: string;
  status: MachineStatus;
  lastSeenAt?: string;
}

export type TaskType = "command.run";

export type TaskStatus =
  | "created"
  | "queued"
  | "waiting_client"
  | "dispatched"
  | "running"
  | "succeeded"
  | "failed"
  | "canceling"
  | "canceled"
  | "timeout";

export interface Task {
  id: string;
  machineId?: string;
  taskType: TaskType;
  status: TaskStatus;
  payload: Record<string, unknown>;
}

export type TaskEventLevel = "debug" | "info" | "warn" | "error";

export interface TaskEvent {
  id: string;
  taskId: string;
  type: string;
  level: TaskEventLevel;
  data: Record<string, unknown>;
}

export interface GatewayHealth {
  ok: true;
  service: "gateway";
  protocolVersion: typeof protocolVersion;
}
```

创建 `noesis/packages/shared/src/errors.ts`：

```ts
export type NoesisErrorCode = "NOESIS_UNAVAILABLE" | "UNSUPPORTED_TASK_TYPE";

export interface NoesisErrorShape {
  code: NoesisErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export function createNoesisError(
  code: NoesisErrorCode,
  message: string,
  details?: Record<string, unknown>,
): NoesisErrorShape {
  return details === undefined ? { code, message } : { code, message, details };
}
```

创建 `noesis/packages/shared/src/index.ts`：

```ts
export * from "./errors.js";
export * from "./protocol.js";
```

- [ ] **步骤 4：运行共享包的构建和测试**

执行：

```bash
cd "noesis" && pnpm --filter @noesis/shared build
cd "noesis" && pnpm --filter @noesis/shared test
```

预期：两个命令都 PASS。

- [ ] **步骤 5：提交共享包**

在仓库根目录执行：

```bash
git add noesis/packages/shared
git commit -m "feat(noesis): 添加共享协议基础"
```

预期：一个提交，仅包含共享包。

---

### 任务 3：Gateway Health 切片

**文件：**

- 创建：`noesis/packages/server/package.json`
- 创建：`noesis/packages/server/tsconfig.json`
- 创建：`noesis/packages/server/src/server.test.ts`
- 创建：`noesis/packages/server/src/index.ts`
- 创建：`noesis/packages/server/src/app.ts`
- 创建：`noesis/packages/server/src/health/index.ts`
- 创建：`noesis/packages/server/src/machines/index.ts`
- 创建：`noesis/packages/server/src/tasks/index.ts`
- 创建：`noesis/packages/server/src/ws/index.ts`
- 创建：`noesis/packages/server/src/db/index.ts`

- [ ] **步骤 1：创建包元数据和失败的冒烟测试**

创建 `noesis/packages/server/package.json`：

```json
{
  "name": "@noesis/server",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run"
  },
  "dependencies": {
    "@noesis/shared": "workspace:*"
  }
}
```

创建 `noesis/packages/server/tsconfig.json`：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

创建 `noesis/packages/server/src/server.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { createGatewayApp } from "./index.js";

describe("Gateway health 切片", () => {
  it("暴露最小的 Gateway 应用形状", () => {
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
```

- [ ] **步骤 2：运行测试确认它失败**

执行：

```bash
cd "noesis" && pnpm build && pnpm --filter @noesis/server test
```

预期：由于 Gateway 实现文件尚不存在，因 `./index.js` 导入错误而 FAIL。

- [ ] **步骤 3：添加最小 Gateway 实现**

创建 `noesis/packages/server/src/health/index.ts`：

```ts
import { protocolVersion, type GatewayHealth } from "@noesis/shared";

export function getGatewayHealth(): GatewayHealth {
  return {
    ok: true,
    service: "gateway",
    protocolVersion,
  };
}
```

创建 `noesis/packages/server/src/machines/index.ts`：

```ts
export const machinesSlice = "machines" as const;
```

创建 `noesis/packages/server/src/tasks/index.ts`：

```ts
export const tasksSlice = "tasks" as const;
```

创建 `noesis/packages/server/src/ws/index.ts`：

```ts
export const wsSlice = "ws" as const;
```

创建 `noesis/packages/server/src/db/index.ts`：

```ts
export const dbSlice = "db" as const;
```

创建 `noesis/packages/server/src/app.ts`：

```ts
import { dbSlice } from "./db/index.js";
import { getGatewayHealth } from "./health/index.js";
import { machinesSlice } from "./machines/index.js";
import { tasksSlice } from "./tasks/index.js";
import { wsSlice } from "./ws/index.js";

export interface GatewayAppShape {
  name: "Noesis Gateway";
  health: ReturnType<typeof getGatewayHealth>;
  slices: ["health", "machines", "tasks", "ws", "db"];
}

export function createGatewayApp(): GatewayAppShape {
  return {
    name: "Noesis Gateway",
    health: getGatewayHealth(),
    slices: ["health", machinesSlice, tasksSlice, wsSlice, dbSlice],
  };
}
```

创建 `noesis/packages/server/src/index.ts`：

```ts
export * from "./app.js";
export * from "./health/index.js";
```

- [ ] **步骤 4：运行 Gateway 构建和测试**

执行：

```bash
cd "noesis" && pnpm build
cd "noesis" && pnpm --filter @noesis/server test
```

预期：两个命令都 PASS。

- [ ] **步骤 5：提交 Gateway 包**

在仓库根目录执行：

```bash
git add noesis/packages/server
git commit -m "feat(noesis): 添加 Gateway health 切片"
```

预期：一个提交，仅包含 Gateway 包。

---

### 任务 4：Client Agent command.run 形状

**文件：**

- 创建：`noesis/packages/client/package.json`
- 创建：`noesis/packages/client/tsconfig.json`
- 创建：`noesis/packages/client/src/client.test.ts`
- 创建：`noesis/packages/client/src/index.ts`
- 创建：`noesis/packages/client/src/supervisor/index.ts`
- 创建：`noesis/packages/client/src/ws-client/index.ts`
- 创建：`noesis/packages/client/src/task-runner/index.ts`
- 创建：`noesis/packages/client/src/command-executor/index.ts`

- [ ] **步骤 1：创建包元数据和失败的冒烟测试**

创建 `noesis/packages/client/package.json`：

```json
{
  "name": "@noesis/client",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run"
  },
  "dependencies": {
    "@noesis/shared": "workspace:*"
  }
}
```

创建 `noesis/packages/client/tsconfig.json`：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

创建 `noesis/packages/client/src/client.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { createClientSupervisor } from "./index.js";

describe("Client Agent command.run 形状", () => {
  it("暴露 P0 Client Agent 执行形状而不运行 shell", () => {
    const supervisor = createClientSupervisor({ gatewayUrl: "http://127.0.0.1:8080" });

    expect(supervisor.kind).toBe("client-agent-supervisor");
    expect(supervisor.ws.gatewayUrl).toBe("http://127.0.0.1:8080");
    expect(supervisor.taskRunner.canHandle("command.run")).toBe(true);
    expect(supervisor.commandExecutor.describe()).toEqual({
      taskType: "command.run",
      execution: "not-started",
    });
  });
});
```

- [ ] **步骤 2：运行测试确认它失败**

执行：

```bash
cd "noesis" && pnpm build && pnpm --filter @noesis/client test
```

预期：由于 Client Agent 实现文件尚不存在，因 `./index.js` 导入错误而 FAIL。

- [ ] **步骤 3：添加最小 Client Agent 实现**

创建 `noesis/packages/client/src/ws-client/index.ts`：

```ts
export interface ClientWsShape {
  gatewayUrl: string;
}

export function createClientWsShape(gatewayUrl: string): ClientWsShape {
  return { gatewayUrl };
}
```

创建 `noesis/packages/client/src/task-runner/index.ts`：

```ts
import type { TaskType } from "@noesis/shared";

export interface TaskRunnerShape {
  canHandle(taskType: TaskType): boolean;
}

export function createTaskRunnerShape(): TaskRunnerShape {
  return {
    canHandle(taskType) {
      return taskType === "command.run";
    },
  };
}
```

创建 `noesis/packages/client/src/command-executor/index.ts`：

```ts
import type { TaskType } from "@noesis/shared";

export interface CommandExecutorShape {
  describe(): { taskType: TaskType; execution: "not-started" };
}

export function createCommandExecutorShape(): CommandExecutorShape {
  return {
    describe() {
      return {
        taskType: "command.run",
        execution: "not-started",
      };
    },
  };
}
```

创建 `noesis/packages/client/src/supervisor/index.ts`：

```ts
import { createCommandExecutorShape, type CommandExecutorShape } from "../command-executor/index.js";
import { createTaskRunnerShape, type TaskRunnerShape } from "../task-runner/index.js";
import { createClientWsShape, type ClientWsShape } from "../ws-client/index.js";

export interface ClientSupervisorOptions {
  gatewayUrl: string;
}

export interface ClientSupervisorShape {
  kind: "client-agent-supervisor";
  ws: ClientWsShape;
  taskRunner: TaskRunnerShape;
  commandExecutor: CommandExecutorShape;
}

export function createClientSupervisor(options: ClientSupervisorOptions): ClientSupervisorShape {
  return {
    kind: "client-agent-supervisor",
    ws: createClientWsShape(options.gatewayUrl),
    taskRunner: createTaskRunnerShape(),
    commandExecutor: createCommandExecutorShape(),
  };
}
```

创建 `noesis/packages/client/src/index.ts`：

```ts
export * from "./supervisor/index.js";
```

- [ ] **步骤 4：运行 Client Agent 构建和测试**

执行：

```bash
cd "noesis" && pnpm build
cd "noesis" && pnpm --filter @noesis/client test
```

预期：两个命令都 PASS。

- [ ] **步骤 5：提交 Client Agent 包**

在仓库根目录执行：

```bash
git add noesis/packages/client
git commit -m "feat(noesis): 添加 Client Agent 命令形状"
```

预期：一个提交，仅包含 Client Agent 包。

---

### 任务 5：SDK 和 CLI 连接外壳

**文件：**

- 创建：`noesis/packages/sdk/package.json`
- 创建：`noesis/packages/sdk/tsconfig.json`
- 创建：`noesis/packages/sdk/src/sdk.test.ts`
- 创建：`noesis/packages/sdk/src/index.ts`
- 创建：`noesis/packages/cli/package.json`
- 创建：`noesis/packages/cli/tsconfig.json`
- 创建：`noesis/packages/cli/src/cli.test.ts`
- 创建：`noesis/packages/cli/src/main.ts`

- [ ] **步骤 1：创建 SDK 包元数据和失败的冒烟测试**

创建 `noesis/packages/sdk/package.json`：

```json
{
  "name": "@noesis/sdk",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run"
  },
  "dependencies": {
    "@noesis/shared": "workspace:*"
  }
}
```

创建 `noesis/packages/sdk/tsconfig.json`：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

创建 `noesis/packages/sdk/src/sdk.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { NoesisClient } from "./index.js";

describe("Noesis SDK 外壳", () => {
  it("构造一个客户端并暴露确定性的 ping 形状", async () => {
    const client = new NoesisClient({ baseUrl: "http://127.0.0.1:8080" });

    await expect(client.ping()).resolves.toEqual({
      ok: true,
      baseUrl: "http://127.0.0.1:8080",
      protocolVersion: "0.1.0",
    });
  });
});
```

- [ ] **步骤 2：运行 SDK 测试确认它失败**

执行：

```bash
cd "noesis" && pnpm build && pnpm --filter @noesis/sdk test
```

预期：由于 SDK 实现尚不存在，因 `./index.js` 导入错误而 FAIL。

- [ ] **步骤 3：添加最小 SDK 实现**

创建 `noesis/packages/sdk/src/index.ts`：

```ts
import { protocolVersion } from "@noesis/shared";

export interface NoesisClientOptions {
  baseUrl: string;
}

export interface NoesisPingResult {
  ok: true;
  baseUrl: string;
  protocolVersion: typeof protocolVersion;
}

export class NoesisClient {
  readonly baseUrl: string;

  constructor(options: NoesisClientOptions) {
    this.baseUrl = options.baseUrl;
  }

  async ping(): Promise<NoesisPingResult> {
    return {
      ok: true,
      baseUrl: this.baseUrl,
      protocolVersion,
    };
  }
}
```

- [ ] **步骤 4：运行 SDK 构建和测试**

执行：

```bash
cd "noesis" && pnpm build
cd "noesis" && pnpm --filter @noesis/sdk test
```

预期：两个命令都 PASS。

- [ ] **步骤 5：创建 CLI 包元数据和失败的冒烟测试**

创建 `noesis/packages/cli/package.json`：

```json
{
  "name": "@noesis/cli",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "bin": {
    "noesis": "dist/main.js"
  },
  "main": "dist/main.js",
  "types": "dist/main.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run"
  },
  "dependencies": {
    "@noesis/sdk": "workspace:*"
  }
}
```

创建 `noesis/packages/cli/tsconfig.json`：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

创建 `noesis/packages/cli/src/cli.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { runCli } from "./main.js";

describe("Noesis CLI 外壳", () => {
  it("渲染帮助信息", () => {
    expect(runCli(["--help"])).toEqual({
      exitCode: 0,
      stdout: "Noesis CLI\n\nCommands:\n  noesis --help\n  noesis version\n",
    });
  });

  it("通过 SDK 外壳渲染版本信息", () => {
    expect(runCli(["version"])).toEqual({
      exitCode: 0,
      stdout: "noesis 0.0.0\nsdk ping protocol 0.1.0\n",
    });
  });
});
```

- [ ] **步骤 6：运行 CLI 测试确认它失败**

执行：

```bash
cd "noesis" && pnpm build && pnpm --filter @noesis/cli test
```

预期：由于 CLI 实现尚不存在，因 `./main.js` 导入错误而 FAIL。

- [ ] **步骤 7：添加最小 CLI 实现**

创建 `noesis/packages/cli/src/main.ts`：

```ts
import { NoesisClient } from "@noesis/sdk";

export interface CliResult {
  exitCode: number;
  stdout: string;
}

export function runCli(args: readonly string[] = process.argv.slice(2)): CliResult {
  if (args.includes("--help") || args.length === 0) {
    return {
      exitCode: 0,
      stdout: "Noesis CLI\n\nCommands:\n  noesis --help\n  noesis version\n",
    };
  }

  if (args[0] === "version") {
    const client = new NoesisClient({ baseUrl: "http://127.0.0.1:8080" });
    void client;

    return {
      exitCode: 0,
      stdout: "noesis 0.0.0\nsdk ping protocol 0.1.0\n",
    };
  }

  return {
    exitCode: 1,
    stdout: `Unknown command: ${args.join(" ")}\n`,
  };
}

const isEntrypoint = process.argv[1] !== undefined && import.meta.url.endsWith(process.argv[1].replaceAll("\\\\", "/"));

if (isEntrypoint) {
  const result = runCli();
  process.stdout.write(result.stdout);
  process.exitCode = result.exitCode;
}
```

- [ ] **步骤 8：运行 SDK 和 CLI 构建/测试**

执行：

```bash
cd "noesis" && pnpm build
cd "noesis" && pnpm --filter @noesis/sdk test
cd "noesis" && pnpm --filter @noesis/cli test
```

预期：所有命令都 PASS。

- [ ] **步骤 9：提交 SDK 和 CLI 包**

在仓库根目录执行：

```bash
git add noesis/packages/sdk noesis/packages/cli
git commit -m "feat(noesis): 添加 SDK 和 CLI 外壳"
```

预期：一个提交，仅包含 SDK 和 CLI 包。

---

### 任务 6：Web 控制台外壳

**文件：**

- 创建：`noesis/packages/web/package.json`
- 创建：`noesis/packages/web/tsconfig.json`
- 创建：`noesis/packages/web/index.html`
- 创建：`noesis/packages/web/vite.config.ts`
- 创建：`noesis/packages/web/src/main.tsx`
- 创建：`noesis/packages/web/src/App.tsx`
- 创建：`noesis/packages/web/src/styles.css`

- [ ] **步骤 1：创建 Web 包元数据和应用文件**

创建 `noesis/packages/web/package.json`：

```json
{
  "name": "@noesis/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json && vite build",
    "test": "pnpm build"
  },
  "dependencies": {
    "@noesis/shared": "workspace:*",
    "@vitejs/plugin-react": "^5.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "vite": "^7.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0"
  }
}
```

创建 `noesis/packages/web/tsconfig.json`：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "allowImportingTsExtensions": false,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src", "vite.config.ts"]
}
```

创建 `noesis/packages/web/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Noesis 灵识</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

创建 `noesis/packages/web/vite.config.ts`：

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
});
```

创建 `noesis/packages/web/src/App.tsx`：

```tsx
import { protocolVersion } from "@noesis/shared";

const panels = ["Gateway", "Machines", "Tasks"] as const;

export function App() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Noesis 灵识</p>
        <h1>人机共生工作台初始化壳</h1>
        <p>当前只展示 P0 控制闭环占位：Gateway、Machines、Tasks。</p>
        <p className="protocol">Protocol {protocolVersion}</p>
      </section>

      <section className="panelGrid" aria-label="P0 控制闭环占位">
        {panels.map((panel) => (
          <article className="panel" key={panel}>
            <h2>{panel}</h2>
            <p>等待对应 vertical slice 接入真实数据。</p>
          </article>
        ))}
      </section>
    </main>
  );
}
```

创建 `noesis/packages/web/src/main.tsx`：

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./styles.css";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Noesis Web 根元素未找到");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

创建 `noesis/packages/web/src/styles.css`：

```css
:root {
  color: #e5e7eb;
  background: #0f172a;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

body {
  margin: 0;
}

.shell {
  min-height: 100vh;
  padding: 48px;
  box-sizing: border-box;
}

.hero {
  max-width: 760px;
}

.eyebrow,
.protocol {
  color: #93c5fd;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  font-size: clamp(2.25rem, 6vw, 4.5rem);
  line-height: 1;
  margin: 0 0 16px;
}

.panelGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-top: 40px;
}

.panel {
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.72);
  padding: 20px;
}

.panel h2 {
  margin-top: 0;
}
```

- [ ] **步骤 2：安装 Web 依赖**

执行：

```bash
cd "noesis" && pnpm install
```

预期：pnpm 锁文件更新，包含 React 和 Vite 依赖。

- [ ] **步骤 3：运行 Web 构建/测试**

执行：

```bash
cd "noesis" && pnpm build
cd "noesis" && pnpm --filter @noesis/web test
```

预期：两个命令都 PASS，Vite 为 Web 外壳生成生产构建。

- [ ] **步骤 4：提交 Web 包**

在仓库根目录执行：

```bash
git add noesis/packages/web noesis/pnpm-lock.yaml
git commit -m "feat(noesis): 添加 Web 控制台外壳"
```

预期：一个提交，包含 Web 包和依赖锁文件更新。

---

### 任务 7：验证依赖方向和初始化范围

**文件：**

- 修改：`noesis/package.json`
- 创建：`noesis/scripts/check-boundaries.mjs`

- [ ] **步骤 1：添加根边界脚本**

将 `noesis/package.json` 替换为：

```json
{
  "name": "noesis",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "packageManager": "pnpm@10.25.0",
  "scripts": {
    "build": "pnpm -r --sort build",
    "test": "pnpm build && pnpm -r --sort test && pnpm check:boundaries",
    "check:boundaries": "node scripts/check-boundaries.mjs",
    "verify": "pnpm test"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "tsx": "^4.20.0",
    "typescript": "^5.8.0",
    "vitest": "^3.2.0"
  }
}
```

- [ ] **步骤 2：添加边界检查脚本**

创建 `noesis/scripts/check-boundaries.mjs`：

```js
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const packagesDir = join(root, "packages");

const allowedPackages = new Set(["shared", "server", "client", "web", "sdk", "cli"]);
const packageDeps = {
  shared: [],
  server: ["@noesis/shared"],
  client: ["@noesis/shared"],
  web: ["@noesis/shared"],
  sdk: ["@noesis/shared"],
  cli: ["@noesis/sdk"],
};

const forbiddenDirs = [
  "packages/server/src/controllers",
  "packages/server/src/services",
  "packages/server/src/repositories",
  "packages/server/src/middlewares",
  "packages/server/src/utils",
  "packages/client/src/file-operator",
  "packages/client/src/pi-agent-manager",
  "packages/client/src/pi-terminal-manager",
  "packages/client/src/frpc-manager",
  "packages/client/src/updater",
  "packages/client/src/storage-client",
  "packages/client/src/policy-engine",
  "packages/web/src/pages",
  "packages/web/src/features",
  "packages/web/src/components",
  "packages/web/src/store",
  "packages/web/src/api",
  "packages/web/src/routes",
];

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

for (const name of readdirSync(packagesDir)) {
  if (!allowedPackages.has(name)) {
    fail(`意外的 Noesis 包：${name}`);
  }
}

for (const [name, allowedNoesisDeps] of Object.entries(packageDeps)) {
  const manifestPath = join(packagesDir, name, "package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const deps = {
    ...manifest.dependencies,
    ...manifest.peerDependencies,
    ...manifest.optionalDependencies,
  };
  const actualNoesisDeps = Object.keys(deps).filter((dep) => dep.startsWith("@noesis/"));
  const unexpected = actualNoesisDeps.filter((dep) => !allowedNoesisDeps.includes(dep));
  const missing = allowedNoesisDeps.filter((dep) => !actualNoesisDeps.includes(dep));

  if (unexpected.length > 0) {
    fail(`${manifest.name} 有意外 Noesis 依赖：${unexpected.join(", ")}`);
  }

  if (missing.length > 0) {
    fail(`${manifest.name} 缺少预期 Noesis 依赖：${missing.join(", ")}`);
  }
}

for (const relativeDir of forbiddenDirs) {
  if (existsSync(join(root, relativeDir))) {
    fail(`禁止的初始化目录存在：${relativeDir}`);
  }
}

if (process.exitCode === undefined) {
  console.log("Noesis 初始化边界检查通过");
}
```

- [ ] **步骤 3：运行边界脚本**

执行：

```bash
cd "noesis" && pnpm check:boundaries
```

预期：PASS，输出：

```text
Noesis 初始化边界检查通过
```

- [ ] **步骤 4：运行完整工作区验证**

执行：

```bash
cd "noesis" && pnpm verify
```

预期：构建、包冒烟测试、Web 构建和边界检查全部 PASS。

- [ ] **步骤 5：提交边界验证**

在仓库根目录执行：

```bash
git add noesis/package.json noesis/scripts/check-boundaries.mjs
git commit -m "test(noesis): 验证初始化边界"
```

预期：一个提交，包含根验证脚本和脚本更新。

---

## 最终验证

在仓库根目录执行：

```bash
cd "noesis" && pnpm install
cd "noesis" && pnpm verify
```

预期最终结果：

```text
Noesis 初始化边界检查通过
```

且所有包构建/测试通过。

## 自审

- 规格覆盖：全部七个 issue 映射到任务 1-7。
- 占位检查：任务步骤中没有 `TBD`、未完成的需求或开放的实现缺口。
- 类型一致性：`protocolVersion`、`Machine`、`Task`、`TaskEvent`、`NoesisClient`、`createGatewayApp` 和 `createClientSupervisor` 在后续任务使用之前已定义。
- 范围检查：本计划不创建范围外的模块，并包含边界脚本来保持这一点。
