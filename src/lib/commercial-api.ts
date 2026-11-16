import config, { demoBackend } from "./backend";
export type CommercialRpc =
  | "resolve_affiliate_link"
  | "record_affiliate_click"
  | "affiliate_link_for_check"
  | "record_affiliate_link_check";
export async function commercialRpc<T>(
  name: CommercialRpc,
  body: Record<string, unknown>,
  token?: string,
  signal?: AbortSignal,
): Promise<T> {
  if (demoBackend) throw new Error("Retailer links need a configured backend.");
  const response = await fetch(config.url + "/rest/v1/rpc/" + name, {
    method: "POST",
    headers: {
      apikey: config.publishableKey,
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: JSON.stringify(body),
    signal: signal || AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(
      response.status === 401 || response.status === 403
        ? "Administrator permission and MFA required"
        : "The commercial service could not complete this request.",
    );
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}
