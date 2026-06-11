// Airport layout data — derived from reference images.
//
// Coordinate system:
//   +X = east  (along main concourse)
//   +Z = south (toward landside / front of the terminal)
//   +Y = up
//
// USER FLOW (south → north):
//
//   Z = +56  ENTRANCE doors          — landside curbside drop-off
//   Z = +48  CHECK-IN counters       — airline rows
//   Z = +40  Pre-security queue
//   Z = +36  SECURITY barrier        — the only crossing point to airside
//   Z = +28  South boarding pier (gates)
//   Z =  +0  Airside concourse       — shops, food, duty free
//   Z = -28  North boarding pier (gates)
//
// Every airside shop is placed in exactly one Z-strip so AABBs never
// intersect. Different zones use different strip densities — Zone C
// (West Wing) is dense brand retail so it gets more strips; Zone A
// (East Wing) is the food court + duty free so it gets bigger blocks.

export const COLORS = {
  food:        '#7FCBC9',
  foodAlt:     '#9FD8D7',
  retail:      '#F2A85C',
  retailAlt:   '#F6BC7E',
  restroom:    '#7FB069',
  dutyFree:    '#F6C26B',
  building:    '#E8E8E0',
  buildingAlt: '#D9D9D0',
  escalator:   '#3F76C9',
  security:    '#1F3A8A',
  seating:     '#5BB0B5',
  seatFrame:   '#F4F4F0',
  floor:       '#F2F2EC',
  pathway:     '#FAFAF5',
  wayfinding:  '#FFC857',  // gold path stripes on floor
  airline:     '#1E3A8A',  // dark navy for check-in counters
  highlight:   '#FBBF24',
  user:        '#EF4444'
}

// ─── Z-STRIPS (airside) ──────────────────────────────────────────────────
// Each strip has a center Z and an implicit max depth. Sequential strips
// have ≥1m gaps so adjacent rows can never overlap.
const GATE_N    = -28
const SEAT_N    = -22
const CAFE_N    = -16   // depth 4
const SHOP_N    = -10   // depth 4
const CENTER    =   0   // depth 8 (Zone A duty free) / shared walkway
const FOOD_S    =   9   // depth 7 (food court row)
const AMEN_S    =  16   // depth 4 (small south retail / amenities)
const SEAT_S    =  22
const GATE_S    =  28

// Zone C uses additional strips because the West Wing is denser brand retail.
const C_BRAND_N = -10   // depth 4 — premium brand row above food cluster
const C_FOOD_N  =  -4   // depth 4 — central food cluster (Maiyas / KFC etc)
const C_ORANGE  =  +1   // depth 3 — small orange retail (Dadu's row)
const C_FOOD_S  =  +5   // depth 4 — second food row (Brioche Doree etc)
const C_BRAND_S = +11   // depth 4 — DA Milano / Swarovski / Biba row
const C_PREMIUM = +17   // depth 5 — Porsche / Mochi / Skechers row

// Landside strips
export const Z_SECURITY = 36
export const Z_CHECKIN  = 48
export const Z_ENTRANCE = 56

