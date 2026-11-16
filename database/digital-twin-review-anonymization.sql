-- Preserve append-only technical evidence while allowing Auth's FK anonymization.
create or replace function e34_private.twin_review_identity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and pg_trigger_depth()>1 and old.reviewer_id is not null and new.reviewer_id is null and (to_jsonb(new)-'reviewer_id')=(to_jsonb(old)-'reviewer_id') then return new;end if;
 if tg_op<>'INSERT' then raise exception 'Accuracy reviews are append-only; record a new decision';end if;
 if auth.uid() is not null then new.reviewer_id=auth.uid();end if;return new;
end;$$;
