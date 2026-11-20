// T088 / SC-004: time until map pins are visible on a 390px phone with 4x CPU throttling,
// against a production server. Profiles: slow3g (Chrome DevTools "Slow 3G": 400 ms RTT,
// 400 kbps), fast3g (DevTools "Fast 3G": 562.5 ms RTT, 1.44 Mbps down), 4g (150 ms, 9 Mbps).
// Usage: node scripts/perf.mjs [baseUrl] [runs] [profile]
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3001";
const runs = Number(process.argv[3] ?? 3);
const PROFILES = {
  slow3g: { latency: 400, down: 400, up: 400 },
  fast3g: { latency: 562.5, down: 1440, up: 675 },
  "4g": { latency: 150, down: 9000, up: 1500 },
};
const net = PROFILES[process.argv[4] ?? "slow3g"];
const browser = await chromium.launch();
const results = [];
for (let i = 0; i < runs; i++) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: net.latency,
    downloadThroughput: (net.down * 1024) / 8,
    uploadThroughput: (net.up * 1024) / 8,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const t0 = Date.now();
  await page.goto(base + "/", { waitUntil: "commit" });
  await page.waitForSelector(".bk-pin, .maplibregl-canvas", { timeout: 60000 });
  const tCanvas = Date.now() - t0;
  await page.waitForSelector(".bk-pin", { timeout: 60000 });
  const tPins = Date.now() - t0;
  const bytes = await page.evaluate(() =>
    performance.getEntriesByType("resource").reduce((s, e) => s + (e.transferSize || 0), 0),
  );
  results.push({ run: i + 1, firstMapMs: tCanvas, pinsMs: tPins, transferredKB: Math.round(bytes / 1024) });
  await ctx.close();
}
console.log(JSON.stringify(results, null, 1));
await browser.close();
