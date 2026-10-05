'use client';

import { useEffect, useState } from 'react';
import { Menu, Monitor, Moon, PenLine, Sun, X } from 'lucide-react';
import type { SiteSettings } from '@/types/blog';
import { basePath, homeHref } from '@/lib/site-paths';
import { BrandMark, BrandWordmark } from '@/components/brand-mark';

type Theme = 'system' | 'light' | 'dark';

export function ThemePicker({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>('system');
  useEffect(() => {
    const saved = localStorage.getItem('nekonote-theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') setTheme(saved);
  }, []);
  function chooseTheme(next: Theme) {
    setTheme(next);
    localStorage.setItem('nekonote-theme', next);
    document.documentElement.dataset.theme = next;
    const stylesheet = document.querySelector<HTMLLinkElement>('#nekonote-dark-theme');
    if (stylesheet)
      stylesheet.media = next === 'dark' ? 'all' : next === 'light' ? 'not all' : '(prefers-color-scheme: dark)';
  }
  return <div className={`theme-picker${compact ? ' compact' : ''}`} role="group" aria-label="界面主题">
    <button className={theme === 'system' ? 'active' : ''} onClick={() => chooseTheme('system')} aria-label="主题：跟随系统" title="跟随系统"><Monitor /></button>
    <button className={theme === 'light' ? 'active' : ''} onClick={() => chooseTheme('light')} aria-label="主题：浅色" title="浅色"><Sun /></button>
    <button className={theme === 'dark' ? 'active' : ''} onClick={() => chooseTheme('dark')} aria-label="主题：深色" title="深色"><Moon /></button>
  </div>;
}

export function SiteHeader({ compact = false, name = '猫笺 NekoNote' }: { compact?: boolean; name?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false);
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', close);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', close);
    };
  }, [menuOpen]);
  return <header className="site-header">
    <div className="site-width header-inner">
      <a className="brand" href={homeHref()} aria-label={`${name}，返回首页`}><span className="cat-logo"><BrandMark /></span><BrandWordmark name={name} /></a>
      <nav className={menuOpen ? 'nav-open' : ''} aria-label="主导航">
        <a className={compact ? 'active' : ''} href={homeHref('latest')} onClick={() => setMenuOpen(false)}>文章</a>
        <a href={homeHref('about')} onClick={() => setMenuOpen(false)}>关于</a>
        <ThemePicker />
        <a className="write-link" href={`${basePath || ''}/admin`} onClick={() => setMenuOpen(false)}><PenLine size={14} />写文章</a>
      </nav>
      {menuOpen && <button className="nav-backdrop" aria-label="关闭菜单" onClick={() => setMenuOpen(false)} />}
      <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label={menuOpen ? '关闭菜单' : '打开菜单'}>{menuOpen ? <X /> : <Menu />}</button>
    </div>
  </header>;
}

export function SiteFooter({ settings }: { settings?: SiteSettings }) {
  return <footer className="footer site-width">
    <span>{settings?.copyright ?? `© 2026 ${settings?.name ?? '猫笺 NekoNote'}`}</span>
    {settings?.github ? <a href={settings.github} target="_blank" rel="noreferrer">GitHub</a> : <span>Published with GitHub Pages</span>}
  </footer>;
}
