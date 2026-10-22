-- Akus OS demo data. Safe to run on a fresh database (supabase db reset).
--
-- Demo logins (password for all: AkusDemo2026!)
--   admin@akus.demo                   platform_admin
--   owner@coastalplumbing.demo        owner, Coastal Plumbing (Starter)
--   owner@illawarraelectrical.demo    owner, Illawarra Electrical (Pro)

-- ---------------------------------------------------------------------------
-- Sub-accounts (the trigger creates each one's five pipeline stages)
-- ---------------------------------------------------------------------------
insert into public.sub_accounts (
  id, business_name, trade, abn, plan_id, owner_name, owner_mobile, owner_email,
  business_email, address, service_suburbs, google_review_url, brand_colour, status
) values
  ('11111111-1111-4111-8111-111111111111', 'Coastal Plumbing', 'Plumber', '51824753556', 'starter',
   'Dave Mitchell', '0412 345 678', 'owner@coastalplumbing.demo', 'jobs@coastalplumbing.demo',
   '14 Crown Street, Wollongong NSW 2500',
   array['Wollongong', 'Fairy Meadow', 'Corrimal', 'Thirroul', 'Figtree', 'Unanderra'],
   'https://g.page/r/coastal-plumbing-demo/review', '#0EA5E9', 'active'),
  ('22222222-2222-4222-8222-222222222222', 'Illawarra Electrical', 'Electrician', '33102417032', 'pro',
   'Sarah Nguyen', '0423 987 654', 'owner@illawarraelectrical.demo', 'hello@illawarraelectrical.demo',
   '3/22 Princes Highway, Dapto NSW 2530',
   array['Dapto', 'Albion Park', 'Shellharbour', 'Kiama', 'Warilla', 'Oak Flats'],
   'https://g.page/r/illawarra-electrical-demo/review', '#F59E0B', 'active');

-- ---------------------------------------------------------------------------
-- Users. Role + sub-account go in app_metadata; handle_new_user() turns them
-- into profiles.
-- ---------------------------------------------------------------------------
with demo_users (id, email, full_name, role, sub_account_id) as (
  values
    ('aaaaaaaa-0000-4000-8000-000000000001'::uuid, 'admin@akus.demo', 'Akus Admin', 'platform_admin', null),
    ('aaaaaaaa-0000-4000-8000-000000000002'::uuid, 'owner@coastalplumbing.demo', 'Dave Mitchell', 'owner',
     '11111111-1111-4111-8111-111111111111'),
    ('aaaaaaaa-0000-4000-8000-000000000003'::uuid, 'owner@illawarraelectrical.demo', 'Sarah Nguyen', 'owner',
     '22222222-2222-4222-8222-222222222222')
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
  crypt('AkusDemo2026!', gen_salt('bf')), now(),
  jsonb_build_object('provider', 'email', 'providers', array['email'],
                     'akus_role', role, 'akus_sub_account_id', sub_account_id),
  jsonb_build_object('full_name', full_name), now(), now(),
  '', '', '', ''
from demo_users;

insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id::text, u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.email like '%.demo';

-- ---------------------------------------------------------------------------
-- 20 contacts per sub-account
-- ---------------------------------------------------------------------------
with
first_names as (
  select array['Jack','Olivia','Liam','Charlotte','Noah','Amelia','William','Isla','Thomas','Mia',
               'James','Ava','Lachlan','Grace','Cooper','Chloe','Ethan','Zoe','Riley','Sophie'] as a
),
last_names as (
  select array['Smith','Jones','Williams','Brown','Wilson','Taylor','Anderson','Thompson','Nguyen','Kelly',
               'Martin','Ryan','Walker','O''Brien','Harris','Lee','Campbell','Murphy','Clarke','Patel'] as a
),
accounts as (
  select id, service_suburbs, row_number() over (order by business_name) as n
  from public.sub_accounts
),
seq as (select generate_series(1, 20) as i)
insert into public.contacts (
  sub_account_id, first_name, last_name, phone, email, suburb, address, source, tags, status,
  last_job_date, sms_opt_out, email_opt_out, notes, created_at
)
select
  a.id,
  f.a[((s.i + a.n * 7 - 1) % 20) + 1],
  l.a[((s.i * 3 + a.n - 1) % 20) + 1],
  '04' || lpad(((a.n * 13 + s.i * 7919) % 100)::text, 2, '0') || ' '
       || lpad(((s.i * 271 + a.n * 31) % 1000)::text, 3, '0') || ' '
       || lpad(((s.i * 547 + a.n * 89) % 1000)::text, 3, '0'),
  lower(f.a[((s.i + a.n * 7 - 1) % 20) + 1]) || '.'
       || lower(replace(l.a[((s.i * 3 + a.n - 1) % 20) + 1], '''', '')) || s.i || '@example.com.au',
  a.service_suburbs[((s.i - 1) % array_length(a.service_suburbs, 1)) + 1],
  (s.i * 7 % 120 + 1) || ' ' || (array['Smith St','Main Rd','Beach Pde','King St','Ocean Dr','Park Ave'])[(s.i % 6) + 1],
  (array['website','missed_call','ai_voice','import','manual'])[(s.i % 5) + 1],
  case when s.i % 4 = 0 then array['hot water'] when s.i % 4 = 1 then array['urgent'] else '{}'::text[] end,
  case
    when s.i <= 8  then 'lead'
    when s.i <= 14 then 'customer'
    when s.i <= 18 then 'past_customer'
    else 'lost'
  end,
  case when s.i between 9 and 18 then (current_date - (s.i * 23))::date end,
  s.i = 17,
  s.i = 19,
  case when s.i = 1 then 'Prefers a text before calling.' end,
  -- first 6 contacts arrived this month, the rest spread over earlier months
  case when s.i <= 6 then date_trunc('month', now()) + (s.i || ' hours')::interval
       else now() - ((s.i * 9) || ' days')::interval end
from accounts a cross join seq s cross join first_names f cross join last_names l;

-- ---------------------------------------------------------------------------
-- A few opportunities so the pipeline isn't empty
-- ---------------------------------------------------------------------------
with ranked as (
  select c.id as contact_id, c.sub_account_id, c.status, c.first_name, c.last_name,
         row_number() over (partition by c.sub_account_id order by c.created_at desc) as rn
  from public.contacts c
),
picked as (
  select r.*, s.trade
  from ranked r join public.sub_accounts s on s.id = r.sub_account_id
  where r.rn <= 8
)
insert into public.opportunities (sub_account_id, contact_id, stage_id, title, value)
select
  p.sub_account_id, p.contact_id,
  (select ps.id from public.pipeline_stages ps
     where ps.sub_account_id = p.sub_account_id
       and ps.name = (array['New Lead','New Lead','Contacted','Contacted','Quoted','Quoted','Won','Lost'])[p.rn]),
  case when p.trade = 'Plumber'
       then (array['Hot water system replacement','Blocked drain','Leaking tap','Bathroom renovation rough-in',
                   'Gas heater install','Burst pipe repair','Toilet replacement','Stormwater fix'])[p.rn]
       else (array['Switchboard upgrade','Ceiling fans x3','Smoke alarm compliance','EV charger install',
                   'Downlight retrofit','Power point additions','Solar inspection','Outdoor lighting'])[p.rn]
  end || ' - ' || p.first_name || ' ' || p.last_name,
  (array[450, 280, 1650, 320, 3800, 2200, 1350, 900])[p.rn]
from picked p;

-- ---------------------------------------------------------------------------
-- Usage this month
-- ---------------------------------------------------------------------------
insert into public.usage_events (sub_account_id, kind, quantity, date) values
  ('11111111-1111-4111-8111-111111111111', 'sms', 142, (now() at time zone 'Australia/Sydney')::date),
  ('11111111-1111-4111-8111-111111111111', 'email', 610, (now() at time zone 'Australia/Sydney')::date),
  ('22222222-2222-4222-8222-222222222222', 'sms', 233, (now() at time zone 'Australia/Sydney')::date),
  ('22222222-2222-4222-8222-222222222222', 'email', 1204, (now() at time zone 'Australia/Sydney')::date),
  ('22222222-2222-4222-8222-222222222222', 'ai_voice_minutes', 47.5, (now() at time zone 'Australia/Sydney')::date);
