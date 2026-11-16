insert into e34_private.build_references (id, revision, sha256) values
  ('e34-525i-sedan-automatic', 1044, 'b1140a18ff3f78effd05fdff754e883d89dd4a6ec80911e425bfbb473426649a'),
  ('e30-325i-coupe-manual', 1170, '0bdc7511524e72639298c51bb72289fe724c1f297f82adb49522a4068f81bda8'),
  ('e30-325i-coupe-manual', 1172, '26441bca523b75080ea2c09fe135c7a7c0e3ed4ce01fb211ab8c52b352b81941'),
  ('e30-325i-coupe-manual', 1173, 'ff166b56ef74904c4c0a03c5ac9327eb68f17c14c0662e28b7ee9c6be35d8b29'),
  ('e30-325i-coupe-manual', 1174, '4f11516062aa7a00c8a6f2dc7ce7817408f1ed8e3e10ccf3ede998c3aa67b57c'),
  ('e30-325i-coupe-manual', 1175, '97925ccea74cb2c0b9f4482226a310e149cf5b7490f489c8753e7eb349fd9ebb'),
  ('e30-325i-coupe-manual', 1176, '2ca8a95e637b9190bb24cbbb95a7b35ef5a6e344ddefa772d6930d858ab42ee8'),
  ('e30-325i-coupe-manual', 1177, '3894c6cd8327024d3705a9f716968e746e3962fe79f91c003fc546557498ec0b')
on conflict (id, revision) do nothing;
