# 11. UI/UX 设计方案（简化版）

> 本文档是 Noesis 控制台的 UI/UX 规范，面向设计师和前端开发。所有界面文案为**简体中文**，提供夜间 / 明亮双主题。

---

## 一、设计原则

1. **控制台感**：信息密度高，适合运维场景
2. **机器优先**：以机器为核心组织导航
3. **任务可追踪**：所有操作生成任务，可查看状态和日志
4. **危险操作显性化**：删除、系统服务等高风险操作需二次确认
5. **双主题**：默认夜间主题，右上角可切换明亮主题；终端与代码区在明亮主题下保持低眩光浅底等宽样式
6. **简洁直观**：减少层级，避免过度抽象

---

## 二、全局信息架构

### 2.1 页面路由

| 路由 | 页面 | 说明 |
|---|---|---|
| `/dashboard` | 仪表盘 | 系统总览、关键指标 |
| `/machines` | 机器列表 | 所有机器的状态、版本、标签 |
| `/machines/:id` | 机器详情 | 概览、终端、会话、文件、日志、FRP 映射、Computer Use、配置 8 个 Tab |
| `/tasks` | 全局任务列表 | 常规任务 + Pi 批处理合并，按类型筛选 |
| `/tasks/:id` | 任务详情 | 任务事件流和审计；待确认时显示审批面板 |
| `/todos` | Todo 协作 | 待办、子任务、ready、VCP 领取状态、Tag 筛选与终判 |
| `/contexts` | Context 管理 | 给 VCP / Agent 读取的执行信息包，机器绑定 + Markdown 编辑预览 |
| `/sync` | 同步任务 | 目录同步 SyncJob 列表、进度、冲突和恢复入口 |
| `/sync/:id` | 同步详情 | 文件级计划、TransferJob 明细、checkpoint/恢复状态 |
| `/releases` | 发布中心 | 版本管理和滚动发布 |
| `/install` | 安装中心 | 令牌管理和安装命令 |
| `/storage` | 存储 | StorageProvider 中转文件管理（默认阿里云盘） |
| `/automation` | 自动化资产 | Browser/Computer Macro、候选经验、AutomationRunReport 汇总 |
| `/runbooks` | Runbook 库 | 服务侧全局编排流（TS 即 DSL），跨机器多节点流程 |
| `/runbook-runs/:id` | Runbook 执行详情 | RunbookRun trace、子 Task/Transfer/Approval 聚合 |
| `/approvals` | 审批中心 | 聚合待确认 Approval，处理 approve()/命令级确认/policy gate |
| `/audit` | 审计日志 | 操作审计记录 |
| `/settings` | 设置 | API Token、Pi Provider Profile、StorageProvider、保留策略 |

### 2.2 全局布局

```text
┌─────────────────────────────────────────────────────────────────┐
│ [Logo] Noesis   全局搜索 ⌘K           🔔  🌓  ⚙           │ 顶栏 56px
├──────────┬────────────────────────────────────────────────────────┤
│ ⌂ 仪表盘  │ 面包屑：机器 / win-dev-01 / 概览       ●在线 v1.2.0    │ 面包屑 40px
│ ▦ 机器    ├────────────────────────────────────────────────────────┤
│ ▣ 任务    │                                                       │
│ ☑ 待办    │                                                       │
│ ◫ 上下文  │                                                       │
│ ◉ 发布    │                 主内容区                               │
│ ⇩ 安装    │                                                       │
│ ☁ 存储    │                                                       │
│ ⇄ 同步    │                                                       │
│ ☷ 审计    │                                                       │
│ ⚙ 设置    │                                                       │
└──────────┴────────────────────────────────────────────────────────┘
  220px                     主内容区自适应
```

- **左导航 220px**：图标 + 文字，当前页左侧有蓝紫强调色边框
- **顶栏 56px**：Logo、全局搜索、通知、主题切换、设置；主题切换在夜间/明亮间即时生效并记忆本地选择
- **面包屑 40px**：显示当前位置，机器详情页右侧显示机器状态
- **滚动边界**：左导航、顶栏与面包屑固定在控制台框架内，页面整体不滚动；仅主内容区随当前路由内容滚动
- **滚动条**：主内容滚动条使用细圆角 thumb、透明 track；非滚动容器（例如 Settings Tab 栏）不得因为 `overflow-x-auto` 暴露横向滚动条
- **页面标题区**：统一使用轻标题（标题 + 一行说明），不再显示 `NOESIS CONSOLE` 眉标，避免配置页/列表页出现过重 hero 区
- **主内容区**：padding 24px

---

## 三、视觉设计语言

### 3.1 配色（深色）

| Token | 值 | 用途 |
|---|---|---|
| `--background` | `#0B0E14` | 页面底色 |
| `--surface` | `#121722` | 卡片/面板底 |
| `--surface-2` | `#1A2030` | 次级面板/表头 |
| `--border` | `#232A3A` | 分割线/边框 |
| `--foreground` | `#E6EAF2` | 主文字 |
| `--muted-foreground` | `#8B93A7` | 次要文字 |
| `--primary` | `#6366F1` | 主强调色（蓝紫） |
| `--success` | `#22C55E` | 在线/成功 |
| `--warning` | `#F59E0B` | 警告 |
| `--destructive` | `#EF4444` | 危险/失败 |
| `--terminal-bg` | `#0A0D12` | 夜间终端背景 |

### 3.2 配色（明亮）

明亮主题用于白天办公、文档阅读和表格密集浏览，保持控制台信息密度，但降低黑底长时间阅读压力。

| Token | 值 | 用途 |
|---|---|---|
| `--background` | `#F5F7FB` | 页面底色 |
| `--surface` | `#FFFFFF` | 卡片/面板底 |
| `--surface-2` | `#F1F5FB` | 次级面板/表头 |
| `--border` | `#D8E0EC` | 分割线/边框 |
| `--foreground` | `#172033` | 主文字 |
| `--muted-foreground` | `#64748B` | 次要文字 |
| `--primary` | `#4F46E5` | 主强调色（靛蓝） |
| `--success` | `#16A34A` | 在线/成功 |
| `--warning` | `#D97706` | 警告 |
| `--destructive` | `#DC2626` | 危险/失败 |
| `--terminal-bg` | `#F8FAFC` | 明亮主题下的终端 / Markdown / 代码浅底 |

明亮主题约束：

