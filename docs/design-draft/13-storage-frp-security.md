# 13. StorageProvider（AliyunDrive v1）、FRP、安全与审计

## StorageProvider 定位

StorageProvider 是大文件数据面抽象，用于绕开 Server 带宽瓶颈；第一版默认实现为阿里云盘。

**核心架构**：Server 管理 Provider 认证与元数据，Client 获取临时凭证直传。Server 永远不经手大文件本体，仅负责令牌管理、创建上传/下载任务、分发凭证 URL、追踪状态机。AliyunDrive 是 v1 Provider，后续可增 S3 / WebDAV / MinIO。

适合：

- 安装包。
- 发布包。
- 大压缩包。
- 构建产物。
- 模型文件。
- 数据库备份。
- 日志包。

不适合：

- 实时命令。
- 实时日志。
- 心跳。
- 小文件频繁编辑（≤10MB 走控制通道直传）。
- 控制面任务。

## Server 管理 Provider 认证

Server 持有 StorageProvider 凭证，统一管理 token 生命周期。Client 不接触 client_id/client_secret，仅通过 Server 下发的临时 accessToken 和 uploadUrl/downloadUrl 进行直传。

### AliyunDrive v1 Provider

以下数据模型和 API 是第一版 AliyunDrive Provider 的实现细节；上层 Transfer / Automation / Release 只依赖 StorageProvider 抽象。

### 认证数据模型

```ts
interface AliyunDriveConfigRecord {
  id: 'default';
  clientId: string;
  clientSecret?: string | null;
  scope: string;                    // 默认 'user:base,file:all:read,file:all:write'
  openapiBase: string;             // 默认 'https://openapi.alipan.com'
  redirectUri: string;             // 默认 'oob'
  transferFolder: string;          // 默认 'NoesisTransfers'
  cleanupTtlMs: number;            // 默认 24h
  createdAt: number;
  updatedAt: number;
}

interface AliyunDriveAuthRecord {
  id: 'default';
  accessToken: string;
  refreshToken?: string | null;
  tokenType?: string | null;
  expiresAt: number;
  driveId?: string | null;
  authorizedAccountName?: string | null;
  updatedAt: number;
}
```

### OAuth 流程

```text
1. 管理员在 Web UI 配置 clientId/clientSecret
   → PUT /api/aliyundrive/config
2. 管理员发起授权
   → POST /api/aliyundrive/oauth/start
   ← 返回 authorizationUrl + state
3. 管理员在浏览器完成阿里云盘授权，获取 code
4. Web UI 回传 code
   → POST /api/aliyundrive/oauth/complete { state, code }
   ← Server 用 code 换取 accessToken + refreshToken，持久化
5. 可随时测试授权有效性
   → POST /api/aliyundrive/test
   ← { state: 'valid'|'expired'|'invalid'|..., driveId, authorizedAccountName }
6. 可随时撤销
   → POST /api/aliyundrive/oauth/revoke
```

### 认证状态公开视图

```ts
interface AliyunDrivePublicStatus {
  configured: boolean;      // 是否已配置 clientId
  authorized: boolean;      // accessToken 是否有效
  authorizationState: 'unauthorized' | 'expired' | 'authorized';
  clientId?: string;
  scope?: string;
  openapiBase?: string;
  redirectUri?: string;
  transferFolder?: string;
  cleanupTtlMs?: number;
  expiresAt?: number;
  driveId?: string;
  authorizedAccountName?: string;
}
```

API: `GET /api/aliyundrive/status` → 返回 `AliyunDrivePublicStatus`（同时可通过设置页 StorageProvider 状态聚合展示）

## 传输状态机

```text
created → waiting_cli_upload → cli_uploading → provider_uploaded
  → waiting_client_download → client_downloading → completed

任意阶段可 → failed / cancelled
```

### 状态说明

| 状态 | 含义 |
|------|------|
| `created` | 传输任务已创建 |
| `waiting_cli_upload` | 等待 CLI/Client 开始上传到 StorageProvider |
| `cli_uploading` | CLI/Client 正在上传分片到 StorageProvider |
| `provider_uploaded` | 文件已完整上传到 StorageProvider（AliyunDrive v1 中由 Server 调用 completeUpload） |
| `waiting_client_download` | 等待目标 Client 开始从 StorageProvider 下载 |
| `client_downloading` | 目标 Client 正在下载 |
| `completed` | 传输完成 |
| `failed` | 传输失败（含 errorCode + errorMessage） |
| `cancelled` | 已取消 |

