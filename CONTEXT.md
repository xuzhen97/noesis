# Noesis 领域术语表

Noesis 灵识是一个人机共生工作台：一个 Gateway 协调 AI Agent、远程机器、命令、文件、Pi 会话、传输和审计的自动化。

## 术语

**Noesis**：
产品整体名称。一个人机共生工作台，连接人类意图、AI Agent 和远程机器。
_避免_：Agent gateway、remote control tool

**Gateway**：
中央控制面，负责 API 访问、Machine 注册、Task 编排、审计和协调。
_避免_：在描述产品角色时使用 Server

**Owner Token**：
个人单用户系统中用于访问 Gateway 控制面（Web 控制台、SDK、CLI）的拥有者访问凭证，不表示多账号或 RBAC 身份体系。
_避免_：User account、Password account、RBAC role、Team member

**Client Agent**：
运行在目标机器上的常驻进程，向外连接 Gateway 并在本地执行操作。
_避免_：Worker daemon、remote shell

**Machine**：
已注册的 Windows/Linux/macOS 目标，通过 Client Agent 的心跳和能力描述来体现。
_避免_：当指产品资源时使用 Host

**Task**：
由 Gateway 创建并派发给 Client Agent 的可观测执行单元。
_避免_：除非指外部系统，否则不使用 Job

**Task Event**：
只追加不修改的事件流，用于 Task 的日志、进度、stdout/stderr、生命周期和证据。
_避免_：仅指日志行、控制面审计记录

**AuditLog（审计日志）**：
Gateway 控制面上「某次操作从哪来、做了什么、关联哪台 Machine / 哪个 Task」的只追加记录；核心是 `source` / `actor` / `requestId`，不是 Task 内的 stdout。
_避免_：与 Task Event 混称为「日志」

**Runtime Log（运行日志）**：
Gateway 或 Client Agent 进程本地写入的轮转日志文件（如 `data/logs/`），用于进程级 INFO/WARN/ERROR 与栈信息；经 Gateway API 聚合查询或导出，供排障与 Agent 拉取现场。
_避免_：与 Task Event、AuditLog 混称「审计」

**Release Center**：
Gateway 侧发版与更新编排：manifest、组件版本、更新任务、灰度与回滚策略；发布包本体走 StorageProvider 数据面，控制面只传元数据与进度。
_避免_：单指 `pnpm build:distribution` 本地目录

**Self-update（自更新）**：
通过 Release Center 下发更新任务，由 Updater 拉包、校验、切换 `versions/current`、健康检查并在失败时回滚；Gateway 与 Client Agent 均可能参与，过程须产生 Task Event 与 AuditLog。
_避免_：手动覆盖安装包、无回滚的替换

**Noesis Distribution**：
从源码工作区构建出的可安装发布产物集合，用于验证 Gateway、Client Agent、SDK 和 CLI 能以真实包边界串联运行。
_避免_：工程骨架冒烟测试、单体演示包

**StorageProvider**：
外部云盘适配层。Gateway 只经 OAuth 持有元数据与小文件签发，文件体由调用方（CLI、Web 浏览器、Client Agent）直传到云盘预签名 URL，Gateway 不经手二进制大对象。
_避免_：云盘代理、文件缓存层

**AliyunDrive（阿里云盘 v1）**：
StorageProvider 的首个实现，交互面为 `openapi.alipan.com` 开放平台；鉴权用 PKCE（`code_challenge_method=plain`，`redirect_uri=oob`）。token 落库用 Gateway 数据目录 `.gateway-key` 派生密钥 AES-256-GCM 加密。
_避免_：混淆 tickstep/aliyunpan 等第三方 CLI 封装

**TransferJob（存储中转任务）**：
经云盘「中转」在 Gateway 两侧来回搬运文件的任务实体，落库到 `transfer_jobs`；`direction` 区分 import（盘→机器）/export（机器→盘），`mode` 首轮仅 `aliyundrive`。
_避免_：直接等同于云盘上传下载进度条

**FileTask（file.list / file.read / file.write）**：
通过 Task/Event 同步等待的文件操作，走 `task.dispatch` 通道，单文件读写上限 10MB；大文件请用 TransferJob。
_避免_：无限制文件 shell 操作

**DiskInfo**：
Client Agent `client.hello` 上报的机器磁盘/根目录清单（id、label、path、totalBytes、freeBytes），Gateway 落 `machines.disks_json`，Web 显示为磁盘条。
_避免_：把 DiskInfo 混同为本地挂载点枚举
