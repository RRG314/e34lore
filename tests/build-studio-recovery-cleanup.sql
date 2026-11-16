-- Remove only the disposable recovery identity from the source cluster after its restore was verified.
-- This keeps the optional local review adapter free of recovery demonstration publications.
delete from storage.objects where bucket_id='e34-car-photos'and name like 'e34c0000-0000-4000-8000-000000000001/%';
delete from auth.users where id='e34c0000-0000-4000-8000-000000000001';
