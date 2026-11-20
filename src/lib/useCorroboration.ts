"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CorroborationProps } from "@/components/map/SelectionDetail";
import { useProfile } from "@/lib/auth/useProfile";
import { getBrowserClient } from "@/lib/supabase/browser";

type Detail = { my_corroboration: boolean; is_own_report: boolean; corroboration_count: number };

/**
 * T071: corroboration state and toggle for one incident (FR-023). Optimistic count update;
 * Visitors are sent to sign in; reporters see a read-only count.
 */
export function useCorroboration(incidentId: string | null, fallbackCount: number): CorroborationProps | undefined {
  const router = useRouter();
  const { profile } = useProfile();
  const [state, setState] = useState<{ id: string; active: boolean; own: boolean; count: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!incidentId) return;
    let cancelled = false;
    void getBrowserClient()
      .rpc("incident_detail", { incident_id: incidentId })
      .then(({ data }) => {
        const d = data as Detail | null;
        if (!cancelled && d) {
          setState({ id: incidentId, active: d.my_corroboration, own: d.is_own_report, count: d.corroboration_count });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [incidentId, profile?.id]);

  if (!incidentId) return undefined;
  const s = state?.id === incidentId ? state : null;
  const count = s?.count ?? fallbackCount;

  if (s?.own) return { active: false, count, hint: "You reported this incident" };

  return {
    active: s?.active ?? false,
    count,
    busy,
    hint,
    onToggle: async () => {
      if (!profile) {
        router.push(`/profile?next=${encodeURIComponent(`/incidents/${incidentId}`)}`);
        return;
      }
      const next = !(s?.active ?? false);
      setState({ id: incidentId, active: next, own: false, count: count + (next ? 1 : -1) });
      setBusy(true);
      const { data, error } = await getBrowserClient().rpc("toggle_corroboration", { incident_id: incidentId });
      setBusy(false);
      if (error) {
        setState({ id: incidentId, active: !next, own: error.message === "own_report", count });
        setHint(error.message === "own_report" ? "You reported this incident" : "Could not save. Try again.");
        return;
      }
      const r = data as { corroborated: boolean; corroboration_count: number };
      setState({ id: incidentId, active: r.corroborated, own: false, count: r.corroboration_count });
      setHint(undefined);
    },
  };
}
