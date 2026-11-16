begin;
insert into e34_private.build_references(id,revision,sha256)
values ('e30-325i-coupe-manual',1142,'63ce65599ca20d82d6f0d6477dc48ff9c3ef05d96c9dc80f90987d9759241a57')
on conflict (id,revision) do nothing;
do $$ begin
  if not exists (
    select 1 from e34_private.build_references where id='e30-325i-coupe-manual'
      and revision=1142 and sha256='63ce65599ca20d82d6f0d6477dc48ff9c3ef05d96c9dc80f90987d9759241a57'
  ) then
    raise exception 'The E30 rear seam reference does not match its release pin';
  end if;
end $$;
commit;
