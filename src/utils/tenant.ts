// Multi-tenant helpers: every gym lives at /<slug>/ on the same domain. The slug decides
// which gym the API calls go to and namespaces what the browser stores, so two gyms opened
// on the same device never share sessions or cached data.

// The original single-gym install: its data (and the bare /api of older versions) belongs here.
export const LEGACY_TENANT = 'gymbro';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,30}$/;
const RESERVED = new Set([
  'api', 'assets', 'plataforma', 'static', 'admin', 'www', 'app',
  // direct portal paths of the single-gym version
  'dueno', 'owner', 'coach', 'entrenador', 'profe', 'trainer', 'alumno', 'student',
]);

let cachedSlug: string | null = null;

export function getTenantSlug(): string {
  if (cachedSlug !== null) return cachedSlug;
  const first = (typeof window !== 'undefined' ? window.location.pathname : '/').split('/')[1] || '';
  const slug = first.toLowerCase();
  cachedSlug = SLUG_RE.test(slug) && !RESERVED.has(slug) ? slug : '';
  return cachedSlug;
}

export function isPlatformPage(): boolean {
  return typeof window !== 'undefined' && /^\/plataforma(\/|$)/.test(window.location.pathname);
}

// "https://gymbro.local.net.py/fitzone" (no trailing slash) — base for the portal links.
export function tenantBaseUrl(): string {
  const slug = getTenantSlug();
  return `${window.location.origin}${slug ? `/${slug}` : ''}`;
}

// "gymbro.local.net.py/fitzone" — for display.
export function tenantDisplayHost(): string {
  const slug = getTenantSlug();
  return `${window.location.host}${slug ? `/${slug}` : ''}`;
}

// "/api/users/login" -> "/fitzone/api/users/login"
export function tenantApiPath(path: string): string {
  const slug = getTenantSlug();
  return slug ? `/${slug}${path}` : path;
}

// Namespaces every "gymbro*" localStorage key with the gym's slug. Must run before anything
// reads storage. The legacy gym adopts the un-namespaced keys of earlier versions once.
export function installTenantStorage(): void {
  const slug = getTenantSlug();
  if (!slug || typeof Storage === 'undefined' || (window as any).__gymbroTenantStorage) return;
  (window as any).__gymbroTenantStorage = true;

  const proto = Storage.prototype;
  const { getItem, setItem, removeItem } = proto;
  const prefix = `${slug}::`;
  const scoped = (key: string) => (key.startsWith('gymbro') ? prefix + key : key);

  if (slug === LEGACY_TENANT) {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('gymbro')) keys.push(key);
      }
      for (const key of keys) {
        if (getItem.call(localStorage, prefix + key) === null) {
          const value = getItem.call(localStorage, key);
          if (value !== null) setItem.call(localStorage, prefix + key, value);
        }
      }
    } catch {
      // Storage unavailable (private mode): nothing to adopt.
    }
  }

  proto.getItem = function (key: string) {
    return getItem.call(this, scoped(String(key)));
  };
  proto.setItem = function (key: string, value: string) {
    return setItem.call(this, scoped(String(key)), value);
  };
  proto.removeItem = function (key: string) {
    return removeItem.call(this, scoped(String(key)));
  };

  // The installed app should open this gym, not the root of the domain.
  const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (manifest) manifest.href = `/${slug}/manifest.webmanifest`;
}
