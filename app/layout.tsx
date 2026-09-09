import type { Metadata } from "next";
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
