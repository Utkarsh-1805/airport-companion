// Single source of truth for the Powermind2 app.
//
// Wraps the new R3F airport map dataset in `../map/data/airportData.new.js`
// and exposes the legacy `airportData` shape that JourneyContext,
// SmartServices, and ExplorePage already consume.
//
// Nothing in this module depends on the old "Airport Rag" dataset anymore.

import {
  SHOPS,
  GATES,
  RESTROOMS,
  KIOSKS,
  ESCALATORS,
  SECURITY,
  ENTRANCES,
  CHECKIN_ROWS,
  LANDSIDE_AMENITIES,
  VEHICLE_GATES,
  ZONES,
  DUTY_FREE,
} from "../map/data/airportData.js";
import { amenityContent } from "./amenityContent.js";

// ─── Image helpers ───────────────────────────────────────────────────────
// Use Unsplash's source endpoint with query keywords. The browser fetches
// a fresh photo per keyword combination, so each "shop" gets a contextually
// relevant airport-interior image without us shipping any binary assets.
function imageKeywords(shop) {
  const t = shop.type;
  const n = shop.name.toLowerCase();
  const tokens = ["airport", "interior"];
  if (n.includes("starbucks") || n.includes("coffee") || n.includes("cafe") || n.includes("chai") || n.includes("tim hortons")) tokens.push("coffee", "cafe");
  else if (n.includes("kfc") || n.includes("chicken")) tokens.push("fried-chicken", "fast-food");
  else if (n.includes("subway") || n.includes("sandwich")) tokens.push("sandwich", "deli");
  else if (n.includes("burger") || n.includes("mcdonald") || n.includes("carl")) tokens.push("burger", "fast-food");
  else if (n.includes("pizza")) tokens.push("pizza");
  else if (n.includes("dhaba") || n.includes("punjab") || n.includes("maiyas") || n.includes("ulavacharu") || n.includes("biryani") || n.includes("masala")) tokens.push("indian-food", "thali");
  else if (n.includes("biba") || n.includes("kurta") || n.includes("fab india")) tokens.push("indian-fashion", "boutique");
  else if (n.includes("crocs") || n.includes("skechers") || n.includes("samsonite") || n.includes("mochi")) tokens.push("shoe-store", "retail");
  else if (n.includes("pearl") || n.includes("krishna") || n.includes("swarovski")) tokens.push("jewelry", "luxury-store");
  else if (n.includes("duty") || shop.id === "A-df") tokens.push("duty-free", "perfume", "luxury-store");
  else if (n.includes("apollo") || n.includes("pharmacy")) tokens.push("pharmacy", "drugstore");
  else if (n.includes("mobile") || n.includes("electronics")) tokens.push("electronics", "tech-store");
  else if (n.includes("haldiram") || n.includes("bakery") || n.includes("karachi") || n.includes("dadu") || n.includes("almond")) tokens.push("indian-sweets", "bakery");
  else if (n.includes("doner") || n.includes("gyros")) tokens.push("kebab", "shawarma");
  else if (n.includes("body shop") || n.includes("kama") || n.includes("forest") || n.includes("nykaa")) tokens.push("cosmetics", "beauty-store");
  else if (n.includes("relay") || n.includes("books")) tokens.push("bookstore", "magazines");
  else if (t === "food") tokens.push("restaurant", "food-court");
  else if (t === "service") tokens.push("airport-service");
  else tokens.push("retail-store");
  return tokens;
}

function imageFor(shop) {
  const seed = encodeURIComponent(shop.id);
  const keywords = imageKeywords(shop).map(encodeURIComponent).join(",");
  // Loremflickr is more reliable than source.unsplash.com (which returns
  // 503s under load). Both serve a real photo matching the keywords.
  return `https://loremflickr.com/600/400/${keywords}?lock=${seed}`;
}

function shopDescription(shop) {
  const c = amenityContent[shop.id];
  if (c) {
    const parts = [];
    if (c.cuisine) parts.push(c.cuisine);
    if (c.price) parts.push(c.price === "$" ? "₹ budget" : c.price === "$$" ? "₹₹ mid-range" : "₹₹₹ premium");
    if (c.signature?.length) parts.push(`signature: ${c.signature[0]}`);
    else if (c.products?.length) parts.push(`stocks: ${c.products[0]}`);
    if (parts.length) return parts.join(" · ");
  }
  if (shop.type === "food") return "Food & beverage outlet inside Terminal 2.";
  if (shop.type === "service") return "Service counter inside Terminal 2.";
  return "Retail store inside Terminal 2.";
}

