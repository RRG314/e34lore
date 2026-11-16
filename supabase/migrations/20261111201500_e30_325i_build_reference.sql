-- Pin the reviewed stock-body 325i reference. Earlier pins remain immutable.
do $$
declare
  expected constant text := '63212ecbc055ab22d81b6d52728f916b1b8fdc2e21ba5fb813e7e62a19e2f97c';
begin
  insert into e34_private.build_references(id, revision, sha256)
  values ('e30-325i-coupe-manual', 1110, expected)
  on conflict (id, revision) do nothing;
  if not exists (
    select 1 from e34_private.build_references
    where id = 'e30-325i-coupe-manual' and revision = 1110 and sha256 = expected
  ) then
    raise exception 'E30 325i model revision does not match the release pin';
  end if;
end $$;
