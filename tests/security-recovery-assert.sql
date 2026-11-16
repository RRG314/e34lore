do $$begin
 if (select count(*) from auth.users where id::text like 'e3400000-%')<>6 then raise exception 'Missing restored fixture identities';end if;
 if (select count(*) from auth.mfa_factors where status='verified')<>2 then raise exception 'Missing synthetic MFA metadata';end if;
 if not exists(select 1 from e34_private.audit_events) then raise exception 'Missing audit history';end if;
end$$;
select set_config('request.jwt.claims','{"sub":"e3400000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',false);
set role authenticated;
do $$begin
 if (select count(*) from public.owned_vehicles)<>1 or (select count(*) from public.owner_journal_entries)<>1 or (select count(*) from public.service_records)<>1 then raise exception 'Missing private garage records';end if;
 if (select count(*) from storage.objects where bucket_id='e34-car-photos')<>2 then raise exception 'Owner photo access not restored';end if;
end$$;
select set_config('request.jwt.claims','{"sub":"e3400000-0000-4000-8000-000000000002","role":"authenticated"}',false);
do $$begin
 if exists(select 1 from public.owner_journal_entries) or exists(select 1 from public.owned_vehicles) then raise exception 'Restored private records exposed';end if;
 if (select count(*) from storage.objects where bucket_id='e34-car-photos')<>1 then raise exception 'Restored photo isolation failed';end if;
end$$;
reset role;
select set_config('request.jwt.claims','{}',false);
set role anon;
do $$begin
 if (select count(*) from storage.objects where bucket_id='e34-car-photos')<>1 then raise exception 'Restored public photo missing';end if;
 if (select count(*) from public.garage_journal_entries)<>1 then raise exception 'Restored public journal missing';end if;
end$$;
reset role;
select 'PASS: restored identity/MFA fixtures, public/private photos, storage metadata, garages, journals, audit history and RLS' as verification;
