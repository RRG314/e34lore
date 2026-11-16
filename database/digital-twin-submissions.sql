insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('e34-twin-submissions','e34-twin-submissions',false,104857600,array['model/gltf-binary','application/octet-stream','image/jpeg','image/png']) on conflict(id) do nothing;
create policy twin_files_read on storage.objects for select to authenticated using(bucket_id='e34-twin-submissions' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select e34_private.has_role('reviewer'))));
create policy twin_files_upload on storage.objects for insert to authenticated with check(bucket_id='e34-twin-submissions' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy twin_files_delete on storage.objects for delete to authenticated using(bucket_id='e34-twin-submissions' and (storage.foldername(name))[1]=(select auth.uid())::text);
alter table public.reconstruction_evidence alter column source_url drop not null,add column storage_path text,add constraint twin_evidence_location check(num_nonnulls(source_url,storage_path)=1),add constraint twin_evidence_owner_path check(storage_path is null or storage_path like user_id::text||'/%'),add constraint twin_evidence_rights check(char_length(rights_evidence) between 10 and 12000);
alter table public.reconstruction_jobs add column published_geometry_revision_id text references public.geometry_revisions;
create index twin_published_geometry on public.reconstruction_jobs(published_geometry_revision_id);
create function e34_private.check_twin_job_review() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.user_id<>old.user_id then raise exception 'Submission ownership is immutable'; end if;
 if new.status not in ('needs-evidence','failed') and not exists(select 1 from public.reconstruction_evidence where job_id=new.id) then raise exception 'Source evidence is required before processing'; end if;
 if new.status='published' and not exists(select 1 from public.geometry_revisions g join public.three_d_assets a on a.id=g.asset_id where g.id=new.published_geometry_revision_id and a.publication_status='published') then raise exception 'A reviewed published geometry revision is required'; end if;
 return new;
end; $$;
create trigger twin_job_status_gate before update on public.reconstruction_jobs for each row execute function e34_private.check_twin_job_review();
revoke all on function e34_private.check_twin_job_review() from public,anon,authenticated;
