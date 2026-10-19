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
  let readerAnnotations: unknown[] = [];
  let readerUpdatedAt: string | null = null;
  let preferences: Record<string, unknown> = {};
  await page.route('https://images.pexels.com/**', (route) => route.fulfill({
    contentType: 'image/png',
    body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2h8sAAAAASUVORK5CYII=', 'base64'),
  }));
  await page.route('https://api.pexels.com/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/videos/')) return route.fulfill({ json: { videos: [{
      id: 101, width: 1280, height: 720,
      url: 'https://www.pexels.com/video/test-video-101/',
      image: 'https://images.pexels.com/videos/101/free-video-101.jpg',
      user: { name: 'Test Creator', url: 'https://www.pexels.com/@test-creator/' },
      video_files: [{ id: 1, quality: 'hd', file_type: 'video/mp4', width: 1280, height: 720, link: 'https://videos.pexels.com/video-files/101/test-video.mp4' }],
    }] } });
    return route.fulfill({ json: { photos: [{
      id: 202, width: 1280, height: 720, photographer: 'Photo Creator',
      photographer_url: 'https://www.pexels.com/@photo-creator/',
      url: 'https://www.pexels.com/photo/test-photo-202/', alt: '测试在线图片',
      src: { medium: 'https://images.pexels.com/photos/202/medium.png', large: 'https://images.pexels.com/photos/202/large.png', large2x: 'https://images.pexels.com/photos/202/large2x.png' },
    }] } });
  });
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
    if (path === '/api/annotations' && route.request().method() === 'GET') return route.fulfill({ json: { annotations: readerAnnotations, updatedAt: readerUpdatedAt } });
    if (path === '/api/annotations' && route.request().method() === 'PUT') {
      const payload = route.request().postDataJSON() as { annotations?: unknown[] };
      readerAnnotations = payload.annotations ?? [];
      readerUpdatedAt = new Date().toISOString();
      return route.fulfill({ json: { ok: true, updatedAt: readerUpdatedAt } });
    }
    if (path === '/api/content/articles') return route.fulfill({ json: { posts: [post], post, sha: 'test-sha', status: 'published' } });
    if (path === '/api/drafts') return route.fulfill({ json: { drafts: [] } });
    if (path === '/api/preferences' && route.request().method() === 'GET') return route.fulfill({ json: { preferences } });
    if (path === '/api/preferences' && route.request().method() === 'PUT') {
      preferences = (route.request().postDataJSON() as { preferences?: Record<string, unknown> }).preferences ?? {};
      return route.fulfill({ json: { ok: true } });
    }
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
      if (hasLightBackground) results.push(`${element.tagName.toLowerCase()}|parent=${element.parentElement?.className || ''}|bg=${style.backgroundColor}|class=${element.className}`.slice(0, 300));
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

test('读者批注可云端同步、跨设备恢复并直接取消高亮', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/post/welcome-to-nekopress');
  await expect(page.getByText('阅读批注', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '高亮', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '登录同步' }).click();
  await page.getByRole('textbox', { name: '云同步账号' }).fill('owner');
  await page.getByLabel('云同步密码').fill('abc123');
  await page.getByRole('button', { name: '登录并同步' }).click();
  await expect(page.getByRole('button', { name: '云端已同步' })).toBeVisible();
  const selectParagraph = async (index: number) => {
    const paragraph = page.locator('.article-body p').nth(index);
    await paragraph.scrollIntoViewIfNeeded();
    const box = await paragraph.boundingBox();
    if (!box) throw new Error('无法定位文章段落');
    await page.mouse.move(box.x + 8, box.y + Math.min(18, box.height / 2));
    await page.mouse.down();
    await page.mouse.move(box.x + Math.min(180, box.width - 8), box.y + Math.min(18, box.height / 2), { steps: 8 });
    await page.mouse.up();
  };
  await selectParagraph(0);
  const blue = page.getByRole('button', { name: '批注颜色：蓝色' });
  await blue.click();
  await expect(blue).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '高亮', exact: true }).click();
  await expect(page.locator('.reader-mark-highlight.reader-color-blue')).toHaveCount(1);
  await expect(page.getByText('我的批注')).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage).some((key) => key.startsWith('nekonote-reader-annotations:')))).toBe(true);
  await page.reload();
  await expect(page.locator('.reader-mark-highlight.reader-color-blue')).toHaveCount(1);
  await selectParagraph(1);
  await page.getByRole('button', { name: '批注颜色：绿色' }).click();
  await page.getByRole('button', { name: '划线', exact: true }).click();
  await expect(page.locator('.reader-mark-underline.reader-color-green')).toHaveCount(1);
  await selectParagraph(2);
  await page.getByRole('button', { name: '批注颜色：粉色' }).click();
  await page.getByRole('button', { name: '写批注', exact: true }).click();
  await page.getByRole('textbox', { name: '批注内容' }).fill('这里值得以后再读一次');
  await page.getByRole('button', { name: '保存批注' }).click();
  await expect(page.locator('.reader-mark-note.reader-color-pink')).toHaveCount(1);
  await expect(page.locator('.reader-annotation-list')).toContainText('这里值得以后再读一次');
  await expect(page.getByRole('button', { name: '云端已同步' })).toBeVisible();
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) if (key.startsWith('nekonote-reader-annotations:')) localStorage.removeItem(key);
  });
  await page.reload();
  await expect(page.locator('[data-reader-annotation]')).toHaveCount(3);
  await page.locator('.reader-mark-highlight.reader-color-blue').click();
  await expect(page.locator('.reader-mark-highlight')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '云端已同步' })).toBeVisible();
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) if (key.startsWith('nekonote-reader-annotations:')) localStorage.removeItem(key);
  });
  await page.reload();
  await expect(page.locator('[data-reader-annotation]')).toHaveCount(2);
  await expect(page.locator('.reader-mark-highlight')).toHaveCount(0);
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
  const discoveryLayout = await page.locator('.front-discovery').evaluate((element) => {
    const categories = element.querySelector('.category-tabs')!.getBoundingClientRect();
    const search = element.querySelector('label')!.getBoundingClientRect();
    return { categoryCenter: categories.top + categories.height / 2, searchCenter: search.top + search.height / 2, categoryRight: categories.right, searchLeft: search.left };
  });
  expect(Math.abs(discoveryLayout.categoryCenter - discoveryLayout.searchCenter)).toBeLessThanOrEqual(2);
  expect(discoveryLayout.searchLeft).toBeGreaterThanOrEqual(discoveryLayout.categoryRight);
  await page.getByRole('button', { name: '打开菜单' }).click();
  await expect(page.getByText('站点导航', { exact: true })).toBeVisible();
  await expect(page.getByText('外观', { exact: true })).toBeVisible();
  const mobileNavigation = await page.locator('.site-header nav').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height, left: rect.left, top: rect.top, bottom: rect.bottom, background: getComputedStyle(element).backgroundColor, bodyOverflow: document.body.style.overflow };
  });
  expect(mobileNavigation.width).toBeLessThanOrEqual(301);
  expect(mobileNavigation.height).toBeGreaterThanOrEqual(779);
  expect(mobileNavigation.left).toBeGreaterThanOrEqual(89);
  expect(mobileNavigation.top).toBeGreaterThanOrEqual(63);
  expect(mobileNavigation.bottom).toBeGreaterThanOrEqual(843);
  expect(mobileNavigation.background).toBe('rgb(28, 26, 30)');
  expect(mobileNavigation.bodyOverflow).toBe('hidden');
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

