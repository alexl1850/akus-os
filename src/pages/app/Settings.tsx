import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Lock, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shell/PageHeader";
import { HoursEditor } from "@/components/settings/HoursEditor";
import { PlanCard } from "@/components/settings/PlanCard";
import { supabase } from "@/integrations/supabase/client";
import type { SubAccount } from "@/integrations/supabase/types";
import { useSubAccount } from "@/context/SubAccountContext";
import { applyBrandColour, BRAND_SWATCHES } from "@/lib/brand";
import { formatAbn, initials, isValidAbn } from "@/lib/format";
import { TRADES } from "@/lib/trades";
import { cn } from "@/lib/utils";

type Editable = Pick<
  SubAccount,
  | "business_name"
  | "trade"
  | "abn"
  | "owner_name"
  | "owner_mobile"
  | "owner_email"
  | "business_email"
  | "address"
  | "service_suburbs"
  | "business_hours"
  | "google_review_url"
  | "brand_colour"
>;

const pickEditable = (s: SubAccount): Editable => ({
  business_name: s.business_name,
  trade: s.trade,
  abn: s.abn ? formatAbn(s.abn) : "",
  owner_name: s.owner_name,
  owner_mobile: s.owner_mobile,
  owner_email: s.owner_email,
  business_email: s.business_email,
  address: s.address,
  service_suburbs: s.service_suburbs ?? [],
  business_hours: s.business_hours,
  google_review_url: s.google_review_url,
  brand_colour: s.brand_colour,
});

