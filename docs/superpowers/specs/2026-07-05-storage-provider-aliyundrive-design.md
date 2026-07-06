# StorageProvider（阿里云盘 v1）+ 最小文件与传输 — 设计说明

日期：2026-07-05  
状态：已评审（grill-with-docs + brainstorming）  
参考实现：`D:\remote-agent-gateway`（OpenAPI 交互模式，**非** aliyunpan CLI）

## 1. 目标与边界

### 目标

- Gateway 托管阿里云盘 **OAuth 与元数据**，**不经手文件体**。
- **CLI/SDK**：本地上传、本地下载（直传 OpenAPI 分片 URL）。
- **Client**：经 WS 从盘 **导入**到机器路径；**导出**（机器 → 盘）后 Web/CLI 拉 download URL。
- **Web**：设置页 OAuth + `/machines/:id` 文件 Tab（草案 11 C）：磁盘条、目录树、≤10MB 小文件 WS、存储中转导入/导出、未授权禁用。
- **Web 外壳**：左侧导航、顶部栏与面包屑固定在控制台框架内，只有内容区域滚动；设置页用 Tab 分隔 `Owner Token` 与 `阿里云盘`，不平铺配置块。

### 本轮不做

SyncJob、FRP `frps_chunked`、Release 自更新、完整 AuditLog UI、file.delete/move、Runbook/Pi/FRP Tab。Idempotency 可仅占位表。

### 验收

`pnpm verify` 通过；mock 或真实 OpenAPI 下完成「CLI 上传 → Client 导入 → Web/CLI 查进度 → 下载」；未授权时 Web 中转按钮 disabled。

### 已确认决策

| 项 | 选择 |
|----|------|
| 落地顺序 | 纵向切片（§7） |
| 开发/CI | 真实 OpenAPI 为主 + `NOESIS_STORAGE_MOCK=1` mock provider |
| 文件 API | HTTP 层 **同步等待** Task 终态（Web 简单） |
| Token 落库 | 首版：Gateway 数据目录密钥 + 字段加密（与 RAG 明文落库相比收紧；实现计划写死算法） |

## 2. 与「aliyunpan」的关系

