/**
 * Resolve an icon URL, optionally prepending a CDN/base URL for relative paths.
 * Absolute URLs (http/https/data:/blob:) are returned unchanged.
 */
export function resolveIconUrl(src: string | undefined | null, cdnBase?: string): string | undefined {
  if (!src) return undefined;
  let s = String(src).trim();
  if (!s) return undefined;

  // Rewrite Supabase storage URLs to use our local VPS proxy for faster loading and caching
  const supabaseStoragePattern = /https?:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/site-assets\/(.*)/i;
  const match = s.match(supabaseStoragePattern);
  if (match) {
    return `/storage/${match[1]}`;
  }

  if (/^(https?:|data:|blob:)/i.test(s)) return s;
  if (!cdnBase) return s;
  const base = cdnBase.replace(/\/+$/, '');
  const path = s.replace(/^\/+/, '');
  return `${base}/${path}`;
}
