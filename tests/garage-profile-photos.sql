-- A new private profile selection can reuse an upload without publishing it.
begin;
create function pg_temp.garage_profile_assert(ok boolean, message text) returns void
language plpgsql as $$begin if ok is distinct from true then raise exception '%',message; end if; end$$;

insert into auth.users(id,email,email_confirmed_at,created_at,is_anonymous) values
  ('b3050000-0000-4000-8000-000000000001','garage-profile-owner@example.invalid',now(),now()-interval '3 days',false),
  ('b3050000-0000-4000-8000-000000000002','garage-profile-other@example.invalid',now(),now()-interval '3 days',false);
select set_config('request.jwt.claims','{"sub":"b3050000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
insert into public.owned_vehicles(id,nickname,model_id,configuration,acquired_year) values
  ('b3050000-0000-4000-a000-000000000001','Private nickname','e30-325i',
    '{"model":"325i","engine":"M20","year":"1991","body":"Coupe","transmission":"Manual","market":"US"}',1991);
select set_config('test.profile.photo',(public.reserve_car_photo(
  'b3050000-0000-4000-a000-000000000001','My car','A synthetic profile photo',true)).id::text,true);
do $$begin
  begin
    perform public.publish_garage_vehicle('b3050000-0000-4000-a000-000000000001',
      'A public E30 story','A synthetic public story with a full VIN WBAAA2310ME000001 in the text.',array['body']);
    raise exception 'Full VIN was included in a public story';
  exception when raise_exception then
    if sqlerrm <> 'Remove the full VIN before publishing your story' then raise; end if;
  end;
end$$;
select set_config('test.profile.entry',public.publish_garage_vehicle(
  'b3050000-0000-4000-a000-000000000001','A public E30 story',
  'A synthetic public car story used to verify sharing choices and profile picture access.',array['body'])::text,true);
reset role;
select pg_temp.garage_profile_assert((select configuration->>'body'='Coupe'
  and not configuration ?| array['engine','year','transmission','market'] and acquired_year is null
  and title='A public E30 story' from public.garage_showcases where id=current_setting('test.profile.entry')::uuid),
  'Publication must include only the explicitly selected optional details');
select public.complete_car_photo('b3050000-0000-4000-8000-000000000001',current_setting('test.profile.photo')::uuid,4,3,631,repeat('a',64));
insert into storage.objects(bucket_id,name) select 'e34-car-photos',object_path from public.owner_car_photos where id=current_setting('test.profile.photo')::uuid;
set local role authenticated;
select public.set_garage_profile_photo(current_setting('test.profile.photo')::uuid,false);
select pg_temp.garage_profile_assert((select photo_id=current_setting('test.profile.photo')::uuid and not show_public
  from public.my_garage_profile_photo()),'The owner can save a private profile picture');
select set_config('test.profile.public_photo',public.publish_car_photo(
  current_setting('test.profile.photo')::uuid,current_setting('test.profile.entry')::uuid)::text,true);
do $$begin
  begin
    perform public.set_garage_profile_photo(current_setting('test.profile.photo')::uuid,true);
    raise exception 'Pending photo became a public avatar';
  exception when raise_exception then
    if sqlerrm <> 'Choose a photo already visible in one of your shared car stories' then raise; end if;
  end;
end$$;

select set_config('request.jwt.claims','{"sub":"b3050000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',true);
select pg_temp.garage_profile_assert(not exists(select 1 from public.my_garage_profile_photo()),'Members cannot read another private profile setting');
do $$begin
  begin
    perform public.set_garage_profile_photo(current_setting('test.profile.photo')::uuid,false);
    raise exception 'Another member used a foreign photo';
  exception when raise_exception then
    if sqlerrm <> 'Choose a photo uploaded to one of your cars' then raise; end if;
  end;
end$$;
reset role;
-- Stand in for a moderation approval. The staff authorization and approval path
-- itself is already exercised in security-policies.sql.
update public.garage_photos set state='approved' where id=current_setting('test.profile.public_photo')::uuid;
select set_config('request.jwt.claims','{}',true);
set local role anon;
select pg_temp.garage_profile_assert(not exists(select 1 from public.garage_profile_avatars(
  array['b3050000-0000-4000-8000-000000000001']::uuid[])),'An approved car story photo does not automatically appear on the profile');
reset role;

select set_config('request.jwt.claims','{"sub":"b3050000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select public.set_garage_profile_photo(current_setting('test.profile.photo')::uuid,true);
reset role;
select set_config('request.jwt.claims','{}',true);
set local role anon;
select pg_temp.garage_profile_assert((select count(*)=1 from public.garage_profile_avatars(
  array['b3050000-0000-4000-8000-000000000001']::uuid[]) avatar
  join storage.objects object on object.name=avatar.object_path and object.bucket_id='e34-car-photos'),
  'An opted-in approved public photo can be fetched by a visitor');
reset role;
select set_config('request.jwt.claims','{"sub":"b3050000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select public.unpublish_garage(current_setting('test.profile.entry')::uuid);
reset role;
select set_config('request.jwt.claims','{}',true);
set local role anon;
select pg_temp.garage_profile_assert(not exists(select 1 from public.garage_profile_avatars(
  array['b3050000-0000-4000-8000-000000000001']::uuid[])),'Unpublishing the story removes the public profile picture');
select pg_temp.garage_profile_assert(not exists(select 1 from storage.objects),
  'Unpublishing the story revokes anonymous Storage reads');
reset role;
update public.garage_showcases set published=true where id=current_setting('test.profile.entry')::uuid;
set local role anon;
select pg_temp.garage_profile_assert(not exists(select 1 from public.garage_profile_avatars(
  array['b3050000-0000-4000-8000-000000000001']::uuid[])),
  'Republishing a car story does not restore an avatar without a new choice');
rollback;
