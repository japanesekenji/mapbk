"use client";

import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import type { AppRole } from "@/lib/taxonomy";

export type Profile = {
  id: string;
  email: string | null;
  display_name: string;
  phone: string | null;
  role: AppRole;
  show_name: boolean;
};

type State = { loading: boolean; profile: Profile | null };

/**
 * Signed-in user's profile, or null for a Visitor. Used only to shape the UI;
 * the database enforces every permission (constitution II).
 */
export function useProfile(): State & { refresh: () => Promise<void> } {
  const [state, setState] = useState<State>({ loading: true, profile: null });

  async function load() {
    const supabase = getBrowserClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setState({ loading: false, profile: null });
      return;
    }
    const { data: p } = await supabase
      .from("profiles")
      .select("id, display_name, phone, role, show_name")
      .eq("id", data.user.id)
      .single();
    setState({ loading: false, profile: p ? { ...p, email: data.user.email ?? null } : null });
  }

  useEffect(() => {
    const supabase = getBrowserClient();
    // Initial load runs from the subscription's INITIAL_SESSION event.
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void load();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { ...state, refresh: load };
}

export function canSeeSos(role: AppRole | undefined | null) {
  return role === "responder" || role === "admin";
}

export function canModerate(role: AppRole | undefined | null) {
  return role === "moderator" || role === "admin";
}
