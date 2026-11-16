export function safeReturnPath(value: string | null, origin: string) {
  if (!value?.startsWith("/")) return "/garage";
  try {
    const url = new URL(value, origin);
    return url.origin === origin
      ? url.pathname + url.search + url.hash
      : "/garage";
  } catch {
    return "/garage";
  }
}
