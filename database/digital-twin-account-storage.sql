create function public.account_twin_file_paths(target_user_id uuid,after_path text default '') returns table(path text) language sql stable security definer set search_path='' as $$
 select name from storage.objects where bucket_id='e34-twin-submissions' and name like target_user_id::text||'/%' and name>after_path order by name limit 1000;
$$;
revoke all on function public.account_twin_file_paths(uuid,text) from public,anon,authenticated;
grant execute on function public.account_twin_file_paths(uuid,text) to service_role;
