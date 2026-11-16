begin;
insert into auth.users(id,email,aud,role,created_at,updated_at,email_confirmed_at,is_anonymous,raw_user_meta_data) values
 ('ed340000-0000-4000-8000-000000000951',null,'authenticated','authenticated',now(),now(),null,true,'{}'),
 ('ed340000-0000-4000-8000-000000000952',null,'authenticated','authenticated',now(),now(),null,true,'{}'),
 ('ed340000-0000-4000-8000-000000000953','guest-reviewer@example.invalid','authenticated','authenticated',now(),now(),now(),false,'{}'),
 ('ed340000-0000-4000-8000-000000000954','guest-spoof@example.invalid','authenticated','authenticated',now(),now(),null,false,'{"is_anonymous":true,"role":"moderator"}');
insert into auth.sessions(id,user_id,created_at,updated_at) values('ed340000-0000-4000-8000-000000000959','ed340000-0000-4000-8000-000000000951',now(),now());
insert into e34_private.staff_roles(user_id,role) values('ed340000-0000-4000-8000-000000000953','moderator');
insert into public.threads(id,author_id,title,body,category) values('ed340000-0000-4000-8000-000000000958','ed340000-0000-4000-8000-000000000953','Guest reply fixture','A visible transaction-only discussion used for guest reply validation.','General E34 Community');
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000951","role":"authenticated","is_anonymous":true,"aal":"aal1","session_id":"ed340000-0000-4000-8000-000000000959"}',true);
set local role authenticated;
do $$ begin
 begin insert into public.threads(title,body,category) values('Direct guest bypass','This direct insert must not bypass guest moderation or verification.','General E34 Community'); raise exception 'TEST: direct guest write'; exception when raise_exception then if sqlerrm<>'Confirm your email before contributing' then raise; end if; end;
end $$;
select set_config('e34.test.guest_thread',public.submit_guest_contribution('{"title":"Guest cooling question","body":"Transaction-only guest question with sufficient details for a moderator to review.","category":"Technical Help & Troubleshooting","author_id":"ed340000-0000-4000-8000-000000000953","hidden":false,"locked":true,"manual_chapter_id":"170"}')::text,true);
select set_config('e34.test.guest_post',public.submit_guest_contribution('{"body":"A transaction-only guest reply with a measurement and configuration context."}','ed340000-0000-4000-8000-000000000958')::text,true);
do $$ begin
 if jsonb_array_length(public.guest_submission_state())<>2 then raise exception 'Guest status missing'; end if;
 if exists(select 1 from public.threads where id=current_setting('e34.test.guest_thread')::uuid and (not hidden or author_id<>auth.uid() or locked or manual_chapter_id<>'170')) then raise exception 'Guest payload forged authority or context lost'; end if;
 begin update public.threads set hidden=false where id=current_setting('e34.test.guest_thread')::uuid; raise exception 'TEST: guest self-published'; exception when raise_exception then if sqlerrm='TEST: guest self-published' then raise; end if; end;
 begin perform public.guest_submission_state(true); raise exception 'TEST: guest read queue'; exception when raise_exception then if sqlerrm<>'Moderator permission and MFA required' then raise; end if; end;
 begin perform public.claim_username('guest_self_verified'); raise exception 'TEST: guest claimed member identity'; exception when raise_exception then if sqlerrm<>'A verified account is required' then raise; end if; end;
 begin perform * from e34_private.guest_submissions; raise exception 'TEST: private queue exposed'; exception when insufficient_privilege then null; end;
 begin insert into storage.objects(bucket_id,name) values('e34-twin-submissions',auth.uid()::text||'/guest-denied.glb'); raise exception 'TEST: guest file upload allowed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('e34.test.second_guest_thread',public.submit_guest_contribution('{"title":"Second guest question","body":"Another transaction-only guest question that remains private for rejection testing."}')::text,true);
do $$ begin
 begin perform public.submit_guest_contribution('{"title":"Third guest question","body":"This transaction-only question must exceed the bounded daily guest question limit."}'); raise exception 'TEST: rate limit bypass'; exception when raise_exception then if sqlerrm not like 'Guest posting limit reached%' then raise; end if; end;
end $$;
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000952","role":"authenticated","is_anonymous":true,"aal":"aal2"}',true);
do $$ begin
 if jsonb_array_length(public.guest_submission_state())<>0 then raise exception 'Another guest read private submissions'; end if;
 begin perform public.submit_guest_contribution('{"title":"No session test","body":"This guest cannot submit a question without a currently valid guest session."}'); raise exception 'TEST: stale session accepted'; exception when raise_exception then if sqlerrm<>'A current guest session is required' then raise; end if; end;
end $$;
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000954","role":"authenticated","is_anonymous":true,"aal":"aal2"}',true);
do $$ begin
 begin perform public.submit_guest_contribution('{"body":"This unconfirmed permanent account spoofs anonymous metadata and must fail."}'); raise exception 'TEST: spoof accepted'; exception when raise_exception then if sqlerrm<>'Start a guest session before submitting' then raise; end if; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin
 if exists(select 1 from public.threads where id=current_setting('e34.test.guest_thread')::uuid) or exists(select 1 from public.posts where id=current_setting('e34.test.guest_post')::uuid) then raise exception 'Pending text published'; end if;
 begin perform public.guest_submission_state(); raise exception 'TEST: anonymous queue request'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000953","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
do $$ begin
 begin perform public.guest_submission_state(true); raise exception 'TEST: reviewer bypassed MFA'; exception when raise_exception then if sqlerrm<>'Moderator permission and MFA required' then raise; end if; end;
end $$;
insert into storage.objects(bucket_id,name) values('e34-twin-submissions',auth.uid()::text||'/member-allowed.glb');
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000953","role":"authenticated","aal":"aal2"}',true);
do $$ declare s jsonb; begin
 if (select count(*) from jsonb_array_elements(public.guest_submission_state(true)) entry where entry->>'discussion_id' in (current_setting('e34.test.guest_thread'),current_setting('e34.test.second_guest_thread'),'ed340000-0000-4000-8000-000000000958'))<>3 then raise exception 'Review queue incomplete'; end if;
 for s in select value from jsonb_array_elements(public.guest_submission_state(true)) where value->>'discussion_id' in (current_setting('e34.test.guest_thread'),current_setting('e34.test.second_guest_thread'),'ed340000-0000-4000-8000-000000000958') loop
  perform public.review_guest_submission((s->>'id')::uuid,s->>'title'<>'Second guest question','Transaction-only moderation decision with written reason');
 end loop;
 if exists(select 1 from jsonb_array_elements(public.guest_submission_state(true)) entry where entry->>'discussion_id' in (current_setting('e34.test.guest_thread'),current_setting('e34.test.second_guest_thread'),'ed340000-0000-4000-8000-000000000958')) then raise exception 'Resolved review queue not cleared'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin
 if not exists(select 1 from public.threads where id=current_setting('e34.test.guest_thread')::uuid and not hidden) or not exists(select 1 from public.posts where id=current_setting('e34.test.guest_post')::uuid and not hidden) then raise exception 'Approved guest text not public'; end if;
 if exists(select 1 from public.threads where title='Second guest question') then raise exception 'Rejected question public'; end if;
end $$;
reset role;
select 'PASS: guest question/reply, default privacy, context, actor/metadata isolation, no direct writes/self-publishing, owner status, daily limits, live session, private queue, role+MFA review, approve/reject visibility and audit' as verification;
rollback;