- **不依赖** [aliyunpan](https://github.com/tickstep/aliyunpan) 等第三方客户端/CLI。
- 交互面为 **阿里云盘 OpenAPI**（文档与 Noesis 草案一致：`openapi.alipan.com`）。
- 可复用 **`remote-agent-gateway`** 已验证的调用序列与分片策略（见 §3），在 Noesis 内 **重写**于 `packages/server`（遵守 `check-boundaries`，不搬 `apps/server/modules` 目录结构）。

## 3. OpenAPI 交互模型（对齐 RAG + 草案 13）

### 3.1 基础

- **Base**：`openapiBase` 默认 `https://openapi.alipan.com`（可配置）。
- **鉴权**：`Authorization: Bearer <access_token>`；token 由 Gateway OAuth 换取并 refresh（RAG 当前以内存/SQLite 存 token；Noesis 加密落库）。
- **Client 封装**：`AliyunDriveOpenApiClient.post(path, json)` — 与 RAG `aliyundrive-openapi.client.ts` 同构。

### 3.2 OAuth（PKCE，redirect `oob`）

| 步骤 | HTTP |
|------|------|
| 授权页 | `GET {openapiBase}/oauth/authorize?client_id&redirect_uri&scope&response_type=code&state&code_challenge&code_challenge_method=plain` |
| 换 token | `POST {openapiBase}/oauth/access_token` body: `client_id`, `grant_type=authorization_code`, `code`, `code_verifier`, 可选 `client_secret` |

- Gateway：`oauth/start` 生成 `state` + `code_verifier`，内存保存 session（10min TTL）；`oauth/complete` 换 token 后写 `aliyundrive_auth`。
- **test**：`POST /adrive/v1.0/user/getDriveInfo` → 持久化 `driveId`、`authorizedAccountName`（nick_name 等字段）。

### 3.3 盘内路径与文件夹

- 配置项 `transferFolder`（默认 `NoesisTransfers`，RAG 为 `RemoteAgentGatewayTransfers`）。
- `ensureFolderPath(driveId, folderPath)`：`list` + `create` 递归，parent 从 `root` 起（RAG 已实现）。

### 3.4 上传（分片）

| 步骤 | API |
|------|-----|
| 规划分片 | 本地：`resolveAliyunPartSize`（默认 64MB，≤10000 片）、`buildPartInfoList` |
| 创建文件 | `POST /adrive/v1.0/openFile/create` type=file，`part_info_list` |
| 取上传 URL | `POST /adrive/v1.0/openFile/getUploadUrl` |
| 上传体 | 调用方 **PUT** 到 `upload_url`（CLI/Web/Client），**不经 Gateway** |
| 合并 | `POST /adrive/v1.0/openFile/complete`（CLI 可在本地调；Web 由 Gateway `web-upload-complete` 代调） |

- 盘内文件名建议：`{transferId}-{originalFilename}`，避免冲突（RAG 做法）。
- 过期：`refresh-upload-url` → 再次 `getUploadUrl`。

### 3.5 下载

- `POST /adrive/v1.0/openFile/getDownloadUrl` → `download_url`。
- Client/CLI：**GET** `download_url` 流式写入目标路径；Gateway 仅 `refresh-download-url` 签发（可重试 `InvalidResource.File` 等，RAG 最多 10 次间隔 1s）。

### 3.6 谁调 OpenAPI

| 角色 | 调用 |
|------|------|
| Gateway | OAuth、create/getUploadUrl/complete（Web 完成路径）、getDownloadUrl、ensureFolderPath、test |
| CLI | PUT 分片 + 可选本地 complete；上报 `cli-progress` / `cli-upload-complete` |
| Web 浏览器 | PUT 分片；`web-upload-complete` |
| Client | 导出时 PUT 分片；导入时 GET download_url（token 不长期下发 Client 时：仅 **download_url** 由 Gateway 刷新接口提供，与 RAG 一致） |

**安全**：Web/CLI 上传计划可短期下发 `accessToken`（RAG 做法）；响应与 Task Event 禁止打印 token。长期 refresh 仅 Gateway 持有。

## 4. 架构与持久化

- SQLite migration：`machines`（含 `disks_json`）、`tasks`、`task_events`、`aliyundrive_config`、`aliyundrive_auth`、`transfer_jobs`、`transfer_events`（RAG 有 events 表；Noesis 草案 08 可增 events 或 JSON 列）。
- Server 内部用 `packages/server/src/storage/` 维护存储实现：`storage/aliyundrive/` 放 OAuth、OpenAPI client、上传分片规划；`storage/mock.ts` 放本地/CI mock 开关。
- 本轮不新增 `packages/storage` 或 provider workspace package；等出现第二个真实 StorageProvider 后再评估包边界。
- `StorageProvider` 接口 + `AliyunDriveProvider` + `MockAliyunDriveProvider`（`NOESIS_STORAGE_MOCK=1`）。
- Gateway 从内存状态迁 DB，保持现有 `command.run` smoke 行为。

### 导入数据流

```text
POST /api/transfers/uploads (import)
  → createFileUpload under transferFolder
  → 返回 upload plan（transferId, uploadParts, accessToken, openapiBase, driveId, fileId, uploadId）
  → 调用方 PUT 分片 → cli|web-upload-complete
  → Gateway complete（Web）→ status waiting_client_download
  → WS transfer.download.start
  → Client GET download_url → 写入 targetDir/filename
  → client.transfer.complete
```

### 导出数据流

```text
POST /api/transfers/uploads (export)
  → WS transfer.upload.start（Client 读本地文件 PUT 分片）
  → client.transfer.complete
  → refresh-download-url → CLI/Web 下载
```

## 5. API 子集（草案 07）

- **AliyunDrive**：`GET status`、`PUT config`、`POST oauth/start|complete|revoke`、`POST test`
- **Files**：`POST list|read|write`（≤10MB write）；同步等 Task
- **Transfers**：`POST uploads`、`GET list|/:id|/:id/events`、`POST cli-upload-complete|web-upload-complete|refresh-download-url|fail|cancel|cli-progress|client-progress|client-complete|client-failed`

**WS（Client）**：`transfer.download.start`、`transfer.upload.start`；`client.transfer.progress|complete|failed`。重连 reconcile：pending transfer 再下发。

**术语映射**：RAG `clientId` → Noesis `machineId`。

## 6. 各包职责

见 brainstorming §4；Client 禁止创建 `packages/client/src/storage-client/` 目录名，逻辑放在 `transfer-download.ts` 等允许路径。

## 7. 纵向切片顺序

1. SQLite + machines/tasks/events 迁库  
2. AliyunDrive API + OpenAPI client + mock  
3. file.* + disks + SDK/CLI 最小  
4. transfer import：CLI/Web 上传 + Client 下载  
5. transfer export + refresh-download + CLI 下载  
6. Web Settings OAuth + `/machines/:id` 文件 Tab C
7. Web 外壳滚动修正 + 统一轻标题区 + 细圆角主滚动条 + Settings Tab 分区（只保留已实现的 `Owner Token` / `阿里云盘` 两个真实 Tab，Tab 栏不显示横向滚动条）
8. 阿里云盘状态表展示：配置状态、授权记录状态、远程校验状态、校验说明、账户名、Drive ID、过期时间、最近检测时间  

## 8. 测试与边界

- Vitest：upload-planner、OpenAPI client（mock fetch）、transfer 状态机（mock provider）、OAuth state。
- CI 不调真实阿里云盘。
- `pnpm check:boundaries`；业务文档简体中文。

## 9. 从 RAG 复用的文件清单（逻辑参考，非拷贝）

| RAG 路径 | Noesis 落点（计划） |
|----------|---------------------|
| `aliyundrive-openapi.client.ts` | `packages/server/src/aliyundrive-openapi.ts` |
| `aliyundrive-auth.service.ts` | `packages/server/src/aliyundrive-auth.ts` |
| `aliyundrive-upload-planner.ts` | `packages/server/src/aliyundrive-upload-planner.ts` |
| `transfer.service.ts`（createUpload/complete/refresh） | 并入 `gateway-runtime` 或同目录 `transfer.ts` |
| `apps/cli/.../aliyundrive-upload.ts` | `packages/cli` 或 `packages/sdk` 直传 helper |
| `aliyundrive-download-executor.ts` | `packages/client/src/transfer-download.ts` |

## 10. 待用户审阅后

- 无异议则进入 `writing-plans` 生成实现计划。
- 实现前对将修改的符号跑 GitNexus `impact`。
