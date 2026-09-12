interface Env {
  DB: D1Database;
  ALLOWED_ORIGIN: string;
  BOOTSTRAP_SECRET: string;
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
      return json({ error: '接口不存在。' }, 404, cors);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
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
