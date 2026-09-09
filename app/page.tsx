import { BlogApp } from "@/components/blog-app";
import posts from "@/data/posts.json";

export default function Home() {
  return <BlogApp initialPosts={posts} />;
}
