-- Register the updated coupe alongside earlier saved model revisions.
insert into e34_private.build_references(id, revision, sha256) values
  ('e30-325i-coupe-manual', 1164, 'db37a2b01a7db22e3ae15f6cf348b8934274707cb00c5c94c77ec85db11a357c')
on conflict (id, revision) do nothing;
