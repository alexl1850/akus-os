import type { SubAccountStatus } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

const STYLES: Record<SubAccountStatus, string> = {
  active: "bg-green-100 text-green-800",
  paused: "bg-amber-100 text-amber-800",
  cancelled: "bg-gray-200 text-gray-700",
};

const LABELS: Record<SubAccountStatus, string> = { active: "Active", paused: "Paused", cancelled: "Cancelled" };

export function StatusBadge({ status }: { status: SubAccountStatus }) {
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", STYLES[status])}>{LABELS[status]}</span>;
}
