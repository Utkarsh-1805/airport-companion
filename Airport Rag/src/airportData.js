// Realistic airport topology.
//
// The terminal is organized as a *progressive passenger journey* through six
// zones (the only place to cross between them is via the security/immigration
// transitions). Every node belongs to exactly one zone. Every walkable edge
// is one orthogonal grid step, so the keyboard navigator (forward / left /
// right) still works tile-by-tile.
//
// Zones (north -> south):
//   1. landside       - arrivals kerb, info desks, check-in islands, bag drop, kiosks
//   2. security       - tray collection, body scanners, frisking. THE transition.
//   3. immigration    - e-gates and manual counters (international departures only)
//   4. airside_retail - duty free, electronics, pharmacy, cosmetics, books
//   5. airside_food   - food court / coffee / restaurants
//   6. airside_services - lounges, prayer/family/medical rooms, smoking lounge
//   7. gate_piers     - pier junctions and 20 gate stubs (Pier A west, Pier B east)
//   8. arrival        - arrival immigration, baggage carousels, customs, exit hall
//
// Coord system: world = grid * GRID_STEP. Negative Z is north (entry), positive
// Z is south (gates / arrival).

const GRID_STEP = 8;

const node = (id, gx, gz, opts = {}) => ({
  id,
  terminal: opts.terminal || "T2",
  label: opts.label || id.replaceAll("_", " "),
  type: opts.type || "junction",
  zone: opts.zone || "airside_services",
  services: opts.services || [],
  accessibility: opts.accessibility || ["wheelchair"],
  gridX: gx,
  gridZ: gz,
  position: [gx * GRID_STEP, 0, gz * GRID_STEP]
});

// =========================================================================
// 1. LANDSIDE - public, pre-security
// =========================================================================
const landsideNodes = [
  // gridZ = -7 : arrivals kerb / drop-off
  node("Curbside_W", -3, -7, { type: "entry", zone: "landside", label: "West Drop-off" }),
  node("Curbside_C", 0, -7, { type: "entry", zone: "landside", label: "Central Drop-off", services: ["taxi_stand", "rideshare"] }),
  node("Curbside_E", 3, -7, { type: "entry", zone: "landside", label: "East Drop-off" }),
  node("Trolleys_W", -5, -7, { type: "entry", zone: "landside", label: "Trolley Bay West", services: ["baggage_trolleys"] }),
  node("Trolleys_E", 5, -7, { type: "entry", zone: "landside", label: "Trolley Bay East", services: ["baggage_trolleys"] }),

  // gridZ = -6 : info / accessibility / entry concourse
  node("InfoDesk_W", -3, -6, { type: "service", zone: "landside", label: "Info Desk West", services: ["info", "lost_passport_referral", "language_help"] }),
  node("AccessHelp_W", -5, -6, { type: "service", zone: "landside", label: "Accessibility Help West", services: ["wheelchair_assist", "elderly_help", "unaccompanied_minor"], accessibility: ["wheelchair", "audio", "tactile"] }),
  node("InfoDesk_C", 0, -6, { type: "service", zone: "landside", label: "Information Desk", services: ["info", "lost_passport_referral", "language_help", "flight_info_displays"] }),
  node("AccessHelp_E", 5, -6, { type: "service", zone: "landside", label: "Accessibility Help East", services: ["wheelchair_assist", "elderly_help"], accessibility: ["wheelchair", "audio", "tactile"] }),
  node("InfoDesk_E", 3, -6, { type: "service", zone: "landside", label: "Info Desk East", services: ["info"] }),

  // gridZ = -5 : check-in islands
  node("CheckIn_T1_A", -5, -5, { type: "checkin", zone: "landside", label: "Check-in Island T1-A", terminal: "T1", services: ["airline_counter", "domestic"] }),
  node("CheckIn_T1_B", -3, -5, { type: "checkin", zone: "landside", label: "Check-in Island T1-B", terminal: "T1", services: ["airline_counter", "domestic", "oversized_baggage"] }),
  node("CheckIn_Hub_W", -1, -5, { type: "checkin", zone: "landside", label: "Check-in Hub West", services: ["airline_counter", "document_check"] }),
  node("CheckIn_Hub", 0, -5, { type: "checkin", zone: "landside", label: "Central Check-in Hub", services: ["airline_counter", "document_check", "visa_help"] }),
  node("CheckIn_Hub_E", 1, -5, { type: "checkin", zone: "landside", label: "Check-in Hub East", services: ["airline_counter", "document_check"] }),
  node("CheckIn_T2_B", 3, -5, { type: "checkin", zone: "landside", label: "Check-in Island T2-B", services: ["airline_counter", "international", "oversized_baggage", "pet_travel"] }),
  node("CheckIn_T2_A", 5, -5, { type: "checkin", zone: "landside", label: "Check-in Island T2-A", services: ["airline_counter", "international"] }),

  // gridZ = -4 : self kiosks / bag drop
  node("Kiosk_W", -3, -4, { type: "checkin", zone: "landside", label: "Self Check-in Kiosks West", services: ["self_kiosk", "boarding_pass_print"] }),
  node("BagDrop_W", -1, -4, { type: "checkin", zone: "landside", label: "Bag Drop West", services: ["bag_drop", "weighing"] }),
  node("Pre_Security_Hub", 0, -4, { type: "junction", zone: "landside", label: "Pre-Security Hub" }),
  node("BagDrop_E", 1, -4, { type: "checkin", zone: "landside", label: "Bag Drop East", services: ["bag_drop", "weighing", "fragile_handling"] }),
  node("Kiosk_E", 3, -4, { type: "checkin", zone: "landside", label: "Self Check-in Kiosks East", services: ["self_kiosk"] })
];

// =========================================================================
// 2. SECURITY - the only crossing from landside to airside
// =========================================================================
const securityNodes = [
  // gridZ = -3 : security checkpoints (multiple parallel lanes)
  node("Sec_Lane_T1_F", -5, -3, { type: "security", zone: "security", label: "Security Family Lane T1", services: ["family_lane", "stroller_friendly"], terminal: "T1" }),
  node("Sec_Lane_T1_2", -3, -3, { type: "security", zone: "security", label: "Security Lane T1-2", services: ["body_scanner", "tray_collection"], terminal: "T1" }),
  node("Sec_Lane_T1_1", -1, -3, { type: "security", zone: "security", label: "Security Lane T1-1", services: ["body_scanner", "priority_lane"] }),
  node("Sec_Hub", 0, -3, { type: "security", zone: "security", label: "Central Security Hub", services: ["body_scanner", "tray_collection", "liquid_disposal", "secondary_screening"] }),
  node("Sec_Lane_T2_1", 1, -3, { type: "security", zone: "security", label: "Security Lane T2-1", services: ["body_scanner", "priority_lane"] }),
  node("Sec_Lane_T2_2", 3, -3, { type: "security", zone: "security", label: "Security Lane T2-2", services: ["body_scanner", "tray_collection"] }),
  node("Sec_Lane_T2_F", 5, -3, { type: "security", zone: "security", label: "Security Family Lane T2", services: ["family_lane", "stroller_friendly", "accessibility_lane"] })
];

// =========================================================================
// 3. IMMIGRATION (international departures only)
// =========================================================================
const immigrationNodes = [
  // gridZ = -2 : immigration counters + e-gates
  node("LiquidDisposal_W", -5, -2, { type: "service", zone: "immigration", label: "Liquid Disposal Bin", services: ["liquid_disposal"] }),
  node("Imm_EGate_W", -3, -2, { type: "security", zone: "immigration", label: "E-Gates West", services: ["e_gate", "biometric"] }),
  node("Imm_Counter_W", -1, -2, { type: "security", zone: "immigration", label: "Immigration Counters West", services: ["passport_control", "visa_check"] }),
  node("Imm_Hub", 0, -2, { type: "security", zone: "immigration", label: "Immigration Hub", services: ["passport_control", "visa_check", "diplomatic_lane"] }),
  node("Imm_Counter_E", 1, -2, { type: "security", zone: "immigration", label: "Immigration Counters East", services: ["passport_control", "visa_check"] }),
  node("Imm_EGate_E", 3, -2, { type: "security", zone: "immigration", label: "E-Gates East", services: ["e_gate", "biometric"] }),
  node("LiquidDisposal_E", 5, -2, { type: "service", zone: "immigration", label: "Liquid Disposal Bin East", services: ["liquid_disposal"] })
];

