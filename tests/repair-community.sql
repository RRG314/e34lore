-- Disposable local database only. Every synthetic contribution is rolled back.
begin;
create function pg_temp.repair_assert(ok boolean,label text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAIL: %',label;end if;end$$;
insert into auth.users(id,email,email_confirmed_at,created_at,is_anonymous) values
 ('e34c0000-0000-4000-8000-000000000001','repair-author@example.invalid',now(),now()-interval '3 days',false),
 ('e34c0000-0000-4000-8000-000000000002','repair-reader@example.invalid',now(),now()-interval '3 days',false),
 ('e34c0000-0000-4000-8000-000000000003','repair-moderator@example.invalid',now(),now()-interval '3 days',false);
insert into auth.sessions(id,user_id,aal) values ('e34c0000-0000-4000-9000-000000000003','e34c0000-0000-4000-8000-000000000003','aal2');
insert into auth.mfa_factors(user_id,status) values ('e34c0000-0000-4000-8000-000000000003','verified');
insert into e34_private.staff_roles(user_id,role) values ('e34c0000-0000-4000-8000-000000000003','moderator');
select set_config('request.jwt.claims','{"sub":"e34c0000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',true);
set local role authenticated;
insert into public.threads(id,title,body,category,template_id,manual_chapter_id,observations) values
 ('e34c0000-0000-4000-a000-000000000001','Window repair walkthrough fixture','Synthetic local fixture with tools, time, numbered steps, original photo links, manual references and an outcome.','Maintenance, Repairs & DIY','repair','512','[{"question":"E34 Lore repair topic","answer":"512-job-window-regulator-and-motor"}]'),
 ('e34c0000-0000-4000-a000-000000000002','Window repair comment fixture','Synthetic local comment for the same repair, with a source question and specific vehicle context.','Maintenance, Repairs & DIY','general','512','[{"question":"E34 Lore repair topic","answer":"512-job-window-regulator-and-motor"}]'),
 ('e34c0000-0000-4000-a000-000000000003','Unrelated door repair fixture','Synthetic local fixture for another repair in the same manual chapter.','Maintenance, Repairs & DIY','repair','512','[{"question":"E34 Lore repair topic","answer":"512-job-window-alignment"}]');
select pg_temp.repair_assert((select count(*)=2 from public.threads where observations @> '[{"question":"E34 Lore repair topic","answer":"512-job-window-regulator-and-motor"}]'),'exact JSONB topic filter includes write-ups and comments without another job');
select pg_temp.repair_assert((select count(*)=1 from public.threads where template_id='repair' and observations @> '[{"question":"E34 Lore repair topic","answer":"512-job-window-regulator-and-motor"}]'),'write-ups retain the existing repair template');
select set_config('request.jwt.claims','{"sub":"e34c0000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',true);
insert into public.posts(id,thread_id,body) values ('e34c0000-0000-4000-b000-000000000001','e34c0000-0000-4000-a000-000000000001','Synthetic local reply to keep the follow-up with this owner walkthrough.');
update public.threads set body='An unauthorized edit that must affect no records.' where id='e34c0000-0000-4000-a000-000000000001';
select pg_temp.repair_assert(exists(select 1 from public.threads where id='e34c0000-0000-4000-a000-000000000001' and body like 'Synthetic local fixture%'),'another owner cannot rewrite a walkthrough');
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
select pg_temp.repair_assert((select count(*)=2 from public.threads where observations @> '[{"question":"E34 Lore repair topic","answer":"512-job-window-regulator-and-motor"}]'),'visitors can read published repair comments and write-ups');
select pg_temp.repair_assert(exists(select 1 from public.browse_community_replies(discussion=>'e34c0000-0000-4000-a000-000000000001') where id='e34c0000-0000-4000-b000-000000000001'),'normal community replies remain readable');
reset role;
select set_config('request.jwt.claims','{"sub":"e34c0000-0000-4000-8000-000000000003","session_id":"e34c0000-0000-4000-9000-000000000003","aal":"aal2","role":"authenticated"}',true);
set local role authenticated;
update public.threads set hidden=true where id='e34c0000-0000-4000-a000-000000000001';
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
select pg_temp.repair_assert(not exists(select 1 from public.threads where id='e34c0000-0000-4000-a000-000000000001'),'hidden walkthroughs disappear from repair pages through existing RLS');
reset role;
rollback;
select 'PASS: repair write-ups, exact topic comments, replies, authorship and moderation use existing tables and policies' as verification;
