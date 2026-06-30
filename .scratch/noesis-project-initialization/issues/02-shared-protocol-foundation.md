Status: ready-for-agent

# 建立 shared 协议基础包

## Parent

`noesis/.scratch/noesis-project-initialization/PRD.md`

## What to build

建立 Noesis 的 shared 协议基础包，提供 Gateway、Client Agent、Machine、Task、Task Event 和错误模型的最小公共类型导出。

这个 slice 的目标是让后续 Gateway、Client Agent、SDK、CLI、Web 都能依赖同一组协议语言，而不是各自发明字段或枚举。

## Acceptance criteria

- [ ] shared 包可被 workspace 中其他包导入。
- [ ] shared 包导出 Machine、Task、Task Event 相关的最小类型或 schema。
- [ ] shared 包导出统一错误 shape 或错误码基础。
- [ ] shared 包有 smoke test，验证公共入口可导入且导出值可用。
- [ ] shared 包不依赖任何 Noesis 其他包。
- [ ] shared 包不包含 DB、Repository、Gateway helper、Client Agent helper 或运行时业务逻辑。

## Blocked by

- `01-workspace-governance-root-commands.md`