// =========================================================================
// 4-6. AIRSIDE - retail, food, services
// =========================================================================
const airsideNodes = [
  // gridZ = -1 : retail row
  node("DutyFree_W", -5, -1, { type: "shop_zone", zone: "airside_retail", label: "Mumbai Duty Free", services: ["duty_free", "perfume", "liquor", "chocolate"] }),
  node("Shop_Books", -3, -1, { type: "shop_zone", zone: "airside_retail", label: "WHSmith", services: ["bookstore", "magazines", "stationery"] }),
  node("Shop_Pharmacy", -1, -1, { type: "shop_zone", zone: "airside_retail", label: "Apollo Pharmacy", services: ["pharmacy", "medicine", "first_aid", "wellness"] }),
  node("Retail_Hub", 0, -1, { type: "shop_zone", zone: "airside_retail", label: "Retail Hub" }),
  node("Shop_Electronics", 1, -1, { type: "shop_zone", zone: "airside_retail", label: "Croma", services: ["electronics", "chargers", "headphones", "power_banks"] }),
  node("Shop_Beauty", 3, -1, { type: "shop_zone", zone: "airside_retail", label: "Forest Essentials", services: ["beauty", "ayurveda", "gifts"] }),
  node("Shop_Fashion", 5, -1, { type: "shop_zone", zone: "airside_retail", label: "Fabindia", services: ["fashion", "ethnic_wear", "gifts"] }),

  // gridZ = 0 : food court row
  node("Food_Coffee_W", -5, 0, { type: "shop_zone", zone: "airside_food", label: "Theobroma", services: ["bakery", "coffee", "sandwiches"] }),
  node("Food_Indian", -3, 0, { type: "shop_zone", zone: "airside_food", label: "Haldiram's", services: ["indian_food", "snacks", "vegetarian"] }),
  node("Food_FastFood", -1, 0, { type: "shop_zone", zone: "airside_food", label: "Burger King", services: ["fast_food", "burgers", "vegetarian"] }),
  node("Plaza_Hub", 0, 0, { type: "shop_zone", zone: "airside_food", label: "Central Plaza", services: ["water_station", "charging", "info"] }),
  node("Food_Coffee_C", 1, 0, { type: "shop_zone", zone: "airside_food", label: "Starbucks", services: ["coffee", "breakfast", "vegetarian"] }),
  node("Food_Souvenirs", 3, 0, { type: "shop_zone", zone: "airside_food", label: "Chumbak", services: ["souvenirs", "gifts"] }),
  node("Food_Toys", 5, 0, { type: "shop_zone", zone: "airside_food", label: "Hamleys", services: ["toys", "kids_gifts", "family_friendly"] }),

  // gridZ = 1 : services row (lounges, prayer, family, medical, smoking)
  node("Lounge_Premium_W", -5, 1, { type: "lounge", zone: "airside_services", label: "Aster Premium Lounge", services: ["premium_lounge", "shower", "buffet", "wifi", "quiet_pods"] }),
  node("FamilyRoom", -3, 1, { type: "service", zone: "airside_services", label: "Family Restroom & Nursery", services: ["family_restroom", "baby_changing", "nursing_room"], accessibility: ["wheelchair", "stroller"] }),
  node("PrayerRoom", -1, 1, { type: "service", zone: "airside_services", label: "Multifaith Prayer Room", services: ["prayer_room", "wudu_facility", "quiet_room"], accessibility: ["wheelchair"] }),
  node("Service_Hub", 0, 1, { type: "service", zone: "airside_services", label: "Service Hub", services: ["info_kiosk", "ai_assistant_kiosk", "charging_lockers"] }),
  node("MedicalRoom", 1, 1, { type: "service", zone: "airside_services", label: "Medical Room", services: ["medical", "emergency_help", "pharmacy_referral"], accessibility: ["wheelchair", "audio"] }),
  node("SmokingLounge", 3, 1, { type: "service", zone: "airside_services", label: "Smoking Lounge", services: ["smoking_zone", "smoking", "smoking_lounge"] }),
  node("Lounge_Premium_E", 5, 1, { type: "lounge", zone: "airside_services", label: "Skyline Premium Lounge", services: ["premium_lounge", "shower", "buffet", "wifi", "work_booth"] }),

  // Restrooms scattered along all aisles
  node("Restrooms_T1_North", -5, -3, { type: "restroom", zone: "security", label: "Restrooms T1 North", services: ["restroom"] }), // collides with sec_lane_t1_f - rename
  node("Restrooms_Retail_W", -7, -1, { type: "restroom", zone: "airside_retail", label: "Restrooms Retail West", services: ["restroom"] }),
  node("Restrooms_Retail_E", 7, -1, { type: "restroom", zone: "airside_retail", label: "Restrooms Retail East", services: ["restroom"] }),
  node("Restrooms_Food_W", -7, 0, { type: "restroom", zone: "airside_food", label: "Restrooms Food West", services: ["restroom"] }),
  node("Restrooms_Food_E", 7, 0, { type: "restroom", zone: "airside_food", label: "Restrooms Food East", services: ["restroom"] })
];

// Drop the duplicate-position node (Restrooms_T1_North conflicts with Sec_Lane_T1_F)
const cleanedAirsideNodes = airsideNodes.filter((n) => n.id !== "Restrooms_T1_North");

// =========================================================================
// 7. GATE PIERS (airside)
// =========================================================================
const pierNodes = [
  node("PierA_Far", -7, 2, { type: "junction", zone: "gate_piers", label: "West Pier Edge" }),
  node("PierA_Outer", -5, 2, { type: "junction", zone: "gate_piers", label: "Pier A Outer Junction", services: ["water_station", "charging"] }),
  node("PierA_Mid", -3, 2, { type: "junction", zone: "gate_piers", label: "Pier A Middle Junction", services: ["water_station"] }),
  node("PierA_Inner", -1, 2, { type: "junction", zone: "gate_piers", label: "Pier A Inner Junction", services: ["charging"] }),
  node("PierC", 0, 2, { type: "junction", zone: "gate_piers", label: "South Concourse Junction" }),
  node("PierB_Inner", 1, 2, { type: "junction", zone: "gate_piers", label: "Pier B Inner Junction", services: ["charging"] }),
  node("PierB_Mid", 3, 2, { type: "junction", zone: "gate_piers", label: "Pier B Middle Junction", services: ["water_station"] }),
  node("PierB_Outer", 5, 2, { type: "junction", zone: "gate_piers", label: "Pier B Outer Junction", services: ["water_station", "charging"] }),
  node("PierB_Far", 7, 2, { type: "junction", zone: "gate_piers", label: "East Pier Edge" })
];

const gateNodes = [];
const gateRows = [3, 4, 5, 6, 7];
gateRows.forEach((gz, idx) => {
  gateNodes.push(node(`Gate_A${idx + 1}`, -5, gz, { type: "gate", zone: "gate_piers", label: `Gate A${idx + 1}`, terminal: "T1", services: ["seating", "charging", "water_station"] }));
  gateNodes.push(node(`Gate_A${idx + 6}`, -1, gz, { type: "gate", zone: "gate_piers", label: `Gate A${idx + 6}`, terminal: "T1", services: ["seating", "charging"] }));
  gateNodes.push(node(`Gate_B${idx + 6}`, 1, gz, { type: "gate", zone: "gate_piers", label: `Gate B${idx + 6}`, services: ["seating", "charging"] }));
  gateNodes.push(node(`Gate_B${idx + 1}`, 5, gz, { type: "gate", zone: "gate_piers", label: `Gate B${idx + 1}`, services: ["seating", "charging", "water_station"] }));
});

