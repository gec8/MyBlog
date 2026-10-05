import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleEntry } from '@/components/article/article-entry';
import postsData from '@/data/posts.json';
import settings from '@/data/settings.json';
import type { Post } from '@/types/blog';

const posts = postsData as Post[];
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
function absoluteAsset(source?: string) {
  if (!source) return undefined;
  if (/^https?:/i.test(source)) return source;
  return `${siteUrl}/${source.replace(/^\.?(?:\/|\\)/, '')}`;
}

function findPost(slug: string) {
  return posts.find((item) => item.slug === slug || item.legacySlugs?.includes(slug));
}

export function generateStaticParams() {
  return posts.flatMap((post) => [post.slug, ...(post.legacySlugs ?? [])].map((slug) => ({ slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = findPost(decodeURIComponent(slug));
  if (!post) return { title: '文章不存在' };
  const canonical = `${siteUrl}/post/${encodeURIComponent(post.slug)}`;
  const image = `${siteUrl}/og/${encodeURIComponent(post.slug)}.jpg`;
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;
  return { title: `${title} · ${settings.name}`, description, alternates: { canonical }, openGraph: { type: 'article', url: canonical, title, description, publishedTime: post.date, authors: [post.author], tags: [post.category, ...(post.tags ?? [])], images: [{ url: image, width: 1200, height: 630, alt: `${post.title} 分享卡片` }] }, twitter: { card: 'summary_large_image', title, description, images: [image] } };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = findPost(decodeURIComponent(slug));
  if (!post) notFound();
  const url = `${siteUrl}/post/${encodeURIComponent(post.slug)}`;
  const structuredData = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.seoTitle || post.title, description: post.seoDescription || post.excerpt, keywords: post.tags, datePublished: post.date, dateModified: post.date, author: { '@type': 'Person', name: post.author }, image: absoluteAsset(post.coverImage), mainEntityOfPage: url };
  return <><a className="skip-link" href="#article-content">跳到文章正文</a><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} /><div id="article-content"><ArticleEntry post={post} posts={posts} settings={settings} /></div></>;
}
