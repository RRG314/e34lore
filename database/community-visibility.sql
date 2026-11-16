create function e34_private.community_muted(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.community_preferences where user_id=auth.uid() and target_user_id=target);
$$;
revoke all on function e34_private.community_muted(uuid) from public,anon,authenticated;
grant execute on function e34_private.community_muted(uuid) to anon,authenticated;
create or replace function public.browse_community(search_query text default '',category_filter text default '',tag_filter text default '',starter_filter text default '',page_size integer default 21,cursor_created_at timestamptz default null,cursor_id uuid default null)
returns setof public.threads language sql stable security invoker set search_path='' as $$
 select t.* from public.threads t where char_length(search_query)<=300
 and not e34_private.community_muted(t.author_id)
 and(category_filter='' or t.category=category_filter) and(tag_filter='' or tag_filter=any(t.tag_ids))
 and(starter_filter='' or t.starter_topic_id=starter_filter)
 and(btrim(search_query)='' or to_tsvector('english',t.title||' '||t.body)@@websearch_to_tsquery('english',search_query))
 and((cursor_created_at is null and cursor_id is null) or(t.created_at,t.id)<(cursor_created_at,cursor_id))
 order by t.created_at desc,t.id desc limit least(greatest(page_size,1),51);
$$;
create or replace function public.browse_community_replies(discussion uuid,page_size integer default 51,cursor_created_at timestamptz default null,cursor_id uuid default null,focus_post uuid default null)
returns setof public.posts language sql stable security invoker set search_path='' as $$
 select p.* from public.posts p where p.thread_id=discussion
 and not e34_private.community_muted(p.author_id)
 and ((cursor_created_at is null and cursor_id is null) or(p.created_at,p.id)>(cursor_created_at,cursor_id))
 and (focus_post is null or (p.created_at,p.id)>=(select f.created_at,f.id from public.posts f where f.id=focus_post and f.thread_id=discussion))
 order by p.created_at,p.id limit least(greatest(page_size,1),51);
$$;
create or replace function e34_private.guard_thread_node() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and new.node_id is not distinct from old.node_id and new.configuration_revision_id is not distinct from old.configuration_revision_id and new.part_id is not distinct from old.part_id then return new; end if;
 if new.node_id is not null and not exists(select 1 from public.assembly_nodes n join public.digital_twin_configuration_revisions r on r.id=n.configuration_revision_id where n.id=new.node_id and r.id=new.configuration_revision_id and r.publication_status='published' and (new.part_id is null or n.part_id is null or new.part_id=n.part_id)) then raise exception 'Choose a published workshop node with matching part context'; end if;
 return new;
end $$;