// ═════════════════════════════════════════════════════════════════════════
// ZONE A — EAST WING  (X: 66 → 175)   Gates 26A–36, Duty Free, Food Court
// ═════════════════════════════════════════════════════════════════════════
const zoneA_shops = [
  // CAFE_N strip — small north cafés
  { id: 'A-mil', name: 'Millies Cookies & Creamstone', type: 'food',    position: [78,  0, CAFE_N], size: [10, 4, 4], color: COLORS.food },
  { id: 'A-mcs', name: 'Minerva Coffee Shop',          type: 'food',    position: [92,  0, CAFE_N], size: [8,  4, 4], color: COLORS.foodAlt },
  { id: 'A-pza', name: 'Pizza House',                  type: 'food',    position: [104, 0, CAFE_N], size: [8,  4, 4], color: COLORS.food },
  { id: 'A-dnr', name: 'Doner & Gyros',                type: 'food',    position: [116, 0, CAFE_N], size: [8,  4, 4], color: COLORS.foodAlt },
  { id: 'A-cnf', name: 'Cafe Niloufer',                type: 'food',    position: [128, 0, CAFE_N], size: [8,  4, 4], color: COLORS.food },
  { id: 'A-hcs', name: 'HCS Massage Chair',            type: 'service', position: [140, 0, CAFE_N], size: [6,  3, 4], color: COLORS.buildingAlt },
  { id: 'A-chp', name: 'Chai Point',                   type: 'food',    position: [165, 0, CAFE_N], size: [6,  4, 4], color: COLORS.food },

  // Tiny kiosk row tucked between Duty Free and the food court (image 6)
  { id: 'A-apl', name: 'Apollon',         type: 'retail', position: [115, 0, +4.25], size: [4, 3, 2], color: COLORS.retailAlt },
  { id: 'A-spk', name: 'Sparkles',        type: 'retail', position: [120, 0, +4.25], size: [4, 3, 2], color: COLORS.retail },
  { id: 'A-anj', name: 'Anutomu Jelpa',   type: 'retail', position: [125, 0, +4.25], size: [4, 3, 2], color: COLORS.retailAlt },
  { id: 'A-bkn', name: 'Bikanervala',     type: 'food',   position: [130, 0, +4.25], size: [4, 3, 2], color: COLORS.retail },

  // SHOP_N strip — north retail row (Craft's Lane)
  { id: 'A-cl',  name: "Craft's Lane",       type: 'retail',  position: [80,  0, SHOP_N], size: [10, 4, 4], color: COLORS.retail },
  { id: 'A-mob', name: 'Mobile Shield',      type: 'service', position: [92,  0, SHOP_N], size: [8,  3, 4], color: COLORS.buildingAlt },
  { id: 'A-biba',name: 'Biba',               type: 'retail',  position: [102, 0, SHOP_N], size: [6,  4, 4], color: COLORS.retail },
  { id: 'A-kma', name: 'Kama Ayurveda',      type: 'retail',  position: [110, 0, SHOP_N], size: [6,  4, 4], color: COLORS.retailAlt },
  { id: 'A-kp',  name: 'Krishna Pearls',     type: 'retail',  position: [118, 0, SHOP_N], size: [6,  4, 4], color: COLORS.retail },
  { id: 'A-apt', name: 'Airport',            type: 'retail',  position: [126, 0, SHOP_N], size: [6,  4, 4], color: COLORS.retailAlt },

  // FOOD_S strip — main food court row (south of Duty Free)
  { id: 'A-kfc', name: 'KFC',          type: 'food', position: [82,  0, FOOD_S], size: [14, 5, 7], color: COLORS.food },
  { id: 'A-sub', name: 'Subway',       type: 'food', position: [98,  0, FOOD_S], size: [14, 5, 7], color: COLORS.food },
  { id: 'A-cjr', name: "Carl's Jr",    type: 'food', position: [114, 0, FOOD_S], size: [12, 5, 7], color: COLORS.food },
  { id: 'A-dhb', name: 'Dhaba 1986',   type: 'food', position: [126, 0, FOOD_S], size: [8,  5, 7], color: COLORS.foodAlt },
  { id: 'A-stb', name: 'Starbucks',    type: 'food', position: [140, 0, FOOD_S], size: [14, 5, 7], color: COLORS.food },

  // AMEN_S strip — small south retail near south gates
  { id: 'A-apo', name: 'Apollo',     type: 'retail', position: [132, 0, AMEN_S], size: [5, 4, 4], color: COLORS.retail },
  { id: 'A-sml', name: 'Smilen',     type: 'retail', position: [139, 0, AMEN_S], size: [5, 4, 4], color: COLORS.retailAlt },
  { id: 'A-rly', name: 'Relay',      type: 'retail', position: [146, 0, AMEN_S], size: [5, 4, 4], color: COLORS.retail },
  { id: 'A-htk', name: 'Hatti Kapi', type: 'retail', position: [153, 0, AMEN_S], size: [5, 4, 4], color: COLORS.retailAlt },

  // McDonald's — far-east south extension
  { id: 'A-mcd', name: "McDonald's", type: 'food', position: [170, 0, 13], size: [12, 5, 6], color: COLORS.food }
]

// Duty Free oval — Zone A CENTER strip. Depth shrunk to 6 so the kiosk
// row at Z=+4.25 has clean margin on both sides.
const zoneA_dutyFree = [
  { id: 'A-df', name: 'Duty Free Area', position: [105, 0, CENTER], size: [40, 4.5, 6], color: COLORS.dutyFree, oval: true }
]

