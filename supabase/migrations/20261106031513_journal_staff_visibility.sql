create policy journal_staff_read on public.garage_journal_entries for select to authenticated
 using((select e34_private.has_role('moderator')) and coalesce((select auth.jwt()->>'aal'),'')='aal2');
