const token = process.env.NEKOPRESS_GITHUB_TOKEN;
if (!token) throw new Error('Missing NEKOPRESS_GITHUB_TOKEN');
const base = 'https://api.github.com/repos/gec8/MyBlog/contents/';
const headers = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'NekoPress-Migration',
};
const indexResponse = await fetch(`${base}data/posts.json?ref=main`, { headers });
if (!indexResponse.ok) throw new Error(`Cannot read posts index: ${indexResponse.status}`);
const indexFile = await indexResponse.json();
const posts = JSON.parse(Buffer.from(indexFile.content, 'base64').toString('utf8'));
let migrated = 0;
for (const post of posts) {
  const path = `data/posts/${encodeURIComponent(post.slug)}.json`;
  const existing = await fetch(`${base}${path}?ref=main`, { headers });
  if (existing.ok) continue;
  const response = await fetch(`${base}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: `migrate: ${post.title}`,
      content: Buffer.from(`${JSON.stringify(post, null, 2)}\n`).toString('base64'),
      branch: 'main',
    }),
  });
  if (!response.ok) throw new Error(`Cannot migrate ${post.slug}: ${response.status}`);
  migrated += 1;
}
console.log(`Migrated ${migrated} article file(s); ${posts.length} total.`);