## 大文件导入（Web → Client）

用户从浏览器上传文件到目标机器：

```text
1. Web UI 选择目标机器 + 目标路径 + 文件
2. → POST /api/transfers/uploads
     { machineId, rootId, path, filename, size, transfer: 'auto'|'provider'|'aliyundrive'|'direct' }
3. Server 判断模式：
   - 'direct' → 返回 { mode: 'frps_chunked' }（走 FRP 分块直传）
   - 'provider'（默认 StorageProvider 已授权）或 'aliyundrive'（兼容别名）→ 调用 Provider API（AliyunDrive v1 为阿里云 OpenAPI）：
     a. ensureFolderPath(transferFolder)  确保 NoesisTransfers 目录
     b. createFileUpload(name, size, partInfoList)  创建分片上传
     c. 返回 { mode, transferId, accessToken, uploadParts[] }
   - 'auto' → 优先默认 StorageProvider，未授权则降级 frps_chunked
4. Web UI 浏览器使用 accessToken + uploadUrl 直接上传分片到 StorageProvider
5. 上传完成 → POST /api/transfers/:id/web-upload-complete
   Server 调用 completeUpload，然后通知 Client 下载
6. Server 通过 WS 推送 transfer.download.start 给目标 Client
   （WS 不可达时不使用 Client 直连 HTTP 回退；Client 默认不暴露控制 HTTP 端口。Server 将任务保持为 waiting_client_download，Client 重连后通过 reconcile / transfer 队列补偿拉取）
7. Client 调用 refresh-download-url 获取下载地址，流式下载到目标路径
8. Client 写入 .rag-transfer-{id}.part 临时文件，完成后 rename
9. 下载完成 → POST /api/transfers/:id/client-complete
```

## 大文件导出（Client → Web）

用户从目标机器导出文件到浏览器：

```text
1. Web UI 在文件 Tab 选择文件 → 点击「StorageProvider 中转导出」
2. → POST /api/transfers/uploads
     { machineId, rootId, path, filename, size, transfer: 'provider' }
3. Server 创建传输任务，返回 { transferId, provider, accessToken, uploadParts[] }
4. Server 通过 WS 通知 Client 上传
   Client 使用 accessToken + uploadUrl 直接上传到 StorageProvider
5. Client 上传完成 → POST /api/transfers/:id/cli-upload-complete
6. Server 通知 Web UI（或 Web 轮询）→ 可点击下载
7. Web UI → POST /api/transfers/:id/refresh-download-url
   ← 返回 StorageProvider 临时下载链接
```

## 传输任务数据模型

```ts
interface TransferJobView {
  id: string;                    // tr_xxxxx
  machineId: string;             // 目标机器 ID；避免与 Provider OAuth clientId 混淆
  rootId: string;
  targetDir: string;
  filename: string;
  size: number;
  mode: 'provider' | 'aliyundrive' | 'frps_chunked'; // aliyundrive 是 v1 兼容别名
  status: TransferStatus;
  cleanupStatus: 'none' | 'cleanup_pending' | 'cleanup_done' | 'cleanup_failed';
  uploadedBytes: number;
  downloadedBytes: number;
  writtenBytes: number;
  totalBytes: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  createdAt: number;
  updatedAt: number;
  completedAt?: number | null;
  cleanupAfterAt?: number | null;
}
```

## 传输 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/transfers/uploads` | 创建上传任务 |
| GET | `/api/transfers` | 列出传输任务 |
| GET | `/api/transfers/:id` | 查询单个任务 |
| GET | `/api/transfers/:id/events` | 查询任务事件流 |
| POST | `/api/transfers/:id/cli-progress` | CLI 上报上传进度 |
| POST | `/api/transfers/:id/cli-upload-complete` | CLI 上传完成 |
| POST | `/api/transfers/:id/web-upload-complete` | 浏览器上传完成 |
| POST | `/api/transfers/:id/client-progress` | Client 上报下载进度 |
| POST | `/api/transfers/:id/client-complete` | Client 下载完成 |
| POST | `/api/transfers/:id/fail` | 标记失败 |
| POST | `/api/transfers/:id/cancel` | 取消传输 |
| POST | `/api/transfers/:id/refresh-upload-url` | 刷新上传 URL（过期续期） |
| POST | `/api/transfers/:id/refresh-download-url` | 刷新下载 URL |

