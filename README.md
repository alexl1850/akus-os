# Akus OS

All-in-one system for Australian local businesses (tradies first): CRM, inbox, quoting, missed-call text-back, AI voice agent, Google reviews, database reactivation and an auto-generated website. Mobile-first, plain language, AUD, GST 10%, Australia/Sydney time.

This is the foundation: multi-tenant database with row-level security, login, platform admin dashboard, sub-account settings and the app shell. Inbox, Quotes and the "More" features are placeholder screens for now.

## Stack

- Vite + React + TypeScript, Tailwind + shadcn/ui (same setup as Dyad projects)
- Supabase: Postgres with RLS, Auth (password + magic link + invites), Storage (logos), one Edge Function
- Deploys to Vercel as a static SPA (`vercel.json` rewrites everything to `index.html`)

## Getting it running

1. Create a Supabase project (Sydney region: `ap-southeast-2`).
2. Run the SQL in `supabase/migrations/` in order (SQL editor or `supabase db push`), then `supabase/seed.sql` for demo data.
3. Deploy the invite function: `supabase functions deploy create-sub-account`.
4. In Supabase → Authentication:
   - Turn **off** "Allow new users to sign up" (people only get in by invite).
   - Site URL: your app URL. Add `<app url>/auth/callback` to redirect URLs.
5. Copy `.env.example` to `.env` and fill in the project URL and anon key.
6. `pnpm install && pnpm dev` (http://localhost:8080). Use pnpm: `npm install` trips over a peer-version conflict.

### Demo logins (after seeding)

Password for all: `AkusDemo2026!`

| Email | Role |
| --- | --- |
| admin@akus.demo | Platform admin |
| owner@coastalplumbing.demo | Owner, Coastal Plumbing (Starter) |
| owner@illawarraelectrical.demo | Owner, Illawarra Electrical (Pro) |

Change or delete these before going live.

## How tenancy works

- Every client business is a row in `sub_accounts`. Every tenant record (`contacts`, `pipeline_stages`, `opportunities`, `usage_events`) has `sub_account_id`.
- `profiles` (one per login) holds `role` (`platform_admin`, `owner`, `staff`) and `sub_account_id`.
- RLS is on for every table. Owners and staff only see rows for their own sub-account; platform admins see everything. Signed-out visitors see nothing.
- Users can't change their own role or sub-account (column grants), and role/tenant are only ever read from `app_metadata`, which users can't edit.
- Opportunities use composite foreign keys, so they can only reference a contact and stage in the same sub-account.
- Owners can edit business settings; plan, status, Twilio number and website fields are Akus-only (enforced by a trigger). Staff can view settings but not change them.
- Usage events are read-only for tenants; only admins or the service role write them.
- Logos live in the public `logos` bucket under `<sub_account_id>/`, and only that business (or an admin) can upload there.
- New sub-accounts automatically get the stages New Lead, Contacted, Quoted, Won, Lost.

"Enter" on the admin dashboard lets an Akus admin use the app as that business (a yellow banner shows while doing so).

## Testing row-level security

`supabase/tests/rls_test.sql` runs 32 checks (cross-tenant reads, writes, deletes, role escalation, storage, admin access) against plain Postgres:

```bash
createdb akus_test
cat supabase/tests/supabase_stub.sql supabase/migrations/*.sql supabase/seed.sql | psql -v ON_ERROR_STOP=1 akus_test
psql akus_test -f supabase/tests/rls_test.sql   # ends with "ALL RLS TESTS PASSED"
```

## Plans

| | Starter | Pro |
| --- | --- | --- |
| Price (AUD/mth, inc. GST) | $97 | $249 |
| SMS / email | 1,000 / 10,000 | 1,000 / 10,000 |
| AI voice agent | No | Yes, 200 mins |

The AI voice agent is the only difference.
