# 06. Task Protocol JSON 设计

## Envelope

```json
{
  "version": "1.0",
  "messageId": "msg_001",
  "type": "task.dispatch",
  "timestamp": "2026-06-18T12:00:00.000Z",
  "machineId": "win-dev-01",
  "payload": {}
}
```

## Client Hello

```json
{
  "version": "1.0",
  "type": "client.hello",
  "machineId": "win-dev-01",
  "token": "client-token",
  "payload": {
    "hostname": "DESKTOP-001",
    "os": "windows",
    "arch": "x64",
    "clientVersion": "1.0.0",
    "capabilities": {
      "file": true,
      "command": true,
      "script": true,
      "frpc": true,
      "selfUpdate": true,
      "piAgent": {
        "installed": true,
        "ready": true,
        "version": "0.74.x",
        "rpcMode": true,
        "piTerminal": true
      },
      "browserUse": {
        "available": true,
        "adapter": "cdp",
        "browsers": ["edge", "chrome"],
        "profileModes": ["dedicatedProfile", "existingProfileManaged"],
        "fallbackToComputerUse": true
      },
      "computerUse": {
        "installed": true,
        "available": true,
        "policyEnabled": false,
        "adapter": "enikk",
        "controlScope": ["desktop"],
        "sessionModes": ["currentDesktop", "dedicatedDesktop"],
        "perception": ["screenshot", "ocr", "iconDetection", "uiautomation"],
        "actions": ["click", "doubleClick", "drag", "scroll", "type", "hotkey", "appSwitch"],
        "webrtc": { "observe": true, "control": true }
      },
      "runtimes": {
        "node": "24.x",
        "npm": true,
        "git": true,
        "powershell": true,
        "bash": true
      }
    },
    "disks": [
      { "name": "C:", "mount": "C:", "totalBytes": 511016563712, "usedBytes": 255508281856, "freeBytes": 255508281856, "usagePct": 50, "fsType": "ntfs", "readonly": false, "system": true, "label": "系统" },
      { "name": "D:", "mount": "D:", "totalBytes": 1000204886016, "usedBytes": 600122931609, "freeBytes": 400081954407, "usagePct": 60, "fsType": "ntfs", "readonly": false, "system": false, "label": "数据" }
    ]
  }
}
```

> **注 - Pi 就绪判定**：`piAgent.ready` 是 Client 上报的核心布尔标志。Gateway 收到 `client.hello` 后，将该值写入 Machine 的 `capabilitiesJson`（见 03 领域模型 Machine）。仪表盘"Pi 就绪率"KPI = 在线机器中 `piAgent.ready===true` 的比例。

> **注 - Computer Use 启用判定**：`computerUse.installed/available` 只表示能力包和运行时可用；只有 `computerUse.policyEnabled=true` 且 Machine Policy 允许时，Gateway 才能下发 `computer.run`。

## Client Heartbeat

```json
{
  "version": "1.0",
  "type": "client.heartbeat",
  "machineId": "win-dev-01",
  "timestamp": "2026-06-18T12:00:30.000Z",
  "payload": {
    "disks": [
      { "name": "C:", "mount": "C:", "totalBytes": 511016563712, "usedBytes": 258000000000, "freeBytes": 253016563712, "usagePct": 51, "fsType": "ntfs", "readonly": false, "system": true, "label": "系统" },
      { "name": "D:", "mount": "D:", "totalBytes": 1000204886016, "usedBytes": 600122931609, "freeBytes": 400081954407, "usagePct": 60, "fsType": "ntfs", "readonly": false, "system": false, "label": "数据" }
    ],
    "piAgent": { "installed": true, "ready": true, "version": "0.74.x" }
  }
}
```

Client 注册（hello）与每次心跳（heartbeat）均上报 `disks`（DiskInfo[]，见 03），Gateway 落库 `machines.disks_json` 并刷新 `last_seen_at`。写/导入类操作前 Gateway 据此校验目标盘 `freeBytes`（见 04/07）。

