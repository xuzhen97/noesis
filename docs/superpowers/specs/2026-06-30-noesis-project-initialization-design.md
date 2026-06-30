# Noesis Project Initialization Design

## Goal

Initialize `noesis/` as a small, verifiable pnpm TypeScript monorepo that can host the P0 control loop without inheriting the over-broad shape of `noesis_bak`.

## Scope

This design covers the seven `noesis-project-initialization` issues:

1. Workspace governance and root commands
2. Shared protocol foundation
3. Gateway health slice
4. Client Agent `command.run` shape
5. SDK and CLI connection shell
6. Web console shell
7. Dependency direction and scope verification

The result is an engineering skeleton, not a product runtime. It must build and test, but it must not implement real Gateway APIs, real Client Agent WebSocket behavior, real command execution, or later capability domains.

## Architecture

The workspace has one active project root: `noesis/`. It contains governance docs, local issue tracker material, and six packages:

```text
packages/
  shared/
  server/
  client/
  sdk/
  cli/
  web/
```

Dependency direction stays one-way:

```text
shared
  ↑
  ├─ server
  ├─ client
  ├─ sdk
  │   ↑
  │   └─ cli
  └─ web
```

`shared` is the only protocol base. It exports minimal domain protocol types and error shapes. It does not contain DB logic, repositories, Gateway helpers, Client Agent helpers, or runtime business logic.

`server` represents the Gateway control plane and starts with a health/app shape plus the minimum slice boundaries named in `AGENTS.md`: health, machines, tasks, ws, and db. It avoids empty horizontal layers such as controllers or services.

`client` represents the Client Agent execution plane and starts with only the P0 execution shape: supervisor, ws-client, task-runner, and command-executor. The command executor describes a `command.run` task shape but does not execute a shell.

`sdk` exposes a minimal `NoesisClient` connection shape. `cli` is a thin shell over SDK behavior and only exposes help/version behavior. `web` is a Vite React shell that displays Noesis, Gateway, Machines, and Tasks placeholders; it does not depend on SDK during initialization.

## Data Flow

There is no live product data flow yet. The initialization flow is build/test verification:

```text
pnpm install
  -> pnpm build
       -> shared builds first
       -> dependent packages compile against shared
  -> pnpm test
       -> package smoke tests run
       -> boundary script verifies dependency direction and excluded modules
```

The only runtime-like behavior is deterministic, in-process smoke behavior: creating a health object, constructing a Client Agent supervisor, describing whether a task type is supported, constructing an SDK client, and rendering a Web shell.

## Error Handling

Initialization code should fail early and simply:

- package smoke tests fail if a public entrypoint breaks;
- TypeScript build fails if package contracts drift;
- the boundary script fails if a forbidden package dependency or out-of-scope directory appears;
- no network, database, shell, or WebSocket failures are modeled in this phase.

## Testing Design

Testing uses the highest useful seams:

- root build/test commands prove the workspace is coherent;
- package smoke tests prove public entrypoints are usable;
- Web build proves the console shell compiles;
- a small Node boundary script checks dependency direction and initialization scope.

Tests must not assert future modules exist, and they must not depend on `noesis_bak`, real network services, real Gateway instances, or real Client Agent processes.

## Out of Scope

This design deliberately excludes Pi Agent, Pi Terminal, FRP, StorageProvider, Release Center, Install Center, Updater, Runbook, Todo/Context/Tag, Browser Use, Computer Use, WebRTC, plugin, and skills modules. Those capabilities can add directories only when their own phase starts.

## Spec Self-Review

- Placeholder scan: no placeholder sections remain.
- Consistency check: package dependencies match `AGENTS.md` and ADR 0001.
- Scope check: this is one initialization project, already split into seven thin issues.
- Ambiguity check: real runtime behavior is explicitly out of scope; only build/test scaffolding is included.
