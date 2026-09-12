'use client';

import { useEffect, useState } from 'react';
import { Menu, PenLine, X } from 'lucide-react';
import type { SiteSettings } from '@/types/blog';

function navigate(path = '') {
  window.location.hash = path ? `#/${path}` : '#';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

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
  const jump = (target: 'latest' | 'about') => {
    setMenuOpen(false);
    navigate();
    window.setTimeout(() => document.querySelector(`#${target}`)?.scrollIntoView(), 40);
  };
  return <header className="site-header">
    <div className="site-width header-inner">
      <button className="brand" onClick={() => navigate()} aria-label="返回首页"><span className="cat-logo">猫</span>{name}</button>
      <nav className={menuOpen ? 'nav-open' : ''} aria-label="主导航">
        <button className={compact ? 'active' : ''} onClick={() => jump('latest')}>文章</button>
        <button onClick={() => jump('about')}>关于</button>
        <button className="write-link" onClick={() => { setMenuOpen(false); navigate('admin'); }}><PenLine size={14} />写文章</button>
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
