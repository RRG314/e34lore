begin;
insert into e34_private.build_references(id,revision,sha256)
values ('e30-325i-coupe-manual',1144,'1cc27674e7dad8f0d61ce6acd1c8a87303dbf2b6e47dc70374d3d6a5e164e1c1')
on conflict (id,revision) do nothing;
do $$ begin
  if not exists (
    select 1 from e34_private.build_references where id='e30-325i-coupe-manual'
      and revision=1144 and sha256='1cc27674e7dad8f0d61ce6acd1c8a87303dbf2b6e47dc70374d3d6a5e164e1c1'
  ) then
    raise exception 'The E30 photo-matched reference does not match its release pin';
  end if;
end $$;
commit;