## Task Dispatch

```json
{
  "version": "1.0",
  "type": "task.dispatch",
  "taskId": "task_001",
  "machineId": "win-dev-01",
  "payload": {
    "taskType": "command.run",
    "timeoutSeconds": 600,
    "data": {}
  }
}
```

## command.run

```json
{
  "taskType": "command.run",
  "data": {
    "shell": "powershell",
    "command": "node -v",
    "cwd": "D:/Projects/app",
    "env": {},
    "stream": true
  }
}
```

## file.read

```json
{
  "taskType": "file.read",
  "data": {
    "path": "D:/Projects/app/package.json",
    "encoding": "utf-8",
    "range": { "offset": 0, "limit": 65536 }
  }
}
```

## file.write

```json
{
  "taskType": "file.write",
  "data": {
    "path": "D:/Projects/app/.env",
    "encoding": "utf-8",
    "mode": "overwrite",
    "content": "PORT=3000"
  }
}
```

## file.import_from_cloud

```json
{
  "taskType": "file.import_from_cloud",
  "data": {
    "provider": "aliyundrive",
    "fileId": "cloud_file_001",
    "downloadUrl": "https://example-download-url",
    "targetPath": "/opt/app/package.tar.gz",
    "sha256": "replace_with_sha256",
    "size": 123456789
  }
}
```

## file.export_to_cloud

```json
{
  "taskType": "file.export_to_cloud",
  "data": {
    "provider": "aliyundrive",
    "sourcePath": "/var/log/app.zip",
    "targetName": "app-log-20260618.zip",
    "sha256Required": true
  }
}
```

## pi.run

```json
{
  "taskType": "pi.run",
  "data": {
    "projectPath": "D:/any/dir/OptiMinder",
    "goal": "检查项目依赖并修复运行环境问题",
    "prompt": "请检查 package.json 和启动脚本，修复项目启动失败问题。",
    "providerProfileId": "profile_001",
    "constraints": {
      "toolMode": "full",
      "customTools": null,
      "appendSystemPrompt": "不要删除用户文件",
      "timeoutSeconds": 3600,
      "policyGate": {
        "enabled": true,
        "rules": ["rm -rf", "git push", "drop table"],
        "autoAction": "reject"
      }
    },
    "environment": {
      "cwd": "D:/any/dir/OptiMinder",
      "approveMode": "always"
    }
  }
}
```

> **Pi 配置校准（v2）**：projectPath 不受 allowedPaths 限制，Pi 可在任意目录运行。environment.cwd 为 spawn 的 cwd 选项（Pi 没有 `--cwd` flag）。constraints.toolMode 映射到 Pi `--tools`/`--exclude-tools` flag。constraints.policyGate 为 Client 侧拦截（仅 pi.terminal 交互有效，pi.run 自动拒绝）。providerProfileId 指定用哪个 Provider Profile（见 05/07/08）。environment.approveMode 映射到 `--approve`/`--no-approve`（控制 Pi 的 project trust 行为）。已删除的无效字段：allowInstallDeps/allowNetwork/maxOutputBytes/allowShell/allowFileEdit/preferredShell/packageManager/loadProjectInstructions/extraInstructions。

## browser.run

```json
{
  "taskType": "browser.run",
  "data": {
    "instruction": "导出今天日报",
    "mode": "macroFirst",
    "profileMode": "existingProfileManaged",
    "providerProfileId": "profile_vision_001",
    "fallback": ["cdpInput", "computerUse", "human"],
    "maxSteps": 80,
    "timeoutSeconds": 1800
  }
}
```

## computer.run

```json
{
  "taskType": "computer.run",
  "data": {
    "instruction": "打开桌面软件导出今天日报",
    "mode": "macroFirst",
    "sessionMode": "dedicatedDesktop",
    "providerProfileId": "profile_vision_001",
    "maxSteps": 80,
    "timeoutSeconds": 1800,
    "recordReport": true
  }
}
```

