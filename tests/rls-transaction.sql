-- Disposable fixtures exist only in this transaction. Rollback is mandatory.
begin;
insert into auth.users(id,email,aud,role,created_at,updated_at) values
 ('ed340000-0000-4000-8000-000000000001','e34-rls-owner@example.invalid','authenticated','authenticated',now(),now()),
 ('ed340000-0000-4000-8000-000000000002','e34-rls-other@example.invalid','authenticated','authenticated',now(),now());
update auth.users set email_confirmed_at=now(),created_at=now()-interval '2 days' where id in ('ed340000-0000-4000-8000-000000000001','ed340000-0000-4000-8000-000000000002');
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
insert into public.owned_vehicles(id,nickname,model_id) values('ed340000-0000-4000-8000-000000000010','RLS fixture','525i');
insert into public.service_records(vehicle_id,title,performed_on) values('ed340000-0000-4000-8000-000000000010','Inspection',current_date);
insert into public.threads(id,title,body,category,part_id,guide_id) values('ed340000-0000-4000-8000-000000000020','RLS linked discussion','This is a disposable integration test observation.','Technical help','coolant-pump','cooling-system-visual-check');
insert into public.posts(id,thread_id,body) values('ed340000-0000-4000-8000-000000000030','ed340000-0000-4000-8000-000000000020','Source-backed test reply.');
insert into public.accepted_answers(thread_id,post_id) values('ed340000-0000-4000-8000-000000000020','ed340000-0000-4000-8000-000000000030');
insert into public.bookmarks(kind,target_id,title) values('part','coolant-pump','Mechanical coolant pump');
do $$ begin
 if (select count(*) from public.owned_vehicles)<>1 then raise exception 'Owner cannot read private vehicle'; end if;
 if (select count(*) from public.accepted_answers where thread_id='ed340000-0000-4000-8000-000000000020')<>1 then raise exception 'Author acceptance did not persist'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.owned_vehicles where id='ed340000-0000-4000-8000-000000000010') then raise exception 'Private garage exposed to another account'; end if;
 if exists(select 1 from public.service_records where vehicle_id='ed340000-0000-4000-8000-000000000010') then raise exception 'Private service record exposed'; end if;
 if exists(select 1 from public.bookmarks where target_id='coolant-pump') then raise exception 'Private bookmark exposed'; end if;
 if not exists(select 1 from public.threads where id='ed340000-0000-4000-8000-000000000020') then raise exception 'Published discussion not readable'; end if;
 begin
  insert into public.service_records(vehicle_id,user_id,title,performed_on) values('ed340000-0000-4000-8000-000000000010','ed340000-0000-4000-8000-000000000001','Intrusion',current_date);
  raise exception 'Unauthorized insert succeeded';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.service_records(vehicle_id,title,performed_on) values('ed340000-0000-4000-8000-000000000010','Cross-owner linkage',current_date);
  raise exception 'Cross-owner vehicle linkage succeeded';
 exception when foreign_key_violation then null; end;
 begin
  update public.threads set hidden=true where id='ed340000-0000-4000-8000-000000000020';
  if found then raise exception 'Non-author changed thread'; end if;
 end;
 begin
  insert into public.repair_outcomes(guide_id,result,notes,review_status) values('cooling-system-visual-check','resolved','Unsupported verification attempt.','verified');
  raise exception 'Member could self-verify a repair';
 exception when insufficient_privilege then null; end;
end $$;
insert into public.posts(thread_id,body) values('ed340000-0000-4000-8000-000000000020','Reply from the second test account.');
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ begin
 if not exists(select 1 from public.notifications where thread_id='ed340000-0000-4000-8000-000000000020') then raise exception 'Reply notification missing'; end if;
 begin
  update public.threads set hidden=true where id='ed340000-0000-4000-8000-000000000020';
  raise exception 'Owner gained moderation permission';
 exception when raise_exception then if sqlerrm='Owner gained moderation permission' then raise; end if; end;
end $$;
reset role;
select 'PASS: owner persistence, linked context, replies, acceptance, notifications, cross-user privacy, mutation isolation and reviewer boundary' as verification;
rollback;
