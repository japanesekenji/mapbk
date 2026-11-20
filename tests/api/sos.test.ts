import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { USERS, api, serviceClient, userClient } from "../helpers";

/**
 * T053 (constitution V: SOS send). POST /api/sos for Visitors and users, validation, the
 * 3-per-hour limit, and GET /api/sos/{id} with tracking tokens. Needs the dev server.
 */

const device = `test-device-${Date.now()}`;
const visitorHeaders = { Cookie: `bk_device=${device}`, "X-Forwarded-For": "203.0.113.7" };
const created: string[] = [];

const visitorSos = {
  type: "trapped_flood",
  location: { lat: 14.5764, lng: 121.0851, accuracy_m: 8 },
  people_count: 4,
  notes: "API test: two seniors, one child.",
  contact_phone: "0917 555 0101",
  confirmed: true,
};

async function clearLimits() {
  const db = serviceClient();
  await db.from("rate_limit_events").delete().like("subject", `device:${device}%`);
  await db.from("rate_limit_events").delete().eq("subject", USERS.citizen.id);
}

beforeAll(clearLimits);
afterAll(async () => {
  if (created.length) await serviceClient().from("sos_requests").delete().in("id", created);
  await clearLimits();
});

describe("POST /api/sos (Visitor)", () => {
  it("requires a contact phone for Visitors", async () => {
    const r = await api("/api/sos", { method: "POST", headers: visitorHeaders, json: { ...visitorSos, contact_phone: undefined } });
    expect(r.status).toBe(400);
    expect(r.body.error.field).toBe("contact_phone");
  });

  it("requires explicit confirmation", async () => {
    const r = await api("/api/sos", { method: "POST", headers: visitorHeaders, json: { ...visitorSos, confirmed: false } });
    expect(r.status).toBe(400);
    expect(r.body.error.field).toBe("confirmed");
  });

  it("requires a location or a landmark", async () => {
    const r = await api("/api/sos", { method: "POST", headers: visitorHeaders, json: { ...visitorSos, location: undefined } });
    expect(r.status).toBe(400);
    expect(r.body.error.field).toBe("location");
  });

  it("creates the SOS and returns a one-time tracking token", async () => {
    const r = await api("/api/sos", { method: "POST", headers: visitorHeaders, json: visitorSos });
    expect(r.status).toBe(201);
    expect(r.body.state).toBe("new");
    expect(r.body.tracking_token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    created.push(r.body.id);

    const { data } = await serviceClient().from("sos_requests").select("*").eq("id", r.body.id).single();
    expect(data?.sender_kind).toBe("visitor");
    expect(data?.sender_id).toBeNull();
    expect(data?.contact_phone).toBe("09175550101");
    expect(data?.tracking_token_hash).not.toBe(r.body.tracking_token);

    const track = await api(`/api/sos/${r.body.id}?token=${r.body.tracking_token}`);
    expect(track.status).toBe(200);
    expect(track.body).toEqual({
      id: r.body.id,
      type: "trapped_flood",
      state: "new",
      state_updated_at: expect.any(String),
    });
  });

  it("accepts a landmark when location is not shared", async () => {
    const r = await api("/api/sos", {
      method: "POST",
      headers: visitorHeaders,
      json: { ...visitorSos, location: null, landmark: "Beside Tumana covered court" },
    });
    expect(r.status).toBe(201);
    created.push(r.body.id);
  });

  it("refuses the 4th SOS in an hour from the same device", async () => {
    const r1 = await api("/api/sos", { method: "POST", headers: visitorHeaders, json: visitorSos });
    expect(r1.status).toBe(201);
    created.push(r1.body.id);
    const r2 = await api("/api/sos", { method: "POST", headers: visitorHeaders, json: visitorSos });
    expect(r2.status).toBe(429);
    expect(r2.body.error.retry_after_s).toBeGreaterThan(0);
  });
});

describe("POST /api/sos (signed-in user)", () => {
  it("defaults the contact phone from the profile and records the sender", async () => {
    const { token } = await userClient("citizen");
    const r = await api("/api/sos", {
      method: "POST",
      token,
      json: { type: "medical", location: visitorSos.location, people_count: 1, confirmed: true },
    });
    expect(r.status).toBe(201);
    created.push(r.body.id);
    const { data } = await serviceClient().from("sos_requests").select("*").eq("id", r.body.id).single();
    expect(data?.sender_kind).toBe("user");
    expect(data?.sender_id).toBe(USERS.citizen.id);
    expect(data?.contact_phone).toBe("09171234501");
  });
});

describe("GET /api/sos/{id}", () => {
  it("returns the same 404 for a wrong token and an unknown id", async () => {
    const id = created[0]!;
    const wrong = await api(`/api/sos/${id}?token=not-the-token`);
    const unknown = await api(`/api/sos/00000000-0000-4000-8000-000000000000?token=x`);
    expect(wrong.status).toBe(404);
    expect(unknown.status).toBe(404);
    expect(wrong.body).toEqual(unknown.body);
  });
});
