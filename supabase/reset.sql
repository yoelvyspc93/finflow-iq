begin;

do $$
declare
  public_tables text;
begin
  select string_agg(format('%I.%I', schemaname, tablename), ', ' order by tablename)
    into public_tables
  from pg_tables
  where schemaname = 'public'
    and tablename <> 'spatial_ref_sys';

  if public_tables is not null then
    execute 'truncate table ' || public_tables || ' restart identity cascade';
  end if;
end
$$;

delete from auth.users;

commit;