// ═════════════════════════════════════════════════════════════════════════
// ZONE B — CENTRAL  (X: -8 → 65)   Gates 21–25A, retail row
// ═════════════════════════════════════════════════════════════════════════
const zoneB_shops = [
  // CAFE_N strip
  { id: 'B-msk', name: 'Masala Kitchen F&B', type: 'food', position: [22, 0, CAFE_N], size: [10, 5, 4], color: COLORS.food },

  // SHOP_N strip — long retail row (image 8: ODE Spa → Patanjali)
  { id: 'B-ode', name: 'ODE Spa',        type: 'service', position: [-5, 0, SHOP_N], size: [6, 4, 4], color: COLORS.restroom },
  { id: 'B-hor', name: 'House of Rare',  type: 'retail',  position: [4,  0, SHOP_N], size: [8, 5, 4], color: COLORS.foodAlt },
  { id: 'B-gpr', name: 'G.Pulla Reddy',  type: 'retail',  position: [14, 0, SHOP_N], size: [4, 4, 4], color: COLORS.retail },
  { id: 'B-hld', name: 'Haldirams',      type: 'food',    position: [20, 0, SHOP_N], size: [4, 4, 4], color: COLORS.retailAlt },
  { id: 'B-dad', name: "Dadu's",         type: 'food',    position: [26, 0, SHOP_N], size: [4, 4, 4], color: COLORS.retail },
  { id: 'B-alm', name: 'Almond House',   type: 'food',    position: [32, 0, SHOP_N], size: [4, 4, 4], color: COLORS.retailAlt },
  { id: 'B-crl', name: 'Carlton',        type: 'retail',  position: [40, 0, SHOP_N], size: [4, 4, 4], color: COLORS.retail },
  { id: 'B-pat', name: 'Patanjali',      type: 'retail',  position: [46, 0, SHOP_N], size: [4, 4, 4], color: COLORS.retailAlt },
  { id: 'B-opi', name: 'Opium',          type: 'retail',  position: [52, 0, SHOP_N], size: [4, 4, 4], color: COLORS.retail },
  { id: 'B-w',   name: 'W',              type: 'retail',  position: [58, 0, SHOP_N], size: [4, 4, 4], color: COLORS.retailAlt },
  { id: 'B-lcs', name: 'Lacoste',        type: 'retail',  position: [63, 0, SHOP_N], size: [4, 4, 4], color: COLORS.retail },

  // FOOD_S strip
  { id: 'B-jj',   name: 'JACK & JONES',     type: 'retail', position: [12, 0, FOOD_S], size: [10, 5, 7], color: COLORS.retail },
  { id: 'B-kkb',  name: 'Karachi Bakery',   type: 'food',   position: [24, 0, FOOD_S], size: [8,  4, 7], color: COLORS.foodAlt },
  { id: 'B-hyd',  name: 'Hyderabad Street', type: 'retail', position: [34, 0, FOOD_S], size: [10, 4, 7], color: COLORS.foodAlt },

  // AMEN_S strip — fashion micro-row (image 3 right)
  { id: 'B-cha', name: 'Chanel',       type: 'retail', position: [10, 0, AMEN_S], size: [4, 4, 4], color: COLORS.retail },
  { id: 'B-aml', name: 'Amelia',       type: 'retail', position: [16, 0, AMEN_S], size: [4, 4, 4], color: COLORS.retailAlt },
  { id: 'B-hb',  name: 'Hugo Boss',    type: 'retail', position: [22, 0, AMEN_S], size: [5, 4, 4], color: COLORS.retail },
  { id: 'B-mk',  name: 'Michael Kors', type: 'retail', position: [29, 0, AMEN_S], size: [5, 4, 4], color: COLORS.retailAlt }
]

