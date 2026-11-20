import { serviceClient } from "../helpers";
import { expect, signIn, test } from "./fixtures";

/**
 * T054 (constitution V: SOS send, SC-003). A signed-out visitor sends an SOS; a responder in a
 * second browser sees it within 30 s marked "Visitor" and acknowledges it; the visitor's
 * tracking view shows Acknowledged.
 */

const marker = `E2E SOS ${Date.now()}`;

test.afterAll(async () => {
  await serviceClient().from("sos_requests").delete().eq("notes", marker);
});

test("visitor SOS reaches a responder and shows the response state", async ({ browser }, info) => {
  test.skip(info.project.name !== "mobile", "Runs once, on the mobile project (phone-first flow)");
  const geo = { geolocation: { latitude: 14.5764, longitude: 121.0851 }, permissions: ["geolocation"] };

  // Visitor (no account) on a phone.
  const visitorCtx = await browser.newContext({ ...info.project.use, ...geo });
  const visitor = await visitorCtx.newPage();
  await visitor.goto("/sos");
  await visitor.getByRole("radio", { name: "Trapped by flood" }).click();
  await expect(visitor.getByText("Sharing live location")).toBeVisible();
  await visitor.getByRole("button", { name: "More people" }).click();
  await visitor.getByRole("button", { name: "More people" }).click();
  await visitor.getByRole("button", { name: "More people" }).click();
  await visitor.getByLabel("Notes for responders").fill(marker);
  await visitor.getByLabel("Mobile number for callbacks").fill("09175550199");
  await visitor.getByRole("button", { name: "Send SOS" }).click();

  // Explicit confirmation (FR-031).
  await expect(visitor.getByRole("heading", { name: "Send SOS to responders?" })).toBeVisible();
  await visitor.getByRole("button", { name: "Yes, send SOS" }).click();
  await expect(visitor.getByRole("heading", { name: "SOS received" })).toBeVisible();
  await expect(visitor.getByTestId("sos-state")).toHaveText("New");
  const sentAt = Date.now();

  // Responder on desktop.
  const responderCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const responder = await responderCtx.newPage();
  await signIn(responder, "responder");
  await responder.goto("/respond");
  const row = responder.getByRole("button").filter({ hasText: marker });
  await expect(row).toBeVisible({ timeout: 30_000 });
  expect(Date.now() - sentAt).toBeLessThan(30_000);
  await expect(row).toContainText("Visitor");
  await expect(row).toContainText("4 people");

  await row.click();
  await responder.getByRole("button", { name: "Acknowledge", exact: true }).click();
  await expect(row).toContainText("Acknowledged");

  // The visitor's tracking view picks up the new state (reload instead of waiting for the poll).
  await visitor.reload();
  await expect(visitor.getByTestId("sos-state")).toHaveText("Acknowledged");

  await visitorCtx.close();
  await responderCtx.close();
});