- 侧栏白底，active nav 使用浅靛蓝底 + 靛蓝左边框。
- 顶栏半透明白底 + 轻阴影，保持 sticky 层级。
- 卡片使用白底和轻阴影，不靠大面积灰边区分层级。
- 徽章使用浅底深字，避免夜间主题的高亮色在白底上刺眼。
- 终端、Markdown、代码块使用低眩光浅底，不用纯白。
- 主题切换不改变路由、筛选、分页、选中项等业务状态。

### 3.3 字号

| Token | px/行高 | 用途 |
|---|---|---|
| `text-xs` | 12/16 | 标签、时间戳 |
| `text-sm` | 14/20 | 表格、按钮 |
| `text-base` | 16/24 | 输入框 |
| `text-lg` | 18/28 | 区块标题 |
| `text-xl` | 20/28 | 页面标题 |
| `text-2xl` | 24/32 | 仪表盘大数字 |

- **字体**：界面用系统 sans-serif，终端和代码用 `'JetBrains Mono', 'Cascadia Code', Consolas, monospace`

### 3.4 间距与圆角

- **间距**：4 / 8 / 12 / 16 / 24 / 32 / 48 px
- **圆角**：控件 6px、卡片 8px、弹窗 12px
- **阴影**：卡片浅阴影、悬浮面板中等阴影

### 3.5 图标

- **图标库**：Lucide React
- **尺寸**：导航 20px、表格 16px、按钮 16px
- **语义**：`Server`=机器、`Terminal`=命令、`Folder`=文件、`Bot`=Pi、`Network`=FRP

---

## 四、核心组件

### 4.1 状态徽章 `StatusBadge`

- 形态：圆点 + 文字，`text-xs`，`rounded-full px-2.5`
- 变体：`在线`(success) / `离线`(muted) / `运行中`(primary+脉冲) / `成功`(success) / `失败`(destructive) / `待确认`(warning) / `需复核`(warning)

### 4.2 数据表 `DataTable`

- 列头 `surface-2` 底、`text-xs uppercase`
- 行高 40px，hover 背景浅色，选中行左侧 2px primary 边框
- 支持排序、分页、筛选

### 4.3 按钮 `Button`

- 尺寸：默认 / `sm`(小号)
- 变体：默认 / `primary`(主强调) / `danger`(危险) / `ghost`(透明)

### 4.4 Panel 卡片

- 背景 `surface`，边框 `border`，圆角 8px
- 标题行：左侧标题 `text-lg`，右侧可选操作按钮
- 内容区：padding 16px

---

## 五、页面详细设计

> 以下布局图只画主内容区，不包含左导航和顶栏

### 5.1 仪表盘 `/dashboard`

**布局**：

- 第一行：5 个 KPI 指标卡（在线机器、离线机器、运行任务、失败任务、Pi 就绪率）
- 第二行：2 列（机器状态分布饼图、Client 版本分布柱状图）
- 第三行：2 列（最近失败任务表格、数据面状态）
- 第四行：最近活动时间线

**关键指标**：

- **Pi 就绪率** = 已就绪在线机器数 ÷ 总在线机器数 × 100%
- 每台机器通过 `capabilities.piAgent.ready` 上报状态

### 5.2 机器列表 `/machines`

**功能**：

- 顶部：搜索框 + 标签筛选下拉 + "添加机器"按钮
- 表格列：名称、OS、状态、Hostname、版本、Pi 状态、心跳、标签、操作
- 点击行进入机器详情
- 底部分页栏：筛选后先分页再渲染

**搜索**：

- 实时模糊匹配 `machineId` / `hostname` / `ip` / `os`（不区分大小写）
- 输入即筛，无需点按钮
- 空结果展示空状态卡（`∅ 没有符合条件的机器 / 试试清空搜索或切换标签筛选`）

**标签筛选**：

- 下拉选项从全部机器的 `tags` 派生（动态，不写死）
- 选某标签后只显示含该标签的机器；"按标签（全部）"为默认不筛选项
- 与搜索可叠加（AND 逻辑）

**分页**：

- **筛选→分页**：先按搜索+标签筛选，再对结果分页（避免筛选后页码错位）
- 每页大小可选：`10`（默认）/ `20` / `50`
- 页码导航：上一页/下一页 + 页码按钮（超过 7 页时中间用 `…` 省略）
- 分页信息：`第 X–Y 条 / 共 Z 条`，有筛选时追加 `· 已筛选`
- 搜索、标签、页大小变化时页码重置到第 1 页
- **阈值参考**：< 100 台分页足够；> 100 台需后端分页（`?page=&pageSize=&q=&tag=`），前端不再全量拉取

**设计考量（为什么分页）**：

- 机器舰队规模可达数十台（开发机/服务器/VM/GPU 机组/边缘节点混合），一次性渲染全部行会造成视觉过载、扫描困难
- 分页让每屏行数可控（默认 10 行），状态/标签/心跳一眼可比
- 与 4.2 DataTable 规范"支持排序、分页、筛选"一致
- 个人单用户系统机器数量有限（< 100），前端分页足够；预留后端分页接口适配更大规模

**分页栏布局**：

```text
┌─表格（10 行）──────────────────────────────────────────┐
│ 名称        OS    状态   Hostname   ...   操作        │
│ win-dev-01  Win   在线   WIN-DEV-01 ...   文件 终端 ⋮  │
│ ...                                                   │
└───────────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────────┐
│ 第 1–10 条 / 共 18 条     每页[10▾]  ‹上一页 [1] 2 下一页›│
└───────────────────────────────────────────────────────┘
```

**Pi 状态说明**：

- `●就绪`：Pi Agent 已安装且 ready=true
- `○未装`：未安装或 ready=false

### 5.3 机器详情 `/machines/:id`

**Tab 体系**（8 个 Tab，Pi 内容已分散合并，FRP 和 Computer Use 独立为动态管理面，Runbook 上提到服务侧全局库）：

1. **概览**：能力条、运行时指标、磁盘概览/详情、近期任务（不包含 Pi 策略）
2. **终端**：纯命令终端（shell 交互，不含 Pi）
3. **会话**：Pi 交互终端（pi.terminal，机器上下文由路由确定，不选机器；会话列表侧栏 + 对话区 + 输入框）
4. **文件**：目录树 + 文件列表 + 预览
5. **日志**：机器运行日志（INFO/WARN/ERROR 级别筛选 + 导出云盘）
6. **FRP 映射**：frps 连接状态 + 映射表 + 新建抽屉 + 端口映射模板（动态管理面，外网可达能力）
7. **Computer Use**：浏览器/桌面自动化能力安装、自检、修复、运行、报告、WebRTC 接管
8. **配置**：Pi / Browser Use / Computer Use 策略（机器级静态默认配置，Runbook 已上提到服务侧全局库，不在本页）

