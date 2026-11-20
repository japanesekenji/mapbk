import { SEVERITY_META, STATUS_META, type IncidentStatus, type Severity } from "@/lib/taxonomy";

/** Status chip. Pending reads "Pending · Unverified" so it never passes for confirmed (FR-027). */
export function StatusChip({ status, compact = false }: { status: IncidentStatus; compact?: boolean }) {
  const m = STATUS_META[status];
  return (
    <span
      className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold"
      style={{ background: m.bg, color: m.fg }}
      title={status === "pending" ? "Not yet verified by a moderator" : undefined}
    >
      {m.label}
      {status === "pending" && !compact && <span className="font-medium opacity-80">&nbsp;· Unverified</span>}
    </span>
  );
}

export function SeverityDot({ severity, withLabel = true }: { severity: Severity; withLabel?: boolean }) {
  const m = SEVERITY_META[severity];
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-text-4">
      <span className="h-[9px] w-[9px] shrink-0 rounded-full" style={{ background: m.color }} aria-hidden />
      {withLabel && m.label}
    </span>
  );
}
