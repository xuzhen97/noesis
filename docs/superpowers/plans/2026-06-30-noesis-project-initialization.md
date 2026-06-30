# Noesis Project Initialization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal, verifiable `noesis/` pnpm TypeScript monorepo for the P0 Gateway / Client Agent / Machine / Task / Task Event control-loop skeleton.

**Architecture:** One workspace root owns scripts and governance. Six packages keep one-way dependencies: `shared` is the protocol base, `server`, `client`, `sdk`, and `web` consume `shared`, and `cli` consumes `sdk`. The code intentionally exposes only smoke-testable entrypoints and avoids future capability directories.

**Tech Stack:** pnpm 10, TypeScript, Vitest, Vite, React 19, Node 24.

---

## File Structure

Create or modify these files only:

```text
noesis/
  package.json                         # root workspace scripts and dev deps
  pnpm-workspace.yaml                  # packages/* workspace
  tsconfig.base.json                   # shared TS compiler defaults
  README.md                            # project entry and scope warning
  scripts/check-boundaries.mjs         # final dependency/scope guard
  docs/superpowers/plans/2026-06-30-noesis-project-initialization.md

  packages/shared/
    package.json
    tsconfig.json
    src/index.ts                       # public protocol exports
    src/protocol.ts                    # Machine / Task / Task Event / health protocol
    src/errors.ts                      # minimal error shape
    src/protocol.test.ts               # smoke test

  packages/server/
    package.json
    tsconfig.json
    src/index.ts
    src/app.ts                         # Gateway app shape
    src/health/index.ts                # health slice
    src/machines/index.ts              # Machine slice marker shape
    src/tasks/index.ts                 # Task slice marker shape
    src/ws/index.ts                    # control channel marker shape
    src/db/index.ts                    # persistence marker shape
    src/server.test.ts                 # smoke test

  packages/client/
    package.json
    tsconfig.json
    src/index.ts
    src/supervisor/index.ts            # Client Agent supervisor shape
    src/ws-client/index.ts             # ws client config shape
    src/task-runner/index.ts           # supported task type check
    src/command-executor/index.ts      # command.run description, no shell execution
    src/client.test.ts                 # smoke test

  packages/sdk/
    package.json
    tsconfig.json
    src/index.ts                       # NoesisClient + ping shape
    src/sdk.test.ts                    # smoke test

  packages/cli/
    package.json
    tsconfig.json
    src/main.ts                        # help/version runner
    src/cli.test.ts                    # smoke test

  packages/web/
    package.json
    tsconfig.json
    index.html
    vite.config.ts
    src/main.tsx
    src/App.tsx
    src/styles.css
```

Do not create these directories in this plan:

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

### Task 1: Workspace Governance and Root Commands

**Files:**

- Create: `noesis/package.json`
- Create: `noesis/pnpm-workspace.yaml`
- Create: `noesis/tsconfig.base.json`
- Create: `noesis/README.md`
- Existing: `noesis/CONTEXT.md`
- Existing: `noesis/AGENTS.md`
- Existing: `noesis/docs/adr/0001-package-dependency-direction.md`
- Existing: `noesis/.scratch/noesis-project-initialization/PRD.md`

- [ ] **Step 1: Write the root workspace files**

Create `noesis/package.json`:

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

Create `noesis/pnpm-workspace.yaml`:

```yaml
packages:
  - "packages/*"
```

Create `noesis/tsconfig.base.json`:

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

Create `noesis/README.md`:

```md
# Noesis 灵识

Noesis 灵识 is a personal Human-AI Symbiotic Workspace. This repository is the fresh project root for the new implementation.

## Current scope

This workspace is intentionally small. The initialization phase only creates the P0 control-loop skeleton around these concepts:

- Gateway
- Client Agent
- Machine
- Task
- Task Event

Do not copy implementation code from `noesis_bak`. Do not create future capability modules until their phase starts.

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## Project language

Business-language docs use Simplified Chinese by default. Code identifiers, package names, protocol fields, database fields, and enum values use English.

```

- [ ] **Step 2: Install workspace dependencies**

Run from the current repository root:

```bash
cd "noesis" && pnpm install
```

Expected: pnpm creates `pnpm-lock.yaml` and exits successfully.

- [ ] **Step 3: Verify root commands before packages exist**

Run:

```bash
cd "noesis" && pnpm build
cd "noesis" && pnpm test
```

Expected: both commands exit successfully or no-op across an empty `packages/*` workspace.

- [ ] **Step 4: Commit workspace root**

Run from the repository root:

