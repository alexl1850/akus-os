import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export function NoAccess() {
  const { signOut, session } = useAuth();
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold">You're not linked to a business yet</h1>
      <p className="max-w-sm text-muted-foreground">
        You're signed in as {session?.user.email}, but this login isn't attached to a business. Ask the
        business owner or Akus support to invite you.
      </p>
      <Button className="h-tap px-8 text-base" variant="outline" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );
}