**设计原则**：Pi 的三个维度按语义合并到对应 Tab：交互会话→「会话」Tab、批处理任务→全局「任务」页、静态策略→「配置」Tab。日志是机器自身运行产物，放机器详情。FRP 映射和 Computer Use 都是高频动态操作面，与 Pi 策略这类静态默认值不同频，独立成 Tab。概览只反映运行时状态，终端只管纯命令 shell，不设独立「Pi」Tab。

**机器头部**（所有 Tab 共用）：

- 左侧：OS 图标 + 机器名 + Hostname + IP
- 右侧：状态徽章 + 版本徽章 + 操作下拉

#### 5.3.1 概览 Tab

自上而下纵向布局（不设 Pi 策略区）：

```text
┌─能力条（单行）──────────────────────────────────────────┐
│ ⌘命令 PowerShell  ▤文件可用  πPi v0.74  🔗FRP运行中  ☁存储已连  🌐Browser  🖥Computer │
├───────────────────────────────────────────────────────┤
│ 运行时指标卡片：CPU │ 内存 │ 磁盘(可展开) │ 负载 │ 心跳      │
├───────────────────────────────────────────────────────┤
│ 磁盘详情（多盘/多分区表格，全宽，按需展开）             │
├───────────────────────────────────────────────────────┤
│ 近期任务（全宽表格）                                   │
└───────────────────────────────────────────────────────┘
```

- 概览不包含任何 Pi 策略 / Pi 会话 / Pi 任务配置（这些在「配置」「会话」「任务」Tab）
- 近期任务为全局任务筛选，默认显示最近 8 条

#### 5.3.2 终端 Tab

**单一模式**：纯命令终端（不再双模式切换，Pi 会话已独立到「会话」Tab）。

**会话生命周期**（“主动打开”而非常驻）：

1. **未连接（idle）**：进入 Tab 时不自动打开终端，而是显示一张会话卡片：
   - 标题“打开终端会话” + 副文案说明将在哪台机器（host · ip）启动交互式 shell
   - Shell 选择器（按 OS 默认：Windows=PowerShell，其他=bash，可手动改）
   - 主按钮「⏎ 连接终端」
   - **机器离线时**：隐藏 Shell 选择器与连接按钮，仅提示“该机器当前离线，无法建立终端会话”
2. **连接中（connecting）**：点击连接后短暂显示“正在建立控制通道…” + 旋转图标（约 0.7s），模拟 Gateway 控制通道握手
3. **已连接（connected）**：进入交互式模拟终端，体验与本地 PowerShell / bash 一致

**交互式终端体验**（连接后）：

- **顶部工具条**：Shell 徽章（PS / bash）+ 机器在线指示（`● id · host`）+ 当前路径（`~` / `~/Projects`）+ 「清屏」「断开」按钮
- **主体**：暗色终端背景，等宽字体，逐行渲染：
  - 欢迎横幅（PowerShell 版权信息 / Ubuntu Welcome + Last login from ip + 真实时戳）
  - 命令行：提示符 + 输入的命令（提示符着绿色）
  - 输出行：按 tone 着色（ok=绿 / err=红 / warn=橙 / dim=灰）
- **行内提示符输入**：提示符与输入框在同一行（不是独立的底部输入栏），输入框透明无缝融入，Enter 提交、自动追加输出并自动滚动到底部
- **命令历史导航**：↑ / ↓ 回溯历史命令；Ctrl+L 清屏
- **提示符随 shell 与路径变化**：
  - bash：`admin@host:~$`（home 显示为 `~`）
  - PowerShell：`PS C:\Users\admin>`
- **模拟命令集**（原型阶段）：`help` / `pwd` / `cd <path>` / `ls`·`dir` / `echo` / `whoami` / `date` / `cat <f>` / `node -v` / `npm i` / `git status` / `git log` / `clear`·`cls` / `exit`；未知命令返回 shell 风格错误（bash: `command not found`，PS: 无法识别 cmdlet）
- **`clear` / `cls`**：清空滚动缓冲；**`exit`**：断开会话，回到未连接卡片

> 设计意图：让“打开终端”成为一个显式动作（与现实 SSH/本地终端一致），连接后是沉浸式全屏交互，而不是一个总挂着的静态 mock 输入框。

#### 5.3.3 会话 Tab

**Pi 交互终端**（pi.terminal，对应文档 05b）：专注 AI 协作场景，与「终端」Tab 的纯命令 shell 互不干扰。

**机器上下文无需选择**：会话 Tab 位于机器详情页内，机器已由路由 `/machines/:id` 确定，不再设机器切换器。子顶栏左侧以只读徽章展示当前机器（`{m.id} · {m.os}`），与列表页面包屑一致。

```text
┌─会话 Tab────────────────────────────────────────────────┐
│ Pi 会话                                     [ + 新会话 ] │
├───────────────子顶栏（机器徽章 + 模型 + thinking + abort + token）─│
│ [侧栏：会话列表]   [对话区：user/assistant/thinking/tool/turnend] │
│                    [输入框 + steer / 发送]                    │
└─────────────────────────────────────────────────────────┘
```

- **Panel 头**：标题「Pi 会话」+ 右侧「+ 新会话」按钮（不再隐藏 panel-head）
- **子顶栏**：左侧机器徽章 `{m.id} · {m.os}`（只读，不可切换）+ 模型下拉（取自该机器的 Provider Profile）+ thinking 级别 + abort ▾；右侧 token 统计 `⚡ 12.3k · $0.42`
- **左侧栏**（220px）：会话搜索框 + 会话列表（不再含机器切换器）。会话项显示名称 + 预览 + 时间 + ⋯ 菜单
- **中间对话区**：user 消息（右对齐气泡）、assistant 消息（左对齐 markdown）、thinking 折叠卡、tool 卡（bash/文件编辑）、turnend 分隔线
- **底部输入框**：textarea + steer / 发送 按钮，`/` 触发命令
- **全屏占用**：Panel 高度 = `calc(100vh - 128px)`，对话区内部滚动，侧栏会话列表内部滚动，输入框固定在底部

**steer 与 abort 的区别**（两个按钮放不同位置的设计理由）：

