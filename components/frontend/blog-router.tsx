'use client';

import { lazy, Suspense, useEffect, useState } from 'react';
import { BlogFront } from './blog-front';
import { articleHref } from '@/lib/site-paths';
import { installGlobalErrorMonitoring } from '@/services/monitoring/client';
import type { Post, SiteSettings } from '@/types/blog';

const AdminEntry = lazy(() => import('@/components/blog-app').then((module) => ({ default: module.AdminEntry })));

function currentRoute() {
  if (typeof window === 'undefined') return 'home';
  return window.location.hash.replace(/^#\/?/, '') || 'home';
}

export function BlogRouter({ posts, settings }: { posts: Post[]; settings: SiteSettings }) {
  const [route, setRoute] = useState('home');
  useEffect(() => installGlobalErrorMonitoring(), []);
  useEffect(() => {
    document.documentElement.dataset.appReady = 'true';
    const sync = () => setRoute(currentRoute());
    sync();
    window.addEventListener('hashchange', sync);
    return () => { delete document.documentElement.dataset.appReady; window.removeEventListener('hashchange', sync); };
  }, []);
  useEffect(() => {
    if (!route.startsWith('post/')) return;
    try { window.location.replace(articleHref(decodeURIComponent(route.slice(5)))); }
    catch { window.location.replace(articleHref(route.slice(5))); }
  }, [route]);

  if (route === 'admin') return <Suspense fallback={<main className="admin-auth-loading" aria-live="polite">正在加载后台…</main>}><AdminEntry posts={posts} initialSettings={settings} /></Suspense>;
  if (route.startsWith('post/')) return <main className="load-fallback" aria-live="polite">正在打开文章…</main>;
  return <BlogFront posts={posts} settings={settings} />;
}
