// MapLibre GL v6 loads its web worker from separate .mjs files that Turbopack does not
// bundle. Copy them to public/maplibre/ so MapView can point setWorkerUrl at them.
import { copyFileSync, mkdirSync } from "node:fs";

const files = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];
mkdirSync("public/maplibre", { recursive: true });
for (const f of files) copyFileSync(`node_modules/maplibre-gl/dist/${f}`, `public/maplibre/${f}`);
console.log(`copied ${files.length} MapLibre worker files to public/maplibre/`);