## 阿里云盘 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/aliyundrive/status` | 认证状态 |
| PUT | `/api/aliyundrive/config` | 保存配置 |
| POST | `/api/aliyundrive/oauth/start` | 发起 OAuth |
| POST | `/api/aliyundrive/oauth/complete` | 完成 OAuth |
| POST | `/api/aliyundrive/oauth/revoke` | 撤销授权 |
| POST | `/api/aliyundrive/test` | 测试授权有效性 |

## 分片上传策略

阿里云盘分片上传需满足：每片 ≥ 8MB，总片数 ≤ 10000。

```ts
// 自动选择分片大小
function resolveAliyunPartSize(fileSize: number): number {
  const candidates = [64MB, 128MB, 256MB, 512MB];
  return candidates.find(s => Math.ceil(fileSize / s) <= 10000);
}
```

上传 URL 有效期有限（约 1h），过期后需调用 `refresh-upload-url` 续期。

## SDK 断点续传与目录同步

SDK Node helper 第一版支持分片级 checkpoint。

上传恢复：

```text
本地保存 transferId、file fingerprint、partSize、completedParts
恢复时校验 baseUrl/machineId/path/direction/file fingerprint/transfer 状态/partSize
校验通过则跳过已完成 part；uploadUrl 过期时调用 refresh-upload-url
校验失败则丢弃 checkpoint 重新开始
```

下载恢复：

```text
写入 .part 临时文件
按已写 bytes / range 继续下载
完成后校验 size/sha256，再 rename 到最终路径
```

默认 checkpoint 目录：

```text
.noesis-transfer/
  checkpoints/
  tmp/
```

目录同步是一等 `SyncJob`，下面挂多个 `TransferJob`：

```text
SyncJob(sync_upload ./dist -> /opt/app/dist)
  ├─ TransferJob(file A)
  ├─ TransferJob(file B)
  └─ TransferJob(file C)
```

边界：

- 支持文件级续传 + 目录级缺失/变更同步。
- 不做 rsync 块级 diff。
- 默认比较 `size + mtime`，可选 `sha256`。
- 默认冲突策略 `skip`，不自动覆盖或删除。
- 默认并发：`fileConcurrency=3`、`partConcurrency=4`。
- 默认保留内容、相对路径、mtime、Unix 可执行位；不完整保留 owner/group/ACL/xattr。
- 远端路径原样传给 Gateway/Client，不自动按 OS 猜测转换。

Gateway 记录 SyncJob、远端 manifest、冲突、进度和审计；SDK 负责本地 manifest、文件 IO、checkpoint 和进度上报。

## 传输清理

传输完成后，阿里云盘上的中转文件不会永久保留：

- 每个任务记录 `cleanupAfterAt`（默认 completed 后 24h）
- `cleanupStatus`: `none` → `cleanup_pending` → `cleanup_done` / `cleanup_failed`
- 清理服务定期扫描过期任务，调用 `deleteFile` 删除阿里云盘文件
- `cleanupTtlMs` 可在阿里云盘配置中自定义

## FRP 定位

FRP 只用于按需暴露目标机器内部服务，不用于默认命令控制。

### frps 部署责任

- **frps（公网服务端）由用户自备**，Noesis 不内置 frps。Gateway 配置 `frp.serverAddr/serverPort/token` 指向用户自己的公网 frps（可自托管，见仓库 `deploy/frps/docker-compose.yml` 可选示例）。
- **frpc（客户端）随 Client 打包**，由 Client 的 FrpcManager 管理生命周期。
- Gateway 只记录映射元数据与审计，不参与转发。

适合：

- DB。
- Web 服务。
- Debug 端口。
- SSH/RDP/VNC-like。
- 临时本地服务。

规则：

- 映射必须有过期时间。
- 映射必须可关闭。
- 创建人和任务 ID 必须审计。
- 默认不允许长期映射。
- 敏感端口需要确认。

## 安全原则

