export function usageArea(path: string): string | null {
  const section = path.split("?")[0].split("/").filter(Boolean);
  if (!section.length) return "home";
  if (section[0] === "community")
    return ["admin", "settings", "new"].includes(section[1])
      ? null
      : section[1] === "cars"
        ? "cars"
        : "community";
  return (
    (
      {
        encyclopedia: "reference",
        models: "reference",
        articles: "reference",
        resources: "manual",
        manual: "manual",
        guides: "guides",
        repairs: "guides",
        parts: "catalog",
        workshop: ["assets", "inspections"].includes(section[1]) ? null : "workshop",
        diagnostics: "diagnostics",
        garages: "cars",
        app: "app",
      } as Record<string, string | null>
    )[section[0]] || null
  );
}
