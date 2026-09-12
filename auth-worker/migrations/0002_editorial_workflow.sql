CREATE TABLE IF NOT EXISTS article_reviews (
  id TEXT PRIMARY KEY,
  article_id TEXT,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  article_json TEXT NOT NULL,
  base_sha TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  author_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewer_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  review_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_article_reviews_status_created ON article_reviews(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_article_reviews_author ON article_reviews(author_user_id, created_at DESC);
