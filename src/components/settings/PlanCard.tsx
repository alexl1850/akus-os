import { useQuery } from "@tanstack/react-query";
import { Bot, Check, Lock, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import type { Plan, UsageEvent } from "@/integrations/supabase/types";
import { formatAUD, TIMEZONE } from "@/lib/format";

function monthStartSydney() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit" }).format(new Date());
  return `${parts}-01`; // en-CA gives YYYY-MM
}

export function PlanCard({ plan, subAccountId }: { plan: Plan; subAccountId: string }) {
  const { data: usage } = useQuery({
    queryKey: ["usage", subAccountId, monthStartSydney()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usage_events")
        .select("kind, quantity")
        .eq("sub_account_id", subAccountId)
        .gte("date", monthStartSydney());
      if (error) throw error;
      const totals = { sms: 0, email: 0, ai_voice_minutes: 0 };
      for (const e of data as Pick<UsageEvent, "kind" | "quantity">[]) totals[e.kind] += Number(e.quantity);
      return totals;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-bold">{plan.name}</p>
          <p className="text-muted-foreground">{formatAUD(plan.price_monthly, { whole: true })} a month, inc. GST</p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          <Lock className="h-3 w-3" /> Managed by Akus
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-muted/60 p-3">
        <Bot className="h-5 w-5" />
        <span className="flex-1 font-medium">AI voice agent</span>
        {plan.ai_voice_enabled ? (
          <span className="flex items-center gap-1 text-green-700"><Check className="h-4 w-4" /> {plan.ai_voice_minutes} mins/mth</span>
        ) : (
          <span className="flex items-center gap-1 text-muted-foreground"><X className="h-4 w-4" /> Not on Starter</span>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Used this month</p>
        <UsageBar label="Text messages" used={usage?.sms ?? 0} limit={plan.sms_limit} />
        <UsageBar label="Emails" used={usage?.email ?? 0} limit={plan.email_limit} />
        {plan.ai_voice_enabled && <UsageBar label="AI voice minutes" used={usage?.ai_voice_minutes ?? 0} limit={plan.ai_voice_minutes} />}
      </div>

      <p className="text-sm text-muted-foreground">Want to change plans? Give your Akus contact a bell.</p>
    </div>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {used.toLocaleString("en-AU")} of {limit.toLocaleString("en-AU")}
        </span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}
