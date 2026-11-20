import AxeBuilder from "@axe-core/playwright";
import { expect, signIn, test } from "./fixtures";

/**
 * T087: automated accessibility scan (WCAG 2.1 A/AA rules in axe-core) on the main screens,
 * desktop and mobile. Fails on serious or critical violations. The map canvas is excluded:
 * its tiles and labels come from the basemap provider.
 */

const PAGES = ["/", "/incidents", "/facilities", "/sos", "/profile", "/report"];

for (const path of PAGES) {
  test(`no serious accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("load");
    await page.waitForTimeout(1500);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .exclude(".maplibregl-canvas-container")
      .exclude(".maplibregl-ctrl-attrib")
      .exclude("nextjs-portal")
      .analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
  });
}

test("no serious accessibility violations on moderator and responder screens", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Desktop staff screens");
  for (const [who, path] of [["moderator", "/moderate"], ["responder", "/respond"]] as const) {
    await page.context().clearCookies();
    await signIn(page, who);
    await page.goto(path);
    await page.waitForTimeout(1500);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .exclude(".maplibregl-canvas-container")
      .exclude(".maplibregl-ctrl-attrib")
      .exclude("nextjs-portal")
      .analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${path} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
  }
});
