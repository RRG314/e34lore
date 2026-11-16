-- Existing Supabase infrastructure only. Jobs remain off until real two-way
-- verification is complete and the administrator explicitly enables support.
create extension if not exists pg_net;
do $$begin
 if not exists(select 1 from vault.secrets where name='e34_support_signing') then perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'e34_support_signing','E34 support form challenge signing');end if;
 if not exists(select 1 from vault.secrets where name='e34_support_worker') then perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'e34_support_worker','E34 support delivery worker only');end if;
end;$$;
create function public.support_service_runtime() returns jsonb language plpgsql security definer set search_path='' as $$begin
 if current_setting('role',true)<>'service_role' then raise exception 'Service authorization required' using errcode='42501';end if;
 return jsonb_build_object('signing',(select decrypted_secret from vault.decrypted_secrets where name='e34_support_signing'),'worker',(select decrypted_secret from vault.decrypted_secrets where name='e34_support_worker'));
end;$$;
revoke all on function public.support_service_runtime() from public,anon,authenticated;
grant execute on function public.support_service_runtime() to service_role;
create function e34_private.invoke_support_worker() returns bigint language plpgsql security definer set search_path='' as $$
declare request_id bigint;begin
 if not(select enabled from e34_private.support_configuration where id) then return null;end if;
 if extract(minute from now())<>0 and not exists(select 1 from public.support_messages where direction='outbound' and((delivery_status in('queued','delayed') and provider_id is null and retry_at<=now() and attempts<8) or(delivery_status='sending' and lease_until<now()) or(provider_id is not null and rfc_message_id is null and rfc_attempts<5))) and not exists(select 1 from public.support_attachments a join public.support_messages m on m.id=a.message_id join public.support_tickets t on t.id=m.ticket_id where a.state in('pending','error') and a.attempts<3 and(a.lease_until is null or a.lease_until<now()) and t.deleted_at is null and t.status<>'spam') and not exists(select 1 from e34_private.support_deleted_objects) then return null;end if;
 select net.http_post(url:='https://ebaebzuergvpijtrloik.supabase.co/functions/v1/support/dispatch',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='e34_support_worker')),body:='{}'::jsonb,timeout_milliseconds:=55000) into request_id;return request_id;
end;$$;
revoke all on function e34_private.invoke_support_worker() from public,anon,authenticated;
create or replace function public.support_service_activate(activate boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if current_setting('role',true)<>'service_role' then raise exception 'Service authorization required' using errcode='42501';end if;
 update e34_private.support_configuration set enabled=activate where id;
 if activate then perform cron.schedule('e34-support-delivery','* * * * *','select e34_private.invoke_support_worker();');
 else if exists(select 1 from cron.job where jobname='e34-support-delivery') then perform cron.unschedule('e34-support-delivery');end if;end if;
end;$$;
revoke all on function public.support_service_activate(boolean) from public,anon,authenticated;
grant execute on function public.support_service_activate(boolean) to service_role;
