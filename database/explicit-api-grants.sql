-- Supabase's default table grants are broad. Keep grants and RLS as separate boundaries.
revoke all on all tables in schema public from anon,authenticated;
alter default privileges in schema public revoke all on tables from anon,authenticated;
alter default privileges in schema public revoke execute on functions from public;
grant select on public.vehicle_models,public.sources,public.components,public.assemblies,public.parts,public.part_fitments,public.part_interchanges,public.guides,public.profiles,public.threads,public.posts,public.accepted_answers to anon,authenticated;
grant insert,update on public.profiles to authenticated;
grant insert,update,delete on public.threads,public.posts,public.accepted_answers to authenticated;
grant select,insert,update,delete on public.owned_vehicles,public.service_records,public.bookmarks,public.vehicle_modifications,public.installed_parts to authenticated;
grant select,insert,update on public.repair_outcomes,public.reports,public.review_submissions to authenticated;
grant select on public.notifications to authenticated;
grant update(read_at) on public.notifications to authenticated;
