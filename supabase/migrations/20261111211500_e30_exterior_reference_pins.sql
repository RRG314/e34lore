-- Register immutable references for the refined 325i and separate M3 exterior.
do $$
declare
  pin record;
begin
  for pin in select * from (values
    ('e30-325i-coupe-manual', 1116, '27f8bf35290c8e98a6aedb68841834d15aeebbc813aedaee9cbe92a67d998978'),
    ('e30-m3-coupe-exterior', 1112, '55f642a004fbab6a3b71d5215da9f714ff1472639c690fecb5a148ccf167a6b0')
  ) as pins(reference_id, reference_revision, reference_hash)
  loop
    insert into e34_private.build_references(id, revision, sha256)
    values (pin.reference_id, pin.reference_revision, pin.reference_hash)
    on conflict (id, revision) do nothing;
    if not exists (
      select 1 from e34_private.build_references
      where id = pin.reference_id and revision = pin.reference_revision and sha256 = pin.reference_hash
    ) then
      raise exception 'E30 exterior reference hash does not match the release pin';
    end if;
  end loop;
end $$;
