import { describe, expect, it } from "vitest";
import { clampBounds, directionsUrl, distanceKm, inServiceArea } from "@/lib/geo";
import { isOlderThan, rangeStart, timeAgo } from "@/lib/time";
import { isOutsideServiceArea, locationSchema, phoneSchema } from "@/lib/validation/common";
import { verificationSteps } from "@/lib/taxonomy";

describe("geo", () => {
  it("accepts Metro Manila and rejects the South China Sea (quickstart V14)", () => {
    expect(inServiceArea({ lat: 14.6219, lng: 121.0146 })).toBe(true);
    expect(inServiceArea({ lat: 10, lng: 110 })).toBe(false);
    expect(isOutsideServiceArea({ lat: 10, lng: 110 })).toBe(true);
  });

  it("clamps bounds to the service area", () => {
    expect(clampBounds({ minLng: 100, minLat: 0, maxLng: 140, maxLat: 30 })).toEqual({
      minLng: 116,
      minLat: 4.5,
      maxLng: 127,
      maxLat: 21.5,
    });
  });

  it("computes great-circle distance", () => {
    // Quezon City Hall to Pasig City Hall is roughly 9 km.
    const km = distanceKm({ lat: 14.6466, lng: 121.0503 }, { lat: 14.5605, lng: 121.0779 });
    expect(km).toBeGreaterThan(8);
    expect(km).toBeLessThan(11);
  });

  it("builds a Google Maps directions link", () => {
    expect(directionsUrl({ lat: 14.5, lng: 121 })).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=14.500000,121.000000",
    );
  });
});

describe("time", () => {
  const now = Date.parse("2026-11-21T03:00:00Z");

  it("formats relative times", () => {
    expect(timeAgo("2026-11-21T02:59:30Z", now)).toBe("just now");
    expect(timeAgo("2026-11-21T02:42:00Z", now)).toBe("18 min ago");
    expect(timeAgo("2026-11-21T01:00:00Z", now)).toBe("2 hr ago");
    expect(timeAgo("2026-11-18T03:00:00Z", now)).toBe("3 days ago");
  });

  it("computes range starts", () => {
    expect(rangeStart("1h", now)).toBe("2026-11-21T02:00:00.000Z");
    expect(rangeStart("7d", now)).toBe("2026-11-14T03:00:00.000Z");
  });

  it("flags facility statuses older than 24 hours", () => {
    expect(isOlderThan("2026-11-20T02:00:00Z", 24, now)).toBe(true);
    expect(isOlderThan("2026-11-20T04:00:00Z", 24, now)).toBe(false);
    expect(isOlderThan(null, 24, now)).toBe(true);
  });
});

describe("validation", () => {
  it("normalizes and validates PH phone numbers", () => {
    expect(phoneSchema.parse("0917 123 4567")).toBe("09171234567");
    expect(phoneSchema.parse("+639171234567")).toBe("+639171234567");
    expect(phoneSchema.safeParse("12345").success).toBe(false);
  });

  it("validates locations", () => {
    expect(locationSchema.safeParse({ lat: 14.6, lng: 121, accuracy_m: 8 }).success).toBe(true);
    expect(locationSchema.safeParse({ lat: 91, lng: 121 }).success).toBe(false);
  });
});

describe("verification steps", () => {
  it("fills the progress bar per data-model.md", () => {
    expect(verificationSteps("pending", 0)).toBe(1);
    expect(verificationSteps("pending", 3)).toBe(2);
    expect(verificationSteps("verified", 0)).toBe(3);
    expect(verificationSteps("resolved", 9)).toBe(4);
  });
});
