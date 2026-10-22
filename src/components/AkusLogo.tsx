import { cn } from "@/lib/utils";

export function AkusLogo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 font-bold tracking-tight", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-lg text-white">A</span>
      <span className={cn("text-xl", light ? "text-white" : "text-foreground")}>
        Akus <span className="text-orange-500">OS</span>
      </span>
    </div>
  );
}
