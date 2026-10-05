import { expect, test, type Page } from '@playwright/test';

const worker = 'https://nekopress-auth.wangshirufengabc.workers.dev';
const owner = { id: 'owner-1', username: 'owner', displayName: '站长', role: 'owner', enabled: true, mustChangePassword: false, createdAt: '2026-01-01', lastLoginAt: null };
const author = { ...owner, id: 'author-1', username: 'author', displayName: '作者', role: 'author' };
const post = {
  id: 'post-1',
  slug: 'browser-test',
  legacySlugs: ['旧浏览器测试'],
  title: '浏览器测试文章',
  excerpt: '这是一段用于验证文章编辑、发布、删除和恢复完整流程的测试摘要。',
  category: '测试',
  author: '站长',
  date: '2026-01-01',
  readMinutes: 1,
  content: '## 正文\n\n这是一段用于真实浏览器自动化测试的文章正文，内容长度足以通过发布前质量检查，并验证编辑、发布、删除与恢复流程均可正常工作。',
};

async function mockBackend(page: Page, role: 'owner' | 'author' = 'owner') {
  let deploymentChecks = 0;
  await page.route('https://api.github.com/repos/**/actions/runs**', async (route) => {
    deploymentChecks += 1;
    return route.fulfill({
      json: {
        workflow_runs: [{
          id: deploymentChecks === 1 ? 1 : 2,
          name: 'Deploy NekoNote to GitHub Pages',
          status: deploymentChecks === 1 ? 'completed' : 'completed',
          conclusion: 'success',
        }],
      },
    });
  });
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
  await page.goto('/admin');
  await page.getByLabel('账号').fill(role);
  await page.getByLabel('密码').fill('abc123');
  await page.getByRole('button', { name: '登录后台' }).click();
  await expect(page.getByRole('heading', { name: /晚上好/ })).toBeVisible();
}

async function openAdminPanel(page: Page, label: string) {
  const navigation = page.locator('.admin-sidebar nav');
  const target = navigation.getByRole('button', { name: new RegExp(`^${label}`) });
  if (!(await target.isVisible())) {
    await navigation.getByRole('button', { name: '更多后台栏目' }).click();
  }
  await target.click();
}

async function largeLightSurfaces(page: Page) {
  return page.locator('body').evaluate((body) => {
    const results: string[] = [];
    for (const element of body.querySelectorAll<HTMLElement>('*')) {
      if (element.matches('button,a,img,svg,video,canvas,picture')) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width * rect.height < 1500 || rect.bottom <= 0 || rect.top >= innerHeight) continue;
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.1) continue;
      const colors = `${style.backgroundColor} ${style.backgroundImage}`.matchAll(/rgba?\(\s*(\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)/g);
      const hasLightBackground = [...colors].some((match) => Number(match[1]) > 238 && Number(match[2]) > 238 && Number(match[3]) > 238);
      if (hasLightBackground) results.push(`${element.tagName.toLowerCase()}.${element.className}`.slice(0, 140));
    }
    return [...new Set(results)].slice(0, 20);
  });
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

