import { describe, expect, it } from "vitest";
import { anonClient, userClient, type DemoUser } from "../helpers";

/**
 * T052 (constitution V: SOS access by role, SC-006). Visitors, citizens and moderators can
 * never read SOS data by any path; responders and admins can. Direct inserts are refused.
 */

const metroManila = { min_lng: 120.9, min_lat: 14.4, max_lng: 121.3, max_lat: 14.8 };

async function clientFor(who: DemoUser | "visitor") {
  return who === "visitor" ? anonClient() : (await userClient(who)).client;
}

describe.each(["visitor", "citizen", "moderator"] as const)("SOS data is hidden from %s", (who) => {
  it("returns no rows from the table or the responder view", async () => {
    const db = await clientFor(who);
    const table = await db.from("sos_requests").select("id");
    expect(table.data ?? []).toHaveLength(0);
    const view = await db.from("sos_responder_view").select("id");
    expect(view.data ?? []).toHaveLength(0);
  });

  it("refuses sos_list and sos_in_bbox", async () => {
    const db = await clientFor(who);
    const list = await db.rpc("sos_list", {});
    expect(list.error).not.toBeNull();
    expect(list.data ?? []).toHaveLength(0);
    const bbox = await db.rpc("sos_in_bbox", metroManila);
    expect(bbox.error).not.toBeNull();
    expect(bbox.data ?? []).toHaveLength(0);
  });

  it("refuses set_sos_state", async () => {
    const db = await clientFor(who);
    const r = await db.rpc("set_sos_state", { sos_id: "00000000-0000-4000-8000-000000000000", new_state: "closed" });
    expect(r.error).not.toBeNull();
  });

  it("cannot insert an SOS directly", async () => {
    const db = await clientFor(who);
    const r = await db.from("sos_requests").insert({
      sender_kind: "visitor",
      contact_phone: "09170000000",
      type: "other",
      landmark: "test",
      people_count: 1,
      tracking_token_hash: "0".repeat(64),
      device_id: "test",
    });
    expect(r.error).not.toBeNull();
  });
});

describe.each(["responder", "admin"] as const)("SOS data is visible to %s", (who) => {
  it("lists seeded SOS requests newest first", async () => {
    const db = await clientFor(who);
    const { data, error } = await db.rpc("sos_list", {});
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(5);
    const times = data!.map((r) => Date.parse(r.created_at!));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it("returns open requests in the map area", async () => {
    const db = await clientFor(who);
    const { data, error } = await db.rpc("sos_in_bbox", metroManila);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.every((r) => r.state !== "closed")).toBe(true);
  });
});

describe("SOS state transitions", () => {
  it("enforces new -> acknowledged and records the responder", async () => {
    const { client } = await userClient("responder");
    const { data: open } = await client.rpc("sos_list", { states: ["new"] });
    const target = open![0]!;
    const bad = await client.rpc("set_sos_state", { sos_id: target.id!, new_state: "responding" });
    expect(bad.error?.message).toContain("invalid_transition");
    const ok = await client.rpc("set_sos_state", { sos_id: target.id!, new_state: "acknowledged" });
    expect(ok.error).toBeNull();
    expect(ok.data?.state).toBe("acknowledged");
    expect(ok.data?.assigned_name).toBe("Resp. Leo Garcia");
  });
});
