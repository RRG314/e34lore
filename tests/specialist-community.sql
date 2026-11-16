-- Runs only in the disposable security database; no production recommendation is created.
begin;
create function pg_temp.check_specialist(ok boolean,label text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAIL: %',label;end if;end$$;
insert into auth.users(id,email,email_confirmed_at,created_at,is_anonymous) values
 ('e3400000-0000-4000-8000-000000009901','specialist-author@example.invalid',now(),now()-interval '3 days',false),
 ('e3400000-0000-4000-8000-000000009902','specialist-reader@example.invalid',now(),now()-interval '3 days',false),
 ('e3400000-0000-4000-8000-000000009903','specialist-staff@example.invalid',now(),now()-interval '3 days',false);
insert into auth.sessions(id,user_id,aal) select ('e3400000-0000-4000-9000-'||lpad(n::text,12,'0'))::uuid,('e3400000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'aal2' from generate_series(9901,9903)n;
insert into auth.mfa_factors(user_id,status) values('e3400000-0000-4000-8000-000000009903','verified');
insert into e34_private.staff_roles(user_id,role) values('e3400000-0000-4000-8000-000000009903','moderator');
select set_config('request.jwt.claims','{"sub":"e3400000-0000-4000-8000-000000009901","session_id":"e3400000-0000-4000-9000-000000009901","aal":"aal1","role":"authenticated"}',true);
set local role authenticated;
insert into public.threads(id,title,body,category,template_id) values('e3400000-0000-4000-8000-000000009910','BMW specialist: Transaction fixture workshop','Synthetic test only. Business location, official source, first-hand work and connections are described by the author.','General E34 Community','general');
select pg_temp.check_specialist(exists(select 1 from public.browse_community(search_query=>'BMW specialist',page_size=>20) where id='e3400000-0000-4000-8000-000000009910'),'directory recommendations use the existing searchable community');
select set_config('request.jwt.claims','{"sub":"e3400000-0000-4000-8000-000000009902","session_id":"e3400000-0000-4000-9000-000000009902","aal":"aal1","role":"authenticated"}',true);
update public.threads set body='Unauthorized rewrite attempt that must affect no rows.' where id='e3400000-0000-4000-8000-000000009910';
select pg_temp.check_specialist(exists(select 1 from public.threads where id='e3400000-0000-4000-8000-000000009910' and body like 'Synthetic test only.%'),'another member cannot rewrite the recommendation');
insert into public.reports(target_type,target_id,reason) values('thread','e3400000-0000-4000-8000-000000009910','Transaction-only concern to confirm normal report routing.');
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
select pg_temp.check_specialist(exists(select 1 from public.browse_community(search_query=>'BMW specialist') where id='e3400000-0000-4000-8000-000000009910'),'visitors can read published recommendations');
do $$ begin begin perform * from public.reports where target_id='e3400000-0000-4000-8000-000000009910'; if found then raise exception 'FAIL: reports exposed';end if; exception when insufficient_privilege then null;end;end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"e3400000-0000-4000-8000-000000009903","session_id":"e3400000-0000-4000-9000-000000009903","aal":"aal2","role":"authenticated"}',true);
set local role authenticated;
update public.threads set hidden=true where id='e3400000-0000-4000-8000-000000009910';
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
select pg_temp.check_specialist(not exists(select 1 from public.browse_community(search_query=>'BMW specialist') where id='e3400000-0000-4000-8000-000000009910'),'hidden recommendations disappear from the public directory query');
reset role;
rollback;
select 'PASS: specialist recommendation persistence, search, authorship, private reports and MFA moderation visibility' as verification;
