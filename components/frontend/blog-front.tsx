/* oxlint-disable next/no-img-element */
'use client';

import { ArrowRight, ArrowUpRight, Clock3, Search, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { SiteFooter, SiteHeader } from '@/components/frontend/site-shell';
import { articleHref, assetHref } from '@/lib/site-paths';
import type { Post, SiteSettings } from '@/types/blog';
import { installGlobalErrorMonitoring } from '@/services/monitoring/client';

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(`${value}T00:00:00`));
  } catch { return value; }
}

function coverTone(category: string) {
  if (category.includes('开发') || category.includes('技术')) return 'coral';
  if (category.includes('生活')) return 'navy';
  return 'sage';
}

function PostCard({ post, featured = false }: { post: Post; featured?: boolean }) {
  return <article className={`post-card ${featured ? 'featured' : ''}`}>
    <a className="card-hit" href={articleHref(post.slug)} aria-label={`阅读：${post.title}`}>
      <div className={`post-cover ${coverTone(post.category)} ${post.coverImage ? 'has-image' : ''}`}>
        {post.coverImage && <>
          <img src={assetHref(post.coverThumbnail || post.coverImage)} alt="" width="640" height="373" style={{ objectPosition: post.coverPosition || '50% 50%', filter: `brightness(${post.coverBrightness ?? 100}%)` }} loading="lazy" decoding="async" fetchPriority="low" />
          <i className="cover-overlay" style={{ opacity: (post.coverOverlay ?? 12) / 100 }} />
        </>}
        <span>{post.category}</span><b>{post.date.slice(5).replace('-', ' / ')}</b>
      </div>
      <div className="post-content">
        <p>{featured ? "EDITOR'S PICK" : `${post.category} · ${post.author}`}</p>
        <h3>{post.title}</h3><span>{post.excerpt}</span>
        <footer><span><Clock3 size={14} /> {post.readMinutes} 分钟阅读</span><ArrowUpRight className="card-arrow" size={16} /></footer>
      </div>
    </a>
    {post.coverCredit && post.coverCreditUrl && <a className="cover-credit card-credit" href={post.coverCreditUrl} target="_blank" rel="noreferrer">图片：{post.coverCredit} / Pexels</a>}
  </article>;
}

export function BlogFront({ posts, settings }: { posts: Post[]; settings: SiteSettings }) {
  const featured = posts[0];
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('全部');
  const [visibleCount, setVisibleCount] = useState(settings.postsPerPage || 9);
  const categories = useMemo(() => ['全部', ...Array.from(new Set(posts.map((post) => post.category)))], [posts]);
  const filtered = useMemo(() => posts.filter((post) => (category === '全部' || post.category === category) && `${post.title} ${post.excerpt} ${post.author}`.toLowerCase().includes(query.toLowerCase())), [posts, category, query]);
  useEffect(() => installGlobalErrorMonitoring(), []);
  useEffect(() => {
    document.documentElement.dataset.appReady = 'true';
    return () => { delete document.documentElement.dataset.appReady; };
  }, []);

  return <>
    <a className="skip-link" href="#main-content">跳到主要内容</a>
    <SiteHeader name={settings.name} />
    <main id="main-content" className="site-width page-shell">
      <section className="hero" aria-labelledby="hero-title">
        <img src={assetHref('./hero-1200.webp')} srcSet={`${assetHref('./hero-640.webp')} 640w, ${assetHref('./hero-1200.webp')} 1200w, ${assetHref('./hero-1600.webp')} 1600w`} sizes="(max-width: 600px) calc(100vw - 24px), (max-width: 1200px) calc(100vw - 40px), 1160px" alt="夜晚书桌旁的猫与笔记本" width="1600" height="900" loading="eager" decoding="async" fetchPriority="high" />
        <div className="hero-shade" />
        <div className="hero-copy"><p><Sparkles size={14} /> NEKO EDITORIAL</p><h1 id="hero-title">{settings.tagline}</h1><span>{settings.description}</span>
          {featured && <small>{featured.category} · {formatDate(featured.date)} · {featured.readMinutes} 分钟阅读</small>}
          {featured && <a className="hero-read" href={articleHref(featured.slug)}>开始阅读 <ArrowUpRight size={16} /></a>}
        </div>
        <a className="scroll-cue" href="#latest" aria-label="查看最近文章"><span>SCROLL</span><ArrowRight /></a>
      </section>
      <section id="latest" className="section-block" aria-labelledby="latest-title">
        <div className="section-heading"><div><span>Latest stories</span><h2 id="latest-title">最近更新</h2></div><p>少一点喧闹，多一点值得读完的内容。</p></div>
        <div className="front-discovery"><div className="category-tabs" aria-label="文章分类">
          {categories.map((item) => <button className={category === item ? 'active' : ''} aria-pressed={category === item} key={item} onClick={() => { setCategory(item); setVisibleCount(settings.postsPerPage || 9); }}>{item}</button>)}
        </div><label><Search aria-hidden="true" /><input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(settings.postsPerPage || 9); }} placeholder="搜索文章" aria-label="搜索文章" />{query && <button onClick={() => setQuery('')} aria-label="清空搜索"><X /></button>}</label></div>
        <p className="sr-only" aria-live="polite">找到 {filtered.length} 篇文章</p>
        {filtered.length ? <><div className="post-grid">{filtered.slice(0, visibleCount).map((post, index) => <PostCard post={post} featured={index === 0 && !query && category === '全部'} key={post.id} />)}</div>
          {visibleCount < filtered.length && <div className="load-more"><button onClick={() => setVisibleCount((count) => count + (settings.postsPerPage || 9))}>加载更多 <ArrowRight /></button></div>}</> :
          <div className="front-empty"><Search /><h3>没有找到相关文章</h3><p>换一个关键词或分类试试看。</p><button onClick={() => { setQuery(''); setCategory('全部'); }}>查看全部文章</button></div>}
      </section>
      <section id="about" className="about-panel"><span className="cat-mark">猫</span><div><p>ABOUT THIS BLOG</p><h2>{settings.footer}</h2><span>{settings.description}</span></div></section>
    </main>
    <SiteFooter settings={settings} />
  </>;
}
