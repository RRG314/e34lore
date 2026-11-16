alter table public.technical_drawings add column source_label text not null default 'Catalog drawing' check(char_length(source_label)<=240);
update public.technical_drawings d set source_label=a.title from public.assemblies a where a.id=d.assembly_id;
