# Noesis Distribution 使用跨平台核心包和独立原生能力包

Noesis Distribution 第一阶段产出跨平台核心包：Gateway 和 Client Agent 作为依赖已 bundle 的 Node 应用压缩包，SDK 和 CLI 作为 npm tgz；目标环境要求预装 Node 24+，但不需要联网安装运行依赖。FRP、Computer Use 等包含平台原生二进制的能力后续作为独立 capability pack 分发，避免把 Gateway 和 Client Agent 主包拆成平台包。

## Consequences

- Gateway、Client Agent、SDK、CLI 的包边界会通过 `pnpm verify:distribution` 端到端验证。
- 第一阶段不设计 Gateway/Client Agent 升级目录、自更新器或 Release Center。
- Core artifacts 使用轻量 `manifest.json` 记录文件和 sha256；native capability packs 后续单独设计。
