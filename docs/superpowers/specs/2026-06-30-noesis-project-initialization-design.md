# Noesis 项目初始化设计

## 目标

将 `noesis/` 初始化为一个小型、可验证的 pnpm TypeScript 单体仓库，能够承载 P0 控制闭环，同时不继承 `noesis_bak` 过宽的结构。

## 范围

本设计涵盖全部七个 `noesis-project-initialization` issue：

1. 工作区治理和根命令
2. 共享协议基础
3. Gateway health 切片
4. Client Agent `command.run` 形状
5. SDK 和 CLI 连接外壳
6. Web 控制台外壳
7. 依赖方向和范围验证

成果是一个工程骨架，而非产品运行时。它必须能够构建和测试，但不得实现真实的 Gateway API、真实的 Client Agent WebSocket 行为、真实的命令执行或后续能力域。

## 架构

工作区有一个活跃的项目根目录：`noesis/`。它包含治理文档、本地 issue 追踪器资料和六个包：

```text
packages/
  shared/
  server/
  client/
  sdk/
  cli/
  web/
```

依赖方向保持单向：

```text
shared
  ↑
  ├─ server
  ├─ client
  ├─ sdk
  │   ↑
  │   └─ cli
  └─ web
```

`shared` 是唯一的协议基础。它导出最小域协议类型和错误形状。它不包含 DB 逻辑、仓库、Gateway 助手、Client Agent 助手或运行时业务逻辑。

`server` 代表 Gateway 控制平面，以一个 health/app 形状以及 `AGENTS.md` 中命名的最小切片边界开始：health、machines、tasks、ws 和 db。它避免空的横切层级如 controllers 或 services。

`client` 代表 Client Agent 执行平面，仅以 P0 执行形状开始：supervisor、ws-client、task-runner 和 command-executor。命令执行器描述 `command.run` 任务形状但不执行 shell。

`sdk` 暴露一个最小的 `NoesisClient` 连接形状。`cli` 是 SDK 行为上的薄外壳，仅暴露 help/version 行为。`web` 是一个 Vite React 外壳，显示 Noesis、Gateway、Machines 和 Tasks 占位；初始化期间不依赖 SDK。

## 数据流

尚无实时产品数据流。初始化流程是构建/测试验证：

```text
pnpm install
  -> pnpm build
       -> shared 先构建
       -> 依赖包针对 shared 编译
  -> pnpm test
       -> 包冒烟测试运行
       -> 边界脚本验证依赖方向和排除的模块
```

唯一的运行时类行为是确定性的、进程内的冒烟行为：创建 health 对象、构造 Client Agent 监督器、描述是否支持某任务类型、构造 SDK 客户端以及渲染 Web 外壳。

## 错误处理

初始化代码应尽早、简单地失败：

- 包冒烟测试在公开入口点破坏时失败；
- TypeScript 构建在包契约漂移时失败；
- 边界脚本在出现禁止的包依赖或超范围目录时失败；
- 本阶段不模拟网络、数据库、shell 或 WebSocket 失败。

## 测试设计

测试使用最高效的接缝：

- 根构建/测试命令证明工作区是连贯的；
- 包冒烟测试证明公开入口点可用；
- Web 构建证明控制台外壳可编译；
- 一个小型 Node 边界脚本检查依赖方向和初始化范围。

测试不得断言未来模块存在，且不得依赖 `noesis_bak`、真实网络服务、真实 Gateway 实例或真实 Client Agent 进程。

## 范围外

本设计刻意排除 Pi Agent、Pi Terminal、FRP、StorageProvider、Release Center、Install Center、Updater、Runbook、Todo/Context/Tag、Browser Use、Computer Use、WebRTC、插件和技能模块。这些能力只能在其自身阶段开始时添加目录。

## 规格自审

- 占位检查：无剩余占位节。
- 一致性检查：包依赖与 `AGENTS.md` 和 ADR 0001 一致。
- 范围检查：这是一个初始化项目，已拆分为七个薄 issue。
- 模糊性检查：真实运行时行为明确为范围外；仅包含构建/测试脚手架。
