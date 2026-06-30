# 包依赖方向

Noesis 使用 pnpm TypeScript monorepo，包依赖保持单向：`shared` 是协议/类型基础，`server`、`client`、`sdk`、`web` 可以依赖 `shared`，`cli` 依赖 `sdk`，`web` 初始化阶段不依赖 `sdk`。这保证了第一个项目骨架保持小规模，并在 P0 控制闭环验证完成前，防止 Gateway、Client Agent、Web 和 CLI 的关切相互耦合。