// ═════════════════════════════════════════════════════════════════════════
// ZONE C — WEST WING  (X: -120 → -10)   Gates 03–18, dense retail
// ═════════════════════════════════════════════════════════════════════════
const zoneC_shops = [
  // CAFE_N — kid / cosmetics row (image 5)
  { id: 'C-tbs', name: 'The Body Shop',     type: 'retail', position: [-110, 0, CAFE_N], size: [4, 4, 4], color: COLORS.retail },
  { id: 'C-nrs', name: 'Neerus',            type: 'retail', position: [-104, 0, CAFE_N], size: [4, 4, 4], color: COLORS.retailAlt },
  { id: 'C-uck', name: 'UCB Kids',          type: 'retail', position: [-98,  0, CAFE_N], size: [4, 4, 4], color: COLORS.retail },
  { id: 'C-trb', name: 'Tribe',             type: 'retail', position: [-92,  0, CAFE_N], size: [4, 4, 4], color: COLORS.retailAlt },
  { id: 'C-fre', name: 'Forest Essentials', type: 'retail', position: [-86,  0, CAFE_N], size: [4, 4, 4], color: COLORS.retail },

  // C_BRAND_N — premium brand row (image 6 top-left)
  { id: 'C-usp', name: 'US Polo',         type: 'retail',  position: [-78, 0, C_BRAND_N], size: [6, 5, 4], color: COLORS.retail },
  { id: 'C-lac', name: 'Lacoste',         type: 'retail',  position: [-71, 0, C_BRAND_N], size: [6, 5, 4], color: COLORS.retailAlt },
  { id: 'C-ucb', name: 'UCB',             type: 'retail',  position: [-64, 0, C_BRAND_N], size: [4, 5, 4], color: COLORS.retail },
  { id: 'C-lph', name: 'Louis Philippe',  type: 'retail',  position: [-57, 0, C_BRAND_N], size: [8, 5, 4], color: COLORS.retailAlt },
  { id: 'C-vbl', name: 'Vibrant Living',  type: 'retail',  position: [10,  0, C_BRAND_N], size: [8, 4, 4], color: COLORS.food },
  { id: 'C-irh', name: 'Irish House',     type: 'food',    position: [-20, 0, C_BRAND_N], size: [10, 5, 4], color: COLORS.food },
  { id: 'C-jmp', name: 'Jamies Pizzeria', type: 'food',    position: [-8,  0, C_BRAND_N], size: [10, 5, 4], color: COLORS.foodAlt },

  // C_FOOD_N — central food cluster (image 6 middle)
  { id: 'C-stb', name: 'Starbucks',      type: 'food', position: [-65, 0, C_FOOD_N], size: [8, 5, 4], color: COLORS.food },
  { id: 'C-may', name: 'Maiyas',         type: 'food', position: [-55, 0, C_FOOD_N], size: [8, 5, 4], color: COLORS.foodAlt },
  { id: 'C-mip', name: 'Made In Punjab', type: 'food', position: [-45, 0, C_FOOD_N], size: [8, 5, 4], color: COLORS.food },
  { id: 'C-ulv', name: 'Ulavacharu',     type: 'food', position: [-35, 0, C_FOOD_N], size: [8, 5, 4], color: COLORS.foodAlt },
  { id: 'C-kfc', name: 'KFC',            type: 'food', position: [-25, 0, C_FOOD_N], size: [8, 5, 4], color: COLORS.food },
  { id: 'C-tmh', name: 'Tim Hortons',    type: 'food', position: [-3,  0, C_FOOD_N], size: [4, 4, 4], color: COLORS.foodAlt },

  // C_ORANGE — small orange shops (image 6, between food strips)
  { id: 'C-ddu', name: "Dadu's",         type: 'food',   position: [-58, 0, C_ORANGE], size: [4, 3, 3], color: COLORS.retail },
  { id: 'C-krb', name: 'Karnati Bakery', type: 'food',   position: [-52, 0, C_ORANGE], size: [4, 3, 3], color: COLORS.retailAlt },
  { id: 'C-amh', name: 'Almond House',   type: 'food',   position: [-46, 0, C_ORANGE], size: [4, 3, 3], color: COLORS.retail },
  { id: 'C-ngu', name: 'Cafe Niloufer',  type: 'food',   position: [-40, 0, C_ORANGE], size: [4, 3, 3], color: COLORS.retailAlt },
  { id: 'C-grb', name: 'Gourmet Baklava',type: 'food',   position: [-34, 0, C_ORANGE], size: [4, 3, 3], color: COLORS.retail },
  { id: 'C-acs', name: 'Accessories',    type: 'retail', position: [-22, 0, C_ORANGE], size: [4, 3, 3], color: COLORS.retail },
  { id: 'C-nyk', name: 'Nykaa',          type: 'retail', position: [-16, 0, C_ORANGE], size: [4, 3, 3], color: COLORS.retailAlt },

  // C_FOOD_S — second food row (Brioche Doree, Subway)
  { id: 'C-brd', name: 'Brioche Doree', type: 'food',   position: [-50, 0, C_FOOD_S], size: [12, 4, 4], color: COLORS.food },
  { id: 'C-suw', name: 'Subway',        type: 'food',   position: [-36, 0, C_FOOD_S], size: [8,  4, 4], color: COLORS.food },
  { id: 'C-fes', name: 'Forest Essential', type: 'retail', position: [-26, 0, C_FOOD_S], size: [4, 4, 4], color: COLORS.retail },
  { id: 'C-give',name: 'Give',          type: 'retail', position: [-20, 0, C_FOOD_S], size: [4, 4, 4], color: COLORS.retailAlt },
  { id: 'C-koa', name: 'Konsa Ayurveda',type: 'retail', position: [-14, 0, C_FOOD_S], size: [4, 4, 4], color: COLORS.retail },
  { id: 'C-shy', name: 'Shoyu',         type: 'food',   position: [10,  0, C_FOOD_S], size: [4, 4, 4], color: COLORS.food },
  { id: 'C-frz', name: 'Farzi Cafe',    type: 'food',   position: [-105,0, C_FOOD_S], size: [12, 5, 4], color: COLORS.food },
  { id: 'C-bk',  name: 'Burger King',   type: 'food',   position: [-90, 0, C_FOOD_S], size: [10, 5, 4], color: COLORS.food },
  { id: 'C-krk', name: 'Krispy Kreme',  type: 'food',   position: [-122, 0, C_FOOD_S], size: [4, 4, 3], color: COLORS.food },

  // C_BRAND_S — DA Milano row (image 6 bottom-left)
  { id: 'C-dam', name: 'DA Milano',      type: 'retail', position: [-90, 0, C_BRAND_S], size: [6, 4, 4], color: COLORS.retail },
  { id: 'C-swr', name: 'Swarovski',      type: 'retail', position: [-83, 0, C_BRAND_S], size: [6, 4, 4], color: COLORS.retailAlt },
  { id: 'C-kpc', name: 'Krishna Pearls', type: 'retail', position: [-76, 0, C_BRAND_S], size: [5, 4, 4], color: COLORS.retail },
  { id: 'C-wc',  name: 'W',              type: 'retail', position: [-70, 0, C_BRAND_S], size: [5, 4, 4], color: COLORS.retailAlt },
  { id: 'C-bbc', name: 'Biba',           type: 'retail', position: [-64, 0, C_BRAND_S], size: [5, 4, 4], color: COLORS.retail },
  { id: 'C-fab', name: 'Fab India',      type: 'retail', position: [-58, 0, C_BRAND_S], size: [6, 4, 4], color: COLORS.retailAlt },
  { id: 'C-crc', name: 'Crocs',          type: 'retail', position: [-115,0, C_BRAND_S], size: [5, 4, 4], color: COLORS.retailAlt },
  { id: 'C-bom', name: 'Bombay Store',   type: 'retail', position: [-109,0, C_BRAND_S], size: [5, 4, 4], color: COLORS.retail },
  { id: 'C-mex', name: 'Maiyas Express', type: 'food',   position: [-100,0, C_BRAND_S], size: [8, 5, 4], color: COLORS.food },

  // C_PREMIUM — premium fashion row (image 6 bottom)
  { id: 'C-por', name: 'Porsche',         type: 'retail', position: [-58, 0, C_PREMIUM], size: [10, 4, 5], color: COLORS.retail },
  { id: 'C-mch', name: 'Mochi',           type: 'retail', position: [-46, 0, C_PREMIUM], size: [10, 4, 5], color: COLORS.retailAlt },
  { id: 'C-sam', name: 'Samsonite',       type: 'retail', position: [-36, 0, C_PREMIUM], size: [6,  4, 5], color: COLORS.retail },
  { id: 'C-frk', name: "Frank's",         type: 'retail', position: [-29, 0, C_PREMIUM], size: [6,  4, 5], color: COLORS.retailAlt },
  { id: 'C-skc', name: 'Skechers',        type: 'retail', position: [-21, 0, C_PREMIUM], size: [6,  4, 5], color: COLORS.retail },
  { id: 'C-sgh', name: 'Sunglass Hut',    type: 'retail', position: [-14, 0, C_PREMIUM], size: [4, 4, 5], color: COLORS.retailAlt },
  { id: 'C-prc', name: 'Parcos',          type: 'retail', position: [-9,  0, C_PREMIUM], size: [4, 4, 5], color: COLORS.retail },
  { id: 'C-mcc', name: "Millie's Cookies",type: 'food',   position: [-67, 0, C_PREMIUM], size: [6, 4, 5], color: COLORS.food }
]

