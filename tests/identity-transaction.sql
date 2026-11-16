-- This fixture never changes the real owner binding and always rolls back.
begin;
insert into auth.users(id,email,aud,role,created_at,updated_at,email_confirmed_at,raw_user_meta_data) values
 ('ed340000-0000-4000-8000-000000000901','identity-member@example.invalid','authenticated','authenticated',now(),now(),now(),'{}'),
 ('ed340000-0000-4000-8000-000000000902','identity-other@example.invalid','authenticated','authenticated',now(),now(),now(),'{"email":"owner@example.invalid","role":"admin","moderator":true}'),
 ('ed340000-0000-4000-8000-000000000903','identity-unverified@example.invalid','authenticated','authenticated',now(),now(),null,'{}');
do $$ begin
 if to_regprocedure('public.claim_owner_moderator()') is not null or to_regprocedure('e34_private.claim_owner_moderator()') is not null then raise exception 'Member staff activation still exists'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000901","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select public.claim_username('alpine_identity_qa');
do $$ begin
 if (select display_name from public.profiles where id=auth.uid())<>'alpine_identity_qa' then raise exception 'Public handle not synchronized'; end if;
 if public.my_account_access() <> '{"moderator":false}'::jsonb then raise exception 'Member role or owner eligibility exposed'; end if;
 begin update public.profiles set username='intrusion' where id=auth.uid(); raise exception 'TEST: direct username write allowed'; exception when insufficient_privilege then null; end;
 begin perform public.claim_username('renamed_identity'); raise exception 'TEST: username changed'; exception when raise_exception then if sqlerrm<>'Your username is already set' then raise; end if; end;
 begin insert into e34_private.staff_roles(user_id,role) values(auth.uid(),'moderator'); raise exception 'TEST: member assigned staff role'; exception when insufficient_privilege then null; end;
 begin update e34_private.owner_account_claim set claimed_user_id=auth.uid(); raise exception 'TEST: member rewrote owner binding'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000902","role":"authenticated","aal":"aal2"}',true);
do $$ begin
 if public.my_account_access() <> '{"moderator":false}'::jsonb then raise exception 'Metadata spoof authorized staff'; end if;
 begin perform public.claim_username('alpine_identity_qa'); raise exception 'TEST: duplicate allowed'; exception when raise_exception then if sqlerrm<>'That username is already taken' then raise; end if; end;
 begin perform public.claim_username('moderator'); raise exception 'TEST: reserved handle allowed'; exception when raise_exception then if sqlerrm<>'That username is reserved' then raise; end if; end;
 begin perform public.claim_username('private@example.com'); raise exception 'TEST: email as username allowed'; exception when raise_exception then if sqlerrm not like 'Use 3–24%' then raise; end if; end;
 begin perform * from e34_private.owner_account_claim; raise exception 'TEST: private owner configuration exposed'; exception when insufficient_privilege then null; end;
 begin perform public.moderate_community('hide-post','ed340000-0000-4000-8000-000000000999','Attempted role escalation test'); raise exception 'TEST: MFA member could moderate'; exception when raise_exception then if sqlerrm<>'Moderator permission and MFA required' then raise; end if; end;
end $$;
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000903","role":"authenticated","aal":"aal1"}',true);
do $$ begin
 begin perform public.claim_username('unverified_identity'); raise exception 'TEST: unverified handle claim'; exception when raise_exception then if sqlerrm<>'A verified account is required' then raise; end if; end;
end $$;
reset role;
-- Roles can only be inserted by the test operator, just as real provisioning is private.
insert into e34_private.staff_roles(user_id,role) values('ed340000-0000-4000-8000-000000000901','moderator');
select set_config('request.jwt.claims','{"sub":"ed340000-0000-4000-8000-000000000901","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
do $$ begin
 if public.my_account_access() <> '{"moderator":true}'::jsonb then raise exception 'Provisioned role missing'; end if;
 begin perform public.moderate_community('hide-post','ed340000-0000-4000-8000-000000000999','Attempted MFA bypass test'); raise exception 'TEST: staff bypassed MFA'; exception when raise_exception then if sqlerrm<>'Moderator permission and MFA required' then raise; end if; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin
 if not exists(select 1 from public.profiles where username='alpine_identity_qa') then raise exception 'Public username missing'; end if;
 begin perform public.claim_username('anon_identity'); raise exception 'TEST: anonymous claim'; exception when insufficient_privilege then null; end;
 begin perform public.my_account_access(); raise exception 'TEST: anonymous staff status access'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: chosen handles, confirmation, immutable/reserved/unique names, no staff activation RPC, no owner eligibility, metadata spoof denied, direct staff/binding writes denied, moderator plus MFA required, anonymous boundaries' as verification;
rollback;
