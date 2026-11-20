"use client";

import { useEffect, useEffectEvent } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";

/**
 * T040: call `onChange` when rows in `table` are inserted or updated (Realtime applies RLS per
 * subscriber, research R9), plus a fallback refetch every `fallbackMs` in case the socket drops.
 * Bursts are coalesced into one call per second.
 */
export function useLiveRefresh(
  table: "incidents" | "sos_requests",
  onChange: () => void,
  { fallbackMs = 60_000, enabled = true }: { fallbackMs?: number; enabled?: boolean } = {},
) {
  const refresh = useEffectEvent(() => onChange());

  useEffect(() => {
    if (!enabled) return;
    const supabase = getBrowserClient();
    let pending: ReturnType<typeof setTimeout> | undefined;
    const fire = () => {
      clearTimeout(pending);
      pending = setTimeout(() => refresh(), 1000);
    };
    const channel = supabase
      .channel(`${table}-changes-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, fire)
      .subscribe();
    const interval = setInterval(() => refresh(), fallbackMs);
    return () => {
      clearTimeout(pending);
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [table, fallbackMs, enabled]);
}
