-- Noesis 数据库设计（面向个人的单用户系统）
--
-- 设计原则：
--   1. 无 users 表 / 无多账号 / 无 RBAC。Owner 凭证（单用户 owner token）存配置文件，
--      不落库；Web 登录仅用于拿 owner token（Gateway 暴露公网时防裸奔）。
--   2. 操作来源由 source 字段记录：web / cli / sdk / desktop / skill / ai-agent。
--      通用 AI Agent 经 skill + CLI 调用时 source=cli；VCP 这类 SDK 插件 source=ai-agent，actor=vcp:<agentName>。
--   3. audit_logs 的核心是"这条操作从哪里来"，而非"谁做的"。
--   4. 所有原 created_by（指向 users）字段统一改为 source + actor，去掉对 users 的外键。

PRAGMA foreign_keys = ON;

-- API Token：给 CLI / SDK / skill / 外部脚本用的可撤销凭证（owner token 不在此表，存配置）。
-- 第一版不做 scope / 机器范围限制；安全先由 Machine Policy、Approval、Audit 承担。
CREATE TABLE IF NOT EXISTS api_tokens (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'cli',  -- 创建来源
  actor TEXT,
  expires_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS idempotency_records (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  response_json TEXT NOT NULL,          -- 首次响应快照，命中时原样返回
  response_ref_type TEXT,               -- task / transfer / sync / runbook_run 等
  response_ref_id TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_idempotency_scope
  ON idempotency_records(token_hash, method, path, key_hash);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_records(expires_at);

CREATE TABLE IF NOT EXISTS machines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hostname TEXT,
  os TEXT NOT NULL,
  arch TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'offline',
  client_version TEXT,
  client_token_hash TEXT,
  capabilities_json TEXT,
  disks_json TEXT,             -- 磁盘清单 DiskInfo[]（见 03）：Client hello/heartbeat 上报，Gateway 落库。全盘可见可管，写/导入类操作前校验 freeBytes（见 04/07）。
  tags_json TEXT,
  policy_json TEXT,           -- Machine Policy 单一事实源（见 13/19）：allowedPaths/blockedPaths/allowCommand/allowPiRun/allowFrp/requireApprovalFor/maxTaskDurationSeconds + piPolicy/browserUsePolicy/computerUsePolicy 子对象。allowedPaths 只约束 file.*，不约束 Pi 工作目录。经控制通道 machine.policy.sync 下发到 Client 只读镜像执行。
  group_id TEXT,
  last_seen_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_machines_status ON machines(status);
CREATE INDEX IF NOT EXISTS idx_machines_last_seen ON machines(last_seen_at);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  machine_id TEXT,                      -- 机器任务必填；全局任务（cloud.transfer/todo.create）可空
  parent_task_id TEXT,                  -- 子任务关系（保留给批量/组合任务；RunbookRun 通过 runbook_run_id 关联）
  runbook_id TEXT,                      -- 来源 Runbook 定义（非 Runbook 触发的任务为空）
  runbook_run_id TEXT,                  -- 来源 RunbookRun（能力调用生成的子 Task）
  task_type TEXT NOT NULL,
  status TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'web',   -- web / cli / skill / ai-agent
  actor TEXT,                           -- 来源子标识（cli 下 skill 名 / agent 名；web 留空）
  payload_json TEXT NOT NULL,
  result_json TEXT,
  risk_level TEXT DEFAULT 'low',
  approval_status TEXT DEFAULT 'not_required',  -- not_required / waiting_confirm / approved / rejected / timeout（确认机制：独立字段，status 保持 running 不重载；UI 文案用"待确认"，见 09/17）
  priority INTEGER NOT NULL DEFAULT 0,
  timeout_seconds INTEGER,
  created_at TEXT NOT NULL,
  queued_at TEXT,
  dispatched_at TEXT,
  started_at TEXT,
  finished_at TEXT,
  error_code TEXT,
  error_message TEXT,
  FOREIGN KEY(machine_id) REFERENCES machines(id),
  FOREIGN KEY(parent_task_id) REFERENCES tasks(id),
  FOREIGN KEY(runbook_id) REFERENCES runbooks(id),
  FOREIGN KEY(runbook_run_id) REFERENCES runbook_runs(id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_machine_status ON tasks(machine_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_runbook ON tasks(runbook_id);
CREATE INDEX IF NOT EXISTS idx_tasks_runbook_run ON tasks(runbook_run_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(task_type);

CREATE TABLE IF NOT EXISTS task_events (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  machine_id TEXT,
  event_type TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'info',
  data_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_events_task_created ON task_events(task_id, created_at);

-- 自动化资产：Browser Use / Computer Use 共用（见 19）
CREATE TABLE IF NOT EXISTS automation_macros (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,                         -- browser / computer
  name TEXT NOT NULL,
  description TEXT,
  scope_json TEXT NOT NULL DEFAULT '{}',       -- os/app/site/machineTags/profile 等适用范围
  latest_version_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',       -- active / disabled / archived
  stats_json TEXT,                             -- 成功率、最近失败、最近运行时间
  source TEXT NOT NULL DEFAULT 'web',
  actor TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(latest_version_id) REFERENCES automation_macro_versions(id)
);

CREATE INDEX IF NOT EXISTS idx_automation_macros_kind_status ON automation_macros(kind, status);
CREATE INDEX IF NOT EXISTS idx_automation_macros_updated ON automation_macros(updated_at);

CREATE TABLE IF NOT EXISTS automation_macro_versions (
  id TEXT PRIMARY KEY,
  macro_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  dsl_json TEXT NOT NULL,                      -- 受限 JSON DSL，不存任意 JS/TS
  dsl_sha256 TEXT NOT NULL,
  changelog TEXT,
  created_from_task_id TEXT,
  source TEXT NOT NULL DEFAULT 'web',
  actor TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(macro_id) REFERENCES automation_macros(id) ON DELETE CASCADE,
  FOREIGN KEY(created_from_task_id) REFERENCES tasks(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_macro_versions_macro_version ON automation_macro_versions(macro_id, version);
CREATE INDEX IF NOT EXISTS idx_automation_macro_versions_macro ON automation_macro_versions(macro_id);

CREATE TABLE IF NOT EXISTS automation_macro_candidates (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,                         -- browser / computer
  name TEXT NOT NULL,
  scope_json TEXT NOT NULL DEFAULT '{}',
  dsl_json TEXT NOT NULL,
  evidence_task_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',      -- pending / approved / rejected
  review_json TEXT,                            -- 总结、失败修复、建议
  approved_macro_id TEXT,
  approved_version_id TEXT,
  source TEXT NOT NULL DEFAULT 'system',
  actor TEXT,
  created_at TEXT NOT NULL,
  decided_at TEXT,
  FOREIGN KEY(evidence_task_id) REFERENCES tasks(id),
  FOREIGN KEY(approved_macro_id) REFERENCES automation_macros(id),
  FOREIGN KEY(approved_version_id) REFERENCES automation_macro_versions(id)
);

CREATE INDEX IF NOT EXISTS idx_automation_macro_candidates_status ON automation_macro_candidates(status, created_at);
CREATE INDEX IF NOT EXISTS idx_automation_macro_candidates_kind ON automation_macro_candidates(kind);

CREATE TABLE IF NOT EXISTS automation_run_reports (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL UNIQUE,
  machine_id TEXT,
  kind TEXT NOT NULL,                         -- browser / computer / mixed
  outcome TEXT NOT NULL,                      -- success / failed / needs_review / canceled / timeout
  confidence REAL,
  summary TEXT NOT NULL,
  report_json TEXT NOT NULL,                  -- steps/artifacts/evidence/fallbacks/manualInterventions/vlmUsage
  bundle_storage_file_id TEXT,                -- 用户手动保存的完整证据包
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY(machine_id) REFERENCES machines(id),
  FOREIGN KEY(bundle_storage_file_id) REFERENCES storage_files(id)
);

CREATE INDEX IF NOT EXISTS idx_automation_run_reports_machine ON automation_run_reports(machine_id, created_at);
CREATE INDEX IF NOT EXISTS idx_automation_run_reports_kind ON automation_run_reports(kind, created_at);

-- WebRTC / TURN 配置（媒体不经 Gateway，中继需用户显式配置）
CREATE TABLE IF NOT EXISTS webrtc_turn_profiles (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,                         -- managed / self_hosted
  name TEXT NOT NULL,
  urls_json TEXT NOT NULL,
  username TEXT,
  credential_enc TEXT,
  credential_mode TEXT NOT NULL DEFAULT 'static', -- static / ephemeral
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webrtc_turn_profiles_enabled ON webrtc_turn_profiles(enabled);

-- 审计日志：核心是来源追溯（source + actor），不是"谁做的"
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'web',   -- web / cli / skill / ai-agent
  actor TEXT,                           -- 来源子标识（cli 下 skill 名 / agent 名；web 留空）
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  machine_id TEXT,                      -- 关联机器（可空，全局操作无）
  task_id TEXT,                          -- 关联任务（可空，非任务操作无）
  risk_level TEXT NOT NULL DEFAULT 'low',
  detail_json TEXT,                     -- payload 摘要，敏感字段脱敏
  result TEXT,
  request_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_source ON audit_logs(source);
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk ON audit_logs(risk_level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_machine ON audit_logs(machine_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_task ON audit_logs(task_id);

CREATE TABLE IF NOT EXISTS releases (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  component TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'stable',
  status TEXT NOT NULL DEFAULT 'draft',
  manifest_json TEXT NOT NULL,
  release_note TEXT,
  source TEXT NOT NULL DEFAULT 'web',   -- 发布来源
  created_at TEXT NOT NULL,
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS release_artifacts (
  id TEXT PRIMARY KEY,
  release_id TEXT NOT NULL,
  component TEXT NOT NULL,
  os TEXT,
  arch TEXT,
  file_name TEXT NOT NULL,
  size INTEGER,
  sha256 TEXT NOT NULL,
  storage_provider TEXT NOT NULL,
  storage_file_id TEXT,
  download_url TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(release_id) REFERENCES releases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS install_tokens (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  os TEXT,
  tags_json TEXT,
  group_id TEXT,
  enable_pi_agent INTEGER NOT NULL DEFAULT 0,
  computer_use_install_mode TEXT NOT NULL DEFAULT '0', -- 0 / install-only；启用必须由 computer.enable 自检通过后显式写入 Machine Policy
  initial_policy_json TEXT,    -- 首装初始 Machine Policy，Client 注册时 Gateway 落库为 machines.policy_json（见 13/19）
  max_uses INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  source TEXT NOT NULL DEFAULT 'web',   -- 创建来源
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS storage_files (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  file_id TEXT,
  file_name TEXT NOT NULL,
  size INTEGER,
  sha256 TEXT,
  url TEXT,
  expire_at TEXT,
  meta_json TEXT,
  created_at TEXT NOT NULL
);

-- 阿里云盘配置与授权 token（见 13）
CREATE TABLE IF NOT EXISTS aliyundrive_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  client_id TEXT NOT NULL,
  client_secret_enc TEXT,
  scope TEXT NOT NULL,
  openapi_base TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  transfer_folder TEXT NOT NULL,
  cleanup_ttl_ms INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS aliyundrive_auth (
  id TEXT PRIMARY KEY DEFAULT 'default',
  access_token_enc TEXT NOT NULL,
  refresh_token_enc TEXT,
  token_type TEXT,
  expires_at TEXT NOT NULL,
  drive_id TEXT,
  authorized_account_name TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transfer_jobs (
  id TEXT PRIMARY KEY,
  sync_job_id TEXT,
  machine_id TEXT NOT NULL,
  root_id TEXT,
  target_dir TEXT NOT NULL,
  filename TEXT NOT NULL,
  size INTEGER NOT NULL,
  mode TEXT NOT NULL,                   -- aliyundrive / frps_chunked
  status TEXT NOT NULL,
  cleanup_status TEXT NOT NULL DEFAULT 'none',
  uploaded_bytes INTEGER NOT NULL DEFAULT 0,
  downloaded_bytes INTEGER NOT NULL DEFAULT 0,
  written_bytes INTEGER NOT NULL DEFAULT 0,
  total_bytes INTEGER NOT NULL DEFAULT 0,
  storage_file_id TEXT,
  error_code TEXT,
  error_message TEXT,
  source TEXT NOT NULL DEFAULT 'web',
  actor TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  cleanup_after_at TEXT,
  FOREIGN KEY(machine_id) REFERENCES machines(id),
  FOREIGN KEY(sync_job_id) REFERENCES sync_jobs(id)
);

CREATE INDEX IF NOT EXISTS idx_transfer_jobs_machine_status ON transfer_jobs(machine_id, status);
CREATE INDEX IF NOT EXISTS idx_transfer_jobs_sync ON transfer_jobs(sync_job_id);
CREATE INDEX IF NOT EXISTS idx_transfer_jobs_created ON transfer_jobs(created_at);

CREATE TABLE IF NOT EXISTS sync_jobs (
  id TEXT PRIMARY KEY,
  machine_id TEXT NOT NULL,
  direction TEXT NOT NULL,              -- upload / download
  local_root TEXT,                      -- SDK 本地路径，仅用于展示/恢复提示
  remote_root TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'missing-or-changed',
  compare TEXT NOT NULL DEFAULT 'size-mtime', -- size-mtime / sha256
  delete_extra INTEGER NOT NULL DEFAULT 0,
  conflict TEXT NOT NULL DEFAULT 'skip', -- skip / overwrite / fail
  status TEXT NOT NULL,                 -- created/planning/syncing/paused/completed/failed/cancelled
  manifest_json TEXT,                   -- 文件计划、冲突、失败列表、远端 manifest 摘要
  total_files INTEGER NOT NULL DEFAULT 0,
  completed_files INTEGER NOT NULL DEFAULT 0,
  skipped_files INTEGER NOT NULL DEFAULT 0,
  failed_files INTEGER NOT NULL DEFAULT 0,
  total_bytes INTEGER NOT NULL DEFAULT 0,
  completed_bytes INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  error_message TEXT,
  source TEXT NOT NULL DEFAULT 'sdk',
  actor TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  finished_at TEXT,
  FOREIGN KEY(machine_id) REFERENCES machines(id)
);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_machine_status ON sync_jobs(machine_id, status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_created ON sync_jobs(created_at);

CREATE TABLE IF NOT EXISTS sync_events (
  id TEXT PRIMARY KEY,
  sync_job_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  data_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(sync_job_id) REFERENCES sync_jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sync_events_sync_created ON sync_events(sync_job_id, created_at);

CREATE TABLE IF NOT EXISTS transfer_events (
  id TEXT PRIMARY KEY,
  transfer_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  data_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(transfer_id) REFERENCES transfer_jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transfer_events_transfer_created ON transfer_events(transfer_id, created_at);

CREATE TABLE IF NOT EXISTS pi_sessions (
  id TEXT PRIMARY KEY,
  -- 批处理会话 task_id 必填；交互式 pi.terminal 会话 task_id 为 NULL
  task_id TEXT,
  machine_id TEXT NOT NULL,
  project_path TEXT NOT NULL,
  status TEXT NOT NULL,
  render TEXT,
  goal TEXT,
  prompt TEXT,
  pi_session_file TEXT,
  owner_token TEXT,
  last_attach_at TEXT,
  summary_json TEXT,
  changed_files_json TEXT,
  commands_json TEXT,
  session_stats_json TEXT,
  archived_url TEXT,
  exit_code INTEGER,
  close_reason TEXT,
  created_at TEXT NOT NULL,
  finished_at TEXT,
  FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY(machine_id) REFERENCES machines(id)
);

CREATE INDEX IF NOT EXISTS idx_pi_sessions_machine_status ON pi_sessions(machine_id, status);
CREATE INDEX IF NOT EXISTS idx_pi_sessions_task ON pi_sessions(task_id);

-- 集中式 Pi Provider Profile（取代旧 pi_provider_keys，扩展为完整 Provider 配置）
-- 含：自定义 URL / 消息类型 / API Key / 模型清单 / 兼容性配置
CREATE TABLE IF NOT EXISTS pi_provider_profiles (
  id               TEXT PRIMARY KEY,
  scope            TEXT NOT NULL DEFAULT 'global',  -- 'global' | 'machine'
  machine_id       TEXT,                            -- NULL=全局, 否则机器级覆盖
  name             TEXT NOT NULL,                   -- 显示名称
  provider_key     TEXT NOT NULL,                   -- models.json 的 providers key（如 'anthropic'/'my-custom'）
  base_url         TEXT,                            -- 自定义 URL（可空，用内置默认）
  api_type         TEXT NOT NULL DEFAULT 'openai-completions',
                                                   -- openai-completions|openai-responses|anthropic-messages|google-generative-ai
  api_key_enc      TEXT,                            -- 加密 Key（Base64, AES-GCM）
  api_key_env_ref  TEXT,                            -- 引用环境变量名（如 '$ANTHROPIC_API_KEY'），Key 不落库
  models_json      TEXT NOT NULL DEFAULT '[]',      -- 模型清单数组
  headers_json     TEXT,                            -- 自定义 headers
  compat_json      TEXT,                            -- OpenAI/Anthropic 兼容性配置
  is_default       INTEGER DEFAULT 0,               -- 是否该 scope 下默认
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pi_provider_profiles_scope ON pi_provider_profiles(scope, machine_id);

CREATE TABLE IF NOT EXISTS frp_mappings (
  id TEXT PRIMARY KEY,
  machine_id TEXT NOT NULL,
  task_id TEXT,
  protocol TEXT NOT NULL,
  local_host TEXT NOT NULL,
  local_port INTEGER NOT NULL,
  remote_host TEXT,
  remote_port INTEGER,
  public_url TEXT,
  status TEXT NOT NULL,
  expire_at TEXT,
  source TEXT NOT NULL DEFAULT 'web',   -- 创建来源
  actor TEXT,                           -- 来源子标识
  created_at TEXT NOT NULL,
  closed_at TEXT,
  FOREIGN KEY(machine_id) REFERENCES machines(id),
  FOREIGN KEY(task_id) REFERENCES tasks(id)
);

CREATE TABLE IF NOT EXISTS scripts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  os TEXT,
  shell TEXT,
  content TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  tags_json TEXT,
  source TEXT NOT NULL DEFAULT 'web',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runbooks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  latest_version_id TEXT,
  dangerous_override INTEGER NOT NULL DEFAULT 0,  -- 是否绕过单机 Pi 策略约束
  last_exec_status TEXT,                -- 上次执行状态：succeeded/failed/timeout/canceled
  last_exec_at TEXT,
  last_exec_dur TEXT,                   -- 执行耗时
  last_exec_done_calls INTEGER,         -- 上次执行已完成能力调用数
  last_exec_total_calls INTEGER,        -- 上次执行总能力调用数
  tags_json TEXT,
  source TEXT NOT NULL DEFAULT 'web',
  actor TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(latest_version_id) REFERENCES runbook_versions(id)
);

CREATE INDEX IF NOT EXISTS idx_runbooks_updated ON runbooks(updated_at);

CREATE TABLE IF NOT EXISTS runbook_versions (
  id TEXT PRIMARY KEY,
  runbook_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  code TEXT NOT NULL,                   -- TS 编排脚本原文（TS 即 DSL，见 17）
  params_schema_json TEXT NOT NULL DEFAULT '{}', -- JSON Schema 子集
  code_sha256 TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'web',
  actor TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(runbook_id) REFERENCES runbooks(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_runbook_versions_runbook_version ON runbook_versions(runbook_id, version);
CREATE INDEX IF NOT EXISTS idx_runbook_versions_runbook ON runbook_versions(runbook_id);

CREATE TABLE IF NOT EXISTS runbook_runs (
  id TEXT PRIMARY KEY,
  runbook_id TEXT NOT NULL,
  runbook_version_id TEXT NOT NULL,
  params_json TEXT NOT NULL,
  status TEXT NOT NULL,                 -- created/running/waiting_approval/succeeded/failed/canceling/canceled/timeout
  snapshot_json TEXT,                   -- durable execution 快照 / 重放缓存
  trace_json TEXT,
  source TEXT NOT NULL DEFAULT 'web',
  actor TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  finished_at TEXT,
  error_code TEXT,
  error_message TEXT,
  FOREIGN KEY(runbook_id) REFERENCES runbooks(id),
  FOREIGN KEY(runbook_version_id) REFERENCES runbook_versions(id)
);

CREATE INDEX IF NOT EXISTS idx_runbook_runs_runbook_status ON runbook_runs(runbook_id, status);
CREATE INDEX IF NOT EXISTS idx_runbook_runs_created ON runbook_runs(created_at);

CREATE TABLE IF NOT EXISTS runbook_events (
  id TEXT PRIMARY KEY,
  runbook_run_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  data_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(runbook_run_id) REFERENCES runbook_runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_runbook_events_run_created ON runbook_events(runbook_run_id, created_at);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,                 -- runbook_gate / command_option / policy_gate
  status TEXT NOT NULL,                 -- waiting / approved / rejected / timeout
  runbook_run_id TEXT,
  task_id TEXT,
  machine_id TEXT,
  message TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  context_json TEXT,
  decision TEXT,
  decided_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(runbook_run_id) REFERENCES runbook_runs(id),
  FOREIGN KEY(task_id) REFERENCES tasks(id),
  FOREIGN KEY(machine_id) REFERENCES machines(id)
);

CREATE INDEX IF NOT EXISTS idx_approvals_status_created ON approvals(status, created_at);
CREATE INDEX IF NOT EXISTS idx_approvals_run ON approvals(runbook_run_id);
CREATE INDEX IF NOT EXISTS idx_approvals_task ON approvals(task_id);

-- Todo / Tag / Context：独立资源域，详见 20-todo-vcp-collaboration.md。
-- 旧 todo_items 占位表废弃，使用以下新表。
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'web',
  actor TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contexts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  machine_ids_json TEXT NOT NULL DEFAULT '[]',
  markdown TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'web',
  actor TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  parent_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  due TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  context_id TEXT,
  ready INTEGER,
  status TEXT NOT NULL DEFAULT 'todo',
  assignee TEXT,
  result_summary TEXT,
  source TEXT NOT NULL DEFAULT 'web',
  actor TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(parent_id) REFERENCES todos(id),
  FOREIGN KEY(context_id) REFERENCES contexts(id)
);

CREATE TABLE IF NOT EXISTS todo_tags (
  todo_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY(todo_id, tag_id),
  FOREIGN KEY(todo_id) REFERENCES todos(id) ON DELETE CASCADE,
  FOREIGN KEY(tag_id) REFERENCES tags(id)
);

CREATE TABLE IF NOT EXISTS todo_task_links (
  todo_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  link_type TEXT NOT NULL DEFAULT 'executed',
  created_at TEXT NOT NULL,
  PRIMARY KEY(todo_id, task_id, link_type),
  FOREIGN KEY(todo_id) REFERENCES todos(id) ON DELETE CASCADE,
  FOREIGN KEY(task_id) REFERENCES tasks(id)
);

CREATE INDEX IF NOT EXISTS idx_tags_archived ON tags(archived_at);
CREATE INDEX IF NOT EXISTS idx_contexts_archived ON contexts(archived_at);
CREATE INDEX IF NOT EXISTS idx_todos_parent ON todos(parent_id);
CREATE INDEX IF NOT EXISTS idx_todos_status_ready ON todos(status, ready);
CREATE INDEX IF NOT EXISTS idx_todos_assignee_status ON todos(assignee, status);
CREATE INDEX IF NOT EXISTS idx_todos_context ON todos(context_id);
CREATE INDEX IF NOT EXISTS idx_todos_priority_due_created ON todos(priority, due, created_at);
CREATE INDEX IF NOT EXISTS idx_todos_archived ON todos(archived_at);
CREATE INDEX IF NOT EXISTS idx_todo_tags_tag ON todo_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_todo_task_links_task ON todo_task_links(task_id);
