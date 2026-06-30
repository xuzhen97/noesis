Status: ready-for-agent

# PRD: Noesis 项目结构初始化

## Problem Statement

用户需要重新启动 Noesis 项目，但之前的 `noesis_bak` 一次性铺开过多能力域，导致项目结构过早复杂、实现失控、后续 Agent 难以稳定推进。

用户当前真正需要的不是完整产品实现，而是一个边界清晰、语言统一、依赖方向可控、能被后续 Agent 安全接手的 Noesis 初始化项目骨架。

## Solution

在 `noesis` 项目根下初始化一个最小 pnpm TypeScript monorepo，只建立 P0 控制闭环需要的包和治理文档。

初始化结果应让后续 Agent 能围绕 Gateway、Client Agent、Machine、Task、Task Event 继续实现第一条可运行闭环，同时避免提前创建 Pi、FRP、自动化、Runbook、Release、Install、Storage 等后续阶段目录。

项目初始化完成后，用户应能运行统一的 build/test 命令验证整个空壳工程健康，并能通过 `CONTEXT.md`、`AGENTS.md`、ADR 和 PRD 理解当前边界。

## User Stories

1. As a Noesis maintainer, I want the project initialized under a dedicated `noesis` root, so that the new project is clearly separated from prior failed work.
2. As a Noesis maintainer, I want no implementation code copied from `noesis_bak`, so that previous overreach does not leak into the new architecture.
3. As a Noesis maintainer, I want a minimal pnpm monorepo, so that all packages share one workspace while staying independently understandable.
4. As a Noesis maintainer, I want TypeScript as the common language across packages, so that Gateway, Client Agent, Web, SDK, and CLI use one type system.
5. As a Noesis maintainer, I want root build and test commands, so that every future Agent can verify the skeleton before making changes.
6. As a Noesis maintainer, I want package-level smoke tests, so that each package has a minimal external behavior check from day one.
7. As a Noesis maintainer, I want the business language documented in Simplified Chinese, so that product discussion, issues, ADRs, and UI copy stay consistent.
8. As a Noesis maintainer, I want code identifiers and protocol fields to remain English, so that implementation stays conventional and interoperable.
9. As a Noesis maintainer, I want a domain glossary, so that Gateway, Client Agent, Machine, Task, and Task Event are used consistently.
10. As a Noesis maintainer, I want `CONTEXT.md` to remain a glossary only, so that implementation plans and temporary notes do not pollute domain language.
11. As a Noesis maintainer, I want `AGENTS.md` to define project rules, so that future Agents know the initialization boundary and package structure.
12. As a Noesis maintainer, I want package dependencies to be one-way, so that early architecture does not become tangled.
13. As a Noesis maintainer, I want `shared` to contain only protocol types, common types, errors, and schemas, so that it does not become a runtime utility dumping ground.
14. As a Noesis maintainer, I want Gateway concerns separated from Client Agent concerns, so that control-plane and execution-plane code cannot accidentally depend on each other.
15. As a Noesis maintainer, I want the CLI to depend on the SDK, so that the CLI remains a thin interface over the integration layer.
16. As a Noesis maintainer, I want Web not to depend on SDK during initialization, so that the first Web shell does not inherit external integration abstractions too early.
17. As a Gateway developer, I want the Gateway package organized around minimal feature slices, so that health, machines, tasks, WebSocket, and persistence can grow independently.
18. As a Gateway developer, I want no empty controller/service/repository layers during initialization, so that abstractions are introduced only when repeated code proves they are needed.
19. As a Client Agent developer, I want the Client Agent package to contain only the P0 execution loop shape, so that command execution can be proven before file, Pi, FRP, update, or policy subsystems exist.
20. As a Client Agent developer, I want command execution to be the first execution seam, so that the first control loop has one clear target.
21. As a Web developer, I want a minimal Web shell, so that the console can show the product shape without pretending that full pages exist.
22. As a Web developer, I want no empty pages/features/store/api directories during initialization, so that UI structure is driven by real pages later.
23. As an SDK developer, I want a minimal `NoesisClient` connection shape, so that integration code has a stable starting point without fake business APIs.
24. As a CLI developer, I want only help and version behavior first, so that CLI structure stays thin until Gateway APIs stabilize.
25. As a future Agent, I want a PRD and ADR documenting initialization decisions, so that I can continue without re-litigating settled boundaries.
26. As a future Agent, I want build/test to fail if the skeleton is invalid, so that I get fast feedback before implementing features.
27. As a future Agent, I want the initialization scope to exclude later product surfaces, so that I do not create speculative directories or placeholder modules.
28. As a future Agent, I want explicit out-of-scope items, so that I do not accidentally implement StorageProvider, Pi, FRP, Runbook, Todo, Browser Use, or Computer Use during scaffolding.
29. As a Noesis maintainer, I want ADRs used sparingly, so that only meaningful architectural decisions are recorded.
30. As a Noesis maintainer, I want the package dependency decision recorded as an ADR, so that future changes to dependency direction are deliberate.

