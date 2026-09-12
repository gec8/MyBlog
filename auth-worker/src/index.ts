interface Env {
  DB: D1Database;
  ALLOWED_ORIGIN: string;
  BOOTSTRAP_SECRET: string;
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
}

type Role = 'owner' | 'editor' | 'author';
type UserRow = {
  id: string;
  username: string;
  display_name: string;
  role: Role;
  enabled: number;
  must_change_password: number;
  failed_attempts: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  password_hash: string;
  password_salt: string;
  password_iterations: number;
};

const encoder = new TextEncoder();
// Keep password derivation within the Workers CPU budget. Rate limiting and
// high-entropy passwords provide the additional online-attack protection.
const iterations = 100_000;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') ?? '';
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN);
    if (request.method === 'OPTIONS')
      return new Response(null, { status: 204, headers: cors });
    try {
      const url = new URL(request.url);
      if (url.pathname === '/api/health')
        return json({ ok: true, service: 'NekoPress Auth' }, 200, cors);
      if (url.pathname === '/api/errors' && request.method === 'POST')
        return collectClientError(request, env, origin, cors);
      if (url.pathname === '/api/setup/status' && request.method === 'GET') {
        const row = await env.DB.prepare(
          'SELECT COUNT(*) AS count FROM users',
        ).first<{ count: number }>();
        return json({ needsSetup: Number(row?.count ?? 0) === 0 }, 200, cors);
      }
      if (url.pathname === '/api/setup' && request.method === 'POST')
        return setup(request, env, cors);
      if (url.pathname === '/api/auth/login' && request.method === 'POST')
        return login(request, env, cors);
      const auth = await authenticate(request, env);
      if (!auth) return json({ error: '登录已失效，请重新登录。' }, 401, cors);
      if (url.pathname === '/api/auth/me' && request.method === 'GET')
        return json({ user: publicUser(auth.user) }, 200, cors);
      if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
        await env.DB.prepare('DELETE FROM sessions WHERE id = ?')
          .bind(auth.sessionId)
          .run();
        return json({ ok: true }, 200, cors);
      }
      if (url.pathname === '/api/auth/password' && request.method === 'PATCH')
        return changePassword(request, env, auth.user, cors);
      if (url.pathname === '/api/content/articles' && request.method === 'GET')
        return listArticles(env, cors);
      if (url.pathname === '/api/content/articles' && request.method === 'POST')
        return submitArticle(request, env, auth.user, cors);
      const articleMatch = url.pathname.match(/^\/api\/content\/articles\/([^/]+)$/);
      if (articleMatch && request.method === 'DELETE') {
        requireEditor(auth.user);
        return removeArticle(request, env, auth.user, decodeURIComponent(articleMatch[1]), cors);
      }
      if (url.pathname === '/api/content/reviews' && request.method === 'GET')
        return listReviews(env, auth.user, cors);
      const reviewMatch = url.pathname.match(/^\/api\/content\/reviews\/([^/]+)$/);
      if (reviewMatch && request.method === 'PATCH') {
        requireEditor(auth.user);
        return reviewArticle(request, env, auth.user, decodeURIComponent(reviewMatch[1]), cors);
      }
      if (url.pathname === '/api/content/settings' && request.method === 'PUT') {
        requireOwner(auth.user);
        return saveSiteSettings(request, env, auth.user, cors);
      }
      if (url.pathname === '/api/content/files' && request.method === 'GET')
        return listRepositoryFiles(url, env, cors);
      if (url.pathname === '/api/content/files' && request.method === 'POST')
        return saveRepositoryFile(request, env, auth.user, cors);
      if (url.pathname === '/api/content/files' && request.method === 'DELETE') {
        requireEditor(auth.user);
        return deleteRepositoryFile(request, env, auth.user, cors);
      }
      if (url.pathname === '/api/drafts' && request.method === 'GET')
        return listDrafts(env, auth.user, cors);
      if (url.pathname === '/api/drafts' && request.method === 'PUT')
        return saveDraft(request, env, auth.user, cors);
      const draftMatch = url.pathname.match(/^\/api\/drafts\/([^/]+)$/);
      if (draftMatch && request.method === 'DELETE')
        return removeDraft(request, env, auth.user, decodeURIComponent(draftMatch[1]), cors);
      if (url.pathname === '/api/preferences' && request.method === 'GET')
        return getPreferences(env, auth.user, cors);
      if (url.pathname === '/api/preferences' && request.method === 'PUT')
        return savePreferences(request, env, auth.user, cors);
      if (url.pathname === '/api/snapshots' && request.method === 'GET')
        return listSnapshots(env, auth.user, cors);
      const snapshotMatch = url.pathname.match(/^\/api\/snapshots\/([^/]+)\/restore$/);
      if (snapshotMatch && request.method === 'POST') {
        requireEditor(auth.user);
        return restoreSnapshot(request, env, auth.user, decodeURIComponent(snapshotMatch[1]), cors);
      }
      if (url.pathname === '/api/users' && request.method === 'GET') {
        requireOwner(auth.user);
        const result = await env.DB.prepare(
          'SELECT id, username, display_name, role, enabled, must_change_password, created_at, updated_at, last_login_at FROM users ORDER BY created_at',
        ).all();
        return json(
          {
            users: result.results.map((row) => ({
              id: row.id,
              username: row.username,
              displayName: row.display_name,
              role: row.role,
              enabled: Boolean(row.enabled),
              mustChangePassword: Boolean(row.must_change_password),
              createdAt: row.created_at,
              lastLoginAt: row.last_login_at,
            })),
          },
          200,
          cors,
        );
      }
      if (url.pathname === '/api/users' && request.method === 'POST') {
        requireOwner(auth.user);
        return createUser(request, env, auth.user, cors);
      }
      const userMatch = url.pathname.match(/^\/api\/users\/([^/]+)$/);
      if (userMatch && request.method === 'PATCH') {
        requireOwner(auth.user);
        return updateUser(
          request,
          env,
          auth.user,
          decodeURIComponent(userMatch[1]),
          cors,
        );
      }
      if (userMatch && request.method === 'DELETE') {
        requireOwner(auth.user);
        return deleteUser(request, env, auth.user, decodeURIComponent(userMatch[1]), cors);
      }
      if (url.pathname === '/api/audit' && request.method === 'GET') {
        requireOwner(auth.user);
        const result = await env.DB.prepare(
          'SELECT a.*, u.display_name AS actor_name FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id ORDER BY a.created_at DESC LIMIT 100',
        ).all();
        return json({ logs: result.results }, 200, cors);
      }
      if (url.pathname === '/api/errors' && request.method === 'GET') {
        requireOwner(auth.user);
        return listErrors(url, env, cors);
      }
      const errorMatch = url.pathname.match(/^\/api\/errors\/([^/]+)$/);
      if (errorMatch && request.method === 'PATCH') {
        requireOwner(auth.user);
        await env.DB.prepare('UPDATE error_events SET resolved = 1 WHERE id = ?').bind(decodeURIComponent(errorMatch[1])).run();
        return json({ ok: true }, 200, cors);
      }
      return json({ error: '接口不存在。' }, 404, cors);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      if (status >= 500) {
        const message = error instanceof Error ? error.message : '服务暂时不可用。';
        await recordError(env, {
          source: /GitHub|线上文件|发布/.test(message) ? 'github' : 'api',
          severity: status >= 500 ? 'error' : 'warning',
          category: error instanceof HttpError ? `http_${status}` : 'unhandled',
          message,
          detail: error instanceof Error ? error.stack : '',
          route: new URL(request.url).pathname,
        }).catch(() => { /* do not mask the original error */ });
      }
      return json(
        { error: error instanceof Error ? error.message : '服务暂时不可用。' },
        status,
        cors,
      );
    }
  },
};

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function requireOwner(user: UserRow) {
  if (user.role !== 'owner')
    throw new HttpError(403, '只有超级管理员可以管理用户。');
}
function requireEditor(user: UserRow) {
  if (user.role === 'author')
    throw new HttpError(403, '只有编辑或超级管理员可以执行此操作。');
}
function corsHeaders(origin: string, allowed: string) {
  const valid = origin === allowed || origin === 'http://localhost:3000';
  return {
    'Access-Control-Allow-Origin': valid ? origin : allowed,
    'Access-Control-Allow-Headers':
      'Authorization, Content-Type, X-Setup-Secret',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
function json(value: unknown, status: number, cors: Record<string, string>) {
  return Response.json(value, {
    status,
    headers: {
      ...cors,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
function now() {
  return new Date().toISOString();
}
function id() {
  return crypto.randomUUID();
}
function bytesToBase64(bytes: Uint8Array) {
  let value = '';
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}
async function digest(value: string) {
  return bytesToBase64(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', encoder.encode(value)),
    ),
  );
}
async function passwordHash(
  password: string,
  salt = bytesToBase64(crypto.getRandomValues(new Uint8Array(16))),
  rounds = iterations,
) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: encoder.encode(salt),
      iterations: rounds,
    },
    key,
    256,
  );
  return { hash: bytesToBase64(new Uint8Array(bits)), salt, rounds };
}
function validPassword(value: string) {
  return value.length >= 6 && /[A-Za-z]/.test(value) && /\d/.test(value);
}
function publicUser(user: UserRow) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    role: user.role,
    enabled: Boolean(user.enabled),
    mustChangePassword: Boolean(user.must_change_password),
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at,
  };
}
async function body(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    throw new HttpError(400, '请求内容格式不正确。');
  }
}
async function audit(
  env: Env,
  actor: string | null,
  action: string,
  targetType: string | null,
  targetId: string | null,
  request: Request,
  detail = '',
) {
  await env.DB.prepare(
    'INSERT INTO audit_logs (id, actor_user_id, action, target_type, target_id, detail, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(
      id(),
      actor,
      action,
      targetType,
      targetId,
      detail,
      request.headers.get('CF-Connecting-IP'),
      now(),
    )
    .run();
}