// =========================================================================
// 8. ARRIVAL (separate flow for arriving passengers)
// =========================================================================
const arrivalNodes = [
  // gridZ = 8 : arrival corridor (passengers exiting gates - aligned to gate columns)
  node("Arrival_Corridor_AW", -5, 8, { type: "junction", zone: "arrival", label: "Arrival Corridor (Pier A West)" }),
  node("Arrival_Corridor_AI", -1, 8, { type: "junction", zone: "arrival", label: "Arrival Corridor (Pier A Inner)" }),
  node("Arrival_Corridor_C", 0, 8, { type: "junction", zone: "arrival", label: "Arrival Corridor Central" }),
  node("Arrival_Corridor_BI", 1, 8, { type: "junction", zone: "arrival", label: "Arrival Corridor (Pier B Inner)" }),
  node("Arrival_Corridor_BE", 5, 8, { type: "junction", zone: "arrival", label: "Arrival Corridor (Pier B East)" }),

  // gridZ = 9 : arrival immigration (international arrivals - aligned to gate-corridor X)
  node("Imm_Arr_W", -1, 9, { type: "security", zone: "arrival", label: "Arrival Immigration West", services: ["passport_control", "visa_check", "biometric"] }),
  node("Imm_Arr_C", 0, 9, { type: "security", zone: "arrival", label: "Arrival Immigration Hub", services: ["passport_control", "visa_check", "biometric", "secondary_room"] }),
  node("Imm_Arr_E", 1, 9, { type: "security", zone: "arrival", label: "Arrival Immigration East", services: ["passport_control", "visa_check", "biometric"] }),

  // gridZ = 10 : baggage carousels (5 in a row, central 3 align with Imm)
  node("Baggage_1", -3, 10, { type: "baggage", zone: "arrival", label: "Baggage Carousel 1", services: ["baggage_claim", "lost_baggage_office"] }),
  node("Baggage_2", -1, 10, { type: "baggage", zone: "arrival", label: "Baggage Carousel 2", services: ["baggage_claim"] }),
  node("Baggage_3", 0, 10, { type: "baggage", zone: "arrival", label: "Baggage Carousel 3", services: ["baggage_claim"] }),
  node("Baggage_4", 1, 10, { type: "baggage", zone: "arrival", label: "Baggage Carousel 4", services: ["baggage_claim"] }),
  node("Baggage_5", 3, 10, { type: "baggage", zone: "arrival", label: "Baggage Carousel 5", services: ["baggage_claim", "oversized_baggage_collection"] }),

  // gridZ = 11 : customs
  node("Customs_Green", -1, 11, { type: "security", zone: "arrival", label: "Customs Green Channel", services: ["customs_nothing_to_declare"] }),
  node("Customs_Hub", 0, 11, { type: "security", zone: "arrival", label: "Customs Hub", services: ["customs_inspection"] }),
  node("Customs_Red", 1, 11, { type: "security", zone: "arrival", label: "Customs Red Channel", services: ["customs_declaration", "duty_payment"] }),

  // gridZ = 12 : arrival hall services
  node("Arrival_Hall_W", -3, 12, { type: "junction", zone: "arrival", label: "Arrival Hall West" }),
  node("Currency_Exchange", -1, 12, { type: "service", zone: "arrival", label: "Currency Exchange", services: ["currency_exchange", "atm"] }),
  node("Arrival_Hall_C", 0, 12, { type: "junction", zone: "arrival", label: "Arrival Hall Central", services: ["info", "lost_found"] }),
  node("SIM_Kiosk", 1, 12, { type: "service", zone: "arrival", label: "SIM Card & Connectivity", services: ["sim_card", "wifi_help"] }),
  node("Arrival_Hall_E", 3, 12, { type: "junction", zone: "arrival", label: "Arrival Hall East" }),

  // gridZ = 13 : ground transport
  node("Taxi_Stand", -3, 13, { type: "entry", zone: "arrival", label: "Taxi & Rideshare", services: ["taxi", "rideshare"] }),
  node("Hotel_Shuttle", -1, 13, { type: "entry", zone: "arrival", label: "Hotel Shuttle", services: ["hotel_shuttle", "airport_hotel"] }),
  node("Metro_Connection", 1, 13, { type: "entry", zone: "arrival", label: "Metro Connection", services: ["metro", "public_transport"] }),
  node("Bus_Stand", 3, 13, { type: "entry", zone: "arrival", label: "Bus & Coach Stand", services: ["bus", "intercity_coach"] })
];

// =========================================================================
// Combine, validate, and build edges
// =========================================================================
const allNodes = [
  ...landsideNodes,
  ...securityNodes,
  ...immigrationNodes,
  ...cleanedAirsideNodes,
  ...pierNodes,
  ...gateNodes,
  ...arrivalNodes
];
const nodeById = new Map(allNodes.map((n) => [n.id, n]));

// Edge definitions: list of corridor "runs" through the grid. Each run is a
// row or column that connects every consecutive pair of nodes whose grid
// coordinates differ by exactly 1.
const edgeDefs = [];
const connectRow = (ids) => {
  for (let i = 0; i < ids.length - 1; i += 1) edgeDefs.push([ids[i], ids[i + 1]]);
};

// Vertical spine through the entire airport
connectRow([
  "Curbside_C", "InfoDesk_C", "CheckIn_Hub", "Pre_Security_Hub", "Sec_Hub",
  "Imm_Hub", "Retail_Hub", "Plaza_Hub", "Service_Hub", "PierC"
]);

// Landside horizontal rows
connectRow(["Trolleys_W", "Curbside_W", "Curbside_C", "Curbside_E", "Trolleys_E"]);
connectRow(["AccessHelp_W", "InfoDesk_W", "InfoDesk_C", "InfoDesk_E", "AccessHelp_E"]);
connectRow(["CheckIn_T1_A", "CheckIn_T1_B", "CheckIn_Hub_W", "CheckIn_Hub", "CheckIn_Hub_E", "CheckIn_T2_B", "CheckIn_T2_A"]);
connectRow(["Kiosk_W", "BagDrop_W", "Pre_Security_Hub", "BagDrop_E", "Kiosk_E"]);

// Landside vertical drops
connectRow(["Trolleys_W", "AccessHelp_W"]); // far west column
connectRow(["AccessHelp_W", "CheckIn_T1_A"]);
connectRow(["Curbside_W", "InfoDesk_W"]);
connectRow(["InfoDesk_W", "CheckIn_T1_B"]);
connectRow(["CheckIn_T1_B", "Kiosk_W"]);
connectRow(["CheckIn_Hub_W", "BagDrop_W"]);
connectRow(["CheckIn_Hub_E", "BagDrop_E"]);
connectRow(["CheckIn_T2_B", "Kiosk_E"]);
connectRow(["InfoDesk_E", "CheckIn_T2_B"]);
connectRow(["Curbside_E", "InfoDesk_E"]);
connectRow(["AccessHelp_E", "CheckIn_T2_A"]);
connectRow(["Trolleys_E", "AccessHelp_E"]);

// Landside -> Security drop (only via central/peripheral)
connectRow(["Kiosk_W", "Sec_Lane_T1_2"]);
connectRow(["BagDrop_W", "Sec_Lane_T1_1"]);
connectRow(["Pre_Security_Hub", "Sec_Hub"]); // already in spine
connectRow(["BagDrop_E", "Sec_Lane_T2_1"]);
connectRow(["Kiosk_E", "Sec_Lane_T2_2"]);
connectRow(["CheckIn_T1_A", "Sec_Lane_T1_F"]); // family lane via outer column
connectRow(["CheckIn_T2_A", "Sec_Lane_T2_F"]);

