"use client";

import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";

/** Signed URLs for incident photos; storage RLS decides who may sign them. */
export function usePhotoUrls(paths: string[] | undefined) {
  const [urls, setUrls] = useState<string[]>([]);
  const key = (paths ?? []).join("|");
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    void getBrowserClient()
      .storage.from("incident-photos")
      .createSignedUrls(key.split("|"), 3600)
      .then(({ data }) => {
        if (!cancelled) setUrls((data ?? []).map((d) => d.signedUrl).filter((u): u is string => !!u));
      });
    return () => {
      cancelled = true;
    };
  }, [key]);
  return key ? urls : [];
}
