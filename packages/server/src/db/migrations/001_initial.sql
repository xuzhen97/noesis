PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS machines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hostname TEXT,
  os TEXT NOT NULL DEFAULT 'unknown',
  arch TEXT NOT NULL DEFAULT 'unknown',
  status TEXT NOT NULL DEFAULT 'offline',
  client_version TEXT,
  disks_json TEXT,
  policy_json TEXT,
  last_seen_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_machines_status ON machines(status);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  machine_id TEXT,
  task_type TEXT NOT NULL,
  status TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'web',
  actor TEXT,
  payload_json TEXT NOT NULL,
  result_json TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  finished_at TEXT,
  FOREIGN KEY(machine_id) REFERENCES machines(id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_machine_status ON tasks(machine_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

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
  machine_id TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'import',
  root_id TEXT,
  target_dir TEXT NOT NULL,
  filename TEXT NOT NULL,
  size INTEGER NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  phase TEXT,
  uploaded_bytes INTEGER NOT NULL DEFAULT 0,
  downloaded_bytes INTEGER NOT NULL DEFAULT 0,
  written_bytes INTEGER NOT NULL DEFAULT 0,
  total_bytes INTEGER NOT NULL DEFAULT 0,
  part_count INTEGER,
  current_part INTEGER,
  aliyun_drive_id TEXT,
  aliyun_file_id TEXT,
  aliyun_upload_id TEXT,
  aliyun_parent_file_id TEXT,
  aliyun_file_name TEXT,
  error_code TEXT,
  error_message TEXT,
  source TEXT NOT NULL DEFAULT 'web',
  actor TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY(machine_id) REFERENCES machines(id)
);

CREATE INDEX IF NOT EXISTS idx_transfer_jobs_machine_status ON transfer_jobs(machine_id, status);
CREATE INDEX IF NOT EXISTS idx_transfer_jobs_created ON transfer_jobs(created_at);

CREATE TABLE IF NOT EXISTS transfer_events (
  id TEXT PRIMARY KEY,
  transfer_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  data_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(transfer_id) REFERENCES transfer_jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transfer_events_transfer_created ON transfer_events(transfer_id, created_at);