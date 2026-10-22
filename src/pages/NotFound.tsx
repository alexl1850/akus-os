import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="text-muted-foreground">That page doesn't exist. Let's get you back on track.</p>
      <Button asChild className="h-tap px-8 text-base">
        <Link to="/">Go home</Link>
      </Button>
    </div>
  );
}
