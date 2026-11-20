import { afterAll, describe, expect, it } from "vitest";
import { APP_URL, anonClient, serviceClient, userClient } from "../helpers";

/** Quickstart V11 and V12: nearest facilities, status updates, CSV import. */

const tag = `CSV test ${Date.now()}`;

afterAll(async () => {
  await serviceClient().from("facilities").delete().like("name", `${tag}%`);
});

async function upload(token: string | null, csv: string) {
  const body = new FormData();
  body.set("file", new File([csv], "facilities.csv", { type: "text/csv" }));
  const res = await fetch(`${APP_URL}/api/facilities/import`, {
    method: "POST",
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: res.status, body: await res.json() };
}

describe("facilities_near", () => {
  it("orders by true distance and flags stale statuses", async () => {
    const { data, error } = await anonClient().rpc("facilities_near", { lat: 14.5764, lng: 121.0851 });
    expect(error).toBeNull();
    const d = data!.map((f) => f.distance_km);
    expect([...d].sort((a, b) => a - b)).toEqual(d);
    expect(data!.some((f) => f.is_stale)).toBe(true);
  });

  it("filters by type", async () => {
    const { data } = await anonClient().rpc("facilities_near", { lat: 14.5764, lng: 121.0851, types: ["hospital"] });
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.every((f) => f.type === "hospital")).toBe(true);
  });
});

describe("set_facility_status", () => {
  it("lets moderators update status and stamps the time; citizens are refused", async () => {
    const { data: list } = await anonClient().rpc("facilities_near", { lat: 14.5764, lng: 121.0851, max_results: 1 });
    const id = list![0]!.id;
    const { client: citizen } = await userClient("citizen");
    expect((await citizen.rpc("set_facility_status", { facility_id: id, new_status: "full" })).error?.message).toBe("forbidden");

    const { client: mod } = await userClient("moderator");
    const before = Date.now();
    const r = await mod.rpc("set_facility_status", { facility_id: id, new_status: "full" });
    expect(r.error).toBeNull();
    const { data } = await serviceClient().from("facilities").select("status, status_updated_at").eq("id", id).single();
    expect(data?.status).toBe("full");
    expect(Date.parse(data!.status_updated_at!)).toBeGreaterThanOrEqual(before - 5000);
    await mod.rpc("set_facility_status", { facility_id: id, new_status: "open" });
  });
});

describe("POST /api/facilities/import", () => {
  const csv = [
    "name,type,lat,lng,address,contact_phone,capacity,status",
    `${tag} A,evacuation_center,14.60,121.05,Test St,0917 000 0000,120,open`,
    `${tag} B,hospital,14.61,121.06,,,,`,
    `${tag} C,evacuation_center,10.0,110.0,Sea,,,open`,
  ].join("\n");

  it("refuses non-admins", async () => {
    const { token } = await userClient("moderator");
    expect((await upload(token, csv)).status).toBe(403);
    expect((await upload(null, csv)).status).toBe(401);
  });

  it("imports valid rows and reports skipped ones", async () => {
    const { token } = await userClient("admin");
    const r = await upload(token, csv);
    expect(r.status).toBe(200);
    expect(r.body.inserted).toBe(2);
    expect(r.body.skipped).toBe(1);
    expect(r.body.errors[0]).toMatchObject({ row: 4 });
    expect(r.body.errors[0].message).toContain("outside service area");
  });
});