async function setup(request: Request, env: Env, cors: Record<string, string>) {
  if (request.headers.get('X-Setup-Secret') !== env.BOOTSTRAP_SECRET)
    throw new HttpError(403, '初始化凭证无效。');
  const count = await env.DB.prepare(
    'SELECT COUNT(*) AS count FROM users',
  ).first<{ count: number }>();
  if (Number(count?.count ?? 0) > 0)
    throw new HttpError(409, '系统已经初始化。');
  const data = await body(request);
  const username = String(data.username ?? '').trim();
  const password = String(data.password ?? '');
  const displayName = String(data.displayName ?? username).trim();
  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username))
    throw new HttpError(400, '账号需为 3–32 位字母、数字或 ._-。');
  if (!validPassword(password))
    throw new HttpError(400, '密码至少 6 位，并同时包含字母和数字。');
  const secured = await passwordHash(password);
  const userId = id();
  const timestamp = now();
  await env.DB.prepare(
    'INSERT INTO users (id, username, display_name, role, password_hash, password_salt, password_iterations, must_change_password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)',
  )
    .bind(
      userId,
      username,
      displayName,
      'owner',
      secured.hash,
      secured.salt,
      secured.rounds,
      timestamp,
      timestamp,
    )
    .run();
  await audit(env, userId, 'system.setup', 'user', userId, request);
  return json({ ok: true }, 201, cors);
}

