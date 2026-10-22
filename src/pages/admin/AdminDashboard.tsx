import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, LogOut, Search, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AkusLogo } from "@/components/AkusLogo";
import { CreateSubAccountDialog } from "@/components/admin/CreateSubAccountDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import type { PlatformOverviewRow } from "@/integrations/supabase/types";
import { useAuth } from "@/context/AuthContext";
import { useSubAccount } from "@/context/SubAccountContext";
import { formatAUD } from "@/lib/format";

const PLAN_PRICE: Record<string, number> = { starter: 97, pro: 249 };

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const { enter } = useSubAccount();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["platform_overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("platform_overview");
      if (error) throw error;
      return data as PlatformOverviewRow[];
    },
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter(
      (r) => !q || [r.business_name, r.trade, r.owner_name, r.owner_email].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [data, search]);

  const active = (data ?? []).filter((r) => r.status === "active");
  const totals = {
    accounts: data?.length ?? 0,
    active: active.length,
    leads: (data ?? []).reduce((s, r) => s + Number(r.leads_this_month), 0),
    mrr: active.reduce((s, r) => s + (PLAN_PRICE[r.plan_id] ?? 0), 0),
  };

  const enterAccount = (id: string) => {
    enter(id);
    navigate("/app/inbox");
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-20 bg-[#1a2236] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <AkusLogo light />
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-white/70 sm:inline">{profile?.email}</span>
            <Button variant="ghost" className="h-11 text-white hover:bg-white/10 hover:text-white" onClick={signOut}>
              <LogOut className="h-5 w-5" /> <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-orange-600">Platform admin</p>
            <h1 className="text-3xl font-bold">Sub-accounts</h1>
          </div>
          <CreateSubAccountDialog onCreated={() => refetch()} />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat icon={Building2} label="Businesses" value={totals.accounts} />
          <Stat icon={Users} label="Active" value={totals.active} />
          <Stat icon={TrendingUp} label="Leads this month" value={totals.leads} />
          <Stat icon={TrendingUp} label="Monthly revenue" value={formatAUD(totals.mrr, { whole: true })} />
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-tap rounded-2xl pl-12 text-base"
            placeholder="Search by business, trade or owner"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {error && <p className="rounded-xl bg-destructive/10 p-4 text-destructive">Couldn't load sub-accounts: {(error as Error).message}</p>}

        {/* Mobile: cards */}
        <div className="space-y-3 md:hidden">
          {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{r.business_name}</p>
                  <p className="truncate text-sm text-muted-foreground">{[r.trade, r.owner_name].filter(Boolean).join(" · ")}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div className="mt-3 flex items-center gap-3 text-sm">
                <Badge variant="secondary">{r.plan_name}</Badge>
                <span><strong>{r.leads_this_month}</strong> leads this month</span>
              </div>
              <Button className="mt-4 h-tap w-full text-base" onClick={() => enterAccount(r.id)}>
                Enter <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          ))}
        </div>

        {/* Desktop: table */}
        <div className="hidden overflow-hidden rounded-2xl border bg-card md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Leads this month</TableHead>
                <TableHead className="text-right">Contacts</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6}><Skeleton className="h-10" /></TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <p className="font-semibold">{r.business_name}</p>
                    <p className="text-sm text-muted-foreground">{[r.trade, r.owner_name, r.owner_email].filter(Boolean).join(" · ")}</p>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{r.plan_name}</Badge></TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-right text-lg font-semibold">{r.leads_this_month}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{r.contacts_total}</TableCell>
                  <TableCell className="text-right">
                    <Button className="h-11" onClick={() => enterAccount(r.id)}>
                      Enter <ArrowRight className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {!isLoading && rows.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">
            {search ? "No businesses match that search." : "No sub-accounts yet. Create the first one above."}
          </p>
        )}
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
