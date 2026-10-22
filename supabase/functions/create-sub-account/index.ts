// Creates a sub-account and emails the owner an invite.
// Only platform admins may call it. The invite link lands on /auth/callback,
// and the new user's profile is created as an owner of the new sub-account.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const EDITABLE_FIELDS = [
  "business_name",
  "trade",
  "abn",
  "plan_id",
  "owner_name",
  "owner_mobile",
  "owner_email",
  "business_email",
  "address",
  "service_suburbs",
  "google_review_url",
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Check the caller is a platform admin, using their own token (RLS applies).
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: isAdmin, error: adminErr } = await caller.rpc("is_platform_admin");
  if (adminErr || !isAdmin) return json({ error: "Only Akus staff can create sub-accounts" }, 403);

  const body = await req.json().catch(() => null);
  if (!body?.business_name || !body?.owner_email || !body?.plan_id) {
    return json({ error: "Business name, plan and owner email are required" }, 400);
  }
  const ownerEmail = String(body.owner_email).trim().toLowerCase();
  const redirectTo = typeof body.redirect_to === "string" ? body.redirect_to : undefined;

  const record: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) if (body[key] !== undefined && body[key] !== "") record[key] = body[key];
  record.owner_email = ownerEmail;
  if (typeof record.abn === "string") record.abn = (record.abn as string).replace(/\s/g, "");

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: subAccount, error: insertErr } = await admin
    .from("sub_accounts")
    .insert(record)
    .select()
    .single();
  if (insertErr) return json({ error: insertErr.message }, 400);

  const appMeta = { akus_role: "owner", akus_sub_account_id: subAccount.id };

  // Invite the owner. If they already have a login, attach them instead.
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(ownerEmail, {
    redirectTo,
    data: { full_name: body.owner_name ?? null },
  });

  let userId = invited?.user?.id;
  let inviteSent = !inviteErr;
  if (inviteErr) {
    const { data: existing } = await admin
      .from("profiles")
      .select("id, role")
      .eq("email", ownerEmail)
      .maybeSingle();
    if (!existing) {
      await admin.from("sub_accounts").delete().eq("id", subAccount.id);
      return json({ error: `Couldn't send the invite: ${inviteErr.message}` }, 400);
    }
    if (existing.role === "platform_admin") {
      await admin.from("sub_accounts").delete().eq("id", subAccount.id);
      return json({ error: "That email belongs to Akus staff" }, 400);
    }
    userId = existing.id;
    inviteSent = false;
  }

  // Role and tenant live in app_metadata (users can't edit it) and on the profile.
  await admin.auth.admin.updateUserById(userId!, { app_metadata: appMeta });
  const { error: profileErr } = await admin.from("profiles").upsert({
    id: userId,
    email: ownerEmail,
    full_name: body.owner_name ?? null,
    role: "owner",
    sub_account_id: subAccount.id,
  });
  if (profileErr) return json({ error: profileErr.message }, 400);

  return json({ sub_account: subAccount, invite_sent: inviteSent });
});