| | steer | abort |
|---|---|---|
| 模型还在跑吗 | 是，**不停止**，把新 prompt 注入流 | 是，**立即停止** |
| 心智模型 | "等等，换个方向" — 模型继续 turn 但改变目标 | "停下，别动了" — 拿回控制权 |
| RPC 命令 | `prompt` 带 `streamingBehavior: "steer"` | `abort` / `abort_bash` / `abort_retry` |
| 副作用 | turn 继续，token 继续涨 | turn 终止，计费停止 |
| 放置位置 | 输入框旁（消息级："我要说话"） | 子顶栏（会话级："我要让模型闭嘴"） |

> **为什么 steer 放输入框、abort 放顶栏**：steer 是用户表达（"我想换个方向"），属于消息输入区；abort 是运行时控制（"立即停止当前 turn"），属于会话运行时状态区。两者物理分离避免混淆"改方向"和"急刹车"两种完全不同的操作意图。

**abort 的三档粒度**（`abort ▾` 下拉而非平铺按钮）：

| 命令 | 停止范围 | 用途 |
|---|---|---|
| `abort` | 停整个 turn | 模型明显走偏，不想让它继续任何动作 |
| `abort_bash` | 只停当前 bash toolcall | 命令在跑但跑歪了（如 `npm install` 卡死），停这一个、保留 turn |
| `abort_retry` | 停自动重试循环 | API 限流触发了 `auto_retry_*`，不想再烧 token 重试 |

> **为什么是下拉**：单一 abort 按钮做不到三档粒度 — 用户可能只想停那条卡死的 bash 而不想丢掉模型已经做完的一半工作。`abort ▾` 下拉既保留语义又不过度占顶栏空间。

**abort 与 token 统计的关联**：子顶栏右侧 `⚡ 12.3k · $0.42` 与 abort 物理相邻，强化"运行时状态"语义 — 用户 abort 往往就是为了止住 token 燃烧。长会话持续消耗模型 token，靠 `get_session_stats` 在顶栏实时展示 token/费用，并在 `maxLifetimeSeconds` 到期前提示用户。

**abort 与 policy-gate（危险操作拦截）的关系**：

- **policy-gate 是系统自动暂停**：Client 订阅 `tool_execution_start`，对命中 `policyGate.rules` 的工具（如 `bash` 含 `rm -rf` / `git push`）暂停透传，先弹 `pi.ui.request(method=confirm)` 让 Web 用户确认；用户拒绝则回 `abort` 该 toolcall。
- **abort 按钮是用户手动防线**：即使没有命中规则，用户看到模型在做蠢事也能一键叫停。
- **端到端流程**：系统拦截 → Web 弹确认框 → 用户拒绝 → Client 回 `abort` 该 toolcall → 写入审计。abort 按钮是这条路径之外的**独立手动逃生口**。

**Pi 会话消息类型**：

- `user`：右对齐气泡，`primary/10` 底
- `assistant`：左对齐，markdown 渲染
- `thinking`：折叠卡，"思考过程"
- `tool`：工具调用卡（bash、文件编辑等）
- `turnend`：分隔线 + token/耗时摘要

> **为什么「会话」独立成 Tab**：Pi 会话是"和 AI 对话改代码"的心智模型，与纯命令终端"敲命令看输出"完全不同。硬塞进终端 Tab 会让两种使用场景互相干扰，且会话的侧栏/对话区需要全宽空间。
>
> **为什么不再选机器**：会话 Tab 已在机器详情页内，机器由路由确定。在会话内切机器会破坏“当前机器的工作上下文”这个隐含语义，且与面包屑/概览/终端等 Tab 的机器上下文不一致。跨机器的会话浏览请使用「任务」Tab 的全局任务列表。

#### 5.3.4 文件 Tab

**多磁盘浏览**：文件 Tab 顶部为「磁盘切换条」，展示该机器上报的所有磁盘/分区，点击切换浏览根。每张磁盘卡片含：盘名/挂载点、系统/只读徽章、卷标、用量进度条（≥85% 红、≥70% 橙、否则绿）、`已用/总容量` + `使用率%`、挂载路径 + 文件系统类型。磁盘卡片左边框颜色与用量同步。

**布局**：磁盘切换条下方为三栏：

```text
┌─────────────────────────────────────────┐
│ 磁盘切换条（auto-fill 180px 卡片）       │
├────────┬──────────────────┬───────────┤
│ 目录树  │ 文件列表（表格）  │ 预览抽屉   │
│ 270px  │ 自适应            │ 360px     │
└────────┴──────────────────┴───────────┘
```

