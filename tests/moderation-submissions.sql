begin;

insert into auth.users (id, email, email_confirmed_at, is_anonymous) values
 ('e34d0000-0000-4000-8000-000000000001', null, now(), true),
 ('e34d0000-0000-4000-8000-000000000002', 'unconfirmed@example.invalid', null, false),
 ('e34d0000-0000-4000-8000-000000000003', 'confirmed@example.invalid', now(), false),
 ('e34d0000-0000-4000-8000-000000000004', 'moderator@example.invalid', now(), false);

insert into auth.sessions (id, user_id, aal)
values ('e34d0000-0000-4000-9000-000000000004', 'e34d0000-0000-4000-8000-000000000004', 'aal2');
insert into auth.mfa_factors (user_id, status) values ('e34d0000-0000-4000-8000-000000000004', 'verified');
insert into e34_private.staff_roles (user_id, role) values
 ('e34d0000-0000-4000-8000-000000000004', 'moderator'),
 ('e34d0000-0000-4000-8000-000000000004', 'reviewer');

set local role authenticated;

do $$
declare
  actor uuid;
begin
  foreach actor in array array[
    'e34d0000-0000-4000-8000-000000000001'::uuid,
    'e34d0000-0000-4000-8000-000000000002'::uuid
  ] loop
    perform set_config('request.jwt.claims', jsonb_build_object('sub', actor, 'role', 'authenticated')::text, true);

    begin
      insert into public.reports (target_type, target_id, reason)
      values ('thread', 'moderation-fixture', 'Report written for the isolated moderation test.');
      raise exception 'Report accepted without verified membership';
    exception when insufficient_privilege then
      if sqlerrm <> 'Confirm your email before submitting.' then raise; end if;
    end;

    begin
      insert into public.review_submissions (target_type, target_id, correction)
      values ('guide', 'moderation-fixture', 'Correction written for the isolated moderation test.');
      raise exception 'Correction accepted without verified membership';
    exception when insufficient_privilege then
      if sqlerrm <> 'Confirm your email before submitting.' then raise; end if;
    end;
  end loop;
end;
$$;

select set_config('request.jwt.claims','{"sub":"e34d0000-0000-4000-8000-000000000003","role":"authenticated"}',true);
insert into public.reports (target_type, target_id, reason)
values ('thread', 'moderation-fixture', 'A verified member can still report a discussion.');
insert into public.review_submissions (target_type, target_id, correction)
values ('guide', 'moderation-fixture', 'A verified member can still submit a source correction.');

do $$
begin
  begin
    delete from public.reports where target_id = 'moderation-fixture';
    if found then raise exception 'A reporter deleted their own moderation record'; end if;
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$
begin
  begin
    insert into public.reports (target_type, target_id, reason)
    values ('thread', 'moderation-fixture', 'Unsigned report in the isolated test.');
    raise exception 'Report accepted without a session';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.review_submissions (target_type, target_id, correction)
    values ('guide', 'moderation-fixture', 'Unsigned correction in the isolated test.');
    raise exception 'Correction accepted without a session';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
select set_config('request.jwt.claims','{"sub":"e34d0000-0000-4000-8000-000000000004","session_id":"e34d0000-0000-4000-9000-000000000004","role":"authenticated","aal":"aal2"}',true);
set local role authenticated;
do $$
begin
  update public.reports set status = 'resolved' where target_id = 'moderation-fixture';
  if not found then raise exception 'Verified moderator could not resolve report'; end if;
  update public.review_submissions set status = 'rejected' where target_id = 'moderation-fixture';
  if not found then raise exception 'Verified reviewer could not review correction'; end if;
end;
$$;

rollback;

select 'PASS verified report and correction writers and report retention';
