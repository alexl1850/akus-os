import { Loader2 } from "lucide-react";

export function FullPageSpinner() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
    </div>
  );
}
