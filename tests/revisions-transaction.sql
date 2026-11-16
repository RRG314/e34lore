-- Hosted integration fixtures are transaction-only. Do not remove ROLLBACK.
begin;
insert into auth.users(id,email,aud,role,created_at,updated_at) values
 ('ed340000-0000-4000-8000-000000000101','e34-history-owner@example.invalid','authenticated','authenticated',now(),now()),
 ('ed340000-0000-4000-8000-000000000102','e34-history-other@example.invalid','authenticated','authenticated',now(),now()),
 ('ed340000-0000-4000-8000-000000000103','e34-history-mod@example.invalid','authenticated','authenticated',now(),now());
insert into e34_private.staff_roles(user_id,role) values('ed340000-0000-4000-8000-000000000103','moderator');
update auth.users set email_confirmed_at=now(),created_at=now()-interval '2 days' where id in ('ed340000-0000-4000-8000-000000000101','ed340000-0000-4000-8000-000000000102','ed340000-0000-4000-8000-000000000103');
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000101","role":"authenticated"}',true);
set local role authenticated;
insert into public.threads(id,title,body,category,content_version) values('ed340000-0000-4000-8000-000000000120','Revision integration test','Original observation for the history integration test.','Technical help',99);
insert into public.posts(id,thread_id,body) values('ed340000-0000-4000-8000-000000000130','ed340000-0000-4000-8000-000000000120','Original reply.');
update public.threads set title='Revised integration test',body='The revised observation preserves the original in history.' where id='ed340000-0000-4000-8000-000000000120' and content_version=1;
update public.posts set body='Edited reply.' where id='ed340000-0000-4000-8000-000000000130' and content_version=1;
do $$ begin
 if (select content_version from public.threads where id='ed340000-0000-4000-8000-000000000120')<>2 then raise exception 'Version not assigned atomically'; end if;
 if (select count(*) from public.contribution_revisions where thread_id='ed340000-0000-4000-8000-000000000120')<>2 then raise exception 'Thread history missing'; end if;
 if (select snapshot->>'body' from public.contribution_revisions where post_id='ed340000-0000-4000-8000-000000000130' and content_version=1)<>'Original reply.' then raise exception 'Original reply not preserved'; end if;
 if not exists(select 1 from public.contribution_revisions where thread_id='ed340000-0000-4000-8000-000000000120' and kind='edit' and editor_id=auth.uid()) then raise exception 'Editor attribution missing'; end if;
 update public.threads set body='Stale edit should be rejected by version predicate.' where id='ed340000-0000-4000-8000-000000000120' and content_version=1;
 if found then raise exception 'Stale edit overwrote newer version'; end if;
 begin
  update public.threads set content_version=55 where id='ed340000-0000-4000-8000-000000000120';
  raise exception 'Version forgery succeeded';
 exception when raise_exception then if sqlerrm='Version forgery succeeded' then raise; end if; end;
 begin
  insert into public.contribution_revisions(thread_id,content_version,snapshot,kind) values('ed340000-0000-4000-8000-000000000120',55,'{}','edit');
  raise exception 'History insertion succeeded';
 exception when insufficient_privilege then null; end;
 begin
  update public.contribution_revisions set snapshot='{}' where thread_id='ed340000-0000-4000-8000-000000000120';
  raise exception 'History rewrite succeeded';
 exception when insufficient_privilege then null; end;
 begin
  delete from public.contribution_revisions where thread_id='ed340000-0000-4000-8000-000000000120';
  raise exception 'History deletion succeeded';
 exception when insufficient_privilege then null; end;
end $$;
update public.threads set body=body where id='ed340000-0000-4000-8000-000000000120';
do $$ begin
 if (select count(*) from public.contribution_revisions where thread_id='ed340000-0000-4000-8000-000000000120')<>2 then raise exception 'No-op edit fabricated a version'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin
 if (select count(*) from public.contribution_revisions where thread_id='ed340000-0000-4000-8000-000000000120')<>2 then raise exception 'Visible thread history unavailable'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000103","role":"authenticated","aal":"aal2"}',true);
set local role authenticated;
update public.threads set hidden=true where id='ed340000-0000-4000-8000-000000000120';
do $$ begin
 if (select count(*) from public.contribution_revisions where thread_id='ed340000-0000-4000-8000-000000000120')<>2 then raise exception 'Visibility-only change fabricated content version'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000102","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.contribution_revisions where thread_id='ed340000-0000-4000-8000-000000000120' or post_id='ed340000-0000-4000-8000-000000000130') then raise exception 'Hidden history exposed to another member'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin
 if exists(select 1 from public.contribution_revisions where thread_id='ed340000-0000-4000-8000-000000000120' or post_id='ed340000-0000-4000-8000-000000000130') then raise exception 'Hidden history exposed anonymously'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000101","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.contribution_revisions where thread_id='ed340000-0000-4000-8000-000000000120')<>2 then raise exception 'Owner cannot export hidden history'; end if;
end $$;
reset role;
-- Account removal also removes all of its contribution text and history.
delete from auth.users where id='ed340000-0000-4000-8000-000000000101';
do $$ begin
 if exists(select 1 from public.contribution_revisions where thread_id='ed340000-0000-4000-8000-000000000120' or post_id='ed340000-0000-4000-8000-000000000130') then raise exception 'Deleted account left history text'; end if;
end $$;
select 'PASS: atomic revisions, original snapshots, attribution, no-op handling, stale edit rejection, immutable history, inherited visibility and account deletion cascade' as verification;
rollback;
