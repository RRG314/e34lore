-- Register the corrected 325i exterior without changing previous saved revision pins.
insert into e34_private.build_references(id, revision, sha256) values
  ('e30-325i-coupe-manual', 1167, '7f0bc587de4592e483cfd7ec139573fd8e5b9c251516ede704459b36107a4afd')
on conflict (id, revision) do nothing;
