'use client';

import { lazy, Suspense } from 'react';
import type { Post, SiteSettings } from '@/types/blog';

const PublicArticle = lazy(() => import('@/components/blog-app').then((module) => ({ default: module.PublicArticle })));

export function ArticleEntry({ post, posts, settings }: { post: Post; posts: Post[]; settings: SiteSettings }) {
  return <Suspense fallback={<main className="load-fallback" aria-live="polite">正在加载文章…</main>}><PublicArticle post={post} posts={posts} settings={settings} /></Suspense>;
}
