-- Disposable loopback PostgreSQL fixture only. Never apply to a hosted project.
do $$begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin;end if;if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin;end if;if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls;end if;end;$$;
create schema auth;
create schema e34_private;
create schema storage;
create schema extensions;
create extension pgcrypto with schema extensions;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean default false);
create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id) on delete cascade,not_after timestamptz,aal text);
create table auth.mfa_factors(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete cascade,status text);
create table e34_private.staff_roles(user_id uuid references auth.users(id) on delete cascade,role text);
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb;$$;
create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid;$$;
create function e34_private.commercial_admin() returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and auth.jwt()->>'aal'='aal2' and exists(select 1 from e34_private.staff_roles where user_id=auth.uid() and role='admin') and exists(select 1 from auth.sessions where id=(auth.jwt()->>'session_id')::uuid and user_id=auth.uid() and aal='aal2' and(not_after is null or not_after>now())) and exists(select 1 from auth.mfa_factors where user_id=auth.uid() and status='verified');$$;
grant usage on schema auth,e34_private to authenticated,service_role;
grant usage on schema public,extensions to anon,authenticated,service_role;
grant execute on function auth.jwt(),auth.uid(),e34_private.commercial_admin() to authenticated,service_role;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
