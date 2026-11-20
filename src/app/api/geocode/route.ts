import { NextResponse, type NextRequest } from "next/server";
import { apiError } from "@/lib/api";

/**
 * GET /api/geocode?q= (contracts/http-api.md, research R10): place search limited to the
 * Philippines through OpenStreetMap Nominatim, at most 1 upstream request per second,
 * cached 24 hours in memory.
 */

type Result = { label: string; lat: number; lng: number; bbox?: [number, number, number, number] };

const cache = new Map<string, { at: number; results: Result[] }>();
const DAY = 86_400_000;
let lastUpstream = 0;

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2 || q.length > 100) {
    return apiError("invalid_input", "Search text must be 2 to 100 characters.", { field: "q" });
  }
  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < DAY) return NextResponse.json({ results: hit.results });

  // Respect Nominatim's 1 request/second policy across all users of this server.
  const wait = lastUpstream + 1000 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastUpstream = Date.now();

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("countrycodes", "ph");
    url.searchParams.set("limit", "6");
    url.searchParams.set("addressdetails", "0");
    const res = await fetch(url, {
      headers: { "User-Agent": "BakunawaDisasterMap/0.1 (community disaster map)", "Accept-Language": "en" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const raw = (await res.json()) as {
      display_name: string;
      lat: string;
      lon: string;
      boundingbox?: [string, string, string, string];
    }[];
    const results: Result[] = raw.map((r) => ({
      label: r.display_name.replace(/, Philippines$/, ""),
      lat: Number(r.lat),
      lng: Number(r.lon),
      bbox: r.boundingbox
        ? [Number(r.boundingbox[2]), Number(r.boundingbox[0]), Number(r.boundingbox[3]), Number(r.boundingbox[1])]
        : undefined,
    }));
    cache.set(key, { at: Date.now(), results });
    if (cache.size > 2000) cache.delete(cache.keys().next().value!);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [], degraded: true });
  }
}
