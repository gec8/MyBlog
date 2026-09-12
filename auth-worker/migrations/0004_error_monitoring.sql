CREATE TABLE IF NOT EXISTS error_events (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('frontend', 'api', 'github', 'deployment')),
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'error', 'fatal')),
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  detail TEXT,
  route TEXT,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  resolved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_error_events_open_created
ON error_events(resolved, created_at DESC);
PRAGMA optimize;
