-- Supabase SQL: Create verify_store_passkey function
-- This function checks if the given passkey matches the access_code for the store

create or replace function verify_store_passkey(
  p_store_id uuid,
  p_passkey_plain text
)
returns boolean
language plpgsql
as $$
begin
  return exists (
    select 1 from stores
    where id = p_store_id
      and access_code = p_passkey_plain
  );
end;
$$;
