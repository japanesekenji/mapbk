"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingRows } from "@/components/layout/States";
import { canModerate, useProfile } from "@/lib/auth/useProfile";
import { getBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/database.types";
import { FACILITY_META, FACILITY_STATUS_META, type AppRole, type FacilityStatus, type FacilityType } from "@/lib/taxonomy";
import { timeAgo } from "@/lib/time";
import { FACILITY_TYPES, facilitySchema } from "@/lib/validation/facility";

type Facility = Database["public"]["Functions"]["facilities_in_bbox"]["Returns"][number];
type UserRow = Database["public"]["Functions"]["admin_list_users"]["Returns"][number];
const STATUSES = Object.keys(FACILITY_STATUS_META) as FacilityStatus[];
const ROLES: AppRole[] = ["citizen", "moderator", "responder", "admin"];

/**
 * T080: facility status updates (moderators and admins), add facility and CSV import (admins),
 * and role assignment (admins, FR-005).
 */
export default function AdminPage() {
  const { loading, profile } = useProfile();
  if (loading) return <div className="p-6"><LoadingRows /></div>;
  if (!canModerate(profile?.role)) {
    return <EmptyState title="Staff only" body="Sign in with a moderator or admin account." />;
  }
  const isAdmin = profile?.role === "admin";
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 md:py-8">
        <h1 className="font-display text-[30px] font-extrabold text-ink">{isAdmin ? "Admin" : "Facility status"}</h1>
        <Facilities isAdmin={isAdmin} />
        {isAdmin && <Users selfId={profile!.id} />}
      </div>
    </div>
  );
}

