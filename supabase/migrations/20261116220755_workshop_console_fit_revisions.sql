insert into e34_private.build_references (id, revision, sha256) values
  ('e34-525i-sedan-automatic', 1046, '9639f4fb36034ec4543de9dd798faddac25795b64ec651f4bfbe012b614283e4'),
  ('e30-325i-coupe-manual', 1188, '28ea8b211fc911db0ec2381c095a43cfd42721f635a48b5bc1c6297aad670e7b'),
  ('e30-325i-coupe-automatic', 1189, '935313d29782a705bd9fa9f1f74170195ec1ca072fde4ccde530c6a2cee31f3f'),
  ('e30-325i-coupe-rear-spoiler', 1190, '57656a5c9286e49a640e3c11a640138448aa4c3cdf75c49c20f09a162513b85b')
on conflict (id, revision) do nothing;
