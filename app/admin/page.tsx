import type { Metadata } from 'next';
import { AdminEntry } from '@/components/blog-app';
import posts from '@/data/posts.json';
import settings from '@/data/settings.json';

export const metadata: Metadata = { title: `管理后台 · ${settings.name}`, robots: { index: false, follow: false } };

export default function AdminPage() {
  return <AdminEntry posts={posts} initialSettings={settings} />;
}
