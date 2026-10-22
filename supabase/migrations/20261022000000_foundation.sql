-- Akus OS foundation: multi-tenant schema with row-level security.
--
-- Tenancy model
--   * Every client business is a row in sub_accounts.
--   * Every tenant-owned row carries sub_account_id.
--   * profiles (1:1 with auth.users) holds role + sub_account_id.
--       platform_admin -> Akus staff, sees everything
--       owner / staff  -> belongs to exactly one sub-account
--   * RLS is enabled on every table. Tenants only ever see rows whose
--     sub_account_id matches their own profile.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Plans (reference data)
-- ---------------------------------------------------------------------------
create table public.plans (
  id text primary key check (id in ('starter', 'pro')),
  name text not null,
  price_monthly integer not null,           -- AUD, GST inclusive
  ai_voice_enabled boolean not null default false,
  sms_limit integer not null,
  email_limit integer not null,
  ai_voice_minutes integer not null default 0
);

-- The only difference between plans is the AI voice agent.
insert into public.plans (id, name, price_monthly, ai_voice_enabled, sms_limit, email_limit, ai_voice_minutes) values
  ('starter', 'Starter', 97,  false, 1000, 10000, 0),
  ('pro',     'Pro',     249, true,  1000, 10000, 200);

-- ---------------------------------------------------------------------------
-- Sub-accounts (one per client business)
-- ---------------------------------------------------------------------------
create table public.sub_accounts (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  trade text,
  abn text check (abn is null or abn ~ '^[0-9]{11}$'),
  plan_id text not null default 'starter' references public.plans (id),
  owner_name text,
  owner_mobile text,
  owner_email text,
  business_email text,
  address text,
  service_suburbs text[] not null default '{}',
  -- {"mon": {"open": "07:00", "close": "17:00", "closed": false}, ...}
  business_hours jsonb not null default '{
    "mon": {"open": "07:00", "close": "17:00", "closed": false},
    "tue": {"open": "07:00", "close": "17:00", "closed": false},
    "wed": {"open": "07:00", "close": "17:00", "closed": false},
    "thu": {"open": "07:00", "close": "17:00", "closed": false},
    "fri": {"open": "07:00", "close": "17:00", "closed": false},
    "sat": {"open": "08:00", "close": "12:00", "closed": true},
    "sun": {"open": "08:00", "close": "12:00", "closed": true}
  }'::jsonb,
  google_review_url text,
  twilio_number text,
  logo_url text,
  brand_colour text not null default '#F97316' check (brand_colour ~ '^#[0-9A-Fa-f]{6}$'),
  website_status text not null default 'not_started'
    check (website_status in ('not_started', 'building', 'live', 'paused')),
  website_url text,
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  timezone text not null default 'Australia/Sydney',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profiles (app users). Role and tenant are never writable by the user.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'staff' check (role in ('platform_admin', 'owner', 'staff')),
  sub_account_id uuid references public.sub_accounts (id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.profiles (sub_account_id);

-- ---------------------------------------------------------------------------
-- Auth helpers. SECURITY DEFINER so they can read profiles without
-- recursing through profiles' own RLS policies.
-- ---------------------------------------------------------------------------
create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select p.role = 'platform_admin' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

create or replace function public.current_sub_account_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.sub_account_id from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.current_app_role()
returns text
language sql stable security definer set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

-- True when the signed-in user may touch rows belonging to sub-account `sid`.
create or replace function public.can_access_sub_account(sid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'platform_admin' or (p.sub_account_id is not null and p.sub_account_id = sid))
  );
$$;

