import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shell/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import type { Opportunity, PipelineStage } from "@/integrations/supabase/types";
import { useSubAccount } from "@/context/SubAccountContext";
import { formatAUD } from "@/lib/format";
import { cn } from "@/lib/utils";

type OpportunityWithContact = Opportunity & { contact: { first_name: string | null; last_name: string | null; suburb: string | null } | null };

export default function Pipeline() {
  const { subAccountId } = useSubAccount();

  const { data, isLoading } = useQuery({
    queryKey: ["pipeline", subAccountId],
    enabled: Boolean(subAccountId),
    queryFn: async () => {
      const [stages, opps] = await Promise.all([
        supabase.from("pipeline_stages").select("*").eq("sub_account_id", subAccountId!).order("position"),
        supabase
          .from("opportunities")
          .select("*, contact:contacts(first_name, last_name, suburb)")
          .eq("sub_account_id", subAccountId!)
          .order("created_at", { ascending: false }),
      ]);
      if (stages.error) throw stages.error;
      if (opps.error) throw opps.error;
      return { stages: stages.data as PipelineStage[], opps: opps.data as OpportunityWithContact[] };
    },
  });

  const openValue = (data?.opps ?? [])
    .filter((o) => {
      const s = data?.stages.find((st) => st.id === o.stage_id);
      return s && !s.is_won && !s.is_lost;
    })
    .reduce((sum, o) => sum + Number(o.value), 0);

  return (
    <>
      <PageHeader title="Pipeline" subtitle={data ? `${formatAUD(openValue, { whole: true })} in open jobs (inc. GST)` : undefined} />
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 md:px-8">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 w-[80vw] shrink-0 rounded-2xl sm:w-72" />)}
        {data?.stages.map((stage) => {
          const items = data.opps.filter((o) => o.stage_id === stage.id);
          const total = items.reduce((s, o) => s + Number(o.value), 0);
          return (
            <section key={stage.id} className="flex w-[80vw] shrink-0 snap-start flex-col rounded-2xl bg-muted/70 p-3 sm:w-72">
              <header className="mb-3 flex items-baseline justify-between px-1">
                <h2
                  className={cn(
                    "text-base font-semibold",
                    stage.is_won && "text-green-700",
                    stage.is_lost && "text-muted-foreground",
                  )}
                >
                  {stage.name} <span className="font-normal text-muted-foreground">({items.length})</span>
                </h2>
                <span className="text-sm font-medium text-muted-foreground">{formatAUD(total, { whole: true })}</span>
              </header>
              <ul className="space-y-2">
                {items.map((o) => (
                  <li key={o.id} className="rounded-xl border bg-card p-3 shadow-sm">
                    <p className="font-medium leading-snug">{o.title}</p>
                    <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                      <span>{o.contact?.suburb}</span>
                      <span className="font-semibold text-foreground">{formatAUD(o.value, { whole: true })}</span>
                    </div>
                  </li>
                ))}
                {items.length === 0 && <li className="px-1 py-6 text-center text-sm text-muted-foreground">Nothing here yet</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
