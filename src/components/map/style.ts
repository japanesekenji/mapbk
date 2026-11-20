import type { Map as MlMap } from "maplibre-gl";

/** OpenFreeMap vector tiles, no API key (research R3). */
export const BASE_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

/** Basemap palette from the design handoff "Fidelity" section. */
const PALETTE = { land: "#eef2ea", water: "#cde2e6", park: "#dbe9d5", road: "#ffffff", label: "#52645a" };

/**
 * Recolor the stock Positron style to the Bakunawa palette. Matches layers by id so it keeps
 * working if OpenFreeMap adds or renames minor layers; unknown layers keep their own colors.
 */
export function applyPalette(map: MlMap) {
  const style = map.getStyle();
  for (const layer of style.layers ?? []) {
    const id = layer.id.toLowerCase();
    try {
      if (layer.type === "background") {
        map.setPaintProperty(layer.id, "background-color", PALETTE.land);
      } else if (layer.type === "fill" && /water|ocean|lake|river/.test(id)) {
        map.setPaintProperty(layer.id, "fill-color", PALETTE.water);
      } else if (layer.type === "line" && /waterway|river|stream|canal/.test(id)) {
        map.setPaintProperty(layer.id, "line-color", PALETTE.water);
      } else if (layer.type === "fill" && /park|grass|wood|forest|landcover|green|cemetery/.test(id)) {
        map.setPaintProperty(layer.id, "fill-color", PALETTE.park);
      } else if (layer.type === "fill" && /landuse|residential|building/.test(id)) {
        map.setPaintProperty(layer.id, "fill-color", id.includes("building") ? "#e6ebe3" : PALETTE.land);
      } else if (layer.type === "line" && /highway|road|street|motorway|trunk|primary|secondary|tertiary|minor/.test(id)) {
        if (!/casing|outline/.test(id)) map.setPaintProperty(layer.id, "line-color", PALETTE.road);
      } else if (layer.type === "symbol" && /place|label|city|town|village|suburb/.test(id)) {
        map.setPaintProperty(layer.id, "text-color", PALETTE.label);
      }
    } catch {
      // Some layers use expressions we leave alone.
    }
  }
}
