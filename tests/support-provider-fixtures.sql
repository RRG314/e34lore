-- Isolated substitutes for hosted-only Vault / pg_net / pg_cron. No network IO.
create schema vault;
create table vault.secrets(id uuid primary key default gen_random_uuid(),name text unique,decrypted_secret text,description text);
create view vault.decrypted_secrets as select * from vault.secrets;
create function vault.create_secret(value text,name text,description text) returns uuid language sql as $$insert into vault.secrets(decrypted_secret,name,description) values(value,name,description) returning id;$$;
create schema cron;
create table cron.job(jobid bigserial primary key,jobname text unique,schedule text,command text);
create function cron.schedule(name text,schedule text,command text) returns bigint language sql as $$insert into cron.job(jobname,schedule,command) values(name,schedule,command) on conflict(jobname) do update set schedule=excluded.schedule,command=excluded.command returning jobid;$$;
create function cron.unschedule(name text) returns boolean language plpgsql as $$begin delete from cron.job where jobname=name;return found;end;$$;
create schema net;
create table net.requests(id bigserial primary key,url text,headers jsonb,body jsonb,timeout_milliseconds integer);
create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer) returns bigint language sql as $$insert into net.requests(url,headers,body,timeout_milliseconds) values(url,headers,body,timeout_milliseconds) returning id;$$;
