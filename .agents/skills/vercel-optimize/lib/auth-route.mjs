// Auth routes carry user state and must not be cached at CDN edge.

/** Exact path segments that indicate auth/session/checkout surfaces. */
const AUTH_PATH_SEGMENTS = new Set([
  'login',
  'logout',
  'auth',
  'account',
  'dashboard',
  'checkout',
  'cart',
  'profile',
  'session',
  'me',
]);

/**
 * @deprecated Prefer {@link isAuthRoute}. Kept for callers that still import the
 * regex; segment-based matching in isAuthRoute is authoritative.
 */
export const AUTH_ROUTE_REGEX =
  /(?:^|\/)(login|logout|auth|account|dashboard|checkout|cart|profile|session|me)(?:\/|$)/i;

function routePathSegments(route) {
  const path = String(route ?? '').split('?')[0].split('#')[0];
  return path.split('/').filter(Boolean);
}

/**
 * True when any URL path segment exactly matches a known auth-like segment.
 * Uses whole-segment equality so substrings like "me" in /home/settings or
 * "cart" in /shopping-cart do not qualify.
 */
export function isAuthRoute(route) {
  for (const segment of routePathSegments(route)) {
    if (AUTH_PATH_SEGMENTS.has(segment.toLowerCase())) return true;
  }
  return false;
}

// Non-cache candidates pass through — errors/slowness on auth routes still warrant investigation.
export function applyAuthDisqualifier(candidate) {
  const cacheKinds = new Set(['uncached_route', 'cache_header_gap']);
  if (!cacheKinds.has(candidate.kind)) return candidate;
  if (!candidate.route) return candidate;
  if (isAuthRoute(candidate.route)) {
    return {
      ...candidate,
      disqualified: true,
      disqualifyReason: 'auth-like route — should not be cached at edge',
    };
  }
  return candidate;
}