```bash
git add noesis/package.json noesis/pnpm-workspace.yaml noesis/tsconfig.base.json noesis/README.md noesis/pnpm-lock.yaml
git commit -m "chore(noesis): initialize workspace root"
```

Expected: one commit containing only the root workspace files and lockfile.

---

### Task 2: Shared Protocol Foundation

**Files:**

- Create: `noesis/packages/shared/package.json`
- Create: `noesis/packages/shared/tsconfig.json`
- Create: `noesis/packages/shared/src/protocol.test.ts`
- Create: `noesis/packages/shared/src/protocol.ts`
- Create: `noesis/packages/shared/src/errors.ts`
- Create: `noesis/packages/shared/src/index.ts`

- [ ] **Step 1: Create package metadata and failing smoke test**

Create `noesis/packages/shared/package.json`:

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

Create `noesis/packages/shared/tsconfig.json`:

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

Create `noesis/packages/shared/src/protocol.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  createNoesisError,
  protocolVersion,
  type Machine,
  type Task,
  type TaskEvent,
} from "./index.js";

describe("shared protocol foundation", () => {
  it("exports the P0 protocol vocabulary", () => {
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

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd "noesis" && pnpm --filter @noesis/shared test
```

Expected: FAIL with an import error for `./index.js` because the shared implementation files do not exist yet.

- [ ] **Step 3: Add the minimal shared implementation**

Create `noesis/packages/shared/src/protocol.ts`:

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

Create `noesis/packages/shared/src/errors.ts`:

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

Create `noesis/packages/shared/src/index.ts`:

```ts
export * from "./errors.js";
export * from "./protocol.js";
```

- [ ] **Step 4: Run shared build and test**

Run:

```bash
cd "noesis" && pnpm --filter @noesis/shared build
cd "noesis" && pnpm --filter @noesis/shared test
```

Expected: both commands PASS.

- [ ] **Step 5: Commit shared package**

Run from the repository root:

```bash
git add noesis/packages/shared
git commit -m "feat(noesis): add shared protocol foundation"
```

Expected: one commit containing only the shared package.

---

### Task 3: Gateway Health Slice

**Files:**

- Create: `noesis/packages/server/package.json`
- Create: `noesis/packages/server/tsconfig.json`
- Create: `noesis/packages/server/src/server.test.ts`
- Create: `noesis/packages/server/src/index.ts`
- Create: `noesis/packages/server/src/app.ts`
- Create: `noesis/packages/server/src/health/index.ts`
- Create: `noesis/packages/server/src/machines/index.ts`
- Create: `noesis/packages/server/src/tasks/index.ts`
- Create: `noesis/packages/server/src/ws/index.ts`
- Create: `noesis/packages/server/src/db/index.ts`

- [ ] **Step 1: Create package metadata and failing smoke test**

Create `noesis/packages/server/package.json`:

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

Create `noesis/packages/server/tsconfig.json`:

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

Create `noesis/packages/server/src/server.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createGatewayApp } from "./index.js";

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
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd "noesis" && pnpm build && pnpm --filter @noesis/server test
```

Expected: FAIL with an import error for `./index.js` because the Gateway implementation files do not exist yet.

- [ ] **Step 3: Add the minimal Gateway implementation**

Create `noesis/packages/server/src/health/index.ts`:

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

Create `noesis/packages/server/src/machines/index.ts`:

```ts
export const machinesSlice = "machines" as const;
```

Create `noesis/packages/server/src/tasks/index.ts`:

```ts
export const tasksSlice = "tasks" as const;
```

Create `noesis/packages/server/src/ws/index.ts`:

```ts
export const wsSlice = "ws" as const;
```

Create `noesis/packages/server/src/db/index.ts`:

```ts
export const dbSlice = "db" as const;
```

Create `noesis/packages/server/src/app.ts`:

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

Create `noesis/packages/server/src/index.ts`:

```ts
export * from "./app.js";
export * from "./health/index.js";
```

- [ ] **Step 4: Run Gateway build and test**

Run:

```bash
cd "noesis" && pnpm build
cd "noesis" && pnpm --filter @noesis/server test
```

Expected: both commands PASS.

- [ ] **Step 5: Commit Gateway package**

Run from the repository root:

```bash
git add noesis/packages/server
git commit -m "feat(noesis): add gateway health slice"
```

Expected: one commit containing only the Gateway package.

---

### Task 4: Client Agent command.run Shape

**Files:**

- Create: `noesis/packages/client/package.json`
- Create: `noesis/packages/client/tsconfig.json`
- Create: `noesis/packages/client/src/client.test.ts`
- Create: `noesis/packages/client/src/index.ts`
- Create: `noesis/packages/client/src/supervisor/index.ts`
- Create: `noesis/packages/client/src/ws-client/index.ts`
- Create: `noesis/packages/client/src/task-runner/index.ts`
- Create: `noesis/packages/client/src/command-executor/index.ts`