// Security row (lateral movement between lanes)
connectRow(["Sec_Lane_T1_F", "Sec_Lane_T1_2", "Sec_Lane_T1_1", "Sec_Hub", "Sec_Lane_T2_1", "Sec_Lane_T2_2", "Sec_Lane_T2_F"]);

// Security -> Immigration drop
connectRow(["Sec_Lane_T1_F", "LiquidDisposal_W"]);
connectRow(["Sec_Lane_T1_2", "Imm_EGate_W"]);
connectRow(["Sec_Lane_T1_1", "Imm_Counter_W"]);
connectRow(["Sec_Hub", "Imm_Hub"]); // spine
connectRow(["Sec_Lane_T2_1", "Imm_Counter_E"]);
connectRow(["Sec_Lane_T2_2", "Imm_EGate_E"]);
connectRow(["Sec_Lane_T2_F", "LiquidDisposal_E"]);

// Immigration row (lateral)
connectRow(["LiquidDisposal_W", "Imm_EGate_W", "Imm_Counter_W", "Imm_Hub", "Imm_Counter_E", "Imm_EGate_E", "LiquidDisposal_E"]);

// Immigration -> Airside Retail drop
connectRow(["LiquidDisposal_W", "DutyFree_W"]);
connectRow(["Imm_EGate_W", "Shop_Books"]);
connectRow(["Imm_Counter_W", "Shop_Pharmacy"]);
connectRow(["Imm_Hub", "Retail_Hub"]); // spine
connectRow(["Imm_Counter_E", "Shop_Electronics"]);
connectRow(["Imm_EGate_E", "Shop_Beauty"]);
connectRow(["LiquidDisposal_E", "Shop_Fashion"]);

// Airside retail row
connectRow(["DutyFree_W", "Shop_Books", "Shop_Pharmacy", "Retail_Hub", "Shop_Electronics", "Shop_Beauty", "Shop_Fashion"]);
// Restroom spurs at retail
connectRow(["Restrooms_Retail_W", "DutyFree_W"]);
connectRow(["Shop_Fashion", "Restrooms_Retail_E"]);

// Retail -> Food drop
connectRow(["DutyFree_W", "Food_Coffee_W"]);
connectRow(["Shop_Books", "Food_Indian"]);
connectRow(["Shop_Pharmacy", "Food_FastFood"]);
connectRow(["Retail_Hub", "Plaza_Hub"]); // spine
connectRow(["Shop_Electronics", "Food_Coffee_C"]);
connectRow(["Shop_Beauty", "Food_Souvenirs"]);
connectRow(["Shop_Fashion", "Food_Toys"]);

// Food court row
connectRow(["Food_Coffee_W", "Food_Indian", "Food_FastFood", "Plaza_Hub", "Food_Coffee_C", "Food_Souvenirs", "Food_Toys"]);
connectRow(["Restrooms_Food_W", "Food_Coffee_W"]);
connectRow(["Food_Toys", "Restrooms_Food_E"]);

// Food -> Services drop
connectRow(["Food_Coffee_W", "Lounge_Premium_W"]);
connectRow(["Food_Indian", "FamilyRoom"]);
connectRow(["Food_FastFood", "PrayerRoom"]);
connectRow(["Plaza_Hub", "Service_Hub"]); // spine
connectRow(["Food_Coffee_C", "MedicalRoom"]);
connectRow(["Food_Souvenirs", "SmokingLounge"]);
connectRow(["Food_Toys", "Lounge_Premium_E"]);

// Services row
connectRow(["Lounge_Premium_W", "FamilyRoom", "PrayerRoom", "Service_Hub", "MedicalRoom", "SmokingLounge", "Lounge_Premium_E"]);

// Services -> Pier drop
connectRow(["Lounge_Premium_W", "PierA_Outer"]);
connectRow(["FamilyRoom", "PierA_Mid"]);
connectRow(["PrayerRoom", "PierA_Inner"]);
connectRow(["Service_Hub", "PierC"]); // spine
connectRow(["MedicalRoom", "PierB_Inner"]);
connectRow(["SmokingLounge", "PierB_Mid"]);
connectRow(["Lounge_Premium_E", "PierB_Outer"]);

// Pier row
connectRow(["PierA_Far", "PierA_Outer", "PierA_Mid", "PierA_Inner", "PierC", "PierB_Inner", "PierB_Mid", "PierB_Outer", "PierB_Far"]);

// Gate columns (each pier junction drops south through 5 gates)
const gateColumns = [
  ["PierA_Outer", "Gate_A1", "Gate_A2", "Gate_A3", "Gate_A4", "Gate_A5"],
  ["PierA_Inner", "Gate_A6", "Gate_A7", "Gate_A8", "Gate_A9", "Gate_A10"],
  ["PierB_Inner", "Gate_B6", "Gate_B7", "Gate_B8", "Gate_B9", "Gate_B10"],
  ["PierB_Outer", "Gate_B1", "Gate_B2", "Gate_B3", "Gate_B4", "Gate_B5"]
];
gateColumns.forEach(connectRow);

// Gates -> Arrival corridor (deepest gates connect to arrival corridor row at same X)
connectRow(["Gate_A5", "Arrival_Corridor_AW"]);
connectRow(["Gate_A10", "Arrival_Corridor_AI"]);
connectRow(["Gate_B10", "Arrival_Corridor_BI"]);
connectRow(["Gate_B5", "Arrival_Corridor_BE"]);
// Arrival corridor lateral row
connectRow(["Arrival_Corridor_AW", "Arrival_Corridor_AI", "Arrival_Corridor_C", "Arrival_Corridor_BI", "Arrival_Corridor_BE"]);
// Arrival corridor -> Immigration arrival (aligned at X = -1, 0, 1)
connectRow(["Arrival_Corridor_AI", "Imm_Arr_W"]);
connectRow(["Arrival_Corridor_C", "Imm_Arr_C"]);
connectRow(["Arrival_Corridor_BI", "Imm_Arr_E"]);
// Arrival immigration row + drops to baggage
connectRow(["Imm_Arr_W", "Imm_Arr_C", "Imm_Arr_E"]);
connectRow(["Imm_Arr_W", "Baggage_2"]);
connectRow(["Imm_Arr_C", "Baggage_3"]);
connectRow(["Imm_Arr_E", "Baggage_4"]);
// Baggage row (5 carousels)
connectRow(["Baggage_1", "Baggage_2", "Baggage_3", "Baggage_4", "Baggage_5"]);
// Baggage -> Customs (aligned at X = -1, 0, 1)
connectRow(["Baggage_2", "Customs_Green"]);
connectRow(["Baggage_3", "Customs_Hub"]);
connectRow(["Baggage_4", "Customs_Red"]);
// Customs row
connectRow(["Customs_Green", "Customs_Hub", "Customs_Red"]);
// Customs -> Arrival hall
connectRow(["Customs_Green", "Currency_Exchange"]);
connectRow(["Customs_Hub", "Arrival_Hall_C"]);
connectRow(["Customs_Red", "SIM_Kiosk"]);
// Arrival hall row
connectRow(["Arrival_Hall_W", "Currency_Exchange", "Arrival_Hall_C", "SIM_Kiosk", "Arrival_Hall_E"]);
// Arrival hall -> Ground transport (aligned at X = -3, -1, 1, 3)
connectRow(["Arrival_Hall_W", "Taxi_Stand"]);
connectRow(["Currency_Exchange", "Hotel_Shuttle"]);
connectRow(["SIM_Kiosk", "Metro_Connection"]);
connectRow(["Arrival_Hall_E", "Bus_Stand"]);
// Ground transport row
connectRow(["Taxi_Stand", "Hotel_Shuttle", "Metro_Connection", "Bus_Stand"]);

