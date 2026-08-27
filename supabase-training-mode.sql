begin;

create schema if not exists private;
grant usage on schema private to authenticated;

create table if not exists private.training_mode_settings (
  id smallint primary key default 1 check (id = 1),
  password_hash text not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists private.training_mode_access_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  failed_attempts smallint not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists training_mode_settings_updated_by_idx
  on private.training_mode_settings (updated_by);

revoke all on table private.training_mode_settings from public, anon, authenticated;
revoke all on table private.training_mode_access_attempts from public, anon, authenticated;

create or replace function private.training_mode_status_impl()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
  v_configured boolean;
  v_updated_at timestamptz;
begin
  if v_user_id is null or not exists (
    select 1 from public.profiles p
    where p.id = v_user_id and p.active
  ) then
    raise exception 'Acesso autenticado obrigatório.' using errcode = '42501';
  end if;

  select exists (
    select 1 from public.profiles p
    where p.id = v_user_id and p.active and p.role = 'admin'
  ) into v_is_admin;

  select exists(select 1 from private.training_mode_settings where id = 1),
         (select updated_at from private.training_mode_settings where id = 1)
    into v_configured, v_updated_at;

  return jsonb_build_object(
    'configured', v_configured,
    'can_manage', v_is_admin,
    'updated_at', v_updated_at
  );
end;
$$;

create or replace function private.set_training_password_impl(new_password text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not exists (
    select 1 from public.profiles p
    where p.id = v_user_id and p.active and p.role = 'admin'
  ) then
    raise exception 'Somente administradores podem definir a senha de treinamento.' using errcode = '42501';
  end if;

  if new_password is null
     or char_length(new_password) < 10
     or new_password ~ '[[:space:]]'
     or new_password !~ '[a-z]'
     or new_password !~ '[A-Z]'
     or new_password !~ '[0-9]'
     or new_password !~ '[^A-Za-z0-9]' then
    raise exception 'A senha deve ter 10 ou mais caracteres, maiúscula, minúscula, número, caractere especial e nenhum espaço.' using errcode = '23514';
  end if;

  insert into private.training_mode_settings (id, password_hash, updated_by, updated_at)
  values (1, extensions.crypt(new_password, extensions.gen_salt('bf', 10)), v_user_id, now())
  on conflict (id) do update
    set password_hash = excluded.password_hash,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;

  delete from private.training_mode_access_attempts;

  insert into public.audit_logs (user_id, action, entity_type, entity_id, details)
  values (v_user_id, 'training_password_updated', 'training_mode', 'global', jsonb_build_object('configured', true));

  return jsonb_build_object('ok', true, 'configured', true, 'updated_at', now());
end;
$$;

create or replace function private.verify_training_password_impl(candidate text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_hash text;
  v_attempt private.training_mode_access_attempts%rowtype;
  v_failed smallint;
  v_locked_until timestamptz;
  v_ok boolean := false;
begin
  if v_user_id is null or not exists (
    select 1 from public.profiles p
    where p.id = v_user_id and p.active
  ) then
    raise exception 'Acesso autenticado obrigatório.' using errcode = '42501';
  end if;

  select password_hash into v_hash
  from private.training_mode_settings
  where id = 1;

  if v_hash is null then
    return jsonb_build_object('ok', false, 'configured', false, 'locked', false);
  end if;

  select * into v_attempt
  from private.training_mode_access_attempts
  where user_id = v_user_id;

  if v_attempt.locked_until is not null and v_attempt.locked_until > now() then
    return jsonb_build_object(
      'ok', false,
      'configured', true,
      'locked', true,
      'retry_after_seconds', greatest(1, ceil(extract(epoch from (v_attempt.locked_until - now())))::integer)
    );
  end if;

  v_ok := extensions.crypt(coalesce(candidate, ''), v_hash) = v_hash;

  if v_ok then
    delete from private.training_mode_access_attempts where user_id = v_user_id;
    insert into public.audit_logs (user_id, action, entity_type, entity_id, details)
    values (v_user_id, 'training_mode_entered', 'training_mode', 'session', jsonb_build_object('verified', true));
    return jsonb_build_object('ok', true, 'configured', true, 'locked', false);
  end if;

  v_failed := case
    when v_attempt.user_id is null or v_attempt.locked_until is not null then 1
    else least(5, v_attempt.failed_attempts + 1)
  end;
  v_locked_until := case when v_failed >= 5 then now() + interval '5 minutes' else null end;

  insert into private.training_mode_access_attempts (user_id, failed_attempts, locked_until, updated_at)
  values (v_user_id, v_failed, v_locked_until, now())
  on conflict (user_id) do update
    set failed_attempts = excluded.failed_attempts,
        locked_until = excluded.locked_until,
        updated_at = excluded.updated_at;

  return jsonb_build_object(
    'ok', false,
    'configured', true,
    'locked', v_locked_until is not null,
    'attempts_remaining', greatest(0, 5 - v_failed),
    'retry_after_seconds', case when v_locked_until is null then 0 else 300 end
  );
end;
$$;

create or replace function public.training_mode_status()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$ select private.training_mode_status_impl() $$;

create or replace function public.set_training_password(new_password text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.set_training_password_impl(new_password) $$;

create or replace function public.verify_training_password(candidate text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.verify_training_password_impl(candidate) $$;

revoke all on function public.training_mode_status() from public, anon;
revoke all on function public.set_training_password(text) from public, anon;
revoke all on function public.verify_training_password(text) from public, anon;
revoke all on function private.training_mode_status_impl() from public, anon;
revoke all on function private.set_training_password_impl(text) from public, anon;
revoke all on function private.verify_training_password_impl(text) from public, anon;

grant execute on function public.training_mode_status() to authenticated;
grant execute on function public.set_training_password(text) to authenticated;
grant execute on function public.verify_training_password(text) to authenticated;
grant execute on function private.training_mode_status_impl() to authenticated;
grant execute on function private.set_training_password_impl(text) to authenticated;
grant execute on function private.verify_training_password_impl(text) to authenticated;

commit;
