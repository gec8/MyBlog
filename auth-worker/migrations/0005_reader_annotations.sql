CREATE TABLE IF NOT EXISTS reader_annotations (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_slug TEXT NOT NULL,
  annotations_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, article_slug)
);

CREATE INDEX IF NOT EXISTS idx_reader_annotations_user_updated
  ON reader_annotations(user_id, updated_at DESC);
