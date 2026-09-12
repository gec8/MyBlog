CREATE TABLE IF NOT EXISTS cloud_drafts (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  draft_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_cloud_drafts_user_updated ON cloud_drafts(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS content_snapshots (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('article', 'settings')),
  target_id TEXT,
  title TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_content_snapshots_kind_created ON content_snapshots(kind, created_at DESC);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferences_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS media_assets (
  path TEXT PRIMARY KEY,
  content_hash TEXT,
  name TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'audio')),
  size INTEGER NOT NULL DEFAULT 0,
  uploader_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_media_assets_hash ON media_assets(content_hash) WHERE content_hash IS NOT NULL;
