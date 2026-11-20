"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { EmptyState, ErrorState, LoadingRows } from "@/components/layout/States";
import { MapView, type MapPoint, type MapViewHandle } from "@/components/map/MapView";
import { canSeeSos, useProfile } from "@/lib/auth/useProfile";
import { directionsUrl, formatCoords } from "@/lib/geo";
import { useLiveRefresh } from "@/lib/realtime";
import { getBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/database.types";
import { SOS_COLOR, SOS_STATE_META, SOS_TYPE_META, type SosState } from "@/lib/taxonomy";
import { formatPht, timeAgo } from "@/lib/time";

type SosRow = Database["public"]["Views"]["sos_responder_view"]["Row"];

const NEXT: Record<SosState, { to: SosState; label: string }[]> = {
  new: [
    { to: "acknowledged", label: "Acknowledge" },
    { to: "closed", label: "Close (false alarm)" },
  ],
  acknowledged: [
    { to: "responding", label: "Mark responding" },
    { to: "closed", label: "Close" },
  ],
  responding: [{ to: "closed", label: "Close (resolved)" }],
  closed: [],
};

/** T063: responder SOS map and list, newest first, live alerts for new requests (FR-033, FR-034). */
export default function RespondPage() {
  const { loading, profile } = useProfile();
  if (loading) return <div className="p-6"><LoadingRows /></div>;
  if (!canSeeSos(profile?.role)) {
    return (
      <div className="mx-auto max-w-md p-6">
        <EmptyState
          title="Responders only"
          body="SOS requests are visible only to authorized responders. If you need help, send an SOS or call 911."
        />
      </div>
    );
  }
  return <ResponderConsole />;
}

function ResponderConsole() {
  const [rows, setRows] = useState<SosRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const known = useRef<Set<string> | null>(null);
  const mapRef = useRef<MapViewHandle>(null);

  const load = useCallback(async () => {
    const { data, error } = await getBrowserClient().rpc("sos_list", {
      states: showClosed ? undefined : ["new", "acknowledged", "responding"],
      page_size: 100,
    });
    if (error) {
      setError(error.message);
      return;
    }
    setError(null);
    const list = data ?? [];
    // Alert on requests that arrived since the last load.
    if (known.current) {
      const fresh = list.filter((r) => r.id && !known.current!.has(r.id) && r.state === "new");
      if (fresh.length) {
        setAlert(`${fresh.length} new SOS request${fresh.length > 1 ? "s" : ""}`);
        beep();
      }
    }
    known.current = new Set(list.map((r) => r.id!));
    setRows(list);
  }, [showClosed]);

  useEffect(() => {
    // Initial and filter-change load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  useLiveRefresh("sos_requests", load, { fallbackMs: 15_000 });

  const points: MapPoint[] = useMemo(
    () =>
      (rows ?? [])
        .filter((r) => r.lat != null && r.lng != null)
        .map((r) => ({
          id: r.id!,
          lat: r.lat!,
          lng: r.lng!,
          color: r.state === "closed" ? "#7a8a7f" : SOS_COLOR,
          icon: SOS_TYPE_META[r.type!].icon,
          label: `SOS ${SOS_TYPE_META[r.type!].label}, ${r.state}`,
        })),
    [rows],
  );

  const sel = rows?.find((r) => r.id === selected) ?? null;

  async function setState(id: string, to: SosState) {
    setBusy(true);
    const { error } = await getBrowserClient().rpc("set_sos_state", { sos_id: id, new_state: to });
    setBusy(false);
    if (error) setError(error.message.includes("invalid_transition") ? "That request already changed. Refreshed." : error.message);
    await load();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 md:flex-row md:gap-4 md:p-4">
      <section className="flex min-h-0 flex-col rounded-[20px] border border-line bg-white md:w-[420px]">
        <header className="flex items-center gap-3 border-b border-divider p-4">
          <h1 className="font-display flex-1 text-[22px] font-extrabold text-ink">SOS requests</h1>
          <label className="flex items-center gap-2 text-[13px] text-text-3">
            <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} className="accent-[#1b5e32]" />
            Show closed
          </label>
        </header>
        {alert && (
          <button
            type="button"
            onClick={() => setAlert(null)}
            role="alert"
            className="mx-4 mt-3 flex items-center gap-2 rounded-xl bg-sos px-3 py-2.5 text-left text-[14px] font-bold text-white"
          >
            <Icon name="alert" size={18} /> {alert} <span className="ml-auto text-[12px] font-medium opacity-80">Dismiss</span>
          </button>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {error && <ErrorState message={error} onRetry={() => void load()} />}
          {!rows ? (
            <div className="p-3"><LoadingRows /></div>
          ) : rows.length === 0 ? (
            <EmptyState title="No open SOS requests" body="New requests appear here within seconds." />
          ) : (
            <ul className="flex flex-col gap-1">
              {rows.map((r) => {
                const st = SOS_STATE_META[r.state!];
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(r.id);
                        if (r.lat != null && r.lng != null) mapRef.current?.flyTo({ lat: r.lat, lng: r.lng }, 15);
                      }}
                      className={`flex w-full gap-3 rounded-xl p-3 text-left ${selected === r.id ? "bg-green-tint" : "hover:bg-hover"}`}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fbe3e0] text-sos">
                        <Icon name={SOS_TYPE_META[r.type!].icon} size={20} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[14.5px] font-semibold text-ink">{SOS_TYPE_META[r.type!].label}</span>
                          <span className="rounded-full px-2 py-0.5 text-[11.5px] font-bold" style={{ background: st.bg, color: st.fg }}>
                            {st.label}
                          </span>
                        </span>
                        <span className="block text-[12.5px] text-text-2">
                          {r.people_count} {r.people_count === 1 ? "person" : "people"} ·{" "}
                          {r.sender_kind === "visitor" ? "Visitor" : (r.sender_name ?? "User")} · {timeAgo(r.created_at!)}
                        </span>
                        {r.notes && <span className="mt-0.5 block truncate text-[12.5px] text-text-3">{r.notes}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="relative min-h-[320px] flex-1 overflow-hidden rounded-[20px] border border-line">
        <MapView ref={mapRef} points={points} selectedId={selected} onSelect={setSelected} onBoundsChange={() => {}} />
        {sel && (
          <div className="absolute bottom-4 left-4 right-4 z-10 rounded-[20px] bg-white p-4 shadow-card md:right-auto md:w-[420px]">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-sos text-white">
                <Icon name={SOS_TYPE_META[sel.type!].icon} size={24} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[17px] font-bold text-ink">
                  {SOS_TYPE_META[sel.type!].label} · {sel.people_count} {sel.people_count === 1 ? "person" : "people"}
                </p>
                <p className="text-[13px] text-text-2">
                  {sel.sender_kind === "visitor" ? "Visitor (no account)" : sel.sender_name} · {formatPht(sel.created_at!)}
                </p>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13.5px]">
              <dt className="text-text-2">Location</dt>
              <dd className="text-body">
                {sel.lat != null && sel.lng != null ? `${formatCoords({ lat: sel.lat, lng: sel.lng })}${sel.location_accuracy_m != null ? ` · ±${sel.location_accuracy_m} m` : ""}` : "No GPS"}
                {sel.landmark ? ` · ${sel.landmark}` : ""}
              </dd>
              {sel.notes && (
                <>
                  <dt className="text-text-2">Notes</dt>
                  <dd className="text-body">{sel.notes}</dd>
                </>
              )}
              {sel.assigned_name && (
                <>
                  <dt className="text-text-2">Assigned</dt>
                  <dd className="text-body">{sel.assigned_name}</dd>
                </>
              )}
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={`tel:${sel.contact_phone}`}
                className="flex h-10 items-center gap-2 rounded-xl border-[1.5px] border-green px-3 text-[14px] font-semibold text-green"
              >
                <Icon name="phone" size={16} /> {sel.contact_phone}
              </a>
              {sel.lat != null && sel.lng != null && (
                <a
                  href={directionsUrl({ lat: sel.lat, lng: sel.lng })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 items-center gap-2 rounded-xl bg-ink px-3 text-[14px] font-semibold text-white"
                >
                  <Icon name="arrow" size={16} /> Directions
                </a>
              )}
              {NEXT[sel.state!].map((n) => (
                <button
                  key={n.to}
                  type="button"
                  disabled={busy}
                  onClick={() => void setState(sel.id!, n.to)}
                  className={`h-10 rounded-xl px-3 text-[14px] font-semibold disabled:opacity-60 ${
                    n.to === "closed" ? "border border-line text-text-3" : "bg-sos text-white"
                  }`}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/** Short two-tone alert sound for new SOS requests (FR-033). */
function beep() {
  try {
    const ctx = new AudioContext();
    [880, 660].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.value = 0.08;
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.18);
      o.stop(ctx.currentTime + i * 0.18 + 0.15);
    });
  } catch {
    // Audio may be blocked until the user interacts with the page.
  }
}
