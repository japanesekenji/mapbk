import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { USERS, anonClient, serviceClient, userClient } from "../helpers";

/**
 * T065 (constitution V: status change). Only moderators and admins change status; allowed
 * transitions only; every change is logged; stale changes get status_conflict; rejected
 * incidents leave public views.
 */

let incidentId = "";

beforeAll(async () => {
  const { data, error } = await serviceClient()
    .from("incidents")
    .insert({
      category_id: "fire",
      title: "Status test incident",
      description: "db test",
      location: "SRID=4326;POINT(121.05 14.6)",
      severity: "high",
      reporter_id: USERS.citizen.id,
    })
    .select("id")
    .single();
  if (error) throw error;
  incidentId = data.id;
});

afterAll(async () => {
  await serviceClient().from("incidents").delete().eq("id", incidentId);
});

const call = (expected: string, next: string, extra: Record<string, unknown> = {}) => ({
  incident_id: incidentId,
  expected_status: expected as "pending",
  new_status: next as "pending",
  ...extra,
});

describe("set_incident_status", () => {
  it("is refused for citizens and visitors", async () => {
    const { client } = await userClient("citizen");
    const r = await client.rpc("set_incident_status", call("pending", "verified"));
    expect(r.error?.message).toBe("forbidden");
    const v = await anonClient().rpc("set_incident_status", call("pending", "verified"));
    expect(v.error).not.toBeNull();
  });

  it("refuses pending -> resolved", async () => {
    const { client } = await userClient("moderator");
    const r = await client.rpc("set_incident_status", call("pending", "resolved"));
    expect(r.error?.message).toBe("invalid_transition");
  });

  it("lets a moderator verify and logs exactly one history row", async () => {
    const { client } = await userClient("moderator");
    const r = await client.rpc("set_incident_status", call("pending", "verified", { note: "Seen by tanod" }));
    expect(r.error).toBeNull();
    const { data: history } = await serviceClient()
      .from("incident_status_changes")
      .select("*")
      .eq("incident_id", incidentId);
    expect(history).toHaveLength(1);
    expect(history![0]).toMatchObject({
      from_status: "pending",
      to_status: "verified",
      changed_by: USERS.moderator.id,
      note: "Seen by tanod",
    });
  });

  it("reports status_conflict with the current status when the expectation is stale", async () => {
    const { client } = await userClient("moderator");
    const r = await client.rpc("set_incident_status", call("pending", "verified"));
    expect(r.error?.message).toBe("status_conflict");
    expect(r.error?.details).toBe("verified");
  });

  it("records severity changes alongside status", async () => {
    const { client } = await userClient("admin");
    const r = await client.rpc("set_incident_status", call("verified", "resolved", { new_severity: "low" }));
    expect(r.error).toBeNull();
    const { data } = await serviceClient()
      .from("incident_status_changes")
      .select("from_severity, to_severity, changed_by")
      .eq("incident_id", incidentId)
      .eq("to_status", "resolved")
      .single();
    expect(data).toEqual({ from_severity: "high", to_severity: "low", changed_by: USERS.admin.id });
  });

  it("removes rejected incidents from public views but keeps them for moderators", async () => {
    const { client: mod } = await userClient("moderator");
    expect((await mod.rpc("set_incident_status", call("resolved", "verified"))).error).toBeNull();
    expect((await mod.rpc("set_incident_status", call("verified", "rejected"))).error).toBeNull();

    const pub = await anonClient().from("incidents_public").select("id").eq("id", incidentId);
    expect(pub.data).toHaveLength(0);
    const visitorDetail = await anonClient().rpc("incident_detail", { incident_id: incidentId });
    expect(visitorDetail.data).toBeNull();

    const modDetail = await mod.rpc("incident_detail", { incident_id: incidentId });
    expect((modDetail.data as { status: string }).status).toBe("rejected");
    expect((modDetail.data as { history: unknown[] }).history).toHaveLength(4);
  });
});

describe("moderation_queue", () => {
  it("lists pending incidents oldest first for moderators only", async () => {
    const { client } = await userClient("moderator");
    const { data, error } = await client.rpc("moderation_queue");
    expect(error).toBeNull();
    expect(data!.every((r) => r.status === "pending")).toBe(true);
    const times = data!.map((r) => Date.parse(r.reported_at));
    expect([...times].sort((a, b) => a - b)).toEqual(times);

    const { client: citizen } = await userClient("citizen");
    expect((await citizen.rpc("moderation_queue")).error?.message).toBe("forbidden");
  });
});
