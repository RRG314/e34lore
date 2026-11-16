begin;
insert into auth.users(id,email,aud,role,created_at,updated_at,email_confirmed_at) values
 ('ed340000-0000-4000-8000-000000000701','garage-owner@example.invalid','authenticated','authenticated',now()-interval '2 days',now(),now()),
 ('ed340000-0000-4000-8000-000000000702','garage-other@example.invalid','authenticated','authenticated',now()-interval '2 days',now(),now()),
 ('ed340000-0000-4000-8000-000000000703','garage-mod@example.invalid','authenticated','authenticated',now()-interval '2 days',now(),now());
insert into e34_private.staff_roles(user_id,role) values('ed340000-0000-4000-8000-000000000703','moderator');
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000701","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
insert into public.owned_vehicles(id,nickname,model_id,configuration,ownership_status,acquired_year,released_year) values
 ('ed340000-0000-4000-8000-000000000710','Garagefixture current','525i','{"engine":"M50","year":"1991","vin":"PRIVATE-IDENTIFIER","address":"PRIVATE-ADDRESS","privateNotes":"NEVER-SHARE"}','current',2020,null),
 ('ed340000-0000-4000-8000-000000000711','Garagefixture previous','535i','{"engine":"M30"}','previous',2010,2015);
select public.publish_garage_vehicle('ed340000-0000-4000-8000-000000000710','Garagefixture current','This is a transaction-only public story. No private history should be published.');
select public.publish_garage_vehicle('ed340000-0000-4000-8000-000000000711','Garagefixture previous','This is a transaction-only story of a previously owned car, not an invented community member.');
do $$ begin
 if(select count(*) from public.my_garage_publications())<>2 then raise exception 'Owner publication mapping missing'; end if;
 if exists(select 1 from public.garage_showcases where user_id=auth.uid() and configuration::text~'PRIVATE|NEVER-SHARE') then raise exception 'Private vehicle metadata leaked'; end if;
 if(select count(*) from public.browse_garage_entries('garagefixture','previous'))<>1 then raise exception 'Ownership filter failed'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin
 if(select count(*) from public.browse_garage_entries('garagefixture'))<>2 then raise exception 'Published stories not visible'; end if;
 begin perform * from e34_private.garage_publications; raise exception 'TEST: private vehicle bindings exposed'; exception when insufficient_privilege then null; end;
 begin update public.garage_showcases set story='Intrusion'; raise exception 'TEST: anonymous mutation allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000702","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
insert into public.threads(id,title,body,category,garage_entry_id) select 'ed340000-0000-4000-8000-000000000740','Discussion linked to a public garage','A transaction-only question linked to another owner public garage story.','General discussion',id from public.garage_showcases where title='Garagefixture current';
do $$ begin
 if not exists(select 1 from public.threads where id='ed340000-0000-4000-8000-000000000740' and model_id='525i' and engine='M50' and vehicle_configuration->>'year'='1991') then raise exception 'Garage source did not establish discussion context'; end if;
 if exists(select 1 from public.my_garage_publications()) then raise exception 'Other owner private mapping exposed'; end if;
 begin perform public.publish_garage_vehicle('ed340000-0000-4000-8000-000000000710','Intrusion','A cross-owner story update must always be rejected.'); raise exception 'TEST: cross-owner publication allowed'; exception when raise_exception then if sqlerrm<>'Choose a vehicle from your private garage' then raise; end if; end;
 begin perform public.unpublish_garage((select id from public.garage_showcases where title='Garagefixture current')); raise exception 'TEST: cross-owner unpublish allowed'; exception when raise_exception then if sqlerrm<>'Garage entry unavailable' then raise; end if; end;
end $$;
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000701","role":"authenticated","aal":"aal1"}',true);
select public.unpublish_garage((select entry_id from public.my_garage_publications() where vehicle_id='ed340000-0000-4000-8000-000000000710'));
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin
 if exists(select 1 from public.garage_showcases where title='Garagefixture current') then raise exception 'Unpublished garage exposed'; end if;
 if not exists(select 1 from public.threads where id='ed340000-0000-4000-8000-000000000740') then raise exception 'Unpublishing erased another member discussion'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000701","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select public.publish_garage_vehicle('ed340000-0000-4000-8000-000000000710','Garagefixture current','An updated transaction-only public story that is explicitly republished.');
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000703","role":"authenticated","aal":"aal1"}',true);
do $$ begin
 begin perform public.moderate_community('hide-garage',(select id from public.garage_showcases where title='Garagefixture current'),'A test moderation reason'); raise exception 'TEST: garage moderation bypassed MFA'; exception when raise_exception then if sqlerrm<>'Moderator permission and MFA required' then raise; end if; end;
end $$;
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000703","role":"authenticated","aal":"aal2"}',true);
select public.moderate_community('hide-garage',(select id from public.garage_showcases where title='Garagefixture current'),'A transaction-only hide of the public garage snapshot');
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000701","role":"authenticated","aal":"aal1"}',true);
select public.publish_garage_vehicle('ed340000-0000-4000-8000-000000000710','Garagefixture current','An owner edit must not override the staff visibility decision.');
do $$ begin
 if not(select hidden from public.garage_showcases where title='Garagefixture current') then raise exception 'Republishing evaded moderation'; end if;
end $$;
-- Removing a private source car removes its public snapshot while retaining
-- independently authored discussion and clearing just the obsolete FK.
delete from public.owned_vehicles where id='ed340000-0000-4000-8000-000000000710';
do $$ begin
 if exists(select 1 from public.garage_showcases where title='Garagefixture current') then raise exception 'Deleting private source retained public copy'; end if;
 if not exists(select 1 from public.threads where id='ed340000-0000-4000-8000-000000000740' and garage_entry_id is null) then raise exception 'Source removal destroyed or blocked peer discussion'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
delete from auth.users where id='ed340000-0000-4000-8000-000000000701';
do $$ begin
 if exists(select 1 from public.garage_showcases where user_id='ed340000-0000-4000-8000-000000000701') then raise exception 'Account removal retained public garage'; end if;
end $$;
select 'PASS: current/previous ownership, explicit public snapshots, private-field exclusion, owner filtering, cross-owner rejection, unpublish, MFA moderation, anti-evasion and source/account deletion cascades' as verification;
rollback;