// ═════════════════════════════════════════════════════════════════════════
// BOARDING GATES — pylons on north (Z=-28) and south (Z=+28) piers
// ═════════════════════════════════════════════════════════════════════════
export const GATES = [
  // West Wing — north pier
  { id: 'G03', name: 'Boarding Gate 03', position: [-90, 0, GATE_N], side: 'north' },
  { id: 'G04', name: 'Boarding Gate 04', position: [-72, 0, GATE_N], side: 'north' },
  { id: 'G05', name: 'Boarding Gate 05', position: [-50, 0, GATE_N], side: 'north' },
  { id: 'G06', name: 'Boarding Gate 06', position: [-30, 0, GATE_N], side: 'north' },
  { id: 'G08', name: 'Boarding Gate 08', position: [-10, 0, GATE_N], side: 'north' },
  // West Wing — south pier (G15–G18 wrap around the western tip)
  { id: 'G09', name: 'Boarding Gate 9',  position: [-15, 0, GATE_S], side: 'south' },
  { id: 'G11', name: 'Boarding Gate 11', position: [-30, 0, GATE_S], side: 'south' },
  { id: 'G12', name: 'Boarding Gate 12', position: [-45, 0, GATE_S], side: 'south' },
  { id: 'G13', name: 'Boarding Gate 13', position: [-60, 0, GATE_S], side: 'south' },
  { id: 'G14', name: 'Boarding Gate 14', position: [-78, 0, GATE_S], side: 'south' },
  { id: 'G15', name: 'Boarding Gate 15', position: [-92, 0, GATE_S], side: 'south' },
  { id: 'G16', name: 'Boarding Gate 16', position: [-104,0, GATE_S], side: 'south' },
  { id: 'G17', name: 'Boarding Gate 17', position: [-116,0, GATE_S], side: 'south' },
  { id: 'G18', name: 'Boarding Gate 18', position: [-128,0, GATE_S], side: 'south' },

  // Central — south pier
  { id: 'G01',  name: 'Boarding Gate 01',      position: [-2, 0, GATE_S], side: 'south' },
  { id: 'G20',  name: 'Boarding Gate 20',      position: [72, 0, GATE_S], side: 'south' },
  { id: 'G21',  name: 'Boarding Gate 21',      position: [60, 0, GATE_S], side: 'south' },
  { id: 'G22B', name: 'Boarding Gate 22B',     position: [44, 0, GATE_S], side: 'south' },
  { id: 'G23',  name: 'Boarding Gate 23A/23B', position: [28, 0, GATE_S], side: 'south' },
  { id: 'G25A', name: 'Boarding Gate 25A',     position: [10, 0, GATE_S], side: 'south' },
  { id: 'G25B', name: 'Boarding Gate 25B',     position: [22, 0, GATE_S], side: 'south' },

  // East Wing — south pier
  { id: 'G26A', name: 'Boarding Gate 26A',    position: [165, 0, GATE_S], side: 'south' },
  { id: 'G27A', name: 'Boarding Gate 27A',    position: [145, 0, GATE_S], side: 'south' },
  { id: 'G28B', name: 'Boarding Gate 28B',    position: [120, 0, GATE_S], side: 'south' },
  { id: 'G29',  name: 'Boarding Gate 29',     position: [95,  0, GATE_S], side: 'south' },
  // East Wing — north pier
  { id: 'G30',  name: 'Boarding Gate 30',     position: [76,  0, GATE_N], side: 'north' },
  { id: 'G31A', name: 'Boarding Gate 31A',    position: [88,  0, GATE_N], side: 'north' },
  { id: 'G31B', name: 'Boarding Gate 31B',    position: [98,  0, GATE_N], side: 'north' },
  { id: 'G32',  name: 'Boarding Gate 32',     position: [110, 0, GATE_N], side: 'north' },
  { id: 'G33',  name: 'Boarding Gate 33',     position: [122, 0, GATE_N], side: 'north' },
  { id: 'G34',  name: 'Boarding Gate 34',     position: [132, 0, GATE_N], side: 'north' },
  { id: 'G35',  name: 'Boarding Gate 35',     position: [144, 0, GATE_N], side: 'north' },
  { id: 'G36',  name: 'Boarding Gate 36',     position: [160, 0, GATE_N], side: 'north' }
]

