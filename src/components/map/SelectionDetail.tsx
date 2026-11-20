"use client";

import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { CorroborateButton } from "@/components/incidents/CorroborateButton";
import { StatusChip } from "@/components/incidents/StatusChip";
import { VerificationBar } from "@/components/incidents/VerificationBar";
import { directionsUrl } from "@/lib/geo";
import {
  CATEGORY_ICON,
  FACILITY_COLOR,
  FACILITY_META,
  FACILITY_STATUS_META,
  SEVERITY_META,
} from "@/lib/taxonomy";
import { timeAgo } from "@/lib/time";
import type { Selection } from "@/lib/types";

export type CorroborationProps = {
  active: boolean;
  count: number;
  onToggle?: () => void;
  busy?: boolean;
  hint?: string;
};

/**
 * Body of the map detail card (desktop) and bottom sheet (mobile), T037. Incidents show status,
 * verification progress and Corroborate; facilities show operating status and staleness.
 */
export function SelectionDetail({
  selection,
  corroboration,
  distanceLabel,
}: {
  selection: Selection;
  corroboration?: CorroborationProps;
  distanceLabel?: string;
}) {
  if (selection.kind === "facility") return <FacilityDetail selection={selection} distanceLabel={distanceLabel} />;
  const it = selection.item;
  const color = SEVERITY_META[it.severity].color;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-white"
          style={{ background: color }}
        >
          <Icon name={CATEGORY_ICON[it.category_id] ?? "alert"} size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <Link href={`/incidents/${it.id}`} className="font-display block text-[17px] font-bold leading-snug text-ink hover:underline">
            {it.title}
          </Link>
          <p className="text-[13px] text-text-2">
            {it.place_name ?? it.category_label} · {timeAgo(it.reported_at)}
            {distanceLabel ? ` · ${distanceLabel}` : ""}
          </p>
        </div>
        <StatusChip status={it.status} compact />
      </div>
      <p className="text-[14px] leading-[1.45] text-body">{it.description}</p>
      <VerificationBar status={it.status} corroborations={corroboration?.count ?? it.corroboration_count} />
      <div className="grid grid-cols-2 gap-2">
        <CorroborateButton
          count={corroboration?.count ?? it.corroboration_count}
          active={corroboration?.active ?? false}
          onToggle={corroboration?.onToggle}
          busy={corroboration?.busy}
          hint={corroboration?.hint}
        />
        <DirectionsButton lat={it.lat!} lng={it.lng!} />
      </div>
    </div>
  );
}

function FacilityDetail({
  selection,
  distanceLabel,
}: {
  selection: Extract<Selection, { kind: "facility" }>;
  distanceLabel?: string;
}) {
  const f = selection.item;
  const meta = FACILITY_META[f.type];
  const st = FACILITY_STATUS_META[f.status];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-white"
          style={{ background: FACILITY_COLOR }}
        >
          <Icon name={meta.icon} size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[17px] font-bold leading-snug text-ink">{f.name}</p>
          <p className="text-[13px] text-text-2">
            {meta.label} · {f.address}
            {distanceLabel ? ` · ${distanceLabel}` : ""}
          </p>
        </div>
        <span className="shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ background: st.bg, color: st.fg }}>
          {st.label}
        </span>
      </div>
      <p className="text-[13.5px] text-text-3">
        {f.status_updated_at ? `Status updated ${timeAgo(f.status_updated_at)}` : "Status not yet confirmed"}
        {f.is_stale && f.status_updated_at && <span className="font-semibold text-[#7a5600]"> · may be outdated</span>}
        {f.capacity ? ` · Capacity ${f.capacity}` : ""}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {f.contact_phone ? (
          <a
            href={`tel:${f.contact_phone.replace(/\s/g, "")}`}
            className="flex h-[42px] items-center justify-center gap-2 rounded-xl border-[1.5px] border-green text-[14px] font-semibold text-green hover:bg-green-tint"
          >
            <Icon name="phone" size={18} /> Call
          </a>
        ) : (
          <span className="flex h-[42px] items-center justify-center rounded-xl border border-line text-[13px] text-muted">
            No phone listed
          </span>
        )}
        <DirectionsButton lat={f.lat} lng={f.lng} />
      </div>
    </div>
  );
}

export function DirectionsButton({ lat, lng }: { lat: number; lng: number }) {
  return (
    <a
      href={directionsUrl({ lat, lng })}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-[42px] items-center justify-center gap-2 rounded-xl bg-ink px-4 text-[14px] font-semibold text-white hover:brightness-110"
    >
      <Icon name="arrow" size={18} /> Directions
    </a>
  );
}