1. Client 主动连接 Gateway，不默认暴露本地控制端口。
2. Gateway 是唯一控制入口。
3. Pi Agent 由 Client 托管，不直接暴露。
4. FRP 短生命周期。
5. 大文件通过受控任务导入导出，Server 仅管理凭证不经手文件本体。
6. 阿里云盘 OAuth 凭证仅存于 Server DB，Client 仅获临时 accessToken + uploadUrl/downloadUrl。
7. 高风险操作需要显式确认。
8. 所有操作写入审计。
9. **Pi Provider Profile 脱敏**：Profile 中的 API Key 永不出现在事件、日志、payloadSummary。API 响应只返回 apiKeyPreview（脱敏预览）和 hasApiKey 布尔值。加密 Key 经 TLS 下发到 Client 临时 auth.json（0600），进程退出后删除。环境变量引用不落库。Profile 配置（URL/消息类型/模型清单）可审计，Key 明文不可。

## 日志与审计轮转

SQLite 长期运行需轮转策略：

- **task_events**：按任务保留，任务结束 N 天后归档/删除事件明细（保留 task.result 摘要）；高频 Pi 事件在 Client 侧已采样，事件入库亦做采样（首帧/末帧/每 N 帧一帧）。
- **audit_logs**：长期保留，超期归档到 StorageProvider（走 `file.export_to_cloud`），DB 保留摘要 + 归档链接。
- **pi_sessions JSONL**：见 05b 会话清理策略（配额 + LRU + 归档）。
- **Client 本地日志**：按大小/日期轮转（如 10MB×N 份），可导出到云盘。
- **SQLite 维护**：开启 WAL，定期 `PRAGMA wal_checkpoint` + `VACUUM`；轮转删除后回收空间。
- **配置化**：保留阈值在 Server config（`retention`，见 14）。

## 风险等级

| 等级 | 操作 |
|---|---|
| Low | 查看机器、列表目录、读取文件 |
| Medium | 写文件、执行普通命令、运行 Pi 修改项目 |
| High | 删除文件、安装依赖、开启 FRP、导出大文件 |
| Critical | 删除目录、数据库写、git push、修改系统服务 |

## 策略示例

Machine Policy 的**单一事实源是 Gateway DB `machines.policy_json`**（见 03/08），经 `PUT /api/machines/:id/policy` 管理（见 07，写审计），通过控制通道 `machine.policy.sync` 下发到 Client 只读镜像执行（见 04 Policy Engine）。Client 本地 config 不再定义路径策略；首装初始策略由 install token 携带，注册时 Gateway 落库。canonical schema 见 `schemas/machine-policy.example.json`。

```json
{
  "machineId": "win-dev-01",
  "allowedPaths": ["D:/Projects", "D:/OptiMinderHub"],
  "blockedPaths": ["C:/Windows/System32", "C:/Users/*/.ssh"],
  "allowCommand": true,
  "allowPiRun": true,
  "allowFrp": true,
  "piPolicy": {
    "defaultProfileId": "profile_001",
    "keyInjection": "managed",
    "projectTrust": "always",
    "defaultTimeoutSeconds": 3600,
    "toolMode": "full",
    "customTools": null,
    "policyGate": {
      "enabled": true,
      "rules": ["rm -rf", "git push", "drop table"]
    }
  },
  "requireApprovalFor": ["delete_file", "database_write", "system_service_change", "git_push"],
  "maxTaskDurationSeconds": 3600
}
```

> **注意**：`allowedPaths`/`blockedPaths` 只约束 file.* 操作，不约束 Pi 工作目录。Pi 可在任意目录运行，projectPath 由每次任务指定。`requireApprovalFor` 用于文件操作的危险动作确认；Pi 的危险命令拦截由 `piPolicy.policyGate` 负责。

## 审计字段

```text
id
source
actor
action
targetType
targetId
machineId
taskId
riskLevel
detail
result
requestId
createdAt
```

字段定义与 08 `audit_logs` 表一致，与 03 领域模型对齐。`detail` 存 payload 摘要（敏感字段脱敏，见下节）。

## 脱敏

必须脱敏：token、password、secret、api_key、Authorization、cookie、private key、StorageProvider token、模型 Provider Profile Key。

传输事件中所有含 `token`/`authorization`/`upload_url`/`download_url`/`secret` 的字段自动替换为 `[redacted]`（`sanitizeTransferEventPayload` 递归处理）。