// =========================================================================
// Validate every edge is purely orthogonal (any step count along one axis).
// We allow multi-step corridors because junctions = decision points; pressing
// forward jumps directly to the next named node in that direction.
// =========================================================================
const issues = [];
edgeDefs.forEach(([from, to]) => {
  const a = nodeById.get(from);
  const b = nodeById.get(to);
  if (!a || !b) {
    issues.push(`missing node in edge ${from} -> ${to}`);
    return;
  }
  const dx = Math.abs(a.gridX - b.gridX);
  const dz = Math.abs(a.gridZ - b.gridZ);
  if (dx > 0 && dz > 0) {
    issues.push(`non-orthogonal edge ${from} (${a.gridX},${a.gridZ}) -> ${to} (${b.gridX},${b.gridZ})`);
  }
  if (dx === 0 && dz === 0) {
    issues.push(`zero-length edge ${from} -> ${to}`);
  }
});
if (issues.length > 0) {
  console.error("Edge validation issues:", issues.slice(0, 5));
  throw new Error(`Edge validation failed: ${issues.length} bad edges. First: ${issues[0]}`);
}

const distance = (a, b) => Math.round(Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]));
const edges = edgeDefs.map(([from, to]) => ({
  from,
  to,
  weight: distance(nodeById.get(from), nodeById.get(to)),
  bidirectional: true
}));

// Cardinal-neighbour lookup. Multi-step orthogonal edges resolve by sign, not
// by magnitude, so a corridor of any length still maps cleanly to N/S/E/W.
const directionByDelta = (dx, dz) => {
  if (dx > 0 && dz === 0) return "E";
  if (dx < 0 && dz === 0) return "W";
  if (dz > 0 && dx === 0) return "S";
  if (dz < 0 && dx === 0) return "N";
  return null;
};

const cardinalNeighbours = {};
allNodes.forEach((n) => {
  cardinalNeighbours[n.id] = { N: null, S: null, E: null, W: null };
});
edges.forEach((edge) => {
  const a = nodeById.get(edge.from);
  const b = nodeById.get(edge.to);
  cardinalNeighbours[a.id][directionByDelta(b.gridX - a.gridX, b.gridZ - a.gridZ)] = b.id;
  cardinalNeighbours[b.id][directionByDelta(a.gridX - b.gridX, a.gridZ - b.gridZ)] = a.id;
});

const graph = {};
allNodes.forEach((n) => {
  graph[n.id] = {};
});
edges.forEach((edge) => {
  graph[edge.from][edge.to] = edge.weight;
  graph[edge.to][edge.from] = edge.weight;
});

// =========================================================================
// Zones (for floor coloring + AI grounding)
// =========================================================================
const zones = [
  {
    id: "landside",
    name: "Landside (Public)",
    description: "Public, pre-security area where passengers arrive, find their airline, and check in. Free to enter and exit. After this you cross security and cannot return without re-screening.",
    color: "#cfe1ec",
    polygon: bbox(landsideNodes)
  },
  {
    id: "security",
    name: "Security Transition",
    description: "The screening checkpoint. Passengers are scanned, bags are X-rayed, prohibited liquids are disposed. Crossing this is one-way unless you re-screen.",
    color: "#f4cfcf",
    polygon: bbox(securityNodes)
  },
  {
    id: "immigration",
    name: "Immigration (International Departures)",
    description: "Passport control and e-gates for international departures. Domestic passengers skip this zone.",
    color: "#e7d8f0",
    polygon: bbox(immigrationNodes)
  },
  {
    id: "airside_retail",
    name: "Airside Retail",
    description: "Duty-free, electronics, books, pharmacy, fashion. Open only to passengers who have cleared security.",
    color: "#f7e6c2",
    polygon: bbox(cleanedAirsideNodes.filter((n) => n.zone === "airside_retail"))
  },
  {
    id: "airside_food",
    name: "Airside Food Court",
    description: "Restaurants, cafes, food court, and central plaza. All airside.",
    color: "#f5dfba",
    polygon: bbox(cleanedAirsideNodes.filter((n) => n.zone === "airside_food"))
  },
  {
    id: "airside_services",
    name: "Airside Services",
    description: "Premium lounges, prayer room, family/nursing room, medical room, smoking lounge, info kiosk. All airside.",
    color: "#dfe9d6",
    polygon: bbox(cleanedAirsideNodes.filter((n) => n.zone === "airside_services"))
  },
  {
    id: "gate_piers",
    name: "Gate Piers",
    description: "Two branching piers (A west, B east) with gates A1-A10 and B1-B10. Each pier junction has water and charging.",
    color: "#cce0e4",
    polygon: bbox([...pierNodes, ...gateNodes])
  },
  {
    id: "arrival",
    name: "Arrival Hall",
    description: "Arrival immigration, baggage claim carousels, customs (green/red channels), arrival hall services, and ground transport. Separate from departures flow.",
    color: "#d8e8d8",
    polygon: bbox(arrivalNodes)
  }
];

function bbox(nodes) {
  if (nodes.length === 0) return [];
  const xs = nodes.map((n) => n.position[0]);
  const zs = nodes.map((n) => n.position[2]);
  const pad = GRID_STEP * 0.55;
  const minX = Math.min(...xs) - pad;
  const maxX = Math.max(...xs) + pad;
  const minZ = Math.min(...zs) - pad;
  const maxZ = Math.max(...zs) + pad;
  return [
    [minX, minZ],
    [maxX, minZ],
    [maxX, maxZ],
    [minX, maxZ]
  ];
}

// =========================================================================
// Shops (decorated metadata for known shop nodes)
// =========================================================================
const shopMounts = {
  shop_01: "Food_Coffee_C", // Starbucks
  shop_02: "Shop_Books", // WHSmith
  shop_03: "Shop_Electronics", // Croma
  shop_04: "Shop_Fashion", // Fabindia
  shop_05: "Shop_Pharmacy", // Apollo Pharmacy
  shop_06: "Food_Indian", // Haldiram's
  shop_07: "Food_Coffee_W", // Theobroma
  shop_08: "DutyFree_W", // Mumbai Duty Free
  shop_09: "Shop_Beauty", // Forest Essentials
  shop_10: "Food_Souvenirs", // Chumbak
  shop_11: "Food_Toys", // Hamleys
  shop_12: "Food_FastFood" // Burger King
};

