import type { SVGProps } from 'react';

export function BrandMark({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={`brand-mark ${className}`.trim()}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M7 18.5V12.7c0-2.4 2.8-3.7 4.7-2.2l6.1 4.8A17.8 17.8 0 0 1 24 14.2c2.2 0 4.3.4 6.2 1.1l6.1-4.8c1.9-1.5 4.7-.2 4.7 2.2v25.1c0 3.4-2.8 6.2-6.2 6.2H13.2A6.2 6.2 0 0 1 7 37.8V18.5Z"
        fill="currentColor"
      />
      <path d="M32 8h9v9l-9-9Z" fill="var(--coral, #f04f64)" />
      <path d="m24 22-7 13h14l-7-13Z" fill="var(--paper, #fffaf8)" />
      <circle cx="24" cy="30" r="2" fill="currentColor" />
      <path d="M24 31.5V39" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function BrandWordmark({ name = '猫笺 NekoNote' }: { name?: string }) {
  if (name.trim() !== '猫笺 NekoNote') return <span className="brand-custom-name">{name}</span>;
  return (
    <span className="brand-wordmark">
      <strong>猫笺</strong>
      <small>NekoNote</small>
    </span>
  );
}
