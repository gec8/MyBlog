/* oxlint-disable next/no-img-element */
"use client";

import { ChangeEvent, DragEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, BarChart3, Bold, CheckCircle2, Clock3, Code2, Copy, Download, Eye, EyeOff, FilePlus2, FileText, GitBranch, Heading2, ImagePlus, KeyRound, Link2, List, ListFilter, ListOrdered, LoaderCircle, LockKeyhole, LogOut, Maximize2, Menu, Minus, Minimize2, Music2, Pause, Pencil, PenLine, Play, Quote, Redo2, RefreshCw, RotateCcw, Save, Search, Send, Settings, Sparkles, Strikethrough, Table2, Trash2, Undo2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SiteHealth } from "@/components/admin/site-health";

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

export type SiteSettings = { name: string; tagline: string; description: string; author: string; defaultCategory: string; postsPerPage: number; github: string; footer: string; copyright: string };

type Route = { view: "home" } | { view: "admin" } | { view: "post"; slug: string };
const deferUpdate = (callback: () => void) => typeof queueMicrotask === "function" ? queueMicrotask(callback) : Promise.resolve().then(callback);

function readRoute(): Route {
  if (typeof window === "undefined") return { view: "home" };
  const hash = window.location.hash.replace(/^#\/?/, "");
  if (hash === "admin") return { view: "admin" };
  if (hash.startsWith("post/")) { try { return { view: "post", slug: decodeURIComponent(hash.slice(5)) }; } catch { return { view: "home" }; } }
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
  try { return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(new Date(`${value}T00:00:00`)); }
  catch { return value; }
}

export function BlogApp({ initialPosts, initialSettings }: { initialPosts: Post[]; initialSettings: SiteSettings }) {
  const [route, setRoute] = useState<Route>({ view: "home" });
  useEffect(() => {
    const sync = () => setRoute(readRoute());
    deferUpdate(sync);
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  if (route.view === "admin") return <Admin posts={initialPosts} initialSettings={initialSettings} />;
  if (route.view === "post") {
    const post = initialPosts.find((item) => item.slug === route.slug);
    return post ? <Article post={post} posts={initialPosts} settings={initialSettings} /> : <NotFound />;
  }
  return <Home posts={initialPosts} settings={initialSettings} />;
}

function Header({ compact = false, name = "NekoPress" }: { compact?: boolean; name?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    document.body.style.overflow = "hidden"; window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", close); };
  }, [menuOpen]);
  return <header className="site-header"><div className="site-width header-inner">
    <button className="brand" onClick={() => go()} aria-label="返回首页"><span className="cat-logo">猫</span>{name}</button>
    <nav className={menuOpen ? "nav-open" : ""} aria-label="主导航">
      <button className={compact ? "active" : ""} onClick={() => { setMenuOpen(false); go(); setTimeout(() => document.querySelector("#latest")?.scrollIntoView(), 40); }}>文章</button>
      <button onClick={() => { setMenuOpen(false); go(); setTimeout(() => document.querySelector("#about")?.scrollIntoView(), 40); }}>关于</button>
      <button className="write-link" onClick={() => { setMenuOpen(false); go("admin"); }}><PenLine size={14} /> 写文章</button>
    </nav>
    {menuOpen && <button className="nav-backdrop" aria-label="关闭菜单" onClick={() => setMenuOpen(false)} />}
    <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label={menuOpen ? "关闭菜单" : "打开菜单"}>{menuOpen ? <X /> : <Menu />}</button>
  </div></header>;
}

function Home({ posts, settings }: { posts: Post[]; settings: SiteSettings }) {
  const featured = posts[0];
  const [frontQuery, setFrontQuery] = useState("");
  const [frontCategory, setFrontCategory] = useState("全部");
  const [visibleCount, setVisibleCount] = useState(settings.postsPerPage || 9);
  const frontCategories = useMemo(() => ["全部", ...Array.from(new Set(posts.map((post) => post.category)))], [posts]);
  const filteredPosts = useMemo(() => posts.filter((post) => (frontCategory === "全部" || post.category === frontCategory) && `${post.title} ${post.excerpt} ${post.author}`.toLowerCase().includes(frontQuery.toLowerCase())), [posts, frontCategory, frontQuery]);
  return <>
    <Header name={settings.name} />
    <main id="top" className="site-width page-shell">
      <section className="hero">
        <img src="./hero-v2.png" alt="夜晚书桌旁的猫与笔记本" loading="eager" decoding="async" fetchPriority="high" onError={(event) => { event.currentTarget.hidden = true; }} />
        <div className="hero-shade" />
        <div className="hero-copy">
          <p><Sparkles size={14} /> NEKO EDITORIAL</p>
          <h1>{settings.tagline}</h1>
          <span>{settings.description}</span>
          {featured && <small>{featured.category} · {formatDate(featured.date)} · {featured.readMinutes} 分钟阅读</small>}
          <button onClick={() => featured && go(`post/${featured.slug}`)}>开始阅读 <ArrowUpRight size={16} /></button>
        </div>
        <button className="scroll-cue" onClick={() => document.querySelector("#latest")?.scrollIntoView()} aria-label="查看最近文章"><span>SCROLL</span><ArrowRight /></button>
      </section>
      <section id="latest" className="section-block">
        <div className="section-heading"><div><span>Latest stories</span><h2>最近更新</h2></div><p>少一点喧闹，多一点值得读完的内容。</p></div>
        <div className="front-discovery"><div className="category-tabs">{frontCategories.map((category) => <button className={frontCategory === category ? "active" : ""} key={category} onClick={() => { setFrontCategory(category); setVisibleCount(settings.postsPerPage || 9); }}>{category}</button>)}</div><label><Search /><input value={frontQuery} onChange={(event) => { setFrontQuery(event.target.value); setVisibleCount(settings.postsPerPage || 9); }} placeholder="搜索文章" aria-label="搜索文章" />{frontQuery && <button onClick={() => setFrontQuery("")} aria-label="清空搜索"><X /></button>}</label></div>
        {filteredPosts.length ? <><div className="post-grid">{filteredPosts.slice(0, visibleCount).map((post, index) => <PostCard post={post} featured={index === 0 && !frontQuery && frontCategory === "全部"} key={post.id} />)}</div>{visibleCount < filteredPosts.length && <div className="load-more"><button onClick={() => setVisibleCount((count) => count + (settings.postsPerPage || 9))}>加载更多 <ArrowRight /></button></div>}</> : <div className="front-empty"><Search /><h3>没有找到相关文章</h3><p>换一个关键词或分类试试看。</p><button onClick={() => { setFrontQuery(""); setFrontCategory("全部"); }}>查看全部文章</button></div>}
      </section>
      <section id="about" className="about-panel"><span className="cat-mark">猫</span><div><p>ABOUT THIS BLOG</p><h2>{settings.footer}</h2><span>{settings.description}</span></div></section>
    </main>
    <Footer settings={settings} />
  </>;
}

function PostCard({ post, featured = false }: { post: Post; featured?: boolean }) {
  return <article className={`post-card ${featured ? "featured" : ""}`}>
    <button className="card-hit" onClick={() => go(`post/${post.slug}`)} aria-label={`阅读：${post.title}`}>
      <div className={`post-cover ${coverTone(post.category)} ${post.coverImage ? "has-image" : ""}`}>
        {post.coverImage && <img src={post.coverImage} alt="" loading={featured ? "eager" : "lazy"} decoding="async" fetchPriority={featured ? "high" : "auto"} onError={(event) => { event.currentTarget.hidden = true; event.currentTarget.parentElement?.classList.add("image-failed"); }} />}
        <span>{post.category}</span><b>{post.date.slice(5).replace("-", " / ")}</b>
      </div>
      <div className="post-content"><p>{featured ? "EDITOR'S PICK" : `${post.category} · ${post.author}`}</p><h3>{post.title}</h3><span>{post.excerpt}</span><footer><span><Clock3 size={14} /> {post.readMinutes} 分钟阅读</span><ArrowUpRight className="card-arrow" size={16} /></footer></div>
    </button>
  </article>;
}

function Article({ post, posts, settings }: { post: Post; posts: Post[]; settings: SiteSettings }) {
  const [progress, setProgress] = useState(0);
  const [activeHeading, setActiveHeading] = useState("");
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<"small" | "normal" | "large">("normal");
  const [lightbox, setLightbox] = useState<number | null>(null);
  const bodyImages = useMemo(() => post.content.split("\n").map((line) => line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)).filter(Boolean).map((match) => ({ alt: match![1], src: match![2] })), [post.content]);
  const toc = useMemo(() => post.content.split("\n").filter((line) => line.startsWith("## ")).map((line) => ({ title: line.slice(3), id: headingId(line.slice(3)) })), [post.content]);
  const index = posts.findIndex((item) => item.id === post.id);
  const previous = posts[index + 1];
  const next = posts[index - 1];
  const related = posts.filter((item) => item.id !== post.id && item.category === post.category).slice(0, 2);
  useEffect(() => {
    const update = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(height > 0 ? Math.min(100, (window.scrollY / height) * 100) : 0);
    };
    deferUpdate(update);
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  useEffect(() => {
    const headings = toc.map((item) => document.getElementById(item.id)).filter(Boolean) as HTMLElement[];
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) setActiveHeading(entry.target.id); }), { rootMargin: "-20% 0px -65%" });
    headings.forEach((heading) => observer.observe(heading)); return () => observer.disconnect();
  }, [toc]);
  useEffect(() => {
    if (lightbox === null) return;
    const previous = document.body.style.overflow;
    const keys = (event: KeyboardEvent) => { if (event.key === "Escape") setLightbox(null); if (event.key === "ArrowLeft") setLightbox((value) => value === null ? null : (value - 1 + bodyImages.length) % bodyImages.length); if (event.key === "ArrowRight") setLightbox((value) => value === null ? null : (value + 1) % bodyImages.length); };
    document.body.style.overflow = "hidden"; window.addEventListener("keydown", keys);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", keys); };
  }, [lightbox, bodyImages.length]);
  async function copyLink() { await navigator.clipboard.writeText(window.location.href); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
  return <>
    <Header compact name={settings.name} />
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
      <div className={`article-cover ${coverTone(post.category)} ${post.coverImage ? "has-image" : ""}`}>{post.coverImage && <img src={post.coverImage} alt="" loading="eager" decoding="async" fetchPriority="high" onError={(event) => { event.currentTarget.hidden = true; event.currentTarget.parentElement?.classList.add("image-failed"); }} />}<span>{post.category}</span><b>{post.date}</b></div>
      <article className={`article-body reading-size-${fontSize}`}><Markdown content={post.content} onImageOpen={(src) => setLightbox(Math.max(0, bodyImages.findIndex((item) => item.src === src)))} /></article>
      <div className="article-tools"><div className="font-controls" aria-label="正文字号"><span>字号</span><button className={fontSize === "small" ? "active" : ""} onClick={() => setFontSize("small")}>小</button><button className={fontSize === "normal" ? "active" : ""} onClick={() => setFontSize("normal")}>中</button><button className={fontSize === "large" ? "active" : ""} onClick={() => setFontSize("large")}>大</button></div><button onClick={() => void copyLink()}><Copy />{copied ? "已复制" : "复制文章链接"}</button><button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><ArrowUp />返回顶部</button></div>
      <nav className="article-neighbors" aria-label="相邻文章">
        {previous ? <button onClick={() => go(`post/${previous.slug}`)}><ArrowLeft /><span>上一篇</span><b>{previous.title}</b></button> : <div className="neighbor-empty"><span>上一篇</span><b>已经是第一篇</b></div>}
        {next ? <button onClick={() => go(`post/${next.slug}`)}><span>下一篇</span><b>{next.title}</b><ArrowRight /></button> : <div className="neighbor-empty"><span>下一篇</span><b>已经是最后一篇</b></div>}
      </nav>
      <aside className="article-end"><span>猫</span><p>谢谢读到这里。<br/><small>如果这篇文章让你想到什么，欢迎继续写下去。</small></p></aside>
      {related.length > 0 && <section className="related-posts"><p>相关阅读</p><div>{related.map((item) => <button key={item.id} onClick={() => go(`post/${item.slug}`)}><small>{item.category}</small><b>{item.title}</b><ArrowUpRight /></button>)}</div></section>}
      </div>
      {toc.length > 0 && <aside className="article-toc"><p><List /> 本文目录</p>{toc.map((item, i) => <a className={activeHeading === item.id ? "active" : ""} key={item.id} href={`#${item.id}`}><span>{String(i + 1).padStart(2, "0")}</span>{item.title}</a>)}</aside>}
    </main>
    <Footer settings={settings} />
    {lightbox !== null && bodyImages[lightbox] && <div className="image-lightbox" role="dialog" aria-modal="true" aria-label="正文大图" onMouseDown={() => setLightbox(null)}><button className="lightbox-close" onClick={() => setLightbox(null)} aria-label="关闭大图"><X /></button>{bodyImages.length > 1 && <button className="lightbox-prev" onMouseDown={(event) => event.stopPropagation()} onClick={() => setLightbox((lightbox - 1 + bodyImages.length) % bodyImages.length)} aria-label="上一张"><ArrowLeft /></button>}<figure onMouseDown={(event) => event.stopPropagation()}><img src={bodyImages[lightbox].src} alt={bodyImages[lightbox].alt} /><figcaption>{bodyImages[lightbox].alt || `${lightbox + 1} / ${bodyImages.length}`}</figcaption></figure>{bodyImages.length > 1 && <button className="lightbox-next" onMouseDown={(event) => event.stopPropagation()} onClick={() => setLightbox((lightbox + 1) % bodyImages.length)} aria-label="下一张"><ArrowRight /></button>}</div>}
  </>;
}

