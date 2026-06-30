Status: ready-for-agent

# 建立 Client Agent command.run 执行形状

## Parent

`noesis/.scratch/noesis-project-initialization/PRD.md`

## What to build

建立 Client Agent 的 P0 执行闭环形状，让执行面具备 supervisor、WebSocket client、task runner、command executor 的最小可测试入口。

这个 slice 不执行真实命令，也不连接真实 Gateway；它只证明 Client Agent 的第一条 `command.run` 路径可以被后续实现接上。

## Acceptance criteria

- [ ] Client Agent 包可以构建。
- [ ] Client Agent 包依赖 shared，但不依赖 Gateway、Web、SDK 或 CLI。
- [ ] Client Agent 包暴露 supervisor 或启动形状，测试可验证其外部行为。
- [ ] Client Agent 包保留 supervisor、ws-client、task-runner、command-executor 的最小边界。
- [ ] Client Agent 包不创建 file operator、Pi manager、Pi terminal、FRP、updater、storage client、policy engine 等后续阶段目录。
- [ ] Client Agent smoke test 通过，且不需要真实 shell、真实 WebSocket 或真实 Gateway。

## Blocked by

- `01-workspace-governance-root-commands.md`
- `02-shared-protocol-foundation.md`