// --- Zone classification ---------------------------------------------------
function zoneFromShop(shop) {
  if (shop.type === "food") return "airside_food";
  if (shop.type === "service") return "airside_services";
  return "airside_retail";
}

function wingFromX(x) {
  if (x >= 66) return "east";
  if (x >= -8) return "central";
  return "west";
}

// --- Build navigation_graph.nodes -----------------------------------------
function shopNode(shop) {
  return {
    id: shop.id,
    label: shop.name,
    position: shop.position,
    type: shop.type,
    zone: zoneFromShop(shop),
    terminal: "Terminal 2",
    services: [],
    accessibility: [],
    wing: wingFromX(shop.position[0]),
  };
}

function restroomNode(r) {
  return {
    id: r.id,
    label: r.name,
    position: r.position,
    type: "restroom",
    zone: "airside_services",
    terminal: "Terminal 2",
    services: ["restroom"],
    accessibility: r.accessible ? ["wheelchair"] : [],
  };
}

function kioskNode(k) {
  return {
    id: k.id,
    label: k.name,
    position: k.position,
    type: "service",
    zone: "airside_services",
    terminal: "Terminal 2",
    services: ["info"],
    accessibility: [],
  };
}

function escalatorNode(e) {
  return {
    id: e.id,
    label: e.name,
    position: e.position,
    type: "escalator",
    zone: "airside_services",
    terminal: "Terminal 2",
    services: ["vertical-circulation"],
    accessibility: [],
  };
}

function gateNode(g) {
  return {
    id: g.id,
    label: g.name,
    position: g.position,
    type: "gate",
    zone: "gate_piers",
    terminal: "Terminal 2",
    services: [],
    accessibility: [],
    flight_info: g.name,
  };
}

function securityNode(s) {
  return {
    id: s.id,
    label: s.name,
    position: s.position,
    type: "security",
    zone: "security",
    terminal: "Terminal 2",
    services: ["security"],
    accessibility: [],
  };
}

function entranceNode(e) {
  return {
    id: e.id,
    label: e.name,
    position: e.position,
    type: "entry",
    zone: "landside",
    terminal: "Terminal 2",
    services: ["entry"],
    accessibility: [],
  };
}

function checkInNode(c) {
  return {
    id: c.id,
    label: `${c.airline} Check-in`,
    position: c.position,
    type: "service",
    zone: "landside",
    terminal: "Terminal 2",
    services: ["check-in", "bag-drop"],
    accessibility: [],
    airline: c.airline,
  };
}

function landsideAmenityNode(a) {
  return {
    id: a.id,
    label: a.name,
    position: a.position,
    type: a.kind === "kiosk" ? "service" : "service",
    zone: "landside",
    terminal: "Terminal 2",
    services: [a.kind || "service"],
    accessibility: [],
  };
}

// --- Hub aliases -----------------------------------------------------------
// Synthetic nodes the rest of the app already depends on (departureStages,
// inferDestination defaults, etc.). Each one points at a real position in
// the new layout.
function hubNode(id, label, position, type, zone) {
  return {
    id,
    label,
    position,
    type,
    zone,
    terminal: "Terminal 2",
    services: [],
    accessibility: [],
    isHub: true,
  };
}

const middleEntrance = ENTRANCES[Math.floor(ENTRANCES.length / 2)];
const middleCheckIn = CHECKIN_ROWS[Math.floor(CHECKIN_ROWS.length / 2)];
const centralSecurity = SECURITY.find((s) => s.id === "SEC-C") || SECURITY[0];
const defaultGate = GATES.find((g) => g.id === "G23") || GATES[0];
const dutyFreePos = DUTY_FREE[0]?.position || [105, 0, 0];

