import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { USERS, api, resetRateLimit, serviceClient, userClient } from "../helpers";

/**
 * T041 (constitution V: report submission). POST /api/reports validation, auth, service area,
 * photo limit and the 10-per-hour rate limit. Needs the dev server and local Supabase.
 */

const valid = {
  category_id: "flood",
  description: "Knee-deep water on Tatalon St., rising.",
  location: { lat: 14.6219, lng: 121.0146, accuracy_m: 8 },
  place_name: "Brgy. Tatalon, Quezon City",
};

let token = "";
const created: string[] = [];

beforeAll(async () => {
  ({ token } = await userClient("citizen2"));
  await resetRateLimit(USERS.citizen2.id);
});

afterAll(async () => {
  if (created.length) await serviceClient().from("incidents").delete().in("id", created);
  await resetRateLimit(USERS.citizen2.id);
});

describe("POST /api/reports", () => {
  it("requires a signed-in user", async () => {
    const r = await api("/api/reports", { method: "POST", json: valid });
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe("auth_required");
  });

  it("creates a Pending report with the category's default severity", async () => {
    const r = await api("/api/reports", { method: "POST", token, json: valid });
    expect(r.status).toBe(201);
    expect(r.body.status).toBe("pending");
    expect(r.body.severity).toBe("high");
    created.push(r.body.id);

    const { data } = await serviceClient().from("incidents").select("reporter_id, title").eq("id", r.body.id).single();
    expect(data?.reporter_id).toBe(USERS.citizen2.id);
    expect(data?.title).toBe("Flood, Brgy. Tatalon");
  });

  it("rejects a missing category", async () => {
    const r = await api("/api/reports", { method: "POST", token, json: { ...valid, category_id: undefined } });
    expect(r.status).toBe(400);
    expect(r.body.error.field).toBe("category_id");
  });

  it("rejects a description over 1,000 characters", async () => {
    const r = await api("/api/reports", { method: "POST", token, json: { ...valid, description: "x".repeat(1001) } });
    expect(r.status).toBe(400);
    expect(r.body.error.field).toBe("description");
  });

  it("rejects a location outside the Philippines (quickstart V14)", async () => {
    const r = await api("/api/reports", { method: "POST", token, json: { ...valid, location: { lat: 10, lng: 110 } } });
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("outside_service_area");
  });

  it("rejects more than 4 photos", async () => {
    const photo = (n: number) => `pending/${USERS.citizen2.id}/${n}.webp`;
    const r = await api("/api/reports", {
      method: "POST",
      token,
      json: { ...valid, photo_paths: [1, 2, 3, 4, 5].map(photo) },
    });
    expect(r.status).toBe(400);
    expect(r.body.error.field).toBe("photo_paths");
  });

  it("rejects photos uploaded by someone else", async () => {
    const r = await api("/api/reports", {
      method: "POST",
      token,
      json: { ...valid, photo_paths: [`pending/${USERS.citizen.id}/a.webp`] },
    });
    expect(r.status).toBe(400);
  });

  it("allows 10 reports per hour and refuses the 11th", async () => {
    // One report was already created above.
    for (let i = 0; i < 9; i++) {
      const r = await api("/api/reports", { method: "POST", token, json: valid });
      expect(r.status).toBe(201);
      created.push(r.body.id);
    }
    const r = await api("/api/reports", { method: "POST", token, json: valid });
    expect(r.status).toBe(429);
    expect(r.body.error.code).toBe("rate_limited");
    expect(r.body.error.retry_after_s).toBeGreaterThan(0);
  });
});

describe("POST /api/uploads", () => {
  it("refuses non-image types and files over 10 MB", async () => {
    const pdf = await api("/api/uploads", { method: "POST", token, json: { content_type: "application/pdf", size_bytes: 1000 } });
    expect(pdf.status).toBe(415);
    const big = await api("/api/uploads", { method: "POST", token, json: { content_type: "image/jpeg", size_bytes: 11 * 1024 * 1024 } });
    expect(big.status).toBe(413);
  });

  it("returns a signed upload URL under the caller's pending folder", async () => {
    const r = await api("/api/uploads", { method: "POST", token, json: { content_type: "image/webp", size_bytes: 400_000 } });
    expect(r.status).toBe(200);
    expect(r.body.path).toMatch(new RegExp(`^pending/${USERS.citizen2.id}/`));
    expect(r.body.token).toBeTruthy();
  });
});