function AudioPlayer({ src, title }: { src: string; title: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [mediaState, setMediaState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => () => { audioRef.current?.pause(); }, []);
  const formatTime = (seconds: number) => Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}` : "0:00";
  const toggle = async () => {
    const audio = audioRef.current; if (!audio) return;
    if (mediaState === "error") { setMediaState("loading"); audio.load(); return; }
    if (audio.paused) { try { document.querySelectorAll("audio").forEach((item) => { if (item !== audio) item.pause(); }); await audio.play(); } catch { setPlaying(false); setMediaState("error"); } }
    else audio.pause();
  };
  const changeSpeed = () => {
    const next = speed === 1 ? 1.25 : speed === 1.25 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(next); if (audioRef.current) audioRef.current.playbackRate = next;
  };
  return <figure className={`audio-player ${playing ? "is-playing" : ""} is-${mediaState}`}>
    <button className="audio-play" type="button" onClick={() => void toggle()} aria-label={mediaState === "error" ? "重新加载音频" : playing ? "暂停音频" : "播放音频"}>{playing ? <Pause /> : mediaState === "loading" ? <LoaderCircle className="spin" /> : <Play />}</button>
    <div className="audio-info"><span className="audio-art"><Music2 /><i/><i/><i/></span><span><b>{title}</b><small role="status">{mediaState === "error" ? "音频加载失败 · 点击左侧重试" : mediaState === "loading" ? "正在加载音频…" : `文章配套音频 · ${formatTime(duration)}`}</small></span></div>
    <div className="audio-controls"><input aria-label="音频播放进度" type="range" min="0" max={duration || 0} step="0.1" value={current} style={{ "--audio-progress": `${duration ? current / duration * 100 : 0}%` } as React.CSSProperties} onChange={(event) => { const value = Number(event.target.value); setCurrent(value); if (audioRef.current) audioRef.current.currentTime = value; }} /><span>{formatTime(current)} / {formatTime(duration)}</span><button type="button" onClick={changeSpeed} aria-label="切换播放速度">{speed}×</button></div>
    <audio ref={audioRef} preload="metadata" src={src} onLoadedMetadata={(event) => { setDuration(event.currentTarget.duration); setMediaState("ready"); }} onCanPlay={() => setMediaState("ready")} onWaiting={() => setMediaState("loading")} onError={() => { setPlaying(false); setMediaState("error"); }} onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setCurrent(0); }}>您的浏览器不支持音频播放。</audio>
  </figure>;
}

function Markdown({ content, onImageOpen }: { content: string; onImageOpen?: (src: string) => void }) {
  const blocks: ReactNode[] = [];
  const lines = content.split("\n");
  let list: string[] = [];
  let code: string[] = [];
  let inCode = false;
  const flushList = () => {
    if (!list.length) return;
    blocks.push(<ul key={`list-${blocks.length}`}>{list.map((item, i) => { const task = item.match(/^\[([ xX])\]\s*(.*)$/); return <li className={task ? "task-item" : undefined} key={i}>{task && <input type="checkbox" checked={task[1].toLowerCase() === "x"} readOnly/>}{inlineMarkdown(task ? task[2] : item)}</li>; })}</ul>);
    list = [];
  };
  lines.forEach((line, index) => {
    if (line.startsWith("```")) { if (inCode) { blocks.push(<pre key={`code-${index}`}><code>{code.join("\n")}</code></pre>); code = []; } inCode = !inCode; return; }
    if (inCode) { code.push(line); return; }
    if (line.startsWith("- ")) { list.push(line.slice(2)); return; }
    if (/^\d+\.\s/.test(line)) { list.push(line.replace(/^\d+\.\s/, "")); return; }
    flushList();
    if (!line.trim()) return;
    if (line.startsWith("### ")) blocks.push(<h3 key={index}>{inlineMarkdown(line.slice(4))}</h3>);
    else if (line.startsWith("## ")) blocks.push(<h2 id={headingId(line.slice(3))} key={index}>{inlineMarkdown(line.slice(3))}</h2>);
    else if (line.startsWith("> ")) blocks.push(<blockquote key={index}>{inlineMarkdown(line.slice(2))}</blockquote>);
    else if (line.trim() === "---") blocks.push(<hr key={index} />);
    else if (/^@\[audio(?::[^\]]+)?\]\([^)]+\)$/.test(line)) { const audio = line.match(/^@\[audio(?::([^\]]+))?\]\(([^)]+)\)$/)!; blocks.push(<AudioPlayer key={index} title={audio[1]?.trim() || "文章音频"} src={audio[2]} />); }
    else if (/^!\[[^\]]*\]\([^)]+\)$/.test(line)) { const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)!; blocks.push(<figure key={index}><img src={image[2]} alt={image[1]} loading="lazy" decoding="async" tabIndex={onImageOpen ? 0 : undefined} role={onImageOpen ? "button" : undefined} onClick={() => onImageOpen?.(image[2])} onKeyDown={(event) => { if (onImageOpen && (event.key === "Enter" || event.key === " ")) onImageOpen(image[2]); }} onError={(event) => { event.currentTarget.hidden = true; event.currentTarget.parentElement?.classList.add("article-image-failed"); }} /><figcaption>{image[1]}</figcaption></figure>); }
    else blocks.push(<p key={index}>{inlineMarkdown(line)}</p>);
  });
  flushList();
  if (code.length) blocks.push(<pre key="code-last"><code>{code.join("\n")}</code></pre>);
  return blocks;
}