`mode`：`macroFirst` / `agent` / `observeOnly`。默认 `macroFirst`，优先执行已采纳 AutomationMacro；失败或无经验时才调用云端 VLM/LLM。仅保留 `maxSteps` 和 `timeoutSeconds` 防止无限循环，不做费用/调用次数预算上限。

## automation.macro.run

```json
{
  "taskType": "automation.macro.run",
  "data": {
    "macroId": "am_export_daily_report",
    "version": 3,
    "kind": "browser",
    "inputs": { "date": "2026-06-24" }
  }
}
```

## frp.open

```json
{
  "taskType": "frp.open",
  "data": {
    "protocol": "tcp",
    "localHost": "127.0.0.1",
    "localPort": 5432,
    "remotePort": 15432,
    "expireSeconds": 3600,
    "description": "临时访问 PostgreSQL"
  }
}
```

## client.update

```json
{
  "taskType": "client.update",
  "data": {
    "targetVersion": "1.2.0",
    "package": {
      "provider": "aliyundrive",
      "downloadUrl": "https://download-url",
      "sha256": "replace_with_sha256",
      "size": 12345678
    },
    "rollbackOnFailure": true,
    "healthCheckTimeoutSeconds": 60
  }
}
```

## browser/computer task.event

```json
{
  "version": "1.0",
  "type": "task.event",
  "taskId": "task_123",
  "machineId": "win-dev-01",
  "timestamp": "2026-06-24T12:00:05.000Z",
  "event": {
    "type": "automation.step",
    "level": "info",
    "data": {
      "kind": "browser",
      "step": 3,
      "engine": "browserUse",
      "strategy": "dom",
      "action": "click",
      "target": "button[name=导出]",
      "result": "success",
      "evidence": "download event observed"
    }
  }
}
```

```json
{
  "version": "1.0",
  "type": "task.event",
  "taskId": "task_124",
  "machineId": "win-dev-01",
  "timestamp": "2026-06-24T12:00:08.000Z",
  "event": {
    "type": "automation.recovered_by_vlm",
    "level": "warn",
    "data": {
      "kind": "computer",
      "failedStep": 5,
      "recovery": { "action": "clickText", "target": "下载 Excel" },
      "candidateVersionCreated": "amv_4_candidate"
    }
  }
}
```

```json
{
  "version": "1.0",
  "type": "task.event",
  "taskId": "task_125",
  "machineId": "win-dev-01",
  "timestamp": "2026-06-24T12:00:11.000Z",
  "event": {
    "type": "webrtc.control_taken",
    "level": "info",
    "data": { "remoteSessionId": "wrs_001", "aiPaused": true, "candidateType": "relay" }
  }
}
```

## task.event

```json
{
  "version": "1.0",
  "type": "task.event",
  "taskId": "task_001",
  "machineId": "win-dev-01",
  "timestamp": "2026-06-18T12:00:01.000Z",
  "event": {
    "type": "stdout",
    "level": "info",
    "data": { "chunk": "v24.15.0\n" }
  }
}
```

## task.result

```json
{
  "version": "1.0",
  "type": "task.result",
  "taskId": "task_001",
  "machineId": "win-dev-01",
  "timestamp": "2026-06-18T12:00:05.000Z",
  "result": {
    "status": "succeeded",
    "exitCode": 0,
    "summary": "命令执行成功",
    "artifacts": []
  }
}
```

## task.approval_request

命中 `requireApprovalFor` 时 Gateway 创建 Approval 并发给 Web/CLI/SDK，用户决策后回 `task.approval_decision` 或调用 `/api/approvals/:id/approve|reject`：

