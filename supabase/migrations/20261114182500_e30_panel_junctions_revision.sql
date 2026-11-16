-- Retain the BMW 325i model identity while registering the revised panel fit.
insert into e34_private.build_references(id, revision, sha256) values
  ('e30-325i-coupe-manual', 1166, 'a716d6c968ee484ed53423ebf32057a4c27245dffa9db6ea7282b2773b37c1c7')
on conflict (id, revision) do nothing;
