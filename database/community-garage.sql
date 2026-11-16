alter table public.threads add column part_id text references public.parts, add column guide_id text references public.guides;
create index threads_part on public.threads(part_id);
create index threads_guide on public.threads(guide_id);
alter table public.service_records add column due_on date, add column due_mileage numeric check(due_mileage>=0);
create table public.vehicle_modifications (id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users on delete cascade,vehicle_id uuid not null,title text not null check(char_length(title) between 2 and 160),notes text not null default '' check(char_length(notes)<=12000),created_at timestamptz not null default now(),foreign key(vehicle_id,user_id) references public.owned_vehicles(id,user_id) on delete cascade);
create table public.installed_parts (id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users on delete cascade,vehicle_id uuid not null,part_id text references public.parts,description text not null check(char_length(description) between 2 and 160),number_raw text not null default '' check(char_length(number_raw)<=60),notes text not null default '' check(char_length(notes)<=12000),created_at timestamptz not null default now(),foreign key(vehicle_id,user_id) references public.owned_vehicles(id,user_id) on delete cascade);
create index modifications_vehicle on public.vehicle_modifications(vehicle_id,user_id);
create index modifications_owner on public.vehicle_modifications(user_id);
create index installed_vehicle on public.installed_parts(vehicle_id,user_id);
create index installed_owner on public.installed_parts(user_id);
create index installed_part on public.installed_parts(part_id);
do $$ declare t text; begin foreach t in array array['vehicle_modifications','installed_parts'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy owner_read on public.%I for select to authenticated using(user_id=(select auth.uid()))',t);
 execute format('create policy owner_insert on public.%I for insert to authenticated with check(user_id=(select auth.uid()))',t);
 execute format('create policy owner_update on public.%I for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()))',t);
 execute format('create policy owner_delete on public.%I for delete to authenticated using(user_id=(select auth.uid()))',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
end loop; end $$;

create policy answer_update on public.accepted_answers for update to authenticated using(accepted_by=(select auth.uid()) and exists(select 1 from public.threads where id=thread_id and author_id=(select auth.uid()))) with check(accepted_by=(select auth.uid()) and exists(select 1 from public.threads where id=thread_id and author_id=(select auth.uid())) and exists(select 1 from public.posts where id=post_id and not hidden));
grant update on public.accepted_answers to authenticated;
create policy moderator_threads_read on public.threads for select to authenticated using(e34_private.has_role('moderator'));
create policy moderator_posts_read on public.posts for select to authenticated using(e34_private.has_role('moderator'));
create function public.current_permissions() returns text[] language sql stable security definer set search_path='' as $$ select coalesce(array_agg(role),'{}') from e34_private.staff_roles where user_id=(select auth.uid()); $$;
revoke all on function public.current_permissions() from public,anon;
grant execute on function public.current_permissions() to authenticated;

-- Record revision metadata without copying private body text into the audit log.
create function e34_private.audit_mutation() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into e34_private.audit_events(actor_id,action,table_name,record_id) values(auth.uid(),tg_op,tg_table_name,case when tg_op='DELETE' then to_jsonb(old)->>'id' else to_jsonb(new)->>'id' end);
 return coalesce(new,old);
end $$;
revoke all on function e34_private.audit_mutation() from public;
do $$ declare t text; begin foreach t in array array['threads','posts','accepted_answers','reports','review_submissions','repair_outcomes'] loop execute format('create trigger audit_changes after insert or update or delete on public.%I for each row execute function e34_private.audit_mutation()',t); end loop; end $$;
-- Deny policies are explicit; private staff and audit records have no client grants.
create policy staff_no_client_access on e34_private.staff_roles for all to authenticated using(false) with check(false);
create policy audit_no_client_access on e34_private.audit_events for all to authenticated using(false) with check(false);
