import { Link } from "react-router-dom";
import { ChevronRight, Globe, LogOut, type LucideIcon, PhoneCall, Settings, Star, RefreshCw, Bot } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { useSubAccount } from "@/context/SubAccountContext";

export default function More() {
  const { signOut, profile } = useAuth();
  const { plan } = useSubAccount();

  return (
    <>
      <PageHeader title="More" />
      <div className="space-y-4 px-4 md:px-8">
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          <Row to="/app/settings" icon={Settings} label="Business settings" />
        </ul>

        <div>
          <p className="mb-2 px-1 text-sm font-medium text-muted-foreground">Coming soon</p>
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            <Row icon={PhoneCall} label="Missed-call text-back" />
            <Row icon={Bot} label="AI voice agent" note={plan?.ai_voice_enabled ? "Included in Pro" : "Pro plan"} />
            <Row icon={Star} label="Google reviews" />
            <Row icon={RefreshCw} label="Win back old customers" />
            <Row icon={Globe} label="Your website" />
          </ul>
        </div>

        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          <li>
            <button onClick={signOut} className="flex min-h-tap w-full items-center gap-4 px-4 py-3 text-left text-base font-medium text-destructive">
              <LogOut className="h-6 w-6" /> Sign out
              <span className="ml-auto truncate text-sm font-normal text-muted-foreground">{profile?.email}</span>
            </button>
          </li>
        </ul>
      </div>
    </>
  );
}

function Row({ to, icon: Icon, label, note }: { to?: string; icon: LucideIcon; label: string; note?: string }) {
  const content = (
    <>
      <Icon className="h-6 w-6 text-muted-foreground" />
      <span className="flex-1 text-base font-medium">{label}</span>
      {note && <span className="text-sm text-muted-foreground">{note}</span>}
      {to && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
    </>
  );
  return (
    <li>
      {to ? (
        <Link to={to} className="flex min-h-tap items-center gap-4 px-4 py-3 active:bg-muted">{content}</Link>
      ) : (
        <div className="flex min-h-tap items-center gap-4 px-4 py-3 opacity-60">{content}</div>
      )}
    </li>
  );
}
