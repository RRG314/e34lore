begin;
create function pg_temp.assert(value boolean,label text) returns void language plpgsql as $$begin if value is distinct from true then raise exception 'Support check failed: %',label;end if;end;$$;
create function pg_temp.denied(statement text) returns void language plpgsql as $$begin begin execute statement;exception when insufficient_privilege then return;end;raise exception 'Expected permission denial';end;$$;
insert into auth.users(id,email,email_confirmed_at) values('10000000-0000-4000-8000-000000000001','administrator@example.invalid',now()),('10000000-0000-4000-8000-000000000002','member@example.invalid',now()),('10000000-0000-4000-8000-000000000003','other@example.invalid',now());
insert into auth.sessions(id,user_id,aal) select ('20000000-0000-4000-8000-00000000000'||n)::uuid,('10000000-0000-4000-8000-00000000000'||n)::uuid,'aal2' from generate_series(1,3)n;
insert into auth.mfa_factors(user_id,status) values('10000000-0000-4000-8000-000000000001','verified');
insert into e34_private.staff_roles values('10000000-0000-4000-8000-000000000001','admin');
set local role service_role;
select public.support_service_submit('{"requestId":"30000000-0000-4000-8000-000000000001","name":"Controlled fixture","email":"member@example.invalid","subject":"Cooling reference fixture","message":"This fixture checks component threading and access.","category":"technical","reference":"https://e34lore.com/manual/170"}', 'ip-fixture','email-fixture','body-fixture','10000000-0000-4000-8000-000000000002');
select public.support_service_submit('{"requestId":"30000000-0000-4000-8000-000000000001","name":"Controlled fixture","email":"member@example.invalid","subject":"Cooling reference fixture","message":"This fixture checks component threading and access.","category":"technical","reference":"https://e34lore.com/manual/170"}', 'ip-fixture','email-fixture','body-fixture','10000000-0000-4000-8000-000000000002');
select pg_temp.assert((select count(*)=1 from public.support_tickets),'request retry creates one conversation');
select pg_temp.assert((select count(*)=2 from public.support_messages),'one incoming message and one confirmation');
savepoint rate_test;
do $$declare n integer;begin
 for n in 1..3 loop perform public.support_service_submit(jsonb_build_object('requestId',gen_random_uuid(),'name','Rate fixture','email','limited@example.invalid','subject','Rate limit fixture','message','Controlled rate limit test message.','category','other'),'rate-ip-'||n,'rate-email','rate-hash-'||n,null);end loop;
 begin perform public.support_service_submit(jsonb_build_object('requestId',gen_random_uuid(),'name','Rate fixture','email','limited@example.invalid','subject','Rate limit fixture','message','Controlled rate limit test message.','category','other'),'rate-ip-extra','rate-email','rate-hash-extra',null);
 exception when raise_exception then if sqlerrm like '%rate limit%' then return;else raise;end if;end;
 raise exception 'Email rate limit was not enforced';end;$$;
