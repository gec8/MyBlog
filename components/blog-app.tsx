/* oxlint-disable next/no-img-element */
"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, CheckCircle2, Clock3, Eye, GitBranch, KeyRound, List, LoaderCircle, LogOut, Menu, PenLine, Save, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  readMinutes: number;
  content: string;
  coverImage?: string;
};

type Route = { view: "home" } | { view: "admin" } | { view: "post"; slug: string };

function readRoute(): Route {
  if (typeof window === "undefined") return { view: "home" };
  const hash = window.location.hash.replace(/^#\/?/, "");
  if (hash === "admin") return { view: "admin" };
  if (hash.startsWith("post/")) return { view: "post", slug: decodeURIComponent(hash.slice(5)) };
  return { view: "home" };
}

function go(path = "") {
  window.location.hash = path ? `#/${path}` : "#";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function coverTone(category: string) {
  if (category.includes("开发") || category.includes("技术")) return "coral";
  if (category.includes("生活")) return "navy";
  return "sage";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(new Date(`${value}T00:00:00`));
}

export function BlogApp({ initialPosts }: { initialPosts: Post[] }) {
  const [route, setRoute] = useState<Route>({ view: "home" });
  useEffect(() => {
    const sync = () => setRoute(readRoute());
    queueMicrotask(sync);
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  if (route.view === "admin") return <Admin posts={initialPosts} />;
  if (route.view === "post") {
    const post = initialPosts.find((item) => item.slug === route.slug);
    return post ? <Article post={post} posts={initialPosts} /> : <NotFound />;
  }
  return <Home posts={initialPosts} />;
}

function Header({ compact = false }: { compact?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <header className="site-header"><div className="site-width header-inner">
    <button className="brand" onClick={() => go()} aria-label="返回首页">Neko<span>Press</span></button>
    <nav className={menuOpen ? "nav-open" : ""} aria-label="主导航">
      <button className={compact ? "active" : ""} onClick={() => { setMenuOpen(false); go(); setTimeout(() => document.querySelector("#latest")?.scrollIntoView(), 40); }}>文章</button>
      <button onClick={() => { setMenuOpen(false); go(); setTimeout(() => document.querySelector("#about")?.scrollIntoView(), 40); }}>关于</button>
      <button className="write-link" onClick={() => { setMenuOpen(false); go("admin"); }}><PenLine size={14} /> 写文章</button>
    </nav>
    <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label={menuOpen ? "关闭菜单" : "打开菜单"}>{menuOpen ? <X /> : <Menu />}</button>
  </div></header>;
}

function Home({ posts }: { posts: Post[] }) {
  const featured = posts[0];
  return <>
    <Header />
    <main id="top" className="site-width page-shell">
      <section className="hero">
        <img src="./hero-v2.png" alt="夜晚书桌旁的猫与笔记本" />
        <div className="hero-shade" />
        <div className="hero-copy">
          <p><Sparkles size={14} /> NEKO EDITORIAL</p>
          <h1>写下好奇，<br />也收藏日常。</h1>
          <span>一个关于开发、生活与微小灵感的个人博客。</span>
          <button onClick={() => featured && go(`post/${featured.slug}`)}>开始阅读 <ArrowUpRight size={16} /></button>
        </div>
      </section>
      <section id="latest" className="section-block">
        <div className="section-heading"><div><span>Latest stories</span><h2>最近更新</h2></div><p>少一点喧闹，多一点值得读完的内容。</p></div>
        <div className="post-grid">{posts.map((post, index) => <PostCard post={post} featured={index === 0} key={post.id} />)}</div>
      </section>
      <section id="about" className="about-panel"><span className="cat-mark">猫</span><div><p>ABOUT THIS BLOG</p><h2>保持好奇，也保持一点松弛。</h2><span>这里记录做产品时的判断、读过的东西，以及生活里那些闪一下就会消失的念头。</span></div></section>
    </main>
    <Footer />
  </>;
}

function PostCard({ post, featured = false }: { post: Post; featured?: boolean }) {
  return <article className={`post-card ${featured ? "featured" : ""}`}>
    <button className="card-hit" onClick={() => go(`post/${post.slug}`)} aria-label={`阅读：${post.title}`}>
      <div className={`post-cover ${coverTone(post.category)} ${post.coverImage ? "has-image" : ""}`}>
        {post.coverImage && <img src={post.coverImage} alt="" />}
        <span>{post.category}</span><b>{post.date.slice(5).replace("-", " / ")}</b>
      </div>
      <div className="post-content"><p>{featured ? "EDITOR'S PICK" : `${post.category} · ${post.author}`}</p><h3>{post.title}</h3><span>{post.excerpt}</span><footer><span><Clock3 size={14} /> {post.readMinutes} 分钟阅读</span><ArrowUpRight className="card-arrow" size={16} /></footer></div>
    </button>
  </article>;
}

function Article({ post, posts }: { post: Post; posts: Post[] }) {
  const [progress, setProgress] = useState(0);
  const toc = useMemo(() => post.content.split("\n").filter((line) => line.startsWith("## ")).map((line) => ({ title: line.slice(3), id: headingId(line.slice(3)) })), [post.content]);
  const index = posts.findIndex((item) => item.id === post.id);
  const previous = posts[index + 1];
  const next = posts[index - 1];
  useEffect(() => {
    const update = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(height > 0 ? Math.min(100, (window.scrollY / height) * 100) : 0);
    };
    queueMicrotask(update);
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return <>
    <Header compact />
    <div className="reading-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
    <main className="article-layout">
      <div className="article-shell">
      <button className="back-link" onClick={() => go()}><ArrowLeft size={15} /> 返回文章列表</button>
      <header className="article-head">
        <p>{post.category} · {formatDate(post.date)}</p>
        <h1>{post.title}</h1>
        <span>{post.excerpt}</span>
        <div><b>{post.author.slice(0, 1).toUpperCase()}</b><p><strong>{post.author}</strong><span><Clock3 size={13} /> {post.readMinutes} 分钟阅读</span></p></div>
      </header>
      <div className={`article-cover ${coverTone(post.category)} ${post.coverImage ? "has-image" : ""}`}>{post.coverImage && <img src={post.coverImage} alt="" />}<span>{post.category}</span><b>{post.date}</b></div>
      <article className="article-body"><Markdown content={post.content} /></article>
      <nav className="article-neighbors" aria-label="相邻文章">
        {previous ? <button onClick={() => go(`post/${previous.slug}`)}><ArrowLeft /><span>上一篇</span><b>{previous.title}</b></button> : <span />}
        {next ? <button onClick={() => go(`post/${next.slug}`)}><span>下一篇</span><b>{next.title}</b><ArrowRight /></button> : <span />}
      </nav>
      <aside className="article-end"><span>猫</span><p>谢谢读到这里。<br/><small>如果这篇文章让你想到什么，欢迎继续写下去。</small></p></aside>
      </div>
      {toc.length > 0 && <aside className="article-toc"><p><List /> 本文目录</p>{toc.map((item, i) => <a key={item.id} href={`#${item.id}`}><span>{String(i + 1).padStart(2, "0")}</span>{item.title}</a>)}</aside>}
    </main>
    <Footer />
  </>;
}

function Markdown({ content }: { content: string }) {
  const blocks: ReactNode[] = [];
  const lines = content.split("\n");
  let list: string[] = [];
  const flushList = () => {
    if (!list.length) return;
    blocks.push(<ul key={`list-${blocks.length}`}>{list.map((item, i) => <li key={i}>{item}</li>)}</ul>);
    list = [];
  };
  lines.forEach((line, index) => {
    if (line.startsWith("- ")) { list.push(line.slice(2)); return; }
    flushList();
    if (!line.trim()) return;
    if (line.startsWith("### ")) blocks.push(<h3 key={index}>{line.slice(4)}</h3>);
    else if (line.startsWith("## ")) blocks.push(<h2 id={headingId(line.slice(3))} key={index}>{line.slice(3)}</h2>);
    else if (line.startsWith("> ")) blocks.push(<blockquote key={index}>{line.slice(2)}</blockquote>);
    else blocks.push(<p key={index}>{line}</p>);
  });
  flushList();
  return blocks;
}

function headingId(value: string) {
  return `section-${value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")}`;
}

function NotFound() {
  return <><Header compact /><main className="empty-state"><span>404</span><h1>这篇文章好像溜走了</h1><p>链接可能已经改变，回首页看看别的内容吧。</p><Button onClick={() => go()}>返回首页</Button></main></>;
}

type RepoConfig = { owner: string; repo: string; branch: string };
const emptyDraft = { title: "", excerpt: "", category: "随笔", author: "Neko", coverImage: "", content: "## 从这里开始\n\n写下你的正文。" };

function Admin({ posts }: { posts: Post[] }) {
  const [config, setConfig] = useState<RepoConfig>({ owner: "", repo: "", branch: "main" });
  const [token, setToken] = useState("");
  const [draft, setDraft] = useState(emptyDraft);
  const [connected, setConnected] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [state, setState] = useState<"idle" | "connecting" | "publishing" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [draftStatus, setDraftStatus] = useState("草稿会自动保存在本机");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("nekopress-repo");
      if (saved) queueMicrotask(() => setConfig(JSON.parse(saved)));
      const savedDraft = localStorage.getItem("nekopress-draft");
      if (savedDraft) queueMicrotask(() => setDraft(JSON.parse(savedDraft)));
    } catch { /* ignore malformed local preference */ }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      localStorage.setItem("nekopress-draft", JSON.stringify(draft));
      setDraftStatus(`已自动保存 · ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [draft]);

  const preview = useMemo<Post>(() => ({
    id: "preview", slug: slugify(draft.title) || "preview", title: draft.title || "文章标题",
    excerpt: draft.excerpt || "一句清楚的摘要会帮助读者决定是否继续阅读。", category: draft.category,
    author: draft.author || "Neko", coverImage: draft.coverImage.trim() || undefined, date: new Date().toISOString().slice(0, 10),
    readMinutes: Math.max(1, Math.ceil(draft.content.length / 500)), content: draft.content,
  }), [draft]);

  async function connect() {
    const owner = config.owner.trim();
    const repo = config.repo.trim();
    const branch = config.branch.trim();
    const accessToken = token.trim();
    if (!accessToken) {
      setState("error"); setMessage("请输入 GitHub 访问令牌。输入框中的灰色字符只是示例，并不是已填写的令牌。"); return;
    }
    if (!owner || !repo || !branch) {
      setState("error"); setMessage("请补全 GitHub 用户名、仓库名和分支。"); return;
    }
    setState("connecting"); setMessage("");
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/data/posts.json?ref=${encodeURIComponent(branch)}`, { headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${accessToken}`, "X-GitHub-Api-Version": "2022-11-28" } });
      if (!response.ok) throw new Error(response.status === 401 ? "令牌无效或已过期。" : "连接失败，请检查仓库、分支与 Contents 权限。");
      localStorage.setItem("nekopress-repo", JSON.stringify(config));
      setConnected(true); setState("idle");
    } catch (error) {
      setState("error"); setMessage(error instanceof Error ? error.message : "连接失败，请稍后重试。");
    }
  }

  function saveDraft() {
    localStorage.setItem("nekopress-draft", JSON.stringify(draft));
    setDraftStatus("草稿已保存到本机");
  }

  async function publish() {
    if (!config.owner || !config.repo || !token || !draft.title.trim() || !draft.content.trim()) {
      setState("error"); setMessage("请补全仓库信息、令牌、标题与正文。"); return;
    }
    setState("publishing"); setMessage("");
    try {
      localStorage.setItem("nekopress-repo", JSON.stringify(config));
      const api = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/data/posts.json`;
      const headers = { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28" };
      const current = await fetch(`${api}?ref=${encodeURIComponent(config.branch)}`, { headers });
      if (!current.ok) throw new Error(current.status === 401 ? "令牌无效或已过期。" : "无法读取 data/posts.json，请检查仓库与分支。 ");
      const file = await current.json() as { sha: string; content: string };
      const remotePosts = JSON.parse(decodeBase64(file.content)) as Post[];
      const nextPost = { ...preview, id: `${preview.slug}-${Date.now()}` };
      const body = JSON.stringify({ message: `publish: ${draft.title}`, content: encodeBase64(JSON.stringify([nextPost, ...remotePosts], null, 2) + "\n"), sha: file.sha, branch: config.branch });
      const saved = await fetch(api, { method: "PUT", headers: { ...headers, "Content-Type": "application/json" }, body });
      if (!saved.ok) throw new Error("提交失败；请确认令牌拥有 Contents: Read and write 权限。 ");
      setState("success"); setMessage("文章已提交。GitHub Pages 通常会在 1–2 分钟内自动更新。"); setDraft(emptyDraft); localStorage.removeItem("nekopress-draft");
    } catch (error) {
      setState("error"); setMessage(error instanceof Error ? error.message : "发布失败，请稍后重试。");
    }
  }

  return <div className="admin-shell">
    <header className="admin-top"><button className="brand" onClick={() => go()}>Neko<span>Press</span></button><div>{connected && <span className="connected-chip"><CheckCircle2 /> 已连接 {config.owner}/{config.repo}</span>}<Button variant="ghost" onClick={() => go()}><LogOut />退出后台</Button></div></header>
    {!connected ? <main className="connect-layout">
      <aside className="admin-guide connect-guide">
        <div className="guide-icon"><GitBranch /></div><p className="eyebrow">GITHUB PUBLISHING</p><h1>先连接仓库，<br/>再专心写作。</h1><span>令牌只保存在当前页面内存中，刷新或关闭页面即清除。仓库信息会保存在这台设备上。</span>
        <ol><li><b>01</b><span>创建 fine-grained token</span></li><li><b>02</b><span>授予此仓库 Contents 读写权限</span></li><li><b>03</b><span>验证成功后进入编辑器</span></li></ol>
      </aside>
      <section className="connect-card">
        <div className="form-heading"><div><KeyRound /><span><b>连接博客仓库</b><small>验证 data/posts.json 是否可读写</small></span></div><span className="secure-chip">不保存令牌</span></div>
        <div className="repo-grid">
          <Field label="GitHub 用户名"><Input value={config.owner} onChange={(e) => setConfig({ ...config, owner: e.target.value })} placeholder="your-name" /></Field>
          <Field label="仓库名"><Input value={config.repo} onChange={(e) => setConfig({ ...config, repo: e.target.value })} placeholder="my-blog" /></Field>
          <Field label="分支"><Input value={config.branch} onChange={(e) => setConfig({ ...config, branch: e.target.value })} placeholder="main" /></Field>
          <Field label="Fine-grained token"><Input type="password" value={token} onChange={(e) => { setToken(e.target.value); if (state === "error") { setState("idle"); setMessage(""); } }} placeholder="粘贴 github_pat_ 开头的令牌" autoComplete="off" required aria-invalid={state === "error" && !token.trim()} /><small className="token-hint">灰色文字仅为提示，令牌需要手动粘贴</small></Field>
        </div>
        {message && <output className={`status-message ${state}`}>{message}</output>}
        <Button className="connect-button" onClick={() => void connect()} disabled={state === "connecting"}>{state === "connecting" ? <LoaderCircle className="spin" /> : <GitBranch />} {state === "connecting" ? "正在验证…" : "连接并开始写作"}</Button>
      </section>
    </main> : <main className="admin-main editor-mode">
      <aside className="admin-guide">
        <div className="guide-icon"><PenLine /></div><p className="eyebrow">WRITING MODE</p><h1>专心写，<br/>其余交给 GitHub。</h1><span>{draftStatus}</span>
        <div className="editor-actions"><button onClick={saveDraft}><Save />立即保存草稿</button><button onClick={() => setConnected(false)}><KeyRound />更改仓库连接</button></div>
        <div className="post-count"><strong>{posts.length}</strong><span>篇文章已在站内发布</span></div>
      </aside>
      <div className="mobile-editor-tabs"><button className={!mobilePreview ? "active" : ""} onClick={() => setMobilePreview(false)}><PenLine />编辑</button><button className={mobilePreview ? "active" : ""} onClick={() => setMobilePreview(true)}><Eye />预览</button></div>
      <form className={`editor-panel ${mobilePreview ? "mobile-hidden" : ""}`} onSubmit={(event) => { event.preventDefault(); void publish(); }}>
        <section className="write-section">
          <div className="form-heading"><div><PenLine /><span><b>新文章</b><small>支持标题、引用、列表等基础 Markdown</small></span></div><span className="draft-indicator">{draftStatus}</span></div>
          <Field label="标题"><Input className="title-input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="给这篇文章一个好标题" /></Field>
          <div className="meta-grid"><Field label="分类"><Input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></Field><Field label="作者"><Input value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })} /></Field></div>
          <Field label="封面图片 URL（可选）"><Input type="url" value={draft.coverImage} onChange={(e) => setDraft({ ...draft, coverImage: e.target.value })} placeholder="https://example.com/cover.jpg" /></Field>
          <Field label="摘要"><Textarea value={draft.excerpt} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} placeholder="用一两句话说明这篇文章讲什么" /></Field>
          <Field label="正文"><Textarea className="content-editor" value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} /></Field>
          {message && <output className={`status-message ${state}`}>{state === "success" ? <CheckCircle2 /> : null}<span>{message}</span></output>}
        </section>
        <div className="publish-row"><p><Eye /> 约 {preview.readMinutes} 分钟阅读 · {draftStatus}</p><div><Button type="button" variant="outline" onClick={saveDraft}><Save />保存草稿</Button><Button type="submit" size="lg" disabled={state === "publishing"}>{state === "publishing" ? <LoaderCircle className="spin" /> : <Send />} {state === "publishing" ? "正在提交…" : "发布文章"}</Button></div></div>
      </form>
      <aside className={`preview-panel ${mobilePreview ? "mobile-visible" : ""}`}><p className="eyebrow">LIVE PREVIEW</p><div className={`mini-cover ${coverTone(preview.category)} ${preview.coverImage ? "has-image" : ""}`}>{preview.coverImage && <img src={preview.coverImage} alt="" />}<span>{preview.category}</span></div><small>{preview.category} · {preview.author}</small><h2>{preview.title}</h2><p>{preview.excerpt}</p><div className="mini-body"><Markdown content={preview.content} /></div></aside>
    </main>}
  </div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="form-field"><span>{label}</span>{children}</label>;
}

function slugify(value: string) {
  const latin = value.toLowerCase().trim().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-|-$/g, "");
  return latin || `post-${new Date().toISOString().slice(0, 10)}`;
}

function decodeBase64(value: string) {
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function Footer() {
  return <footer className="footer site-width"><span>© 2026 NekoPress</span><span>Published with GitHub Pages</span></footer>;
}
