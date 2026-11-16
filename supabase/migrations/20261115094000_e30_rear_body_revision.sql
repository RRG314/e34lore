-- Register the corrected E30 rear body reference.
insert into e34_private.build_references(id, revision, sha256) values
  ('e30-325i-coupe-manual', 1169, '3f07f5800293164239b26b6bfa1062f867dcc6d94765f74bf3b664d159e29e12')
on conflict (id, revision) do nothing;