- **顶部提示条**：小文件走控制通道，大文件走 StorageProvider 中转 · 当前盘 `挂载路径` · 可用 `NG`（按用量着色）
- **磁盘切换条**：列示该机器所有 `disks[]`；点击切换后路径重置到该盘根。离线机器不渲染切换条
- **目录树**：按当前磁盘 + OS 生成真实感树（Win 系统盘 `Users/Program Files/Windows`、数据盘 `Projects/Backups/Archives`；Linux 根 `/etc /var /home /usr /opt`、数据分区 `/data /logs`、home 分区 `/home/admin`；macOS `Applications/Users`）。文件夹可展开/收起（▸/▾），点击目录项导航
- **面包屑**：`盘根 › dir1 › dir2`，每段可点击回跳；分隔符随 OS（`\` / `/`）。右侧「新建 / 上传小文件 / 存储中转导入 / 存储中转导出」
- **文件表**：名称（📁/📄 图标 + 存储中转徽章）/ 大小 / 修改时间 / 权限。双击文件夹进入；空目录显示「空目录」占位。选中文件后操作栏出现「存储中转导出」
- **预览抽屉**：选中文件后按类型展示模拟内容（TypeScript / JSON / Markdown / 日志 / 配置 / 压缩包）；选中文件夹显示子项数与路径；附「编辑 / 删除 / 存储中转导出」

**StorageProvider 中转交互（对接 Server 管理认证 + Client 直传架构）**：

- **上传小文件**（≤10MB）：走控制通道直传，无需 StorageProvider
- **存储中转导入**（>10MB）：
  1. 用户选择本地文件 → 调用 `POST /api/transfers/uploads { transfer: 'auto' }`
  2. Server 返回 `{ mode: 'provider', provider: 'aliyundrive', accessToken, uploadParts[] }` 或降级 `{ mode: 'frps_chunked' }`
  3. 浏览器使用 accessToken + uploadUrl 直传 StorageProvider（不经 Server）
  4. 上传完成 → `POST /api/transfers/:id/web-upload-complete`
  5. Server 通知 Client 下载 → Client 流式写入目标路径
  6. 传输进度实时展示（轮询 `GET /api/transfers/:id`）

- **存储中转导出**：
  1. 选中文件 → 点击「StorageProvider 中转导出」→ `POST /api/transfers/uploads { transfer: 'provider' }`
  2. Server 通知 Client 上传到 StorageProvider
  3. Client 上传完成 → Web UI 可点击「下载」→ `POST /api/transfers/:id/refresh-download-url` 获取临时链接

- **StorageProvider 未授权时**：中转导入/导出按钮显示为 disabled + tooltip「请先在存储页面完成默认 Provider 授权」
- **传输状态徽章**：文件表中正在传输的文件显示状态徽章（上传中/下载中/已完成/失败）

**空间感知（与磁盘逻辑一致）**：

- 当前盘 `freeGb < 5` → 黄色告警条「剩余空间不足，上传大文件可能失败」
- 当前盘 `usagePct ≥ 98` → 红色阻断条「已满，无法写入。请先清理或选择其他磁盘」，「上传小文件」按钮禁用
- 系统盘用量颜色与磁盘概览卡一致（≥85% 红 / ≥70% 橙）

**空状态**：机器离线或无磁盘 → EmptyState「机器离线，无法浏览文件」/「该机器暂无磁盘信息」，不渲染切换条与文件表

#### 5.3.5 FRP 映射 Tab

**定位**：独立的动态管理面，承载“外网可达能力”的生命周期操作。与「配置」Tab 的静态默认值语义不同——FRP 映射会被频繁创建/关闭/查看状态，是操作面而非策略。

**固定包含四块**：

1. **frps 连接状态面板**：展示当前连接的 frps 服务器地址、端口、在线状态、带宽、活跃映射数。frps 由用户自备，不可在此页配置（系统级设置）。
2. **映射表**：ID、名称、本地地址、远程端口、协议、状态、创建时间、过期时间 / 剩余时间、操作（编辑/关闭/删除）。映射默认短生命周期，过期自动关闭；用户可手动关闭（停止映射但保留记录）或删除（彻底移除）。
3. **新建/编辑抽屉**：点击「+ 新建映射」或某条映射的「编辑」后，右侧抽屉滑出，填写本地地址、远程端口（自动分配/指定）、协议。抽屉式交互不破坏已有列表布局。
4. **端口映射模板区**：内置模板（Web 8080、SSH 22、MySQL 3306、PostgreSQL 5432、Redis 6379）为快捷入口，点击即用模板值预填新建抽屉；支持「保存当前为模板」产生用户自定义模板。

> **为什么保留过期机制**：FRP 映射会暴露目标机器内部服务，必须短生命周期、可审计、可自动关闭。UI 用剩余时间和续期按钮降低心智负担，而不是取消 TTL。
>
> **为什么独立成 Tab**：FRP 在概览能力条已是“能力”语义（与命令/文件/Pi/云盘并列），埋在「配置」第三层会造成“能力 vs 配置”的心智模型冲突。独立成 Tab 后与文件/任务同级，匹配“外网可达”的运维心智。

#### 5.3.6 Computer Use Tab

**定位**：机器级浏览器/桌面自动化操作面，承载安装、启用、自检、修复、运行、报告、WebRTC 接管。策略默认值仍在「配置」Tab。

固定包含五块：

1. **状态卡**：Browser Use 可用状态、Computer Use Pack 是否安装、是否启用、自检状态、当前桌面 session、默认 Vision Profile、StorageProvider 状态。
2. **环境操作**：安装能力包 / 更新 / 卸载 / 启用 / 停用 / 自检 / 修复。修复按钮文案用「修复环境」，内部可触发普通修复或提权修复审批。
3. **运行任务**：输入 instruction，选择 `browserUse` / `computerUse` / 自动，默认 `macroFirst`；显示运行中任务和 desktop lock 状态。
4. **报告**：最近 AutomationRunReport 列表，展示 outcome、confidence、macroUsed、fallback、产物、是否 needs_review；支持保存证据包到 StorageProvider。
5. **实时接管**：WebRTC 旁观/接管入口；接管时显示「AI 已暂停」，可释放控制后 resume/cancel。

环境修复确认文案：

```text
此操作会在 win-dev-01 上请求管理员权限，用于修复：
- 安装/修复 Computer Use 能力包
- 注册必要的本地服务
- 检查桌面控制权限

