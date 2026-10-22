-- RLS tests. Run against a database built from tests/supabase_stub.sql,
-- the migrations and seed.sql (see README "Testing row-level security").
\set ON_ERROR_STOP 1

create or replace function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), false);
  execute 'set role ' || case when uid is null then 'anon' else 'authenticated' end;
end $$;

create or replace function pg_temp.check(ok boolean, label text) returns void language plpgsql as $$
begin
  if not ok then raise exception 'FAIL: %', label; end if;
  raise notice 'ok   %', label;
end $$;

-- ids
\set admin   '''aaaaaaaa-0000-4000-8000-000000000001'''
\set coastal_owner '''aaaaaaaa-0000-4000-8000-000000000002'''
\set illa_owner    '''aaaaaaaa-0000-4000-8000-000000000003'''
\set coastal '''11111111-1111-4111-8111-111111111111'''
\set illa    '''22222222-2222-4222-8222-222222222222'''

-- Coastal owner ----------------------------------------------------------------
select pg_temp.act_as(:coastal_owner);
select pg_temp.check((select count(*) from sub_accounts) = 1, 'owner sees only own sub-account');
select pg_temp.check((select count(*) from contacts) = 20, 'owner sees own 20 contacts');
select pg_temp.check((select count(*) from contacts where sub_account_id = :illa) = 0, 'owner cannot see other business contacts');
select pg_temp.check((select count(*) from pipeline_stages) = 5, 'owner sees own 5 stages');
select pg_temp.check((select count(*) from opportunities) = 8, 'owner sees own opportunities');
select pg_temp.check((select count(*) from usage_events) = 2, 'owner sees own usage');
select pg_temp.check((select count(*) from profiles) = 1, 'owner sees own team profiles only');
select pg_temp.check((select count(*) from plans) = 2, 'owner can read plans');

-- writes inside own tenant
insert into contacts (first_name, phone) values ('Test', '0400 000 000');
select pg_temp.check((select sub_account_id from contacts where first_name = 'Test') = :coastal, 'new contact defaults to own sub-account');
update sub_accounts set brand_colour = '#112233' where id = :coastal;
select pg_temp.check((select brand_colour from sub_accounts where id = :coastal) = '#112233', 'owner can edit business details');

-- writes into the other tenant must fail or be no-ops
do $$ begin
  insert into contacts (sub_account_id, first_name) values ('22222222-2222-4222-8222-222222222222', 'Sneaky');
  raise exception 'FAIL: cross-tenant insert allowed';
exception when insufficient_privilege then raise notice 'ok   cross-tenant insert blocked';
end $$;
update contacts set notes = 'hacked' where sub_account_id = :illa;
delete from contacts where sub_account_id = :illa;
update sub_accounts set business_name = 'hacked' where id = :illa;

do $$ begin
  update sub_accounts set plan_id = 'pro' where id = '11111111-1111-4111-8111-111111111111';
  raise exception 'FAIL: owner changed own plan';
exception when insufficient_privilege then raise notice 'ok   owner cannot change plan';
end $$;
do $$ begin
  update profiles set role = 'platform_admin' where id = auth.uid();
  raise exception 'FAIL: user changed own role';
exception when insufficient_privilege then raise notice 'ok   user cannot change own role';
end $$;
do $$ begin
  update profiles set sub_account_id = '22222222-2222-4222-8222-222222222222' where id = auth.uid();
  raise exception 'FAIL: user moved themselves to another tenant';
exception when insufficient_privilege then raise notice 'ok   user cannot change own sub-account';
end $$;
do $$ begin
  insert into usage_events (sub_account_id, kind, quantity) values ('11111111-1111-4111-8111-111111111111', 'sms', 1);
  raise exception 'FAIL: tenant wrote usage';
