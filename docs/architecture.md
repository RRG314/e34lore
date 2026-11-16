# Architecture

E34 Lore and E30 Lore run in one React and TypeScript application. The App Router provides stable public URLs and Vinext serves the app through a Worker on Sites.

## Vehicle and reference data

The shared vehicle context drives the Workshop, catalog, scanner, and service references. Each generation uses its own vehicle definitions, catalog records, manual references, and model revisions. The catalog preserves the source configuration and applicability conditions for a part. Missing evidence stays unknown.

The Three.js Workshop loads immutable manifests and model assets. Component identities connect model selections to catalog diagrams and service references. Saved views and builds resolve against their recorded model revision. [Workshop model notes](digital-twin-workshop.md)

Repair guides and manual locators link to their sources. Follow the stated model, engine, and production conditions when using a reference. [Catalog evidence](owned-catalog.md)

## Accounts and member records

Supabase Auth handles sign-in and recovery. PostgreSQL row-level security enforces ownership for vehicles, maintenance records, builds, scans, and private photos. Members use one Garage for both generations and explicitly select what to share. Staff operations require a staff role and a verified authenticator session.

The baseline schema is in [database](../database). Incremental migrations and Edge Functions are in [supabase](../supabase). [API and data](api-and-data.md) · [Community architecture](community-architecture.md)

## Scanner and analytics

The Part Scanner compares images and reads markings in the browser. Catalog lookups and private saves use the existing backend. [Part Scanner](scanner/README.md)

Cloudflare measures traffic on public pages. Supabase stores daily totals for selected public actions and serves the owner report. The site keeps photos and private Garage records outside analytics. [Website analytics](https://e34lore.com/manage/analytics)

## Hosting and verification

GitHub Actions verifies the source. Maintainers publish through Sites after the production build and live checks pass. The browser-installed app uses the same hosted routes. [Development and releases](local-development-and-release.md)