const HUB_NODES = [
  hubNode("Curbside_C", "Curbside (Central)", middleEntrance.position, "entry", "landside"),
  hubNode("CheckIn_Hub", "Check-in Hub", middleCheckIn.position, "service", "landside"),
  hubNode("Sec_Hub", "Security Hub", centralSecurity.position, "security", "security"),
  hubNode("Imm_Hub", "Immigration Hub", [centralSecurity.position[0], 0, centralSecurity.position[2] - 4], "security", "immigration"),
  hubNode("Plaza_Hub", "Airside Plaza", [0, 0, 0], "service", "airside_food"),
  hubNode("Gate_B4", defaultGate.name, defaultGate.position, "gate", "gate_piers"),
  hubNode("Lounge_T2", "Quiet Lounge (Aviserv)", [180, 0, 5], "lounge", "airside_services"),
  hubNode("Security_T2", "Security Check", centralSecurity.position, "security", "security"),
  hubNode("Restrooms_T2", "Restrooms", [70, 0, 22], "restroom", "airside_services"),
];

// --- Legacy shop ID aliases -----------------------------------------------
// Old code (inferDestination) refers to "shop_01"…"shop_08". Map them onto
// representative real shops so existing routing logic still works.
const SHOP_ALIASES = [
  { alias: "shop_01", target: "A-stb" },     // coffee → Starbucks (East Wing)
  { alias: "shop_02", target: "B-hyd" },     // gifts/local → Hyderabad Street
  { alias: "shop_03", target: "A-mob" },     // electronics → Mobile Shield
  { alias: "shop_04", target: "A-cl"  },     // craft / souvenirs
  { alias: "shop_05", target: "A-apo" },     // pharmacy → Apollo
  { alias: "shop_06", target: "B-pat" },     // pharmacy/wellness → Patanjali
  { alias: "shop_07", target: "A-biba" },    // fashion → Biba
  { alias: "shop_08", target: "A-df"  },     // duty free
];

function dutyFreeNode() {
  const d = DUTY_FREE[0];
  return {
    id: d.id, // "A-df"
    label: d.name,
    position: d.position,
    type: "shopping",
    zone: "airside_retail",
    terminal: "Terminal 2",
    services: ["duty-free"],
    accessibility: [],
  };
}

// --- Assemble nodes --------------------------------------------------------
const realNodes = [
  ...SHOPS.map(shopNode),
  ...RESTROOMS.map(restroomNode),
  ...KIOSKS.map(kioskNode),
  ...ESCALATORS.map(escalatorNode),
  ...GATES.map(gateNode),
  ...SECURITY.map(securityNode),
  ...ENTRANCES.map(entranceNode),
  ...CHECKIN_ROWS.map(checkInNode),
  ...LANDSIDE_AMENITIES.map(landsideAmenityNode),
  dutyFreeNode(),
];

const aliasNodes = SHOP_ALIASES.map(({ alias, target }) => {
  const base = realNodes.find((n) => n.id === target);
  if (!base) return null;
  return { ...base, id: alias, label: base.label, isAlias: true, aliasOf: target };
}).filter(Boolean);

const allNodes = [...realNodes, ...HUB_NODES, ...aliasNodes];
const nodeById = new Map(allNodes.map((n) => [n.id, n]));

// --- Edges/graph -----------------------------------------------------------
// We don't need a true shortest-path graph for the legacy consumers — they
// only use walkWeight() between two node ids. We still emit empty edges/graph
// so that `airportData.navigation_graph.{edges,graph}` exist if anything
// reads them defensively.
const edges = [];
const graph = Object.fromEntries(allNodes.map((n) => [n.id, {}]));

// --- Zones (for any consumer that reads them) -----------------------------
const adaptedZones = ZONES.map((z) => ({
  id: z.id,
  name: z.name,
  color: z.color,
  // No precise polygon in the new dataset — synthesise a rectangle from
  // center+size so callers that iterate polygons don't crash.
  polygon: [
    [z.center[0] - z.size[0] / 2, z.center[2] - z.size[1] / 2],
    [z.center[0] + z.size[0] / 2, z.center[2] - z.size[1] / 2],
    [z.center[0] + z.size[0] / 2, z.center[2] + z.size[1] / 2],
    [z.center[0] - z.size[0] / 2, z.center[2] + z.size[1] / 2],
  ],
}));

