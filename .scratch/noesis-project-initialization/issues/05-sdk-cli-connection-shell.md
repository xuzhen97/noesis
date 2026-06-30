Status: ready-for-agent

# 建立 SDK 与 CLI 连接外壳

## Parent

`noesis/.scratch/noesis-project-initialization/PRD.md`

## What to build

建立 SDK 和 CLI 的最小连接外壳。SDK 提供 `NoesisClient` 的构造和 `ping()` 连接形状；CLI 提供 help/version 行为，并保持为 SDK 的薄入口。

这个 slice 不实现 machines、tasks、files、Pi、transfers、runbooks、todos 或 audit 等业务命令。

## Acceptance criteria

- [ ] SDK 包可以构建并导出最小 `NoesisClient` 连接形状。
- [ ] SDK 包只依赖 shared。
- [ ] SDK smoke test 验证 client 可构造，`ping()` 行为可预测。
- [ ] CLI 包可以构建并依赖 SDK。
- [ ] CLI help/version 行为可测试。
- [ ] CLI 不创建空的 commands 目录，也不提前拆 auth、machines、tasks、files、Pi 等业务命令模块。

## Blocked by

- `01-workspace-governance-root-commands.md`
- `02-shared-protocol-foundation.md`
