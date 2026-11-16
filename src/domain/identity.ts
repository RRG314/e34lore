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
export function publicShareUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input, "https://e34lore.com");
  } catch {
    return null;
  }
  const path = url.pathname;
  if (["/roadmap","/roadmap/","/support","/support/"].includes(path)) return new URL(path,"https://e34lore.com").href;
  if (
    !/^\/(?:$|repairs(?:\/[^/]+)?\/?$|guides(?:\/[^/]+)?\/?$|reference(?:\/[^/]+)?\/?$|encyclopedia\/?$|workshop\/?$|manual(?:\/[^/]+)?\/?$|quick-reference(?:\/(?:fluids|fuses|locations))?\/?$|parts(?:\/[^/]+)?\/?$|models(?:\/[^/]+)?\/?$|articles(?:\/[^/]+)?\/?$|resources\/?$|partnerships\/?$|garages(?:\/[^/]+){0,2}\/?$|community(?:\/(?:cars|topics(?:\/[^/]+)?|policies|[0-9a-f-]{36}))?\/?$)/.test(
      path,
    )
  )
    return null;
  const out = new URL(path, "https://e34lore.com");
  for (const key of [
    ...(path === "/workshop" || path === "/workshop/" ? ["node", "configuration_revision", "catalog_position", "model_revision", "reference"] : []),
    ...(path.startsWith("/parts/") ? ["node","reference","model_revision"] : []),
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
    "q",
  ]) {
    const value = url.searchParams.get(key);
    if (value && value.length <= 200 && !/[\u0000-\u001f]/.test(value))
      out.searchParams.set(key, value);
  }
  if (/^\/quick-reference\//.test(path)) {
    for (const key of ["panel", "fuse", "point"]) {
      const value = url.searchParams.get(key);
      if (value && /^[a-z0-9-]{1,35}$/.test(value)) out.searchParams.set(key, value);
    }
    if (path === "/quick-reference/fluids" && /^#[a-z-]{1,32}$/.test(url.hash))
      out.hash = url.hash;
  }
  if (path === '/workshop' || /^\/parts\/catalog\/?$/.test(path)) {
    const transmission = url.searchParams.get('transmission');
    if (transmission && ['all', 'manual', 'automatic'].includes(transmission)) out.searchParams.set('transmission', transmission);
  }
  if (/^\/parts\/catalog\/?$/.test(path) && url.searchParams.get('workspace') === 'part') out.searchParams.set('workspace','part');
  if (
    /^#(?:post-|journal-|guide-step-|step-|job-)[a-zA-Z0-9_-]{1,100}$/.test(url.hash)
  )
    out.hash = url.hash;
  return out.href;
}
