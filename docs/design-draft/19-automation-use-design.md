# 19. Browser Use / Computer Use 自动化能力设计

## 定位

Noesis 增加两类可选自动化能力，让 Pi Agent、Web、CLI、SDK 通过 Gateway 调用整个机器集群：

- `browserUse`：浏览器专用自动化能力，优先使用 DOM / CDP / 下载事件 / 页面状态，省 token、稳定、可验证。
- `computerUse`：完整桌面控制能力，控制屏幕、鼠标、键盘、应用切换，作为浏览器和桌面软件的通用兜底。

Pi Agent 不内置这些能力。Pi 进程通过注入的短期 Gateway Agent Token 调用 `noesis` CLI / SDK，反向使用集群能力。

```text
Pi Agent
  -> noesis CLI / SDK
  -> Gateway API
  -> Client capability
       browserUse / computerUse / command / file / frp / pi
```

## 关键决策

| 问题 | 决策 |
|---|---|
| 能力归属 | `browserUse` / `computerUse` 是 Client capability，不塞进 Pi Agent 核心 |
| Pi 访问集群 | Client 启动 Pi 时注入短期 Gateway Agent Token；TTL + 审计 + Approval 控风险 |
| 执行模式 | 默认 `macroFirst`：先脚本化，失败再云端 VLM / LLM 修复 |
| Computer Use 首发平台 | Windows，内置 enikk runtime sidecar，作为可选能力包安装 |
| Browser Use 首发形态 | Client 轻量内置，使用本机 Chrome / Edge，CDP/DOM 优先 |
| 云端模型 | 云端 Vision Provider 优先；本地只做截图、OCR、图标检测、Accessibility、执行 |
| 学习沉淀 | 轨迹 -> 候选 AutomationMacro -> 用户采纳 -> 下次优先执行 |
| Runbook 复用 | Macro 可导出 Runbook；导出默认锁定 macro version |
| 实时接管 | WebRTC 支持观看和人工接管；接管时暂停 AI |
| TURN | 默认 P2P-first + 公共 STUN；托管 TURN / 自建 TURN 均支持，需用户显式配置 |

## Capability 上报

Windows 桌面 Client：

```json
{
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
    "policyEnabled": true,
    "adapter": "enikk",
    "controlScope": ["desktop"],
    "sessionModes": ["currentDesktop", "dedicatedDesktop"],
    "perception": ["screenshot", "ocr", "iconDetection", "uiautomation"],
    "actions": ["click", "doubleClick", "drag", "scroll", "type", "hotkey", "appSwitch"],
    "learning": { "trajectory": true, "macroDsl": true, "runbookExport": true },
    "webrtc": { "observe": true, "control": true }
  }
}
```

Linux 服务器：

```json
{
  "computerUse": { "available": false, "reason": "headless_server" },
  "browserUse": { "available": false, "reason": "browser_not_found" }
}
```

## Browser Use

`browserUse` 是浏览器专用深模块。它比屏幕点击更稳定、更省 token、更容易验证。

### 操作阶梯

```text
1. DOM / Accessibility 语义操作
2. CDP Input.dispatchMouseEvent / dispatchKeyEvent
3. Extension helper（预留，只做语义提取/状态上报）
4. fallback 到 computerUse native input
5. captcha / 风控 / 登录安全确认 -> pause 等人工
```

不做反检测、验证码绕过、风控绕过、代理池或账号池。遇到验证码、二次验证、支付、发送、删除、授权等高风险动作时暂停并请求人工确认。

### Profile 策略

第一版优先接管浏览器环境，而不是轻易放弃：

```json
{
  "browserUsePolicy": {
    "enabled": true,
    "profileModeDefault": "existingProfileManaged",
    "onExistingProfileBusy": "requestRestart",
    "restartRequiresApproval": true,
    "restoreTabsAfterRestart": true,
    "fallbackToComputerUse": true
  }
}
```

当 Chrome / Edge 已运行且没有 CDP：

```text
检测 Profile busy
  -> 请求用户确认重启浏览器
  -> 记录当前标签页
  -> 关闭浏览器
  -> 用同一 Profile + CDP 重新启动
  -> 继续 browserUse
  -> 失败则 fallback computerUse
```

## Computer Use

`computerUse` 是完整桌面控制能力。Windows 第一版通过可选 `computer-use-pack` 内置 enikk runtime sidecar。

### enikk 接入方式

```text
Node Client
  -> ComputerUseManager
  -> 管理 enikk runtime sidecar 生命周期
  -> localhost API 调用 enikk
  -> 转换 enikk events 为 Gateway computer.* events
  -> Policy / Storage / Report / Macro / Runbook export 仍由 Gateway/Client 主栈负责
```

对用户表现为 Client 的一部分；实现上 enikk 是独立 runtime，降低 Node 重写 OCR/YOLO/桌面输入的风险。

