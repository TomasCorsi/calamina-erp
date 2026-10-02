create table iam.registration_invitations (
  id uuid primary key default extensions.gen_random_uuid(),
  email extensions.citext not null,
  token_hash bytea not null,
  role_id uuid not null
    references iam.roles (id) on delete restrict,
  personal_id uuid
    references public.personal (id) on delete restrict,
  state text not null default 'pending',
  expires_at timestamptz not null,
  reservation_id uuid,
  reserved_at timestamptz,
  reservation_expires_at timestamptz,
  accepted_at timestamptz,
  accepted_by uuid
    references auth.users (id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid
    references auth.users (id) on delete set null,
  created_by uuid
    references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registration_invitations_email_check check (
    email::text = btrim(email::text)
    and email::text ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  constraint registration_invitations_token_hash_length_check check (
    octet_length(token_hash) = 32
  ),
  constraint registration_invitations_token_hash_key unique (token_hash),
  constraint registration_invitations_state_check check (
    state in ('pending', 'reserved', 'accepted', 'revoked', 'expired')
  ),
  constraint registration_invitations_expiry_check check (expires_at > created_at),
  constraint registration_invitations_reservation_expiry_check check (
    reservation_expires_at is null or reservation_expires_at <= expires_at
  ),
  constraint registration_invitations_state_shape_check check (
    (
      state = 'pending'
      and reservation_id is null
      and reserved_at is null
      and reservation_expires_at is null
      and accepted_at is null
      and revoked_at is null
    )
    or (
      state = 'reserved'
      and reservation_id is not null
      and reserved_at is not null
      and reservation_expires_at is not null
      and reservation_expires_at > reserved_at
      and accepted_at is null
      and revoked_at is null
    )
    or (
      state = 'accepted'
      and reservation_id is null
      and reserved_at is null
      and reservation_expires_at is null
      and accepted_at is not null
      and revoked_at is null
    )
    or (
      state = 'revoked'
      and reservation_id is null
      and reserved_at is null
      and reservation_expires_at is null
      and accepted_at is null
      and revoked_at is not null
    )
    or (
      state = 'expired'
      and reservation_id is null
      and reserved_at is null
      and reservation_expires_at is null
      and accepted_at is null
      and revoked_at is null
    )
  )
);

create unique index registration_invitations_active_email_key
  on iam.registration_invitations (email)
  where state in ('pending', 'reserved');

create unique index registration_invitations_active_personal_key
  on iam.registration_invitations (personal_id)
  where personal_id is not null and state in ('pending', 'reserved');

create unique index registration_invitations_reservation_id_key
  on iam.registration_invitations (reservation_id)
  where reservation_id is not null;

create index registration_invitations_state_expires_idx
  on iam.registration_invitations (state, expires_at);
create index registration_invitations_accepted_by_idx
  on iam.registration_invitations (accepted_by);
create index registration_invitations_created_by_idx
  on iam.registration_invitations (created_by);

alter table iam.registration_invitations enable row level security;
revoke all on table iam.registration_invitations
  from public, anon, authenticated, service_role;