## Implementation Decisions

- Initialize a new `noesis` project root and treat it as the active codebase for this work.
- Do not migrate implementation code from `noesis_bak`.
- Use a pnpm TypeScript monorepo.
- Create only six initial packages: shared protocol/types, Gateway, Client Agent, Web, SDK, and CLI.
- The first implementation boundary is P0 control-loop scaffolding: Gateway, Client Agent, Machine, Task, and Task Event.
- Business-language documentation uses Simplified Chinese by default.
- Code identifiers, package names, protocol fields, database fields, and enum values use English.
- The domain glossary owns canonical terms and must not include implementation details.
- `AGENTS.md` owns project rules for language, initialization scope, package responsibilities, and dependency direction.
- The shared package is limited to protocol types, common types, error shapes, and schemas.
- The shared package must not contain database logic, repositories, Gateway helpers, Client Agent helpers, or runtime business logic.
- Gateway initialization uses minimal feature slices: health, machines, tasks, WebSocket, and persistence.
- Gateway initialization avoids empty horizontal layers such as controllers, services, repositories, middlewares, and utilities.
- Client Agent initialization keeps only supervisor, WebSocket client shape, task runner shape, and command executor shape.
- Client Agent initialization excludes file operations, Pi management, Pi terminal, FRP, updater, storage client, and policy engine.
- Web initialization uses Vite + React + TypeScript but only renders a minimal product shell.
- Web initialization does not create placeholder page, feature, component, store, API, or route directories.
- SDK initialization exposes only a minimal client connection shape and `ping()` behavior.
- CLI initialization exposes only help and version behavior.
- CLI business commands wait until Gateway API contracts stabilize.
- Package dependencies are one-way: shared is the base; Gateway, Client Agent, SDK, and Web may depend on shared; CLI depends on SDK; SDK depends on shared; Web does not depend on SDK during initialization.
- The package dependency direction is recorded as an ADR because changing it later has meaningful architectural impact.
- No other ADR is required for simple scaffolding choices unless a future decision is hard to reverse, surprising without context, and a real trade-off.

## Testing Decisions

- The primary test seam is the workspace-level external behavior: the root build command and root test command must pass.
- Tests should verify package entrypoints and externally visible behavior, not internal file layout implementation details.
- Each package should have one minimal smoke test proving that its public entrypoint is usable.
- Shared tests should prove protocol and error exports can be imported and used.
- Gateway tests should prove the Gateway app or health shape is externally visible.
- Client Agent tests should prove the Client Agent startup shape or exported supervisor shape is externally visible.
- SDK tests should prove `NoesisClient` can be constructed and `ping()` has the expected connection shape.
- CLI tests should prove help/version behavior works from the package entrypoint.
- Web validation should use the package build as the first high-level seam instead of component-level tests during scaffolding.
- Architecture constraints should be enforced initially through package dependency declarations and TypeScript build behavior, avoiding new architecture tooling until it is needed.
- Good tests for this PRD are small, deterministic, and fail if the package public surface breaks.
- Tests must not assert speculative future modules exist.
- Tests must not depend on external network services, real Gateway instances, real Client Agent processes, or `noesis_bak`.

## Out of Scope

- Implementing real Gateway HTTP APIs beyond minimal health/app shape.
- Implementing real Client Agent WebSocket registration or heartbeat behavior.
- Implementing real command execution.
- Implementing SQLite migrations or persistence beyond any minimal placeholder needed for build/test.
- Implementing Web pages beyond the minimal shell.
- Implementing SDK business APIs for machines, tasks, files, Pi, transfers, runbooks, approvals, todos, or audit.
- Implementing CLI business commands.
- Creating Pi Agent, Pi Terminal, FRP, StorageProvider, Release Center, Install Center, Updater, Runbook, Todo/Context/Tag, Browser Use, Computer Use, WebRTC, plugin, or skills modules.
- Creating empty future-facing directories for later phases.
- Adding new dependencies that are not required for the minimal build/test skeleton.
- Designing the full P0 runtime flow; this PRD only initializes the structure that will host it.

## Further Notes

- The failure mode to avoid is “architecture by anticipation”: adding directories and abstractions because the root design documents mention them.
- The success criterion is boring: a small, navigable monorepo that builds and tests cleanly.
- Later phases can add modules when a real feature slice needs them.
- If a future Agent wants to add an abstraction, it should first prove repeated need inside the current package rather than adding a cross-cutting layer preemptively.
