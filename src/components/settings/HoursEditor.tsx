import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { DAYS, type BusinessHours, type Day } from "@/integrations/supabase/types";

const DAY_LABEL: Record<Day, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export function HoursEditor({ value, onChange, disabled }: { value: BusinessHours; onChange: (v: BusinessHours) => void; disabled?: boolean }) {
  const update = (day: Day, patch: Partial<BusinessHours[Day]>) => onChange({ ...value, [day]: { ...value[day], ...patch } });

  return (
    <ul className="divide-y">
      {DAYS.map((day) => {
        const h = value[day] ?? { open: "07:00", close: "17:00", closed: true };
        return (
          <li key={day} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
            <label className="flex min-w-[9rem] flex-1 items-center gap-3">
              <Switch
                checked={!h.closed}
                onCheckedChange={(open) => update(day, { closed: !open })}
                disabled={disabled}
                aria-label={`Open on ${DAY_LABEL[day]}`}
              />
              <span className="text-base font-medium">{DAY_LABEL[day]}</span>
            </label>
            {h.closed ? (
              <span className="text-muted-foreground">Closed</span>
            ) : (
              <div className="flex items-center gap-2">
                <Input type="time" className="h-12 w-[7.5rem]" value={h.open} disabled={disabled} onChange={(e) => update(day, { open: e.target.value })} aria-label={`${DAY_LABEL[day]} opening time`} />
                <span className="text-muted-foreground">to</span>
                <Input type="time" className="h-12 w-[7.5rem]" value={h.close} disabled={disabled} onChange={(e) => update(day, { close: e.target.value })} aria-label={`${DAY_LABEL[day]} closing time`} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
