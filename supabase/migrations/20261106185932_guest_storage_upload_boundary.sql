-- Guest posting does not enable private model/file uploads. Anonymous Auth
-- users share the authenticated role, so enforce this independently in Storage.
create policy registered_account_uploads on storage.objects as restrictive
for insert to authenticated
with check (coalesce((select (auth.jwt()->>'is_anonymous')::boolean),false)=false);
