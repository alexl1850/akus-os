import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Phone, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shell/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import type { Contact, ContactSource, ContactStatus } from "@/integrations/supabase/types";
import { useSubAccount } from "@/context/SubAccountContext";
import { formatRelative, fullName, initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<ContactStatus, string> = {
  lead: "Lead",
  customer: "Customer",
  past_customer: "Past customer",
  lost: "Lost",
};

const STATUS_STYLE: Record<ContactStatus, string> = {
  lead: "bg-orange-100 text-orange-800",
  customer: "bg-green-100 text-green-800",
  past_customer: "bg-sky-100 text-sky-800",
  lost: "bg-gray-200 text-gray-700",
};

export const SOURCE_LABEL: Record<ContactSource, string> = {
  website: "Website",
  missed_call: "Missed call",
  ai_voice: "AI voice",
  import: "Imported",
  manual: "Added by you",
};

const FILTERS: { value: ContactStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "lead", label: "Leads" },
  { value: "customer", label: "Customers" },
  { value: "past_customer", label: "Past" },
  { value: "lost", label: "Lost" },
];

export default function Contacts() {
  const { subAccountId } = useSubAccount();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ContactStatus | "all">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["contacts", subAccountId],
    enabled: Boolean(subAccountId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("sub_account_id", subAccountId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Contact[];
    },
  });

  const contacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter(
      (c) =>
        (filter === "all" || c.status === filter) &&
        (!q || [fullName(c), c.phone, c.email, c.suburb].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [data, search, filter]);

  return (
    <>
      <PageHeader title="Contacts" subtitle={data ? `${data.length} people` : undefined} />
      <div className="space-y-3 px-4 md:px-8">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-tap rounded-2xl pl-12 text-base"
            placeholder="Search name, phone or suburb"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "h-11 shrink-0 rounded-full border px-5 text-base font-medium",
                filter === f.value ? "border-brand bg-brand text-brand-foreground" : "bg-card",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="p-4"><Skeleton className="h-12" /></li>
            ))}
          {contacts.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted font-semibold">
                {initials(fullName(c))}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold">{fullName(c)}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {[c.suburb, SOURCE_LABEL[c.source], formatRelative(c.created_at)].filter(Boolean).join(" · ")}
                </p>
                <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_STYLE[c.status])}>
                  {STATUS_LABEL[c.status]}
                </span>
              </div>
              {c.phone && (
                <a
                  href={`tel:${c.phone.replace(/\s/g, "")}`}
                  className="flex h-tap w-tap shrink-0 items-center justify-center rounded-full bg-green-600 text-white"
                  aria-label={`Call ${fullName(c)}`}
                >
                  <Phone className="h-6 w-6" />
                </a>
              )}
            </li>
          ))}
          {!isLoading && contacts.length === 0 && (
            <li className="p-8 text-center text-muted-foreground">No contacts match.</li>
          )}
        </ul>
      </div>
    </>
  );
}
