import { Icon } from "@/components/icons/Icon";
import { directionsUrl, formatDistance } from "@/lib/geo";
import { FACILITY_META, FACILITY_STATUS_META, type FacilityStatus, type FacilityType } from "@/lib/taxonomy";
import { timeAgo } from "@/lib/time";

export type FacilityListItem = {
  id: string;
  name: string;
  type: FacilityType;
  lat: number;
  lng: number;
  address: string;
  contact_phone: string | null;
  capacity: number | null;
  status: FacilityStatus;
  status_updated_at: string | null;
  is_stale: boolean;
  distance_km?: number | null;
};

/** T076: facility row with distance, operating status, staleness, call and directions (FR-036-FR-040). */
export function FacilityRow({ f, onShow }: { f: FacilityListItem; onShow?: () => void }) {
  const meta = FACILITY_META[f.type];
  const st = FACILITY_STATUS_META[f.status];
  return (
    <li className="flex flex-col gap-3 rounded-[18px] border border-line bg-white p-3.5">
      <button type="button" onClick={onShow} className="flex items-start gap-3 text-left">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-tint text-green">
          <Icon name={meta.icon} size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold text-ink">{f.name}</span>
          <span className="block text-[12.5px] text-text-2">
            {meta.label}
            {f.distance_km != null ? ` · ${formatDistance(f.distance_km)}` : ""} · {f.address}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-text-3">
            <span className="rounded-full px-2 py-0.5 font-semibold" style={{ background: st.bg, color: st.fg }}>
              {st.label}
            </span>
            {f.status_updated_at ? `Updated ${timeAgo(f.status_updated_at)}` : "Status not confirmed"}
            {f.is_stale && f.status_updated_at && <span className="font-semibold text-[#7a5600]">· may be outdated</span>}
            {f.capacity ? <span>· Capacity {f.capacity}</span> : null}
          </span>
        </span>
      </button>
      <div className="grid grid-cols-2 gap-2">
        {f.contact_phone ? (
          <a
            href={`tel:${f.contact_phone.replace(/\s/g, "")}`}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border-[1.5px] border-green text-[14px] font-semibold text-green"
          >
            <Icon name="phone" size={16} /> Call
          </a>
        ) : (
          <span className="flex h-10 items-center justify-center rounded-xl border border-line text-[13px] text-muted">No phone</span>
        )}
        <a
          href={directionsUrl(f)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-ink text-[14px] font-semibold text-white"
        >
          <Icon name="arrow" size={16} /> Directions
        </a>
      </div>
    </li>
  );
}
