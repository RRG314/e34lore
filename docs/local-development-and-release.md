# Development and releases

## Standalone demo

Run `npm run dev` to use the built-in demo. The browser reads original sample catalog records and model assets. Public repair and reference pages remain available. Use `node scripts/prepare-scanner-runtime.mjs` before testing browser OCR in the development server. The regular build prepares it automatically.

## Local backend

Use a loopback [Supabase stack](https://supabase.com/docs/guides/local-development/cli/getting-started) for authenticated workflows. Set `E34_SITE_MODE=local`, `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. Use the local publishable key or legacy anon key. The application schema starts with the SQL baseline under `database/` and uses the migrations in `supabase/migrations/`. The disposable SQL suite in `scripts/test-security-db.py` shows the baseline order and covers Auth and Storage policy checks with local test doubles. A full Supabase bootstrap with Auth, Storage and Edge Functions still needs manual setup.

## Release assets

A release asset pack contains a `public/` directory and its reviewed `public-assets.json` manifest. Place it outside tracked source and set `E34_ASSET_PACK` to its directory. Supply only data and assets authorized for the distribution you are building. The test suites that compare actual release files also use the pack. The retained catalog tests read their sources from `catalog-research/catalog-snapshots/` within that pack.

The production build requires `E34_SITE_MODE=production`, an explicit HTTPS Supabase origin and a publishable key. Set `E34_E30_BUILD=1` to package both series. Keep deployment credentials in the hosting service and the model revisions required by saved views in the release pack. For an existing database, confirm the applied migration history before deploying new migrations. Earlier catalog imports are managed with the corresponding data pack.

GitHub Actions verifies the demo source. A production release is a separate maintainer action. Record the exact source commit, migration versions and released model revisions.
