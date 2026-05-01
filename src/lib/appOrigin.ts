/**
 * Public origin for legacy ?gost= links and DB share URLs.
 * Set VITE_PUBLIC_APP_URL in production (e.g. https://your-domain.com) so copied links
 * point at your deployed app, not localhost.
 */
export function getPublicAppOrigin(): string {
  const raw = import.meta.env.VITE_PUBLIC_APP_URL as string | undefined;
  if (raw?.trim()) {
    try {
      return new URL(raw.trim()).origin;
    } catch {
      return raw.trim().replace(/\/$/, '');
    }
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}
