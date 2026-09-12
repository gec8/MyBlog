import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const ogUrl = `${siteUrl.replace(/\/$/, "")}/og.png`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "NekoPress · 写下好奇，也收藏日常",
  description: "一个关于开发、生活与微小灵感的个人博客。",
  openGraph: { title: "NekoPress", description: "写下好奇，也收藏日常。", images: [ogUrl] },
  twitter: { card: "summary_large_image", title: "NekoPress", description: "写下好奇，也收藏日常。", images: [ogUrl] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '');
  return <html lang="zh-CN"><head><link rel="preload" as="image" type="image/webp" href={`${basePath}/hero-1200.webp`} /><link rel="alternate" type="application/rss+xml" title="NekoPress RSS" href={`${basePath}/rss.xml`} /></head><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}<noscript><main className="load-fallback"><b>NekoPress</b><p>请开启浏览器的 JavaScript 后重新访问。</p></main></noscript></body></html>;
}
