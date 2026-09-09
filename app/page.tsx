import { BlogApp } from "@/components/blog-app";
import { SiteErrorBoundary } from "./error-boundary";
import posts from "@/data/posts.json";
import settings from "@/data/settings.json";

export default function Home() {
  return <SiteErrorBoundary><BlogApp initialPosts={posts} initialSettings={settings} /></SiteErrorBoundary>;
}
