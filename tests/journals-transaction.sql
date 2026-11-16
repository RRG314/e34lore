begin;
insert into auth.users(id,email,aud,role,created_at,updated_at,email_confirmed_at) values
 ('ed340000-0000-4000-8000-000000000801','journal-owner@example.invalid','authenticated','authenticated',now()-interval '2 days',now(),now()),
 ('ed340000-0000-4000-8000-000000000803','journal-mod@example.invalid','authenticated','authenticated',now()-interval '2 days',now(),now()),
 ('ed340000-0000-4000-8000-000000000802','journal-other@example.invalid','authenticated','authenticated',now()-interval '2 days',now(),now());
insert into e34_private.staff_roles(user_id,role) values('ed340000-0000-4000-8000-000000000803','moderator');
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000801","role":"authenticated"}',true);
set local role authenticated;
insert into public.owned_vehicles(id,nickname,model_id,configuration,private_notes,exterior_color) values('ed340000-0000-4000-8000-000000000810','Journalfixture','525i','{"engine":"M50","body":"Touring","year":"1993"}','PRIVATE-CAR-NOTE','Blue');
insert into public.owner_journal_entries(id,vehicle_id,title,body,cost,mileage,private_notes,guide_id,guide_revision,guide_step) select
 'ed340000-0000-4000-8000-000000000820','ed340000-0000-4000-8000-000000000810','Journalfixture initial condition','A transaction-only journal update with documented observations and a linked walkthrough step.',12345,987654,'PRIVATE-JOURNAL-NOTE',guide_id,revision,step_number from public.guide_step_index where guide_id='identify-your-engine' and step_number=1;
do $$ begin
 begin perform public.publish_journal_entry('ed340000-0000-4000-8000-000000000820',1);raise exception 'TEST: unpublished garage accepted';exception when raise_exception then if sqlerrm<>'Share this car’s garage story before publishing journal updates' then raise;end if;end;
end$$;
select public.publish_garage_vehicle('ed340000-0000-4000-8000-000000000810','Journalfixture public car','A transaction-only car story used to verify safe journal publication and withdrawal.');
select public.publish_journal_entry('ed340000-0000-4000-8000-000000000820',1);
do $$ begin
 if (select count(*) from public.my_journal_publications())<>1 then raise exception 'Owner mapping missing';end if;
 if exists(select 1 from public.garage_journal_entries where user_id=auth.uid() and to_jsonb(garage_journal_entries)::text ~ 'PRIVATE|12345|987654') then raise exception 'Private fields published';end if;
end$$;
update public.owner_journal_entries set body='A later private edit which has not been republished to other readers.' where id='ed340000-0000-4000-8000-000000000820' and content_version=1;
do $$ begin
 if exists(select 1 from public.garage_journal_entries where body like 'A later private%') then raise exception 'Private edit changed snapshot';end if;
 begin perform public.publish_journal_entry('ed340000-0000-4000-8000-000000000820',1);raise exception 'TEST: stale publish allowed';exception when raise_exception then if sqlerrm<>'Journal changed. Reload and review before publishing.' then raise;end if;end;
end$$;
insert into public.guide_progress(id,vehicle_id,guide_id,revision,completed_steps) select 'ed340000-0000-4000-8000-000000000830','ed340000-0000-4000-8000-000000000810',guide_id,revision,array[0] from public.guide_step_index where guide_id='identify-your-engine' and step_number=1;
do $$ begin
 begin update public.guide_progress set completed_steps=array[999] where id='ed340000-0000-4000-8000-000000000830';raise exception 'TEST: invalid step accepted';exception when raise_exception then if sqlerrm<>'Invalid checks for this guide revision' then raise;end if;end;
 update public.guide_progress set completed_steps=array[0,1] where id='ed340000-0000-4000-8000-000000000830' and content_version=1;
 update public.guide_progress set completed_steps=array[]::integer[] where id='ed340000-0000-4000-8000-000000000830' and content_version=1;
 if found then raise exception 'Stale progress overwrote newer checks';end if;
end$$;
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000802","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.owner_journal_entries) or exists(select 1 from public.guide_progress) then raise exception 'Private journal/progress leaked';end if;
 if exists(select 1 from public.my_journal_publications()) then raise exception 'Private bindings leaked';end if;
 begin perform public.publish_journal_entry('ed340000-0000-4000-8000-000000000820',2);raise exception 'TEST: cross-owner publish allowed';exception when raise_exception then if sqlerrm<>'Journal entry unavailable' then raise;end if;end;
 begin insert into public.owner_journal_entries(vehicle_id,title,body) values('ed340000-0000-4000-8000-000000000810','Intrusion','A cross-owner vehicle binding must be rejected.');raise exception 'TEST: cross-owner link accepted';exception when foreign_key_violation then null;end;
