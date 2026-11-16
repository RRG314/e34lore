create policy owner_claim_no_client_access on e34_private.owner_account_claim for all to anon,authenticated using(false) with check(false);
alter function public.claim_username(text) set schema e34_private;
alter function public.my_account_access() set schema e34_private;
alter function public.claim_owner_moderator() set schema e34_private;
create function public.claim_username(chosen_username text) returns text language sql security invoker set search_path='' as $$select e34_private.claim_username(chosen_username);$$;
create function public.my_account_access() returns jsonb language sql stable security invoker set search_path='' as $$select e34_private.my_account_access();$$;
create function public.claim_owner_moderator() returns void language sql security invoker set search_path='' as $$select e34_private.claim_owner_moderator();$$;
revoke all on function public.claim_username(text),public.my_account_access(),public.claim_owner_moderator() from public,anon;
grant execute on function public.claim_username(text),public.my_account_access(),public.claim_owner_moderator() to authenticated;
