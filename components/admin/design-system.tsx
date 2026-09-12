import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function ScopeBadge({ scope }: { scope: 'global' | 'personal' | 'device' }) {
  const labels = { global: '全站共享', personal: '账号同步', device: '当前设备' } as const;
  return <span className={cn('settings-scope', scope)}>{labels[scope]}</span>;
}

export function PanelHeading({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div className="settings-intro">
    {icon}
    <div><h2>{title}</h2><p>{description}</p></div>
    {action}
  </div>;
}
