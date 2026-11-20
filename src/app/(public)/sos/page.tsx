"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { LocationPicker, type PickedLocation } from "@/components/report/LocationPicker";
import { ConfirmSend, PeopleStepper, TypeChips } from "@/components/sos/SosControls";
import { useProfile } from "@/lib/auth/useProfile";
import { formatCoords } from "@/lib/geo";
import { SOS_STATE_META, SOS_TYPE_META, type SosState, type SosType } from "@/lib/taxonomy";
import { formatPht, timeAgo } from "@/lib/time";
import { phoneSchema } from "@/lib/validation/common";

const TRACK_KEY = "bk-sos";
type Tracked = { id: string; token: string; created_at: string };
type TrackState = { state: SosState; type: SosType; state_updated_at: string };

/**
 * T062: SOS request (handoff mobile screen 4). Works without an account (spec Q1 = A). After
 * sending, the page tracks the request with its token (polls every 15 s).
 */
export default function SosPage() {
  const [tracked, setTracked] = useState<Tracked | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(TRACK_KEY);
    // Restore a tracked request after mount (localStorage is not available during render).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (raw) setTracked(JSON.parse(raw) as Tracked);
    setReady(true);
  }, []);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-sos-bg">
      <div className="mx-auto w-full max-w-md px-4 pb-10 pt-4 md:pt-8">
        {!ready ? null : tracked ? (
          <Tracking
            tracked={tracked}
            onNew={() => {
              localStorage.removeItem(TRACK_KEY);
              setTracked(null);
            }}
          />
        ) : (
          <SosForm
            onSent={(t) => {
              localStorage.setItem(TRACK_KEY, JSON.stringify(t));
              setTracked(t);
            }}
          />
        )}
      </div>
    </div>
  );
}

