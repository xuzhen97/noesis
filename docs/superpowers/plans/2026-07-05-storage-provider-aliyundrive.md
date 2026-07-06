# StorageProvider（阿里云盘 v1）+ 文件与传输 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gateway 通过阿里云盘 OpenAPI 托管 OAuth/元数据，支持 CLI/Web 直传分片、Client WS 导入/导出，以及 Web 机器文件 Tab；数据持久化 SQLite，CI 可用 mock provider。

**Architecture:** 纵向切片：先 SQLite 替换内存 machines/tasks/events，再 AliyunDrive 模块（逻辑参考 `D:\remote-agent-gateway\apps\server\src\modules\aliyundrive`），再 `file.*` Task、transfer_jobs 状态机，最后 SDK/CLI/Web。OpenAPI 不经手文件体；加密密钥文件 `data/.gateway-key` + AES-256-GCM 存 client_secret 与 token。存储实现先作为 server 内部模块维护在 `packages/server/src/storage/`，不新增 workspace package。

**Tech Stack:** Node 24+ ESM、`better-sqlite3`、`ws`、Vitest、`@noesis/shared` 协议扩展。

**Spec:** `docs/superpowers/specs/2026-07-05-storage-provider-aliyundrive-design.md`

---

## File map（禁止新建 `check-boundaries` 所列 forbidden 目录）

| 文件 | 职责 |
|------|------|
| `packages/server/src/db/sqlite.ts` | DB 连接、migrate、save |
| `packages/server/src/db/migrations/001_initial.sql` | machines/tasks/events/aliyun/transfer 表 |
| `packages/server/src/secret-box.ts` | AES-256-GCM encrypt/decrypt |
| `packages/server/src/storage/aliyundrive/upload-planner.ts` | 分片规划（移植 RAG 算法） |
| `packages/server/src/storage/aliyundrive/openapi.ts` | OpenAPI HTTP 客户端 |
| `packages/server/src/storage/aliyundrive/auth.ts` | OAuth + config/auth CRUD + test |
| `packages/server/src/storage/mock.ts` | `NOESIS_STORAGE_MOCK=1` 假 URL |
| `packages/server/src/transfer.ts` | transfer_jobs 创建/进度/complete/refresh |
| `packages/server/src/file-tasks.ts` | file.list/read/write task 编排 + 同步 HTTP 等待 |
| `packages/server/src/gateway-runtime.ts` | HTTP 路由挂载（逐步变薄，不拆 forbidden services/） |
| `packages/server/src/gateway-ws.ts` | Client Agent WebSocket 握手、Task Event 回传、Machine 上下线 |
| `packages/shared/src/protocol.ts` | DiskInfo、file/transfer WS、新 TaskType |
| `packages/shared/src/errors.ts` | `STORAGE_NOT_AUTHORIZED` 等（若已有则扩展） |
| `packages/client/src/file-handler.ts` | file.* 执行 |
| `packages/client/src/transfer-download.ts` | 导入下载 |
| `packages/client/src/transfer-upload.ts` | 导出上传 |
| `packages/client/src/ws-client/index.ts` | WS 连接、hello/accepted 生命周期 |
| `packages/client/src/ws-client/message-dispatch.ts` | Gateway 消息分发：Task、transfer upload/download |
| `packages/sdk/src/aliyundrive.ts` | API 封装 |
| `packages/sdk/src/transfers.ts` | API + 直传 helper |
| `packages/sdk/src/files.ts` | list/read/write |
| `packages/cli/src/main.ts` | CLI 顶层入口与 task run |
| `packages/cli/src/cli-args.ts` | CLI help / flag / Owner Token 读取 |
| `packages/cli/src/transfer-commands.ts` | transfer upload/download 子命令 |
| `packages/web/src/App.tsx` | App auth/theme 壳 |
| `packages/web/src/console-shell.tsx` | 控制台导航、顶栏、路由挂载 |
| `packages/web/src/dashboard-panel.tsx` | 仪表盘 |
| `packages/web/src/machines-panel.tsx` | Machine 列表与文件页路由适配 |
| `packages/web/src/settings-panel.tsx` | Settings `Owner Token` / `阿里云盘` Tab；阿里云盘状态表 |
| `packages/web/src/ui-helpers.tsx` | Web 通用小组件；统一轻页面标题区 |

实现前对每个将改的 **导出符号** 运行：`gitnexus_impact`（direction: upstream）。

---

### Task 1: SQLite 与迁移骨架

**Files:**

