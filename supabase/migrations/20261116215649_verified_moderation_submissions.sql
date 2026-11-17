create function e34_private.require_verified_moderation_submitter() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
begin
  -- The existing insert policies require an authenticated owner. Migrations
  -- and trusted database maintenance can still seed test or recovery records.
  if actor is not null and not exists (
    select 1 from auth.users
    where id = actor and email_confirmed_at is not null and is_anonymous is false
  ) then
    raise exception 'Confirm your email before submitting.' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function e34_private.require_verified_moderation_submitter() from public, anon, authenticated;

create trigger verify_report_submitter
before insert on public.reports
for each row execute function e34_private.require_verified_moderation_submitter();

create trigger verify_review_submitter
before insert on public.review_submissions
for each row execute function e34_private.require_verified_moderation_submitter();
