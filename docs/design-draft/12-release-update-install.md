# 12. 发版、自更新与一键安装

## Release Center

负责：

- Server 版本。
- Client 版本。
- Pi Agent 能力包。
- frpc 二进制。
- SDK / CLI npm 包。
- 插件包。
- Browser Use 轻量内置模块。
- Computer Use 可选能力包（Windows enikk runtime + OCR/YOLO weights）。
- manifest。
- 更新任务。
- 灰度和回滚。

## 发布包结构

```text
release/
  manifest.json
  server/
    noesis-server-v1.2.0-linux-x64.tar.gz
    noesis-server-v1.2.0-win-x64.zip
  client/
    noesis-client-v1.2.0-linux-x64.tar.gz
    noesis-client-v1.2.0-win-x64.zip
  frpc/
    frpc-linux-x64
    frpc-win-x64.exe
  pi/
    pi-agent-bootstrap-v1.2.0.zip
  cli/
    noesis-cli-v1.2.0.tgz
  sdk/
    noesis-sdk-v1.2.0.tgz
  capabilities/
    computer-use-pack-windows-x64-v1.2.0.zip
  plugins/
```

## Manifest 示例

```json
{
  "version": "1.2.0",
  "channel": "stable",
  "releaseTime": "2026-06-18T12:00:00.000Z",
  "components": {
    "client": {
      "version": "1.2.0",
      "artifacts": {
        "win-x64": {
          "file": "client/noesis-client-v1.2.0-win-x64.zip",
          "sha256": "replace_with_sha256",
          "size": 12345678
        }
      }
    },
    "computerUsePack": {
      "version": "1.2.0",
      "artifacts": {
        "win-x64": {
          "file": "capabilities/computer-use-pack-windows-x64-v1.2.0.zip",
          "sha256": "replace_with_sha256",
          "size": 456789012,
          "adapter": "enikk"
        }
      }
    }
  }
}
```

## SDK / CLI 发布原则

- SDK 作为 npm 包发布，产物包含 ESM + CJS + `.d.ts`。
- CLI 依赖同版本 SDK，避免 CLI 与 SDK 代码路径分叉。
- SDK/CLI 版本随 Gateway release manifest 记录，但不由 Client updater 安装。
- Skills 可随 CLI 包发布，也可独立拷贝到 agent skills 目录。

## Client 自更新原则

1. 不覆盖 data 目录。
2. 新版本解压到 versions。
3. current 指向当前版本。
4. 更新前记录 rollbackVersion。
5. 更新后做健康检查。
6. 健康检查失败自动回滚。
7. 更新过程持续上报状态。

## Client 目录

Windows：

```text
C:\ProgramData\Noesis\
  current\
  versions\1.1.0\
  versions\1.2.0\
  data\config.json
  data\machine-id
  data\scripts\
  data\capabilities\computer-use\
  data\automation\
  data\logs\
```

Linux：

```text
/opt/noesis/
  current -> versions/1.2.0
  versions/1.1.0/
  versions/1.2.0/
  data/config.json
  data/machine-id
  data/scripts/
  data/capabilities/computer-use/
  data/automation/
  data/logs/
```

## Client 更新流程

```text
收到 client.update
  -> 下载包
  -> 校验 sha256
  -> 解压到 staging
  -> 停旧服务
  -> 切换 current
  -> 启新服务
  -> 健康检查
  -> 成功上报
  -> 失败回滚
```

## Server 自更新

Server 自更新需要独立 updater：

```text
备份 SQLite
  -> 备份 config
  -> 下载新版本
  -> 校验
  -> 维护模式
  -> 停旧服务
  -> 切换版本
  -> migration
  -> 健康检查
  -> 成功或回滚
```

## 一键安装命令

Windows：

```powershell
iwr -useb "https://your-gateway.com/install/client.ps1?token=INSTALL_TOKEN&computerUse=install-only" | iex
```

Linux：

```bash
curl -fsSL "https://your-gateway.com/install/client.sh?token=INSTALL_TOKEN&computerUse=0" | sudo bash
```

## Computer Use Pack 安装/更新

Computer Use 不随所有 Client 默认安装，通过 Web 机器详情页或 Install Center 参数按需安装：

```text
用户点击「安装 Computer Use」
  -> Gateway 创建 computer.install task
  -> Client 下载 computer-use-pack
  -> 校验 sha256
  -> 解压到 data/capabilities/computer-use
  -> 写入本地 capability manifest
  -> 启动 enikk runtime 自检
  -> heartbeat 上报 computerUse.available/policyEnabled
```

安装和启用分离：

```text
installed=true     机器具备能力
policyEnabled=true Gateway 允许下发任务
```

Web 安装和一键脚本都默认 `install-only`；启用必须在安装成功、自检通过后通过 Web/API 显式执行 `computer.enable`，并写入 Machine Policy 与审计。

## 安装脚本步骤

Windows：

```text
检查管理员权限
创建 C:\ProgramData\Noesis
请求 Gateway 获取安装配置
从 StorageProvider 下载 Client 包
校验 sha256
解压到 versions
写入 data/config.json
注册 Windows Service
启动 Client
可选安装 Pi Agent
可选安装 Computer Use Pack（install-only；默认不启用、不自动执行桌面任务）
安装后运行 computer.doctor 自检并上报能力状态
```

Linux：

```text
检查 root 权限
创建 /opt/noesis
请求 Gateway 获取安装配置
从 StorageProvider 下载 Client 包
校验 sha256
解压到 versions
写入 data/config.json
写入 systemd service
systemctl enable --now noesis-client
可选安装 Pi Agent
Linux 服务器默认不安装 Computer Use Pack；Linux Desktop 后续通过独立 adapter 支持
```
