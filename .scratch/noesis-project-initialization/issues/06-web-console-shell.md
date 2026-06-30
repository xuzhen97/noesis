Status: ready-for-agent

# 建立 Web 最小控制台壳

## Parent

`noesis/.scratch/noesis-project-initialization/PRD.md`

## What to build

建立 Web 的最小控制台壳，让用户能看到 Noesis、Gateway、Machines、Tasks 的产品形状占位，并验证 Web 包可构建。

这个 slice 不实现真实页面、数据获取、路由、状态管理或业务组件。

## Acceptance criteria

- [ ] Web 包可以构建。
- [ ] Web 包初始化为 Vite + React + TypeScript 的最小壳。
- [ ] Web 壳展示 Noesis、Gateway、Machines、Tasks 的占位区。
- [ ] Web 初始化阶段只依赖 shared，不依赖 SDK。
- [ ] Web 不创建空的 pages、features、components、store、api、routes 目录。
- [ ] Web validation 使用 build 作为高层 seam，不要求组件级测试。

## Blocked by

- `01-workspace-governance-root-commands.md`
- `02-shared-protocol-foundation.md`
