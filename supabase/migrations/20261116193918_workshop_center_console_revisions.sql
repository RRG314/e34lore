insert into e34_private.build_references (id, revision, sha256) values
  ('e34-525i-sedan-automatic', 1045, '78c758e62f95d87aafafc6eb81b2d9c05ebd0fc5d750d06fb3f5376c46b32a67'),
  ('e30-325i-coupe-manual', 1185, '52cdff219e88fd45ba5ba4478fd889bb6616bb589f65165c9e2caff956b0c5fb'),
  ('e30-325i-coupe-automatic', 1186, '9960f691e7158fa4d114d53522ecd22c2ac97c5a22be38e1a5bca0abb53dc114'),
  ('e30-325i-coupe-rear-spoiler', 1187, 'ce7245808958669e3ce3ed3c185d96d75392e35e27710f1f23839a05ecaea93b')
on conflict (id, revision) do nothing;