不会执行任意命令。需要你在目标电脑上确认系统弹出的 UAC 提示。
```

#### 5.3.7 配置 Tab

**包含机器级静态策略**（FRP 映射和 Computer Use 动态操作已移至独立 Tab，Runbook 已上提到服务侧全局库「Runbook 库」页）：

1. **Pi 策略**：Provider Profile 选择 + 运行时策略 + 工具权限 + 危险操作拦截
2. **Browser Use 策略**：启用开关、默认 profileMode、浏览器重启策略、fallback 到 Computer Use
3. **Computer Use 策略**：启用开关、默认 Vision Profile、默认模式、截图脱敏、敏感动作确认、保留策略、WebRTC 策略

**Pi 策略面板**（配置 Tab 第二个 Section）：

- Provider Profile：默认 Profile 下拉（全局+机器级）+ "复制为机器 Profile" 按钮
- 运行时策略：Key 注入模式（managed/fallback/local_only）+ 项目信任（always/never）+ 默认超时
- 工具权限默认：完全权限 / 只读分析 / 自定义（三档预设）
- 危险操作拦截：启用开关 + 拦截规则列表 + 说明"仅 pi.terminal 交互有效"
- 底部「保存策略」按钮写审计并触发 `machine.policy.sync` 下发

**Browser / Computer Use 策略面板**：

- Browser Use：启用、默认 `existingProfileManaged`、Profile busy 时 `requestRestart`、重启前确认、失败 fallback Computer Use。
- Computer Use：启用、默认 `macroFirst`、默认 `dedicatedDesktop`、默认 Vision Provider Profile、云端截图允许/脱敏、敏感动作确认列表、截图/轨迹保留时间。
- WebRTC：启用、TURN Profile 选择、fallback=关键帧。

**去掉的旧字段：** 项目配置（项目目录）— projectPath 由每次任务指定；项目说明/启动命令 — 由 AGENTS.md 自动加载；能力默认开关（allowShell/allowFileEdit 等）— 用工具权限预设替代；并发上限 — 改为 Task Runner 独立配置。

> 提示：Pi 会话在「会话」Tab，Pi 批处理任务在全局「任务」页（与常规命令/文件/安装任务合并，按类型筛选），Pi 策略在本页。Runbook 在侧栏「自动化」分组的「Runbook 库」页。

### 5.3.8 全局自动化资产 `/automation`

全局页管理 Browser Use / Computer Use 的可复用资产和报告：

- **Macro 列表**：kind（browser/computer）、名称、适用范围、latest version、成功率、最近运行、状态、操作（禁用/导出 Runbook）。
- **候选经验**：由成功或修复后的 trajectory 生成，用户可查看步骤、证据、失败修复原因，然后「采纳」或「拒绝」。
- **报告列表**：跨机器查看 AutomationRunReport，按 kind/outcome/machine/time 筛选。
- **Runbook 导出**：选择 macro + version，生成薄 Runbook，默认锁定版本。

### 5.4 任务列表 `/tasks`

**常规任务与 Pi 批处理合并**为统一任务列表，按类型筛选区分（命令/文件/安装/Pi 批处理本质是同一抽象的不同实例）。

- 顶部：类型/状态/机器/风险筛选器 + 「+ 发起任务」
- 表格列：任务 ID、类型（徽章区分）、内容/Goal、机器、状态、风险、创建时间、耗时、操作
- 点击行进入任务详情；待确认状态行带「确认」快捷按钮

### 5.5 任务详情 `/tasks/:id`

布局：

```text
┌─────────────────────────────────┬───────────┐
│ 任务头部（ID、类型、机器、状态） │           │
├─────────────────────────────────┤ 侧栏      │
│ 事件流（Pi 任务回放）            │ 280px     │
│ - 时间线形式展示事件             │           │
│ - thinking、tool_call、文件变更  │ 审计关联  │
│                                 │ token统计 │
└─────────────────────────────────┴───────────┘
```

**Automation Report Tab**：当任务类型为 `browser.*` / `computer.*` / `automation.*` 时，任务详情增加「自动化报告」Tab，展示 Summary、Timeline、Evidence、Artifacts、Macro Learning、WebRTC intervention、Audit。`outcome=needs_review` 时头部显示「需要复核」提示。

**待确认任务的审批面板**：当任务状态为「待确认」时，头部下方显示人工审批面板（与审批中心共用 ApprovalPanel 组件）：

- 来源徽章（编排流确认门 / 命令选项级）+ 来源 Runbook + 目标机器
- 确认门消息（橙色警示色）
- 执行上下文：已完成步骤（✓ 灰）/ 确认后将执行步骤（→ 蓝），供审批人判断
- 「✓ 确认执行」/「✕ 拒绝（中止流）」按钮
- 确认→触发 durable execution 恢复；拒绝→ approve() 抛错，脚本 catch 决定是否中止

### 5.6 Todo 协作 `/todos`

**页面职责**：管理 Todo / Tag / Context 协作资源，让用户拆分可执行事项、控制 ready、观察 VCP 领取与回写，并对顶层完成做最终确认。

**布局**：

```text
┌──────────────────────────────┬────────────────────────────────────┐
│ 筛选后的 Todo 队列             │ Todo 详情 / 编辑 / 证据              │
│ - 每页 20/50/100              │ - title / description markdown      │
│ - 父子关系摘要                │ - tags / context / ready / assignee │
│ - status/ready/assignee 摘要  │ - resultSummary / linked tasks      │
│                              │ - audit 摘要 / confirm 操作          │
└──────────────────────────────┴────────────────────────────────────┘
```

**顶部筛选**：搜索框 + status / ready / tag / context / assignee / archived。默认展示未归档 Todo；先筛选，再按 `priority DESC, due ASC NULLS LAST, created_at ASC` 排序，最后分页。

**左侧 Todo 队列**：

- 不默认全展开树；Todo 很多时展示扁平队列。
- 分页默认每页 20，可切 20 / 50 / 100；搜索、筛选、页大小变化回第 1 页。
- 行内展示父子关系：顶层 leaf / 父容器 / 子任务及父 Todo 名称。
- 有子任务的顶层 Todo 显示「父容器」，不可 claim。
- 无子任务的顶层 Todo 与子任务显示「leaf」，可按规则 claim。
- 行内展示：状态徽章、ready/not ready、领取人、优先级、截止时间、Context。
- 引用已归档 Context 的行显示红色 Context 徽章。
- 超过数千条时切后端分页或游标查询；首版不做无限滚动。

**右侧详情**：

- 基础字段：title、description markdown、due、priority、tags、context、ready、assignee。
- 父 Todo 显示子任务进度和聚合状态。
- VCP 回写区显示 `resultSummary` 和 `executedTaskIds`，linked task 可跳转 `/tasks/:id`。
- 审计区显示 ready / claim / report / confirm / status / archive 最近记录。
- 操作区：Claim、Report done/failed、Confirm、Archive/Unarchive。

**交互规则**：

- Claim 仅在 `leaf && status=todo && ready=true && assignee=null && !archived && context未归档` 时可用；禁用时展示原因。
- `ready` 只在 `status=todo` 时可改；doing 后冻结，回退 todo 后解冻。
- VCP 完成顶层 leaf 后进入「待确认」，用户 confirm 后 done。
- VCP 完成子任务后子任务直接 done；父 Todo 全部子任务 done 后进入「待确认」，由用户 confirm 父 Todo。
- 用户自己完成 leaf 可直接 done，因为用户就是终判者。

### 5.7 Context 管理 `/contexts`

**页面职责**：维护 VCP / Agent 可复用的执行信息包。Context 是活文档，改即生效，不做版本。

**布局**：

```text
┌──────────────────────────┬──────────────────────────────────────┐
│ Context 列表              │ 编辑 + Preview                         │
│ - 搜索 / archived 筛选    │ - name                                  │
│ - 机器数 / Todo 引用数    │ - machineIds 多选                        │
│ - 更新时间 / 归档状态     │ - markdown 原文 + preview               │
└──────────────────────────┴──────────────────────────────────────┘
```

**左侧列表**：支持搜索和 archived 筛选；每行显示 Context 名称、绑定机器数、引用 Todo 数、更新时间、归档状态。

**右侧编辑**：

- `name` 输入。
- `machineIds` 多选，可为空；只校验机器存在，不要求在线。
- markdown 编辑器 + preview。首版 preview 可轻量实现，正式版再接 Markdown 渲染。
- 引用 Todo 列表，显示状态并可跳转到 `/todos`。
- 操作：保存、归档、恢复。

**交互规则**：

- markdown 原样保存，不支持模板变量。
- 附件不进入 Context；文件路径和 URL 写在 markdown 中。
- 已归档 Context 历史可见，新 Todo 不可选择。
- ready Todo 引用已归档 Context 时，Todo 页 claim 禁用并提示 `CONTEXT_ARCHIVED`。

### 5.8 发布中心 `/releases`

两栏布局：

- 左侧（280px）：版本列表
- 右侧：选中版本详情
  - manifest/artifacts 信息
  - 目标机器选择
  - 灰度比例滑块
  - 滚动进度时间轴（发布→分发→下载→安装→验证→完成）
  - 开始发布/回滚按钮

### 5.9 安装中心 `/install`

两栏布局：

- 左侧：创建令牌表单 + 安装命令展示 + 令牌列表表格
- 右侧（280px）：安装审计

**安装命令**：

- PowerShell / Bash 切换 Tab
- 命令展示 + 复制按钮
- 令牌信息（有效期、已用次数/上限）

### 5.10 存储 `/storage`

**页面职责**：查看 StorageProvider 认证状态 + 管理默认 Provider OAuth 授权 + 查看所有传输任务状态。Server 管理认证，Client/浏览器获取凭证直传。**第一版默认 Provider 是 AliyunDrive；配置（clientId/clientSecret 等）在「设置 → StorageProvider」Tab 管理，此页仅查看认证状态和发起授权**。

**顶部区域**：

1. **认证状态卡**（左侧，只读）：
   - 未配置：显示「未配置 StorageProvider」+ 「前往设置」按钮（跳转 `/settings` StorageProvider Tab）
   - 已配置未授权：显示「未授权」+ 「开始授权」按钮 → 调用 `POST /api/aliyundrive/oauth/start` → 弹窗显示授权 URL → 用户完成授权后回填 code → `POST /api/aliyundrive/oauth/complete`
   - 已授权：显示「已授权 ✓」+ 授权账号名 + driveId + Token 过期时间 + 「测试授权」按钮 + 「撤销授权」按钮
   - 已过期：显示「授权已过期」+ 「重新授权」按钮
2. **传输概览卡**（右侧 2~3 张统计卡）：
   - 进行中任务数 / 已完成 / 失败
   - 当前中转文件夹：`transferFolder` 名称
   - 清理策略：`cleanupTtlMs` 换算为小时

**传输任务列表**（主区域）：

- 表格列：任务ID / 文件名 / 方向（导入↓/导出↑）/ 目标机器 / 模式（StorageProvider/FRP直传）/ 状态 / 进度条 / 大小 / 创建时间 / 操作
- 状态色标：进行中=blue / 已完成=green / 失败=red / 已取消=gray
- 进度条：上传任务显示 `uploadedBytes/totalBytes`，下载任务显示 `downloadedBytes/totalBytes`
- 操作列：
  - 进行中：「取消」（`POST /api/transfers/:id/cancel`）
  - 已完成（导出）：「下载」（`POST /api/transfers/:id/refresh-download-url` 获取临时链接）
  - 失败：「重试」/「查看错误」
- 点击行展开传输事件流（`GET /api/transfers/:id/events`）
- 顶部筛选：状态 / 方向 / 机器 / 时间范围

**认证流程交互细节**：

1. 管理员点击「开始授权」→ 调用 `POST /api/aliyundrive/oauth/start`
2. 弹窗显示授权 URL（可复制），提示用户在新标签页打开并完成授权
3. 用户在阿里云盘页面授权后，将回调中的 code 粘贴到输入框
4. 点击「完成授权」→ `POST /api/aliyundrive/oauth/complete { state, code }`
5. 成功后认证状态卡刷新为「已授权」
6. 可随时点击「测试授权」→ `POST /api/aliyundrive/test` 验证 token 有效性

### 5.11 审计日志 `/audit`

- 顶部：高级筛选、时间/来源/风险筛选、导出按钮
- 表格列：时间、来源、操作、目标、风险、结果
- 风险色标：低=muted、中=warning、高=destructive

### 5.12 设置 `/settings`

**Tab 分区**：

P0 当前只展示已经落地的真实设置，不放空占位：

1. **Owner Token**：本地认证状态、Gateway 信息、协议版本、能力列表、退出并清除本地 Token
2. **阿里云盘**：默认 AliyunDrive 的 clientId/clientSecret 配置 + OAuth 授权状态；状态表至少展示配置状态、授权记录状态、远程校验状态、校验说明、账户名、Drive ID、过期时间、最近检测时间

后续完整设计再补充：

- **API Token**：Token 列表表格，可生成/吊销
- **Pi Provider Profile**：Provider Profile 管理（URL/Key/消息类型/模型清单）
- **WebRTC / TURN**：公共 STUN、托管 TURN 模板、自建 TURN Profile
- **保留策略**：任务事件保留天数、审计归档天数、Pi 会话本地限制、自动化截图/轨迹保留

**Pi Provider Profile Tab 设计：**

- 列表视图：显示所有全局 Profile，每行含名称 + 消息类型徽章 + 模型数 + 默认标记
- 操作：新建 / 编辑 / 删除 / 设为默认
- Profile 编辑面板（单页表单）：
  - 名称、Provider 标识、消息类型（4选1下拉）、Base URL
  - API Key 三选一：加密存储 / 引用环境变量 / 不需要 Key
  - 模型清单表格：ID / 名称 / 推理 / 上下文窗口，可添加/删除
  - 模型添加弹窗：ID / 显示名称 / 支持推理 / 支持图片 / 上下文窗口 / 最大输出
- 机器级 Profile 不在此页管理（在机器详情「配置」Tab 中通过“复制为机器 Profile”创建/维护）

**WebRTC / TURN Tab 设计**：

- 默认连接策略：P2P-first + 公共 STUN。
- TURN Profile 列表：托管服务模板（Metered/Xirsys/ExpressTURN/Turnix/Cloudflare 等）和自建 coturn。
- Profile 表单：urls、username、credential、credentialMode；credential 加密保存，列表只显示 `hasCredential`。
- 测试按钮：创建一次 ICE connectivity test，显示 host/srflx/relay 是否可用。
- 明确提示：未配置 TURN 时跨网 WebRTC 可能失败，失败 fallback 到关键帧旁观。

**StorageProvider Tab 设计（AliyunDrive v1）**：

- 未配置时：显示配置表单（clientId 输入框 / clientSecret 输入框 / scope 默认值 / transferFolder 默认值 / cleanupTtlMs 默认值）+ 「保存配置」按钮
- 已配置未授权：显示「配置已保存」状态 + 「开始授权」按钮（跳转到云盘页面 OAuth 流程，或内联弹窗）
- 已配置已授权：显示配置信息（clientId / scope / transferFolder / cleanupTtlMs）+ 「编辑配置」按钮 + 授权状态表（配置状态 / 授权记录状态 / 远程校验状态 / 校验说明 / 已授权账号名 / Drive ID / Token 过期时间 / 最近检测时间）+ 「测试授权」「撤销授权」按钮
- clientSecret 输入框永远为 password 类型（不回显已保存的 secret）

---

## 六、交互规范

### 6.1 表格交互

- 行 hover 显示浅色背景
- 可点击行：cursor pointer
- 选中行：左侧 2px primary 边框 + `primary/10` 背景

### 6.2 危险操作确认

高风险操作（删除、关闭 FRP、系统命令等）：

- 弹出确认弹窗 `RiskConfirmDialog`
- 显示：警告图标 + 操作详情 + 风险等级
- 高危操作：需输入"确认"二字才能提交
- 按钮：确认（primary）+ 拒绝（destructive outline）

### 6.3 Toast 通知

- 位置：右下角
- 自动消失：4 秒（danger 态需手动关）
- 类型：success / info / warning / destructive

### 6.4 终端交互

**命令终端**：

- `Enter` 发送命令
- 实时显示 stdout/stderr
- stderr 用 `destructive` 色

**Pi 终端**：

- `Enter` 发送消息，`Shift+Enter` 换行
- `/` 触发 slash 命令
- `steer` 按钮：打断当前 turn 改方向
- 流式渲染：文本增量显示，bash 输出增量替换

---

## 七、响应式设计

### 断点

- **桌面**：≥1280px（设计基准）
- **平板**：≥768px，<1280px
- **移动**：<768px（隐藏左导航，顶部汉堡菜单）

### 适配规则

- **<1450px**：KPI 卡片从 6 列变 3 列，多列布局变单列
- **<900px**：隐藏左导航和顶栏右侧按钮，内容 padding 减少

---

## 八、无障碍

- **键盘可达**：所有交互元素支持键盘导航
- **焦点环**：`ring-2 ring-primary/40`
- **对比度**：≥ WCAG AA 标准
- **危险操作**：不只用颜色区分，配图标和文字

---

## 九、性能优化

- **虚拟滚动**：长列表（任务事件流、审计日志）
- **懒加载**：目录树展开时请求子目录
- **防抖**：搜索输入 300ms 防抖
- **分页**：表格默认 20 条/页，可选 50/100

---

## 十、实现建议

### 技术栈

- **框架**：React 19 + TypeScript
- **构建**：Vite
- **样式**：Tailwind CSS + 自定义 CSS 变量
- **组件**：基于 shadcn/ui 或自定义
- **表格**：TanStack Table
- **终端**：xterm.js
- **图表**：Recharts
- **Markdown**：@tailwindcss/typography

### 文件结构

```
src/
├── App.tsx          # 路由和全局布局
├── pages.tsx        # 所有页面组件
├── components.tsx   # 通用组件
├── mockData.ts      # Mock 数据
├── styles.css       # 全局样式和 CSS 变量
└── main.tsx         # 入口
```

### 状态管理

- **路由状态**：使用简单的 `useState` + `Route` 类型
- **表单状态**：受控组件
- **服务端状态**：生产环境建议 TanStack Query

---

### 5.13 审批中心 `/approvals`

承接 Runbook 编排流里 `approve()`、`cmd(..,{approve:true})` 和 policy gate 产生的人工审批请求（详见 17-runbook-flow-orchestration.md 的「审批闭环」）。挂起期间审批请求是 DB 里一行 Approval，零运行时占用；审批动作到来才临时起执行实例恢复。

**入口**：侧栏「治理」分组 + 顶栏🔔角标（实时显示待审批数，点击直达）。

**顶部筛选栏**：搜索框（按 Approval ID / 任务 ID / RunbookRun ID / 机器 / 来源 Runbook / 确认门消息模糊匹配）+ 来源下拉（编排流确认门 / 命令选项级 / policy gate）+ 风险下拉（高/中/低）+「+ 新建」。

**审批卡片列表**（每条一张 Panel）：

- 卡片头：任务 ID（等宽）+ 来源徽章（编排流确认门=紫 / 命令选项级=青）+ 来源 Runbook 徽章 + `@ 目标机器` + 风险徽章 + 创建时间
- 审批面板（ApprovalPanel，与任务详情页共用）：
  - 确认门消息（橙色警示色左边框）
  - 触发点（节点名 @ 机器）
  - 执行上下文两栏：已完成步骤（✓ 灰）/ 确认后将执行步骤（→ 蓝）——审批人不仅看「确认什么」，还看「之前做了什么、确认后会做什么」才可决策
  - 「✓ 确认执行」/「✕ 拒绝（中止流）」按钮

**分页**：审批请求可能很多，列表分页（默认每页 10，可切 20/50，带页码省略号）。搜索/筛选变化自动回第 1 页。处理一条后总数、角标、分页三者同步重算（已处理项从列表消失，后续页前移补位）。

**确认/拒绝执行语义**：确认 → 触发对应 Task 的 durable execution 恢复，脚本从 `approve()` 断点重放继续；拒绝 → `approve()` 抛错，脚本里 `try/catch` 决定是否中止整条流（不 catch = 中止）。

**状态联动**：审批处理状态提升到 App 层，顶栏🔔角标与审批中心实时联动——处理一条角标数减一，全处理完角标消失、列表显示空状态「没有待处理的审批 🎉」。

---

## 附录：术语对照

| 中文 | 英文 | 说明 |
|---|---|---|
| 机器 | Machine | 运行 Client 的机器 |
| 任务 | Task | 一次操作（命令、文件、Pi等） |
| Pi | Pi | AI Agent 能力 |
| FRP | FRP | 内网穿透 |
| 存储 | Storage | StorageProvider（默认阿里云盘） |
| 审计 | Audit | 操作日志 |
| 会话 | Session | Pi 交互会话 |
| Runbook | Runbook | TS 即 DSL 的跨机器编排流 |
| 审批 | Approval | approve()/命令级确认/policy gate 产生的待确认请求 |
| 同步 | SyncJob | 目录级上传/下载同步实例，下面挂多个 TransferJob |

---

**文档版本**：v2.0-simplified
**最后更新**：2026-06-21
