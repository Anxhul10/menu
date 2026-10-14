const tokenPattern = /^[A-Za-z0-9_-]{32,100}$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidTableCode(value) {
  return typeof value === "string" && tokenPattern.test(value.trim());
}

export function tableMenuPath(slug, token) {
  return `/r/${encodeURIComponent(slug)}/t/${encodeURIComponent(token)}`;
}

export function parseMenuQrValue(value) {
  if (typeof value !== "string" || value.trim().length === 0) return null;

  try {
    const url = new URL(value.trim(), window.location.origin);
    const allowedOrigin = import.meta.env.VITE_PUBLIC_APP_ORIGIN;
    const isAllowedOrigin = url.origin === window.location.origin || (allowedOrigin && url.origin === allowedOrigin);
    if (!isAllowedOrigin || !["http:", "https:"].includes(url.protocol)) return null;

    const match = url.pathname.match(/^\/r\/([^/]+)\/t\/([^/]+)$/);
    if (!match || !slugPattern.test(match[1]) || !isValidTableCode(match[2])) return null;
    return { slug: match[1], token: match[2], path: tableMenuPath(match[1], match[2]) };
  } catch {
    return null;
  }
}
