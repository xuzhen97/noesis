# Noesis Agent Instructions

## 业务语言

- 本项目的业务语言描述默认使用简体中文。
- `CONTEXT.md`、方案文档、ADR、Issue、任务描述、UI 展示文案、审计展示文案优先使用简体中文。
- 代码标识符、包名、协议字段、数据库字段、枚举值使用英文。
- 当同一概念出现中英文混用时，先在 `CONTEXT.md` 选定 canonical term，再在中文说明中稳定使用它。
- `CONTEXT.md` 只记录业务术语表，不记录实现细节、计划或临时草稿。

## 初始化边界

- 当前只初始化 `noesis/` 项目结构。
- 不从 `noesis_bak/` 搬运实现代码。
- 第一阶段只保留 P0 控制闭环骨架：Gateway、Client Agent、Machine、Task、Task Event。
- 任何新增目录必须服务于当前阶段验收：`pnpm build` 和 `pnpm test` 跑通。

## Server 结构

- `packages/server/src` 按最小功能切片组织：`health/`、`machines/`、`tasks/`、`ws/`、`db/`。
- 初始化阶段不创建空的 `controllers/`、`services/`、`repositories/`、`middlewares/`、`utils/` 横切目录。
- 重复出现 3 次且继续增长时，再提取公共层。

## Client 结构

- `packages/client/src` 初始化阶段只保留 P0 执行闭环：`supervisor/`、`ws-client/`、`task-runner/`、`command-executor/`。
- 初始化阶段不创建 `file-operator/`、`pi-agent-manager/`、`pi-terminal-manager/`、`frpc-manager/`、`updater/`、`storage-client/`、`policy-engine/`。
- Client 第一条闭环是 `command.run`；其他能力等进入对应阶段时再建目录。

## Web 结构

- `packages/web/src` 初始化阶段只保留 `main.tsx`、`App.tsx`、`styles.css`。
- 初始化阶段不创建空的 `pages/`、`features/`、`components/`、`store/`、`api/`、`routes/`。
- Web 先展示 Noesis、Gateway、Machines、Tasks 的最小占位；第一个真实页面出现时再拆目录。

## SDK / CLI 结构

- `packages/sdk/src` 初始化阶段只保留 `index.ts`，提供 `NoesisClient` 空壳和 `ping()` 连接形状。
- `packages/cli/src` 初始化阶段只保留 `main.ts`，提供 `noesis --help` 和 `noesis version`。
- 初始化阶段不创建空的 CLI `commands/` 目录，也不提前拆 `auth/`、`machines/`、`tasks/`、`files/`、`pi/`。
- SDK / CLI 的业务命令等 Gateway API 稳定后再补。

## 包依赖方向

- `packages/shared` 不依赖任何 Noesis 包。
- `packages/server` 不依赖 `client`、`web`、`cli`。
- `packages/client` 不依赖 `server`、`web`、`cli`。
- `packages/sdk` 只依赖 `shared`。
- `packages/cli` 依赖 `sdk`。
- `packages/web` 初始化阶段只依赖 `shared`，暂不依赖 `sdk`。
- `packages/shared` 只放协议、通用类型、错误模型和 schema；不放 DB、Repository、Server helper、Client helper 或运行时业务逻辑。
