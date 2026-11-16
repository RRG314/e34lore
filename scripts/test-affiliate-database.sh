#!/usr/bin/env bash
# SQL validation in an isolated, disposable Unix-socket-only database.
set -euo pipefail
umask 077
unset PGHOST PGHOSTADDR PGPORT PGUSER PGDATABASE PGSERVICE PGSERVICEFILE PGOPTIONS PGPASSWORD PGPASSFILE
repo="$(cd "$(dirname "$0")/.." && pwd)"
E34_POSTGRES_BIN="${E34_POSTGRES_BIN:-$(pg_config --bindir)}"
work="$(mktemp -d /tmp/e34-commercial.XXXXXXXX)"
cleanup() {
  if [[ -f "$work/db/postmaster.pid" ]]; then "$E34_POSTGRES_BIN/pg_ctl" -D "$work/db" -m fast -w stop >/dev/null; fi
  rm -rf -- "$work"
}
trap cleanup EXIT
mkdir -m 700 "$work/socket"
"$E34_POSTGRES_BIN/initdb" -D "$work/db" -U postgres --auth=trust --encoding=UTF8 --no-locale >/dev/null
"$E34_POSTGRES_BIN/pg_ctl" -D "$work/db" -o "-c listen_addresses='' -k $work/socket" -l "$work/db.log" -w start >/dev/null
"$E34_POSTGRES_BIN/createdb" -h "$work/socket" -U postgres e34_commercial
sql() { "$E34_POSTGRES_BIN/psql" -X -q -v ON_ERROR_STOP=1 -h "$work/socket" -U postgres -d e34_commercial "$@"; }
sql <<'SQL'
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,created_at timestamptz,updated_at timestamptz,aud text,role text);
create function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}')$$;
grant usage on schema auth to anon,authenticated;
SQL
sql -f "$repo/database/schema.sql" >/dev/null
sql <<'SQL'
create table public.vehicle_catalog_contexts(id text primary key);
insert into public.vehicle_catalog_contexts values('commercial-local-context');
create table public.part_assembly_positions(id text primary key,part_id text references public.parts,assembly_id text,context_id text,reference text,source_name text,source_url text,source_sha256 text,record_sha256 text,active boolean default true);
create table public.part_supersessions(id text primary key,previous_part_id text references public.parts,replacement_part_id text references public.parts,position_id text references public.part_assembly_positions,source_id text,conditions jsonb default '[]');
alter table e34_private.audit_events add column metadata jsonb not null default '{}';
create schema cron;
create function cron.schedule(text,text,text) returns bigint language sql as $$select 1::bigint$$;
SQL
migrations=("$repo"/supabase/migrations/*_affiliate_partnerships_and_advertising.sql)
migration="${1:-${migrations[0]}}"
sql -f "$migration" >/dev/null
for report_migration in "$repo"/supabase/migrations/*_affiliate_reporting_and_catalog_queue.sql; do sql -f "$report_migration" >/dev/null; done
for readiness_migration in "$repo"/supabase/migrations/*_affiliate_launch_readiness.sql; do sql -f "$readiness_migration" >/dev/null; done
mkdir -p "$repo/.codex/qa"
sql -f "$repo/tests/affiliates-transaction.sql" > "$repo/.codex/qa/affiliates-local-sql.log"
tail -n 4 "$repo/.codex/qa/affiliates-local-sql.log"
