-- Register the reviewed factory-dimensioned 325i reference.
do $$
declare
  expected constant text := 'd36629b0f95c119c4289c0f6c35ab9ebdfe4a244f975a52a55a1e40ad06fca03';
begin
  insert into e34_private.build_references(id, revision, sha256)
  values ('e30-325i-coupe-manual', 1122, expected)
  on conflict (id, revision) do nothing;
  if not exists (
    select 1 from e34_private.build_references
    where id = 'e30-325i-coupe-manual' and revision = 1122 and sha256 = expected
  ) then
    raise exception 'E30 325i model revision does not match the release pin';
  end if;
end $$;
