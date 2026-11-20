"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { CategoryGrid } from "@/components/report/CategoryGrid";
import { LocationPicker, type PickedLocation } from "@/components/report/LocationPicker";
import { PhotoPicker, type PickedPhoto } from "@/components/report/PhotoPicker";
import { useProfile } from "@/lib/auth/useProfile";
import { inServiceArea } from "@/lib/geo";
import { getBrowserClient } from "@/lib/supabase/browser";

const DRAFT_KEY = "bk-report-draft";
type Draft = { category: string | null; description: string; location: PickedLocation | null };

/**
 * T050: report a hazard (handoff mobile screen 3). Category, location, details and photos on one
 * screen with a sticky Submit. The draft survives failures and reloads (FR-019).
 */
export default function ReportPage() {
  const router = useRouter();
  const { loading, profile } = useProfile();
  const [draft, setDraft] = useState<Draft>({ category: null, description: "", location: null });
  const [restored, setRestored] = useState(false);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [errors, setErrors] = useState<Partial<Record<"category" | "location" | "description" | "form", string>>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    // Restoring a saved draft from storage after mount (not available during render).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (raw) setDraft(JSON.parse(raw) as Draft);
    setRestored(true);
  }, []);
  useEffect(() => {
    if (restored) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft, restored]);

  if (!loading && !profile) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-10">
        <div className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-6">
          <h1 className="font-display text-[24px] font-extrabold text-ink">Sign in to report a hazard</h1>
          <p className="text-[14px] text-text-2">
            Reports need an account so moderators can follow up. In an emergency, you can send an SOS without signing in.
          </p>
          <Link href="/profile?next=/report" className="flex h-12 items-center justify-center rounded-2xl bg-green text-[15px] font-semibold text-white">
            Sign in or create an account
          </Link>
          <Link href="/sos" className="flex h-12 items-center justify-center rounded-2xl border-[1.5px] border-sos text-[15px] font-semibold text-sos">
            Send an SOS instead
          </Link>
        </div>
      </div>
    );
  }

  function validate() {
    const e: typeof errors = {};
    if (!draft.category) e.category = "Choose what is happening.";
    if (!draft.location) e.location = "Set the location.";
    else if (!inServiceArea(draft.location)) e.location = "This spot is outside the Philippines service area.";
    if (!draft.description.trim()) e.description = "Describe what is happening.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate() || !draft.location) return;
    setErrors({});
    try {
      const paths: string[] = [];
      const storage = getBrowserClient().storage.from("incident-photos");
      for (const [n, p] of photos.entries()) {
        setBusy(`Uploading photo ${n + 1} of ${photos.length}…`);
        const res = await fetch("/api/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content_type: p.file.type, size_bytes: p.file.size }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? "Photo upload failed.");
        const { error } = await storage.uploadToSignedUrl(json.path, json.token, p.file, { contentType: p.file.type });
        if (error) throw new Error("Photo upload failed. Check your connection and try again.");
        paths.push(json.path);
      }
      setBusy("Sending report…");
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: draft.category,
          description: draft.description,
          location: {
            lat: draft.location.lat,
            lng: draft.location.lng,
            ...(draft.location.accuracy_m != null ? { accuracy_m: draft.location.accuracy_m } : {}),
          },
          place_name: draft.location.place_name,
          photo_paths: paths,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const field = json.error?.field as string | undefined;
        const key = field?.startsWith("location") ? "location" : field === "description" ? "description" : field === "category_id" ? "category" : "form";
        setErrors({ [key]: json.error?.message ?? "Could not send the report." });
        setBusy(null);
        return;
      }
      sessionStorage.removeItem(DRAFT_KEY);
      router.push(`/?select=${json.id}`);
    } catch (err) {
      setErrors({
        form: err instanceof Error && err.message !== "Failed to fetch"
          ? err.message
          : "Your report was not sent. Check your connection and try again. Your entries are saved.",
      });
      setBusy(null);
    }
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-28 pt-4 md:pt-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Back"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-text-3"
            >
              <Icon name="back" size={20} />
            </button>
            <h1 className="font-display text-[24px] font-extrabold text-ink">Report a hazard</h1>
          </div>

          <Section title="What is happening?" error={errors.category}>
            <CategoryGrid value={draft.category} onChange={(category) => setDraft((d) => ({ ...d, category }))} />
          </Section>

          <Section title="Location" error={errors.location}>
            {restored && (
              <LocationPicker
                value={draft.location}
                onChange={(location) => setDraft((d) => ({ ...d, location }))}
              />
            )}
          </Section>

          <Section title="Details" error={errors.description}>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              maxLength={1000}
              rows={3}
              placeholder="What do you see? How bad is it? Is anyone hurt?"
              aria-label="Details"
              className="min-h-[80px] w-full rounded-[14px] border border-line bg-white p-3 text-[15px] outline-none focus:border-green"
            />
            <p className="text-right text-[12px] text-muted">{draft.description.length}/1000</p>
          </Section>

          <Section title="Photo evidence">
            <PhotoPicker photos={photos} onChange={setPhotos} />
          </Section>

          {errors.form && (
            <p role="alert" className="rounded-xl bg-sos-bg p-3 text-[14px] text-sos">
              {errors.form}
            </p>
          )}
        </div>
      </div>
      <div className="sticky bottom-0 border-t border-line bg-white/95 px-4 py-3 backdrop-blur">
        <button
          type="submit"
          disabled={!!busy}
          className="mx-auto flex h-[54px] w-full max-w-xl items-center justify-center gap-2 rounded-2xl bg-green text-[16px] font-bold text-white hover:brightness-95 disabled:opacity-70"
        >
          <Icon name="send" size={20} />
          {busy ?? "Submit report"}
        </button>
      </div>
    </form>
  );
}

function Section({ title, error, children }: { title: string; error?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-[15px] font-bold text-ink">{title}</h2>
      {children}
      {error && (
        <p role="alert" className="text-[13px] font-semibold text-sos">
          {error}
        </p>
      )}
    </section>
  );
}
