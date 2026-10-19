CREATE TABLE IF NOT EXISTS site_secrets (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL
);

INSERT OR IGNORE INTO site_secrets (key, value, updated_at, updated_by)
SELECT
  'pexels_api_key',
  json_extract(preferences_json, '$.pexelsKey'),
  updated_at,
  user_id
FROM user_preferences
WHERE length(json_extract(preferences_json, '$.pexelsKey')) > 0
ORDER BY updated_at DESC
LIMIT 1;

UPDATE user_preferences
SET preferences_json = json_remove(
  preferences_json,
  '$.pexelsKey',
  '$.pexelsKeyUpdatedAt'
)
WHERE json_extract(preferences_json, '$.pexelsKey') IS NOT NULL
   OR json_extract(preferences_json, '$.pexelsKeyUpdatedAt') IS NOT NULL;
