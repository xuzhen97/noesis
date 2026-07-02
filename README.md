# Noesis 灵识

Noesis 灵识 is a personal Human-AI Symbiotic Workspace. 本仓库是新实现的独立项目根目录。

## 当前范围

本 workspace 刻意保持小规模。初始化阶段只创建 P0 控制闭环骨架，围绕以下概念：

- Gateway
- Client Agent
- Machine
- Task
- Task Event

## 开发

```bash
pnpm install
pnpm build
pnpm test
```

## Noesis Distribution

第一阶段 Distribution 产出 Gateway、Client Agent、SDK 和 CLI 的 core artifacts，并用打包产物验证端到端闭环。

```bash
pnpm build:distribution
pnpm verify:distribution
```

目标环境需要 Node 24+。Gateway 和 Client Agent 压缩包解压后可直接用 `node dist/*.mjs` 或 `bin/` 脚本运行；CLI 使用本地 tgz 安装和升级；SDK 使用 npm tgz 集成。第一阶段不包含 Web、FRP、Computer Use、自更新或 Release Center。

## 项目语言

业务文档默认使用简体中文。代码标识符、包名、协议字段、数据库字段、枚举值使用英文。
