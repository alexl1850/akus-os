import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, Mail, KeyRound, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AkusLogo } from "@/components/AkusLogo";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const callbackUrl = (setPassword = false) =>
  `${window.location.origin}/auth/callback${setPassword ? "?set_password=1" : ""}`;

export default function Login() {
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sentKind, setSentKind] = useState<"magic" | "reset">("magic");

  if (!loading && session) return <Navigate to="/" replace />;

  const signInWithPassword = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.message === "Invalid login credentials" ? "That email and password don't match." : error.message);
  };

  const sendMagicLink = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: callbackUrl() },
    });
    setBusy(false);
    if (error) {
      setError(
        error.message.includes("Signups not allowed")
          ? "We couldn't find an account with that email. Check with your Akus contact."
          : error.message,
      );
      return;
    }
    setSentKind("magic");
    setSentTo(email.trim());
  };

  const sendReset = async () => {
    if (!email.trim()) {
      setError("Type your email first, then tap “Forgot password”.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: callbackUrl(true) });
    setBusy(false);
    if (error) return setError(error.message);
    setSentKind("reset");
    setSentTo(email.trim());
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#1a2236] px-4 py-10 sm:items-center sm:justify-center">
      <div className="mx-auto w-full max-w-md">
        <AkusLogo light className="mb-8 justify-center" />
        <div className="rounded-3xl bg-card p-6 shadow-xl sm:p-8">
          {sentTo ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
              <h1 className="text-2xl font-bold">Check your email</h1>
              <p className="text-muted-foreground">
                We've sent a {sentKind === "magic" ? "sign-in link" : "password reset link"} to{" "}
                <strong className="text-foreground">{sentTo}</strong>. Open it on this phone to log in.
              </p>
              <Button variant="outline" className="h-tap w-full text-base" onClick={() => setSentTo(null)}>
                Back to log in
              </Button>
            </div>
          ) : (
            <>
              <h1 className="mb-1 text-2xl font-bold">G'day, welcome back</h1>
              <p className="mb-6 text-muted-foreground">Log in to see your leads and jobs.</p>

              {!supabaseConfigured && (
                <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                  Supabase isn't connected yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.
                </p>
              )}

              <Tabs defaultValue="password">
                <TabsList className="mb-6 grid h-tap w-full grid-cols-2">
                  <TabsTrigger value="password" className="h-full text-base">
                    <KeyRound className="mr-2 h-4 w-4" /> Password
                  </TabsTrigger>
                  <TabsTrigger value="magic" className="h-full text-base">
                    <Mail className="mr-2 h-4 w-4" /> Email me a link
                  </TabsTrigger>
                </TabsList>

                <div className="mb-4 space-y-2">
                  <Label htmlFor="email" className="text-base">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@yourbusiness.com.au"
                    className="h-tap text-base"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <TabsContent value="password" className="mt-0">
                  <form onSubmit={signInWithPassword} className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-base">Password</Label>
                        <button type="button" onClick={sendReset} className="text-sm font-medium text-orange-600 underline-offset-4 hover:underline">
                          Forgot password?
                        </button>
                      </div>
                      <Input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        className="h-tap text-base"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                    <Button type="submit" disabled={busy || !email} className="h-tap w-full bg-orange-500 text-lg font-semibold hover:bg-orange-600">
                      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Log in"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="magic" className="mt-0">
                  <form onSubmit={sendMagicLink} className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      No password needed. We'll email you a link that logs you straight in.
                    </p>
                    {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                    <Button type="submit" disabled={busy || !email} className="h-tap w-full bg-orange-500 text-lg font-semibold hover:bg-orange-600">
                      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send me a link"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