const shopMeta = [
  {
    id: "shop_01", category: "food", name: "Starbucks", tag: "coffee_shop",
    offers: "Coffee, cold brew, and quick breakfast",
    description: "Global coffeehouse known for hand-crafted espresso, cold brew, and grab-and-go pastries. Mobile order pickup available.",
    rating: 4.6, review_count: 2487, wait_time: "4-8 mins", open_hours: "24/7", visual_color: "#00704a",
    price_range: "₹₹", currency: "INR", payment_methods: ["card", "upi", "applepay", "googlepay", "cash"],
    signature_items: [
      { name: "Caffe Latte (Tall)", price: 320 },
      { name: "Cold Brew", price: 360 },
      { name: "Masala Chai Tea Latte", price: 290 },
      { name: "Veg Croissant", price: 240 }
    ],
    dietary: { vegetarian: true, vegan_options: true, halal: true, gluten_free_options: true, allergens: ["dairy", "nuts", "gluten"] },
    amenities: { seating: 28, wifi: true, power_outlets: 12, ac: true, takeaway: true, mobile_order: true },
    accessibility: { wheelchair: true, hearing_loop: false, braille_menu: false, large_print_menu: true },
    languages_spoken: ["English", "Hindi", "Marathi"],
    contact: { extension: "T2-401" },
    promotion: "20% off any handcrafted drink with boarding pass before 10 AM",
    crowd_level: "medium",
    estimated_visit_minutes: 9
  },
  {
    id: "shop_02", category: "books", name: "WHSmith", tag: "book_store",
    offers: "Books, magazines, stationery, travel essentials",
    description: "Travel-focused bookstore stocking bestsellers, regional press, travel guides, neck pillows, eye masks, and last-minute charging cables.",
    rating: 4.4, review_count: 612, wait_time: "0-3 mins", open_hours: "06:00-23:00", visual_color: "#0b4ea2",
    price_range: "₹₹", currency: "INR", payment_methods: ["card", "upi", "cash"],
    signature_items: [
      { name: "Lonely Planet India 2025", price: 1499 },
      { name: "Kindle case + USB-C", price: 1299 },
      { name: "Travel neck pillow", price: 899 },
      { name: "Adapter (universal)", price: 1799 }
    ],
    dietary: null,
    amenities: { wifi: false, ac: true, takeaway: true, gift_wrap: true },
    accessibility: { wheelchair: true, hearing_loop: false, braille_signage: false, large_print_signage: true },
    languages_spoken: ["English", "Hindi"],
    contact: { extension: "T2-412" },
    promotion: "Buy any book, get 10% off a travel accessory",
    crowd_level: "low",
    estimated_visit_minutes: 6
  },
  {
    id: "shop_03", category: "electronics", name: "Croma", tag: "electronics",
    offers: "Chargers, headphones, power banks, travel tech",
    description: "Indian consumer electronics chain - quick fixes for chargers, USB-C cables, travel adapters, headphones, and power banks. Brand warranty applied at checkout.",
    rating: 4.3, review_count: 1156, wait_time: "0-5 mins", open_hours: "06:00-23:30", visual_color: "#00a6a6",
    price_range: "₹₹₹", currency: "INR", payment_methods: ["card", "upi", "emi", "applepay", "googlepay"],
    signature_items: [
      { name: "Apple 20W USB-C Adapter", price: 1899 },
      { name: "Anker 20000mAh Power Bank", price: 3299 },
      { name: "Sony WH-CH720N Headphones", price: 8990 },
      { name: "Universal Travel Adapter", price: 1599 }
    ],
    dietary: null,
    amenities: { wifi: false, ac: true, demo_units: true, on_site_repair_basic: true, gst_invoice: true },
    accessibility: { wheelchair: true, hearing_loop: true, large_print_signage: true },
    languages_spoken: ["English", "Hindi", "Marathi", "Tamil"],
    contact: { extension: "T2-418" },
    promotion: "15% off power banks and travel adapters with boarding pass",
    crowd_level: "medium",
    estimated_visit_minutes: 12
  },
  {
    id: "shop_04", category: "fashion", name: "Fabindia", tag: "fashion_store",
    offers: "Ethnic wear, scarves, and Indian gifts",
    description: "Heritage Indian apparel and home goods - kurtas, dupattas, handloom scarves, organic cotton stoles, hand-block printed gifts.",
    rating: 4.1, review_count: 384, wait_time: "0-4 mins", open_hours: "08:00-23:00", visual_color: "#b56a28",
    price_range: "₹₹₹", currency: "INR", payment_methods: ["card", "upi", "cash"],
    signature_items: [
      { name: "Cotton Kurta (men)", price: 2499 },
      { name: "Silk Dupatta", price: 1899 },
      { name: "Handloom Stole", price: 1399 },
      { name: "Spice Box gift", price: 1099 }
    ],
    dietary: null,
    amenities: { wifi: false, ac: true, fitting_room: true, gift_wrap: true, gst_invoice: true },
    accessibility: { wheelchair: true, large_print_signage: false },
    languages_spoken: ["English", "Hindi"],
    contact: { extension: "T2-422" },
    promotion: "Free monogram on stoles over ₹1500",
    crowd_level: "low",
    estimated_visit_minutes: 14
  },
  {
    id: "shop_05", category: "pharmacy", name: "Apollo Pharmacy", tag: "pharmacy",
    offers: "Medicines, wellness kits, first-aid travel packs",
    description: "Trusted Indian pharmacy chain. Carries OTC medicines, prescription dispensing (with valid Rx), travel wellness kits, baby care, contact lens solution.",
    rating: 4.5, review_count: 1892, wait_time: "2-5 mins", open_hours: "24/7", visual_color: "#008f5a",
    price_range: "₹", currency: "INR", payment_methods: ["card", "upi", "cash", "insurance"],
    signature_items: [
      { name: "Travel First-Aid Kit", price: 599 },
      { name: "Motion Sickness Strip", price: 89 },
      { name: "Hand sanitizer 100ml", price: 79 },
      { name: "ORS sachets (10)", price: 99 }
    ],
    dietary: null,
    amenities: { wifi: false, ac: true, prescription_dispensing: true, baby_care: true, oxygen_available: true },
    accessibility: { wheelchair: true, hearing_loop: true, braille_signage: true, large_print_signage: true },
    languages_spoken: ["English", "Hindi", "Marathi", "Tamil", "Telugu"],
    contact: { extension: "T2-405", emergency_line: "T2-911" },
    promotion: "Free BP check with any purchase",
    crowd_level: "low",
    estimated_visit_minutes: 5
  },
  {
    id: "shop_06", category: "food", name: "Haldiram's", tag: "quick_food",
    offers: "Indian snacks, sweets, meals, and packed gifts",
    description: "Iconic Indian QSR - thalis, chaat, samosas, dosas, biryani; pre-packed sweets, namkeen, and gift boxes for travel.",
    rating: 4.3, review_count: 3204, wait_time: "5-8 mins", open_hours: "05:00-23:00", visual_color: "#e31e24",
    price_range: "₹₹", currency: "INR", payment_methods: ["card", "upi", "cash"],
    signature_items: [
      { name: "Punjabi Thali", price: 540 },
      { name: "Masala Dosa", price: 280 },
      { name: "Samosa Chaat", price: 220 },
      { name: "Mithai Gift Box (500g)", price: 720 }
    ],
    dietary: { vegetarian: true, vegan_options: true, jain_options: true, halal: true, gluten_free_options: false, allergens: ["dairy", "nuts", "wheat"] },
    amenities: { seating: 64, wifi: true, power_outlets: 18, ac: true, takeaway: true, packed_meals: true, hot_meals: true },
    accessibility: { wheelchair: true, hearing_loop: false, large_print_menu: true, kid_high_chairs: true },
    languages_spoken: ["English", "Hindi", "Marathi", "Punjabi"],
    contact: { extension: "T2-433" },
    promotion: "20% off thalis between 14:00-16:30",
    crowd_level: "high",
    estimated_visit_minutes: 18
  },
  {
    id: "shop_07", category: "food", name: "Theobroma", tag: "bakery",
    offers: "Brownies, cakes, sandwiches, and coffee",
    description: "Mumbai-born patisserie - signature brownies, sandwiches, croissants, slow-drip coffee, and cakes-by-the-slice.",
    rating: 4.2, review_count: 998, wait_time: "0-4 mins", open_hours: "06:00-22:00", visual_color: "#4b2d1f",
    price_range: "₹₹", currency: "INR", payment_methods: ["card", "upi", "cash"],
    signature_items: [
      { name: "Signature Chocolate Brownie", price: 245 },
      { name: "Croissant (butter)", price: 180 },
      { name: "Hazelnut Iced Coffee", price: 320 },
      { name: "Chicken Tikka Sandwich", price: 380 }
    ],
    dietary: { vegetarian: true, vegan_options: true, eggless_options: true, halal: true, gluten_free_options: false, allergens: ["dairy", "eggs", "nuts", "gluten"] },
    amenities: { seating: 22, wifi: true, power_outlets: 8, ac: true, takeaway: true, packed_pastries: true },
    accessibility: { wheelchair: true, large_print_menu: true },
    languages_spoken: ["English", "Hindi", "Marathi"],
    contact: { extension: "T2-435" },
    promotion: "Buy 2 brownies, get 1 free (after 19:00)",
    crowd_level: "medium",
    estimated_visit_minutes: 8
  },
  {
    id: "shop_08", category: "shopping", name: "Mumbai Duty Free", tag: "duty_free",
    offers: "Perfume, liquor, chocolate, and travel exclusives",
    description: "Largest duty-free in T2 - international whiskies, premium gin, perfumes, designer chocolate, watches, and travel exclusives. Show boarding pass at entry.",
    rating: 4.5, review_count: 5124, wait_time: "3-8 mins", open_hours: "24/7", visual_color: "#d7a21b",
    price_range: "₹₹₹₹", currency: "USD/INR", payment_methods: ["card", "upi", "cash", "multi_currency"],
    signature_items: [
      { name: "Johnnie Walker Black Label 1L", price: 3200, price_currency: "INR" },
      { name: "Chanel No. 5 EDP 100ml", price: 12800, price_currency: "INR" },
      { name: "Toblerone 500g (Buy 2 Get 1)", price: 1200, price_currency: "INR" },
      { name: "Apple AirPods Pro 2", price: 22999, price_currency: "INR" }
    ],
    dietary: null,
    amenities: { wifi: false, ac: true, gift_wrap: true, gst_invoice: true, currency_acceptance: ["INR", "USD", "EUR", "GBP", "AED"], duty_free_eligible: true, max_alcohol_litres: 2 },
    accessibility: { wheelchair: true, hearing_loop: true, large_print_signage: true },
    languages_spoken: ["English", "Hindi", "Mandarin", "Arabic"],
    contact: { extension: "T2-450" },
    promotion: "20% off all luxury perfumes with boarding pass",
    crowd_level: "high",
    estimated_visit_minutes: 22,
    requires_boarding_pass: true
  },
  {
    id: "shop_09", category: "beauty", name: "Forest Essentials", tag: "beauty_gifts",
    offers: "Luxury Ayurveda skincare and gift boxes",
    description: "Premium Indian Ayurveda house - face creams, oils, gift boxes; plant-based, GMP-certified, and travel-size kits.",
    rating: 4.6, review_count: 743, wait_time: "2-5 mins", open_hours: "07:00-23:00", visual_color: "#7d8b3a",
    price_range: "₹₹₹₹", currency: "INR", payment_methods: ["card", "upi", "cash"],
    signature_items: [
      { name: "Soundarya Cream 50g", price: 4200 },
      { name: "Kumkumadi Oil 30ml", price: 4800 },
      { name: "Travel Discovery Kit", price: 2900 },
      { name: "Rose Mist (Festive)", price: 1900 }
    ],
    dietary: null,
    amenities: { wifi: false, ac: true, gift_wrap: true, sample_testers: true, gst_invoice: true },
    accessibility: { wheelchair: true, hearing_loop: false, large_print_signage: false },
    languages_spoken: ["English", "Hindi"],
    contact: { extension: "T2-460" },
    promotion: "Complimentary Kumkumadi sample with any ₹2000+ purchase",
    crowd_level: "low",
    estimated_visit_minutes: 12
  },
  {
    id: "shop_10", category: "gifts", name: "Chumbak", tag: "souvenir_store",
    offers: "India-inspired souvenirs, accessories, and gifts",
    description: "Quirky India-inspired lifestyle brand - mugs, magnets, totes, notebooks, phone cases. Great last-mile gifting for travelers.",
    rating: 4.2, review_count: 521, wait_time: "0-4 mins", open_hours: "08:00-22:30", visual_color: "#e64b7a",
    price_range: "₹₹", currency: "INR", payment_methods: ["card", "upi", "cash"],
    signature_items: [
      { name: "Bombay Magnet Set", price: 549 },
      { name: "Travel Mug (Mumbai)", price: 799 },
      { name: "Tote Bag (Aam Panna)", price: 999 },
      { name: "Leather Passport Cover", price: 1299 }
    ],
    dietary: null,
    amenities: { wifi: false, ac: true, gift_wrap: true, packaging_eco: true },
    accessibility: { wheelchair: true, large_print_signage: false },
    languages_spoken: ["English", "Hindi"],
    contact: { extension: "T2-465" },
    promotion: "Buy 3 magnets, get 1 free",
    crowd_level: "low",
    estimated_visit_minutes: 9
  },
  {
    id: "shop_11", category: "toys", name: "Hamleys", tag: "toy_store",
    offers: "Toys, kids gifts, and activity kits",
    description: "London-origin toy store. Soft toys, building kits, board games, kids activity packs, and travel-sized fidgets. Family-friendly seating outside.",
    rating: 4.5, review_count: 832, wait_time: "0-5 mins", open_hours: "08:00-23:00", visual_color: "#d71920",
    price_range: "₹₹₹", currency: "INR", payment_methods: ["card", "upi", "cash"],
    signature_items: [
      { name: "Hamleys Bear (Medium)", price: 2499 },
      { name: "Travel Activity Kit", price: 999 },
      { name: "LEGO Classic 90 pcs", price: 1799 },
      { name: "Magnetic Drawing Board", price: 1499 }
    ],
    dietary: null,
    amenities: { wifi: false, ac: true, gift_wrap: true, demo_play_area: true, kid_friendly: true },
    accessibility: { wheelchair: true, stroller_friendly: true, large_print_signage: true },
    languages_spoken: ["English", "Hindi"],
    contact: { extension: "T2-470" },
    promotion: "10% off any soft toy with kids' boarding pass",
    crowd_level: "medium",
    estimated_visit_minutes: 12
  },
  {
    id: "shop_12", category: "food", name: "Burger King", tag: "quick_food",
    offers: "Burgers, fries, and combo meals",
    description: "Global QSR - flame-grilled Whoppers, vegetarian Whopper, fries, soft drinks. Self-serve kiosks available.",
    rating: 4.1, review_count: 1572, wait_time: "6-10 mins", open_hours: "06:00-23:30", visual_color: "#f5a623",
    price_range: "₹₹", currency: "INR", payment_methods: ["card", "upi", "cash"],
    signature_items: [
      { name: "Veggie Whopper Combo", price: 359 },
      { name: "Whopper Combo (chicken)", price: 419 },
      { name: "Crispy Veg Combo", price: 269 },
      { name: "Soft serve cone", price: 49 }
    ],
    dietary: { vegetarian: true, vegan_options: true, jain_options: false, halal: true, gluten_free_options: false, allergens: ["dairy", "wheat", "soy"] },
    amenities: { seating: 56, wifi: true, power_outlets: 14, ac: true, takeaway: true, self_serve_kiosks: 4, hot_meals: true },
    accessibility: { wheelchair: true, hearing_loop: false, large_print_menu: true, kid_high_chairs: true },
    languages_spoken: ["English", "Hindi", "Marathi"],
    contact: { extension: "T2-475" },
    promotion: "Free upgrade to large fries with any combo",
    crowd_level: "high",
    estimated_visit_minutes: 14
  }
];

