import { BlogApp } from "@/components/blog-app";
import posts from "@/data/posts.json";
import settings from "@/data/settings.json";

export default function Home() {
  return <BlogApp initialPosts={posts} initialSettings={settings} />;
}