function inlineMarkdown(value: string) {
  return value.split(/(\*\*.*?\*\*|~~.*?~~|`.*?`|\[[^\]]+\]\([^)]+\))/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("~~") && part.endsWith("~~")) return <del key={index}>{part.slice(2, -2)}</del>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) return <a key={index} href={link[2]} target={link[2].startsWith("http") ? "_blank" : undefined} rel="noreferrer">{link[1]}</a>;
    return part;
  });
}

function headingId(value: string) {
  return `section-${value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")}`;
}

function NotFound() {
  return <><Header compact /><main className="empty-state"><span>404</span><h1>这篇文章好像溜走了</h1><p>链接可能已经改变，回首页看看别的内容吧。</p><Button onClick={() => go()}>返回首页</Button></main></>;
}

type RepoConfig = { owner: string; repo: string; branch: string };
type Draft = { title: string; slug: string; excerpt: string; category: string; author: string; coverImage: string; content: string };
type SavedDraft = { id: string; savedAt: string; draft: Draft };
const emptyDraft: Draft = { title: "", slug: "", excerpt: "", category: "随笔", author: "Neko", coverImage: "", content: "## 从这里开始\n\n写下你的正文。" };

function Admin({ posts, initialSettings }: { posts: Post[]; initialSettings: SiteSettings }) {
  const [config, setConfig] = useState<RepoConfig>({ owner: "", repo: "", branch: "main" });
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [remotePosts, setRemotePosts] = useState(posts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [panel, setPanel] = useState<"dashboard" | "posts" | "editor" | "media" | "drafts" | "settings">("dashboard");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("全部");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "title">("newest");
  const [siteSettings, setSiteSettings] = useState(initialSettings);
  const [connected, setConnected] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [previewSize, setPreviewSize] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [savedDrafts, setSavedDrafts] = useState<SavedDraft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState(() => `draft-${Date.now()}`);
  const [mediaCheck, setMediaCheck] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [showOutline, setShowOutline] = useState(true);
  const [showFind, setShowFind] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [versions, setVersions] = useState<SavedDraft[]>([]);
  const [state, setState] = useState<"idle" | "connecting" | "uploading" | "publishing" | "deploying" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [draftStatus, setDraftStatus] = useState("草稿会自动保存在本机");
  const [dirty, setDirty] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [deploymentStage, setDeploymentStage] = useState<0 | 1 | 2 | 3>(0);
  const [lastRun, setLastRun] = useState<{ id: number; status: string; conclusion: string | null; html_url: string } | null>(null);
  const [showPublishCheck, setShowPublishCheck] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const inlineImageRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef({ start: 0, end: 0 });
  const settingsImportRef = useRef<HTMLInputElement>(null);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("nekopress-repo");
      const sessionToken = sessionStorage.getItem("nekopress-token") ?? "";
      if (saved) { const savedConfig = JSON.parse(saved) as RepoConfig; deferUpdate(() => { setConfig(savedConfig); if (sessionToken.startsWith("github_pat_")) { setToken(sessionToken); setConnected(true); } }); }
      const savedDraft = localStorage.getItem("nekopress-draft");
      if (savedDraft) deferUpdate(() => setDraft({ ...emptyDraft, ...JSON.parse(savedDraft) }));
      const allDrafts = localStorage.getItem("nekopress-drafts");
      if (allDrafts) deferUpdate(() => setSavedDrafts(JSON.parse(allDrafts)));
      const allVersions = localStorage.getItem("nekopress-versions");
      if (allVersions) deferUpdate(() => setVersions(JSON.parse(allVersions)));
    } catch { /* ignore malformed local preference */ }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      localStorage.setItem("nekopress-draft", JSON.stringify(draft));
      const entry: SavedDraft = { id: activeDraftId, savedAt: new Date().toISOString(), draft };
      setSavedDrafts((current) => { const next = [entry, ...current.filter((item) => item.id !== activeDraftId)].slice(0, 20); localStorage.setItem("nekopress-drafts", JSON.stringify(next)); return next; });
      setDraftStatus(`已自动保存 · ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [draft, activeDraftId]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    const shortcut = (event: KeyboardEvent) => { const command = event.ctrlKey || event.metaKey; if (command && event.key.toLowerCase() === "s") { event.preventDefault(); saveDraft(); } if (command && event.key.toLowerCase() === "b") { event.preventDefault(); insertMarkdown("**", "**", "加粗文字"); } if (command && event.key.toLowerCase() === "k") { event.preventDefault(); insertMarkdown("[", "](https://)", "链接文字"); } if (command && event.key.toLowerCase() === "f" && panel === "editor") { event.preventDefault(); setShowFind(true); } if (event.key === "Escape") { setShowPublishCheck(false); setDeleteTarget(null); setShowFind(false); } };
    window.addEventListener("beforeunload", warn); window.addEventListener("keydown", shortcut);
    return () => { window.removeEventListener("beforeunload", warn); window.removeEventListener("keydown", shortcut); };
  }, [dirty, draft, panel]);

  const preview = useMemo<Post>(() => ({
    id: "preview", slug: draft.slug.trim() || slugify(draft.title) || "preview", title: draft.title || "文章标题",
    excerpt: draft.excerpt || "一句清楚的摘要会帮助读者决定是否继续阅读。", category: draft.category,
    author: draft.author || "Neko", coverImage: draft.coverImage.trim() || undefined, date: new Date().toISOString().slice(0, 10),
    readMinutes: Math.max(1, Math.ceil(draft.content.length / 500)), content: draft.content,
  }), [draft]);

  const categories = useMemo(() => ["全部", ...Array.from(new Set(remotePosts.map((post) => post.category)))], [remotePosts]);
  const totalWords = useMemo(() => remotePosts.reduce((total, post) => total + post.content.replace(/\s/g, "").length, 0), [remotePosts]);
  const settingsDirty = useMemo(() => JSON.stringify(siteSettings) !== JSON.stringify(initialSettings), [siteSettings, initialSettings]);
  const visiblePosts = useMemo(() => remotePosts.filter((post) => (categoryFilter === "全部" || post.category === categoryFilter) && `${post.title} ${post.excerpt}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sortOrder === "title" ? a.title.localeCompare(b.title, "zh-CN") : sortOrder === "oldest" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)), [remotePosts, categoryFilter, query, sortOrder]);
  const slugDuplicate = useMemo(() => Boolean(draft.slug && remotePosts.some((post) => post.slug === draft.slug && post.id !== editingId)), [draft.slug, remotePosts, editingId]);
  const draftMedia = useMemo(() => [draft.coverImage, ...Array.from(draft.content.matchAll(/(?:!\[[^\]]*\]|@\[audio(?::[^\]]+)?\])\(([^)]+)\)/g), (match) => match[1])].filter(Boolean), [draft.coverImage, draft.content]);
  const mediaLibrary = useMemo(() => { const map = new Map<string, { url: string; type: "image" | "audio"; posts: string[] }>(); remotePosts.forEach((post) => { const urls = [post.coverImage, ...Array.from(post.content.matchAll(/(?:!\[[^\]]*\]|@\[audio(?::[^\]]+)?\])\(([^)]+)\)/g), (match) => match[1])].filter(Boolean) as string[]; urls.forEach((url) => { const type = /\.(?:mp3|m4a|wav|ogg|webm)(?:\?|$)/i.test(url) || url.includes("/audio/") ? "audio" : "image"; const item = map.get(url) || { url, type, posts: [] }; if (!item.posts.includes(post.title)) item.posts.push(post.title); map.set(url, item); }); }); return Array.from(map.values()); }, [remotePosts]);
  const editorOutline = useMemo(() => Array.from(draft.content.matchAll(/^(#{2,3})\s+(.+)$/gm), (match) => ({ level: match[1].length, title: match[2], index: match.index ?? 0 })), [draft.content]);
  const contentWarnings = useMemo(() => { const warnings: string[] = []; if (/\[[^\]]+\]\(\s*\)/.test(draft.content)) warnings.push("存在空链接"); if (/!\[\s*\]\(/.test(draft.content)) warnings.push("存在缺少说明的图片"); if (/^###\s/m.test(draft.content) && !/^##\s/m.test(draft.content)) warnings.push("标题层级从三级开始"); if (draft.content.split(/\n\s*\n/).some((item) => item.length > 500)) warnings.push("存在超过 500 字的长段落"); return warnings; }, [draft.content]);

  useEffect(() => {
    if (!showPublishCheck) { setMediaCheck("idle"); return; }
    const localMedia = draftMedia.filter((url) => !/^https?:/i.test(url));
    if (!localMedia.length) { setMediaCheck("ok"); return; }
    let active = true; setMediaCheck("checking");
    Promise.all(localMedia.map((url) => fetch(new URL(url, window.location.href), { method: "HEAD", cache: "no-store" }).then((response) => response.ok).catch(() => false))).then((results) => { if (active) setMediaCheck(results.every(Boolean) ? "ok" : "error"); });
    return () => { active = false; };
  }, [showPublishCheck, draftMedia]);

  const headers = () => ({ Accept: "application/vnd.github+json", Authorization: `Bearer ${token.trim()}`, "X-GitHub-Api-Version": "2022-11-28" });
  const contentsApi = (path: string) => `https://api.github.com/repos/${config.owner.trim()}/${config.repo.trim()}/contents/${path}`;

  async function readRepoFile<T>(path: string): Promise<{ data: T; sha: string }> {
    const response = await fetch(`${contentsApi(path)}?ref=${encodeURIComponent(config.branch.trim())}`, { headers: headers() });
    if (!response.ok) throw new Error(response.status === 401 ? "令牌无效或已过期。" : response.status === 403 ? "令牌权限不足，请将 Contents 设置为 Read and write。" : response.status === 404 ? `仓库中没有找到 ${path}。` : "GitHub 连接失败，请稍后重试。");
    const file = await response.json() as { sha: string; content: string };
    return { data: JSON.parse(decodeBase64(file.content)) as T, sha: file.sha };
  }

  async function writeRepoFile(path: string, value: unknown, messageText: string, sha?: string) {
    const body = JSON.stringify({ message: messageText, content: encodeBase64(JSON.stringify(value, null, 2) + "\n"), ...(sha ? { sha } : {}), branch: config.branch.trim() });
    const response = await fetch(contentsApi(path), { method: "PUT", headers: { ...headers(), "Content-Type": "application/json" }, body });
    if (!response.ok) throw new Error(response.status === 409 ? "远程内容已更新，请刷新文章列表后重试。" : "提交失败，请确认令牌拥有 Contents: Read and write 权限。");
  }

  async function latestRun() {
    const response = await fetch(`https://api.github.com/repos/${config.owner.trim()}/${config.repo.trim()}/actions/runs?per_page=1`, { headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" } });
    if (!response.ok) return null;
    const result = await response.json() as { workflow_runs: { id: number; status: string; conclusion: string | null; html_url: string }[] };
    return result.workflow_runs[0] ?? null;
  }

  async function waitForDeployment(previousId: number | null) {
    setState("deploying"); setDeploymentStage(1); setMessage("内容已提交，正在等待 GitHub Pages 开始更新…");
    for (let attempt = 0; attempt < 24; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 5000));
      const run = await latestRun();
      if (!run || (previousId && run.id === previousId)) continue;
      if (run.status !== "completed") { setDeploymentStage(2); setMessage("GitHub Pages 正在构建和部署，请稍候…"); continue; }
      if (run.conclusion === "success") { setLastRun(run); setDeploymentStage(3); setState("success"); setMessage("网站更新完成，最新内容已经上线。"); return; }
      setState("error"); setMessage("内容已提交，但网站构建失败。请前往 GitHub Actions 查看日志。"); return;
    }
    setState("success"); setMessage("内容已提交；部署仍在后台进行，可以稍后刷新前台查看。");
  }

  async function connect() {
    const owner = config.owner.trim();
    const repo = config.repo.trim();
    const branch = config.branch.trim();
    const accessToken = token.trim();
    if (!accessToken) {
      setState("error"); setMessage("请输入 GitHub 访问令牌。输入框中的灰色字符只是示例，并不是已填写的令牌。"); return;
    }
    if (!accessToken.startsWith("github_pat_")) {
      setState("error"); setMessage("令牌格式不正确。请粘贴以 github_pat_ 开头的 Fine-grained token。"); return;
    }
    if (!owner || !repo || !branch) {
      setState("error"); setMessage("请补全 GitHub 用户名、仓库名和分支。"); return;
    }
    setState("connecting"); setMessage("");
    try {
      const repository = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${accessToken}`, "X-GitHub-Api-Version": "2022-11-28" } });
      if (!repository.ok) throw new Error(repository.status === 401 ? "令牌无效或已过期。" : repository.status === 404 ? "找不到仓库，请检查用户名和仓库名。" : "无法验证仓库权限。");
      const repositoryInfo = await repository.json() as { permissions?: { push?: boolean } };
      if (repositoryInfo.permissions && !repositoryInfo.permissions.push) throw new Error("此令牌没有写入权限，请为 MyBlog 开启 Contents: Read and write。");
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/data/posts.json?ref=${encodeURIComponent(branch)}`, { headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${accessToken}`, "X-GitHub-Api-Version": "2022-11-28" } });
      if (!response.ok) throw new Error(response.status === 401 ? "令牌无效或已过期。" : response.status === 403 ? "令牌权限不足，请检查 Contents: Read and write。" : response.status === 404 ? "仓库、分支或 data/posts.json 不存在。" : "连接失败，请稍后重试。");
      const file = await response.json() as { content: string };
      setRemotePosts(JSON.parse(decodeBase64(file.content)) as Post[]);
      localStorage.setItem("nekopress-repo", JSON.stringify(config));
      sessionStorage.setItem("nekopress-token", accessToken);
      setConnected(true); setPanel("dashboard"); setState("idle"); setMessage("");
      void latestRun().then(setLastRun);
    } catch (error) {
      setState("error"); setMessage(error instanceof Error ? error.message : "连接失败，请稍后重试。");
    }
  }

  function saveDraft() {
    localStorage.setItem("nekopress-draft", JSON.stringify(draft));
    const entry: SavedDraft = { id: activeDraftId, savedAt: new Date().toISOString(), draft };
    setSavedDrafts((current) => { const next = [entry, ...current.filter((item) => item.id !== activeDraftId)].slice(0, 20); localStorage.setItem("nekopress-drafts", JSON.stringify(next)); return next; });
    setDraftStatus("草稿已保存到本机"); setDirty(false);
    const snapshot: SavedDraft = { id: `version-${Date.now()}`, savedAt: new Date().toISOString(), draft };
    setVersions((current) => { const next = [snapshot, ...current].slice(0, 10); localStorage.setItem("nekopress-versions", JSON.stringify(next)); return next; });
  }

  function updateDraft(next: Partial<Draft>) { if (typeof next.content === "string" && next.content !== draft.content) { undoStack.current.push(draft.content); if (undoStack.current.length > 80) undoStack.current.shift(); redoStack.current = []; } setDraft((current) => ({ ...current, ...next })); setDirty(true); }

  function undoContent() { const previous = undoStack.current.pop(); if (previous === undefined) return; redoStack.current.push(draft.content); setDraft((current) => ({ ...current, content: previous })); setDirty(true); }
  function redoContent() { const next = redoStack.current.pop(); if (next === undefined) return; undoStack.current.push(draft.content); setDraft((current) => ({ ...current, content: next })); setDirty(true); }

  function newPost() { setDraft({ ...emptyDraft, author: siteSettings.author || "Neko", category: siteSettings.defaultCategory || "随笔" }); setActiveDraftId(`draft-${Date.now()}`); setEditingId(null); setDirty(false); setMessage(""); setPanel("editor"); }

  function editPost(post: Post) { setDraft({ title: post.title, slug: post.slug, excerpt: post.excerpt, category: post.category, author: post.author, coverImage: post.coverImage ?? "", content: post.content }); setActiveDraftId(`post-${post.id}`); setEditingId(post.id); setDirty(false); setMessage(""); setPanel("editor"); }

  async function refreshPosts() {
    setState("connecting"); setMessage("正在读取仓库中的最新文章…");
    try { const current = await readRepoFile<Post[]>("data/posts.json"); setRemotePosts(current.data); setState("success"); setMessage(`已同步 ${current.data.length} 篇文章。`); }
    catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "同步失败。"); }
  }

  function insertMarkdown(prefix: string, suffix = prefix, placeholder = "文字") {
    const area = editorRef.current; if (!area) return;
    let { start, end } = selectionRef.current; const selected = draft.content.slice(start, end) || placeholder;
    const heading = prefix.match(/^(#{1,6})\s$/);
    if (heading) {
      const lineStart = draft.content.lastIndexOf("\n", Math.max(0, start - 1)) + 1; const nextBreak = draft.content.indexOf("\n", end); const lineEnd = nextBreak < 0 ? draft.content.length : nextBreak;
      const currentLine = draft.content.slice(lineStart, lineEnd); const selectedLine = draft.content.slice(start, end).trim(); const title = (selectedLine || currentLine.replace(/^(?:#{1,6}\s*)+/, "").trim() || placeholder).replace(/(?:#{1,6}\s*)+/g, "").trim();
      const insertion = `${heading[1]} ${title}`; updateDraft({ content: `${draft.content.slice(0, lineStart)}${insertion}${draft.content.slice(lineEnd)}` }); const caret = lineStart + insertion.length; selectionRef.current = { start: caret, end: caret }; requestAnimationFrame(() => { area.focus(); area.setSelectionRange(caret, caret); }); return;
    }
    const block = /^(#{1,6}\s|>\s|-\s|\d+\.\s|```|\n?---|\n?\|)/.test(prefix); const lead = block && start > 0 && draft.content[start - 1] !== "\n" ? "\n" : ""; const trail = block && draft.content[end] && draft.content[end] !== "\n" ? "\n" : "";
    const insertion = `${lead}${prefix}${selected}${suffix}${trail}`; updateDraft({ content: `${draft.content.slice(0, start)}${insertion}${draft.content.slice(end)}` });
    const caret = start + lead.length + prefix.length + selected.length + suffix.length + trail.length; selectionRef.current = { start: caret, end: caret };
    requestAnimationFrame(() => { area.focus(); area.setSelectionRange(caret, caret); });
  }

  function replaceAllContent() { if (!findText) return; updateDraft({ content: draft.content.split(findText).join(replaceText) }); }
  function normalizeMarkdown() { updateDraft({ content: draft.content.replace(/([^\n])\s*(#{2,6})\s*/g, "$1\n$2 ").replace(/^(#{2,6})\s*(?:\1\s*)+/gm, "$1 ") }); }
  function jumpToContent(index: number) { const area = editorRef.current; if (!area) return; area.focus(); area.setSelectionRange(index, index); area.scrollTop = Math.max(0, index / Math.max(1, draft.content.length) * area.scrollHeight - 80); }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) { setState("error"); setMessage("请选择不超过 5MB 的图片文件。"); return; }
    setState("uploading"); setMessage("正在上传图片…");
    try {
      const prepared = await prepareImage(file);
      const extension = prepared.extension;
      const name = `${slugify(draft.title || "cover")}-${Date.now()}.${extension}`;
      const body = JSON.stringify({ message: `upload: ${name}`, content: prepared.content, branch: config.branch.trim() });
      const response = await fetch(contentsApi(`public/images/${name}`), { method: "PUT", headers: { ...headers(), "Content-Type": "application/json" }, body });
      if (!response.ok) throw new Error("图片上传失败，请检查 Contents 写入权限。");
      updateDraft({ coverImage: `./images/${name}` }); setState("success"); setMessage("图片已上传并设为封面。");
    } catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "图片上传失败。"); }
    finally { event.target.value = ""; }
  }

  async function uploadInlineImage(event: DragEvent<HTMLTextAreaElement>) {
    event.preventDefault(); const file = Array.from(event.dataTransfer.files).find((item) => item.type.startsWith("image/")); if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setState("error"); setMessage("正文图片不能超过 5MB。"); return; }
    setState("uploading"); setMessage("正在上传正文图片…");
    try { const prepared = await prepareImage(file); const name = `${slugify(draft.title || "article")}-inline-${Date.now()}.${prepared.extension}`; const body = JSON.stringify({ message: `upload: ${name}`, content: prepared.content, branch: config.branch.trim() }); const response = await fetch(contentsApi(`public/images/${name}`), { method: "PUT", headers: { ...headers(), "Content-Type": "application/json" }, body }); if (!response.ok) throw new Error("正文图片上传失败。"); updateDraft({ content: `${draft.content.trimEnd()}\n\n![${file.name}](./images/${name})\n` }); setState("success"); setMessage("图片已插入正文末尾。"); }
    catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "图片上传失败。"); }
  }

  async function uploadBodyMedia(file: File, kind: "image" | "audio") {
    const limit = kind === "audio" ? 15 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > limit) { setState("error"); setMessage(kind === "audio" ? "音频文件不能超过 15MB。" : "图片不能超过 5MB。"); return; }
    setState("uploading"); setMessage(`正在上传${kind === "audio" ? "音频" : "图片"}…`);
    try { const prepared = kind === "image" ? await prepareImage(file) : { content: await fileToBase64(file), extension: file.name.split(".").pop()?.toLowerCase() || "mp3" }; const name = `${slugify(draft.title || "article")}-${kind}-${Date.now()}.${prepared.extension}`; const folder = kind === "audio" ? "audio" : "images"; const body = JSON.stringify({ message: `upload: ${name}`, content: prepared.content, branch: config.branch.trim() }); const response = await fetch(contentsApi(`public/${folder}/${name}`), { method: "PUT", headers: { ...headers(), "Content-Type": "application/json" }, body }); if (!response.ok) throw new Error("媒体文件上传失败，请检查仓库写入权限。"); const audioTitle = file.name.replace(/\.[^.]+$/, "").replace(/\]/g, "").trim() || "文章音频"; const markdown = kind === "audio" ? `\n\n@[audio:${audioTitle}](./audio/${name})\n` : `\n\n![${file.name}](./images/${name})\n`; updateDraft({ content: `${draft.content.trimEnd()}${markdown}` }); setState("success"); setMessage(`${kind === "audio" ? "音频" : "图片"}已上传并插入正文。`); }
    catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "媒体上传失败。"); }
  }

  async function publish() {
    if (!config.owner || !config.repo || !token || !draft.title.trim() || !draft.content.trim()) {
      setState("error"); setMessage("请补全仓库信息、令牌、标题与正文。"); return;
    }
    if (slugDuplicate) { setState("error"); setMessage("文章链接已被使用，请更换后再发布。"); return; }
    if (mediaCheck !== "ok") { setState("error"); setMessage(mediaCheck === "error" ? "部分本地媒体无法访问，请修复链接后再发布。" : "媒体仍在检查，请稍候再试。"); return; }
    setState("publishing"); setDeploymentStage(0); setMessage("");
    try {
      const previousRun = await latestRun();
      const current = await readRepoFile<Post[]>("data/posts.json");
      if (current.data.some((post) => post.slug === preview.slug && post.id !== editingId)) throw new Error("已有文章使用相同标题或链接，请修改标题后再发布。");
      const nextPost = { ...preview, id: editingId ?? `${preview.slug}-${Date.now()}`, date: editingId ? current.data.find((post) => post.id === editingId)?.date ?? preview.date : preview.date };
      const nextPosts = editingId ? current.data.map((post) => post.id === editingId ? nextPost : post) : [nextPost, ...current.data];
      await writeRepoFile("data/posts.json", nextPosts, editingId ? `update: ${draft.title}` : `publish: ${draft.title}`, current.sha);
      setRemotePosts(nextPosts); setEditingId(nextPost.id); setDirty(false); localStorage.removeItem("nekopress-draft");
      setSavedDrafts((currentDrafts) => { const nextDrafts = currentDrafts.filter((item) => item.id !== activeDraftId); localStorage.setItem("nekopress-drafts", JSON.stringify(nextDrafts)); return nextDrafts; });
      await waitForDeployment(previousRun?.id ?? null);
    } catch (error) {
      setState("error"); setMessage(error instanceof Error ? error.message : "发布失败，请稍后重试。");
    }
  }

  async function deletePost(post: Post) {
    setState("publishing"); setDeploymentStage(0); setMessage("正在删除文章…");
    try { const previousRun = await latestRun(); const current = await readRepoFile<Post[]>("data/posts.json"); const next = current.data.filter((item) => item.id !== post.id); await writeRepoFile("data/posts.json", next, `delete: ${post.title}`, current.sha); setRemotePosts(next); if (editingId === post.id) newPost(); await waitForDeployment(previousRun?.id ?? null); }
    catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "删除失败。"); }
  }

  async function saveSettings() {
    setState("publishing"); setDeploymentStage(0); setMessage("正在保存博客设置…");
    try { const previousRun = await latestRun(); let sha: string | undefined; try { sha = (await readRepoFile<SiteSettings>("data/settings.json")).sha; } catch { /* first settings file */ } await writeRepoFile("data/settings.json", siteSettings, "update: blog settings", sha); await waitForDeployment(previousRun?.id ?? null); }
    catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "设置保存失败。"); }
  }

  function exportSettings() { const blob = new Blob([JSON.stringify(siteSettings, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "nekopress-settings.json"; link.click(); URL.revokeObjectURL(url); }

  async function importSettings(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; try { const next = JSON.parse(await file.text()) as Partial<SiteSettings>; setSiteSettings({ ...initialSettings, ...next }); setState("success"); setMessage("设置已导入，请检查后点击保存。"); } catch { setState("error"); setMessage("设置文件格式无效，请选择 NekoPress 导出的 JSON 文件。"); } finally { event.target.value = ""; } }

  return <div className="admin-shell">
    <header className="admin-top"><button className="brand" onClick={() => go()}>Neko<span>Press</span></button><div>{connected && <span className="connected-chip"><CheckCircle2 /> 已连接 {config.owner}/{config.repo}</span>}<Button variant="ghost" onClick={() => go()}><LogOut />退出后台</Button></div></header>
    {!connected ? <main className="connect-layout">
      <aside className="admin-guide connect-guide">
        <div className="guide-icon"><GitBranch /></div><p className="eyebrow">GITHUB PUBLISHING</p><h1>先连接仓库，<br/>再专心写作。</h1><span>令牌只保存在当前标签页会话中，刷新页面不会退出，关闭标签页后自动清除。</span>
        <ol><li><b>01</b><span>创建 fine-grained token</span></li><li><b>02</b><span>授予此仓库 Contents 读写权限</span></li><li><b>03</b><span>验证成功后进入编辑器</span></li></ol>
      </aside>
      <section className="connect-card">
        <div className="form-heading"><div><KeyRound /><span><b>连接博客仓库</b><small>验证 data/posts.json 是否可读写</small></span></div><span className="secure-chip">会话内保持</span></div>
        <div className="repo-grid">
          <Field label="GitHub 用户名"><Input value={config.owner} onChange={(e) => setConfig({ ...config, owner: e.target.value })} placeholder="your-name" /></Field>
          <Field label="仓库名"><Input value={config.repo} onChange={(e) => setConfig({ ...config, repo: e.target.value })} placeholder="my-blog" /></Field>
          <Field label="分支"><Input value={config.branch} onChange={(e) => setConfig({ ...config, branch: e.target.value })} placeholder="main" /></Field>
          <Field label="Fine-grained token"><div className="token-input"><Input type={showToken ? "text" : "password"} value={token} onChange={(e) => { setToken(e.target.value.replace(/\s/g, "")); if (state === "error") { setState("idle"); setMessage(""); } }} placeholder="粘贴 github_pat_ 开头的令牌" autoComplete="off" spellCheck={false} required aria-invalid={state === "error" && !token.trim()} /><button type="button" onClick={() => setShowToken(!showToken)} aria-label={showToken ? "隐藏令牌" : "显示令牌"}>{showToken ? <EyeOff /> : <Eye />}</button></div><small className="token-hint">当前标签页刷新后仍有效 · <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">创建令牌</a> · 权限选择 Contents: Read and write</small></Field>
        </div>
        {message && <output className={`status-message ${state}`}>{message}</output>}
        <Button className="connect-button" onClick={() => void connect()} disabled={state === "connecting"}>{state === "connecting" ? <LoaderCircle className="spin" /> : <GitBranch />} {state === "connecting" ? "正在验证…" : "连接并开始写作"}</Button>
      </section>
    </main> : <main className={`admin-workspace ${focusMode ? "focus-mode" : ""}`}>
      <aside className="admin-sidebar">
        <div className="workspace-id"><span>{siteSettings.name.slice(0, 1)}</span><div><b>{siteSettings.name}</b><small>{config.owner}/{config.repo}</small></div></div>
        <nav><button className={panel === "dashboard" ? "active" : ""} onClick={() => setPanel("dashboard")}><BarChart3 />概览</button><button className={panel === "posts" ? "active" : ""} onClick={() => setPanel("posts")}><List />文章 <span>{remotePosts.length}</span></button><button className={panel === "editor" ? "active" : ""} onClick={() => setPanel("editor")}><PenLine />写作{dirty && <i className="nav-dot" />}</button><button className={panel === "media" ? "active" : ""} onClick={() => setPanel("media")}><ImagePlus />媒体</button><button className={panel === "drafts" ? "active" : ""} onClick={() => setPanel("drafts")}><Save />草稿 <span>{savedDrafts.length}</span></button><button className={panel === "settings" ? "active" : ""} onClick={() => setPanel("settings")}><Settings />设置{settingsDirty && <i className="nav-dot" />}</button></nav>
        <div className="sidebar-bottom"><div className="connection-card"><span><i/>仓库已连接</span><b>{config.branch}</b><p><LockKeyhole />刷新保持登录，关闭标签页后自动清除。</p></div><button onClick={() => { sessionStorage.removeItem("nekopress-token"); setToken(""); setConnected(false); }}><KeyRound />断开并清除令牌</button></div>
      </aside>

      <section className="workspace-main">
        <header className="workspace-heading"><div><p>{panel === "dashboard" ? "OVERVIEW" : panel === "posts" ? "CONTENT" : panel === "media" ? "MEDIA" : panel === "drafts" ? "DRAFTS" : panel === "settings" ? "SETTINGS" : "EDITOR"}</p><h1>{panel === "dashboard" ? `晚上好，${siteSettings.author}` : panel === "posts" ? "文章管理" : panel === "media" ? "媒体资源" : panel === "drafts" ? "本机草稿" : panel === "settings" ? "博客设置" : editingId ? "编辑文章" : "写一篇新文章"}</h1></div><div className="workspace-actions">{panel === "editor" && <Button className="focus-toggle" variant="outline" onClick={() => setFocusMode(!focusMode)}>{focusMode ? <Minimize2 /> : <Maximize2 />}{focusMode ? "退出专注" : "专注模式"}</Button>}{panel !== "settings" && <Button onClick={newPost}><FilePlus2 />新文章</Button>}</div></header>
        {message && <output className={`status-message workspace-status ${state}`}>{state === "success" ? <CheckCircle2 /> : state === "deploying" || state === "publishing" || state === "uploading" ? <LoaderCircle className="spin" /> : null}<span>{message}</span></output>}
        {deploymentStage > 0 && <div className="deployment-progress"><div className={deploymentStage >= 1 ? "done" : ""}><span>{deploymentStage > 1 ? <CheckCircle2 /> : "1"}</span><b>提交内容</b></div><i/><div className={deploymentStage >= 2 ? "done" : ""}><span>{deploymentStage > 2 ? <CheckCircle2 /> : "2"}</span><b>构建网站</b></div><i/><div className={deploymentStage >= 3 ? "done" : ""}><span>{deploymentStage >= 3 ? <CheckCircle2 /> : "3"}</span><b>正式上线</b></div></div>}

        {panel === "dashboard" && <div className="dashboard-grid"><div className="dashboard-stats"><article><span><FileText /></span><b>{remotePosts.length}</b><small>已发布文章</small></article><article><span><ListFilter /></span><b>{categories.length - 1}</b><small>内容分类</small></article><article><span><Clock3 /></span><b>{Math.max(1, Math.ceil(totalWords / 500))}</b><small>累计阅读分钟</small></article></div><section className="recent-panel"><div><h2>最近文章</h2><button onClick={() => setPanel("posts")}>查看全部 <ArrowRight /></button></div>{remotePosts.slice(0,4).map((post) => <button className="recent-row" key={post.id} onClick={() => editPost(post)}><span className={coverTone(post.category)}>{post.category.slice(0,1)}</span><div><b>{post.title}</b><small>{post.category} · {post.date}</small></div><Pencil /></button>)}</section><SiteHealth run={lastRun} onRefresh={() => void latestRun().then(setLastRun)} /></div>}

        {panel === "posts" && <><div className="content-stats"><article><FileText /><span><b>{remotePosts.length}</b><small>已发布文章</small></span></article><article><BarChart3 /><span><b>{categories.length - 1}</b><small>内容分类</small></span></article><article><Clock3 /><span><b>{Math.max(1, Math.ceil(totalWords / 500))}</b><small>分钟总阅读量</small></span></article></div><div className="manage-panel">
          <div className="post-tools"><label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题或摘要" /></label><label><ListFilter /><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label><ArrowUpRight /><select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}><option value="newest">最新发布</option><option value="oldest">最早发布</option><option value="title">按标题</option></select></label><button className="sync-button" onClick={() => void refreshPosts()} disabled={state === "connecting"}><RefreshCw className={state === "connecting" ? "spin" : ""} />同步</button></div>
          <div className="admin-post-list">{visiblePosts.length ? visiblePosts.map((post) => <article key={post.id}><div className={`admin-post-cover ${coverTone(post.category)}`}>{post.coverImage ? <img src={post.coverImage} alt="" /> : post.category.slice(0, 1)}</div><div><small>{post.category} · {post.date} · {post.readMinutes} 分钟</small><h2>{post.title}</h2><p>{post.excerpt}</p></div><div className="post-row-actions"><button onClick={() => go(`post/${post.slug}`)}><Eye />预览</button><button onClick={() => editPost(post)}><Pencil />编辑</button><button className="danger" onClick={() => setDeleteTarget(post)}><Trash2 />删除</button></div></article>) : <div className="list-empty"><FileText /><p>没有符合条件的文章</p><Button onClick={newPost}><FilePlus2 />写一篇新文章</Button></div>}</div>
        </div></>}

        {panel === "media" && <section className="manage-panel media-library"><header><div><h2>已使用的媒体</h2><p>汇总所有文章中的封面、正文图片和音频，可直接复用。</p></div><b>{mediaLibrary.length} 个资源</b></header>{mediaLibrary.length ? <div>{mediaLibrary.map((item) => <article key={item.url}><span className={`media-thumb ${item.type}`}>{item.type === "image" ? <img src={item.url} alt="" loading="lazy" /> : <Music2 />}</span><div><b>{item.url.split("/").pop()}</b><small>{item.type === "image" ? "图片" : "音频"} · 用于 {item.posts.length} 篇文章</small><p>{item.posts.join("、")}</p></div><button onClick={() => { const markdown = item.type === "audio" ? `\n\n@[audio:文章音频](${item.url})\n` : `\n\n![图片说明](${item.url})\n`; updateDraft({ content: `${draft.content.trimEnd()}${markdown}` }); setPanel("editor"); }}><Copy />插入正文</button></article>)}</div> : <div className="list-empty"><ImagePlus /><p>还没有文章媒体</p></div>}</section>}

        {panel === "drafts" && <section className="manage-panel draft-library"><header><div><h2>本机草稿</h2><p>自动保存最近 20 份内容，仅存放在当前设备。</p></div><b>{savedDrafts.length} 份</b></header>{savedDrafts.length ? <div>{savedDrafts.map((item) => <button key={item.id} onClick={() => { setDraft({ ...emptyDraft, ...item.draft }); setActiveDraftId(item.id); setEditingId(item.id.startsWith("post-") ? item.id.slice(5) : null); setDirty(false); setPanel("editor"); }}><span><Save /></span><div><b>{item.draft.title || "未命名草稿"}</b><small>{new Date(item.savedAt).toLocaleString("zh-CN")} · {item.draft.content.replace(/\s/g, "").length} 字</small></div><ArrowRight /></button>)}</div> : <div className="list-empty"><Save /><p>还没有保存的草稿</p><Button onClick={newPost}>开始写作</Button></div>}</section>}

        {panel === "editor" && <div className="editor-workspace">
          <div className="mobile-editor-tabs"><button type="button" className={!mobilePreview ? "active" : ""} onClick={() => setMobilePreview(false)}><PenLine />编辑</button><button type="button" className={mobilePreview ? "active" : ""} onClick={() => setMobilePreview(true)}><Eye />预览</button></div>
          <form className={`editor-panel ${mobilePreview ? "mobile-hidden" : ""}`} onSubmit={(event) => { event.preventDefault(); setShowPublishCheck(true); }}>
            <section className="write-section">
              <div className="form-heading"><div><PenLine /><span><b>{editingId ? "编辑现有文章" : "新文章"}</b><small>{draftStatus} · Ctrl/⌘ + S 保存</small></span></div><span className="completion-chip">{[draft.title.trim(), draft.excerpt.trim(), draft.content.trim()].filter(Boolean).length}/3 已完成</span></div>
              <div className="writer-title"><Input className="title-input" value={draft.title} onChange={(e) => { const title = e.target.value; const autoSlug = !draft.slug || draft.slug === slugify(draft.title); updateDraft({ title, ...(autoSlug ? { slug: slugify(title) } : {}) }); }} placeholder="给这篇文章一个好标题" /><p>{draft.title.length} 字 · {editingId ? "正在编辑已发布文章" : "新文章"}</p></div>
              <div className="editor-meta-strip"><Field label="分类"><Input value={draft.category} onChange={(e) => updateDraft({ category: e.target.value })} /></Field><Field label="作者"><Input value={draft.author} onChange={(e) => updateDraft({ author: e.target.value })} /></Field><Field label="文章链接"><Input className={slugDuplicate ? "input-error" : ""} value={draft.slug} onChange={(e) => updateDraft({ slug: slugifyInput(e.target.value) })} placeholder={slugify(draft.title) || "article-url"} aria-invalid={slugDuplicate} />{slugDuplicate && <small className="field-error">该链接已被其他文章使用</small>}</Field></div>
              <Field label="封面图片"><div className="cover-field"><Input value={draft.coverImage} onChange={(e) => updateDraft({ coverImage: e.target.value })} placeholder="图片 URL，或直接上传" /><Button type="button" variant="outline" onClick={() => imageRef.current?.click()} disabled={state === "uploading"}><ImagePlus />上传</Button><input ref={imageRef} className="file-input" type="file" accept="image/*" onChange={(event) => void uploadImage(event)} /></div>{draft.coverImage && <div className="cover-preview"><img src={draft.coverImage} alt="封面预览" /><button type="button" onClick={() => updateDraft({ coverImage: "" })}><X />移除封面</button></div>}<small className="token-hint">上传时会自动压缩大图；支持 JPG、PNG、WebP、GIF 和 SVG，最大 5MB</small></Field>
              <Field label="摘要"><Textarea className="summary-input" value={draft.excerpt} onChange={(e) => updateDraft({ excerpt: e.target.value })} placeholder="用一两句话说明这篇文章讲什么" /></Field>
              <div className="editor-assist"><details className="format-more"><summary>更多格式与工具</summary><div className="advanced-toolbar"><button type="button" onClick={() => insertMarkdown("### ", "", "三级标题")}><Heading2 />H3</button><button type="button" onClick={() => insertMarkdown("1. ", "", "有序列表")}><ListOrdered />有序列表</button><button type="button" onClick={() => insertMarkdown("- [ ] ", "", "待办事项")}><CheckCircle2 />任务</button><button type="button" onClick={() => insertMarkdown("~~", "~~", "删除文字")}><Strikethrough />删除线</button><button type="button" onClick={() => insertMarkdown("`", "`", "代码")}><Code2 />行内代码</button><button type="button" onClick={() => insertMarkdown("\n| 标题 | 内容 |\n| --- | --- |\n| 项目 | 说明 |\n", "", "")}><Table2 />表格</button><button type="button" onClick={() => setShowFind(!showFind)}><Search />查找替换</button><button type="button" onClick={() => setShowOutline(!showOutline)}><List />文章目录</button></div></details>{showFind && <div className="find-replace"><Input value={findText} onChange={(event) => setFindText(event.target.value)} placeholder="查找内容" autoFocus/><Input value={replaceText} onChange={(event) => setReplaceText(event.target.value)} placeholder="替换为"/><Button type="button" variant="outline" onClick={replaceAllContent}>全部替换</Button></div>}</div>
              {contentWarnings.length > 0 && <div className="content-warnings"><b>写作建议</b>{contentWarnings.map((warning) => <span key={warning}>{warning}</span>)}<button type="button" onClick={normalizeMarkdown}>一键整理</button></div>}
              <Field label="正文"><div className="markdown-toolbar" aria-label="Markdown 工具栏"><button type="button" onClick={undoContent} title="撤销"><Undo2 />撤销</button><button type="button" onClick={redoContent} title="重做"><Redo2 />重做</button><i/><button type="button" onClick={() => insertMarkdown("## ", "", "小标题")}><Heading2 />标题</button><button type="button" onClick={() => insertMarkdown("**", "**")}><Bold />粗体</button><button type="button" onClick={() => insertMarkdown("> ", "", "引用内容")}><Quote />引用</button><button type="button" onClick={() => insertMarkdown("- ", "", "列表项目")}><List />列表</button><button type="button" onClick={() => insertMarkdown("[", "](https://)", "链接文字")}><Link2 />链接</button><button type="button" onClick={() => insertMarkdown("```\n", "\n```", "代码")}><Code2 />代码</button><button type="button" onClick={() => insertMarkdown("\n---\n", "", "")}><Minus />分隔线</button><i/><button type="button" className="media-tool" onClick={() => inlineImageRef.current?.click()}><ImagePlus />图片</button><button type="button" className="media-tool" onClick={() => audioRef.current?.click()}><Music2 />音频</button><input ref={inlineImageRef} className="file-input" type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadBodyMedia(file, "image"); event.target.value = ""; }} /><input ref={audioRef} className="file-input" type="file" accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadBodyMedia(file, "audio"); event.target.value = ""; }} /></div><Textarea ref={editorRef} className="content-editor" value={draft.content} onChange={(e) => updateDraft({ content: e.target.value })} onSelect={(event) => { selectionRef.current = { start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd }; }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => void uploadInlineImage(event)} placeholder="开始写作，也可以把图片拖到这里…" /></Field>
            </section>
            <div className="publish-row"><p><Eye /> {draft.content.length} 字 · 约 {preview.readMinutes} 分钟阅读</p><div><Button type="button" variant="outline" onClick={saveDraft}><Save />保存草稿</Button><Button type="submit" size="lg" disabled={state === "publishing" || state === "deploying"}>{state === "publishing" ? <LoaderCircle className="spin" /> : <Send />} {state === "publishing" ? "正在提交…" : editingId ? "更新文章" : "发布文章"}</Button></div></div>
          </form>
          {showOutline && <aside className="editor-outline"><header><b>文章结构</b><small>{editorOutline.length} 个标题</small></header>{editorOutline.length ? editorOutline.map((item) => <button type="button" className={`level-${item.level}`} key={`${item.index}-${item.title}`} onClick={() => jumpToContent(item.index)}>{item.title}</button>) : <p>使用 H2、H3 标题后会自动生成目录。</p>}<details><summary>历史版本（{versions.length}）</summary>{versions.slice(0, 5).map((item) => <button type="button" key={item.id} onClick={() => { setDraft(item.draft); setDirty(true); }}>{new Date(item.savedAt).toLocaleString("zh-CN")} · 恢复</button>)}</details></aside>}
          <aside className={`preview-panel article-preview preview-${previewSize} ${mobilePreview ? "mobile-visible" : ""}`}><div className="preview-browser"><i/><i/><i/><div className="preview-size"><button className={previewSize === "desktop" ? "active" : ""} onClick={() => setPreviewSize("desktop")}>电脑</button><button className={previewSize === "tablet" ? "active" : ""} onClick={() => setPreviewSize("tablet")}>平板</button><button className={previewSize === "mobile" ? "active" : ""} onClick={() => setPreviewSize("mobile")}>手机</button></div></div><header><small>{preview.category} · {formatDate(preview.date)}</small><h2>{preview.title}</h2><p>{preview.excerpt}</p><div><b>{preview.author.slice(0,1)}</b><span>{preview.author}<small>{preview.readMinutes} 分钟阅读</small></span></div></header><div className={`mini-cover ${coverTone(preview.category)} ${preview.coverImage ? "has-image" : ""}`}>{preview.coverImage && <img src={preview.coverImage} alt="" />}<span>{preview.category}</span></div><div className="mini-body"><Markdown content={preview.content} /></div></aside>
        </div>}

        {panel === "settings" && <form className="settings-groups" onSubmit={(event) => { event.preventDefault(); void saveSettings(); }}>
          <section className="settings-panel"><div className="settings-intro"><FileText /><div><h2>基础信息</h2><p>决定站点名称、默认署名与内容基调。</p></div></div><div className="settings-grid"><Field label="博客名称"><Input value={siteSettings.name} onChange={(e) => setSiteSettings({ ...siteSettings, name: e.target.value })} /></Field><Field label="默认作者"><Input value={siteSettings.author} onChange={(e) => setSiteSettings({ ...siteSettings, author: e.target.value })} /></Field><Field label="默认文章分类"><Input value={siteSettings.defaultCategory} onChange={(e) => setSiteSettings({ ...siteSettings, defaultCategory: e.target.value })} /></Field></div><Field label="博客简介"><Textarea value={siteSettings.description} onChange={(e) => setSiteSettings({ ...siteSettings, description: e.target.value })} /></Field></section>
          <section className="settings-panel"><div className="settings-intro"><Sparkles /><div><h2>首页展示</h2><p>控制访客进入网站后首先看到的内容。</p></div></div><Field label="首页主标题"><Input value={siteSettings.tagline} onChange={(e) => setSiteSettings({ ...siteSettings, tagline: e.target.value })} /></Field><div className="settings-grid"><Field label="首页文章数量"><Input type="number" min={1} max={30} value={siteSettings.postsPerPage} onChange={(e) => setSiteSettings({ ...siteSettings, postsPerPage: Math.max(1, Math.min(30, Number(e.target.value) || 9)) })} /></Field><Field label="关于区域标题"><Input value={siteSettings.footer} onChange={(e) => setSiteSettings({ ...siteSettings, footer: e.target.value })} /></Field></div></section>
          <section className="settings-panel"><div className="settings-intro"><GitBranch /><div><h2>链接与页脚</h2><p>补充作者主页和全站版权信息。</p></div></div><div className="settings-grid"><Field label="GitHub 链接"><Input type="url" value={siteSettings.github} aria-invalid={Boolean(siteSettings.github && !/^https:\/\//.test(siteSettings.github))} onChange={(e) => setSiteSettings({ ...siteSettings, github: e.target.value })} /><small className="token-hint">请输入完整的 https:// 地址</small></Field><Field label="页脚版权文字"><Input value={siteSettings.copyright} onChange={(e) => setSiteSettings({ ...siteSettings, copyright: e.target.value })} /></Field></div></section>
          <div className="settings-submit"><span>保存后将自动触发网站更新</span><input ref={settingsImportRef} className="file-input" type="file" accept="application/json" onChange={(event) => void importSettings(event)} /><details className="settings-more"><summary>更多</summary><div><Button type="button" variant="outline" onClick={() => setSiteSettings(initialSettings)}><RotateCcw />恢复默认</Button><Button type="button" variant="outline" onClick={() => settingsImportRef.current?.click()}><Upload />导入</Button><Button type="button" variant="outline" onClick={exportSettings}><Download />导出</Button></div></details><Button type="submit" size="lg" disabled={state === "publishing" || state === "deploying"}><Save />保存设置</Button></div>
        </form>}
      </section>
    </main>}
    {showPublishCheck && <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowPublishCheck(false)}><section className="publish-check" role="dialog" aria-modal="true" aria-labelledby="publish-check-title" onMouseDown={(event) => event.stopPropagation()}><header><span><CheckCircle2 /></span><div><h2 id="publish-check-title">发布前检查</h2><p>确认文章信息完整后再提交到 GitHub。</p></div><button onClick={() => setShowPublishCheck(false)} aria-label="关闭"><X /></button></header><ul><li className={draft.title.trim() ? "ok" : ""}><span>{draft.title.trim() ? <CheckCircle2 /> : "1"}</span><div><b>文章标题</b><small>{draft.title.trim() || "尚未填写"}</small></div></li><li className={!slugDuplicate && draft.slug ? "ok" : "error"}><span>{!slugDuplicate && draft.slug ? <CheckCircle2 /> : "2"}</span><div><b>文章链接</b><small>{slugDuplicate ? "链接与已有文章重复" : draft.slug || "请填写文章链接"}</small></div></li><li className={draft.excerpt.trim().length >= 20 ? "ok" : "optional"}><span>{draft.excerpt.trim().length >= 20 ? <CheckCircle2 /> : "3"}</span><div><b>文章摘要</b><small>{draft.excerpt.trim() ? `${draft.excerpt.length} 字${draft.excerpt.length < 20 ? "，建议至少 20 字" : ""}` : "建议填写简短摘要"}</small></div></li><li className={draft.content.replace(/\s/g, "").length >= 50 ? "ok" : "optional"}><span>{draft.content.trim() ? <CheckCircle2 /> : "4"}</span><div><b>正文内容</b><small>{draft.content.replace(/\s/g, "").length} 字 · 约 ${preview.readMinutes} 分钟${draft.content.replace(/\s/g, "").length < 50 ? "，内容略短" : ""}</small></div></li><li className={`media-status ${mediaCheck === "ok" ? "ok" : mediaCheck === "error" ? "error" : ""}`}><span>{mediaCheck === "checking" ? <LoaderCircle className="spin" /> : mediaCheck === "ok" ? <CheckCircle2 /> : "5"}</span><div><b>媒体链接</b><small>{mediaCheck === "checking" ? "正在检查本地图片和音频…" : mediaCheck === "error" ? "发现无法访问的本地媒体" : draftMedia.length ? `已检查 ${draftMedia.length} 个媒体链接` : "正文未使用媒体"}</small></div></li><li className={draft.coverImage ? "ok optional" : "optional"}><span>{draft.coverImage ? <CheckCircle2 /> : <ImagePlus />}</span><div><b>文章封面</b><small>{draft.coverImage ? "已设置" : "可选，未设置时使用分类封面"}</small></div></li></ul><footer><Button variant="outline" onClick={() => setShowPublishCheck(false)}>继续编辑</Button><Button disabled={!draft.title.trim() || !draft.content.trim() || !draft.slug || slugDuplicate || mediaCheck !== "ok"} onClick={() => { setShowPublishCheck(false); void publish(); }}><Send />确认{editingId ? "更新" : "发布"}</Button></footer></section></div>}
    {deleteTarget && <div className="modal-backdrop" role="presentation" onMouseDown={() => setDeleteTarget(null)}><section className="publish-check delete-check" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" onMouseDown={(event) => event.stopPropagation()}><header><span><Trash2 /></span><div><h2 id="delete-title">删除这篇文章？</h2><p>《{deleteTarget.title}》将从网站移除。</p></div><button onClick={() => setDeleteTarget(null)} aria-label="关闭"><X /></button></header><div className="delete-note"><LockKeyhole />GitHub 会保留历史版本，必要时仍可恢复。</div><footer><Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button><Button className="danger-confirm" onClick={() => { const post = deleteTarget; setDeleteTarget(null); void deletePost(post); }}><Trash2 />确认删除</Button></footer></section></div>}
  </div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="form-field"><span>{label}</span>{children}</label>;
}

