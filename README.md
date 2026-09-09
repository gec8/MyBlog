# NekoPress Lite

一个以 NekoPress 视觉语言为原型、专门为 GitHub Pages 精简的个人博客。前台完全静态，后台通过 GitHub Contents API 把新文章写入仓库；提交后 GitHub Actions 会自动重新构建并上线。

## 保留的功能

- 响应式首页、文章卡片与文章阅读页
- 基础 Markdown（标题、段落、引用、列表）
- 轻量发布后台（页面右上角“写文章”）
- GitHub Pages 自动部署与项目子路径适配
- Open Graph 分享图与基础 SEO

评论、账号系统、动态、媒体中心、热榜、统计、回收站、审计、插件等功能被有意移除，避免为个人博客引入数据库和长期维护成本。

## 本地运行

需要 Node.js 22.13+ 与 pnpm 11。

```bash
pnpm install
pnpm dev
```

打开 `http://localhost:3000`。

## 发布到 GitHub Pages

1. 新建 GitHub 仓库，把本项目推送到 `main` 分支。
2. 在仓库的 **Settings → Pages → Build and deployment** 中选择 **GitHub Actions**。
3. 等待 `Deploy NekoPress to GitHub Pages` 工作流完成。
4. 访问 `https://你的用户名.github.io/仓库名/`；若仓库名是 `你的用户名.github.io`，则直接访问根域名。

## 从后台发布文章

在 GitHub 的 **Settings → Developer settings → Personal access tokens → Fine-grained tokens** 创建令牌：

- Repository access：只选择博客仓库
- Repository permissions → Contents：Read and write
- 建议设置较短有效期并定期轮换

进入博客右上角“写文章”，填写 GitHub 用户名、仓库、分支和令牌即可提交。令牌只存在当前页面的内存中，不会写入 `localStorage`、源码或构建产物；刷新页面后会清除。仓库名、用户名和分支会保存在本机，方便下次使用。

文章数据位于 `data/posts.json`。后台每次提交都会新增一条记录并触发 GitHub Pages 重新部署。

## 修改站点文字

- 首页与后台界面：`components/blog-app.tsx`
- 文章数据：`data/posts.json`
- 颜色和排版：`app/globals.css`
- 标题与分享信息：`app/layout.tsx`
