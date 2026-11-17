# API and data

The browser uses Supabase Auth, PostgREST and Edge Functions. Use the publishable key in the browser. Server credentials belong to the operator’s environment. The application uses row-level security to distinguish public references, private owner records and staff review.

| Data | Access |
| --- | --- |
| Catalog, released Workshop references and published guides | Public reads. Reviewed imports maintain stable IDs and revisions. |
| Garage vehicles, VINs, photos, private builds and saved scans | Owner reads and writes. Shared builds and approved photos are served through separate public projections. |
| Forum threads and replies | Public once published. Authors manage their own submissions. |
| Reports and technical corrections | Email-confirmed members can submit. Staff need the applicable role and verification to review. Unsigned visitors and legacy anonymous sessions cannot submit to either queue. |
| Support, analytics, and affiliate administration | Staff-only access to private records and controls. Public endpoints expose only the relevant readiness, aggregates or approved offers. |

The SQL baseline lives in [database](../database). [Migrations](../supabase/migrations) extend it and [Edge Functions](../supabase/functions) handle provider integrations and scoped uploads. The standalone demo supplies synthetic catalog reads in memory. It needs neither an Auth session nor a hosted API.