// --- Adapted shops (legacy shape) -----------------------------------------
const adaptedShops = SHOPS.map((shop) => ({
  id: shop.id,
  node_id: shop.id,
  name: shop.name,
  category: shop.type === "food" ? "food" : shop.type === "service" ? "service" : "retail",
  zone: zoneFromShop(shop),
  terminal: "Terminal 2",
  position: shop.position,
  description: shop.name,
  offers: shop.name,
  visual_color: shop.color,
  estimated_visit_minutes: 8,
  open_hours: "06:00–22:00",
  crowd_level: null,
  rating: null,
  review_count: null,
  tag: shop.type,
}));

const adaptedGates = GATES.map((g) => ({
  id: g.id.replace(/^G/, ""),
  node_id: g.id,
  name: g.name,
  position: g.position,
  side: g.side,
  flight_info: g.name,
}));

// --- Public legacy-shape object -------------------------------------------
export const airportData = {
  shops: adaptedShops,
  gates: adaptedGates,
  zones: adaptedZones,
  navigation_graph: {
    nodes: allNodes,
    edges,
    graph,
    start_node: "Curbside_C",
  },
};

// --- Default flight (form data only) --------------------------------------
export const defaultFlight = {
  number: "",
  from: "",
  to: "",
  gate: "23",
  terminal: "Terminal 2",
  boarding: "09:45",
};

// --- Voice / idle status copy ---------------------------------------------
export const voiceResponses = {
  idle: "Ask me where to go, what is open, or what fits your boarding buffer.",
  listening: "Listening... try: Where is coffee? Can I make it before boarding?",
  processing: "Checking walking distance, queue, gate buffer, and airport directory.",
  speaking: "",
};

// --- Departure-flow stages ------------------------------------------------
export const departureStages = [
  { id: "entry", title: "Airport Entry", detail: "Terminal 2 curbside", zone: "landside", anchorNodeId: "Curbside_C" },
  { id: "checkin", title: "Check-in", detail: "Counters and bag drop", zone: "landside", anchorNodeId: "CheckIn_Hub" },
  { id: "security", title: "Security Screening", detail: "Trays, scanners, liquids check", zone: "security", anchorNodeId: "Sec_Hub" },
  { id: "immigration", title: "Immigration", detail: "Passport control / e-gates", zone: "immigration", anchorNodeId: "Imm_Hub", optional: true },
  { id: "airside", title: "Airside Plaza", detail: "Shops, food, lounges, services", zone: "airside_food", anchorNodeId: "Plaza_Hub" },
  { id: "boarding", title: "Boarding", detail: "At your gate", zone: "gate_piers", anchorNodeId: "Gate_B4" },
];

// --- Zone progression order ----------------------------------------------
export const ZONE_ORDER = [
  "landside",
  "security",
  "immigration",
  "airside_retail",
  "airside_food",
  "airside_services",
  "gate_piers",
  "arrival",
];

export const zoneIndex = (zone) => {
  const i = ZONE_ORDER.indexOf(zone);
  return i === -1 ? Number.POSITIVE_INFINITY : i;
};

// --- Smart-services tabs --------------------------------------------------
export const serviceTabs = [
  { id: "food", label: "Food" },
  { id: "shops", label: "Shops" },
  { id: "lounges", label: "Lounges" },
  { id: "services", label: "Services" },
  { id: "restrooms", label: "Restrooms" },
];