function Facilities({ isAdmin }: { isAdmin: boolean }) {
  const [rows, setRows] = useState<Facility[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await getBrowserClient().rpc("facilities_in_bbox", {
      min_lng: 116, min_lat: 4.5, max_lng: 127, max_lat: 21.5,
    });
    if (error) setError(error.message);
    else setRows(data ?? []);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function setStatus(id: string, status: FacilityStatus) {
    const { error } = await getBrowserClient().rpc("set_facility_status", { facility_id: id, new_status: status });
    setMsg(error ? `Could not update: ${error.message}` : "Status updated.");
    await load();
  }

  async function importCsv(file: File) {
    const body = new FormData();
    body.set("file", file);
    const res = await fetch("/api/facilities/import", { method: "POST", body });
    const json = await res.json();
    if (!res.ok) setMsg(json.error?.message ?? "Import failed.");
    else {
      const errs = (json.errors as { row: number; message: string }[]).slice(0, 5).map((e) => `row ${e.row}: ${e.message}`);
      setMsg(`Imported ${json.inserted}, skipped ${json.skipped}${errs.length ? ` (${errs.join("; ")})` : ""}.`);
      await load();
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display flex-1 text-[19px] font-bold text-ink">Facilities</h2>
        {isAdmin && (
          <label className="cursor-pointer rounded-xl border-[1.5px] border-green px-3 py-2 text-[14px] font-semibold text-green">
            Import CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && void importCsv(e.target.files[0])}
            />
          </label>
        )}
      </div>
      {isAdmin && (
        <p className="text-[12.5px] text-text-2">
          CSV columns: name, type ({FACILITY_TYPES.join(", ")}), lat, lng, address, contact_phone, capacity, status.
        </p>
      )}
      {msg && <p role="status" className="text-[13.5px] font-semibold text-green">{msg}</p>}
      {isAdmin && <AddFacility onAdded={load} />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!rows ? (
        <LoadingRows />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13.5px]">
            <thead className="text-[11.5px] uppercase tracking-[.07em] text-text-2">
              <tr>
                <th className="py-2">Name</th>
                <th>Type</th>
                <th>Updated</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.id} className="border-t border-divider">
                  <td className="py-2 font-semibold text-ink">{f.name}</td>
                  <td className="text-text-3">{FACILITY_META[f.type].label}</td>
                  <td className={f.is_stale ? "text-[#7a5600]" : "text-text-3"}>
                    {f.status_updated_at ? timeAgo(f.status_updated_at) : "never"}
                  </td>
                  <td>
                    <div className="flex gap-1">
                      {STATUSES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          aria-pressed={f.status === s}
                          aria-label={`Set ${f.name} to ${FACILITY_STATUS_META[s].label}`}
                          onClick={() => f.status !== s && void setStatus(f.id, s)}
                          className="rounded-full px-2.5 py-1 text-[12px] font-semibold"
                          style={
                            f.status === s
                              ? { background: FACILITY_STATUS_META[s].bg, color: FACILITY_STATUS_META[s].fg }
                              : { color: "#7a8a7f" }
                          }
                        >
                          {FACILITY_STATUS_META[s].label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AddFacility({ onAdded }: { onAdded: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "evacuation_center", lat: "", lng: "", address: "", contact_phone: "", capacity: "" });
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = facilitySchema.safeParse(form);
    if (!parsed.success) return setErr(parsed.error.issues[0]!.message);
    const f = parsed.data;
    const { error } = await getBrowserClient().from("facilities").insert({
      name: f.name,
      type: f.type,
      location: `SRID=4326;POINT(${f.lng} ${f.lat})`,
      address: f.address ?? "",
      contact_phone: f.contact_phone ?? null,
      capacity: f.capacity ?? null,
      status: f.status,
    });
    if (error) return setErr(error.message);
    setErr(null);
    setOpen(false);
    setForm({ ...form, name: "", lat: "", lng: "", address: "", contact_phone: "", capacity: "" });
    await onAdded();
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="self-start text-[14px] font-semibold text-green">
        + Add facility
      </button>
    );
  }
  const input = "h-10 rounded-lg border border-line px-2 text-[14px]";
  return (
    <form onSubmit={save} className="grid grid-cols-2 gap-2 rounded-xl bg-hover p-3 md:grid-cols-4">
      <input className={`${input} col-span-2`} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <select className={input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
        {FACILITY_TYPES.map((t) => (
          <option key={t} value={t}>{FACILITY_META[t as FacilityType].label}</option>
        ))}
      </select>
      <input className={input} placeholder="Capacity" inputMode="numeric" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
      <input className={input} placeholder="Latitude" inputMode="decimal" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
      <input className={input} placeholder="Longitude" inputMode="decimal" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
      <input className={input} placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      <input className={input} placeholder="Phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
      {err && <p className="col-span-full text-[13px] text-sos">{err}</p>}
      <div className="col-span-full flex gap-2">
        <button className="h-10 rounded-xl bg-green px-4 text-[14px] font-semibold text-white">Save facility</button>
        <button type="button" onClick={() => setOpen(false)} className="h-10 px-3 text-[14px] text-text-3">Cancel</button>
      </div>
    </form>
  );
}

function Users({ selfId }: { selfId: string }) {
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(async () => {
    const { data } = await getBrowserClient().rpc("admin_list_users");
    setRows(data ?? []);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function setRole(id: string, role: AppRole) {
    const { error } = await getBrowserClient().rpc("set_user_role", { user_id: id, new_role: role });
    setMsg(error ? `Could not change role: ${error.message}` : "Role updated.");
    await load();
  }

  return (
    <section className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-5">
      <h2 className="font-display text-[19px] font-bold text-ink">Users and roles</h2>
      {msg && <p role="status" className="text-[13.5px] font-semibold text-green">{msg}</p>}
      {!rows ? (
        <LoadingRows />
      ) : (
        <ul className="divide-y divide-divider">
          {rows.map((u) => (
            <li key={u.id} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-ink">{u.display_name}</span>
                <span className="block truncate text-[12.5px] text-text-2">{u.email}</span>
              </span>
              <select
                aria-label={`Role for ${u.display_name}`}
                value={u.role}
                disabled={u.id === selfId}
                onChange={(e) => void setRole(u.id, e.target.value as AppRole)}
                className="h-9 rounded-lg border border-line bg-white px-2 text-[13.5px]"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