end$$;
insert into public.threads(id,title,body,category,journal_update_id) select 'ed340000-0000-4000-8000-000000000840','Question about this journal step','A transaction-only question linked to a published journal update and walkthrough step.','General discussion',id from public.garage_journal_entries where title='Journalfixture initial condition';
do $$ begin
 if not exists(select 1 from public.threads where id='ed340000-0000-4000-8000-000000000840' and guide_step=1 and guide_revision is not null and guide_id='identify-your-engine' and model_id='525i' and engine='M50' and garage_entry_id is not null) then raise exception 'Journal discussion canonical context missing';end if;
end$$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin
 if not exists(select 1 from public.garage_journal_entries where title='Journalfixture initial condition') then raise exception 'Published journal unavailable';end if;
 begin perform * from public.owner_journal_entries;raise exception 'TEST: anonymous private access';exception when insufficient_privilege then null;end;
 begin update public.garage_journal_entries set body='Intrusion';raise exception 'TEST: direct public mutation';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000801","role":"authenticated"}',true);
set local role authenticated;
select public.withdraw_journal_entry('ed340000-0000-4000-8000-000000000820');
reset role;select set_config('request.jwt.claims','{"role":"anon"}',true);set local role anon;
do $$ begin if exists(select 1 from public.garage_journal_entries where title='Journalfixture initial condition') then raise exception 'Withdrawn journal exposed';end if;end$$;
reset role;select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000801","role":"authenticated"}',true);set local role authenticated;
select public.publish_journal_entry('ed340000-0000-4000-8000-000000000820',2);
reset role;
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000803","role":"authenticated","aal":"aal1"}',true);set local role authenticated;
do $$ begin begin perform public.moderate_journal_entry((select public_id from public.my_journal_publications() limit 1),true,'Transaction-only moderation reason');raise exception 'TEST: moderation bypassed MFA';exception when raise_exception then if sqlerrm<>'Moderator permission and MFA required' then raise;end if;end;end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000803","role":"authenticated","aal":"aal2"}',true);set local role authenticated;
select public.moderate_journal_entry((select id from public.garage_journal_entries where title='Journalfixture initial condition'),true,'Transaction-only moderation reason with MFA');
reset role;select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000801","role":"authenticated"}',true);set local role authenticated;
select public.publish_journal_entry('ed340000-0000-4000-8000-000000000820',2);
do $$ begin if not exists(select 1 from public.garage_journal_entries where title='Journalfixture initial condition' and hidden) then raise exception 'Publishing evaded moderation';end if;end$$;
reset role;select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000803","role":"authenticated","aal":"aal2"}',true);set local role authenticated;
select public.moderate_journal_entry((select id from public.garage_journal_entries where title='Journalfixture initial condition'),false,'Transaction-only restore with MFA');
reset role;select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000801","role":"authenticated"}',true);set local role authenticated;
select public.unpublish_garage((select entry_id from public.my_garage_publications() where vehicle_id='ed340000-0000-4000-8000-000000000810'));
reset role;select set_config('request.jwt.claims','{"role":"anon"}',true);set local role anon;
do $$ begin if exists(select 1 from public.garage_journal_entries where title='Journalfixture initial condition') then raise exception 'Private parent journal exposed';end if;end$$;
reset role;select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000801","role":"authenticated"}',true);set local role authenticated;
delete from public.owner_journal_entries where id='ed340000-0000-4000-8000-000000000820';
do $$ begin
 if exists(select 1 from public.garage_journal_entries where title='Journalfixture initial condition') then raise exception 'Deleted journal retained snapshot';end if;
 if not exists(select 1 from public.threads where id='ed340000-0000-4000-8000-000000000840' and journal_update_id is null) then raise exception 'Peer discussion removed by journal deletion';end if;
end$$;
reset role;select set_config('request.jwt.claims','{}',true);
delete from auth.users where id='ed340000-0000-4000-8000-000000000801';
do $$ begin if exists(select 1 from public.guide_progress where user_id='ed340000-0000-4000-8000-000000000801') then raise exception 'Progress survived account removal';end if;end$$;
do $$ begin begin update public.guide_revision_archive set content=content where guide_id='identify-your-engine';raise exception 'TEST: snapshot mutable';exception when raise_exception then if sqlerrm<>'Published guide identities and snapshots are immutable; add a new revision' then raise;end if;end;end$$;
select 'PASS: immutable guide archives, MFA moderation and anti-evasion, private journals/progress, explicit snapshots, stale version rejection, private-field exclusion, cross-owner denial, canonical step discussion context, withdrawal, parent visibility and deletion cascades' as verification;
rollback;
