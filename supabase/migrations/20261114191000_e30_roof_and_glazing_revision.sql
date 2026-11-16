-- Register the corrected E30 roof and glazing reference.
insert into e34_private.build_references(id, revision, sha256) values
  ('e30-325i-coupe-manual', 1168, '2d6a9d1118973b81511903edc5d3aa149484a342f30b82049e7fb0595c08f95d')
on conflict (id, revision) do nothing;
