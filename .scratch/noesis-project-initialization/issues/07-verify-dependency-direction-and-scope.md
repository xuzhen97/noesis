Status: ready-for-agent

# 验证依赖方向与初始化边界

## Parent

`noesis/.scratch/noesis-project-initialization/PRD.md`

## What to build

完成 Noesis 初始化的最后验证：从 workspace 顶层运行 build/test，确认所有包能一起工作，并检查初始化没有越界到后续阶段或搬运 `noesis_bak` 实现。

这个 slice 是收口验证，不新增产品功能。

## Acceptance criteria

- [ ] 根级 build 命令通过。
- [ ] 根级 test 命令通过。
- [ ] 每个初始化包都有至少一个通过的 smoke test 或高层构建验证。
- [ ] 包依赖方向符合已记录的 ADR：shared 为基础，SDK 依赖 shared，CLI 依赖 SDK，Web 初始化阶段不依赖 SDK。
- [ ] 没有从 `noesis_bak` 搬运实现代码。
- [ ] 没有创建 PRD out-of-scope 的后续阶段模块目录。
- [ ] 初始化结果能被后续 Agent 通过 PRD、issues、CONTEXT、AGENTS 和 ADR 理解。

## Blocked by

- `02-shared-protocol-foundation.md`
- `03-gateway-health-slice.md`
- `04-client-agent-command-run-shape.md`
- `05-sdk-cli-connection-shell.md`
- `06-web-console-shell.md`
