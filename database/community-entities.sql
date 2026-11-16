-- Identity indexes of app-authored references; content remains authoritative in
-- the application source. No automotive part or geometry record is duplicated.
create table public.reference_article_index(id text primary key,title text not null);
create table public.diagnostic_flow_index(id text primary key,title text not null);
alter table public.reference_article_index enable row level security;
alter table public.diagnostic_flow_index enable row level security;
revoke all on public.reference_article_index,public.diagnostic_flow_index from public,anon,authenticated;
grant select on public.reference_article_index,public.diagnostic_flow_index to anon,authenticated;
create policy article_index_read on public.reference_article_index for select to anon,authenticated using(true);
create policy diagnostic_index_read on public.diagnostic_flow_index for select to anon,authenticated using(true);
alter table public.threads add column article_slug text references public.reference_article_index,
 add column diagnostic_slug text references public.diagnostic_flow_index,
 add column configuration_revision_id text,
 add column node_id text,
 add constraint thread_node_context foreign key(configuration_revision_id,node_id) references public.assembly_nodes(configuration_revision_id,id),
 add constraint thread_node_pair check((configuration_revision_id is null)=(node_id is null));
create index threads_article on public.threads(article_slug,created_at desc);
create index threads_diagnostic on public.threads(diagnostic_slug,created_at desc);
create index threads_node on public.threads(configuration_revision_id,node_id,created_at desc);
create function e34_private.guard_thread_node() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.node_id is not null and not exists(select 1 from public.assembly_nodes n join public.digital_twin_configuration_revisions r on r.id=n.configuration_revision_id where n.id=new.node_id and r.id=new.configuration_revision_id and r.publication_status='published' and (new.part_id is null or n.part_id is null or new.part_id=n.part_id)) then raise exception 'Choose a published workshop node with matching part context'; end if;
 return new;
end $$;
revoke all on function e34_private.guard_thread_node() from public,anon,authenticated;
create trigger a_thread_node before insert or update on public.threads for each row execute function e34_private.guard_thread_node();