// ═════════════════════════════════════════════════════════════════════════
// SEATING CLUSTERS  (instanced internally for cheap draws)
// ═════════════════════════════════════════════════════════════════════════
export const SEATING = [
  // North pier seating
  { id: 'S-W-N1', position: [-92, 0, SEAT_N], rows: 4, cols: 4, orientation: 'x' },
  { id: 'S-W-N2', position: [-30, 0, SEAT_N], rows: 4, cols: 5, orientation: 'x' },
  { id: 'S-A-N1', position: [82,  0, SEAT_N], rows: 4, cols: 4, orientation: 'x' },
  { id: 'S-A-N2', position: [105, 0, SEAT_N], rows: 4, cols: 5, orientation: 'x' },
  { id: 'S-A-N3', position: [128, 0, SEAT_N], rows: 4, cols: 5, orientation: 'x' },
  { id: 'S-A-N4', position: [152, 0, SEAT_N], rows: 4, cols: 4, orientation: 'x' },
  // South pier seating
  { id: 'S-W-S1', position: [-100,0, SEAT_S], rows: 4, cols: 4, orientation: 'x' },
  { id: 'S-W-S2', position: [-78, 0, SEAT_S], rows: 3, cols: 5, orientation: 'x' },
  { id: 'S-W-S3', position: [-58, 0, SEAT_S], rows: 3, cols: 5, orientation: 'x' },
  { id: 'S-W-S4', position: [-30, 0, SEAT_S], rows: 3, cols: 5, orientation: 'x' },
  { id: 'S-W-S5', position: [-15, 0, SEAT_S], rows: 3, cols: 4, orientation: 'x' },
  { id: 'S-B-S1', position: [4,   0, SEAT_S], rows: 3, cols: 4, orientation: 'x' },
  { id: 'S-B-S2', position: [28,  0, SEAT_S], rows: 3, cols: 5, orientation: 'x' },
  { id: 'S-B-S3', position: [44,  0, SEAT_S], rows: 3, cols: 5, orientation: 'x' },
  { id: 'S-B-S4', position: [60,  0, SEAT_S], rows: 3, cols: 4, orientation: 'x' },
  { id: 'S-A-S1', position: [95,  0, SEAT_S], rows: 4, cols: 4, orientation: 'x' },
  { id: 'S-A-S2', position: [120, 0, SEAT_S], rows: 4, cols: 5, orientation: 'x' },
  { id: 'S-A-S3', position: [145, 0, SEAT_S], rows: 4, cols: 4, orientation: 'x' },
  { id: 'S-A-S4', position: [165, 0, SEAT_S], rows: 4, cols: 4, orientation: 'x' }
]

// ═════════════════════════════════════════════════════════════════════════
// ESCALATORS (intra-airside vertical circulation)
// ═════════════════════════════════════════════════════════════════════════
export const ESCALATORS = [
  { id: 'ESC-DFL',  name: 'ESC-DFL',  position: [-115, 0, -16], rotation: 0,           length: 8 },
  { id: 'ESC-FET1', name: 'ESC-FET1', position: [-26,  0, -19], rotation: Math.PI / 2, length: 6 },
  { id: 'ESC-EF2',  name: 'ESC-EF2',  position: [-12,  0, +19], rotation: Math.PI / 2, length: 6 },
  { id: 'E-ESC-22', name: 'E-ESC-22', position: [-46,  0, +19], rotation: Math.PI / 2, length: 6 },
  { id: 'E-ESC-24', name: 'E-ESC-24', position: [-90,  0, +19], rotation: Math.PI / 2, length: 6 },
  { id: 'ESC-25A',  name: 'ESC-25A',  position: [12,   0, +19], rotation: Math.PI / 2, length: 6 },
  { id: 'E-ETOF',   name: 'E-ETOF',   position: [40,   0, +19], rotation: Math.PI / 2, length: 6 },
  { id: 'ESC-28B',  name: 'ESC-28B',  position: [110,  0, +19], rotation: Math.PI / 2, length: 6 },
  { id: 'ESC-27A',  name: 'ESC-27A',  position: [135,  0, +19], rotation: Math.PI / 2, length: 6 },
  { id: 'ESC-G36',  name: 'ESC-G36',  position: [148,  0, -19], rotation: Math.PI / 2, length: 6 }
]