revoke execute on function public.is_platform_admin() from public, anon;
revoke execute on function public.current_sub_account_id() from public, anon;
revoke execute on function public.current_app_role() from public, anon;
revoke execute on function public.can_access_sub_account(uuid) from public, anon;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.current_sub_account_id() to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.can_access_sub_account(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- CRM tables
-- ---------------------------------------------------------------------------
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  sub_account_id uuid not null default public.current_sub_account_id()
    references public.sub_accounts (id) on delete cascade,
  first_name text,
  last_name text,
  phone text,
  email text,
  suburb text,
  address text,
  source text not null default 'manual'
    check (source in ('website', 'missed_call', 'ai_voice', 'import', 'manual')),
  tags text[] not null default '{}',
  status text not null default 'lead' check (status in ('lead', 'customer', 'past_customer', 'lost')),
  last_job_date date,
  sms_opt_out boolean not null default false,
  email_opt_out boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sub_account_id, id)
);
create index on public.contacts (sub_account_id, created_at desc);
create index on public.contacts (sub_account_id, phone);

create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  sub_account_id uuid not null default public.current_sub_account_id()
    references public.sub_accounts (id) on delete cascade,
  name text not null,
  position integer not null,
  is_won boolean not null default false,
  is_lost boolean not null default false,
  created_at timestamptz not null default now(),
  unique (sub_account_id, id),
  check (not (is_won and is_lost))
);
create index on public.pipeline_stages (sub_account_id, position);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  sub_account_id uuid not null default public.current_sub_account_id()
    references public.sub_accounts (id) on delete cascade,
  contact_id uuid not null,
  stage_id uuid not null,
  title text not null,
  value numeric(12, 2) not null default 0,  -- AUD, GST inclusive
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Composite FKs: an opportunity can only point at a contact and stage
  -- from its own sub-account, so cross-tenant links are impossible.
  foreign key (sub_account_id, contact_id) references public.contacts (sub_account_id, id) on delete cascade,
  foreign key (sub_account_id, stage_id) references public.pipeline_stages (sub_account_id, id)
);
create index on public.opportunities (sub_account_id, stage_id);

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  sub_account_id uuid not null references public.sub_accounts (id) on delete cascade,
  kind text not null check (kind in ('sms', 'email', 'ai_voice_minutes')),
  quantity numeric(10, 2) not null check (quantity >= 0),
  date date not null default (now() at time zone 'Australia/Sydney')::date,
  created_at timestamptz not null default now()
);
create index on public.usage_events (sub_account_id, date);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger sub_accounts_touch before update on public.sub_accounts
  for each row execute function public.touch_updated_at();
create trigger contacts_touch before update on public.contacts
  for each row execute function public.touch_updated_at();
create trigger opportunities_touch before update on public.opportunities
  for each row execute function public.touch_updated_at();

-- New sub-account -> default pipeline.
create or replace function public.create_default_pipeline_stages()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.pipeline_stages (sub_account_id, name, position, is_won, is_lost) values
    (new.id, 'New Lead',  1, false, false),
    (new.id, 'Contacted', 2, false, false),
    (new.id, 'Quoted',    3, false, false),
    (new.id, 'Won',       4, true,  false),
    (new.id, 'Lost',      5, false, true);
  return new;
end;
$$;

create trigger sub_accounts_default_stages after insert on public.sub_accounts
  for each row execute function public.create_default_pipeline_stages();

-- Owners can edit their business details, but plan, status, phone number
-- and website provisioning are managed by Akus staff only.
create or replace function public.guard_sub_account_admin_fields()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  -- service_role (edge functions, dashboard) and platform admins skip the guard
  if auth.uid() is null or public.is_platform_admin() then
    return new;
  end if;
  if new.plan_id is distinct from old.plan_id
     or new.status is distinct from old.status
     or new.twilio_number is distinct from old.twilio_number
     or new.website_status is distinct from old.website_status
     or new.website_url is distinct from old.website_url
     or new.id is distinct from old.id then
    raise exception 'Only Akus staff can change plan, status, phone number or website settings'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger sub_accounts_guard_admin_fields before update on public.sub_accounts
  for each row execute function public.guard_sub_account_admin_fields();

-- New auth user -> profile. Role and tenant come only from app_metadata,
-- which users cannot set themselves. Anyone else lands as a staff user with
-- no sub-account, which RLS treats as "can see nothing".
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_app_meta_data, '{}'::jsonb);
  wanted_role text := coalesce(meta ->> 'akus_role', 'staff');
