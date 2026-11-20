import { USERS, serviceClient } from "../helpers";
import { expect, signIn, test } from "./fixtures";

/**
 * T067 (constitution V: status change). A moderator verifies a Pending report from the queue,
 * then resolves it on the detail page; chip, progress bar and history update. Also checks
 * corroboration from a second citizen on the map card.
 */

let incidentId = "";
const title = `E2E moderation ${Date.now()}`;

test.beforeAll(async () => {
  const { data, error } = await serviceClient()
    .from("incidents")
    .insert({
      category_id: "landslide",
      title,
      description: "Soil on the road, created by the moderation test.",
      location: "SRID=4326;POINT(121.03 14.61)",
      place_name: "Test barangay",
      severity: "high",
      reporter_id: USERS.citizen.id,
      // Oldest pending report, so it is first in the queue.
      reported_at: "2026-01-01T00:00:00Z",
    })
    .select("id")
    .single();
  if (error) throw error;
  incidentId = data.id;
});

test.afterAll(async () => {
  await serviceClient().from("incidents").delete().eq("id", incidentId);
});

test("moderator verifies then resolves a report", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Runs once, on the desktop project");

  await signIn(page, "moderator");
  await page.goto("/moderate");
  const item = page.locator("li").filter({ hasText: title });
  await expect(item).toBeVisible();
  await item.getByLabel("Moderation note").fill("Confirmed by barangay");
  await item.getByRole("button", { name: "Verify" }).click();
  await expect(item).toHaveCount(0);

  await page.goto(`/incidents/${incidentId}`);
  await expect(page.locator("article span.rounded-full").getByText("Verified", { exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "Verification progress: Verified" })).toBeVisible();
  await page.getByRole("button", { name: "Mark resolved" }).click();
  await expect(page.locator("article span.rounded-full").getByText("Resolved", { exact: true })).toBeVisible();

  const history = page.locator("section").filter({ hasText: "Status history" });
  await expect(history.getByText("Pending → Verified")).toBeVisible();
  await expect(history.getByText("Verified → Resolved")).toBeVisible();
  await expect(history.getByText(/Mod\. Ana Cruz .*Confirmed by barangay/)).toBeVisible();
});

test("a second citizen corroborates; the reporter cannot", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Runs once, on the desktop project");

  await signIn(page, "citizen2");
  await page.goto(`/incidents/${incidentId}`);
  const button = page.getByRole("button", { name: /Corroborate · \d+/ });
  await expect(button).toBeVisible();
  const before = Number((await button.textContent())!.match(/\d+/)![0]);
  await button.click();
  await expect(page.getByRole("button", { name: `Corroborated · ${before + 1}` })).toBeVisible();

  await page.context().clearCookies();
  await signIn(page, "citizen");
  await page.goto(`/incidents/${incidentId}`);
  await expect(page.getByText("You reported this incident")).toBeVisible();
  await expect(page.getByRole("button", { name: /Corroborate/ })).toBeDisabled();
});