### 本地与云端分工

```text
本地：
- screenshot capture
- OCR / icon detection / Accessibility tree
- mouse / keyboard / clipboard execution
- macro JSON DSL 解释执行
- trajectory 记录
- 简单验证：文本出现、下载完成、窗口切换

云端 VLM / LLM：
- 新任务规划
- 卡住时理解截图
- 失败步骤修复
- 任务结束总结
- macro / recipe candidate 生成
```

默认本地脱敏、压缩、裁剪后才把截图发给云端 VLM；敏感页面或完整桌面截图外发按策略要求确认。

## Automation Macro

统一的自动化资产模型覆盖 browser 和 computer：

```text
automation_macros
automation_macro_versions
automation_macro_candidates
automation_run_reports
```

Macro 使用受限 JSON DSL，不让学习系统直接生成任意 TS/JS 代码。

Browser macro：

```json
{
  "kind": "browser",
  "name": "export_daily_report",
  "scope": { "browser": "chrome", "urlHost": "internal-report.example.com" },
  "steps": [
    { "op": "goto", "url": "https://internal-report.example.com" },
    { "op": "click", "target": { "role": "button", "name": "导出" }, "strategy": ["dom", "cdpInput", "computerUse"] },
    { "op": "waitForDownload", "timeoutSeconds": 60 }
  ],
  "fallback": { "onStepFailure": "askVlm" }
}
```

Computer macro：

```json
{
  "kind": "computer",
  "name": "export_daily_report_from_desktop_app",
  "scope": { "os": ["windows"], "app": "Chrome" },
  "steps": [
    { "op": "waitForText", "text": "报表", "timeoutSeconds": 10 },
    { "op": "clickText", "text": "报表" },
    { "op": "clickText", "text": "导出" },
    { "op": "waitForDownload", "timeoutSeconds": 60 }
  ],
  "fallback": { "onStepFailure": "askVlm" }
}
```

匹配策略：

```text
score >= 0.85        自动执行 macro
0.55 <= score < 0.85  作为上下文交给 VLM 判断/修复
score < 0.55         忽略，进入 agent 模式
```

Macro 失败时默认允许 VLM 修复一次继续；敏感动作必须 Approval；修复结果只生成候选版本，不自动覆盖当前版本。

## Runbook 导出

Macro 可导出薄 Runbook，用于跨机器、文件、云盘、审批、通知编排。导出默认锁定 MacroVersion，保证可复现。

```ts
export default defineRunbook(async ({ on, log }) => {
  const m = on("win-desktop-01");

  log("开始导出日报");
  await m.browser.runMacro("export_daily_report", {
    version: 3,
    inputs: { date: "{{date}}" }
  });

  await m.file.exportToCloud({
    sourcePath: "C:/Users/me/Downloads/daily-report.xlsx",
    targetName: "daily-report-{{date}}.xlsx"
  });
});
```

`version: "latest"` 允许，但必须显式选择。

## Automation Run Report

每次 `browser.run` / `computer.run` 都生成报告，便于用户确认过程是否正确。

```json
{
  "kind": "mixed",
  "taskId": "task_123",
  "summary": "已导出今天日报，并上传到云盘。",
  "outcome": "success",
  "confidence": 0.92,
  "macroUsed": { "macroId": "am_export_daily_report", "version": 3, "recoveredSteps": [5] },
  "steps": [
    { "index": 1, "engine": "browserUse", "strategy": "dom", "action": "click", "target": "导出", "result": "success" },
    { "index": 5, "engine": "computerUse", "strategy": "nativeInput", "action": "clickText", "target": "下载 Excel", "result": "recovered_by_vlm" }
  ],
  "artifacts": [
    { "type": "download", "localPath": "C:/Users/me/Downloads/report.xlsx", "sha256": "...", "uploaded": false }
  ],
  "manualInterventions": [],
  "evidence": [{ "type": "file_exists", "path": "C:/Users/me/Downloads/report.xlsx" }]
}
```

成功必须带 evidence；证据不足时 `outcome=needs_review`。

默认只保存关键证据和关键帧；失败时保存更多上下文；完整 replay bundle 需用户手动保存到 `StorageProvider`。

## StorageProvider 使用

报告元数据进 Gateway DB；截图、关键帧、replay bundle、下载产物、大文件进抽象 `StorageProvider`。自动化模块只依赖 `storageObjectId` / `downloadUrl` / `sha256` / `size`，不依赖阿里云盘字段。

文件产物默认只记录本地路径、size、sha256；只有任务、Runbook 或用户明确要求时才上传。

## WebRTC 旁观与接管

WebRTC 是人工旁观/接管通道，不是 AI 主执行通道。

```text
Browser Web
  <-> Gateway signaling API / WS
  <-> Client WebRTC peer
       video: screen capture stream
       datachannel: mouse/keyboard control, pause/resume/steer
```

规则：

