-- Stable cursor pagination, including equal timestamps. Parent table RLS applies.
create index threads_recent_cursor on public.threads(created_at desc,id desc);
create index threads_category_cursor on public.threads(category,created_at desc,id desc);
create function public.browse_discussions(search_query text default '', category_filter text default '', page_size integer default 21, cursor_created_at timestamptz default null, cursor_id uuid default null)
 returns setof public.threads language sql stable security invoker set search_path='' as $$
 select t.* from public.threads t
 where char_length(search_query)<=300
 and (category_filter='' or t.category=category_filter)
 and (btrim(search_query)='' or to_tsvector('english',t.title||' '||t.body) @@ websearch_to_tsquery('english',search_query))
 and ((cursor_created_at is null and cursor_id is null) or (t.created_at,t.id)<(cursor_created_at,cursor_id))
 order by t.created_at desc,t.id desc
 limit least(greatest(page_size,1),51);
$$;
revoke all on function public.browse_discussions(text,text,integer,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.browse_discussions(text,text,integer,timestamptz,uuid) to anon,authenticated;
