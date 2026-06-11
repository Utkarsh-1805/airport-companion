import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { airportData } from "../src/airportData.js";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "..", "data");
mkdirSync(outDir, { recursive: true });

const outPath = resolve(outDir, "airport-corpus.json");
writeFileSync(outPath, JSON.stringify(airportData, null, 2));
console.log(`wrote ${outPath}`);
