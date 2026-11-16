-- Atomic content history. Parent RLS remains the source of visibility decisions.
alter table public.threads add column content_version integer not null default 1 check(content_version>0);
alter table public.posts add column content_version integer not null default 1 check(content_version>0),
 add column updated_at timestamptz not null default now();

create table public.contribution_revisions (
 id bigint generated always as identity primary key,
 thread_id uuid references public.threads on delete cascade,
 post_id uuid references public.posts on delete cascade,
 content_version integer not null check(content_version>0),
 editor_id uuid references auth.users on delete set null,
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
 kind text not null check(kind in ('original','edit','baseline')),
 recorded_at timestamptz not null default now(),
 check(num_nonnulls(thread_id,post_id)=1),
 unique(thread_id,content_version),
 unique(post_id,content_version)
);
create index contribution_revisions_editor on public.contribution_revisions(editor_id);
alter table public.contribution_revisions enable row level security;
revoke all on public.contribution_revisions from public,anon,authenticated;
grant select on public.contribution_revisions to anon,authenticated;
create policy contribution_history_read on public.contribution_revisions for select to anon,authenticated using (
 exists(select 1 from public.threads t where t.id=thread_id)
 or exists(select 1 from public.posts p where p.id=post_id)
);

-- A private helper keeps the snapshot format consistent for backfills and triggers.
create function e34_private.contribution_snapshot(record_data jsonb) returns jsonb
 language sql immutable security invoker set search_path='' as $$
 select record_data - array['id','author_id','created_at','updated_at','hidden','content_version'];
$$;
revoke all on function e34_private.contribution_snapshot(jsonb) from public,anon,authenticated;

-- The first recorded value on an existing installation is explicitly a baseline.
-- Earlier edits cannot be reconstructed and must never be fabricated.
insert into public.contribution_revisions(thread_id,content_version,snapshot,kind)
 select id,content_version,e34_private.contribution_snapshot(to_jsonb(t)),'baseline' from public.threads t;
insert into public.contribution_revisions(post_id,content_version,snapshot,kind)
 select id,content_version,e34_private.contribution_snapshot(to_jsonb(p)),'baseline' from public.posts p;

create function e34_private.prepare_content_revision() returns trigger
 language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  new.content_version:=1;
  new.updated_at:=now();
 else
  if new.id is distinct from old.id then raise exception 'Contribution identity is immutable'; end if;
  if new.content_version is distinct from old.content_version then raise exception 'Content version is assigned by the database'; end if;
  if e34_private.contribution_snapshot(to_jsonb(new)) is distinct from e34_private.contribution_snapshot(to_jsonb(old)) then
   new.content_version:=old.content_version+1;
   new.updated_at:=now();
  else
   new.updated_at:=old.updated_at;
  end if;
 end if;
 return new;
end;
$$;
revoke all on function e34_private.prepare_content_revision() from public,anon,authenticated;

create function e34_private.capture_content_revision() returns trigger
 language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and new.content_version=old.content_version then return new; end if;
 insert into public.contribution_revisions(thread_id,post_id,content_version,editor_id,snapshot,kind)
 values(case when tg_table_name='threads' then new.id end,
        case when tg_table_name='posts' then new.id end,
        new.content_version,auth.uid(),e34_private.contribution_snapshot(to_jsonb(new)),
        case when tg_op='INSERT' then 'original' else 'edit' end);
 return new;
end;
$$;
revoke all on function e34_private.capture_content_revision() from public,anon,authenticated;
-- The zz prefix runs after the existing ownership/rate/moderation guard.
create trigger zz_prepare_revision before insert or update on public.threads for each row execute function e34_private.prepare_content_revision();
create trigger zz_prepare_revision before insert or update on public.posts for each row execute function e34_private.prepare_content_revision();
create trigger capture_revision after insert or update on public.threads for each row execute function e34_private.capture_content_revision();
create trigger capture_revision after insert or update on public.posts for each row execute function e34_private.capture_content_revision();