begin
  if wanted_role not in ('platform_admin', 'owner', 'staff') then
    wanted_role := 'staff';
  end if;
  insert into public.profiles (id, email, full_name, role, sub_account_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', meta ->> 'full_name'),
    wanted_role,
    nullif(meta ->> 'akus_sub_account_id', '')::uuid
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.plans enable row level security;
alter table public.sub_accounts enable row level security;
alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.opportunities enable row level security;
alter table public.usage_events enable row level security;

-- Nothing is visible to signed-out visitors.
revoke all on all tables in schema public from anon;

-- plans: everyone signed in can read; only admins change them.
create policy plans_read on public.plans for select to authenticated using (true);
create policy plans_admin_write on public.plans for all to authenticated
  using ((select public.is_platform_admin())) with check ((select public.is_platform_admin()));

-- sub_accounts: tenants see their own; owners edit their own; admins do all.
create policy sub_accounts_read on public.sub_accounts for select to authenticated
  using ((select public.can_access_sub_account(id)));
create policy sub_accounts_owner_update on public.sub_accounts for update to authenticated
  using ((select public.current_app_role()) = 'owner' and id = (select public.current_sub_account_id()))
  with check ((select public.current_app_role()) = 'owner' and id = (select public.current_sub_account_id()));
create policy sub_accounts_admin_all on public.sub_accounts for all to authenticated
  using ((select public.is_platform_admin())) with check ((select public.is_platform_admin()));

-- profiles: see yourself and your team; admins see all. Users may only edit
-- their own name (column grant below); role/tenant changes are admin-only.
create policy profiles_read on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or (sub_account_id is not null and sub_account_id = (select public.current_sub_account_id()))
    or (select public.is_platform_admin())
  );
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_admin_all on public.profiles for all to authenticated
  using ((select public.is_platform_admin())) with check ((select public.is_platform_admin()));
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- Tenant-owned CRM tables: full read/write inside your own sub-account.
create policy contacts_tenant on public.contacts for all to authenticated
  using ((select public.can_access_sub_account(sub_account_id)))
  with check ((select public.can_access_sub_account(sub_account_id)));

create policy pipeline_stages_tenant on public.pipeline_stages for all to authenticated
  using ((select public.can_access_sub_account(sub_account_id)))
  with check ((select public.can_access_sub_account(sub_account_id)));

create policy opportunities_tenant on public.opportunities for all to authenticated
  using ((select public.can_access_sub_account(sub_account_id)))
  with check ((select public.can_access_sub_account(sub_account_id)));

-- usage_events: tenants can read their own usage; only admins and the
-- service role (billing jobs) write it, so usage cannot be tampered with.
create policy usage_events_read on public.usage_events for select to authenticated
  using ((select public.can_access_sub_account(sub_account_id)));
create policy usage_events_admin_write on public.usage_events for all to authenticated
  using ((select public.is_platform_admin())) with check ((select public.is_platform_admin()));

-- ---------------------------------------------------------------------------
-- Platform admin overview (sub-accounts + leads this month, Sydney time)
-- ---------------------------------------------------------------------------
create or replace function public.platform_overview()
returns table (
  id uuid,
  business_name text,
  trade text,
  plan_id text,
  plan_name text,
  status text,
  owner_name text,
  owner_email text,
  leads_this_month bigint,
  contacts_total bigint,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  month_start timestamptz := date_trunc('month', now() at time zone 'Australia/Sydney') at time zone 'Australia/Sydney';
begin
  if not public.is_platform_admin() then
    raise exception 'Platform admins only' using errcode = '42501';
  end if;
  return query
    select s.id, s.business_name, s.trade, s.plan_id, p.name, s.status, s.owner_name, s.owner_email,
           (select count(*) from public.contacts c where c.sub_account_id = s.id and c.created_at >= month_start),
           (select count(*) from public.contacts c where c.sub_account_id = s.id),
           s.created_at
    from public.sub_accounts s
    join public.plans p on p.id = s.plan_id
    order by s.business_name;
end;
$$;
revoke execute on function public.platform_overview() from public, anon;
grant execute on function public.platform_overview() to authenticated;
