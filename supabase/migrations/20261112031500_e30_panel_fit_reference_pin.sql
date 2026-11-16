begin;
insert into e34_private.build_references(id,revision,sha256)
values ('e30-325i-coupe-manual',1141,'1add18983ad6a975a381b8d6216bccb34b76b0e503f57d53efb7827b15b564d7')
on conflict (id,revision) do nothing;
do $$ begin
  if not exists (
    select 1 from e34_private.build_references where id='e30-325i-coupe-manual'
      and revision=1141 and sha256='1add18983ad6a975a381b8d6216bccb34b76b0e503f57d53efb7827b15b564d7'
  ) then
    raise exception 'The E30 panel-fit reference does not match its release pin';
  end if;
end $$;
commit;
