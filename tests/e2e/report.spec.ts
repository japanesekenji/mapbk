import { serviceClient } from "../helpers";
import { expect, samplePng, signIn, test } from "./fixtures";

/**
 * T042 (constitution V: report submission). A signed-in citizen reports a flood with GPS and
 * 2 photos; the report appears on the map as Pending. A fifth photo is refused.
 */

const marker = `E2E flood report ${Date.now()}`;

test.afterAll(async () => {
  await serviceClient().from("incidents").delete().eq("description", marker);
});

test("citizen submits a flood report with photos", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Runs once, on the desktop project");

  await signIn(page, "citizen");
  await page.goto("/report");

  await page.getByRole("radio", { name: "Flood" }).click();
  // GPS comes from the context geolocation; wait for the accuracy line.
  await expect(page.getByText(/GPS (locked|weak)/)).toBeVisible();
  await page.getByLabel("Details").fill(marker);

  const png = samplePng();
  const input = page.getByTestId("photo-input");
  await input.setInputFiles([
    { name: "a.png", mimeType: "image/png", buffer: png },
    { name: "b.png", mimeType: "image/png", buffer: png },
  ]);
  await expect(page.getByAltText("Selected photo")).toHaveCount(2);

  // Adding three more would exceed 4: only 2 are kept and the limit is explained.
  await input.setInputFiles([
    { name: "c.png", mimeType: "image/png", buffer: png },
    { name: "d.png", mimeType: "image/png", buffer: png },
    { name: "e.png", mimeType: "image/png", buffer: png },
  ]);
  await expect(page.getByText("You can add up to 4 photos.")).toBeVisible();
  await expect(page.getByAltText("Selected photo")).toHaveCount(4);
  await expect(page.getByRole("button", { name: "Add photo" })).toHaveCount(0);

  // Keep two photos for the submission.
  await page.getByRole("button", { name: "Remove photo" }).first().click();
  await page.getByRole("button", { name: "Remove photo" }).first().click();

  await page.getByRole("button", { name: "Submit report" }).click();
  await page.waitForURL(/\/\?select=/);

  const card = page.locator("div.shadow-card:visible").filter({ hasText: marker });
  await expect(card).toBeVisible();
  await expect(card.getByText("Pending")).toBeVisible();

  const { data } = await serviceClient()
    .from("incidents")
    .select("status, incident_photos(id)")
    .eq("description", marker)
    .single();
  expect(data?.status).toBe("pending");
  expect(data?.incident_photos).toHaveLength(2);
});

test("visitors are asked to sign in before reporting", async ({ page }) => {
  await page.goto("/report");
  await expect(page.getByRole("heading", { name: "Sign in to report a hazard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Send an SOS instead" })).toBeVisible();
});
