/**
 * Application API & Backend URL configuration
 * Reads from environment variables (.env / .env.local) with safe fallbacks.
 */

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '');

export const BACKEND_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, '') : '') ||
  'http://localhost:5000'
).replace(/\/+$/, '');

/**
 * Resolves an asset path (e.g. SVG or uploaded file) to an absolute URL
 */
export function getAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BACKEND_URL}${cleanPath}`;
}