- 支持实时观看和人工接管鼠标键盘。
- 接管时 AI 强制暂停，避免抢鼠标。
- 不做多人同时控制、音频、WebRTC 文件传输。
- 默认只存摘要和关键帧，不录完整视频。
- WebRTC 失败时 fallback 到关键帧旁观/审批，不提供低频远程鼠标键盘控制。

TURN 策略：

```json
{
  "webrtc": {
    "iceMode": "p2p-first",
    "iceServers": [{ "urls": "stun:stun.l.google.com:19302" }],
    "turnProfiles": [
      { "id": "turn_self_001", "type": "self_hosted", "name": "My coturn", "urls": ["turn:turn.example.com:3478"], "credentialMode": "static" }
    ],
    "fallback": "keyframes"
  }
}
```

默认不启用公共 TURN relay；托管 TURN / 自建 TURN 需要用户在设置中显式配置。

## 安装、自检与修复

`computerUse` 作为可选能力包安装：

```text
noesis-client core
computer-use-pack-windows-x64
  enikk runtime
  OCR/YOLO weights
  launcher
  manifest
```

安装后默认 `install-only`，需机器策略显式启用；一键安装脚本不直接启用，安装成功且自检通过后由用户通过 Web/API 执行 `computer.enable`。

自检项：

```text
runtime 启动
localhost API health
截图成功
OCR/检测模型加载
输入 dry-run / 测试窗口
可交互桌面 session
屏幕未锁定
管理员权限状态
Vision Provider Profile 可用
StorageProvider 小文件上传（可选）
```

修复分普通修复和提权修复：

```text
普通修复：重装 pack、重下模型、清理旧进程、重新自检
提权修复：固定 allowlist 动作 + Gateway Approval + OS 原生 UAC/sudo
```

不支持任意管理员命令，不自动点击 UAC，不保存管理员密码。

## Policy

全局默认 + 机器覆盖；Client 只消费合并后的 Machine Policy。

```json
{
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
    "browserProfile": { "mode": "existingUserProfile", "browser": "chrome", "profileName": "Default", "requireApprovalOnFirstUse": true },
    "vision": { "mode": "cloud", "redactBeforeSend": true, "allowExternalScreenshots": true, "maxImageLongEdge": 1366 },
    "approval": { "requireFor": ["payment", "send_message", "delete", "submit_form", "publish", "grant_permission", "accept_terms", "credential_input"] },
    "retention": { "screenshotsHours": 24, "trajectoryDays": 30 },
    "webrtc": { "enabled": true, "turnProfileId": null, "fallback": "keyframes" }
  }
}
```

`maxSteps` 和 `timeoutSeconds` 是唯一防 runaway 限制；不做费用/调用次数预算上限。报告里只记录实际 VLM calls/token/cost（如果 Provider 返回）。

## CLI

```bash
# Browser Use
noesis browser status --machine win-dev-01
noesis browser run --machine win-dev-01 --instruction "导出今天日报"
noesis browser report task_123 --json

# Computer Use
noesis computer status --machine win-dev-01
noesis computer install --machine win-dev-01
noesis computer enable --machine win-dev-01
noesis computer doctor --machine win-dev-01
noesis computer repair --machine win-dev-01
noesis computer run --machine win-dev-01 --instruction "打开桌面软件导出日报"
noesis computer report task_123 --json
noesis computer replay task_123 --save
noesis computer macro approve candidate_123
noesis computer macro export-runbook am_export_daily_report --version 3
```

默认显式 `--machine`；支持 tag/capability 自动选择，但多候选不确定时返回 `MACHINE_SELECTION_REQUIRED`。

## Task Types

```text
browser.run
browser.macro.run
browser.doctor
browser.repair
browser.report.save_bundle

computer.run
computer.install
computer.enable
computer.disable
computer.doctor
computer.repair
computer.macro.run
computer.report.save_bundle

automation.macro.approve
automation.macro.export_runbook
automation.report.get

elevated.run   # 内部 taskType，只允许固定修复动作 allowlist
webrtc.remote.open
webrtc.remote.close
```

所有能力纳入现有 Task Orchestrator，不新建平行任务系统。

## 分期路线

### Phase A：最小闭环

- `computerUse` 可选能力包。
- enikk sidecar。
- `computer.run` `macroFirst` / `agent`。
- Task/Event/Audit。
- AutomationRunReport。
- Web 安装 / 自检 / 修复。
- `noesis computer run/report`。

### Phase B：复用与省 token

- AutomationMacro JSON DSL。
- Macro candidate / approve。
- Runbook export。
- `browserUse` CDP/DOM。
- browser `macroFirst`。
- 浏览器重启审批。

### Phase C：实时接管

- WebRTC signaling。
- P2P-first STUN。
- 托管 TURN / 自建 TURN profiles。
- 人工接管暂停 AI。
- Report 记录 intervention。