- [ ] **Step 1: Create package metadata and failing smoke test**

Create `noesis/packages/client/package.json`:

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

Create `noesis/packages/client/tsconfig.json`:

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

Create `noesis/packages/client/src/client.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createClientSupervisor } from "./index.js";

describe("Client Agent command.run shape", () => {
  it("exposes the P0 Client Agent execution shape without running a shell", () => {
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

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd "noesis" && pnpm build && pnpm --filter @noesis/client test
```

Expected: FAIL with an import error for `./index.js` because the Client Agent implementation files do not exist yet.

- [ ] **Step 3: Add the minimal Client Agent implementation**

Create `noesis/packages/client/src/ws-client/index.ts`:

```ts
export interface ClientWsShape {
  gatewayUrl: string;
}

export function createClientWsShape(gatewayUrl: string): ClientWsShape {
  return { gatewayUrl };
}
```

Create `noesis/packages/client/src/task-runner/index.ts`:

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

Create `noesis/packages/client/src/command-executor/index.ts`:

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

Create `noesis/packages/client/src/supervisor/index.ts`:

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

Create `noesis/packages/client/src/index.ts`:

```ts
export * from "./supervisor/index.js";
```

- [ ] **Step 4: Run Client Agent build and test**

Run:

```bash
cd "noesis" && pnpm build
cd "noesis" && pnpm --filter @noesis/client test
```

Expected: both commands PASS.

- [ ] **Step 5: Commit Client Agent package**

Run from the repository root:

```bash
git add noesis/packages/client
git commit -m "feat(noesis): add client agent command shape"
```

Expected: one commit containing only the Client Agent package.

---

### Task 5: SDK and CLI Connection Shell

**Files:**

- Create: `noesis/packages/sdk/package.json`
- Create: `noesis/packages/sdk/tsconfig.json`
- Create: `noesis/packages/sdk/src/sdk.test.ts`
- Create: `noesis/packages/sdk/src/index.ts`
- Create: `noesis/packages/cli/package.json`
- Create: `noesis/packages/cli/tsconfig.json`
- Create: `noesis/packages/cli/src/cli.test.ts`
- Create: `noesis/packages/cli/src/main.ts`

- [ ] **Step 1: Create SDK package metadata and failing smoke test**

Create `noesis/packages/sdk/package.json`:

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

Create `noesis/packages/sdk/tsconfig.json`:

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

Create `noesis/packages/sdk/src/sdk.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { NoesisClient } from "./index.js";

describe("Noesis SDK shell", () => {
  it("constructs a client and exposes a deterministic ping shape", async () => {
    const client = new NoesisClient({ baseUrl: "http://127.0.0.1:8080" });

    await expect(client.ping()).resolves.toEqual({
      ok: true,
      baseUrl: "http://127.0.0.1:8080",
      protocolVersion: "0.1.0",
    });
  });
});
```

- [ ] **Step 2: Run the SDK test to verify it fails**

Run:

```bash
cd "noesis" && pnpm build && pnpm --filter @noesis/sdk test
```

Expected: FAIL with an import error for `./index.js` because the SDK implementation does not exist yet.

- [ ] **Step 3: Add the minimal SDK implementation**

Create `noesis/packages/sdk/src/index.ts`:

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

- [ ] **Step 4: Run SDK build and test**

Run:

```bash
cd "noesis" && pnpm build
cd "noesis" && pnpm --filter @noesis/sdk test
```

Expected: both commands PASS.

- [ ] **Step 5: Create CLI package metadata and failing smoke test**

Create `noesis/packages/cli/package.json`:

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

Create `noesis/packages/cli/tsconfig.json`:

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

Create `noesis/packages/cli/src/cli.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { runCli } from "./main.js";

describe("Noesis CLI shell", () => {
  it("renders help", () => {
    expect(runCli(["--help"])).toEqual({
      exitCode: 0,
      stdout: "Noesis CLI\n\nCommands:\n  noesis --help\n  noesis version\n",
    });
  });

  it("renders version through the SDK shell", () => {
    expect(runCli(["version"])).toEqual({
      exitCode: 0,
      stdout: "noesis 0.0.0\nsdk ping protocol 0.1.0\n",
    });
  });
});
```

- [ ] **Step 6: Run the CLI test to verify it fails**

Run:

```bash
cd "noesis" && pnpm build && pnpm --filter @noesis/cli test
```

Expected: FAIL with an import error for `./main.js` because the CLI implementation does not exist yet.

