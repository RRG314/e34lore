alter table public.threads add column vehicle_configuration jsonb not null default '{}'::jsonb;
alter table public.threads add constraint thread_configuration_shape check(jsonb_typeof(vehicle_configuration)='object' and octet_length(vehicle_configuration::text)<=2048 and vehicle_configuration-array['model','engine','year','month','market','body','transmission','steering']='{}'::jsonb);
create function public.search_discussions(search_query text,max_results integer default 30) returns setof public.threads language sql stable security invoker set search_path='' as $$
 select t.* from public.threads t
 where char_length(search_query) between 1 and 300
 and to_tsvector('english',t.title||' '||t.body) @@ websearch_to_tsquery('english',search_query)
 order by ts_rank_cd(to_tsvector('english',t.title||' '||t.body),websearch_to_tsquery('english',search_query)) desc,t.created_at desc
 limit least(greatest(max_results,1),50);
$$;
revoke all on function public.search_discussions(text,integer) from public;
grant execute on function public.search_discussions(text,integer) to anon,authenticated;
