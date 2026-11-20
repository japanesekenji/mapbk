"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { getBrowserClient } from "@/lib/supabase/browser";
import { useProfile } from "@/lib/auth/useProfile";
import { phoneSchema } from "@/lib/validation/common";

const ROLE_LABEL = { citizen: "Citizen", moderator: "Moderator", responder: "Responder", admin: "Admin" };

/** T026: sign up, sign in, sign out, role display, name and phone, name visibility (FR-020). */
export default function ProfilePage() {
  const { loading, profile, refresh } = useProfile();
  if (loading) {
    return <div className="p-6 text-text-2">Loading…</div>;
  }
  return (
    <div className="mx-auto w-full max-w-md overflow-y-auto px-4 py-6 md:py-10">
      {profile ? <Account profile={profile} onSaved={refresh} /> : <SignIn />}
    </div>
  );
}

function SignIn() {
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/";
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = getBrowserClient();
    const res =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } });
    setBusy(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    if (mode === "up" && !res.data.session) {
      setError("Check your email to confirm your account, then sign in.");
      return;
    }
    router.replace(next.startsWith("/") ? next : "/");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-[20px] border border-line bg-white p-6">
      <h1 className="font-display text-[28px] font-extrabold text-ink">
        {mode === "in" ? "Sign in" : "Create an account"}
      </h1>
      <p className="text-[14px] text-text-2">
        An account lets you report hazards and corroborate reports. You can send an SOS without one.
      </p>
      {mode === "up" && (
        <Field label="Display name">
          <input required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </Field>
      )}
      <Field label="Email">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
        />
      </Field>
      <Field label="Password">
        <input
          type="password"
          required
          minLength={8}
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
        />
      </Field>
      {error && (
        <p role="alert" className="text-[13.5px] text-sos">
          {error}
        </p>
      )}
      <button disabled={busy} className={primaryBtn}>
        {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
      </button>
      <button
        type="button"
        onClick={() => setMode(mode === "in" ? "up" : "in")}
        className="text-[14px] font-semibold text-green"
      >
        {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
      </button>
    </form>
  );
}

function Account({
  profile,
  onSaved,
}: {
  profile: NonNullable<ReturnType<typeof useProfile>["profile"]>;
  onSaved: () => Promise<void>;
}) {
  const router = useRouter();
  const [name, setName] = useState(profile.display_name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [showName, setShowName] = useState(profile.show_name);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    let phoneValue: string | null = null;
    if (phone.trim()) {
      const parsed = phoneSchema.safeParse(phone);
      if (!parsed.success) {
        setMsg({ ok: false, text: parsed.error.issues[0]!.message });
        return;
      }
      phoneValue = parsed.data;
    }
    const { error } = await getBrowserClient()
      .from("profiles")
      .update({ display_name: name.trim(), phone: phoneValue, show_name: showName })
      .eq("id", profile.id);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Saved." });
    if (!error) await onSaved();
  }

  async function signOut() {
    await getBrowserClient().auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 rounded-[20px] border border-line bg-white p-5">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-tint text-green">
          <Icon name="user" size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display truncate text-[18px] font-bold text-ink">{profile.display_name}</p>
          <p className="truncate text-[13px] text-text-2">{profile.email}</p>
        </div>
        <span className="rounded-full bg-green-tint px-3 py-1 text-[12px] font-bold text-green">
          {ROLE_LABEL[profile.role]}
        </span>
      </div>
      <form onSubmit={save} className="flex flex-col gap-4 rounded-[20px] border border-line bg-white p-5">
        <h2 className="font-display text-[18px] font-bold text-ink">Profile</h2>
        <Field label="Display name">
          <input required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Mobile number (used for SOS callbacks)">
          <input
            inputMode="tel"
            placeholder="09171234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputCls}
          />
        </Field>
        <label className="flex items-start gap-3 text-[14px] text-body">
          <input
            type="checkbox"
            checked={showName}
            onChange={(e) => setShowName(e.target.checked)}
            className="mt-0.5 h-[18px] w-[18px] accent-[#1b5e32]"
          />
          <span>
            Show my name on my reports
            <span className="block text-[12.5px] text-text-2">Off by default. Moderators can always see who reported.</span>
          </span>
        </label>
        {msg && (
          <p role="status" className={`text-[13.5px] ${msg.ok ? "text-green" : "text-sos"}`}>
            {msg.text}
          </p>
        )}
        <button className={primaryBtn}>Save</button>
      </form>
      <button
        type="button"
        onClick={signOut}
        className="h-12 rounded-2xl border-[1.5px] border-line bg-white text-[15px] font-semibold text-text-3 hover:bg-hover"
      >
        Sign out
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-text-3">
      {label}
      {children}
    </label>
  );
}

const inputCls =
  "h-12 rounded-xl border border-line bg-white px-3 text-[15px] font-normal text-body outline-none focus:border-green";
const primaryBtn =
  "h-12 rounded-2xl bg-green text-[15px] font-semibold text-white hover:brightness-95 disabled:opacity-60";
