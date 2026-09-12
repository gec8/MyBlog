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

export function generateStaticParams() { return posts.map((post) => ({ slug: post.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = posts.find((item) => item.slug === decodeURIComponent(slug));
  if (!post) return { title: '文章不存在' };
  const canonical = `${siteUrl}/post/${encodeURIComponent(post.slug)}`;
  const image = absoluteAsset(post.coverImage);
  return { title: `${post.title} · ${settings.name}`, description: post.excerpt, alternates: { canonical }, openGraph: { type: 'article', url: canonical, title: post.title, description: post.excerpt, publishedTime: post.date, authors: [post.author], tags: [post.category], images: image ? [{ url: image, alt: post.title }] : [] }, twitter: { card: image ? 'summary_large_image' : 'summary', title: post.title, description: post.excerpt, images: image ? [image] : [] } };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = posts.find((item) => item.slug === decodeURIComponent(slug));
  if (!post) notFound();
  const url = `${siteUrl}/post/${encodeURIComponent(post.slug)}`;
  const structuredData = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title, description: post.excerpt, datePublished: post.date, dateModified: post.date, author: { '@type': 'Person', name: post.author }, image: absoluteAsset(post.coverImage), mainEntityOfPage: url };
  return <><a className="skip-link" href="#article-content">跳到文章正文</a><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} /><div id="article-content"><ArticleEntry post={post} posts={posts} settings={settings} /></div></>;
}
