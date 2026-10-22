import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Eye, LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AkusLogo } from "@/components/AkusLogo";
import { useAuth } from "@/context/AuthContext";
import { useSubAccount } from "@/context/SubAccountContext";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SIDEBAR, TABS } from "./nav";

export function AppShell() {
  const { subAccount, viewingAsAdmin, exit } = useSubAccount();
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  const leaveAdminView = () => {
    exit();
    navigate("/admin");
  };

  return (
    <div className="min-h-[100dvh] bg-background md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
          <BusinessMark />
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{subAccount?.business_name ?? "Loading…"}</p>
            <p className="truncate text-xs text-sidebar-foreground/70">{subAccount?.trade}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {SIDEBAR.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex h-12 items-center gap-3 rounded-xl px-4 text-base font-medium transition-colors",
                  isActive ? "bg-brand text-brand-foreground" : "hover:bg-sidebar-accent hover:text-white",
                )
              }
            >
              <Icon className="h-5 w-5" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 border-t border-sidebar-border p-3">
          <p className="truncate px-4 text-xs text-sidebar-foreground/60">{profile?.email}</p>
          <button
            onClick={signOut}
            className="flex h-12 w-full items-center gap-3 rounded-xl px-4 text-base font-medium hover:bg-sidebar-accent hover:text-white"
          >
            <LogOut className="h-5 w-5" /> Sign out
          </button>
          <AkusLogo light className="px-4 pt-2 opacity-60 [&_span]:text-sm [&>span:first-child]:h-6 [&>span:first-child]:w-6" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {viewingAsAdmin && (
          <div className="sticky top-0 z-30 flex items-center justify-between gap-2 bg-amber-400 px-4 py-2 text-sm font-medium text-amber-950">
            <span className="flex min-w-0 items-center gap-2">
              <Eye className="h-4 w-4 shrink-0" />
              <span className="truncate">Viewing {subAccount?.business_name} as Akus admin</span>
            </span>
            <Button size="sm" variant="ghost" className="h-9 shrink-0 hover:bg-amber-300" onClick={leaveAdminView}>
              <X className="h-4 w-4" /> Exit
            </Button>
          </div>
        )}

        {/* Mobile top bar */}
        <header className="flex items-center gap-3 border-b bg-card px-4 py-3 md:hidden">
          <BusinessMark />
          <p className="truncate text-lg font-semibold">{subAccount?.business_name ?? "Loading…"}</p>
        </header>

        <main className="flex-1 pb-28 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-card md:hidden" aria-label="Main">
        <ul className="grid grid-cols-5">
          {TABS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium",
                    isActive ? "text-brand" : "text-muted-foreground",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={cn("flex h-8 w-14 items-center justify-center rounded-full", isActive && "bg-brand-soft")}>
                      <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function BusinessMark() {
  const { subAccount } = useSubAccount();
  if (subAccount?.logo_url) {
    return <img src={subAccount.logo_url} alt="" className="h-10 w-10 shrink-0 rounded-xl bg-white object-contain" />;
  }
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand font-bold text-brand-foreground">
      {initials(subAccount?.business_name) || "…"}
    </span>
  );
}
