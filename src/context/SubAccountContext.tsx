import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Plan, SubAccount } from "@/integrations/supabase/types";
import { applyBrandColour } from "@/lib/brand";
import { ENTERED_KEY, useAuth } from "./AuthContext";

interface SubAccountState {
  /** The sub-account being viewed: the user's own, or the one an admin entered. */
  subAccountId: string | null;
  subAccount: SubAccount | null;
  plan: Plan | null;
  loading: boolean;
  /** True when a platform admin is viewing someone else's sub-account. */
  viewingAsAdmin: boolean;
  canEditSettings: boolean;
  enter: (id: string) => void;
  exit: () => void;
  refresh: () => Promise<void>;
}

const SubAccountContext = createContext<SubAccountState | null>(null);

export function SubAccountProvider({ children }: { children: ReactNode }) {
  const { profile, isPlatformAdmin } = useAuth();
  const [enteredId, setEnteredId] = useState<string | null>(() => sessionStorage.getItem(ENTERED_KEY));
  const [subAccount, setSubAccount] = useState<SubAccount | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);

  const subAccountId = isPlatformAdmin ? enteredId : profile?.sub_account_id ?? null;

  const refresh = useCallback(async () => {
    if (!subAccountId) {
      setSubAccount(null);
      setPlan(null);
      applyBrandColour(null);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("sub_accounts")
      .select("*, plan:plans(*)")
      .eq("id", subAccountId)
      .maybeSingle();
    if (data) {
      const { plan: p, ...rest } = data as SubAccount & { plan: Plan };
      setSubAccount(rest);
      setPlan(p);
      applyBrandColour(rest.brand_colour);
    } else {
      setSubAccount(null);
      setPlan(null);
    }
    setLoading(false);
  }, [subAccountId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value: SubAccountState = {
    subAccountId,
    subAccount,
    plan,
    loading,
    viewingAsAdmin: isPlatformAdmin && Boolean(enteredId),
    canEditSettings: isPlatformAdmin || profile?.role === "owner",
    enter: (id) => {
      sessionStorage.setItem(ENTERED_KEY, id);
      setEnteredId(id);
    },
    exit: () => {
      sessionStorage.removeItem(ENTERED_KEY);
      setEnteredId(null);
      applyBrandColour(null);
    },
    refresh,
  };

  return <SubAccountContext.Provider value={value}>{children}</SubAccountContext.Provider>;
}

export function useSubAccount() {
  const ctx = useContext(SubAccountContext);
  if (!ctx) throw new Error("useSubAccount must be used inside SubAccountProvider");
  return ctx;
}
