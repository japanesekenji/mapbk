/** Times are stored in UTC and shown in Philippine Time (UTC+8, no daylight saving). */
const PHT = "Asia/Manila";

export type TimeRange = "1h" | "24h" | "7d" | "30d";

export const TIME_RANGES: { key: TimeRange; label: string; ms: number }[] = [
  { key: "1h", label: "Last hour", ms: 3_600_000 },
  { key: "24h", label: "24 hours", ms: 86_400_000 },
  { key: "7d", label: "7 days", ms: 7 * 86_400_000 },
  { key: "30d", label: "30 days", ms: 30 * 86_400_000 },
];

export function rangeStart(range: TimeRange, now = Date.now()): string {
  const r = TIME_RANGES.find((t) => t.key === range) ?? TIME_RANGES[1];
  return new Date(now - r.ms).toISOString();
}

/** "Nov 21, 2026, 11:12 AM" in Philippine Time. */
export function formatPht(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: PHT,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(typeof iso === "string" ? new Date(iso) : iso);
}

/** "just now", "18 min ago", "2 hr ago", "3 days ago", then a PHT date. */
export function timeAgo(iso: string | Date, now = Date.now()): string {
  const t = typeof iso === "string" ? Date.parse(iso) : iso.getTime();
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  if (d < 14) return `${d} day${d === 1 ? "" : "s"} ago`;
  return formatPht(new Date(t));
}

/** True when a timestamp is older than the given number of hours (facility staleness, FR-037). */
export function isOlderThan(iso: string | null, hours: number, now = Date.now()): boolean {
  if (!iso) return true;
  return now - Date.parse(iso) > hours * 3_600_000;
}
