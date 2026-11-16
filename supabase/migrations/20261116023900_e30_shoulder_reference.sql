-- Register the 325i shoulder and door-handle revision for saved builds.
insert into e34_private.build_references (id, revision, sha256) values
  ('e30-325i-coupe-manual', 1179, '5d41f057e0ce471f628c2ec32a436044f5cf8352775c1ab77c7c668202613212')
on conflict (id, revision) do nothing;
