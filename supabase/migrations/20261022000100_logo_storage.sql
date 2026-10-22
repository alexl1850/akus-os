-- Public bucket for sub-account logos. Files live at <sub_account_id>/<file>.
-- Anyone can view a logo (it goes on websites and SMS links), but only that
-- business (or Akus staff) can upload or replace it.
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy logos_public_read on storage.objects for select
  using (bucket_id = 'logos');

create policy logos_tenant_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'logos'
    and public.can_access_sub_account(((storage.foldername(name))[1])::uuid)
  );

create policy logos_tenant_update on storage.objects for update to authenticated
  using (
    bucket_id = 'logos'
    and public.can_access_sub_account(((storage.foldername(name))[1])::uuid)
  );

create policy logos_tenant_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'logos'
    and public.can_access_sub_account(((storage.foldername(name))[1])::uuid)
  );