- [ ] **Step 7: Add the minimal CLI implementation**

Create `noesis/packages/cli/src/main.ts`:

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

- [ ] **Step 8: Run SDK and CLI build/test**

Run:

```bash
cd "noesis" && pnpm build
cd "noesis" && pnpm --filter @noesis/sdk test
cd "noesis" && pnpm --filter @noesis/cli test
```

Expected: all commands PASS.

- [ ] **Step 9: Commit SDK and CLI packages**

Run from the repository root:

```bash
git add noesis/packages/sdk noesis/packages/cli
git commit -m "feat(noesis): add sdk and cli shells"
```

Expected: one commit containing only SDK and CLI packages.

---

### Task 6: Web Console Shell

**Files:**

- Create: `noesis/packages/web/package.json`
- Create: `noesis/packages/web/tsconfig.json`
- Create: `noesis/packages/web/index.html`
- Create: `noesis/packages/web/vite.config.ts`
- Create: `noesis/packages/web/src/main.tsx`
- Create: `noesis/packages/web/src/App.tsx`
- Create: `noesis/packages/web/src/styles.css`

- [ ] **Step 1: Create Web package metadata and app files**

Create `noesis/packages/web/package.json`:

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

Create `noesis/packages/web/tsconfig.json`:

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

Create `noesis/packages/web/index.html`:

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

Create `noesis/packages/web/vite.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
});
```

Create `noesis/packages/web/src/App.tsx`:

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

Create `noesis/packages/web/src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./styles.css";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Noesis Web root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

Create `noesis/packages/web/src/styles.css`:

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

- [ ] **Step 2: Install Web dependencies**

Run:

```bash
cd "noesis" && pnpm install
```

Expected: pnpm lockfile updates with React and Vite dependencies.

- [ ] **Step 3: Run Web build/test**

Run:

```bash
cd "noesis" && pnpm build
cd "noesis" && pnpm --filter @noesis/web test
```

Expected: both commands PASS and Vite produces a production build for the Web shell.

- [ ] **Step 4: Commit Web package**

Run from the repository root:

```bash
git add noesis/packages/web noesis/pnpm-lock.yaml
git commit -m "feat(noesis): add web console shell"
```

Expected: one commit containing the Web package and dependency lockfile updates.

---

### Task 7: Verify Dependency Direction and Initialization Scope

**Files:**

- Modify: `noesis/package.json`
- Create: `noesis/scripts/check-boundaries.mjs`

- [ ] **Step 1: Add root boundary scripts**

Replace `noesis/package.json` with:

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

- [ ] **Step 2: Add the boundary check script**

Create `noesis/scripts/check-boundaries.mjs`:

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
    fail(`Unexpected Noesis package: ${name}`);
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
    fail(`${manifest.name} has unexpected Noesis deps: ${unexpected.join(", ")}`);
  }

  if (missing.length > 0) {
    fail(`${manifest.name} is missing expected Noesis deps: ${missing.join(", ")}`);
  }
}

for (const relativeDir of forbiddenDirs) {
  if (existsSync(join(root, relativeDir))) {
    fail(`Forbidden initialization directory exists: ${relativeDir}`);
  }
}

if (process.exitCode === undefined) {
  console.log("Noesis initialization boundaries OK");
}
```

- [ ] **Step 3: Run the boundary script**

Run:

```bash
cd "noesis" && pnpm check:boundaries
```

Expected: PASS with:

```text
Noesis initialization boundaries OK
```

- [ ] **Step 4: Run full workspace verification**

Run:

```bash
cd "noesis" && pnpm verify
```

Expected: build, package smoke tests, Web build, and boundary checks all PASS.

- [ ] **Step 5: Commit boundary verification**

Run from the repository root:

```bash
git add noesis/package.json noesis/scripts/check-boundaries.mjs
git commit -m "test(noesis): verify initialization boundaries"
```

Expected: one commit containing the root verification script and script updates.

---

## Final Verification

Run from the repository root:

```bash
cd "noesis" && pnpm install
cd "noesis" && pnpm verify
```

Expected final result:

```text
Noesis initialization boundaries OK
```

and all package builds/tests pass.

## Self-Review

- Spec coverage: all seven issues map to Tasks 1-7.
- Placeholder scan: no `TBD`, unfinished requirements, or open implementation gaps remain in the task steps.
- Type consistency: `protocolVersion`, `Machine`, `Task`, `TaskEvent`, `NoesisClient`, `createGatewayApp`, and `createClientSupervisor` are defined before later tasks use them.
- Scope check: the plan does not create out-of-scope modules and includes a boundary script to keep that true.