async function login(request: Request, env: Env, cors: Record<string, string>) {
  const data = await body(request);
  const username = String(data.username ?? '').trim();
  const password = String(data.password ?? '');
  const user = await env.DB.prepare(
    'SELECT * FROM users WHERE username = ? COLLATE NOCASE',
  )
    .bind(username)
    .first<UserRow>();
  if (!user) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    throw new HttpError(401, '账号或密码错误。');
  }
  if (!user.enabled) throw new HttpError(403, '账号已停用，请联系管理员。');
  if (user.locked_until && new Date(user.locked_until) > new Date())
    throw new HttpError(429, '登录失败次数过多，请稍后再试。');
  const secured = await passwordHash(
    password,
    user.password_salt,
    user.password_iterations,
  );
  if (secured.hash !== user.password_hash) {
    const attempts = user.failed_attempts + 1;
    const lockedUntil =
      attempts >= 5 ? new Date(Date.now() + 15 * 60_000).toISOString() : null;
    await env.DB.prepare(
      'UPDATE users SET failed_attempts = ?, locked_until = ?, updated_at = ? WHERE id = ?',
    )
      .bind(attempts >= 5 ? 0 : attempts, lockedUntil, now(), user.id)
      .run();
    await audit(env, user.id, 'auth.login_failed', 'user', user.id, request);
    throw new HttpError(
      401,
      attempts >= 5 ? '失败次数过多，账号已锁定 15 分钟。' : '账号或密码错误。',
    );
  }
  const token = bytesToBase64(
    crypto.getRandomValues(new Uint8Array(32)),
  ).replace(/[+/=]/g, '');
  const sessionId = id();
  const timestamp = now();
  const expires = new Date(Date.now() + 7 * 86400_000).toISOString();
  await env.DB.batch([
    env.DB.prepare(
      'UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login_at = ?, updated_at = ? WHERE id = ?',
    ).bind(timestamp, timestamp, user.id),
    env.DB.prepare(
      'INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(
      sessionId,
      user.id,
      await digest(token),
      timestamp,
      expires,
      timestamp,
    ),
  ]);
  await audit(env, user.id, 'auth.login', 'user', user.id, request);
  return json(
    {
      token,
      expiresAt: expires,
      user: publicUser({
        ...user,
        failed_attempts: 0,
        locked_until: null,
        last_login_at: timestamp,
      }),
    },
    200,
    cors,
  );
}

async function authenticate(request: Request, env: Env) {
  const token = request.headers
    .get('Authorization')
    ?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const row = await env.DB.prepare(
    'SELECT u.*, s.id AS session_id FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.enabled = 1',
  )
    .bind(await digest(token), now())
    .first<UserRow & { session_id: string }>();
  if (!row) return null;
  await env.DB.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?')
    .bind(now(), row.session_id)
    .run();
  return { user: row, sessionId: row.session_id };
}

