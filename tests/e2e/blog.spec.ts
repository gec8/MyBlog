import { expect, test, type Page } from '@playwright/test';

const worker = 'https://nekopress-auth.wangshirufengabc.workers.dev';
const owner = { id: 'owner-1', username: 'owner', displayName: '站长', role: 'owner', enabled: true, mustChangePassword: false, createdAt: '2026-01-01', lastLoginAt: null };
const author = { ...owner, id: 'author-1', username: 'author', displayName: '作者', role: 'author' };
const post = { id: 'post-1', slug: 'browser-test', title: '浏览器测试文章', excerpt: '用于测试编辑与删除流程。', category: '测试', author: '站长', date: '2026-01-01', readMinutes: 1, content: '## 正文\n\n测试内容。' };

async function mockBackend(page: Page, role: 'owner' | 'author' = 'owner') {
  await page.route(`${worker}/**`, async (route) => {
    const url = new URL(route.request().url());
    const user = role === 'owner' ? owner : author;
    const path = url.pathname;
    if (path === '/api/auth/login') return route.fulfill({ json: { token: 'test-session', user } });
    if (path === '/api/auth/me') return route.fulfill({ json: { user } });
    if (path === '/api/content/articles') return route.fulfill({ json: { posts: [post], post, sha: 'test-sha', status: 'published' } });
    if (path === '/api/drafts') return route.fulfill({ json: { drafts: [] } });
    if (path === '/api/preferences') return route.fulfill({ json: { preferences: {} } });
    if (path === '/api/content/reviews') return route.fulfill({ json: { reviews: [] } });
    if (path === '/api/snapshots') return route.fulfill({ json: { snapshots: [{ id: 'snap-1', kind: 'article', target_id: 'post-1', title: '文章备份', created_at: '2026-01-01T00:00:00Z', actor_name: '站长' }] } });
    if (path.startsWith('/api/snapshots/')) return route.fulfill({ json: { ok: true } });
    if (path === '/api/errors') return route.fulfill({ json: { errors: [], openCount: 0 } });
    if (path === '/api/content/files') return route.fulfill({ json: { files: [], content: { name: 'test.png', path: 'public/images/test.png', sha: 'media-sha', size: 68 } } });
    return route.fulfill({ json: { ok: true } });
  });
}

async function login(page: Page, role: 'owner' | 'author' = 'owner') {
  await mockBackend(page, role);
  await page.goto('/#/admin');
  await page.getByLabel('账号').fill(role);
  await page.getByLabel('密码').fill('abc123');
  await page.getByRole('button', { name: '登录后台' }).click();
  await expect(page.getByRole('heading', { name: /晚上好/ })).toBeVisible();
}

test('首页和文章在桌面及手机均可打开且无横向溢出', async ({ page }) => {
  await page.goto('/');
  await page.locator('html[data-app-ready="true"]').waitFor();
  await expect(page.locator('body')).not.toBeEmpty();
  await expect(page.getByRole('heading').first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const firstArticle = page.locator('.post-card').first();
  await expect(firstArticle).toBeVisible();
  await firstArticle.locator('.card-hit').click();
  await page.waitForURL(/\/post\//);
  await expect(page.locator('.article-body')).toBeVisible();
});

test('真实文章地址、键盘导航与深色模式正常', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/post/welcome-to-nekopress');
  await expect(page).toHaveTitle(/把灵感写成可以反复抵达的地方/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/post\/welcome-to-nekopress\/?$/);
  expect(await page.locator('script[type="application/ld+json"]').evaluate((element) => element.textContent)).toContain('BlogPosting');
  const skipLink = page.getByRole('link', { name: '跳到文章正文' });
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  const colors = await page.locator('body').evaluate((element) => ({ background: getComputedStyle(element).backgroundColor, color: getComputedStyle(element).color }));
  expect(colors.background).not.toBe('rgb(255, 250, 248)');
  expect(colors.color).toBe('rgb(245, 241, 243)');
});

test('新用户可以登录，作者权限不会显示用户与全站设置', async ({ page }) => {
  await login(page, 'author');
  await expect(page.getByRole('button', { name: '用户' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /设置/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /审核/ })).toBeVisible();
});

test('管理员可进入写作、媒体上传、删除恢复与健康状态', async ({ page }) => {
  await login(page, 'owner');
  await page.locator('.admin-sidebar nav button').filter({ hasText: /^文章/ }).click();
  await page.getByRole('button', { name: '编辑', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: /编辑：浏览器测试文章/ })).toBeVisible();
  await page.getByRole('button', { name: /新文章/ }).first().click();
  await expect(page.getByRole('heading', { name: '写一篇新文章' })).toBeVisible();
  await page.getByRole('button', { name: '媒体', exact: true }).click();
  await expect(page.getByRole('heading', { name: '媒体资源', level: 1 })).toBeVisible();
  await page.locator('input[type="file"][multiple]').setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2h8sAAAAASUVORK5CYII=', 'base64') });
  await expect(page.getByText(/已上传并加入列表/)).toBeVisible();
  await page.getByRole('button', { name: '备份', exact: true }).click();
  await expect(page.getByText('文章备份')).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '恢复此版本' }).click();
  await expect(page.getByText(/备份已恢复/)).toBeVisible();
  await page.getByRole('button', { name: '概览' }).click();
  await expect(page.getByText('网站健康状态')).toBeVisible();
});
