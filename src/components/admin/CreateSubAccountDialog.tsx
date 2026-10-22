import { useState, type FormEvent } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { PlanId } from "@/integrations/supabase/types";
import { isValidAbn } from "@/lib/format";
import { TRADES } from "@/lib/trades";
import { cn } from "@/lib/utils";

const PLANS: { id: PlanId; name: string; price: string; blurb: string }[] = [
  { id: "starter", name: "Starter", price: "$97/mth", blurb: "Everything except the AI voice agent" },
  { id: "pro", name: "Pro", price: "$249/mth", blurb: "Everything, plus AI voice agent (200 mins)" },
];

const empty = {
  business_name: "",
  trade: "",
  abn: "",
  plan_id: "starter" as PlanId,
  owner_name: "",
  owner_mobile: "",
  owner_email: "",
  business_email: "",
  address: "",
  service_suburbs: "",
  google_review_url: "",
};

export function CreateSubAccountDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof empty>(key: K, value: (typeof empty)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.abn && !isValidAbn(form.abn)) {
      setError("That ABN doesn't look right. It should be 11 digits.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("create-sub-account", {
      body: {
        ...form,
        abn: form.abn.replace(/\s/g, ""),
        service_suburbs: form.service_suburbs
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        redirect_to: `${window.location.origin}/auth/callback?set_password=1`,
      },
    });
    setBusy(false);
    if (error || data?.error) {
      let message = data?.error ?? error?.message ?? "Something went wrong";
      try {
        const body = await (error as { context?: Response })?.context?.json?.();
        if (body?.error) message = body.error;
      } catch {
        /* keep the generic message */
      }
      setError(message);
      return;
    }
    toast.success(
      data.invite_sent
        ? `${form.business_name} created. Invite sent to ${form.owner_email}.`
        : `${form.business_name} created and linked to the existing login for ${form.owner_email}.`,
    );
    setForm(empty);
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-tap bg-orange-500 px-5 text-base font-semibold hover:bg-orange-600">
          <Plus className="h-5 w-5" /> Create sub-account
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">New sub-account</DialogTitle>
          <DialogDescription>
            We'll set up the business with a standard pipeline and email the owner an invite to log in.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          <section className="space-y-3">
            <h3 className="font-semibold">Business</h3>
            <Field label="Business name" required>
              <Input className="h-12" value={form.business_name} onChange={(e) => set("business_name", e.target.value)} required />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Trade">
                <Select value={form.trade} onValueChange={(v) => set("trade", v)}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Pick a trade" /></SelectTrigger>
                  <SelectContent>
                    {TRADES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="ABN">
                <Input className="h-12" inputMode="numeric" placeholder="11 digits" value={form.abn} onChange={(e) => set("abn", e.target.value)} />
              </Field>
            </div>
            <Field label="Business email">
              <Input className="h-12" type="email" value={form.business_email} onChange={(e) => set("business_email", e.target.value)} />
            </Field>
            <Field label="Address">
              <Input className="h-12" placeholder="Street, suburb, state, postcode" value={form.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
            <Field label="Suburbs they service" hint="Separate with commas, e.g. Wollongong, Fairy Meadow, Corrimal">
              <Input className="h-12" value={form.service_suburbs} onChange={(e) => set("service_suburbs", e.target.value)} />
            </Field>
            <Field label="Google review link">
              <Input className="h-12" type="url" placeholder="https://g.page/r/..." value={form.google_review_url} onChange={(e) => set("google_review_url", e.target.value)} />
            </Field>
          </section>

          <section className="space-y-3">
            <h3 className="font-semibold">Plan</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {PLANS.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => set("plan_id", p.id)}
                  className={cn(
                    "rounded-2xl border-2 p-4 text-left transition-colors",
                    form.plan_id === p.id ? "border-orange-500 bg-orange-50" : "border-border hover:border-orange-300",
                  )}
                  aria-pressed={form.plan_id === p.id}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-sm font-medium">{p.price}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{p.blurb}</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Prices in AUD, including GST.</p>
          </section>

          <section className="space-y-3">
            <h3 className="font-semibold">Owner</h3>
            <Field label="Owner name">
              <Input className="h-12" autoComplete="off" value={form.owner_name} onChange={(e) => set("owner_name", e.target.value)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Owner mobile">
                <Input className="h-12" type="tel" inputMode="tel" placeholder="04xx xxx xxx" value={form.owner_mobile} onChange={(e) => set("owner_mobile", e.target.value)} />
              </Field>
              <Field label="Owner email" required hint="The login invite goes here">
                <Input className="h-12" type="email" autoComplete="off" value={form.owner_email} onChange={(e) => set("owner_email", e.target.value)} required />
              </Field>
            </div>
          </section>

          {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive">{error}</p>}

          <Button type="submit" disabled={busy} className="h-tap w-full bg-orange-500 text-lg font-semibold hover:bg-orange-600">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create and send invite"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
