import zlib from "node:zlib";
import { test as base, expect, type Page } from "@playwright/test";
import { DEMO_PASSWORD, USERS, type DemoUser } from "../helpers";

/** Sign in through the real form. */
export async function signIn(page: Page, who: DemoUser) {
  await page.goto("/profile");
  await page.getByLabel("Email").fill(USERS[who].email);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/profile"));
}

/** A valid 64x48 solid-color PNG built in memory, used as photo evidence. */
export function samplePng(): Buffer {
  const w = 64;
  const h = 48;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 3 + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < w; x++) raw.set([27, 94, 50], row + 1 + x * 3);
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8-bit RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export const test = base;

export { expect };

/** Metro Manila test location (Pasig), granted to every context in playwright.config.ts. */
export const TEST_GEO = { latitude: 14.5764, longitude: 121.0851 };
