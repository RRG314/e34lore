-- Keep the corrected cabin available alongside earlier saved model revisions.
insert into e34_private.build_references(id, revision, sha256) values
  ('e30-325i-coupe-manual', 1163, 'ea2537faef6b635fe4bfbff1566c28be1ae2e227617b0f11576062530cdf490d')
on conflict (id, revision) do nothing;
