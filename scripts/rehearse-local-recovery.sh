#!/usr/bin/env bash
# Restore synthetic E34 data between two Unix-socket-only PostgreSQL clusters.
set -euo pipefail
umask 077
unset PGHOST PGHOSTADDR PGPORT PGUSER PGDATABASE PGSERVICE PGSERVICEFILE PGOPTIONS PGPASSWORD PGPASSFILE
repo="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -z "${E34_POSTGRES_BIN:-}" ]]; then
  E34_POSTGRES_BIN="$(pg_config --bindir)"
fi
for tool in initdb pg_ctl createdb psql pg_dump pg_restore; do
  test -x "$E34_POSTGRES_BIN/$tool" || { printf 'Missing PostgreSQL tool %s\n' "$tool" >&2; exit 1; }
done
work="$(mktemp -d /tmp/e34-restore.XXXXXXXX)"
cleanup() {
  for cluster in restore source; do
    if [[ -f "$work/$cluster/postmaster.pid" ]]; then
      "$E34_POSTGRES_BIN/pg_ctl" -D "$work/$cluster" -m fast -w stop >/dev/null
    fi
  done
  rm -rf -- "$work"
}
trap cleanup EXIT
cd "$repo"

start_cluster() {
  local cluster="$1"
  mkdir -m 700 "$work/$cluster-sock"
  "$E34_POSTGRES_BIN/initdb" -D "$work/$cluster" -U postgres --auth=trust --encoding=UTF8 --no-locale >/dev/null
  "$E34_POSTGRES_BIN/pg_ctl" -D "$work/$cluster" -o "-c listen_addresses='' -k $work/$cluster-sock" -l "$work/$cluster.log" -w start >/dev/null
  "$E34_POSTGRES_BIN/createdb" -h "$work/$cluster-sock" -U postgres e34_rehearsal
}
sql() {
  local cluster="$1"
  shift
  "$E34_POSTGRES_BIN/psql" -X -q -v ON_ERROR_STOP=1 -h "$work/$cluster-sock" -U postgres -d e34_rehearsal "$@"
}

start_cluster source
start_cluster restore
# Provider-owned roles must exist independently of the application archive.
for cluster in source restore; do
  sql "$cluster" <<'SQL'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
SQL
done
sql source <<'SQL'
create schema auth;
create table auth.users (id uuid primary key, email text, aud text, role text,
  created_at timestamptz not null default now(), updated_at timestamptz,
  email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true),'')::jsonb->>'sub')::uuid
$$;
SQL
for file in schema community-garage explicit-api-grants review-and-indexes notifications owner-export-access; do
  sql source -f "database/$file.sql"
done
sql source <<'SQL'
insert into public.vehicle_models values ('525i','Synthetic 525i',array['M50'],'Recovery fixture');
insert into auth.users(id,email,email_confirmed_at) values
 ('e3400000-0000-4000-8000-000000000001','restore-owner@example.invalid',now()),
 ('e3400000-0000-4000-8000-000000000002','restore-other@example.invalid',now());
select set_config('request.jwt.claims','{"sub":"e3400000-0000-4000-8000-000000000001"}',false);
set role authenticated;
insert into public.owned_vehicles(id,nickname,model_id) values
 ('e3400000-0000-4000-8000-000000000010','Synthetic private car','525i');
insert into public.service_records(vehicle_id,title,performed_on) values
 ('e3400000-0000-4000-8000-000000000010','Synthetic inspection',current_date);
insert into public.threads(id,title,body,category) values
 ('e3400000-0000-4000-8000-000000000020','Synthetic recovery discussion','This local test content never leaves the machine.','Technical help');
reset role;
SQL

start="$(date +%s)"
archive="$work/synthetic-e34.dump"
"$E34_POSTGRES_BIN/pg_dump" -h "$work/source-sock" -U postgres -Fc -f "$archive" e34_rehearsal
"$E34_POSTGRES_BIN/pg_restore" -h "$work/restore-sock" -U postgres --exit-on-error --single-transaction --dbname=e34_rehearsal "$archive"

sql restore <<'SQL'
do $$ begin
  if (select count(*) from auth.users) <> 2 then raise exception 'Missing fixture identities'; end if;
  if (select count(*) from e34_private.audit_events where action='INSERT' and table_name='threads'
      and record_id='e3400000-0000-4000-8000-000000000020') <> 1 then
    raise exception 'Missing audit metadata';
  end if;
end $$;
select set_config('request.jwt.claims','{"sub":"e3400000-0000-4000-8000-000000000001"}',false);
set role authenticated;
do $$ begin
  if (select count(*) from public.owned_vehicles) <> 1 or (select count(*) from public.service_records) <> 1 then
    raise exception 'Owner cannot read restored private vehicle and service records';
  end if;
end $$;
select set_config('request.jwt.claims','{"sub":"e3400000-0000-4000-8000-000000000002"}',false);
do $$ begin
  if exists(select 1 from public.owned_vehicles) or exists(select 1 from public.service_records) then
    raise exception 'Cross-owner access after restore';
  end if;
  if (select count(*) from public.threads) <> 1 then raise exception 'Public discussion missing'; end if;
  begin
    perform 1 from e34_private.audit_events;
    raise exception 'Audit log exposed to member';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set role anon;
do $$ begin
  if (select count(*) from public.threads) <> 1 then raise exception 'Public discussion unreadable'; end if;
  begin
    perform 1 from public.owned_vehicles;
    raise exception 'Anonymous role can select private vehicles';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
delete from auth.users where id='e3400000-0000-4000-8000-000000000001';
do $$ begin
  if exists(select 1 from public.owned_vehicles) or exists(select 1 from public.service_records)
    or exists(select 1 from public.threads) then
    raise exception 'Account deletion cascade did not survive restore';
  end if;
end $$;
SQL
printf 'PASS: independent local restore, fixture identities, audit history, RLS/grants and account cascades\n'
printf 'Archive bytes: %s\n' "$(wc -c < "$archive" | tr -d ' ')"
printf 'Archive SHA-256: %s\n' "$(shasum -a 256 "$archive" | cut -d' ' -f1)"
printf 'Dump, restore and assertions: %ss\n' "$(( $(date +%s) - start ))"
