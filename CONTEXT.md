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
个人单用户系统中用于进入 Gateway 控制台的拥有者访问凭证，不表示多账号或 RBAC 身份体系。
_避免_：User account、RBAC role、Team member

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
_避免_：仅指日志行

**Noesis Distribution**：
从源码工作区构建出的可安装发布产物集合，用于验证 Gateway、Client Agent、SDK 和 CLI 能以真实包边界串联运行。
_避免_：工程骨架冒烟测试、单体演示包