async function changePassword(
  request: Request,
  env: Env,
  user: UserRow,
  cors: Record<string, string>,
) {
  const data = await body(request);
  const currentPassword = String(data.currentPassword ?? '');
  const newPassword = String(data.newPassword ?? '');
  const current = await passwordHash(
    currentPassword,
    user.password_salt,
    user.password_iterations,
  );
  if (current.hash !== user.password_hash)
    throw new HttpError(400, '当前密码不正确。');
  if (!validPassword(newPassword))
    throw new HttpError(400, '新密码至少 6 位，并同时包含字母和数字。');
  const secured = await passwordHash(newPassword);
  await env.DB.batch([
    env.DB.prepare(
      'UPDATE users SET password_hash = ?, password_salt = ?, password_iterations = ?, must_change_password = 0, updated_at = ? WHERE id = ?',
    ).bind(secured.hash, secured.salt, secured.rounds, now(), user.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
  ]);
  await audit(env, user.id, 'auth.password_changed', 'user', user.id, request);
  return json({ ok: true, relogin: true }, 200, cors);
}

type GitHubFile<T> = { data: T; sha: string };

function githubHeaders(env: Env) {
  if (!env.GITHUB_TOKEN) throw new HttpError(503, '发布服务尚未配置 GitHub 凭证。');
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'NekoPress-Publisher',
  };
}
function githubContentUrl(env: Env, path: string) {
  return `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;
}
function encodeGithub(value: string) {
  return bytesToBase64(encoder.encode(value));
}
function decodeGithub(value: string) {
  const raw = atob(value.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(raw, (char) => char.charCodeAt(0)));
}
async function readGithubJson<T>(env: Env, path: string): Promise<GitHubFile<T>> {
  const response = await fetch(`${githubContentUrl(env, path)}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`, { headers: githubHeaders(env) });
  if (!response.ok) throw new HttpError(response.status === 404 ? 404 : 502, `无法读取 ${path}。`);
  const file = await response.json<{ content: string; sha: string }>();
  return { data: JSON.parse(decodeGithub(file.content)) as T, sha: file.sha };
}
async function writeGithubJson(env: Env, path: string, value: unknown, message: string, sha?: string) {
  const response = await fetch(githubContentUrl(env, path), {
    method: 'PUT', headers: githubHeaders(env),
    body: JSON.stringify({ message, content: encodeGithub(`${JSON.stringify(value, null, 2)}\n`), branch: env.GITHUB_BRANCH, ...(sha ? { sha } : {}) }),
  });
  if (!response.ok) throw await githubHttpError(response, 'GitHub 发布失败');
}
function articleValue(data: Record<string, unknown>) {
  const post = data.post as Record<string, unknown> | undefined;
  if (!post || !String(post.title ?? '').trim() || !String(post.slug ?? '').trim() || !String(post.content ?? '').trim())
    throw new HttpError(400, '文章标题、链接和正文不能为空。');
  return post;
}
async function listArticles(env: Env, cors: Record<string, string>) {
  const current = await readGithubJson<Record<string, unknown>[]>(env, 'data/posts.json');
  return json({ posts: current.data, sha: current.sha }, 200, cors);
}
async function publishArticle(env: Env, post: Record<string, unknown>, editingId: string | null, baseSha: string | null) {
  const current = await readGithubJson<Record<string, unknown>[]>(env, 'data/posts.json');
  if (baseSha && baseSha !== current.sha) throw new HttpError(409, '文章列表已有新版本，请刷新并比较后再发布。');
  const original = editingId ? current.data.find((item) => String(item.id) === editingId) : undefined;
  if (editingId && !original) throw new HttpError(409, '原文章已被删除或更改，请刷新后重试。');
  const slug = String(post.slug);
  if (current.data.some((item) => String(item.slug) === slug && String(item.id) !== editingId))
    throw new HttpError(409, '文章链接已存在，请修改后再发布。');
  const nextPost = { ...post, id: editingId || `${slug}-${Date.now()}`, date: original?.date || post.date };
  const nextPosts = editingId ? current.data.map((item) => String(item.id) === editingId ? nextPost : item) : [nextPost, ...current.data];
  let articleSha: string | undefined;
  try { articleSha = (await readGithubJson(env, `data/posts/${slug}.json`)).sha; } catch { /* first independent article file */ }
  await writeGithubJson(env, `data/posts/${slug}.json`, nextPost, `${editingId ? 'update' : 'publish'}: ${String(post.title)}`, articleSha);
  await writeGithubJson(env, 'data/posts.json', nextPosts, `${editingId ? 'update' : 'publish'}: ${String(post.title)}`, current.sha);
  const latest = await readGithubJson<Record<string, unknown>[]>(env, 'data/posts.json');
  return { posts: nextPosts, post: nextPost, sha: latest.sha };
}

type ErrorEventInput = {
  source: 'frontend' | 'api' | 'github' | 'deployment';
  severity: 'warning' | 'error' | 'fatal';
  category: string;
  message: string;
  detail?: string;
  route?: string;
  actorUserId?: string;
};

async function recordError(env: Env, event: ErrorEventInput) {
  await env.DB.prepare('INSERT INTO error_events (id, source, severity, category, message, detail, route, actor_user_id, resolved, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)')
    .bind(id(), event.source, event.severity, event.category.slice(0, 80), event.message.slice(0, 500), event.detail?.slice(0, 4000) || null, event.route?.slice(0, 500) || null, event.actorUserId || null, now()).run();
}

async function collectClientError(request: Request, env: Env, origin: string, cors: Record<string, string>) {
  if (origin && origin !== env.ALLOWED_ORIGIN && origin !== 'http://localhost:3000') throw new HttpError(403, '错误报告来源无效。');
  const data = await body(request);
  const source = String(data.source ?? 'frontend') as ErrorEventInput['source'];
  const severity = String(data.severity ?? 'error') as ErrorEventInput['severity'];
  if (!['frontend', 'deployment'].includes(source) || !['warning', 'error', 'fatal'].includes(severity)) throw new HttpError(400, '错误报告格式无效。');
  const message = String(data.message ?? '').trim();
  if (!message) throw new HttpError(400, '错误报告不能为空。');
  await recordError(env, { source, severity, category: String(data.category ?? 'unknown'), message, detail: String(data.detail ?? ''), route: String(data.route ?? '') });
  return json({ ok: true }, 202, cors);
}

async function listErrors(url: URL, env: Env, cors: Record<string, string>) {
  const includeResolved = url.searchParams.get('resolved') === 'all';
  const where = includeResolved ? '' : 'WHERE resolved = 0';
  const result = await env.DB.prepare(`SELECT id, source, severity, category, message, detail, route, resolved, created_at FROM error_events ${where} ORDER BY created_at DESC LIMIT 50`).all();
  const open = await env.DB.prepare('SELECT COUNT(*) AS count FROM error_events WHERE resolved = 0').first<{ count: number }>();
  return json({ errors: result.results, openCount: Number(open?.count ?? 0) }, 200, cors);
}
async function createSnapshot(env: Env, userId: string, kind: 'article' | 'settings', targetId: string | null, title: string, payload: unknown) {
  await env.DB.prepare('INSERT INTO content_snapshots (id, kind, target_id, title, payload_json, actor_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id(), kind, targetId, title, JSON.stringify(payload), userId, now()).run();
  await env.DB.prepare('DELETE FROM content_snapshots WHERE id IN (SELECT id FROM content_snapshots ORDER BY created_at DESC LIMIT -1 OFFSET 100)').run();
}
async function submitArticle(request: Request, env: Env, user: UserRow, cors: Record<string, string>) {
  const data = await body(request); const post = articleValue(data);
  const editingId = data.editingId ? String(data.editingId) : null;
  const baseSha = data.baseSha ? String(data.baseSha) : null;
  if (user.role === 'author') {
    const reviewId = id(); const timestamp = now();
    await env.DB.prepare('INSERT INTO article_reviews (id, article_id, slug, title, article_json, base_sha, status, author_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(reviewId, editingId, String(post.slug), String(post.title), JSON.stringify(post), baseSha, 'pending', user.id, timestamp, timestamp).run();
    await audit(env, user.id, 'article.submitted', 'review', reviewId, request, String(post.title));
    return json({ status: 'pending', reviewId }, 202, cors);
  }
  if (editingId) {
    const current = await readGithubJson<Record<string, unknown>[]>(env, 'data/posts.json');
    const original = current.data.find((item) => String(item.id) === editingId);
    if (original) await createSnapshot(env, user.id, 'article', editingId, String(original.title ?? '文章备份'), original);
  }
  const result = await publishArticle(env, post, editingId, baseSha);
  await audit(env, user.id, 'article.published', 'article', String(result.post.id), request, String(post.title));
  return json({ status: 'published', ...result }, 200, cors);
}
async function listReviews(env: Env, user: UserRow, cors: Record<string, string>) {
  const ownerFilter = user.role === 'author' ? 'WHERE r.author_user_id = ?' : '';
  const query = `SELECT r.*, u.display_name AS author_name FROM article_reviews r JOIN users u ON u.id = r.author_user_id ${ownerFilter} ORDER BY r.created_at DESC LIMIT 100`;
  const result = user.role === 'author' ? await env.DB.prepare(query).bind(user.id).all() : await env.DB.prepare(query).all();
  return json({ reviews: result.results.map((row) => ({ id: row.id, articleId: row.article_id, slug: row.slug, title: row.title, post: JSON.parse(String(row.article_json)), baseSha: row.base_sha, status: row.status, authorName: row.author_name, note: row.review_note, createdAt: row.created_at })) }, 200, cors);
}
async function reviewArticle(request: Request, env: Env, user: UserRow, reviewId: string, cors: Record<string, string>) {
  const data = await body(request); const action = String(data.action ?? '');
  if (!['approve', 'reject'].includes(action)) throw new HttpError(400, '审核操作无效。');
  const review = await env.DB.prepare('SELECT * FROM article_reviews WHERE id = ? AND status = ?').bind(reviewId, 'pending').first<Record<string, unknown>>();
  if (!review) throw new HttpError(404, '待审核记录不存在。');
  if (action === 'reject') {
    await env.DB.prepare('UPDATE article_reviews SET status = ?, reviewer_user_id = ?, review_note = ?, updated_at = ? WHERE id = ?').bind('rejected', user.id, String(data.note ?? ''), now(), reviewId).run();
    await audit(env, user.id, 'article.rejected', 'review', reviewId, request, String(review.title));
    return json({ status: 'rejected' }, 200, cors);
  }
  if (review.article_id) {
    const current = await readGithubJson<Record<string, unknown>[]>(env, 'data/posts.json');
    const original = current.data.find((item) => String(item.id) === String(review.article_id));
    if (original) await createSnapshot(env, user.id, 'article', String(review.article_id), String(original.title ?? '文章备份'), original);
  }
  const result = await publishArticle(env, JSON.parse(String(review.article_json)), review.article_id ? String(review.article_id) : null, review.base_sha ? String(review.base_sha) : null);
  await env.DB.prepare('UPDATE article_reviews SET status = ?, reviewer_user_id = ?, review_note = ?, updated_at = ? WHERE id = ?').bind('approved', user.id, String(data.note ?? ''), now(), reviewId).run();
  await audit(env, user.id, 'article.approved', 'review', reviewId, request, String(review.title));
  return json({ status: 'approved', ...result }, 200, cors);
}
async function removeArticle(request: Request, env: Env, user: UserRow, articleId: string, cors: Record<string, string>) {
  const current = await readGithubJson<Record<string, unknown>[]>(env, 'data/posts.json');
  const target = current.data.find((item) => String(item.id) === articleId);
  if (!target) throw new HttpError(404, '文章不存在。');
  await createSnapshot(env, user.id, 'article', articleId, String(target.title ?? '已删除文章'), target);
  const next = current.data.filter((item) => String(item.id) !== articleId);
  await writeGithubJson(env, 'data/posts.json', next, `delete: ${String(target.title)}`, current.sha);
  await audit(env, user.id, 'article.deleted', 'article', articleId, request, String(target.title));
  return json({ posts: next }, 200, cors);
}
async function saveSiteSettings(request: Request, env: Env, user: UserRow, cors: Record<string, string>) {
  const data = await body(request); let sha: string | undefined;
  try { const current = await readGithubJson<Record<string, unknown>>(env, 'data/settings.json'); sha = current.sha; await createSnapshot(env, user.id, 'settings', 'site', '网站设置', current.data); } catch { /* first settings file */ }
  await writeGithubJson(env, 'data/settings.json', data.settings ?? {}, 'update: blog settings', sha);
  await audit(env, user.id, 'settings.updated', 'site', env.GITHUB_REPO, request);
  return json({ ok: true }, 200, cors);
}
function safeRepositoryPath(path: string) {
  if (!/^(public\/(images|audio)\/[a-zA-Z0-9._-]+|public\/(images|audio))$/.test(path))
    throw new HttpError(400, '媒体路径不安全。');
  return path;
}
async function listRepositoryFiles(url: URL, env: Env, cors: Record<string, string>) {
  const path = safeRepositoryPath(String(url.searchParams.get('path') ?? ''));
  const response = await fetch(`${githubContentUrl(env, path)}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`, { headers: githubHeaders(env) });
  if (response.status === 404) return json({ files: [] }, 200, cors);
  if (!response.ok) throw new HttpError(502, '媒体目录读取失败。');
  const files = await response.json();
  return json({ files }, 200, cors);
}
async function saveRepositoryFile(request: Request, env: Env, user: UserRow, cors: Record<string, string>) {
  const data = await body(request); const path = safeRepositoryPath(String(data.path ?? ''));
  const content = String(data.content ?? '');
  if (!content || content.length > 22_000_000) throw new HttpError(413, '媒体文件为空或超过上传限制。');
  const contentHash = String(data.contentHash ?? '');
  if (contentHash && !data.replace) {
    const duplicate = await env.DB.prepare('SELECT * FROM media_assets WHERE content_hash = ? LIMIT 1').bind(contentHash).first<Record<string, unknown>>();
    if (duplicate) return json({ deduplicated: true, content: { name: duplicate.name, path: duplicate.path, size: duplicate.size, sha: '' } }, 200, cors);
  }
  const response = await fetch(githubContentUrl(env, path), { method: 'PUT', headers: githubHeaders(env), body: JSON.stringify({ message: String(data.message ?? `upload: ${path}`), content, branch: env.GITHUB_BRANCH, ...(data.sha ? { sha: String(data.sha) } : {}) }) });
  if (!response.ok) throw await githubHttpError(response, '媒体上传失败');
  const result = await response.json<Record<string, unknown>>();
  const media = result.content as Record<string, unknown> | undefined;
  await env.DB.prepare('INSERT OR REPLACE INTO media_assets (path, content_hash, name, media_type, size, uploader_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(String(media?.path ?? path), contentHash || null, String(media?.name ?? path.split('/').pop()), path.includes('/audio/') ? 'audio' : 'image', Number(media?.size ?? 0), user.id, now()).run();
  await audit(env, user.id, 'media.uploaded', 'media', path, request);
  return json(result, 200, cors);
}
async function deleteRepositoryFile(request: Request, env: Env, user: UserRow, cors: Record<string, string>) {
  const data = await body(request); const path = safeRepositoryPath(String(data.path ?? ''));
  const response = await fetch(githubContentUrl(env, path), { method: 'DELETE', headers: githubHeaders(env), body: JSON.stringify({ message: String(data.message ?? `delete: ${path}`), sha: String(data.sha ?? ''), branch: env.GITHUB_BRANCH }) });
  if (!response.ok) throw new HttpError(response.status === 409 ? 409 : 502, '媒体删除失败，请刷新后重试。');
  await env.DB.prepare('DELETE FROM media_assets WHERE path = ?').bind(path).run();
  await audit(env, user.id, 'media.deleted', 'media', path, request);
  return json({ ok: true }, 200, cors);
}
async function listDrafts(env: Env, user: UserRow, cors: Record<string, string>) {
  const result = await env.DB.prepare('SELECT id, draft_json, updated_at FROM cloud_drafts WHERE user_id = ? ORDER BY updated_at DESC LIMIT 30').bind(user.id).all();
  return json({ drafts: result.results.map((row) => ({ id: row.id, savedAt: row.updated_at, draft: JSON.parse(String(row.draft_json)) })) }, 200, cors);
}
async function saveDraft(request: Request, env: Env, user: UserRow, cors: Record<string, string>) {
  const data = await body(request); const draftId = String(data.id ?? '').trim(); const draft = data.draft as Record<string, unknown> | undefined;
  if (!/^draft-[a-zA-Z0-9_-]+$/.test(draftId) || !draft) throw new HttpError(400, '草稿内容无效。');
  const timestamp = now();
  await env.DB.prepare('INSERT INTO cloud_drafts (id, user_id, title, draft_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id, user_id) DO UPDATE SET title = excluded.title, draft_json = excluded.draft_json, updated_at = excluded.updated_at')
    .bind(draftId, user.id, String(draft.title ?? ''), JSON.stringify(draft), timestamp, timestamp).run();
  return json({ ok: true, savedAt: timestamp }, 200, cors);
}
async function removeDraft(request: Request, env: Env, user: UserRow, draftId: string, cors: Record<string, string>) {
  await env.DB.prepare('DELETE FROM cloud_drafts WHERE id = ? AND user_id = ?').bind(draftId, user.id).run();
  await audit(env, user.id, 'draft.deleted', 'draft', draftId, request);
  return json({ ok: true }, 200, cors);
}
async function getPreferences(env: Env, user: UserRow, cors: Record<string, string>) {
  const row = await env.DB.prepare('SELECT preferences_json FROM user_preferences WHERE user_id = ?').bind(user.id).first<{ preferences_json: string }>();
  return json({ preferences: row ? JSON.parse(row.preferences_json) : {} }, 200, cors);
}
async function savePreferences(request: Request, env: Env, user: UserRow, cors: Record<string, string>) {
  const data = await body(request); const preferences = JSON.stringify(data.preferences ?? {});
  if (preferences.length > 20_000) throw new HttpError(413, '个人设置内容过大。');
  await env.DB.prepare('INSERT INTO user_preferences (user_id, preferences_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET preferences_json = excluded.preferences_json, updated_at = excluded.updated_at').bind(user.id, preferences, now()).run();
  return json({ ok: true }, 200, cors);
}
async function listSnapshots(env: Env, user: UserRow, cors: Record<string, string>) {
  requireEditor(user);
  const result = await env.DB.prepare('SELECT s.id, s.kind, s.target_id, s.title, s.created_at, u.display_name AS actor_name FROM content_snapshots s LEFT JOIN users u ON u.id = s.actor_user_id ORDER BY s.created_at DESC LIMIT 50').all();
  return json({ snapshots: result.results }, 200, cors);
}
async function restoreSnapshot(request: Request, env: Env, user: UserRow, snapshotId: string, cors: Record<string, string>) {
  const snapshot = await env.DB.prepare('SELECT * FROM content_snapshots WHERE id = ?').bind(snapshotId).first<Record<string, unknown>>();
  if (!snapshot) throw new HttpError(404, '备份不存在。');
  const payload = JSON.parse(String(snapshot.payload_json));
  if (snapshot.kind === 'settings') {
    requireOwner(user); let sha: string | undefined;
    try {
      const current = await readGithubJson<Record<string, unknown>>(env, 'data/settings.json');
      sha = current.sha;
      await createSnapshot(env, user.id, 'settings', 'site', '恢复前的网站设置', current.data);
    } catch { /* no settings */ }
    await writeGithubJson(env, 'data/settings.json', payload, 'restore: site settings', sha);
  } else {
    const current = await readGithubJson<Record<string, unknown>[]>(env, 'data/posts.json');
    const original = current.data.find((item) => String(item.id) === String(snapshot.target_id));
    if (original) await createSnapshot(env, user.id, 'article', String(snapshot.target_id), `恢复前：${String(original.title ?? '文章')}`, original);
    await publishArticle(env, payload, snapshot.target_id ? String(snapshot.target_id) : null, null);
  }
  await audit(env, user.id, 'snapshot.restored', String(snapshot.kind), String(snapshot.target_id ?? ''), request, String(snapshot.title));
  return json({ ok: true }, 200, cors);
}
async function githubHttpError(response: Response, action: string) {
  let detail = '';
  try { detail = String((await response.json<Record<string, unknown>>()).message ?? ''); } catch { /* non-json error */ }
  if (response.status === 401) return new HttpError(502, `${action}：发布凭证已失效，请联系超级管理员。`);
  if (response.status === 403) return new HttpError(502, `${action}：GitHub 权限不足或请求过于频繁，请稍后重试。`);
  if (response.status === 409 || response.status === 422) return new HttpError(409, `${action}：线上文件已更新，请刷新后重试。`);
  return new HttpError(502, `${action}${detail ? `：${detail}` : '，请稍后重试。'}`);
}

async function createUser(
  request: Request,
  env: Env,
  actor: UserRow,
  cors: Record<string, string>,
) {
  const data = await body(request);
  const username = String(data.username ?? '').trim();
  const displayName = String(data.displayName ?? username).trim();
  const password = String(data.password ?? '');
  const role = String(data.role ?? 'author') as Role;
  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username))
    throw new HttpError(400, '账号格式不正确。');
  if (!validPassword(password))
    throw new HttpError(400, '登录密码至少 6 位，并同时包含字母和数字。');
  if (!['owner', 'editor', 'author'].includes(role))
    throw new HttpError(400, '用户角色不正确。');
  const secured = await passwordHash(password);
  const userId = id();
  const timestamp = now();
  try {
    await env.DB.prepare(
      'INSERT INTO users (id, username, display_name, role, password_hash, password_salt, password_iterations, must_change_password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)',
    )
      .bind(
        userId,
        username,
        displayName,
        role,
        secured.hash,
        secured.salt,
        secured.rounds,
        timestamp,
        timestamp,
      )
      .run();
  } catch {
    throw new HttpError(409, '该账号已经存在。');
  }
  await audit(env, actor.id, 'user.created', 'user', userId, request, role);
  return json(
    {
      user: {
        id: userId,
        username,
        displayName,
        role,
        enabled: true,
        mustChangePassword: false,
      },
    },
    201,
    cors,
  );
}

async function updateUser(
  request: Request,
  env: Env,
  actor: UserRow,
  userId: string,
  cors: Record<string, string>,
) {
  const data = await body(request);
  const target = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first<UserRow>();
  if (!target) throw new HttpError(404, '用户不存在。');
  const displayName = String(data.displayName ?? target.display_name).trim();
  const role = String(data.role ?? target.role) as Role;
  const enabled =
    data.enabled === undefined ? target.enabled : data.enabled ? 1 : 0;
  if (!['owner', 'editor', 'author'].includes(role))
    throw new HttpError(400, '用户角色不正确。');
  if (target.id === actor.id && (!enabled || role !== 'owner'))
    throw new HttpError(400, '不能停用自己或移除自己的超级管理员权限。');
  const newPassword = String(data.password ?? '');
  if (newPassword && !validPassword(newPassword))
    throw new HttpError(400, '新密码至少 6 位，并同时包含字母和数字。');
  await env.DB.prepare(
    'UPDATE users SET display_name = ?, role = ?, enabled = ?, updated_at = ? WHERE id = ?',
  )
    .bind(displayName, role, enabled, now(), userId)
    .run();
  if (newPassword) {
    const secured = await passwordHash(newPassword);
    await env.DB.prepare(
      'UPDATE users SET password_hash = ?, password_salt = ?, password_iterations = ?, must_change_password = 0, updated_at = ? WHERE id = ?',
    )
      .bind(
        secured.hash,
        secured.salt,
        secured.rounds,
        now(),
        userId,
      )
      .run();
  }
  if (!enabled || newPassword)
    await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?')
      .bind(userId)
      .run();
  await audit(
    env,
    actor.id,
    'user.updated',
    'user',
    userId,
    request,
    `${role}:${enabled}${newPassword ? ':password-reset' : ''}`,
  );
  return json(
    { ok: true, reauth: Boolean(newPassword && target.id === actor.id) },
    200,
    cors,
  );
}

async function deleteUser(request: Request, env: Env, actor: UserRow, userId: string, cors: Record<string, string>) {
  if (userId === actor.id) throw new HttpError(400, '不能删除当前登录账号。');
  const target = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<UserRow>();
  if (!target) throw new HttpError(404, '用户不存在。');
  await audit(env, actor.id, 'user.deleted', 'user', userId, request, target.username);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId),
  ]);
  return json({ ok: true }, 200, cors);
}
