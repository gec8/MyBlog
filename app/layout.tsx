import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '');
const ogUrl = `${siteUrl.replace(/\/$/, "")}/og-nekonote.png`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "猫笺 NekoNote · 写下好奇，也收藏日常",
  description: "一个关于开发、生活与微小灵感的个人博客。",
  icons: { icon: `${basePath}/favicon.svg`, shortcut: `${basePath}/favicon.svg` },
  openGraph: { title: "猫笺 NekoNote", description: "写下好奇，也收藏日常。", images: [ogUrl] },
  twitter: { card: "summary_large_image", title: "猫笺 NekoNote", description: "写下好奇，也收藏日常。", images: [ogUrl] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fffaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#141316" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const legacyRedirect = `try{var h=location.hash;if(h==='#/admin')location.replace('${basePath}/admin');else if(h.indexOf('#/post/')===0)location.replace('${basePath}/post/'+encodeURIComponent(decodeURIComponent(h.slice(7))))}catch(e){}`;
  return <html lang="zh-CN"><head><script dangerouslySetInnerHTML={{ __html: legacyRedirect }} /><link rel="alternate" type="application/rss+xml" title="猫笺 NekoNote RSS" href={`${basePath}/rss.xml`} /></head><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}<noscript><main className="load-fallback"><b>猫笺 NekoNote</b><p>请开启浏览器的 JavaScript 后重新访问。</p></main></noscript></body></html>;
}