function slugify(value: string) {
  const latin = value.toLowerCase().trim().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-|-$/g, "");
  return latin || `post-${new Date().toISOString().slice(0, 10)}`;
}

function slugifyInput(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff-]+/g, "-").replace(/-{2,}/g, "-").replace(/^-/, "");
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

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("无法读取图片文件。"));
    reader.readAsDataURL(file);
  });
}

async function prepareImage(file: File): Promise<{ content: string; extension: string }> {
  const originalExtension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  if (file.type === "image/gif" || file.type === "image/svg+xml" || file.size < 700 * 1024) return { content: await fileToBase64(file), extension: originalExtension };
  const bitmap = await createImageBitmap(file); const scale = Math.min(1, 1800 / bitmap.width);
  const canvas = document.createElement("canvas"); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", .84));
  if (!blob) return { content: await fileToBase64(file), extension: originalExtension };
  return { content: await fileToBase64(new File([blob], "cover.webp", { type: "image/webp" })), extension: "webp" };
}

function Footer({ settings }: { settings?: SiteSettings }) {
  return <footer className="footer site-width"><span>{settings?.copyright ?? `© 2026 ${settings?.name ?? "NekoPress"}`}</span>{settings?.github ? <a href={settings.github} target="_blank" rel="noreferrer">GitHub</a> : <span>Published with GitHub Pages</span>}</footer>;
}
