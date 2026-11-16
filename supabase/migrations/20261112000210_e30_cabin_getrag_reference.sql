-- Keep the source-linked cabin and Getrag revisions available by their immutable pins.
begin;
insert into e34_private.build_references(id,revision,sha256)
values
  ('e30-325i-coupe-manual', 1132, '9d67efd9b25165a158e9ce6f9dd9fdf3828709383dde99aa3ab632df3684e31d'),
  ('e30-325i-coupe-manual', 1133, 'd0e11a49a087e50bf6a72351a61ab6a0e212efaef6c4f75f60e01ba2ee8e2d0b')
on conflict(id,revision) do nothing;
do $$ begin
  if exists (
    select 1 from (values
      ('e30-325i-coupe-manual', 1132, '9d67efd9b25165a158e9ce6f9dd9fdf3828709383dde99aa3ab632df3684e31d'),
  ('e30-325i-coupe-manual', 1133, 'd0e11a49a087e50bf6a72351a61ab6a0e212efaef6c4f75f60e01ba2ee8e2d0b')
    ) expected(id,revision,sha256)
    where not exists (
      select 1 from e34_private.build_references pinned
      where pinned.id=expected.id and pinned.revision=expected.revision and pinned.sha256=expected.sha256
    )
  ) then
    raise exception 'E30 cabin and Getrag reference hash does not match the release pin';
  end if;
end $$;
commit;
