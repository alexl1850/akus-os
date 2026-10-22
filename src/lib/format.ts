// Australian formatting helpers: AUD, GST 10%, Australia/Sydney time.

export const TIMEZONE = "Australia/Sydney";
export const GST_RATE = 0.1;

const aud = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });
const audWhole = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});

export function formatAUD(amount: number | null | undefined, opts: { whole?: boolean } = {}) {
  const n = Number(amount ?? 0);
  return (opts.whole ? audWhole : aud).format(n);
}

/** GST component of a GST-inclusive amount. */
export function gstFromInclusive(inclusive: number) {
  return Math.round((inclusive / (1 + GST_RATE)) * GST_RATE * 100) / 100;
}

/** Add GST to an ex-GST amount. */
export function addGst(exclusive: number) {
  return Math.round(exclusive * (1 + GST_RATE) * 100) / 100;
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

/** "2 days ago" style, falling back to a date after a week. */
export function formatRelative(value: string | Date | null | undefined) {
  if (!value) return "";
  const then = new Date(value).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return days === 1 ? "yesterday" : `${days} days ago`;
  return formatDate(value);
}

export function formatAbn(abn: string | null | undefined) {
  const d = (abn ?? "").replace(/\D/g, "");
  if (d.length !== 11) return abn ?? "";
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
}

/** Official ABN checksum (ATO algorithm). */
export function isValidAbn(abn: string) {
  const d = abn.replace(/\D/g, "");
  if (d.length !== 11) return false;
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const digits = d.split("").map(Number);
  digits[0] -= 1;
  const sum = digits.reduce((acc, n, i) => acc + n * weights[i], 0);
  return sum % 89 === 0;
}

export function fullName(c: { first_name: string | null; last_name: string | null }) {
  return [c.first_name, c.last_name].filter(Boolean).join(" ") || "No name";
}

export function initials(name: string | null | undefined) {
  return (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
