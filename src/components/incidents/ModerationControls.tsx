"use client";

import { useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { SEVERITY_META, STATUS_META, type IncidentStatus, type Severity } from "@/lib/taxonomy";

/** Allowed transitions (data-model.md "Incident status"). */
const TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  pending: ["verified", "rejected"],
  verified: ["resolved", "rejected"],
  resolved: ["verified"],
  rejected: ["pending"],
};

const ACTION_LABEL: Record<IncidentStatus, string> = {
  verified: "Verify",
  resolved: "Mark resolved",
  rejected: "Reject",
  pending: "Return to pending",
};

/**
 * T073: moderator status and severity controls. Shows only allowed transitions; on
 * status_conflict shows the current value and asks to confirm again (spec edge case).
 */
export function ModerationControls({
  incidentId,
  status,
  severity,
  onChanged,
  compact = false,
}: {
  incidentId: string;
  status: IncidentStatus;
  severity: Severity;
  onChanged: (next: { status: IncidentStatus; severity: Severity }) => void;
  compact?: boolean;
}) {
  const [sev, setSev] = useState<Severity>(severity);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [known, setKnown] = useState<IncidentStatus>(status);

  async function apply(next: IncidentStatus) {
    setBusy(true);
    setMsg(null);
    const { data, error } = await getBrowserClient().rpc("set_incident_status", {
      incident_id: incidentId,
      expected_status: known,
      new_status: next,
      new_severity: sev !== severity ? sev : undefined,
      note: note || undefined,
    });
    setBusy(false);
    if (error) {
      if (error.message === "status_conflict") {
        const current = (error.details ?? known) as IncidentStatus;
        setKnown(current);
        setMsg({
          ok: false,
          text: `Another moderator already changed this to ${STATUS_META[current].label}. Review and choose again.`,
        });
        onChanged({ status: current, severity });
        return;
      }
      setMsg({ ok: false, text: error.message === "forbidden" ? "Only moderators can change status." : "Could not save. Try again." });
      return;
    }
    const r = data as { status: IncidentStatus; severity: Severity };
    setKnown(r.status);
    setNote("");
    setMsg({ ok: true, text: `Marked ${STATUS_META[r.status].label}.` });
    onChanged(r);
  }

  return (
    <div className={`flex flex-col gap-2.5 ${compact ? "" : "rounded-[18px] border border-line bg-white p-4"}`}>
      {!compact && <h3 className="text-[13px] font-bold uppercase tracking-[.07em] text-text-2">Moderation</h3>}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-[13px] text-text-3">
          Severity
          <select
            value={sev}
            onChange={(e) => setSev(e.target.value as Severity)}
            className="h-9 rounded-lg border border-line bg-white px-2 text-[13.5px]"
          >
            {(Object.keys(SEVERITY_META) as Severity[]).map((s) => (
              <option key={s} value={s}>
                {SEVERITY_META[s].label}
              </option>
            ))}
          </select>
        </label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          placeholder="Note (optional)"
          aria-label="Moderation note"
          className="h-9 min-w-0 flex-1 rounded-lg border border-line px-2 text-[13.5px]"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {TRANSITIONS[known].map((next) => (
          <button
            key={next}
            type="button"
            disabled={busy}
            onClick={() => void apply(next)}
            className={`h-10 rounded-xl px-3.5 text-[14px] font-semibold disabled:opacity-60 ${
              next === "rejected" ? "border border-line text-sos hover:bg-sos-bg" : "bg-green text-white hover:brightness-95"
            }`}
          >
            {known === "resolved" && next === "verified" ? "Reopen" : ACTION_LABEL[next]}
          </button>
        ))}
        {sev !== severity && (
          <span className="self-center text-[12.5px] text-text-2">Severity change saves with the next action.</span>
        )}
      </div>
      {msg && (
        <p role="status" className={`text-[13px] ${msg.ok ? "text-green" : "font-semibold text-[#7a5600]"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