test('手机首页首屏紧凑且手动主题会跨刷新保持', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await page.locator('html[data-app-ready="true"]').waitFor();
  const heroHeight = await page.locator('.hero').evaluate((element) => element.getBoundingClientRect().height);
  expect(heroHeight).toBeGreaterThanOrEqual(330);
  expect(heroHeight).toBeLessThanOrEqual(342);

  await page.getByRole('button', { name: '打开菜单' }).click();
  await page.getByRole('button', { name: '主题：浅色' }).click();
  await page.reload();
  await page.locator('html[data-app-ready="true"]').waitFor();
  expect(await page.evaluate(() => localStorage.getItem('nekonote-theme'))).toBe('light');
  expect(await page.locator('#nekonote-dark-theme').getAttribute('media')).toBe('not all');
  expect(await page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(255, 250, 248)');

  await page.getByRole('button', { name: '打开菜单' }).click();
  await page.getByRole('button', { name: '主题：深色' }).click();
  await page.reload();
  await page.locator('html[data-app-ready="true"]').waitFor();
  expect(await page.evaluate(() => localStorage.getItem('nekonote-theme'))).toBe('dark');
  expect(await page.locator('#nekonote-dark-theme').getAttribute('media')).toBe('all');
  expect(await page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(20, 19, 22)');
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

test('手机深色模式下后台登录表单保持清晰可读', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/admin');

  await expect(page.locator('.admin-login>section')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
  const cardColors = await page.locator('.admin-login>section').evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    color: getComputedStyle(element).color,
  }));
  const inputColors = await page.getByLabel('账号').evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    color: getComputedStyle(element).color,
  }));
  const buttonColors = await page.getByRole('button', { name: '登录后台' }).evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    color: getComputedStyle(element).color,
  }));

  expect(cardColors).toEqual({ background: 'rgb(33, 31, 35)', color: 'rgb(245, 241, 243)' });
  expect(inputColors).toEqual({ background: 'rgb(23, 21, 25)', color: 'rgb(245, 241, 243)' });
  expect(buttonColors).toEqual({ background: 'rgb(245, 241, 243)', color: 'rgb(23, 23, 28)' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('手机深色模式覆盖前台和全部后台栏目', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await page.locator('html[data-app-ready="true"]').waitFor();
  expect(await largeLightSurfaces(page)).toEqual([]);
  await expect(page.getByRole('link', { name: /猫笺 NekoNote，返回首页/ })).toBeVisible();
  await expect(page.locator('.cat-logo .brand-mark')).toBeVisible();
  const activeCategoryColors = await page.locator('.category-tabs button.active').evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    color: getComputedStyle(element).color,
  }));
  const logoColors = await page.locator('.cat-logo').evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    color: getComputedStyle(element).color,
  }));
  await page.getByRole('button', { name: '打开菜单' }).click();
  const writeButtonColors = await page.getByRole('link', { name: '写文章' }).evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    color: getComputedStyle(element).color,
  }));
  expect(activeCategoryColors).toEqual({ background: 'rgb(245, 241, 243)', color: 'rgb(23, 23, 28)' });
  expect(logoColors).toEqual({ background: 'rgba(0, 0, 0, 0)', color: 'rgb(245, 241, 243)' });
  expect(writeButtonColors).toEqual({ background: 'rgb(245, 241, 243)', color: 'rgb(23, 23, 28)' });

  await login(page, 'owner');
  const navigation = page.locator('.admin-sidebar nav');
  for (const label of ['概览', '文章', '写作', '媒体']) {
    await navigation.getByRole('button', { name: new RegExp(`^${label}`) }).click();
    await page.waitForTimeout(80);
    expect(await largeLightSurfaces(page), `${label}仍有浅色大面积背景`).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${label}发生横向溢出`).toBeLessThanOrEqual(1);
  }
  for (const label of ['草稿', '审核', '备份', '设置', '用户']) {
    await navigation.getByRole('button', { name: '更多后台栏目' }).click();
    await navigation.getByRole('button', { name: new RegExp(`^${label}`) }).click();
    await page.waitForTimeout(80);
    expect(await largeLightSurfaces(page), `${label}仍有浅色大面积背景`).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${label}发生横向溢出`).toBeLessThanOrEqual(1);
  }
});

test('新用户可以登录，作者权限不会显示用户与全站设置', async ({ page }) => {
  await login(page, 'author');
  await expect(page.getByRole('button', { name: '用户' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /设置/ })).toHaveCount(0);
  await openAdminPanel(page, '审核');
  await expect(page.getByRole('heading', { name: /文章审核/ })).toBeVisible();
});

test('管理员可进入写作、媒体上传、删除恢复与健康状态', async ({ page }) => {
  await login(page, 'owner');
  await page.locator('.admin-sidebar nav button').filter({ hasText: /^文章/ }).click();
  await page.getByRole('button', { name: '编辑', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: /编辑：浏览器测试文章/ })).toBeVisible();
  await page.getByRole('button', { name: /新文章/ }).first().click();
  await expect(page.getByRole('heading', { name: '写一篇新文章' })).toBeVisible();
  const publishBar = page.locator('.publish-row');
  for (const name of ['保存草稿', '预览', '发布文章']) {
    const button = publishBar.getByRole('button', { name, exact: true });
    await expect(button).toBeVisible();
    expect(await button.evaluate((element) => {
      const style = getComputedStyle(element);
      const parse = (value: string) => value.match(/\d+/g)?.slice(0, 3).map(Number) ?? [0, 0, 0];
      const [br, bg, bb] = parse(style.backgroundColor);
      const [cr, cg, cb] = parse(style.color);
      return Math.abs(br - cr) + Math.abs(bg - cg) + Math.abs(bb - cb);
    }), `${name}文字与背景对比不足`).toBeGreaterThan(120);
  }
  await page.getByRole('button', { name: '媒体', exact: true }).click();
  await expect(page.getByRole('heading', { name: '媒体资源', level: 1 })).toBeVisible();
  await page.locator('input[type="file"][multiple]').setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2h8sAAAAASUVORK5CYII=', 'base64') });
  await expect(page.getByText(/已上传并加入列表/)).toBeVisible();
  await openAdminPanel(page, '备份');
  await expect(page.getByText('文章备份')).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '恢复此版本' }).click();
  await expect(page.getByText(/备份已恢复/)).toBeVisible();
  await page.getByRole('button', { name: '概览' }).click();
  await expect(page.getByText('网站健康状态')).toBeVisible();
});
