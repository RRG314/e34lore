-- Register the E30 roof-fit model alongside prior revisions so saved views stay valid.
insert into e34_private.build_references(id, revision, sha256) values
  ('e30-325i-coupe-manual', 1162, 'baac0c7de21b10e20d0e986046ab8637070212d5cd0c167d76d4f47a71ebb2ce')
on conflict (id, revision) do nothing;
