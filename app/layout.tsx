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

const assetRecovery = `(function(){var key="nekopress-asset-recovery";window.addEventListener("error",function(event){var target=event.target;if(!target||!(target.tagName==="SCRIPT"||target.tagName==="LINK"))return;if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,"1");var url=new URL(location.href);url.searchParams.set("refresh",Date.now().toString());location.replace(url.pathname+url.search+url.hash)},true);window.addEventListener("load",function(){sessionStorage.removeItem(key)})})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><head><meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" /><meta httpEquiv="Pragma" content="no-cache" /><script dangerouslySetInnerHTML={{ __html: assetRecovery }} /></head><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}<noscript><main className="load-fallback"><b>NekoPress</b><p>请开启浏览器的 JavaScript 后重新访问。</p></main></noscript></body></html>;
}
