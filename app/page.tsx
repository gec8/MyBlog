import { BlogRouter } from "@/components/frontend/blog-router";
import { SiteErrorBoundary } from "./error-boundary";
import posts from "@/data/posts.json";
import settings from "@/data/settings.json";

export default function Home() {
  return <SiteErrorBoundary><BlogRouter posts={posts} settings={settings} /></SiteErrorBoundary>;
}