// ═════════════════════════════════════════════════════════════════════════
// RESTROOMS / MEDICAL / WELLNESS  (green amenity blocks)
// ═════════════════════════════════════════════════════════════════════════
// Placed in seating-strip gaps so they don't clash with shops.
export const RESTROOMS = [
  // East Wing
  { id: 'R-A1', name: 'Restroom',          position: [70,  0, +22], size: [10, 3.5, 8] },
  { id: 'R-A2', name: 'Restroom',          position: [180, 0, +13], size: [8,  3.5, 6], accessible: true },
  { id: 'R-A3', name: 'Restroom',          position: [180, 0, -16], size: [8,  3.5, 6] },
  { id: 'R-Bby',name: 'Baby Care',         position: [70,  0, -16], size: [6,  3.5, 4] },
  { id: 'R-Smk',name: 'Smoking Room',      position: [70,  0, +13], size: [6,  3.5, 4] },
  { id: 'R-Avs',name: 'Aviserv Sleeping',  position: [180, 0, +5],  size: [8,  3.5, 6] },

  // Central
  { id: 'R-B1', name: 'Restroom',          position: [-3, 0, +13], size: [10, 3.5, 5] },
  { id: 'R-B2', name: 'Restroom',          position: [50, 0, +13], size: [10, 3.5, 5] },

  // West Wing
  { id: 'R-C1', name: 'Restroom',          position: [-90,  0, +22], size: [10, 3.5, 7] },
  { id: 'R-C2', name: 'Restroom',          position: [-120, 0, +22], size: [8,  3.5, 6] },
  { id: 'R-Med',name: 'Medical Room',      position: [-105, 0, -10], size: [8,  3.5, 4] },
  { id: 'R-Mio',name: 'Mio Pods',          position: [-7,   0, +22], size: [5,  3.5, 4] }
]

// ═════════════════════════════════════════════════════════════════════════
// INFORMATION KIOSKS  (airside)
// ═════════════════════════════════════════════════════════════════════════
export const KIOSKS = [
  { id: 'K9',  name: 'Information Kiosk 9', position: [40,  0, +5]  },
  { id: 'K4',  name: 'Information Kiosk 4', position: [120, 0, +5]  },
  { id: 'KIC', name: 'Information Counter', position: [22,  0, +13] }
]

// ═════════════════════════════════════════════════════════════════════════
// LANDSIDE  —  Entrance → Check-in → Security
// ═════════════════════════════════════════════════════════════════════════
// Five entrance doors spread across the front of the terminal.
export const ENTRANCES = [
  { id: 'ENT-1', name: 'Entrance 1', position: [-100, 0, Z_ENTRANCE] },
  { id: 'ENT-2', name: 'Entrance 2', position: [-50,  0, Z_ENTRANCE] },
  { id: 'ENT-3', name: 'Entrance 3', position: [+10,  0, Z_ENTRANCE] },
  { id: 'ENT-4', name: 'Entrance 4', position: [+70,  0, Z_ENTRANCE] },
  { id: 'ENT-5', name: 'Entrance 5', position: [+130, 0, Z_ENTRANCE] }
]

// Check-in counter rows — each row is one airline with multiple counters.
export const CHECKIN_ROWS = [
  { id: 'CK-A', airline: 'IndiGo',     code: 'A', position: [-100, 0, Z_CHECKIN], length: 28 },
  { id: 'CK-B', airline: 'Air India',  code: 'B', position: [-60,  0, Z_CHECKIN], length: 28 },
  { id: 'CK-C', airline: 'Vistara',    code: 'C', position: [-15,  0, Z_CHECKIN], length: 28 },
  { id: 'CK-D', airline: 'SpiceJet',   code: 'D', position: [+30,  0, Z_CHECKIN], length: 28 },
  { id: 'CK-E', airline: 'Akasa Air',  code: 'E', position: [+75,  0, Z_CHECKIN], length: 28 },
  { id: 'CK-F', airline: 'Intl Carriers', code: 'F', position: [+125, 0, Z_CHECKIN], length: 36 }
]

// Pre-security amenities (forex, info, charging) — landside, just south of barrier.
export const LANDSIDE_AMENITIES = [
  { id: 'LS-IK2', kind: 'kiosk',      name: 'Information Kiosk 2', position: [-30, 0, +40] },
  { id: 'LS-CH',  kind: 'kiosk',      name: 'Charging Station',    position: [-70, 0, +40] },
  { id: 'LS-EBX', kind: 'service',    name: 'EBIXCASH',            position: [+20, 0, +40], size: [6, 3, 3], color: COLORS.security },
  { id: 'LS-STT', kind: 'service',    name: 'Srinivasa Tours',     position: [+60, 0, +40], size: [8, 3, 3], color: COLORS.foodAlt }
]

// ─── SECURITY BARRIER ────────────────────────────────────────────────────
// Replaces the old north-side "Zone 3 / Zone 4" placement. Two large
// security check stations span the terminal width and form the only
// boundary between landside and airside.
export const SECURITY = [
  { id: 'SEC-W',  name: 'Security Check — West',    position: [-60, 0, Z_SECURITY], lanes: 5 },
  { id: 'SEC-C',  name: 'Security Check — Central', position: [+10, 0, Z_SECURITY], lanes: 5 },
  { id: 'SEC-E',  name: 'Security Check — East',    position: [+90, 0, Z_SECURITY], lanes: 5 }
]