const shops = shopMeta.map((meta) => {
  const mountId = shopMounts[meta.id];
  const mount = nodeById.get(mountId);
  if (!mount) throw new Error(`Missing mount node ${mountId} for shop ${meta.id}`);
  return {
    ...meta,
    terminal: mount.terminal,
    location_zone: mount.label,
    zone: mount.zone,
    position: [mount.position[0], 0.55, mount.position[2]],
    node_id: mountId
  };
});

const gates = gateNodes.map((g) => ({
  id: g.id.replace("Gate_", ""),
  node_id: g.id,
  terminal: g.terminal,
  position: g.position,
  gridX: g.gridX,
  gridZ: g.gridZ,
  zone: g.zone,
  flight_info:
    g.id === "Gate_B4"
      ? "AI203 to Delhi. Boarding at 18:30. Status: On time."
      : `${g.terminal} departure gate ${g.id.replace("Gate_", "")}. Status: Scheduled.`
}));

const services = allNodes
  .filter((n) => n.services && n.services.length > 0)
  .map((n) => ({
    id: n.id,
    type: n.type,
    name: n.label,
    terminal: n.terminal,
    zone: n.zone,
    position: n.position,
    services: n.services,
    accessibility: n.accessibility
  }));

// =========================================================================
// FAQ entries (passenger edge cases - grounded answers w/ route targets)
// =========================================================================
const faq = [
  { query: "lost passport", answer: "Visit the Information Desk at landside (InfoDesk_C) and your airline counter at Central Check-in Hub. They will help with airline records and refer you to the diplomatic office. Do NOT cross security yet.", route_to: "InfoDesk_C", zone_required: "landside" },
  { query: "wrong terminal", answer: "If you are at T1 and need T2, exit landside and use the inter-terminal shuttle from outside the arrivals kerb. Information Desk can confirm.", route_to: "InfoDesk_C", zone_required: "landside" },
  { query: "missed online check-in", answer: "Use a Self Check-in Kiosk (Kiosk_W or Kiosk_E) or speak to your airline at the Check-in islands. Kiosks accept walk-up bookings up to 60 minutes before departure.", route_to: "Kiosk_W", zone_required: "landside" },
  { query: "overweight baggage", answer: "Bag Drop counters (BagDrop_W or BagDrop_E) can weigh and accept oversized luggage. Excess fees may apply.", route_to: "BagDrop_W", zone_required: "landside" },
  { query: "wheelchair assistance", answer: "Accessibility Help desks at landside (AccessHelp_W or AccessHelp_E) provide wheelchair assistance, elderly help, and unaccompanied minor support. Pre-book if possible.", route_to: "AccessHelp_W", zone_required: "landside" },
  { query: "lost passport airside", answer: "If you have already cleared security and lose your passport, go to the Service Hub airside (Service_Hub) and ask for airline staff. You may need to re-do immigration.", route_to: "Service_Hub", zone_required: "airside_services" },
  { query: "where is prayer room", answer: "Multifaith Prayer Room is in the airside services row (PrayerRoom). Wudu facility and quiet space available. Wheelchair accessible.", route_to: "PrayerRoom" },
  { query: "where is family restroom", answer: "Family Restroom & Nursery is in the airside services row (FamilyRoom). Includes baby changing and a private nursing room.", route_to: "FamilyRoom" },
  { query: "where is medical room", answer: "Medical Room (MedicalRoom) is in the airside services row. For emergencies, call airport medical via any service kiosk.", route_to: "MedicalRoom" },
  { query: "where can i smoke", answer: "Smoking Lounge (SmokingLounge) is in the airside services row, east side. It is the only enclosed smoking area inside the terminal.", route_to: "SmokingLounge" },
  { query: "where is pharmacy", answer: "Apollo Pharmacy (Shop_Pharmacy) is in the airside retail row, west side. Open 24/7. Carries medicines, first-aid, and travel wellness kits.", route_to: "Shop_Pharmacy" },
  { query: "missed boarding", answer: "Go directly to your gate. If the door is closed, the gate agent or any service kiosk can rebook you. Service Hub (Service_Hub) is the central airside help point.", route_to: "Service_Hub" },
  { query: "gate change", answer: "Check the flight info displays at Plaza Hub or the Service Hub. Walking time between piers via the airside services row is 4-6 minutes.", route_to: "Service_Hub" },
  { query: "lost baggage", answer: "Lost baggage office is at Baggage Carousel 1 (Baggage_1) in the arrival hall. Bring your boarding pass and bag tag.", route_to: "Baggage_1", zone_required: "arrival" },
  { query: "ground transport", answer: "Taxi & Rideshare (Taxi_Stand), Hotel Shuttle (Hotel_Shuttle), Metro (Metro_Connection), and Bus stand are at the south end of the arrival hall.", route_to: "Taxi_Stand", zone_required: "arrival" },
  { query: "currency exchange", answer: "Currency Exchange & ATM (Currency_Exchange) is in the arrival hall, central area.", route_to: "Currency_Exchange", zone_required: "arrival" },
  { query: "sim card", answer: "SIM Card & Connectivity kiosk (SIM_Kiosk) is in the arrival hall east. They sell tourist SIMs and help with airport WiFi.", route_to: "SIM_Kiosk", zone_required: "arrival" },
  { query: "how long is security", answer: "Live wait time depends on lane. Family lanes (Sec_Lane_T1_F, Sec_Lane_T2_F) are usually faster for travelers with children. Priority lanes (Sec_Lane_T1_1, Sec_Lane_T2_1) are open to business class. Average wait: 8-15 minutes.", route_to: "Sec_Hub" },
  { query: "carry liquids", answer: "Liquids over 100ml must be checked in or disposed at the Liquid Disposal bins (LiquidDisposal_W or LiquidDisposal_E) just past security. Medicines and baby food are exempt; declare at the lane.", route_to: "Sec_Hub" },
  { query: "pet travel", answer: "Pet travel is handled at Check-in Island T2-B (CheckIn_T2_B). Required: airline-approved carrier, vaccination records, and a vet certificate.", route_to: "CheckIn_T2_B", zone_required: "landside" }
];

