import { publicHttpsUrl } from "../domain/affiliates";
export async function checkAffiliateDestination(
  start: string,
  hosts: string[],
  fetcher: typeof fetch = fetch,
): Promise<"ok" | "broken" | "blocked"> {
  let current = start;
  const visited = new Set<string>();
  for (let redirects = 0; redirects <= 4; redirects++) {
    if (!publicHttpsUrl(current, hosts) || visited.has(current))
      return "blocked";
    visited.add(current);
    try {
      const response = await fetcher(current, {
        method: "HEAD",
        redirect: "manual",
        signal: AbortSignal.timeout(4000),
        headers: {
          "User-Agent":
            "E34Lore-Link-Check/1.0 (+https://e34lore.com/partnerships)",
        },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) return "broken";
        current = new URL(location, current).href;
        continue;
      }
      if (response.ok) return "ok";
      return [404, 410].includes(response.status) ? "broken" : "blocked";
    } catch {
      return "blocked";
    }
  }
  return "blocked";
}
