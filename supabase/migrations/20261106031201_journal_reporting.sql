alter table public.reports drop constraint reports_target_type_check;
alter table public.reports add constraint reports_target_type_check check(target_type in ('thread','post','guide','part','garage','journal'));
