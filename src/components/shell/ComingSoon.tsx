import type { LucideIcon } from "lucide-react";

export function ComingSoon({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="mx-4 flex flex-col items-center rounded-3xl border border-dashed bg-card px-6 py-14 text-center md:mx-8">
      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <Icon className="h-8 w-8" />
      </span>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-sm text-muted-foreground">{children}</p>
    </div>
  );
}
