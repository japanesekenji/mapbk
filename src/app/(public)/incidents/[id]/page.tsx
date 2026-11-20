"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { ModerationControls } from "@/components/incidents/ModerationControls";
import { SeverityDot, StatusChip } from "@/components/incidents/StatusChip";
import { VerificationBar } from "@/components/incidents/VerificationBar";
import { EmptyState, ErrorState, LoadingRows } from "@/components/layout/States";
import { CorroborateButton } from "@/components/incidents/CorroborateButton";
import { DirectionsButton } from "@/components/map/SelectionDetail";
import { canModerate, useProfile } from "@/lib/auth/useProfile";
import { useLiveRefresh } from "@/lib/realtime";
import { getBrowserClient } from "@/lib/supabase/browser";
import { CATEGORY_ICON, SEVERITY_META, STATUS_META, type IncidentStatus, type Severity } from "@/lib/taxonomy";
import { formatPht, timeAgo } from "@/lib/time";
import { useCorroboration } from "@/lib/useCorroboration";
import { usePhotoUrls } from "@/lib/usePhotoUrls";

type Detail = {
  id: string;
  category_id: string;
  category_label: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  location_accuracy_m: number | null;
  place_name: string | null;
  severity: Severity;
  status: IncidentStatus;
  corroboration_count: number;
  reported_at: string;
  updated_at: string;
  reporter_name: string | null;
  photo_paths: string[];
  history: {
    from_status: IncidentStatus;
    to_status: IncidentStatus;
    from_severity: Severity | null;
    to_severity: Severity | null;
    note: string | null;
    changed_at: string;
    changed_by_name: string;
  }[];
};

/** T072: incident detail with photos, verification progress, corroboration and history (FR-043). */
export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useProfile();
  const [detail, setDetail] = useState<Detail | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await getBrowserClient().rpc("incident_detail", { incident_id: id });
    if (error) setError(error.message);
    else {
      setError(null);
      setDetail((data as Detail | null) ?? null);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load, profile?.id]);
  useLiveRefresh("incidents", load);

  const photos = usePhotoUrls(detail?.photo_paths);
  const corroboration = useCorroboration(detail?.id ?? null, detail?.corroboration_count ?? 0);

  if (error) return <ErrorState message="Could not load this incident." onRetry={() => void load()} />;
  if (detail === undefined) return <div className="mx-auto w-full max-w-3xl p-6"><LoadingRows rows={5} /></div>;
  if (detail === null) {
    return (
      <EmptyState
        title="Incident not found"
        body="It may have been removed by a moderator."
        action={<Link href="/incidents" className="font-semibold text-green">Back to incidents</Link>}
      />
    );
  }

  const color = SEVERITY_META[detail.severity].color;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-5 md:py-8">
        <Link href="/incidents" className="flex items-center gap-1 text-[14px] font-semibold text-text-3">
          <Icon name="back" size={18} /> Incidents
        </Link>

        <article className="flex flex-col gap-4 rounded-[20px] border border-line bg-white p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-white" style={{ background: color }}>
              <Icon name={CATEGORY_ICON[detail.category_id] ?? "alert"} size={24} />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-[24px] font-extrabold leading-tight text-ink">{detail.title}</h1>
              <p className="text-[13.5px] text-text-2">
                {detail.category_label} · {detail.place_name ?? "Location pinned"} · {formatPht(detail.reported_at)}
              </p>
            </div>
            <StatusChip status={detail.status} />
          </div>

          <div className="flex flex-wrap gap-4 text-[13px] text-text-3">
            <SeverityDot severity={detail.severity} />
            <span>Reported {timeAgo(detail.reported_at)}</span>
            {detail.reporter_name && <span>by {detail.reporter_name}</span>}
            {detail.location_accuracy_m != null && <span>GPS ±{detail.location_accuracy_m} m</span>}
          </div>

          <p className="text-[15px] leading-relaxed text-body">{detail.description}</p>

          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {photos.map((u) => (
                <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden rounded-xl border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="Photo evidence" className="h-full w-full object-cover" />
                </a>
              ))}
            </div>
          )}

          <VerificationBar status={detail.status} corroborations={corroboration?.count ?? detail.corroboration_count} />

          <div className="grid grid-cols-2 gap-2 sm:max-w-md">
            <CorroborateButton
              count={corroboration?.count ?? detail.corroboration_count}
              active={corroboration?.active ?? false}
              onToggle={corroboration?.onToggle}
              busy={corroboration?.busy}
              hint={corroboration?.hint}
            />
            <DirectionsButton lat={detail.lat} lng={detail.lng} />
          </div>
          {corroboration?.hint && <p className="text-[12.5px] text-text-2">{corroboration.hint}</p>}
        </article>

        {canModerate(profile?.role) && (
          <ModerationControls
            key={`${detail.status}-${detail.severity}`}
            incidentId={detail.id}
            status={detail.status}
            severity={detail.severity}
            onChanged={() => void load()}
          />
        )}

        <section className="rounded-[20px] border border-line bg-white p-5">
          <h2 className="font-display mb-3 text-[18px] font-bold text-ink">Status history</h2>
          {detail.history.length === 0 ? (
            <p className="text-[14px] text-text-2">Not yet reviewed by a moderator.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {detail.history.map((h) => (
                <li key={h.changed_at + h.to_status} className="flex gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STATUS_META[h.to_status].fg }} />
                  <div>
                    <p className="text-[14px] text-body">
                      <strong>{STATUS_META[h.from_status].label}</strong> → <strong>{STATUS_META[h.to_status].label}</strong>
                      {h.to_severity && ` · severity ${SEVERITY_META[h.from_severity!].label} → ${SEVERITY_META[h.to_severity].label}`}
                    </p>
                    <p className="text-[12.5px] text-text-2">
                      {h.changed_by_name} · {formatPht(h.changed_at)}
                      {h.note ? ` · “${h.note}”` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
