import { BlogFront } from "@/components/frontend/blog-front";
import { SiteErrorBoundary } from "./error-boundary";
import posts from "@/data/posts.json";
import settings from "@/data/settings.json";

export default function Home() {
  return <SiteErrorBoundary><BlogFront posts={posts} settings={settings} /></SiteErrorBoundary>;
}
