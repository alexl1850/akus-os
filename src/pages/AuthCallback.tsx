import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AkusLogo } from "@/components/AkusLogo";
import { FullPageSpinner } from "@/components/FullPageSpinner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

/**
 * Landing page for magic links, invites and password resets.
 * Invites and resets carry ?set_password=1 so the user picks a password.
 */
export default function AuthCallback() {
  const { session, loading } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const errorDescription = params.get("error_description") ?? new URLSearchParams(window.location.hash.slice(1)).get("error_description");

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, []);

  if (errorDescription) {
    return (
      <Centered>
        <h1 className="text-2xl font-bold">That link didn't work</h1>
        <p className="text-muted-foreground">{errorDescription}. Links expire after an hour, so try sending a new one.</p>
        <Button className="h-tap w-full text-base" onClick={() => navigate("/login")}>Back to log in</Button>
      </Centered>
    );
  }

  if (loading || (!session && !timedOut)) return <FullPageSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (params.get("set_password") !== "1") return <Navigate to="/" replace />;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password saved. You're all set.");
    navigate("/", { replace: true });
  };

  return (
    <Centered>
      <h1 className="text-2xl font-bold">Choose a password</h1>
      <p className="text-muted-foreground">You'll use this with {session.user.email} to log in next time.</p>
      <form onSubmit={save} className="space-y-4 text-left">
        <div className="space-y-2">
          <Label htmlFor="new-password" className="text-base">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            className="h-tap text-base"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <p className="text-sm text-muted-foreground">At least 8 characters.</p>
        </div>
        <Button type="submit" disabled={busy || password.length < 8} className="h-tap w-full bg-orange-500 text-lg font-semibold hover:bg-orange-600">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save and continue"}
        </Button>
        <Button type="button" variant="ghost" className="h-tap w-full text-base" onClick={() => navigate("/", { replace: true })}>
          Skip for now
        </Button>
      </form>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#1a2236] px-4 py-10 sm:items-center sm:justify-center">
      <div className="mx-auto w-full max-w-md">
        <AkusLogo light className="mb-8 justify-center" />
        <div className="space-y-4 rounded-3xl bg-card p-6 text-center shadow-xl sm:p-8">{children}</div>
      </div>
    </div>
  );
}
