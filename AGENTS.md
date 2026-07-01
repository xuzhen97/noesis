# AGENTS.md

## Project overview (项目概述)

- Noesis 灵识是个人 Human-AI Symbiotic Workspace：Gateway 协调
  Client Agent、Machine、Task、Task Event。
- 当前 repo 是独立新实现，只保留 P0 控制闭环骨架；不要从 `noesis_bak/`
  搬运实现代码。
- 事实来源：`README.md` 管范围和命令，`CONTEXT.md` 管术语，
  `docs/adr/` 管架构决策，`scripts/check-boundaries.mjs` 管初始化边界。

## Build and test commands (构建和测试命令)

- 从 repo 根目录运行：`pnpm install`、`pnpm build`、`pnpm test`。
- 总验证入口：`pnpm verify`；仅边界检查：`pnpm check:boundaries`。
- 单包检查示例：`pnpm --filter @noesis/shared test`、`pnpm --filter @noesis/web build`。

## Code style guidelines (代码风格指南)

- 业务文档、ADR、Issue、UI/审计文案使用简体中文；代码标识符、包名、
  协议字段、数据库字段、枚举值使用英文。
- 使用 `CONTEXT.md` 中的术语：Noesis、Gateway、Client Agent、Machine、
  Task、Task Event；不要漂移到被标记为避免的同义词。
- 注释使用简体中文；不要写解释显而易见代码的注释。公共 surface
  （导出类型、函数、类、公共方法）写简体中文 JSDoc。
- TypeScript 使用 ESM + strict；NodeNext 相对导入保留 `.js` 后缀。
- 先复用现有模块和 Node 标准库；不要提前加 interface、factory、配置层或空目录。
- 错误对象保持稳定 `code`、合适 `statusCode`、安全 message；不要泄露 stack、密钥、临时代码或文件内容。

## Architecture boundaries (架构边界)

- `packages/shared` 只放协议、通用类型、错误模型和 schema；不放 DB、
  Gateway helper、Client Agent helper 或运行时业务逻辑。
- Noesis 包依赖方向：`shared` 无内部依赖；`server`/`client`/`sdk`/`web`
  只依赖 `shared`；`cli` 只依赖 `sdk`。
- 初始化目录保持最小：Gateway 只保留 `health/`、`machines/`、`tasks/`、
  `ws/`、`db/`；Client Agent 只保留 `supervisor/`、`ws-client/`、
  `task-runner/`、`command-executor/`；Web 只保留 `main.tsx`、`App.tsx`、
  `styles.css`。
- 新目录或新包必须服务当前阶段验收，并通过 `pnpm check:boundaries`。

## Testing instructions (测试说明)

- 非平凡逻辑要有最小 Vitest 覆盖；协议变更优先更新 `packages/shared/src/protocol.test.ts`。
- 改代码时先跑相关单包 `build`/`test`，收尾跑 `pnpm verify`；只改文档时至少跑 `git diff --check`。
- 测试保持确定性，不依赖真实远程机器、外部网络或破坏性命令。

## Security considerations (安全考量)

- `command.run`、Task payload、stdout/stderr、环境变量和路径都可能含敏感信息；日志和 Task Event 默认脱敏。
- Gateway/API/WS 边界必须校验 payload；Client Agent 不执行未验证协议输入。
- Task Event 是审计证据：只追加，不为了隐藏失败而改写或删除。
- 示例和测试不要执行真实破坏性命令。

## Agent skills

### Issue tracker

本地 markdown — issues 存放在 `.scratch/<feature>/` 下。详见
`docs/agents/issue-tracker.md`。

### Triage labels

五个 canonical triage roles 使用默认名称。详见 `docs/agents/triage-labels.md`。

### Domain docs

Single-context — 一个 `CONTEXT.md` + `docs/adr/`。详见 `docs/agents/domain.md`。