function SosForm({ onSent }: { onSent: (t: Tracked) => void }) {
  const router = useRouter();
  const { profile } = useProfile();
  const [type, setType] = useState<SosType | null>(null);
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [geoState, setGeoState] = useState<"locating" | "ok" | "denied">("locating");
  const [landmark, setLandmark] = useState("");
  const [people, setPeople] = useState(1);
  const [notes, setNotes] = useState("");
  const [phone, setPhone] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live location: watch position while the form is open.
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGeoState("denied");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setGeoState("ok");
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy_m: Math.round(pos.coords.accuracy) });
      },
      () => setGeoState("denied"),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const needsPhone = !profile?.phone;

  function review() {
    setError(null);
    if (!type) return setError("Choose the type of emergency.");
    if (!location && !landmark.trim()) return setError("Share your location or describe a landmark.");
    if (needsPhone) {
      const p = phoneSchema.safeParse(phone);
      if (!p.success) return setError("Enter a mobile number so responders can call you back.");
    }
    setConfirming(true);
  }

  async function send() {
    setBusy(true);
    try {
      const res = await fetch("/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          location: location ? { lat: location.lat, lng: location.lng, ...(location.accuracy_m != null ? { accuracy_m: location.accuracy_m } : {}) } : null,
          landmark: landmark.trim() || null,
          people_count: people,
          notes: notes.trim() || null,
          contact_phone: needsPhone ? phone : null,
          confirmed: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? "Your SOS was not sent. Call 911 if you are in danger.");
        setConfirming(false);
        return;
      }
      onSent({ id: json.id, token: json.tracking_token, created_at: json.created_at });
    } catch {
      setError("Your SOS was not sent. Check your connection and try again, or call 911.");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-bold uppercase tracking-[.1em] text-sos">Emergency SOS</span>
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Close"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-text-3"
        >
          <Icon name="close" size={20} />
        </button>
      </div>

      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-sos text-white ring-[10px] ring-[#f8d9d5]">
          <Icon name="alert" size={34} />
        </span>
        <h1 className="font-display text-[28px] font-extrabold leading-tight text-ink">Request emergency help</h1>
        <p className="text-[14px] text-text-3">Your location and details go to authorized responders for review.</p>
      </div>

      <TypeChips value={type} onChange={setType} />

      {geoState === "denied" ? (
        <div className="flex flex-col gap-2">
          <p className="text-[13.5px] font-semibold text-text-3">Location is off. Place a pin or describe where you are.</p>
          <LocationPicker value={location} onChange={setLocation} autoLocate={false} />
          <input
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            maxLength={200}
            placeholder="Landmark, e.g. behind the barangay hall, blue gate"
            aria-label="Landmark"
            className="h-12 rounded-2xl border border-sos-border bg-white px-3 text-[15px] outline-none focus:border-sos"
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-sos-border bg-white p-3.5">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-live" />
          </span>
          <div>
            <p className="text-[14.5px] font-semibold text-ink">{location ? "Sharing live location" : "Finding your location…"}</p>
            {location && (
              <p className="text-[12.5px] text-text-2">
                {formatCoords(location)}
                {location.accuracy_m != null ? ` · ±${location.accuracy_m} m` : ""}
              </p>
            )}
          </div>
        </div>
      )}

      <PeopleStepper value={people} onChange={setPeople} />

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="Notes for responders (injuries, floor, access)"
        aria-label="Notes for responders"
        className="min-h-[72px] rounded-2xl border border-sos-border bg-white p-3 text-[15px] outline-none focus:border-sos"
      />

      {needsPhone && (
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-text-3">
          Mobile number for callbacks
          <input
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09171234567"
            className="h-12 rounded-2xl border border-sos-border bg-white px-3 text-[15px] font-normal text-body outline-none focus:border-sos"
          />
        </label>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-white p-3 text-[14px] font-semibold text-sos">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={review}
        className="flex h-[60px] items-center justify-center gap-2 rounded-[18px] bg-sos text-[18px] font-bold text-white shadow-sos"
      >
        <Icon name="send" size={22} /> Send SOS
      </button>
      <p className="text-center text-[12.5px] text-text-3">
        Visible only to authorized responders. In a life-threatening emergency, call{" "}
        <a href="tel:911" className="font-bold text-sos underline">
          911
        </a>
        .
      </p>

      <ConfirmSend
        open={confirming}
        busy={busy}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void send()}
        summary={`${type ? SOS_TYPE_META[type].label : ""} · ${people} ${people === 1 ? "person" : "people"}${
          location ? " · live location" : landmark ? ` · ${landmark}` : ""
        }`}
      />
    </div>
  );
}

function Tracking({ tracked, onNew }: { tracked: Tracked; onNew: () => void }) {
  const [info, setInfo] = useState<TrackState | null>(null);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    let stop = false;
    async function poll() {
      try {
        const res = await fetch(`/api/sos/${tracked.id}?token=${encodeURIComponent(tracked.token)}`, { cache: "no-store" });
        if (res.status === 404) return setLost(true);
        if (res.ok && !stop) setInfo((await res.json()) as TrackState);
      } catch {
        // Offline: keep the last known state and retry.
      }
    }
    void poll();
    const t = setInterval(poll, 15_000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [tracked]);

  const st = info ? SOS_STATE_META[info.state] : null;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3 pt-6 text-center">
        <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-sos text-white ring-[10px] ring-[#f8d9d5]">
          <Icon name={info?.state === "closed" ? "check" : "send"} size={32} />
        </span>
        <h1 className="font-display text-[28px] font-extrabold leading-tight text-ink">
          {info?.state === "closed" ? "Request closed" : "SOS received"}
        </h1>
        <p className="text-[14px] text-text-3">
          Received {formatPht(tracked.created_at)} ({timeAgo(tracked.created_at)}). Keep your phone on; a responder may call
          you.
        </p>
      </div>
      <div className="flex flex-col gap-2 rounded-2xl border border-sos-border bg-white p-4">
        <p className="text-[13px] font-semibold text-text-3">Current status</p>
        {lost ? (
          <p className="text-[14px] text-text-3">This request is no longer available.</p>
        ) : st && info ? (
          <>
            <span
              className="self-start rounded-full px-3 py-1 text-[14px] font-bold"
              style={{ background: st.bg, color: st.fg }}
              data-testid="sos-state"
            >
              {st.label}
            </span>
            <p className="text-[12.5px] text-text-2">
              {SOS_TYPE_META[info.type].label} · updated {timeAgo(info.state_updated_at)}
            </p>
          </>
        ) : (
          <p className="text-[14px] text-text-3">Checking…</p>
        )}
      </div>
      <a href="tel:911" className="flex h-14 items-center justify-center gap-2 rounded-[18px] bg-sos text-[17px] font-bold text-white">
        <Icon name="phone" size={20} /> Call 911
      </a>
      <button type="button" onClick={onNew} className="h-11 text-[14px] font-semibold text-text-3">
        Send another SOS
      </button>
    </div>
  );
}