rollback to rate_test;
select id as ticket from public.support_tickets limit 1 \gset
set local role anon;
select pg_temp.denied('select public.support_service_runtime()');
select pg_temp.denied('select public.support_service_claim()');
select pg_temp.denied('select * from public.support_tickets');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","session_id":"20000000-0000-4000-8000-000000000002","aal":"aal2","user_metadata":{"role":"admin"}}',true);
select pg_temp.assert(not public.support_authorized(),'user-editable metadata cannot grant administrator access');
select pg_temp.assert((select count(*)=0 from public.support_tickets),'member cannot read support conversations');
select pg_temp.assert(jsonb_array_length(public.support_my_export())=1,'member exports their own linked conversation');
select pg_temp.denied('select public.support_staff_thread('''||:'ticket'||''')');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","session_id":"20000000-0000-4000-8000-000000000003","aal":"aal2"}',true);
select pg_temp.assert(jsonb_array_length(public.support_my_export())=0,'other member cannot export this conversation');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","session_id":"20000000-0000-4000-8000-000000000001","aal":"aal1"}',true);
select pg_temp.assert(not public.support_authorized(),'administrator needs MFA');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","session_id":"20000000-0000-4000-8000-000000000001","aal":"aal2"}',true);
select pg_temp.assert(public.support_authorized(),'verified administrator can open inbox');
select pg_temp.assert(jsonb_array_length(public.support_staff_list('open','',true)->'tickets')=1,'new conversation is unread');
select public.support_staff_note(:'ticket','PRIVATE INTERNAL NOTE MARKER');
select public.support_staff_reply(:'ticket','Controlled staff reply.','40000000-0000-4000-8000-000000000001');
select public.support_staff_reply(:'ticket','Controlled staff reply.','40000000-0000-4000-8000-000000000001');
select pg_temp.assert((select count(*)=1 from public.support_messages where kind='reply'),'staff retry creates one reply');
select pg_temp.assert(jsonb_array_length(public.support_staff_list('open','component',false)->'tickets')=1,'message body is searchable');
select pg_temp.assert(jsonb_array_length(public.support_staff_thread(:'ticket')->'notes')=1,'administrator can read internal notes');
select pg_temp.assert(jsonb_array_length(public.support_staff_list('open','',true)->'tickets')=0,'opening a conversation marks the visible customer message read');
select pg_temp.assert(not(public.support_staff_thread(:'ticket')->'ticket'?'reply_token'),'thread response omits routing token');
select public.support_staff_status(:'ticket','closed',true);
select public.support_staff_status(:'ticket','closed',true);
select pg_temp.assert((select count(*)=1 from public.support_messages where ticket_id=:'ticket' and kind='closure'),'repeated closure queues one optional notification');
select public.support_staff_status(:'ticket','open',true);
select pg_temp.assert((select count(*)=1 from public.support_messages where ticket_id=:'ticket' and kind='update'),'explicit reopening can notify the customer');
select public.support_staff_status(:'ticket','closed',false);
set local role service_role;
select public.support_service_ingest(jsonb_build_object('providerId','50000000-0000-4000-8000-000000000001','name','Controlled fixture','email','member@example.invalid','subject','Re: Cooling reference fixture','body','Customer replies reopen the same conversation.','replyToken',(select reply_token from public.support_tickets where id=:'ticket'),'replyIds','[]'::jsonb,'messageId','<fixture@example.invalid>','attachments','[]'::jsonb,'spam',false,'automated',false,'senderVerification','aligned'),'evt-fixture-1','event-hash');
select public.support_service_ingest(jsonb_build_object('providerId','50000000-0000-4000-8000-000000000001','name','Controlled fixture','email','member@example.invalid','subject','Re: Cooling reference fixture','body','Customer replies reopen the same conversation.','replyToken',(select reply_token from public.support_tickets where id=:'ticket'),'replyIds','[]'::jsonb,'messageId','<fixture@example.invalid>','attachments','[]'::jsonb),'evt-fixture-1','event-hash');
select pg_temp.assert((select count(*)=1 from public.support_tickets),'customer reply stays in same thread');
select pg_temp.assert((select status='open' from public.support_tickets where id=:'ticket'),'customer reply reopens closed request');
select pg_temp.assert((select count(*)=1 from public.support_messages where provider_id='50000000-0000-4000-8000-000000000001'),'duplicate webhook does not duplicate messages');
select public.support_service_ingest(jsonb_build_object('providerId','50000000-0000-4000-8000-000000000002','name','Different sender fixture','email','other@example.invalid','subject','Same token does not imply same owner','body','This sender does not own the original email address.','replyToken',(select reply_token from public.support_tickets where id=:'ticket'),'replyIds','["<fixture@example.invalid>"]'::jsonb,'attachments','[]'::jsonb,'spam',false,'automated',false),'evt-fixture-2','event-hash-2');
select pg_temp.assert((select count(*)=2 from public.support_tickets),'different sender cannot attach to another conversation');
select pg_temp.assert((select count(*)=2 from public.support_messages where ticket_id=:'ticket' and direction='inbound'),'cross-sender reply did not alter original thread');
set local role authenticated;
select pg_temp.assert(jsonb_array_length(public.support_staff_list('open','component',true)->'tickets')=1,'new customer message restores unread state using its identity');
set local role service_role;
-- Provider delays after acceptance must never become a second send.
update public.support_messages set delivery_status='delayed',provider_id='60000000-0000-4000-8000-000000000001' where kind='reply';
select pg_temp.assert(not exists(select 1 from jsonb_array_elements(public.support_service_claim())x where x->'message'->>'kind'='reply'),'accepted delayed message is not resent');
update public.support_messages set delivery_status='queued',provider_id=null,first_attempt_at=now()-interval '24 hours' where kind='reply';
select public.support_service_claim();
select pg_temp.assert((select delivery_status='uncertain' from public.support_messages where kind='reply'),'ambiguous expired attempt requires review');
-- Actual setup remains disabled until both delivery directions have evidence.
do $$begin begin perform public.support_service_activate(true);exception when check_violation then return;end;raise exception 'Activation bypassed two-way verification';end;$$;
select public.support_service_submit('{"requestId":"30000000-0000-4000-8000-000000000003","name":"Administrator delivery fixture","email":"administrator@example.invalid","subject":"Controlled delivery check","message":"A controlled test fixture, never sent outside this database.","category":"website","isTest":true}', 'check-ip','check-email','check-hash','10000000-0000-4000-8000-000000000001');
select id as check_ticket from public.support_tickets where is_test \gset
select id as check_message from public.support_messages where ticket_id=:'check_ticket' and direction='outbound' \gset
select public.support_service_event('evt-before-ack','before-ack-hash','70000000-0000-4000-8000-000000000001','email.delivered',now());
select public.support_service_delivery(:'check_message','sent','70000000-0000-4000-8000-000000000001');
-- Provider acknowledgement reconciles pre-ack events atomically.
select pg_temp.assert((select outbound_verified_at is not null from e34_private.support_configuration),'delivery arriving before provider acknowledgement reconciles');
select public.support_service_ingest(jsonb_build_object('providerId','70000000-0000-4000-8000-000000000002','name','Administrator delivery fixture','email','administrator@example.invalid','subject','Re: Controlled delivery check','body','Controlled inbound verification fixture.','replyToken',(select reply_token from public.support_tickets where id=:'check_ticket'),'replyIds','[]'::jsonb,'messageId','<check@example.invalid>','attachments','[]'::jsonb,'spam',false,'automated',false),'evt-check-reply','check-reply-hash');
select public.support_service_activate(true);
select pg_temp.assert((select enabled from e34_private.support_configuration),'support activates after both recorded directions');
set local role postgres;
select pg_temp.assert((select count(*)=1 from cron.job where jobname='e34-support-delivery'),'activation schedules one worker');
select e34_private.invoke_support_worker();
select pg_temp.assert((select count(*)=1 from net.requests),'worker uses isolated network fixture');
set local role service_role;
select public.support_service_activate(false);
set local role postgres;
select pg_temp.assert((select count(*)=0 from cron.job where jobname='e34-support-delivery'),'pause removes only the support schedule');
-- Live session revocation takes effect even before an old JWT expires.
update auth.sessions set not_after=now()-interval '1 minute' where user_id='10000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","session_id":"20000000-0000-4000-8000-000000000001","aal":"aal2"}',true);
select pg_temp.assert(not public.support_authorized(),'expired live session cannot read private inbox');
select pg_temp.assert((select count(*)=0 from public.support_notes),'internal notes remain protected after session expiry');
-- Account deletion clears linked support records and queues private file cleanup.
set local role service_role;
insert into public.support_attachments(message_id,provider_attachment_id,filename,content_type,bytes,state,object_path) select id,'80000000-0000-4000-8000-000000000001','fixture.pdf','application/pdf',10,'stored','fixture-only/object' from public.support_messages where ticket_id=:'ticket' limit 1;
set local role postgres;
delete from auth.users where id='10000000-0000-4000-8000-000000000002';
select pg_temp.assert(not exists(select 1 from public.support_tickets where id=:'ticket'),'account deletion cascades linked support correspondence');
select pg_temp.assert(exists(select 1 from e34_private.support_deleted_objects where object_path='fixture-only/object'),'account deletion queues attachment erasure');
set local role service_role;
insert into public.support_tickets(contact_name,email,subject,status,closed_at,deleted_at,updated_at) values
 ('Retention fixture','closed@example.invalid','Closed retention fixture','closed',now()-interval '366 days',null,now()-interval '366 days'),
 ('Retention fixture','spam@example.invalid','Spam retention fixture','spam',null,null,now()-interval '31 days'),
 ('Retention fixture','removed@example.invalid','Removed retention fixture','open',null,now()-interval '31 days',now()-interval '31 days'),
 ('Retention fixture','open@example.invalid','Open retention fixture','open',null,null,now()-interval '400 days');
select pg_temp.assert(public.support_service_retention()=3,'retention removes only expired closed/spam/removed conversations');
select pg_temp.assert(exists(select 1 from public.support_tickets where email='open@example.invalid'),'retention preserves open conversations');
-- Inbound confirmation caps retain every incoming message without an email loop.
do $$declare n integer;begin for n in 1..4 loop
 perform public.support_service_ingest(jsonb_build_object('providerId',gen_random_uuid(),'name','Inbound limit fixture','email','inbound-limit@example.invalid','subject','Inbound confirmation limit','body','A received message retained in the local fixture.','replyToken','','replyIds','[]'::jsonb,'messageId','<limit-'||n||'@example.invalid>','attachments','[]'::jsonb,'spam',false,'automated',false),'evt-inbound-limit-'||n,'limit-hash-'||n);
end loop;end;$$;
select pg_temp.assert((select count(*)=4 from public.support_messages m join public.support_tickets t on t.id=m.ticket_id where t.email='inbound-limit@example.invalid' and m.direction='inbound'),'all rate-limited inbound messages remain saved');
select pg_temp.assert((select count(*)=3 from public.support_messages m join public.support_tickets t on t.id=m.ticket_id where t.email='inbound-limit@example.invalid' and m.kind='confirmation'),'inbound auto-confirmation is capped without dropping mail');
select pg_temp.assert(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'support_service_%' and(has_function_privilege('anon',p.oid,'EXECUTE') or has_function_privilege('authenticated',p.oid,'EXECUTE'))),'every service function denies browser execution');
select pg_temp.assert(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','e34_private') and c.relname like 'support_%' and c.relkind='r' and not c.relrowsecurity),'every support table has RLS');
rollback;