// ─── WAYFINDING PATH ─────────────────────────────────────────────────────
// Sequence of waypoints that visualise the user's recommended route on the
// floor. Drawn as a connected gold strip with arrows.
export const WAYFINDING = [
  { id: 'wp-1', label: '1. Entrance',  position: [-50, 0, +54] },
  { id: 'wp-2', label: '2. Check-in',  position: [-50, 0, +48] },
  { id: 'wp-3', label: '3. Bag Drop',  position: [-50, 0, +42] },
  { id: 'wp-4', label: '4. Security',  position: [-58, 0, +38] },
  { id: 'wp-5', label: '5. Airside',   position: [-58, 0, +28] },
  { id: 'wp-6', label: '6. Your Gate', position: [+28, 0, +24] }
]

// ═════════════════════════════════════════════════════════════════════════
// USER POSITION — landside arrival point. Drawn at the most-trafficked
// entrance so the user can see "you start here" and follow wayfinding.
// ═════════════════════════════════════════════════════════════════════════
export const USER_POSITION = [-50, 0, +54]

// ═════════════════════════════════════════════════════════════════════════
// ZONE METADATA (mini-map / overlay tinting)
// ═════════════════════════════════════════════════════════════════════════
export const ZONES = [
  // airside
  { id: 'A',  name: 'East Wing — Gates 27–36',  center: [120, 0, 0],  size: [120, 60], color: '#E0F2F1' },
  { id: 'B',  name: 'Central — Gates 21–25A',   center: [25,  0, 0],  size: [80,  60], color: '#E3F2FD' },
  { id: 'C',  name: 'West Wing — Gates 03–18',  center: [-65, 0, 0],  size: [120, 60], color: '#FFF3E0' },
  // landside
  { id: 'LS', name: 'Departures Hall (landside)', center: [15, 0, 48], size: [320, 24], color: '#F1F5F9' }
]

// ─── COMBINED EXPORTS ────────────────────────────────────────────────────
export const SHOPS = [
  ...zoneA_shops,
  ...zoneB_shops,
  ...zoneC_shops
]

export const DUTY_FREE = zoneA_dutyFree

// Floor extents — terminal building footprint. The larger world-ground
// plane (rendered in Floor.jsx) extends well beyond this so external
// roads can sit on it.
export const FLOOR = {
  size:   [360, 130],
  center: [20,  0,  10],
  color:  COLORS.floor
}

// ═════════════════════════════════════════════════════════════════════════
// EXTERNAL ROAD NETWORK  (image 7)
// ═════════════════════════════════════════════════════════════════════════
// Each segment is a flat strip rendered on the world-ground plane south
// of the terminal. Together they form the curbside, the main approach
// arterial, and the radiating access roads / vehicle gates.
export const ROADWAYS = [
  // Curbside drop-off — runs along the south side of the terminal
  { id: 'R-curb',  from: [-160, 0, 82], to: [180, 0, 82], width: 5,  type: 'curb' },

  // Main 4-lane arterial — primary approach road
  { id: 'R-main',  from: [-170, 0, 100], to: [195, 0, 100], width: 12, type: 'arterial' },

  // Radiating access roads (multiple "vehicle gates" feeding the terminal)
  { id: 'R-acc-1', from: [-170, 0, 135], to: [-115, 0, 100], width: 6, type: 'access' },
  { id: 'R-acc-2', from: [-95,  0, 140], to: [-55,  0, 100], width: 6, type: 'access' },
  { id: 'R-acc-3', from: [-5,   0, 145], to: [25,   0, 100], width: 6, type: 'access' },
  { id: 'R-acc-4', from: [70,   0, 140], to: [105,  0, 100], width: 6, type: 'access' },
  { id: 'R-acc-5', from: [195,  0, 135], to: [155,  0, 100], width: 6, type: 'access' },

  // Central feeder — straight perpendicular spur
  { id: 'R-feed-1', from: [25,   0, 165], to: [25, 0, 145], width: 7, type: 'feeder' },
  { id: 'R-feed-2', from: [-160, 0, 60],  to: [-130, 0, 80], width: 4, type: 'service' },
  { id: 'R-feed-3', from: [195,  0, 60],  to: [165,  0, 80], width: 4, type: 'service' }
]

// Vehicle-gate markers — labelled "gates" along the main arterial where
// roads branch off. Shown as small numbered pillars.
export const VEHICLE_GATES = [
  { id: 'VG-1', name: 'Gate 1 — Drop-off', position: [-115, 0, 95] },
  { id: 'VG-2', name: 'Gate 2 — Pick-up',  position: [-55,  0, 95] },
  { id: 'VG-3', name: 'Gate 3 — Taxi',     position: [25,   0, 95] },
  { id: 'VG-4', name: 'Gate 4 — Bus',      position: [105,  0, 95] },
  { id: 'VG-5', name: 'Gate 5 — Coach',    position: [155,  0, 95] }
]