export default function Settings() {
  const { subAccount, plan, canEditSettings, refresh } = useSubAccount();
  const [form, setForm] = useState<Editable | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newSuburb, setNewSuburb] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (subAccount) setForm(pickEditable(subAccount));
  }, [subAccount]);

  // Preview the brand colour live; put it back if they leave without saving.
  useEffect(() => {
    if (form) applyBrandColour(form.brand_colour);
  }, [form?.brand_colour]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => applyBrandColour(subAccountRef.current?.brand_colour), []);
  const subAccountRef = useRef(subAccount);
  subAccountRef.current = subAccount;

  if (!subAccount || !form || !plan) {
    return (
      <div className="space-y-4 p-4 md:p-8">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const readOnly = !canEditSettings;
  const set = <K extends keyof Editable>(key: K, value: Editable[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));
  const dirty = JSON.stringify(form) !== JSON.stringify(pickEditable(subAccount));

  const addSuburb = () => {
    const s = newSuburb.trim();
    if (!s || form.service_suburbs.some((x) => x.toLowerCase() === s.toLowerCase())) return setNewSuburb("");
    set("service_suburbs", [...form.service_suburbs, s]);
    setNewSuburb("");
  };

  const save = async () => {
    const abn = (form.abn ?? "").replace(/\s/g, "");
    if (abn && !isValidAbn(abn)) return toast.error("That ABN doesn't look right. It should be 11 digits.");
    if (!form.business_name.trim()) return toast.error("Business name can't be empty.");
    setSaving(true);
    const { error } = await supabase
      .from("sub_accounts")
      .update({ ...form, abn: abn || null, google_review_url: form.google_review_url || null })
      .eq("id", subAccount.id);
    setSaving(false);
    if (error) return toast.error(`Couldn't save: ${error.message}`);
    toast.success("Saved");
    await refresh();
  };

  const uploadLogo = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Pick an image file (PNG, JPG or SVG).");
    if (file.size > 2 * 1024 * 1024) return toast.error("That logo is over 2 MB. Try a smaller one.");
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${subAccount.id}/logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("logos").upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setUploading(false);
      return toast.error(`Upload failed: ${upErr.message}`);
    }
    const { data } = supabase.storage.from("logos").getPublicUrl(path);
    const { error } = await supabase.from("sub_accounts").update({ logo_url: data.publicUrl }).eq("id", subAccount.id);
    setUploading(false);
    if (error) return toast.error(`Couldn't save logo: ${error.message}`);
    toast.success("Logo updated");
    await refresh();
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="How your business shows up to customers" />

      <div className="mx-auto max-w-3xl space-y-4 px-4 md:px-8">
        {readOnly && (
          <p className="flex items-center gap-2 rounded-2xl bg-muted p-4 text-sm">
            <Lock className="h-4 w-4" /> Only the business owner can change these settings.
          </p>
        )}

        <Card title="Logo and colour">
          <div className="flex items-center gap-4">
            {subAccount.logo_url ? (
              <img src={subAccount.logo_url} alt="Business logo" className="h-20 w-20 rounded-2xl border bg-white object-contain" />
            ) : (
              <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand text-2xl font-bold text-brand-foreground">
                {initials(subAccount.business_name)}
              </span>
            )}
            <div>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadLogo(f);
                  e.target.value = "";
                }}
              />
              <Button variant="outline" className="h-tap text-base" disabled={readOnly || uploading} onClick={() => fileInput.current?.click()}>
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                {subAccount.logo_url ? "Change logo" : "Upload logo"}
              </Button>
              <p className="mt-1 text-sm text-muted-foreground">PNG or JPG, up to 2 MB</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-base">Brand colour</Label>
            <div className="flex flex-wrap items-center gap-3">
              {BRAND_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={readOnly}
                  onClick={() => set("brand_colour", c)}
                  className={cn(
                    "h-12 w-12 rounded-full border-4 transition-transform",
                    form.brand_colour.toLowerCase() === c.toLowerCase() ? "scale-110 border-foreground" : "border-transparent",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Use colour ${c}`}
                />
              ))}
              <label className="flex h-12 items-center gap-2 rounded-full border px-3 text-sm">
                <input
                  type="color"
                  disabled={readOnly}
                  value={form.brand_colour}
                  onChange={(e) => set("brand_colour", e.target.value.toUpperCase())}
                  className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
                />
                Custom
              </label>
            </div>
          </div>
        </Card>

        <Card title="Business details">
          <Field label="Business name">
            <Input className="h-12" value={form.business_name} disabled={readOnly} onChange={(e) => set("business_name", e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Trade">
              <Input className="h-12" list="trades" value={form.trade ?? ""} disabled={readOnly} onChange={(e) => set("trade", e.target.value)} />
              <datalist id="trades">{TRADES.map((t) => <option key={t} value={t} />)}</datalist>
            </Field>
            <Field label="ABN">
              <Input className="h-12" inputMode="numeric" value={form.abn ?? ""} disabled={readOnly} onChange={(e) => set("abn", e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Owner name">
              <Input className="h-12" value={form.owner_name ?? ""} disabled={readOnly} onChange={(e) => set("owner_name", e.target.value)} />
            </Field>
            <Field label="Owner mobile">
              <Input className="h-12" type="tel" inputMode="tel" value={form.owner_mobile ?? ""} disabled={readOnly} onChange={(e) => set("owner_mobile", e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Owner email">
              <Input className="h-12" type="email" value={form.owner_email ?? ""} disabled={readOnly} onChange={(e) => set("owner_email", e.target.value)} />
            </Field>
            <Field label="Business email" hint="Where customer enquiries go">
              <Input className="h-12" type="email" value={form.business_email ?? ""} disabled={readOnly} onChange={(e) => set("business_email", e.target.value)} />
            </Field>
          </div>
          <Field label="Address">
            <Input className="h-12" value={form.address ?? ""} disabled={readOnly} onChange={(e) => set("address", e.target.value)} />
          </Field>
          <Field label="Suburbs you service">
            <div className="flex flex-wrap gap-2">
              {form.service_suburbs.map((s) => (
                <span key={s} className="flex h-10 items-center gap-1 rounded-full bg-muted pl-4 pr-1 text-sm font-medium">
                  {s}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => set("service_suburbs", form.service_suburbs.filter((x) => x !== s))}
                      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-background"
                      aria-label={`Remove ${s}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </span>
              ))}
            </div>
            {!readOnly && (
              <div className="flex gap-2 pt-1">
                <Input
                  className="h-12"
                  placeholder="Add a suburb"
                  value={newSuburb}
                  onChange={(e) => setNewSuburb(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSuburb();
                    }
                  }}
                />
                <Button type="button" variant="outline" className="h-12 w-12 shrink-0 p-0" onClick={addSuburb} aria-label="Add suburb">
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            )}
          </Field>
        </Card>

        <Card title="Google reviews">
          <Field label="Your Google review link" hint="We'll send this to happy customers after a job.">
            <Input
              className="h-12"
              type="url"
              placeholder="https://g.page/r/..."
              value={form.google_review_url ?? ""}
              disabled={readOnly}
              onChange={(e) => set("google_review_url", e.target.value)}
            />
          </Field>
        </Card>

        <Card title="Business hours" subtitle="Calls outside these hours get an automatic text back.">
          <HoursEditor value={form.business_hours} onChange={(v) => set("business_hours", v)} disabled={readOnly} />
        </Card>

        <Card title="Your plan">
          <PlanCard plan={plan} subAccountId={subAccount.id} />
        </Card>
      </div>

      {!readOnly && dirty && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-card/95 p-3 backdrop-blur md:bottom-0 md:left-64">
          <div className="mx-auto flex max-w-3xl gap-2">
            <Button variant="outline" className="h-tap flex-1 text-base" onClick={() => setForm(pickEditable(subAccount))} disabled={saving}>
              Undo
            </Button>
            <Button className="h-tap flex-[2] bg-brand text-lg font-semibold text-brand-foreground hover:opacity-90" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save changes"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
