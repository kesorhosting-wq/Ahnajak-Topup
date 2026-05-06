/**
 * Resolve an icon URL, optionally prepending a CDN/base URL for relative paths.
 * Absolute URLs (http/https/data:/blob:) are returned unchanged.
 */
export function resolveIconUrl(src: string | undefined | null, cdnBase?: string): string | undefined {
  if (!src) return undefined;
  const s = String(src).trim();
  if (!s) return undefined;
  if (/^(https?:|data:|blob:)/i.test(s)) return s;
  if (!cdnBase) return s;
  const base = cdnBase.replace(/\/+$/, '');
  const path = s.replace(/^\/+/, '');
  return `${base}/${path}`;
}
