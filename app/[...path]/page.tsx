import { defaultSeries, isSeries, isTechnicalSection, displayModel, seriesDefinitions, seriesRoute } from "../../src/series/registry";
import { e30Guides } from "../../src/series/e30-repairs";
import { vehicleSeriesEnabled } from "../../src/series/availability";
import { repairTopic } from '../../src/repair/library';
import { heldRoute } from "../../src/release/features";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Shell } from "../../src/components/Shell";
import { manualGuides, manualChapters } from "../../src/data/manual";
import { articles, parts, models } from "../../src/data/catalog";
import { editorials } from "../../src/community/content";
import { formatPartNumber } from "../../src/domain/fitment";
import { referenceSections } from "../../src/data/quick-reference";
import { e30ManualGroups } from "../../src/series/e30-factory-index";
import { socialImage } from "../../src/lib/site-metadata";
const titles: Record<string, string> = {
  terms: 'Terms of use', privacy: 'Privacy & your information', copyright: 'Copyright & permissions',
  scanner: "Part Scanner",
  roadmap: "The road ahead",
  support: "Contact E34 Lore support",
  partnerships: "Retailer links & advertising",
  encyclopedia: "Technical encyclopedia",
  repairs: "Repair walkthroughs",
  parts: "OEM number & assembly reference",
  electrical: "Wiring & Electrical",
  workshop: "Interactive E34 workshop",
  community: "E34 community",
  garages: "Owner garages",
  builds: "E34 builds",
  shop: "E34 Lore merchandise · Coming soon",
  marketplace: "Parts exchange · Coming soon",
  diagnostics: "Diagnostic workbench",
  garage: "My Garage",
  account: "Your account",
  app: "Install E34 Lore",
  resources: "Sources & reference library",
  search: "Search E34 reference",
  admin: "Review desk",
  manage: "Owner dashboard",
  manual: "Mobile service manual",
  "quick-reference": "E34 quick reference",
};
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const [{ path: requested }, query] = await Promise.all([params, searchParams]);
  const { series, path } = seriesRoute(requested);
  if (series !== defaultSeries) return {
    title: (e30Guides.find(guide => path[0] === "guides" && guide.slug === path[1])?.title || titles[path[0]]?.replaceAll("E34", series.toUpperCase()) || seriesDefinitions[series].designation) + " · " + seriesDefinitions[series].name,
    robots: {index: false, follow: false},
  };
  const guide = manualGuides.find(
    (g) => path[0] === "guides" && g.slug === path[1],
  );
  const article = articles.find(
    (a) => path[0] === "articles" && a.slug === path[1],
  );
  const editorial = editorials.find(
    (e) =>
      path[0] === "community" && path[1] === "topics" && e.slug === path[2],
  );
  const canonicalPath = "/" + path.map(encodeURIComponent).join("/");
  const partId = typeof query.part === "string" ? query.part : "";
  const bmwNumber = path[0] === "parts" && path[1] === "catalog"
    ? /^bmw-(\d{11})$/.exec(partId)?.[1] || parts.find((part) => part.id === partId)?.number
    : undefined;
  const partLink = bmwNumber ? "/parts/catalog?part=" + encodeURIComponent(partId) : undefined;
  const reference = path[0] === "quick-reference" ? referenceSections.find((item) => item.id === path[1]) : undefined;
  const title = bmwNumber
    ? "BMW " + formatPartNumber(bmwNumber) + " · E34 Lore"
    : (guide?.title ||
        (path[0] === "repairs" ? repairTopic(path[1])?.title : undefined) ||
        article?.title ||
        editorial?.title ||
        (path[0] === "community" && path[1] === "cars" ? "Cars and projects" : undefined) ||
        (path[0] === "community" && path[1] === "garages" ? "Member garages" : undefined) ||
        (path[0] === 'community' && path[1] === 'specialists' ? 'BMW specialists & owner recommendations' : undefined) ||
        (path[0] === "workshop" && query.tab === "diagrams" ? "E34 exploded diagrams · Manual & automatic" : undefined) ||
        (path[0] === "manual" ? manualChapters.find((c) => c.id === path[1])?.title : undefined) ||
        (path[0] === "garage" && path[1] === "vins" ? "Private VIN registry" : undefined) ||
        reference?.title ||
        (path[0] === "manage" && path[1] === "support" ? "Private support inbox" : undefined) ||
        (path[0] === "manage" && path[1] === "analytics" ? "Website analytics" : undefined) ||
        (path[0] === "manage" && path[1] === "security" ? "Security status" : undefined) ||
        (path[0] === "manage" && path[1] === "partners" ? "Affiliates & advertising" : undefined) ||
        titles[path[0]] ||
        "E34 reference") + " · E34 Lore";
  const policyDescriptions:Record<string,string>={terms:'E34 Lore terms of use, contribution permissions, reference limitations and community responsibilities.',privacy:'How E34 Lore uses account and garage information, publication choices, optional measurements and deletion controls.',copyright:'Copyright, third-party credits, contribution rights and permission or removal requests for E34 Lore.'};
  const description = bmwNumber
    ? "BMW E34 catalog record for part " + formatPartNumber(bmwNumber) + ". Check source positions and application notes."
    : guide?.summary || article?.summary || editorial?.summary || reference?.detail || policyDescriptions[path[0]] ||
      (path[0]==='community'&&path[1]==='specialists'?'Find sourced BMW workshop listings, owner recommendations and ways to suggest a specialist or listing correction.':undefined) ||
      (path[0]==="roadmap"?"The direction of E34 Lore: connected BMW references, owner knowledge, component identification and interactive repair tools.":path[0]==="support"?"Contact E34 Lore privately about your account, reference information or a website problem.":undefined) ||
      "BMW E34 repair guides, OEM diagrams and owner projects.";
  return {
    alternates: { canonical: partLink || canonicalPath },
    title,
    description,
    openGraph: { title, description, url: partLink || canonicalPath, siteName: "E34 Lore", images: [socialImage] },
    twitter: { card: "summary_large_image", title, description, images: [socialImage.url] },
    robots:
      ["scanner", "garage", "account", "admin", "manage", "shop", "marketplace"].includes(path[0]) ||
(path[0] === "workshop" && (["assets", "inspections", "repair"].includes(path[1])||query.mode==='build')) ||
      (path[0] === "community" &&
        ["settings", "admin", "new"].includes(path[1]))
        ? { index: false, follow: false }
        : undefined,
  };
}
export default async function Route({
  params,
  searchParams,
}: {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { path: requested } = await params;
  const { series, path } = seriesRoute(requested);
  if (series !== defaultSeries && !vehicleSeriesEnabled) notFound();
  const raw = await searchParams;
  const query = Object.fromEntries(
    Object.entries(raw || {}).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  if (isSeries(requested[0]) && (series === defaultSeries || (path[0] && !isTechnicalSection(path[0])))) {
    const params = new URLSearchParams(Object.entries(query).flatMap(([key,value])=>value === undefined ? [] : [[key,value]]));
    if (path[0] === "community" && path[1] === "new" && series !== defaultSeries) params.set("series",series);
    redirect("/" + path.map(encodeURIComponent).join("/") + (params.size ? "?" + params : ""));
  }
  if (!path.length) return <Shell series={series} />;
  if (path[0] === "models" && path[1]?.startsWith(series + "-") && displayModel(path[1]) !== path[1])
    redirect("/" + series + "/models/" + encodeURIComponent(displayModel(path[1])));
  if (heldRoute(path, process.env.NODE_ENV, query.task)) notFound();
  if (path[0] === "garages" && path.length === 1) redirect("/community/garages");
  if (
    ![
      "scanner",
      "terms", "privacy", "copyright",
      "roadmap",
      "support",
      "encyclopedia",
      "repairs",
      "parts",
      "electrical",
      "workshop",
      "community",
      "garages",
      "builds",
      "shop",
      "marketplace",
      "diagnostics",
      "garage",
      "account",
      "app",
      "resources",
      "partnerships",
      "search",
      "admin",
      "manage",
      "manual",
      "quick-reference",
      "models",
      "guides",
      "articles",
    ].includes(path[0])
  )
    notFound();
  if (path[0] === "workshop" && (path.length > 2 || (path[1] && !["assets", "inspections", "repair"].includes(path[1])))) notFound();
  if(path[0]==="builds"&&(path.length>2||(path[1]&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(path[1]))))notFound();
  if(path[0]==="models"&&(path.length>2||(path[1]&&!seriesDefinitions[series].models.some(model=>model.id===path[1]))))notFound();
  if(path[0]==="scanner"&&(path.length>2||(path[1]&&path[1]!=="credits")))notFound();
  if (["roadmap","support","terms","privacy","copyright"].includes(path[0]) && path.length !== 1) notFound();
  if(path[0]==='community'&&path[1]==='specialists'&&path.length!==2)notFound();
  if(path[0]==='community'&&path[1]==='garages'&&path.length!==2)notFound();
  if(path[0]==='electrical'&&path.length!==1)notFound();
  if (path[0] === "partnerships" && path.length !== 1) notFound();
  if (path[0] === "repairs" && (path.length > 2 || (path[1] && !repairTopic(path[1], series)))) notFound();
  if (path[0] === "guides" && !(series === "e30" ? e30Guides : manualGuides).some((g) => g.slug === path[1]))
    notFound();
  if (path[0] === "articles" && (series !== defaultSeries || !articles.some((a) => a.slug === path[1])))
    notFound();
  if (
    path[0] === "community" &&
    path[1] === "topics" &&
    path[2] &&
    !editorials.some((e) => e.slug === path[2])
  )
    notFound();
  if (
    path[0] === "manual" &&
    path[1] &&
    !(series==="e30" ? ["EWD", ...e30ManualGroups.map(group=>group.id)] : [...manualChapters.map((c) => c.id), "EWD", "INDEX"]).includes(path[1])
  )
    notFound();
  if (path[0] === "quick-reference" &&
    (path.length > 2 || (path[1] && !referenceSections.some((item) => item.id === path[1]))))
    notFound();
  const acceptsSeries = (path.length === 1 && path[0] === "garage") || (path[0] === "community" && path[1] === "new");
  const pageSeries = vehicleSeriesEnabled && acceptsSeries && isSeries(query.series) ? query.series : series;
  return <Shell series={pageSeries} path={path} query={query} />;
}
