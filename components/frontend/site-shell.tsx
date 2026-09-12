'use client';

import { useEffect, useState } from 'react';
import { Menu, PenLine, X } from 'lucide-react';
import type { SiteSettings } from '@/types/blog';
import { basePath, homeHref } from '@/lib/site-paths';

export function SiteHeader({ compact = false, name = 'NekoPress' }: { compact?: boolean; name?: string }) {
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
      <a className="brand" href={homeHref()} aria-label="返回首页"><span className="cat-logo">猫</span>{name}</a>
      <nav className={menuOpen ? 'nav-open' : ''} aria-label="主导航">
        <a className={compact ? 'active' : ''} href={homeHref('latest')} onClick={() => setMenuOpen(false)}>文章</a>
        <a href={homeHref('about')} onClick={() => setMenuOpen(false)}>关于</a>
        <a className="write-link" href={`${basePath || ''}/#/admin`} onClick={() => setMenuOpen(false)}><PenLine size={14} />写文章</a>
      </nav>
      {menuOpen && <button className="nav-backdrop" aria-label="关闭菜单" onClick={() => setMenuOpen(false)} />}
      <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label={menuOpen ? '关闭菜单' : '打开菜单'}>{menuOpen ? <X /> : <Menu />}</button>
    </div>
  </header>;
}

export function SiteFooter({ settings }: { settings?: SiteSettings }) {
  return <footer className="footer site-width">
    <span>{settings?.copyright ?? `© 2026 ${settings?.name ?? 'NekoPress'}`}</span>
    {settings?.github ? <a href={settings.github} target="_blank" rel="noreferrer">GitHub</a> : <span>Published with GitHub Pages</span>}
  </footer>;
}