exception when insufficient_privilege then raise notice 'ok   tenant cannot write usage';
end $$;
do $$ begin
  -- link an opportunity to the other business's contact via own stage
  insert into opportunities (contact_id, stage_id, title)
  select (select id from contacts where first_name = 'Test'),
         (select id from pipeline_stages limit 1), 'ok';
  insert into opportunities (sub_account_id, contact_id, stage_id, title)
  values ('11111111-1111-4111-8111-111111111111',
          (select id from contacts limit 1), gen_random_uuid(), 'bad stage');
  raise exception 'FAIL: dangling stage accepted';
exception when foreign_key_violation then raise notice 'ok   opportunity must use own stage';
end $$;
do $$ begin
  perform * from platform_overview();
  raise exception 'FAIL: owner ran platform_overview';
exception when insufficient_privilege then raise notice 'ok   owner cannot run admin overview';
end $$;
insert into storage.objects (bucket_id, name) values ('logos', '11111111-1111-4111-8111-111111111111/logo.png');
do $$ begin
  insert into storage.objects (bucket_id, name) values ('logos', '22222222-2222-4222-8222-222222222222/logo.png');
  raise exception 'FAIL: uploaded logo to other tenant';
exception when insufficient_privilege then raise notice 'ok   cannot upload logo for another business';
end $$;

reset role;
select pg_temp.check((select count(*) from contacts where sub_account_id = :illa) = 20, 'other tenant contacts untouched (no deletes)');
select pg_temp.check((select count(*) from contacts where notes = 'hacked') = 0, 'other tenant contacts untouched (no updates)');
select pg_temp.check((select business_name from sub_accounts where id = :illa) = 'Illawarra Electrical', 'other sub-account untouched');

-- Illawarra owner mirrors --------------------------------------------------------
select pg_temp.act_as(:illa_owner);
select pg_temp.check((select count(*) from contacts) = 20, 'second owner sees only own 20 contacts');
select pg_temp.check((select count(*) from contacts where first_name = 'Test') = 0, 'second owner cannot see first owner''s new contact');

-- Staff with no sub-account (e.g. a random sign-up) sees nothing -----------------
reset role;
insert into auth.users (id, email, raw_app_meta_data) values ('aaaaaaaa-0000-4000-8000-000000000009', 'rando@example.com', '{"akus_role":"platform_admin_please"}');
select pg_temp.check((select role from profiles where email = 'rando@example.com') = 'staff', 'bogus role metadata falls back to staff');
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000009');
select pg_temp.check((select count(*) from contacts) = 0 and (select count(*) from sub_accounts) = 0, 'unassigned user sees nothing');
do $$ begin
  insert into contacts (first_name) values ('x');
  raise exception 'FAIL: unassigned user inserted';
exception when not_null_violation or insufficient_privilege then raise notice 'ok   unassigned user cannot insert';
end $$;

-- Signed-out visitor ---------------------------------------------------------------
select pg_temp.act_as(null);
do $$ begin
  perform count(*) from contacts;
  raise exception 'FAIL: anon read contacts';
exception when insufficient_privilege then raise notice 'ok   signed-out visitors cannot read';
end $$;

-- Platform admin -----------------------------------------------------------------
select pg_temp.act_as(:admin);
select pg_temp.check((select count(*) from sub_accounts) = 2, 'admin sees all sub-accounts');
select pg_temp.check((select count(*) from contacts) = 41, 'admin sees all contacts');
select pg_temp.check((select sum(leads_this_month) from platform_overview()) >= 12, 'admin overview counts leads this month');
insert into sub_accounts (business_name, plan_id) values ('Kiama Carpentry', 'starter');
select pg_temp.check(
  (select string_agg(name, ',' order by position) from pipeline_stages ps join sub_accounts s on s.id = ps.sub_account_id where s.business_name = 'Kiama Carpentry')
  = 'New Lead,Contacted,Quoted,Won,Lost', 'new sub-account gets default pipeline stages');
update sub_accounts set plan_id = 'pro' where business_name = 'Kiama Carpentry';
select pg_temp.check((select plan_id from sub_accounts where business_name = 'Kiama Carpentry') = 'pro', 'admin can change plan');

reset role;
\echo ALL RLS TESTS PASSED