test('Pexels API Key 可同步到手机并在正文插入在线视频', async ({ page }) => {
  await login(page, 'owner');
  await openAdminPanel(page, '设置');
  const keyInput = page.getByPlaceholder('粘贴 Pexels API Key');
  await keyInput.fill('pexels-test-key');
  await page.waitForTimeout(700);
  await page.evaluate(() => localStorage.removeItem('nekopress-pexels-key'));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await openAdminPanel(page, '设置');
  await expect(page.getByPlaceholder('粘贴 Pexels API Key')).toHaveValue('pexels-test-key');

  await page.locator('.admin-sidebar nav').getByRole('button', { name: '写作' }).click();
  await expect(page.getByRole('button', { name: '在线图片' })).toBeVisible();
  await page.getByRole('button', { name: '在线视频' }).click();
  await expect(page.getByRole('heading', { name: '插入在线媒体' })).toBeVisible();
  await expect(page.locator('.pexels-video-grid article')).toHaveCount(1);
  await page.getByRole('button', { name: '插入视频' }).click();
  await expect(page.locator('.content-editor')).toContainText('@[video:Test Creator](https://videos.pexels.com/video-files/101/test-video.mp4)');
  await expect(page.locator('.content-editor')).toContainText('视频：Test Creator / Pexels');

  await page.getByRole('button', { name: '在线图片' }).click();
  await expect(page.locator('.pexels-grid article')).toHaveCount(1);
  await page.getByRole('button', { name: '插入正文' }).click();
  await expect(page.locator('.content-editor')).toContainText('![测试在线图片](./images/test.png)');
  await expect(page.locator('.content-editor')).toContainText('图片：Photo Creator / Pexels');
});

test('新建文章支持模板、折叠设置、布局切换与未保存保护', async ({ page }) => {
  await login(page, 'owner');
  await page.getByRole('button', { name: '新文章' }).click();
  await expect(page.getByRole('heading', { name: '写一篇新文章' })).toBeVisible();

  await page.getByLabel('选择文章模板').selectOption('dev-note');
  await page.getByText('文章设置', { exact: true }).click();
  await expect(page.getByLabel('分类')).toHaveValue('开发');
  await page.getByPlaceholder('给这篇文章一个好标题').fill('短');
  await page.getByPlaceholder('用一两句话说明这篇文章讲什么').fill('短');
  await page.locator('.content-editor').fill('## 正文\n\n这是用于验证取消标题和摘要最少字数限制的文章正文，正文仍保留基本完整性检查。');

  await page.getByRole('button', { name: '发布文章' }).click();
  await expect(page.getByRole('heading', { name: '发布前检查' })).toBeVisible();
  await expect(page.getByText('标题至少需要 4 个字')).toHaveCount(0);
  await expect(page.getByText('摘要至少需要 20 个字')).toHaveCount(0);
  await page.getByRole('button', { name: '继续编辑' }).click();

  await page.locator('.editor-view-switch').getByRole('button', { name: '预览', exact: true }).click();
  await expect(page.locator('.editor-workspace')).toHaveClass(/view-preview/);
  await page.locator('.editor-view-switch').getByRole('button', { name: '编辑', exact: true }).click();
  await page.getByRole('button', { name: '新文章' }).click();
  await expect(page.getByRole('heading', { name: '当前文章还有未保存更改' })).toBeVisible();
});
