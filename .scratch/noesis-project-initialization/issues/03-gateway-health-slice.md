Status: ready-for-agent

# 建立 Gateway 最小健康切片

## Parent

`noesis/.scratch/noesis-project-initialization/PRD.md`

## What to build

建立 Gateway 的最小可测试健康切片，让 Noesis 控制面有一个可导入、可构建、可 smoke test 的 app/health 形状。

这个 slice 只证明 Gateway 包的边界和最小入口存在；不实现真实 Machine 注册、Task 编排、WebSocket 控制通道或数据库持久化。

## Acceptance criteria

- [ ] Gateway 包可以构建。
- [ ] Gateway 包依赖 shared，但不依赖 Client Agent、Web、SDK 或 CLI。
- [ ] Gateway 包暴露最小 health/app 入口，测试可验证其外部行为。
- [ ] Gateway 包按最小功能切片保留 health、machines、tasks、ws、db 的边界。
- [ ] Gateway 包不创建空的 controllers、services、repositories、middlewares、utils 横切目录。
- [ ] Gateway smoke test 通过，且不需要真实网络端口、真实数据库或真实 Client Agent。

## Blocked by

- `01-workspace-governance-root-commands.md`
- `02-shared-protocol-foundation.md`