// =========================================================================
// Backwards-compatible shape for existing renderers
// =========================================================================
const terminals = [
  {
    id: "T1",
    name: "Terminal 1 (Domestic)",
    position: [-3 * GRID_STEP, 0, -2 * GRID_STEP],
    size: [4 * GRID_STEP, 6 * GRID_STEP],
    zones: allNodes
      .filter((n) => n.terminal === "T1" && n.type !== "junction" && n.type !== "gate")
      .map((n) => ({
        id: n.id,
        name: n.label,
        type: n.type,
        zone: n.zone,
        position: n.position,
        size: [GRID_STEP - 1.5, GRID_STEP - 1.5]
      }))
  },
  {
    id: "T2",
    name: "Terminal 2 (International)",
    position: [3 * GRID_STEP, 0, -2 * GRID_STEP],
    size: [4 * GRID_STEP, 6 * GRID_STEP],
    zones: allNodes
      .filter((n) => n.terminal === "T2" && n.type !== "junction" && n.type !== "gate")
      .map((n) => ({
        id: n.id,
        name: n.label,
        type: n.type,
        zone: n.zone,
        position: n.position,
        size: [GRID_STEP - 1.5, GRID_STEP - 1.5]
      }))
  }
];

const airportLocations = {
  gates: gates.map((g) => ({
    id: `Gate ${g.id}`,
    nodeId: g.node_id,
    category: "gate",
    terminal: g.terminal,
    zone: g.zone,
    x: g.position[0],
    y: g.position[1],
    z: g.position[2]
  })),
  shops: shops.map((s) => ({
    id: s.name,
    nodeId: s.node_id,
    category: "shop",
    type: s.category,
    terminal: s.terminal,
    zone: s.zone,
    x: s.position[0],
    y: 0,
    z: s.position[2]
  })),
  facilities: allNodes
    .filter((n) => ["restroom", "baggage", "lounge", "security", "checkin", "entry", "service"].includes(n.type))
    .map((n) => ({
      id: n.label,
      nodeId: n.id,
      category: "facility",
      type: n.type,
      terminal: n.terminal,
      zone: n.zone,
      x: n.position[0],
      y: 0,
      z: n.position[2]
    }))
};

export const airportData = {
  airport: {
    id: "csmia-mumbai-sim",
    name: "CSMIA Inspired International Airport",
    grid_step: GRID_STEP,
    design_note:
      "Realistic terminal topology: passengers progress through landside -> security -> immigration -> airside -> gates, with arrivals on a separate flow. Every walkable edge runs purely N/S or E/W exactly one grid step so the keyboard navigator (forward/left/right) walks tile-by-tile."
  },
  passenger_profile: {
    name: "Rahul Sharma",
    flight: "AI203",
    terminal: "T2",
    gate: "B4",
    boarding_time: "18:30",
    current_location: "Gate_A1",
    preferences: ["coffee", "shortest route"]
  },
  terminals,
  zones,
  gates,
  shops,
  services,
  faq,
  airportLocations,
  navigation_graph: {
    start_node: "Gate_A1",
    nodes: allNodes,
    edges,
    graph,
    cardinal_neighbours: cardinalNeighbours
  }
};

export { airportLocations, GRID_STEP };