- Create: `packages/server/src/db/migrations/001_initial.sql`
- Create: `packages/server/src/db/sqlite.ts`
- Modify: `packages/server/package.json`（依赖 `better-sqlite3`）
- Modify: `packages/server/src/db/index.ts`
- Test: `packages/server/src/db/sqlite.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// packages/server/src/db/sqlite.test.ts
import { describe, expect, it } from "vitest";
import { openGatewayDb } from "./sqlite.js";

describe("openGatewayDb", () => {
 it("applies migrations and has machines table", () => {
  const db = openGatewayDb(":memory:");
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='machines'").get();
  expect(row).toBeTruthy();
 });
});
```

- [ ] **Step 2: 运行测试确认 FAIL**

Run: `pnpm --filter @noesis/server test`

- [ ] **Step 3: 实现 `001_initial.sql`**

包含（字段名 snake_case，与 spec 一致）：`machines`（`disks_json` TEXT）、`tasks`、`task_events`、`aliyundrive_config`、`aliyundrive_auth`（token 字段存密文 hex）、`transfer_jobs`（含 `aliyun_drive_id`、`aliyun_file_id`、`aliyun_upload_id`、`direction` import|export、`status`）、`transfer_events`。

- [ ] **Step 4: 实现 `openGatewayDb(path)`** — 读 `migrations/*.sql` 按序执行，`foreign_keys=ON`。

- [ ] **Step 5: 测试 PASS + `pnpm --filter @noesis/server build`**

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/db packages/server/package.json pnpm-lock.yaml
git commit -m "feat(server): 添加 Gateway SQLite 迁移骨架"
```

---

### Task 2: secret-box 与 Gateway 数据目录

**Files:**

- Create: `packages/server/src/secret-box.ts`
- Test: `packages/server/src/secret-box.test.ts`

- [ ] **Step 1: 测试 round-trip**

```ts
import { describe, expect, it } from "vitest";
import { seal, open } from "./secret-box.js";

