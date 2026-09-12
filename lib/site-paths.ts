const configuredBasePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '');

export const basePath = configuredBasePath;

export function homeHref(anchor = '') {
  return `${basePath || ''}/${anchor ? `#${anchor}` : ''}`;
}

export function articleHref(slug: string) {
  return `${basePath || ''}/post/${encodeURIComponent(slug)}`;
}

export function assetHref(source?: string) {
  if (!source) return '';
  if (/^(?:https?:|data:|blob:)/i.test(source)) return source;
  if (basePath && source.startsWith(`${basePath}/`)) return source;
  return `${basePath || ''}/${source.replace(/^\.?(?:\/|\\)/, '')}`;
}
