export function GET() {
  return new Response(
    "User-agent: *\nDisallow: /account\nDisallow: /garage\nAllow: /garages\nDisallow: /admin\nDisallow: /manage\nDisallow: /workshop/assets\nDisallow: /workshop/inspections\nDisallow: /api/\nDisallow: /go/\nDisallow: /community/new\nSitemap: https://e34lore.com/sitemap.xml\n",
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