it("seal/open roundtrip", () => {
 const key = Buffer.alloc(32, 7);
 expect(open(seal("secret", key), key)).toBe("secret");
});
```

- [ ] **Step 2–4: 实现 AES-256-GCM**（随机 12-byte iv，payload = iv + tag + ciphertext，base64 存 DB）

- [ ] **Step 5: `resolveGatewayDataKey(dataDir)`** — 无则 `randomBytes(32)` 写入 `dataDir/.gateway-key` mode 600

- [ ] **Step 6: Commit** — `feat(server): Gateway 字段加密 secret-box`

---

### Task 3: 内存状态迁 SQLite（保持 command.run smoke）

**Files:**

- Modify: `packages/server/src/gateway-runtime.ts`
- Modify: `packages/server/src/server.test.ts`

- [ ] **Step 1: 扩展 server 测试** — 启动 Gateway（tmp db path），POST task run smoke，断言 task 在 DB 可查

- [ ] **Step 2: `GatewayState` 改为读写在 sqlite** — machines/clients Map 仍驻内存（WS 句柄），tasks/events 落库；`appendEvent`/`setTaskStatus` SQL

- [ ] **Step 3: `client.hello` 写 machines 行** — status online，`last_seen_at`

- [ ] **Step 4: `pnpm verify` 仍通过**

- [ ] **Step 5: Commit** — `feat(server): Task/Event 持久化到 SQLite`

---

### Task 4: aliyundrive-upload-planner + openapi client

**Files:**

- Create: `packages/server/src/storage/aliyundrive/upload-planner.ts`
- Create: `packages/server/src/storage/aliyundrive/openapi.ts`
- Test: `packages/server/src/storage/aliyundrive/upload-planner.test.ts`
- Test: `packages/server/src/storage/aliyundrive/openapi.test.ts`

- [ ] **Step 1: 复制 RAG 测试用例逻辑** — `resolveAliyunPartSize(1)` → 1 片；超大文件抛错

- [ ] **Step 2: 实现 planner**（`DEFAULT_ALIYUN_PART_SIZE = 64 * 1024 * 1024`）

- [ ] **Step 3: openapi 测试** — mock `fetch`，`getDriveInfo` 解析 `default_drive_id`

- [ ] **Step 4: 实现 `AliyunDriveOpenApiClient`** — 方法：`getDriveInfo`、`listChildren`、`createFolder`、`ensureFolderPath`、`createFileUpload`、`getUploadUrl`、`completeUpload`、`getDownloadUrl`

- [ ] **Step 5: Commit** — `feat(server): 阿里云盘 OpenAPI 客户端与分片规划`

---

### Task 5: aliyundrive-auth + HTTP 路由

**Files:**

- Create: `packages/server/src/storage/aliyundrive/auth.ts`
- Create: `packages/server/src/storage/mock.ts`
- Modify: `packages/server/src/gateway-runtime.ts`（注册路由）
- Test: `packages/server/src/storage/aliyundrive/auth.test.ts`

- [ ] **Step 1: OAuth state 测试** — `startOAuth` 返回 URL 含 `state`；`completeOAuth` mock token 端点

- [ ] **Step 2: 实现 auth** — PKCE `code_challenge_method=plain`（与 RAG 一致）；config/auth 读写加密字段；`getStatus`、`testAuthorization`、`revoke`

- [ ] **Step 3: 路由（Owner Token）**

```text
GET  /api/aliyundrive/status
PUT  /api/aliyundrive/config
POST /api/aliyundrive/oauth/start
POST /api/aliyundrive/oauth/complete
POST /api/aliyundrive/oauth/revoke
POST /api/aliyundrive/test
```

- [ ] **Step 4: `storage-mock.ts`** — 当 `process.env.NOESIS_STORAGE_MOCK === "1"`，`test` 返回 valid，createUpload 返回假 fileId/upload_url

- [ ] **Step 5: Commit** — `feat(server): 阿里云盘 OAuth 与配置 API`

---

### Task 6: shared 协议扩展（file + transfer + disks）

**Files:**

- Modify: `packages/shared/src/protocol.ts`
- Modify: `packages/shared/src/protocol.test.ts`

- [ ] **Step 1: 增加类型** — `DiskInfo`、`FileListEntry`；`TaskType` 增加 `file.list` | `file.read` | `file.write`；`GatewayToClientMessage` 增加 `transfer.download.start` | `transfer.upload.start`；`ClientToGatewayMessage` 增加 `client.transfer.*`

- [ ] **Step 2: 更新 protocol 测试快照**

- [ ] **Step 3: `pnpm --filter @noesis/shared test`**

- [ ] **Step 4: Commit** — `feat(shared): 文件与传输协议类型`

---

### Task 7: file.* Task + Client handler + HTTP 同步 API

**Files:**

- Create: `packages/server/src/file-tasks.ts`
- Create: `packages/client/src/file-handler.ts`
- Modify: `packages/client/src/ws-client/index.ts`
- Modify: `packages/server/src/gateway-runtime.ts`
- Test: `packages/client/src/file-handler.test.ts`

- [ ] **Step 1: Client 单测** — `file.list` 返回目录项（临时目录 fixture）

- [ ] **Step 2: Client hello 上报 `disks`** — 至少 1 个盘（cwd 或 OS 根），写入 heartbeat 扩展字段

- [ ] **Step 3: Gateway `POST /api/files/list|read|write`** — 创建 task → dispatch → **轮询 DB 至终态**（超时 60s）→ 返回 result；write 限制 10MB

- [ ] **Step 4: policy** — `allowedPaths` 默认 `["/"]` 或用户 home（文档注释）；拒绝路径返回 `PATH_NOT_ALLOWED`

- [ ] **Step 5: `pnpm verify`**

- [ ] **Step 6: Commit** — `feat: 最小 file.list/read/write 与磁盘上报`

---

### Task 8: transfer import（CLI 上传 + Client 下载）

**Files:**

- Create: `packages/server/src/transfer.ts`
- Create: `packages/client/src/transfer-download.ts`
- Create: `packages/sdk/src/aliyun-upload.ts`（PUT 分片，参考 RAG `aliyundrive-upload.ts`）
- Modify: `packages/server/src/gateway-runtime.ts`
- Test: `packages/server/src/transfer.test.ts`（mock provider 全流程）

- [ ] **Step 1: `createImportUpload`** — 状态 `waiting_cli_upload` → plan 含 `uploadParts`

- [ ] **Step 2: 路由** — `POST /api/transfers/uploads`、`GET ...`、`POST cli-progress`、`POST cli-upload-complete`、`POST refresh-download-url`

- [ ] **Step 3: `completeCliUpload`** — `complete` OpenAPI → `waiting_client_download` → WS `transfer.download.start`

- [ ] **Step 4: Client `downloadAliyunTransfer`** — GET transfer detail + download_url 流式写盘（参考 RAG executor）

- [ ] **Step 5: Client 上报 `client.transfer.complete`**

- [ ] **Step 6: 集成测试** — mock fetch 模拟 PUT 成功 + 下载 200

- [ ] **Step 7: Commit** — `feat: 存储中转导入（CLI 上传 + Client 下载）`

---

### Task 9: transfer export + CLI 本地下载

**Files:**

- Modify: `packages/server/src/transfer.ts`
- Create: `packages/client/src/transfer-upload.ts`
- Modify: `packages/sdk/src/aliyundrive-upload.ts`（复用）

- [ ] **Step 1: `createExportUpload`** — WS `transfer.upload.start`，payload 含 upload plan

- [ ] **Step 2: Client 读本地文件 PUT 分片** — 完成后 `client.transfer.complete`

- [ ] **Step 3: `refresh-download-url`** — CLI/SDK 下载到本地

- [ ] **Step 4: Commit** — `feat: 存储中转导出与 CLI 下载`

---

### Task 10: SDK + CLI 命令

**Files:**

- Create: `packages/sdk/src/aliyundrive.ts`, `transfers.ts`, `files.ts`
- Modify: `packages/sdk/src/index.ts`
- Create: `packages/cli/src/commands/storage.ts`, `transfer.ts`, `file.ts`
- Modify: `packages/cli/src/main.ts`
- Test: `packages/sdk/src/sdk.test.ts`（fakeFetch 覆盖新路径）

- [ ] **Step 1: SDK 方法** — `getAliyunStatus`, `putAliyunConfig`, `startOAuth`, `completeOAuth`, `createTransferUpload`, `waitTransfer`, `fileList`

- [ ] **Step 2: CLI** — `noesis storage status`, `noesis transfer upload --machine X --file F --path .`, `noesis file list --machine X --path .`, 均支持 `--json`

- [ ] **Step 3: Commit** — `feat(sdk,cli): 阿里云盘与传输命令`

---

### Task 11: Web Settings OAuth + 机器文件 Tab

**Files:**

- Modify: `packages/web/src/App.tsx`（auth/theme 壳）
- Create: `packages/web/src/console-shell.tsx`（路由 `/machines/:machineId`、控制台外壳滚动）
- Create: `packages/web/src/dashboard-panel.tsx`
- Create: `packages/web/src/machines-panel.tsx`
- Create: `packages/web/src/settings-panel.tsx`（Settings Tab 分区）
- Create: `packages/web/src/ui-helpers.tsx`
- Create: `packages/web/src/machine-files.tsx`（勿建 `pages/`）
- Modify: `packages/web/src/styles.css`（三栏布局、内容区滚动、Settings Tab 样式）

- [ ] **Step 1: Settings 区** — 用 Tab 分隔 `Owner Token` 与 `阿里云盘`；阿里云盘 Tab 内配置 clientId、OAuth 链接、code 输入框、test 状态展示

- [ ] **Step 2: 机器详情** — 磁盘条（`GET /api/machines/:id` 含 disks）；目录树 + 列表调 `POST /api/files/list`

- [ ] **Step 3: 小文件上传** — `file.write` base64 或 utf8 body ≤10MB

- [ ] **Step 4: 存储中转导入** — `POST transfers/uploads` + 浏览器 PUT 分片 + `web-upload-complete`；轮询 transfer 状态

- [ ] **Step 5: 导出** — 选中文件 → export transfer → 完成后下载链接

- [ ] **Step 6: 未授权** — `GET aliyundrive/status` false 时按钮 disabled + tooltip

- [ ] **Step 7: 控制台滚动** — 左侧导航、顶部栏和面包屑不随页面整体滚动；只有 `<main>` 内容区域 `overflow-y: auto`

- [ ] **Step 8: `pnpm --filter @noesis/web build`**

- [ ] **Step 9: Commit** — `feat(web): 存储授权与机器文件 Tab`

---

### Task 12: 文档、CONTEXT、收尾验证

**Files:**

- Modify: `CONTEXT.md`（可选：`TransferJob` 术语一行）
- Modify: `README.md`（开发：配置阿里云盘、mock 环境变量、手动 E2E 步骤）

- [ ] **Step 1: `pnpm verify`**

- [ ] **Step 2: `gitnexus_detect_changes`（scope: all）** — 确认影响面

- [ ] **Step 3: 手测清单** — mock 模式完整 import；真实盘仅 dev 手测 OAuth

- [ ] **Step 4: Commit** — `docs: 阿里云盘 StorageProvider 使用说明`

---

## 执行选项（完成后由用户选择）

1. **Subagent-driven（推荐）** — 按 Task 1→12 派发 implementer，每 Task 后 spec-reviewer  
2. **Executing-plans** — 新会话批次执行，检查点 review  
3. **本会话直接实现** — 用户说「开始实现 Task 1」即从 Task 1 Step 1 起
