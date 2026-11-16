export type SearchRecord = {
  id: string;
  title: string;
  summary: string;
  kind: string;
  href: string;
  system?: string;
  engines?: string[];
  number?: string | null;
};
const synonyms: Record<string, string[]> = {
  overheating: ["cooling", "temperature", "airflow"],
  idle: ["airflow", "fan", "cooling"],
  start: ["battery", "starting", "electrical"],
  shimmy: ["strut", "suspension", "vibration"],
  thermostat: ["cooling", "pump"],
  waterpump: ["pump", "cooling"],
  braking: ["brake", "disc"],
  fuse: ["electrical"],
};
export function getSearchTerms(query: string) {
  return [
    ...new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(
          (t) =>
            t.length > 2 &&
            ![
              "the",
              "and",
              "for",
              "with",
              "have",
              "does",
              "how",
              "why",
              "what",
              "1995",
              "bmw",
              "525i",
              "e34",
            ].includes(t),
        )
        .flatMap((t) => [t, ...(synonyms[t] || [])]),
    ),
  ].slice(0, 16);
}
export function searchRecords(
  records: SearchRecord[],
  query: string,
  engine = "",
) {
  const raw = query.toLowerCase().trim(),
    normalized = raw.replace(/[^a-z0-9]/g, "");
  const tokens = raw
    .split(/[^a-z0-9]+/)
    .filter(
      (t) =>
        t.length > 2 &&
        ![
          "the",
          "and",
          "for",
          "with",
          "have",
          "does",
          "how",
          "why",
          "what",
          "1995",
          "bmw",
          "525i",
          "e34",
        ].includes(t),
    );
  const terms = [
    ...new Set(tokens.flatMap((t) => [t, ...(synonyms[t] || [])])),
  ];
  return records
    .map((r) => {
      const title = r.title.toLowerCase(),
        text = (
          r.title +
          " " +
          r.summary +
          " " +
          r.system +
          " " +
          (r.engines || []).join(" ")
        ).toLowerCase();
      let score = 0;
      if (!raw) score = 1;
      else if (
        r.number &&
        r.number.replace(/[^a-z0-9]/gi, "").toLowerCase() === normalized
      )
        score = 100;
      else {
        if (title.includes(raw)) score += 20;
        for (const term of terms) {
          if (title.includes(term)) score += 4;
          else if (text.includes(term)) score += 1;
        }
      }
      if (score && engine && r.engines?.includes(engine)) score += 2;
      return { record: r, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.record);
}
