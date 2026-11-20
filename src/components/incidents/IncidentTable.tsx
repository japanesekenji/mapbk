import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { SeverityDot, StatusChip } from "@/components/incidents/StatusChip";
import { CATEGORY_ICON, SEVERITY_META } from "@/lib/taxonomy";
import { timeAgo } from "@/lib/time";
import type { IncidentPublic } from "@/lib/types";

const GRID = "grid grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_120px_120px_130px_130px_24px] items-center gap-4 px-6";

/** T083: desktop incident table (handoff 1b). */
export function IncidentTable({ rows }: { rows: IncidentPublic[] }) {
  return (
    <div role="table" aria-label="Incidents">
      <div role="row" className={`${GRID} h-11 text-[12px] font-bold uppercase tracking-[.07em] text-[#627266]`}>
        {["Incident", "Category", "Severity", "Status", "Reported", "Corroborated", ""].map((h, i) => (
          <span role="columnheader" key={i}>{h}</span>
        ))}
      </div>
      {rows.map((r) => {
        const color = SEVERITY_META[r.severity].color;
        return (
          <Link key={r.id} href={`/incidents/${r.id}`} role="row" className={`${GRID} h-[62px] border-t border-divider hover:bg-hover`}>
            <span role="cell" className="flex min-w-0 items-center gap-3">
              <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}1f`, color }}>
                <Icon name={CATEGORY_ICON[r.category_id] ?? "alert"} size={19} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[14.5px] font-semibold text-ink">{r.title}</span>
                <span className="block truncate text-[12.5px] text-text-2">{r.place_name}</span>
              </span>
            </span>
            <span role="cell" className="truncate text-[13.5px] text-text-3">{r.category_label}</span>
            <span role="cell"><SeverityDot severity={r.severity} /></span>
            <span role="cell"><StatusChip status={r.status} compact /></span>
            <span role="cell" className="text-[13.5px] text-text-3">{timeAgo(r.reported_at)}</span>
            <span role="cell" className="flex items-center gap-1.5 text-[13.5px] text-text-3">
              <Icon name="people" size={16} /> {r.corroboration_count}
            </span>
            <span role="cell" className="text-muted"><Icon name="chevr" size={18} /></span>
          </Link>
        );
      })}
    </div>
  );
}

/** Mobile incident card (handoff mobile screen 2). */
export function IncidentCardMobile({ r }: { r: IncidentPublic }) {
  const color = SEVERITY_META[r.severity].color;
  return (
    <Link href={`/incidents/${r.id}`} className="flex gap-3 rounded-[18px] border border-line bg-white p-3.5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}1f`, color }}>
        <Icon name={CATEGORY_ICON[r.category_id] ?? "alert"} size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold leading-snug text-ink">{r.title}</span>
        <span className="block truncate text-[12.5px] text-text-2">
          {r.place_name} · {timeAgo(r.reported_at)}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-3">
          <SeverityDot severity={r.severity} />
          <StatusChip status={r.status} compact />
          <span className="flex items-center gap-1 text-[12.5px] text-text-3">
            <Icon name="people" size={14} /> {r.corroboration_count}
          </span>
        </span>
      </span>
    </Link>
  );
}
