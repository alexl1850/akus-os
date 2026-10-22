// Applies a sub-account's brand colour to the CSS variables Tailwind's
// `brand` colour reads from.

export const BRAND_SWATCHES = [
  "#F97316", "#EF4444", "#EAB308", "#22C55E", "#0EA5E9", "#2563EB", "#7C3AED", "#0F172A",
];

const DEFAULT_BRAND = "#F97316";

function readableTextOn(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.45 ? "#111827" : "#FFFFFF";
}

export function applyBrandColour(hex: string | null | undefined) {
  const colour = hex && /^#[0-9a-f]{6}$/i.test(hex) ? hex : DEFAULT_BRAND;
  const root = document.documentElement.style;
  root.setProperty("--brand", colour);
  root.setProperty("--brand-foreground", readableTextOn(colour));
  root.setProperty("--brand-soft", `${colour}1f`);
}
