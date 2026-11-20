"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { ModerationControls } from "@/components/incidents/ModerationControls";
import { SeverityDot } from "@/components/incidents/StatusChip";
import { EmptyState, ErrorState, LoadingRows } from "@/components/layout/States";
import { canModerate, useProfile } from "@/lib/auth/useProfile";
import { useLiveRefresh } from "@/lib/realtime";
import { getBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/database.types";
import { CATEGORY_ICON, SEVERITY_META } from "@/lib/taxonomy";
import { timeAgo } from "@/lib/time";
import { usePhotoUrls } from "@/lib/usePhotoUrls";

type QueueRow = Database["public"]["Functions"]["moderation_queue"]["Returns"][number];

/** T074: moderator queue of Pending reports, oldest first, with photos and corroborations (FR-029). */
export default function ModeratePage() {
  const { loading, profile } = useProfile();
  if (loading) return <div className="p-6"><LoadingRows /></div>;
  if (!canModerate(profile?.role)) {
    return <EmptyState title="Moderators only" body="Sign in with a moderator account to review reports." />;
  }
  return <Queue />;
}

function Queue() {
  const [rows, setRows] = useState<QueueRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await getBrowserClient().rpc("moderation_queue");
    if (error) setError(error.message);
    else {
      setError(null);
      setRows(data ?? []);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  useLiveRefresh("incidents", load);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-5 md:py-8">
        <div>
          <h1 className="font-display text-[30px] font-extrabold text-ink">Moderation queue</h1>
          <p className="text-[14px] text-text-2">Pending reports, oldest first. Verify, reject, or adjust severity.</p>
        </div>
        {error && <ErrorState message={error} onRetry={() => void load()} />}
        {!rows ? (
          <LoadingRows rows={5} />
        ) : rows.length === 0 ? (
          <EmptyState title="All caught up" body="No reports are waiting for review." />
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((r) => (
              <QueueItem key={r.id} row={r} onDone={() => setRows((list) => list?.filter((x) => x.id !== r.id) ?? null)} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function QueueItem({ row, onDone }: { row: QueueRow; onDone: () => void }) {
  const photos = usePhotoUrls(row.photo_paths);
  const color = SEVERITY_META[row.severity].color;
  return (
    <li className="flex flex-col gap-3 rounded-[18px] border border-line bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}1f`, color }}>
          <Icon name={CATEGORY_ICON[row.category_id] ?? "alert"} size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <Link href={`/incidents/${row.id}`} className="font-display text-[17px] font-bold text-ink hover:underline">
            {row.title}
          </Link>
          <p className="text-[13px] text-text-2">
            {row.category_label} · {row.place_name ?? "pinned location"} · {timeAgo(row.reported_at)} · by {row.reporter_name}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-[12.5px] text-text-3">
          <SeverityDot severity={row.severity} />
          <span className="flex items-center gap-1">
            <Icon name="people" size={14} /> {row.corroboration_count}
          </span>
        </div>
      </div>
      <p className="text-[14px] text-body">{row.description}</p>
      {photos.length > 0 && (
        <div className="flex gap-2">
          {photos.map((u) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={u} src={u} alt="Photo evidence" className="h-20 w-20 rounded-lg border border-line object-cover" />
          ))}
        </div>
      )}
      <ModerationControls
        compact
        incidentId={row.id}
        status={row.status}
        severity={row.severity}
        onChanged={(next) => next.status !== "pending" && onDone()}
      />
    </li>
  );
}
