// Dev helper: screenshot a page in headless Chromium.
// Usage: node scripts/shot.mjs <path> <out.png> [width] [height] [login-email]
import { chromium } from "@playwright/test";

const [path = "/", out = "shot.png", w = "1440", h = "900", email] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: Number(w), height: Number(h) },
  geolocation: { latitude: 14.5764, longitude: 121.0851 },
  permissions: ["geolocation"],
});
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));
if (email) {
  await page.goto("http://localhost:3000/profile");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(process.env.DEMO_PASSWORD ?? "Bakunawa-demo-2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/profile"), { timeout: 15000 });
}
await page.goto(`http://localhost:3000${path}`, { waitUntil: "load" });
await page.waitForTimeout(Number(process.env.SHOT_WAIT ?? 2500));
await page.screenshot({ path: out });
console.log(JSON.stringify({ out, errors: errors.slice(0, 8) }));
await browser.close();
