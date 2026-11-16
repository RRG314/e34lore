-- Keep reviewed interchange evidence bound to the exact original catalog position.
alter table public.part_interchanges
  add column source_position_id text,
  add constraint part_interchanges_source_position_part_fk
    foreign key (source_position_id, source_part_id)
    references public.part_assembly_positions(id, part_id),
  add constraint part_interchanges_direct_scope_key
    unique (source_part_id, target_part_id, source_position_id);

do $$
begin
  insert into public.part_interchanges
    (source_part_id, target_part_id, relationship, source_id, conditions, review_status, source_position_id)
  select ss.previous_part_id, ss.replacement_part_id, 'conditional', ss.source_id,
    'The 1995 525i Touring source lists this replacement for water pump position 03. Four nuts are required at this position. Check the installed pump, fastener specification and current source before ordering. The listing does not establish other positions, reverse interchange or other vehicle applications.',
    'source-checked', pos.id
  from public.part_supersessions ss
  join public.part_assembly_positions pos on pos.id=ss.position_id and pos.part_id=ss.previous_part_id
  where pos.id='catalog-assembly-c6f5a6e8f6fa71b37edf3bd4-c88a586d245352d2651bb45a'
    and pos.active and pos.reference='03'
    and ss.previous_part_id='bmw-07129900681' and ss.replacement_part_id='pump-nut'
    and pos.source_url='https://www.bmwpartsdeal.com/parts-list/1995-bmw-525i-wagon_e34/engine/water_pump_thermostat.html'
    and pos.required_quantity=4
  on conflict (source_part_id, target_part_id, source_position_id) do nothing;

  if not exists (
    select 1 from public.part_interchanges
    where source_part_id='bmw-07129900681' and target_part_id='pump-nut'
      and source_position_id='catalog-assembly-c6f5a6e8f6fa71b37edf3bd4-c88a586d245352d2651bb45a'
  ) then
    raise exception 'Original water-pump interchange evidence is missing or has changed';
  end if;
end;
$$;
