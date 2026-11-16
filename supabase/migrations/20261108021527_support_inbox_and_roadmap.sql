-- Private correspondence. No support content is readable by ordinary members.
create function e34_private.support_admin() returns boolean language sql stable security definer set search_path='' as $$
 select e34_private.commercial_admin() and exists(select 1 from auth.sessions s where s.id=(auth.jwt()->>'session_id')::uuid and s.user_id=auth.uid() and (s.not_after is null or s.not_after>now()));
$$;
revoke all on function e34_private.support_admin() from public,anon;
grant execute on function e34_private.support_admin() to authenticated,service_role;
create table public.support_tickets(
 id uuid primary key default gen_random_uuid(), reference text not null unique default ('E34-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
 user_id uuid references auth.users(id) on delete cascade,
 contact_name text not null check(length(contact_name) between 1 and 80), email text not null check(length(email) between 3 and 254),
 subject text not null check(length(subject) between 3 and 200), category text not null default 'other' check(category in('account','technical','part-correction','guide-correction','website','moderation','other')),
 source_reference text check(length(source_reference)<=1000), is_test boolean not null default false, status text not null default 'open' check(status in('open','closed','spam')),
 reply_token text not null unique default encode(extensions.gen_random_bytes(24),'hex'),
 idempotency_key uuid unique, request_hash text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 last_customer_at timestamptz not null default now(), last_customer_message_id uuid, closed_at timestamptz, deleted_at timestamptz
);
create index support_tickets_queue on public.support_tickets(status,updated_at desc,id) where deleted_at is null;
create index support_tickets_owner on public.support_tickets(user_id) where user_id is not null;
create index support_tickets_sender on public.support_tickets(email,created_at desc);
create table public.support_messages(
 id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.support_tickets(id) on delete cascade,
 direction text not null check(direction in('inbound','outbound')), kind text not null check(kind in('customer','confirmation','reply','update','closure')),
 body text not null check(length(body) between 1 and 256000), body_truncated boolean not null default false,
 sender_email text, sender_verification text not null default 'unknown' check(sender_verification in('aligned','unknown','suspicious')), provider_id uuid unique, rfc_message_id text check(length(rfc_message_id)<=1000), reply_ids text[] not null default '{}',
 client_key uuid unique, created_by uuid references auth.users(id) on delete set null,
 delivery_status text not null default 'queued' check(delivery_status in('received','queued','sending','sent','delivered','delayed','failed','bounced','complained','suppressed','uncertain','cancelled')),
 delivery_error text check(length(delivery_error)<=500), rfc_attempts integer not null default 0, delivery_updated_at timestamptz, first_attempt_at timestamptz, lease_until timestamptz,
 retry_at timestamptz not null default now(), attempts integer not null default 0, created_at timestamptz not null default now(),
 check((direction='inbound' and kind='customer') or(direction='outbound' and kind<>'customer'))
);
create index support_messages_thread on public.support_messages(ticket_id,created_at,id);
create index support_messages_author on public.support_messages(created_by) where created_by is not null;
create index support_confirmations_created on public.support_messages(created_at,ticket_id) where kind='confirmation';
create index support_messages_text on public.support_messages using gin(to_tsvector('simple',body));
create index support_messages_rfc on public.support_messages(rfc_message_id) where rfc_message_id is not null;
create index support_messages_outbox on public.support_messages(retry_at,id) where direction='outbound' and delivery_status in('queued','delayed','sending');
create table public.support_notes(id uuid primary key default gen_random_uuid(),ticket_id uuid not null references public.support_tickets(id) on delete cascade,body text not null check(length(body) between 1 and 12000),created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now());
create index support_notes_thread on public.support_notes(ticket_id,created_at);
create index support_notes_author on public.support_notes(created_by) where created_by is not null;
create table public.support_reads(ticket_id uuid not null references public.support_tickets(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,read_at timestamptz not null default now(),seen_customer_message uuid,primary key(ticket_id,user_id));
create index support_reads_user on public.support_reads(user_id);
create table public.support_attachments(id uuid primary key default gen_random_uuid(),message_id uuid not null references public.support_messages(id) on delete cascade,provider_attachment_id uuid not null,filename text not null check(length(filename)<=180),content_type text not null check(length(content_type)<=100),bytes integer not null check(bytes>=0),state text not null default 'pending' check(state in('pending','stored','blocked','error')),attempts integer not null default 0,lease_until timestamptz,object_path text unique,reason text check(length(reason)<=300),unique(message_id,provider_attachment_id));
create table e34_private.support_events(id text primary key,payload_hash text not null,event_type text not null,provider_id uuid,occurred_at timestamptz not null,processed_at timestamptz,created_at timestamptz not null default now());
create index support_events_provider on e34_private.support_events(provider_id,occurred_at);
create table e34_private.support_rate_buckets(kind text not null,key_hash text not null,bucket timestamptz not null,count integer not null default 0,primary key(kind,key_hash,bucket));
create table e34_private.support_deleted_objects(object_path text primary key,created_at timestamptz not null default now());
create table e34_private.support_configuration(id boolean primary key default true check(id),enabled boolean not null default false,outbound_verified_at timestamptz,inbound_verified_at timestamptz,check(not enabled or(outbound_verified_at is not null and inbound_verified_at is not null)));
insert into e34_private.support_configuration(id) values(true);
-- Defense in depth for private tables, even though this schema is unexposed.
alter table e34_private.support_events enable row level security;
alter table e34_private.support_rate_buckets enable row level security;
alter table e34_private.support_deleted_objects enable row level security;
alter table e34_private.support_configuration enable row level security;
grant usage on schema e34_private to service_role;
grant all on e34_private.support_events,e34_private.support_rate_buckets,e34_private.support_deleted_objects,e34_private.support_configuration to service_role;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.support_notes enable row level security;
alter table public.support_reads enable row level security;
alter table public.support_attachments enable row level security;
revoke all on public.support_tickets,public.support_messages,public.support_notes,public.support_reads,public.support_attachments from anon,authenticated;
grant select on public.support_tickets,public.support_messages,public.support_notes,public.support_reads,public.support_attachments to authenticated;
grant all on public.support_tickets,public.support_messages,public.support_notes,public.support_reads,public.support_attachments to service_role;
grant update(status,closed_at,deleted_at,updated_at) on public.support_tickets to authenticated;
grant insert(id,ticket_id,direction,kind,body,created_by,client_key) on public.support_messages to authenticated;
grant insert(ticket_id,body,created_by) on public.support_notes to authenticated;
grant insert,update on public.support_reads to authenticated;
create policy support_ticket_read on public.support_tickets for select to authenticated using((select e34_private.support_admin()));
create policy support_ticket_update on public.support_tickets for update to authenticated using((select e34_private.support_admin())) with check((select e34_private.support_admin()));
create policy support_message_read on public.support_messages for select to authenticated using((select e34_private.support_admin()));
create policy support_message_insert on public.support_messages for insert to authenticated with check((select e34_private.support_admin()) and direction='outbound' and kind in('reply','closure','update') and created_by=(select auth.uid()) and delivery_status='queued');
create policy support_note_read on public.support_notes for select to authenticated using((select e34_private.support_admin()));
create policy support_note_insert on public.support_notes for insert to authenticated with check((select e34_private.support_admin()) and created_by=(select auth.uid()));
create policy support_reads_read on public.support_reads for select to authenticated using((select e34_private.support_admin()) and user_id=(select auth.uid()));
create policy support_reads_insert on public.support_reads for insert to authenticated with check((select e34_private.support_admin()) and user_id=(select auth.uid()));
create policy support_reads_update on public.support_reads for update to authenticated using((select e34_private.support_admin()) and user_id=(select auth.uid())) with check((select e34_private.support_admin()) and user_id=(select auth.uid()));
create policy support_attachment_read on public.support_attachments for select to authenticated using((select e34_private.support_admin()));
create function e34_private.support_removed_attachment() returns trigger language plpgsql security definer set search_path='' as $$begin if old.object_path is not null then insert into e34_private.support_deleted_objects(object_path) values(old.object_path) on conflict do nothing;end if;return old;end;$$;
revoke all on function e34_private.support_removed_attachment() from public,anon,authenticated;
create trigger support_attachment_cleanup after delete on public.support_attachments for each row execute function e34_private.support_removed_attachment();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('support-attachments','support-attachments',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf']) on conflict(id) do nothing;
-- No browser storage policies. Staff obtain short-lived downloads through the service.
create function public.support_authorized() returns boolean language sql stable security invoker set search_path='' as $$select e34_private.support_admin();$$;
create function public.support_staff_list(filter_status text default 'open',search_text text default '',unread_only boolean default false,before_time timestamptz default null,before_id uuid default null) returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if not e34_private.support_admin() then raise exception 'Administrator permission and authenticator required' using errcode='42501';end if;
 if filter_status not in('open','closed','spam','all','deleted') or length(search_text)>200 then raise exception 'Invalid filter';end if;
 return jsonb_build_object('tickets',(select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from(
 select t.id,t.reference,t.contact_name,t.email,t.subject,t.category,t.status,t.created_at,t.updated_at,t.last_customer_at,t.last_customer_message_id,t.closed_at,t.deleted_at,(r.user_id is null or r.seen_customer_message is distinct from t.last_customer_message_id) unread,
 (select count(*) from public.support_messages m where m.ticket_id=t.id and m.delivery_status in('failed','bounced','uncertain','suppressed')) delivery_problems
 from public.support_tickets t left join public.support_reads r on r.ticket_id=t.id and r.user_id=auth.uid()
 where (case when filter_status='deleted' then t.deleted_at is not null else t.deleted_at is null end)
 and (filter_status in('all','deleted') or t.status=filter_status)
 and (search_text='' or t.subject ilike '%'||search_text||'%' or t.email ilike '%'||search_text||'%' or t.contact_name ilike '%'||search_text||'%' or t.reference ilike '%'||search_text||'%' or exists(select 1 from public.support_messages m where m.ticket_id=t.id and to_tsvector('simple',m.body)@@websearch_to_tsquery('simple',search_text)))
 and (not unread_only or r.user_id is null or r.seen_customer_message is distinct from t.last_customer_message_id)
 and (before_time is null or(t.updated_at,t.id)<(before_time,before_id))
 order by t.updated_at desc,t.id desc limit 31)q));
end;$$;
create function public.support_staff_thread(ticket uuid,before_time timestamptz default null,before_id uuid default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;selected_ids uuid[];begin
 if not e34_private.support_admin() then raise exception 'Administrator permission and authenticator required' using errcode='42501';end if;
 -- Hold the ticket while selecting and marking its visible message snapshot.
 -- Ingestion/replies lock this same row, so a later arrival stays unread.
 perform id from public.support_tickets where id=ticket for share;
 if not found then raise exception 'Conversation not found';end if;
 select array_agg(q.id) into selected_ids from(select id from public.support_messages where ticket_id=ticket and(before_time is null or(created_at,id)<(before_time,before_id)) order by created_at desc,id desc limit 50)q;
 select jsonb_build_object('ticket',to_jsonb(t)-'reply_token'-'request_hash'-'idempotency_key','messages',(select coalesce(jsonb_agg(to_jsonb(m)-'lease_until' order by m.created_at,m.id),'[]'::jsonb) from public.support_messages m where m.id=any(selected_ids)),'older',(select count(*)>50 from public.support_messages where ticket_id=ticket and(before_time is null or(created_at,id)<(before_time,before_id))),'notes',(select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at,n.id),'[]'::jsonb) from public.support_notes n where n.ticket_id=t.id),'attachments',(select coalesce(jsonb_agg(to_jsonb(a)-'object_path'-'lease_until'),'[]'::jsonb) from public.support_attachments a where a.message_id=any(selected_ids))) into result from public.support_tickets t where t.id=ticket;
 if result is null then raise exception 'Conversation not found';end if;
 if before_time is null then insert into public.support_reads(ticket_id,user_id,read_at,seen_customer_message) values(ticket,auth.uid(),clock_timestamp(),(result->'ticket'->>'last_customer_message_id')::uuid) on conflict(ticket_id,user_id) do update set read_at=excluded.read_at,seen_customer_message=excluded.seen_customer_message;end if;return result;
end;$$;
create function public.support_staff_reply(ticket uuid,message_body text,client_request uuid,message_kind text default 'reply') returns uuid language plpgsql security invoker set search_path='' as $$
declare t public.support_tickets;message uuid;prior_body text;begin
 if not e34_private.support_admin() then raise exception 'Administrator permission and authenticator required' using errcode='42501';end if;
 if length(trim(message_body)) not between 1 and 12000 or message_kind not in('reply','update','closure') then raise exception 'Invalid message';end if;
 select * into t from public.support_tickets where id=ticket for update;
 if not found or t.deleted_at is not null or t.status='spam' then raise exception 'This conversation cannot receive a reply';end if;
 select id,body into message,prior_body from public.support_messages where client_key=client_request and ticket_id=ticket and created_by=auth.uid();if message is not null then if prior_body<>trim(message_body) then raise exception 'Reply identifier reused with different content';end if;return message;end if;
 insert into public.support_messages(ticket_id,direction,kind,body,created_by,client_key) values(ticket,'outbound',message_kind,trim(message_body),auth.uid(),client_request) returning id into message;
 update public.support_tickets set updated_at=now() where id=ticket;return message;
end;$$;
create function public.support_staff_note(ticket uuid,note_body text) returns uuid language plpgsql security invoker set search_path='' as $$
declare note uuid;begin
 if not e34_private.support_admin() then raise exception 'Administrator permission and authenticator required' using errcode='42501';end if;
 insert into public.support_notes(ticket_id,body,created_by) values(ticket,trim(note_body),auth.uid()) returning id into note;return note;
end;$$;
create function public.support_staff_status(ticket uuid,new_status text,notify_customer boolean default false) returns void language plpgsql security invoker set search_path='' as $$
declare previous text;begin
 if not e34_private.support_admin() then raise exception 'Administrator permission and authenticator required' using errcode='42501';end if;
 if new_status not in('open','closed','spam','trash','restore') then raise exception 'Invalid conversation status';end if;
 select status into previous from public.support_tickets where id=ticket for update;if not found then raise exception 'Conversation not found';end if;
 update public.support_tickets set status=case when new_status in('trash','restore') then status else new_status end,closed_at=case when new_status='closed' then now() when new_status='open' then null else closed_at end,deleted_at=case when new_status='trash' then now() when new_status='restore' then null else deleted_at end,updated_at=now() where id=ticket;
 if new_status='closed' and previous<>'closed' and previous<>'spam' and notify_customer then perform public.support_staff_reply(ticket,'This support request has been closed. If you still need help with this question, reply to this email and we will reopen the conversation.',gen_random_uuid(),'closure');end if;
 if new_status='open' and previous='closed' and notify_customer then perform public.support_staff_reply(ticket,'Your support request has been reopened. Reply to this email if you have more information to add.',gen_random_uuid(),'update');end if;
end;$$;
-- All service RPCs below are inaccessible to browser roles.
create function public.support_service_ready() returns boolean language sql stable security invoker set search_path='' as $$select enabled from e34_private.support_configuration where id;$$;
create function public.support_service_submit(payload jsonb,request_fingerprint text,email_fingerprint text,content_fingerprint text,owner_id uuid default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare t public.support_tickets;rule record;hits integer;incoming uuid;begin
 perform pg_advisory_xact_lock(hashtextextended(payload->>'requestId',1));
 select * into t from public.support_tickets where idempotency_key=(payload->>'requestId')::uuid;
 if found then if t.request_hash<>content_fingerprint then raise exception 'Request identifier reused with different content';end if;return jsonb_build_object('reference',t.reference,'duplicate',true);end if;
 for rule in select * from(values('ip',request_fingerprint,date_trunc('hour',now()),10),('email',email_fingerprint,date_trunc('day',now()),3),('global','e34-support',date_trunc('day',now()),80))v(kind,key,bucket,maximum) loop
 insert into e34_private.support_rate_buckets(kind,key_hash,bucket,count) values(rule.kind,rule.key,rule.bucket,1) on conflict(kind,key_hash,bucket) do update set count=e34_private.support_rate_buckets.count+1 returning count into hits;
 if hits>rule.maximum then raise exception 'Support rate limit reached' using errcode='P0001';end if;
 end loop;
 insert into public.support_tickets(user_id,contact_name,email,subject,category,source_reference,idempotency_key,request_hash,is_test) values(owner_id,payload->>'name',payload->>'email',payload->>'subject',payload->>'category',nullif(payload->>'reference',''),(payload->>'requestId')::uuid,content_fingerprint,coalesce((payload->>'isTest')::boolean,false)) returning * into t;
 insert into public.support_messages(ticket_id,direction,kind,body,sender_email,delivery_status) values(t.id,'inbound','customer',payload->>'message',t.email,'received') returning id into incoming;
 update public.support_tickets set last_customer_at=clock_timestamp(),last_customer_message_id=incoming where id=t.id;
 insert into public.support_messages(ticket_id,direction,kind,body) values(t.id,'outbound','confirmation','We received your message. E34 Lore support will reply to this conversation. You can reply to this email to add information.');
 return jsonb_build_object('reference',t.reference,'duplicate',false);
end;$$;
create function public.support_service_ingest(payload jsonb,event_id text,event_hash text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare prior_hash text;t public.support_tickets;message uuid;attachment jsonb;candidate uuid;begin
 -- Serialize one provider delivery, including concurrent duplicate webhooks.
 perform pg_advisory_xact_lock(hashtextextended(event_id,0));
 perform pg_advisory_xact_lock(hashtextextended(payload->>'providerId',2));
 select payload_hash into prior_hash from e34_private.support_events where id=event_id;
 if found then if prior_hash<>event_hash then raise exception 'Webhook identifier conflict';end if;return jsonb_build_object('duplicate',true);end if;
 select id into message from public.support_messages where provider_id=(payload->>'providerId')::uuid;
 if found then return jsonb_build_object('duplicate',true);end if;
 -- A token or Message-ID alone never grants access to an existing conversation.
 select id into candidate from public.support_tickets where reply_token=payload->>'replyToken' and email=payload->>'email' and deleted_at is null;
 if candidate is null then select m.ticket_id into candidate from public.support_messages m join public.support_tickets st on st.id=m.ticket_id where m.rfc_message_id in(select jsonb_array_elements_text(payload->'replyIds')) and st.email=payload->>'email' and st.deleted_at is null order by m.created_at desc limit 1;end if;
 if candidate is not null then select * into t from public.support_tickets where id=candidate for update;end if;
 if t.id is null then
 insert into public.support_tickets(contact_name,email,subject,category,status) values(payload->>'name',payload->>'email',payload->>'subject','other',case when coalesce((payload->>'spam')::boolean,false) then 'spam' else 'open' end) returning * into t;
 if t.status<>'spam' and not coalesce((payload->>'automated')::boolean,false) then
 -- Keep incoming mail even when auto-confirmation limits are reached. This
 -- prevents forged/automated mail from turning support into a mail reflector.
 perform pg_advisory_xact_lock(hashtextextended('e34-support-inbound-ack',3));
 if (select count(*) from public.support_messages where kind='confirmation' and created_at>=date_trunc('day',now()))<80 and (select count(*) from public.support_messages m join public.support_tickets st on st.id=m.ticket_id where m.kind='confirmation' and m.created_at>=date_trunc('day',now()) and st.email=t.email)<3 then
 insert into public.support_messages(ticket_id,direction,kind,body) values(t.id,'outbound','confirmation','We received your message. E34 Lore support will reply to this conversation.');
 end if;end if;
 else update public.support_tickets set status=case when status='closed' and not coalesce((payload->>'spam')::boolean,false) and not coalesce((payload->>'automated')::boolean,false) then 'open' else status end,closed_at=case when status='closed' and not coalesce((payload->>'spam')::boolean,false) and not coalesce((payload->>'automated')::boolean,false) then null else closed_at end,last_customer_at=now(),updated_at=now() where id=t.id;end if;
 insert into public.support_messages(ticket_id,direction,kind,body,body_truncated,sender_email,sender_verification,provider_id,rfc_message_id,reply_ids,delivery_status) values(t.id,'inbound','customer',payload->>'body',coalesce((payload->>'truncated')::boolean,false),payload->>'email',coalesce(payload->>'senderVerification','unknown'),(payload->>'providerId')::uuid,nullif(payload->>'messageId',''),array(select jsonb_array_elements_text(payload->'replyIds')),'received') returning id into message;
 update public.support_tickets set last_customer_at=clock_timestamp(),last_customer_message_id=message where id=t.id;
 for attachment in select * from jsonb_array_elements(payload->'attachments') loop
 insert into public.support_attachments(message_id,provider_attachment_id,filename,content_type,bytes,state,reason) values(message,(attachment->>'id')::uuid,attachment->>'filename',attachment->>'contentType',(attachment->>'bytes')::integer,attachment->>'state',attachment->>'reason') on conflict do nothing;end loop;
 if t.is_test and not coalesce((payload->>'spam')::boolean,false) and payload->>'replyToken'=t.reply_token then update e34_private.support_configuration set inbound_verified_at=now() where id;end if;
 insert into e34_private.support_events(id,payload_hash,event_type,provider_id,occurred_at,processed_at) values(event_id,event_hash,'email.received',(payload->>'providerId')::uuid,now(),now());
 return jsonb_build_object('duplicate',false,'ticketId',t.id,'messageId',message);
end;$$;
create function public.support_service_claim(maximum integer default 3,recipient_filter text default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;begin
 update public.support_messages set delivery_status='uncertain',delivery_error='The retry window expired; review before resending' where direction='outbound' and provider_id is null and first_attempt_at<now()-interval '23 hours' and delivery_status in('queued','delayed');
 update public.support_messages m set delivery_status='cancelled',delivery_error='Conversation is closed to outgoing mail' from public.support_tickets t where t.id=m.ticket_id and(t.deleted_at is not null or t.status='spam') and m.delivery_status in('queued','delayed','sending');
 update public.support_messages set delivery_status=case when first_attempt_at<now()-interval '23 hours' then 'uncertain' else 'queued' end,lease_until=null where direction='outbound' and delivery_status='sending' and lease_until<now();
 with pending as(select m.id from public.support_messages m join public.support_tickets t on t.id=m.ticket_id where m.direction='outbound' and m.provider_id is null and m.delivery_status in('queued','delayed') and m.retry_at<=now() and m.attempts<8 and t.deleted_at is null and t.status<>'spam' and(recipient_filter is null or t.email=recipient_filter) and not exists(select 1 from public.support_messages stop where stop.ticket_id=t.id and stop.delivery_status in('bounced','complained','suppressed')) order by m.created_at,m.id limit greatest(1,least(maximum,5)) for update of m skip locked), claimed as(update public.support_messages m set delivery_status='sending',lease_until=now()+interval '90 seconds',first_attempt_at=coalesce(first_attempt_at,now()),attempts=attempts+1 from pending p where m.id=p.id returning m.*)
 select coalesce(jsonb_agg(jsonb_build_object('message',to_jsonb(m),'ticket',jsonb_build_object('id',t.id,'reference',t.reference,'email',t.email,'contact_name',t.contact_name,'subject',t.subject,'reply_token',t.reply_token),'references',(select coalesce(jsonb_agg(q.rfc_message_id order by q.created_at),'[]'::jsonb) from(select rfc_message_id,created_at from public.support_messages where ticket_id=t.id and rfc_message_id is not null order by created_at desc limit 20)q))),'[]'::jsonb) into result from claimed m join public.support_tickets t on t.id=m.ticket_id;
 return result;
end;$$;
create function public.support_service_delivery(message uuid,new_status text,provider uuid default null,rfc_id text default null,error_text text default null,retry_seconds integer default 60) returns void language plpgsql security invoker set search_path='' as $$begin
 if new_status not in('sent','delayed','failed','uncertain') then raise exception 'Invalid delivery state';end if;
 update public.support_messages set delivery_status=case when delivery_status in('delivered','bounced','complained','suppressed') then delivery_status else new_status end,provider_id=coalesce(provider,provider_id),rfc_message_id=coalesce(rfc_id,rfc_message_id),delivery_error=left(error_text,500),lease_until=null,retry_at=now()+make_interval(secs=>greatest(10,least(retry_seconds,86400))) where id=message and direction='outbound';
 if provider is not null then perform public.support_service_reconcile(message);end if;
end;$$;
create function public.support_service_event(event_id text,event_hash text,email_id uuid,event_type text,event_time timestamptz) returns boolean language plpgsql security invoker set search_path='' as $$
declare new_status text;prior_hash text;begin
 perform pg_advisory_xact_lock(hashtextextended(event_id,0));select payload_hash into prior_hash from e34_private.support_events where id=event_id;if found then if prior_hash<>event_hash then raise exception 'Webhook identifier conflict';end if;return false;end if;
 new_status:=case event_type when 'email.sent' then 'sent' when 'email.delivered' then 'delivered' when 'email.delivery_delayed' then 'delayed' when 'email.failed' then 'failed' when 'email.bounced' then 'bounced' when 'email.complained' then 'complained' when 'email.suppressed' then 'suppressed' else null end;
 if new_status is null then return false;end if;
 insert into e34_private.support_events(id,payload_hash,event_type,provider_id,occurred_at,processed_at) values(event_id,event_hash,event_type,email_id,event_time,now());
 update public.support_messages set delivery_status=new_status,delivery_updated_at=event_time,delivery_error=case when new_status in('failed','bounced','complained','suppressed') then 'Email provider reported '||new_status else delivery_error end where provider_id=email_id and(direction='outbound') and(delivery_updated_at is null or delivery_updated_at<=event_time) and not(delivery_status in('bounced','complained','suppressed') and new_status in('sent','delayed','delivered'));
 if event_type='email.delivered' and exists(select 1 from public.support_messages m join public.support_tickets t on t.id=m.ticket_id where m.provider_id=email_id and t.is_test and t.user_id is not null) then update e34_private.support_configuration set outbound_verified_at=now() where id;end if;
 return true;
end;$$;
create function public.support_service_reconcile(message uuid) returns void language plpgsql security invoker set search_path='' as $$declare e record;begin
 for e in select * from e34_private.support_events where provider_id=(select provider_id from public.support_messages where id=message) and event_type<>'email.received' order by occurred_at loop
 update public.support_messages set delivery_status=case e.event_type when 'email.sent' then 'sent' when 'email.delivered' then 'delivered' when 'email.delivery_delayed' then 'delayed' when 'email.failed' then 'failed' when 'email.bounced' then 'bounced' when 'email.complained' then 'complained' when 'email.suppressed' then 'suppressed' else delivery_status end,delivery_updated_at=e.occurred_at where id=message and(delivery_updated_at is null or delivery_updated_at<=e.occurred_at) and not(delivery_status in('bounced','complained','suppressed') and e.event_type in('email.sent','email.delivery_delayed','email.delivered'));end loop;
 if exists(select 1 from public.support_messages m join public.support_tickets t on t.id=m.ticket_id where m.id=message and m.delivery_status='delivered' and t.is_test and t.user_id is not null) then update e34_private.support_configuration set outbound_verified_at=now() where id;end if;
end;$$;
create function public.support_service_missing_ids() returns jsonb language sql security invoker set search_path='' as $$with pending as(select id from public.support_messages where direction='outbound' and provider_id is not null and rfc_message_id is null and rfc_attempts<5 order by created_at limit 3 for update skip locked),updated as(update public.support_messages m set rfc_attempts=rfc_attempts+1 from pending p where m.id=p.id returning m.id,m.provider_id)select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from updated q;$$;
create function public.support_service_set_rfc(message uuid,rfc_id text) returns void language sql security invoker set search_path='' as $$update public.support_messages set rfc_message_id=left(rfc_id,1000) where id=message and direction='outbound';$$;
create function public.support_staff_retry(message uuid) returns void language plpgsql security definer set search_path='' as $$begin
 if not e34_private.support_admin() then raise exception 'Administrator permission and authenticator required' using errcode='42501';end if;
 if exists(select 1 from public.support_messages m join public.support_tickets t on t.id=m.ticket_id where m.id=message and(t.deleted_at is not null or t.status='spam' or m.delivery_status in('bounced','complained','suppressed','uncertain') or m.provider_id is not null)) then raise exception 'This delivery requires review and cannot be retried automatically';end if;
 update public.support_messages set delivery_status='queued',attempts=0,retry_at=now(),delivery_error=null where id=message and direction='outbound' and delivery_status in('failed','delayed') and(first_attempt_at is null or first_attempt_at>now()-interval '23 hours');
end;$$;
create function public.support_staff_retention() returns jsonb language plpgsql security invoker set search_path='' as $$begin
 if not e34_private.support_admin() then raise exception 'Administrator permission and authenticator required' using errcode='42501';end if;
 return jsonb_build_object('expired',(select count(*) from public.support_tickets where(deleted_at<now()-interval '30 days') or(status='closed' and closed_at<now()-interval '365 days') or(status='spam' and updated_at<now()-interval '30 days')));
end;$$;
create function public.support_service_retention() returns integer language plpgsql security invoker set search_path='' as $$declare affected integer;begin
 delete from public.support_tickets where(deleted_at<now()-interval '30 days') or(status='closed' and closed_at<now()-interval '365 days') or(status='spam' and updated_at<now()-interval '30 days');get diagnostics affected=row_count;
 delete from e34_private.support_rate_buckets where bucket<now()-interval '7 days';
 delete from e34_private.support_events where created_at<now()-interval '90 days';return affected;
end;$$;
create function public.support_my_export() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Member account required' using errcode='42501';end if;
 return(select coalesce(jsonb_agg(jsonb_build_object('reference',t.reference,'subject',t.subject,'status',t.status,'created_at',t.created_at,'messages',(select coalesce(jsonb_agg(jsonb_build_object('direction',m.direction,'body',m.body,'created_at',m.created_at) order by m.created_at),'[]'::jsonb) from public.support_messages m where m.ticket_id=t.id))),'[]'::jsonb) from public.support_tickets t where t.user_id=auth.uid());
end;$$;
create function public.support_service_attachment_claim() returns jsonb language sql security invoker set search_path='' as $$
 with pending as(select a.id from public.support_attachments a join public.support_messages m on m.id=a.message_id join public.support_tickets t on t.id=m.ticket_id where a.state in('pending','error') and a.attempts<3 and(a.lease_until is null or a.lease_until<now()) and t.deleted_at is null and t.status<>'spam' order by a.id limit 3 for update of a skip locked),claimed as(update public.support_attachments a set attempts=attempts+1,lease_until=now()+interval '90 seconds' from pending p where a.id=p.id returning a.*)
 select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('provider_id',m.provider_id,'ticket_id',m.ticket_id)),'[]'::jsonb) from claimed a join public.support_messages m on m.id=a.message_id;
$$;
create function public.support_service_attachment_result(attachment uuid,new_state text,path_value text default null,explanation text default null) returns void language plpgsql security invoker set search_path='' as $$begin
 if new_state not in('stored','blocked','error') or(new_state='stored' and path_value is null) then raise exception 'Invalid attachment state';end if;
 update public.support_attachments set state=new_state,object_path=path_value,reason=left(explanation,300),lease_until=null where id=attachment;
end;$$;
create function public.support_service_deleted_objects() returns jsonb language sql stable security invoker set search_path='' as $$select coalesce(jsonb_agg(object_path),'[]'::jsonb) from(select object_path from e34_private.support_deleted_objects order by created_at limit 100)q;$$;
create function public.support_service_ack_deleted(paths text[]) returns void language sql security invoker set search_path='' as $$delete from e34_private.support_deleted_objects where object_path=any(paths);$$;
create function public.support_service_counts() returns jsonb language sql stable security invoker set search_path='' as $$select jsonb_build_object('open',(select count(*) from public.support_tickets where status='open' and deleted_at is null),'queued',(select count(*) from public.support_messages where delivery_status in('queued','sending')),'deliveryProblems',(select count(*) from public.support_messages where delivery_status in('failed','uncertain','bounced','suppressed')),'outboundVerified',(select outbound_verified_at is not null from e34_private.support_configuration where id),'inboundVerified',(select inbound_verified_at is not null from e34_private.support_configuration where id));$$;
create function public.support_service_activate(activate boolean) returns void language sql security invoker set search_path='' as $$update e34_private.support_configuration set enabled=activate where id;$$;
-- Revoke default PUBLIC EXECUTE, including every privileged service-only function.
do $$declare f record;begin
 for f in select p.oid::regprocedure signature,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'support\_%' escape '\' loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 if f.proname like 'support_service_%' then execute format('grant execute on function %s to service_role',f.signature);
 else execute format('grant execute on function %s to authenticated',f.signature);end if;
 end loop;
end;$$;