// --- Explore items --------------------------------------------------------
export function buildExploreItems() {
  const items = [];

  SHOPS.forEach((shop) => {
    const tab = shop.type === "food" ? "food" : "shops";
    const c = amenityContent[shop.id];
    items.push({
      id: `shop:${shop.id}`,
      name: shop.name,
      category: tab,
      type: shop.type,
      zone: zoneFromShop(shop),
      nodeId: shop.id,
      terminal: "Terminal 2",
      description: shopDescription(shop),
      offers: c?.offers || null,
      rating: null,
      review_count: null,
      hours: "06:00–22:00",
      crowd_level: c?.crowd || null,
      est_visit: 8,
      visual_color: shop.color,
      image: imageFor(shop),
      menu: c?.menu || null,
      products: c?.products || null,
      services: c?.services || null,
      signature: c?.signature || null,
      price_tier: c?.price || null,
      shop: { ...shop, visual_color: shop.color, tag: shop.type, image: imageFor(shop), amenity: c },
      kind: "shop",
    });
  });

  // Duty Free
  DUTY_FREE.forEach((d) => {
    const c = amenityContent[d.id];
    const img = `https://loremflickr.com/600/400/airport,duty-free,perfume,luxury-store?lock=${encodeURIComponent(d.id)}`;
    items.push({
      id: `shop:${d.id}`,
      name: d.name,
      category: "shops",
      type: "duty-free",
      zone: "airside_retail",
      nodeId: d.id,
      terminal: "Terminal 2",
      description: c ? `${c.cuisine || "Tax-free retail"} · ${(c.products || []).slice(0, 2).join(", ")}` : "Tax-free liquor, fragrance, cosmetics, gifting.",
      offers: c?.offers || null,
      products: c?.products || null,
      visual_color: d.color,
      image: img,
      shop: { ...d, tag: "duty-free", visual_color: d.color, image: img, amenity: c },
      kind: "shop",
    });
  });

  RESTROOMS.forEach((r) => {
    items.push({
      id: `node:${r.id}`,
      name: r.name,
      category: "restrooms",
      type: "restroom",
      zone: "airside_services",
      nodeId: r.id,
      terminal: "Terminal 2",
      description: `${r.name} (${r.accessible ? "accessible" : "standard"}).`,
      services: ["restroom"],
      accessibility: r.accessible ? ["wheelchair"] : [],
      kind: "service",
    });
  });

  KIOSKS.forEach((k) => {
    items.push({
      id: `node:${k.id}`,
      name: k.name,
      category: "services",
      type: "service",
      zone: "airside_services",
      nodeId: k.id,
      terminal: "Terminal 2",
      description: k.name,
      services: ["info"],
      accessibility: [],
      kind: "service",
    });
  });

  // Lounge — use Aviserv Sleeping (closest concept to lounge in the new data)
  items.push({
    id: "node:Lounge_T2",
    name: "Quiet Lounge",
    category: "lounges",
    type: "lounge",
    zone: "airside_services",
    nodeId: "Lounge_T2",
    terminal: "Terminal 2",
    description: "Quiet rest area near East Wing.",
    services: ["seating", "wifi"],
    accessibility: [],
    kind: "service",
  });

  return items;
}

// --- Walking distance helpers --------------------------------------------
// All nodes are placed on a single floor — Euclidean distance is a fine
// proxy for "walking weight" given how dense the corridors are.
export function walkWeight(fromNodeId, toNodeId) {
  if (!fromNodeId || !toNodeId) return Number.POSITIVE_INFINITY;
  if (fromNodeId === toNodeId) return 0;
  const a = nodeById.get(fromNodeId);
  const b = nodeById.get(toNodeId);
  if (!a || !b) return Number.POSITIVE_INFINITY;
  return Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]);
}

// World units → friendly walking minutes. Tuned so a full-terminal traverse
// (~300 units) lands around 12–14 minutes.
export function walkMinutes(weight) {
  if (!isFinite(weight)) return null;
  const mins = Math.max(1, Math.round(weight / 22));
  return Math.min(28, mins);
}

// --- Re-export the new dataset ------------------------------------------
// Anything that wants the new (canonical) dataset can pull it through this
// module too — the rest of the app then has a single import surface.
export {
  SHOPS,
  GATES,
  RESTROOMS,
  KIOSKS,
  ESCALATORS,
  SECURITY,
  ENTRANCES,
  CHECKIN_ROWS,
  LANDSIDE_AMENITIES,
  VEHICLE_GATES,
  ZONES,
  DUTY_FREE,
} from "../map/data/airportData.js";

// Helper that the AirportScene wrapper uses to resolve any "destination" id
// (legacy or alias) to a position in the new layout.
export function resolveDestinationPosition(destinationId) {
  if (!destinationId) return null;
  const node = nodeById.get(destinationId);
  if (node) return node.position;
  // Try common normalisations (e.g. "Gate_23" → "G23")
  const m = String(destinationId).match(/Gate_?([A-Z]?\d+[A-Z]?)/i);
  if (m) {
    const candidate = `G${m[1].toUpperCase()}`;
    const g = nodeById.get(candidate);
    if (g) return g.position;
  }
  return null;
}

export function resolveDestinationNode(destinationId) {
  if (!destinationId) return null;
  return nodeById.get(destinationId) || null;
}
