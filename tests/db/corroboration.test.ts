import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { USERS, anonClient, serviceClient, userClient } from "../helpers";

/** T066: one corroboration per user, toggling, no self-corroboration, Visitors refused. */

let incidentId = "";

beforeAll(async () => {
  const { data, error } = await serviceClient()
    .from("incidents")
    .insert({
      category_id: "flood",
      title: "Corroboration test",
      description: "db test",
      location: "SRID=4326;POINT(121.02 14.62)",
      severity: "high",
      reporter_id: USERS.citizen.id,
      corroboration_count: 5,
    })
    .select("id")
    .single();
  if (error) throw error;
  incidentId = data.id;
});

afterAll(async () => {
  await serviceClient().from("incidents").delete().eq("id", incidentId);
});

const count = async () =>
  (await serviceClient().from("incidents").select("corroboration_count").eq("id", incidentId).single()).data!
    .corroboration_count;

describe("toggle_corroboration", () => {
  it("adds one corroboration and then withdraws it", async () => {
    const { client } = await userClient("citizen2");
    const on = await client.rpc("toggle_corroboration", { incident_id: incidentId });
    expect(on.data).toEqual({ corroborated: true, corroboration_count: 6 });
    const off = await client.rpc("toggle_corroboration", { incident_id: incidentId });
    expect(off.data).toEqual({ corroborated: false, corroboration_count: 5 });
    expect(await count()).toBe(5);
  });

  it("counts each user once", async () => {
    const a = (await userClient("citizen2")).client;
    const b = (await userClient("moderator")).client;
    await a.rpc("toggle_corroboration", { incident_id: incidentId });
    await b.rpc("toggle_corroboration", { incident_id: incidentId });
    expect(await count()).toBe(7);
    const rows = await serviceClient().from("corroborations").select("user_id").eq("incident_id", incidentId);
    expect(rows.data).toHaveLength(2);
  });

  it("refuses the reporter's own report", async () => {
    const { client } = await userClient("citizen");
    const r = await client.rpc("toggle_corroboration", { incident_id: incidentId });
    expect(r.error?.message).toBe("own_report");
  });

  it("refuses Visitors", async () => {
    const r = await anonClient().rpc("toggle_corroboration", { incident_id: incidentId });
    expect(r.error?.message).toBe("auth_required");
  });

  it("does not change status", async () => {
    const { data } = await serviceClient().from("incidents").select("status").eq("id", incidentId).single();
    expect(data?.status).toBe("pending");
  });
});
