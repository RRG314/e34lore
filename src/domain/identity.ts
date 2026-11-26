export function usernameError(value: string): string | null {
  if (!/^[a-z][a-z0-9_]{2,23}$/.test(value))
    return "Use 3–24 lowercase letters, numbers or underscores. Start with a letter.";
  if (
    /^(admin|administrator|moderator|owner|support|staff|e34lore|e34_lore)$/.test(
      value,
    )
  )
    return "That username is reserved. Choose another.";
  return null;
}

// Deliberately whitelist public routes and navigation state. Never share Auth
// callbacks, member settings, private vehicle identifiers or arbitrary queries.
export function publicShareUrl(input: string, previewOrigin?: string): string | null {
  const origin = previewOrigin && /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(previewOrigin)
    ? previewOrigin : 'https://e34lore.com';
  let url: URL;
  try {
    url = new URL(input, "https://e34lore.com");
  } catch {
    return null;
  }
  const path = url.pathname;
  const e30 = /^\/e30(?:\/|$)/.test(path);
  const route = e30 ? path.slice(4)||'/' : path;
  if (e30 && !/^\/(?:$|(?:repairs|guides|reference|encyclopedia|workshop|manual|quick-reference|parts|models|articles|resources)(?:\/|$))/.test(route)) return null;
  if (["/roadmap","/roadmap/","/support","/support/"].includes(route)) return new URL(path,origin).href;
  if (
    !/^\/(?:$|repairs(?:\/[^/]+)?\/?$|guides(?:\/[^/]+)?\/?$|reference(?:\/[^/]+)?\/?$|encyclopedia\/?$|workshop\/?$|manual(?:\/[^/]+)?\/?$|quick-reference(?:\/(?:fluids|fuses|locations))?\/?$|parts(?:\/[^/]+)?\/?$|models(?:\/[^/]+)?\/?$|articles(?:\/[^/]+)?\/?$|resources\/?$|partnerships\/?$|garages(?:\/[^/]+){0,2}\/?$|community(?:\/(?:cars|topics(?:\/[^/]+)?|policies|[0-9a-f-]{36}))?\/?$)/.test(
      route,
    )
  )
    return null;
  const out = new URL(path,origin);
  const community = /^\/community(?:\/|$)/.test(route);
  const workshop = /^\/workshop\/?$/.test(route);
  for (const key of [
    ...(workshop ? ["node", "configuration_revision", "catalog_position", "model_revision", "reference"] : []),
    ...(route.startsWith("/parts/") ? ["node","reference","model_revision"] : []),
    "part",
    "drawing",
    "context",
    "assembly",
    "position",
    "model",
    "engine",
    "group",
    "diagram",
    "revision",
    "step",
    "reply",
    "journal",
    "system",
    "track",
    "category",
    "tab",
    ...(!community?["q"]:[]),
  ]) {
    const value = url.searchParams.get(key);
    if (value && value.length <= 200 && !/[\u0000-\u001f]/.test(value))
      out.searchParams.set(key, value);
  }
  if (community) {
    if (url.searchParams.get('series')==='e30') out.searchParams.set('series','e30');
    for (const key of ['board','tag']) {
      const value = url.searchParams.get(key);
      if (value && /^[a-z0-9-]{1,48}$/.test(value)) out.searchParams.set(key,value);
    }
  }
  if (workshop && url.searchParams.get('mode')==='repair') {
    const service = url.searchParams.get('service');
    if (service && /^e(?:30|34)-[a-z0-9-]{1,55}$/.test(service)) {
      out.searchParams.set('mode','repair');
      out.searchParams.set('service',service);
    }
  }
  const pdf = url.searchParams.get('pdf');
  if (pdf && /^\/manual\/[a-z0-9-]+\/?$/i.test(route) && /^[1-9]\d{0,3}$/.test(pdf)) out.searchParams.set('pdf',pdf);
  if (/^\/quick-reference\//.test(route)) {
    for (const key of ["panel", "fuse", "point"]) {
      const value = url.searchParams.get(key);
      if (value && /^[a-z0-9-]{1,35}$/.test(value)) out.searchParams.set(key, value);
    }
    if (route === "/quick-reference/fluids" && /^#[a-z-]{1,32}$/.test(url.hash))
      out.hash = url.hash;
  }
  if (workshop || /^\/parts\/catalog\/?$/.test(route)) {
    const transmission = url.searchParams.get('transmission');
    if (transmission && ['all', 'manual', 'automatic'].includes(transmission)) out.searchParams.set('transmission', transmission);
  }
  if (/^\/parts\/catalog\/?$/.test(route) && url.searchParams.get('workspace') === 'part') out.searchParams.set('workspace','part');
  if (
    /^#(?:post-|journal-|guide-step-|step-|job-)[a-zA-Z0-9_-]{1,100}$/.test(url.hash) ||
    (route.startsWith('/repairs/') && url.hash==='#owner-experience')
  )
    out.hash = url.hash;
  return out.href;
}
