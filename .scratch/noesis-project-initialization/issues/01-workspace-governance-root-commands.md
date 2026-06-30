Status: ready-for-agent

# 初始化 workspace 治理与根命令

## Parent

`noesis/.scratch/noesis-project-initialization/PRD.md`

## What to build

初始化 Noesis workspace 的根级工程外壳，让维护者和后续 Agent 能从一个清晰的项目根运行统一 build/test 命令，并通过治理文档理解当前业务语言、初始化边界和架构决策。

这个 slice 不实现产品功能；它只建立可验证的工程入口和项目治理基线。

## Acceptance criteria

- [ ] Noesis 项目根可以作为 pnpm TypeScript workspace 使用。
- [ ] 根级 build 命令可以调度 workspace 内已有包的 build 命令。
- [ ] 根级 test 命令可以调度 workspace 内已有包的 test 命令。
- [ ] 现有 Simplified Chinese 业务语言规则、domain glossary、ADR 和 PRD 保留并可被后续 Agent 发现。
- [ ] 根级 README 或等价入口说明当前只初始化 P0 控制闭环骨架，不搬运 `noesis_bak` 实现。
- [ ] 没有创建 Pi、FRP、StorageProvider、Runbook、Todo、Browser Use、Computer Use 等后续阶段目录。

## Blocked by

None - can start immediately
