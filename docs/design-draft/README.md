# Noesis 灵识：人机共生工作台设计包

日期：2026-06-18  
技术栈：Node.js / TypeScript / SQLite / WebSocket / React / StorageProvider（默认 AliyunDrive）/ FRP / Pi Agent

## 品牌定位

- 一句话定位：Noesis 灵识，是一个面向个人的人机协作共生平台，用于连接人类意图、AI Agent、远程机器与自动化任务。
- Slogan：让意图被理解，让智能去执行。
- 世界观：让人、AI 与机器在同一个认知空间中共生。
- 技术定位：Human-AI Symbiotic Workspace。
- 中文副标题：人机共生工作台。

## 一句话定义

Noesis 灵识通过中心 Gateway 统一管理多台无公网 Windows / Linux 目标机器，让用户和 AI Agent 可以安全地执行文件管理、命令下发、脚本运行、Pi Agent 智能任务、端口映射、自更新、大文件中转、远程排错与自动化任务。

## 核心原则

1. Gateway 是控制面：任务、权限、审计、机器管理、发版、安装引导都经过 Gateway。
2. Client Agent 是执行面：目标机器常驻，负责文件、命令、脚本、frpc、Pi Agent、自更新。
3. Pi Agent 是智能执行面：用于项目理解、代码修改、依赖修复、环境排错、部署脚本生成。
4. StorageProvider 是大文件数据面抽象：默认实现为阿里云盘；发布包、大文件上传下载、日志包、备份包不压 Server 带宽。
5. FRP 是临时服务访问数据面：只用于按需暴露目标机器内部服务，不作为默认控制链路。
6. 所有危险操作可审计、可回滚、可限制。

## 文件目录

```text
README.md                     设计包入口与索引
00-executive-summary.md       执行摘要
01-prd.md                     PRD 产品需求
02-system-architecture.md     系统架构设计
03-domain-model.md            领域模型
04-server-client-modules.md   Server / Client 模块设计
05-pi-agent-integration.md    Pi Agent 集成设计（rpc 单向驱动）
05b-pi-interactive-terminal.md Pi 交互式 Web 终端设计
06-task-protocol-json.md      Task JSON 协议
07-api-design.md              API 设计
08-database-design.sql        SQLite 数据库设计
09-state-machines.md          状态机设计
10-flows-mermaid.md           核心流程 Mermaid
11-ui-ux-design.md            UI/UX 产品设计
12-release-update-install.md  发版、自更新、一键安装
13-storage-frp-security.md    StorageProvider（AliyunDrive v1）、FRP、安全审计
14-node-stack-project.md      Node 技术栈与项目结构
15-roadmap-test-risk.md       落地路线、实现地图、测试与风险
16-test-plan.md              完整测试方案（单元/集成/E2E/属性/契约/故障注入）
17-runbook-flow-orchestration.md Runbook 流程编排（TS 即 DSL）
18-sdk-design.md              SDK 设计（CLI / Node 脚本 / 桌面程序统一集成层）
20-todo-vcp-collaboration.md  Todo / Context / VCP 协作模块设计
schemas/                      协议 JSON 可执行示例（30+ 份）
SOP-软件设计规范.md           通用设计方法论（可测试性内嵌版 v3.0）
```

## MVP 最小闭环

```text
Gateway 启动
  -> 生成安装令牌
  -> 目标机器一键安装 Client
  -> Client 主动连接 Gateway
  -> Gateway 下发 command.run
  -> Client 执行并实时回传日志
  -> Gateway 展示任务状态
  -> Client 经 StorageProvider 导入大文件
  -> Gateway 触发 Client 自更新
  -> Gateway 触发 pi.check / pi.run
```
