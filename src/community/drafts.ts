import { articles, models, systems, quickSymptoms } from "../data/catalog";
import { manualGuides, manualChapters } from "../data/manual";
import {
  communityCategories,
  communityTags,
  discussionTemplates,
  editorials,
  type TemplateId,
} from "./content";
export type CommunityDraft = {
  chapter: string;
  title: string;
  body: string;
  category: string;
  template: TemplateId;
  starter: string;
  tags: string[];
  model: string;
  engine: string;
  component: string;
  part: string;
  catalogPosition: string;
  guide: string;
  article: string;
  diagnostic: string;
  node: string;
  referenceRevision: string;
  garage: string;
  build: string;
  journal: string;
  guideRevision: string;
  guideStep: string;
  observations: { question: string; answer: string }[];
};

/** Preserve real draft text while rejecting stale or malformed local metadata. */
export function restoreCommunityDraft(value: unknown): Partial<CommunityDraft> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const v = value as Record<string, unknown>,
    out: Partial<CommunityDraft> = {};
  const limits = {
    title: 160,
    body: 20000,
    engine: 50,
    part: 100,
    catalogPosition: 160,
    node: 160,
    referenceRevision: 160,
    garage: 36,
    build: 36,
    journal: 36,
    guideRevision: 24,
    guideStep: 3,
  } as const;
  for (const [key, limit] of Object.entries(limits))
    if (typeof v[key] === "string")
      Object.assign(out, { [key]: (v[key] as string).slice(0, limit) });
  const aliases: Record<string, string> = {
    "Technical help": communityCategories[0].name,
    "Parts & fitment": communityCategories[4].name,
    "Build journals": communityCategories[3].name,
    "General discussion": communityCategories[5].name,
  };
  if (typeof v.category === "string") {
    const category = aliases[v.category] || v.category;
    if (communityCategories.some((c) => c.name === category))
      out.category = category;
  }
  if (
    typeof v.template === "string" &&
    Object.hasOwn(discussionTemplates, v.template)
  )
    out.template = v.template as TemplateId;
  for (const [key, allowed] of Object.entries({
    model: models.map((m) => m.id),
    component: systems.map((s) => s.id),
    chapter: [...manualChapters.map((c) => c.id), "EWD", "INDEX"],
    guide: manualGuides.map((g) => g.slug),
    article: articles.map((a) => a.slug),
    diagnostic: quickSymptoms.map((s) => s.id),
    starter: editorials.map((e) => e.slug),
  })) {
    if (typeof v[key] === "string")
      Object.assign(out, {
        [key]: (allowed as string[]).includes(v[key] as string) ? v[key] : "",
      });
  }
  if (Array.isArray(v.tags))
    out.tags = [
      ...new Set(
        v.tags.filter(
          (id): id is string =>
            typeof id === "string" && communityTags.some((t) => t.id === id),
        ),
      ),
    ].slice(0, 12);
  if (Array.isArray(v.observations)) {
    out.observations = v.observations
      .filter(
        (x): x is { question: string; answer: string } =>
          !!x &&
          typeof x === "object" &&
          typeof x.question === "string" &&
          typeof x.answer === "string",
      )
      .slice(0, 20)
      .map((x) => ({
        question: x.question.slice(0, 1000),
        answer: x.answer.slice(0, 1000),
      }));
    while (
      new TextEncoder().encode(JSON.stringify(out.observations)).length > 15000
    )
      out.observations.pop();
  }
  return out;
}