```json
{
  "version": "1.0",
  "type": "task.approval_request",
  "taskId": "task_001",
  "machineId": "win-dev-01",
  "timestamp": "2026-06-18T12:00:02.000Z",
  "approval": {
    "approvalId": "appr_001",
    "reason": "delete_file",
    "source": "command_option",
    "riskLevel": "high",
    "detail": { "tool": "bash", "command": "rm -rf node_modules" },
    "timeoutSeconds": 300
  }
}
```

## task.approval_decision

```json
{
  "version": "1.0",
  "type": "task.approval_decision",
  "taskId": "task_001",
  "approvalId": "appr_001",
  "decision": "approved",
  "actorId": "cli:noesis-cli",
  "timestamp": "2026-06-18T12:00:10.000Z"
}
```

`decision`：`approved` / `rejected`。拒绝时 Client abort 该工具/命令，任务转 `failed`；RunbookRun 的 `approve()` 则抛错，由脚本 `try/catch` 决定是否中止整条流。

> `actorId` 在个人单用户系统记录"确认来源"（web / cli / skill 名），而非用户身份；协议字段名与枚举值为机制名，UI 文案用"确认"（见 11）。

## Runbook / Sync 事件流

RunbookRun 与 SyncJob 不走 Client 控制通道下发父实体；它们是 Gateway 服务端一等执行实例，通过 HTTP API 创建，通过事件流观察：

```text
GET /api/runbook-runs/:id/events
GET /api/sync/:id/events
/ws/runbook-runs/:id/events
/ws/sync/:id/events
```

事件统一包含递增 `event.id`，SDK 用 `sinceEventId` 做 replay + live 恢复。

Runbook 能力调用产生的单机动作仍走 `task.dispatch` / `task.event` / `task.result`。SyncJob 下的单文件传输仍走 TransferJob API 与传输事件。

## machine.policy.sync

Gateway 在 Client `client.hello` 接受后下发全量 Machine Policy，后续 `PUT /api/machines/:id/policy` 变更时增量推送（见 03/07/13）。Client 存为本地只读镜像，Policy Engine 据此执行（见 04）。

```json
{
  "version": "1.0",
  "type": "machine.policy.sync",
  "machineId": "win-dev-01",
  "timestamp": "2026-06-18T12:00:00.000Z",
  "policy": {
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
    "browserUsePolicy": {
      "enabled": true,
      "profileModeDefault": "existingProfileManaged",
      "onExistingProfileBusy": "requestRestart",
      "restartRequiresApproval": true,
      "fallbackToComputerUse": true
    },
    "computerUsePolicy": {
      "enabled": true,
      "defaultProfileId": "profile_vision_001",
      "modeDefault": "macroFirst",
      "sessionModeDefault": "dedicatedDesktop",
      "vision": {
        "mode": "cloud",
        "redactBeforeSend": true,
        "allowExternalScreenshots": true,
        "maxImageLongEdge": 1366
      },
      "approval": {
        "requireFor": ["payment", "send_message", "delete", "submit_form", "publish", "grant_permission", "accept_terms", "credential_input"]
      },
      "retention": { "screenshotsHours": 24, "trajectoryDays": 30 },
      "webrtc": { "enabled": true, "turnProfileId": null, "fallback": "keyframes" }
    },
    "requireApprovalFor": ["delete_file", "database_write", "system_service_change", "git_push"],
    "maxTaskDurationSeconds": 3600
  },
  "revision": 3
}
```

`revision` 单调递增，Client 据此判断是否需要更新本地镜像。

## client.reconcile

Client 重连后上报在跑任务清单，Gateway 对账（见 09/10）：

```json
{
  "version": "1.0",
  "type": "client.reconcile",
  "machineId": "win-dev-01",
  "payload": {
    "tasks": [
      { "taskId": "task_001", "localStatus": "running", "pid": 12345 },
      { "taskId": "task_002", "localStatus": "lost" }
    ]
  }
}
```

`localStatus`：`running`（存活，恢复事件流）/ `lost`（进程已死，Gateway 标记 `failed`）。
