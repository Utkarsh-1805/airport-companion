// Curated airport FAQ content. Sourced from publicly published rules:
// • Bureau of Civil Aviation Security (BCAS) of India for prohibited items.
// • DGCA Civil Aviation Requirements for cabin / check-in baggage limits.
// • Airline-published norms (IndiGo, Air India, Vistara, Akasa, SpiceJet) for
//   weight allowances on Indian domestic & international sectors.
//
// All values are conservative defaults — actual allowance depends on the
// booked fare class and the operating carrier. The FAQ surfaces the most
// common rules a passenger needs at the kerb / check-in / security line.

export const FAQ_CATEGORIES = [
  { id: "baggage", label: "Baggage" },
  { id: "prohibited", label: "What you can't carry" },
  { id: "security", label: "Security & screening" },
  { id: "documents", label: "Documents & check-in" },
  { id: "facilities", label: "Airport facilities" },
];

export const FAQ_ITEMS = [
  // ─── Baggage ───────────────────────────────────────────────────────────
  {
    id: "checkin-weight-domestic",
    category: "baggage",
    question: "How much check-in luggage am I allowed on a domestic flight?",
    answer:
      "Most Indian domestic carriers allow 15 kg of check-in baggage per passenger in Economy on a single piece, and 20–25 kg on Premium / Business fares. IndiGo, Air India Express, SpiceJet, Akasa Air, and Vistara all use the 15 kg standard for the cheapest fares; excess weight is charged at ₹500–₹600 per kg. Always confirm with your ticket because some 'Lite' / 'Saver' fares carry zero free check-in.",
    bullets: [
      "Economy domestic: 15 kg / piece (free)",
      "Premium Economy: 20 kg / piece",
      "Business / First: 25–35 kg / 2 pieces",
      "Excess fee: ~₹500–₹600 per extra kg",
    ],
  },
  {
    id: "checkin-weight-international",
    category: "baggage",
    question: "How much check-in baggage on an international flight?",
    answer:
      "International allowances depend on whether the airline uses the weight concept (most of Asia / Middle East / Europe) or the piece concept (US / Canada / parts of Latin America). On weight, Economy is typically 23–30 kg; Business 40 kg. On piece, Economy is 2 × 23 kg and Business 2 × 32 kg. Air India and Vistara on USA routes use 2 × 23 kg in Economy.",
    bullets: [
      "Weight system (most Indian carriers): Economy 23–30 kg, Business 40 kg",
      "Piece system (US/Canada): Economy 2 × 23 kg, Business 2 × 32 kg",
      "Single piece can never weigh more than 32 kg (handler safety)",
    ],
  },
  {
    id: "cabin-weight",
    category: "baggage",
    question: "What is the cabin (carry-on) baggage weight limit?",
    answer:
      "BCAS caps Indian domestic cabin baggage at 7 kg per passenger in Economy and 10 kg in Business — strictly one piece. Maximum dimensions are 55 × 35 × 25 cm (sum of sides ≤ 115 cm). You may also carry one small personal item (handbag / laptop bag ≤ 3 kg). Anything heavier or oversized is moved to the hold at the gate.",
    bullets: [
      "Economy: 7 kg, 1 piece, 55 × 35 × 25 cm",
      "Business / First: 10 kg, 1 piece",
      "Plus 1 personal item ≤ 3 kg (laptop / handbag)",
    ],
  },
  {
    id: "infant-baggage",
    category: "baggage",
    question: "Do infants get a separate baggage allowance?",
    answer:
      "Infants under 2 (lap-held, no seat) get a small allowance of about 10 kg check-in on most carriers but no cabin baggage. A foldable stroller or car seat travels free of charge as a check-in item, usually loaded at the aircraft door.",
  },
  {
    id: "fragile-baggage",
    category: "baggage",
    question: "Can I declare fragile / valuable items?",
    answer:
      "Yes — request a 'Fragile' tag at the check-in counter. Carry valuables (cash > ₹50,000, jewellery, electronics, prescription medicine, important documents) in your cabin bag. Airlines do not assume liability for fragile or valuable items lost / damaged from check-in baggage.",
  },

  // ─── Prohibited ────────────────────────────────────────────────────────
  {
    id: "prohibited-cabin",
    category: "prohibited",
    question: "What can't I carry in my cabin bag?",
    answer:
      "Sharp objects, firearms, flammable items, and most liquids over 100 ml are prohibited in cabin baggage as per BCAS rules. Lithium spare batteries, power banks, and e-cigarettes are *cabin-only* (forbidden in check-in). Knives, scissors with blades > 6 cm, blades, screwdrivers > 10 cm, and toy guns must go to the hold.",
    bullets: [
      "Liquids/gels/aerosols > 100 ml per container",
      "Knives, scissors > 6 cm, sharp tools",
      "Firearms, replicas, ammunition",
      "Flammables (petrol, lighter fluid, paint thinner)",
      "Sports gear: cricket bats, hockey sticks, baseball bats",
    ],
  },
  {
    id: "prohibited-checkin",
    category: "prohibited",
    question: "What can't I put in check-in (hold) baggage?",
    answer:
      "Lithium-ion batteries (loose), power banks, e-cigarettes, vapes, magnetic substances, and matches must travel in the cabin only. Aerosols are allowed in check-in but each container must be ≤ 500 ml and total ≤ 2 L. Never check-in cash, jewellery, electronics, prescription medicines, or your passport.",
    bullets: [
      "Spare lithium batteries and power banks (cabin-only)",
      "E-cigarettes, vape devices, IQOS",
      "Loose matches and lighters",
      "Magnetic substances",
      "Cash, jewellery, electronics, IDs (always cabin)",
    ],
  },
  {
    id: "liquids-rule",
    category: "prohibited",
    question: "What is the liquids rule for cabin baggage?",
    answer:
      "Each container must hold no more than 100 ml. All containers together must fit inside one transparent, resealable plastic bag of capacity ≤ 1 litre. Hand the bag separately at the X-ray tray. Duty-free liquids bought after security in a sealed STEB (Security Tamper-Evident Bag) are exempt — keep the receipt visible.",
  },
  {
    id: "powerbank-rules",
    category: "prohibited",
    question: "Are power banks and lithium batteries allowed?",
    answer:
      "Power banks must be in cabin baggage only. Capacity rules apply: ≤ 100 Wh — no airline approval needed (most consumer power banks are 10,000–20,000 mAh ≈ 37–75 Wh). 100–160 Wh — airline approval needed, max 2 spare batteries. Above 160 Wh is forbidden on passenger aircraft.",
  },
  {
    id: "medicine-rules",
    category: "prohibited",
    question: "Can I carry prescription medicine and syringes?",
    answer:
      "Yes, prescription medicines (including liquids > 100 ml) are allowed in cabin baggage when accompanied by a valid prescription or doctor's letter. Syringes, insulin pens, and EpiPens travel in the cabin. Inform the security officer at the X-ray tray.",
  },

  // ─── Security & screening ──────────────────────────────────────────────
  {
    id: "security-time",
    category: "security",
    question: "How early should I reach the airport?",
    answer:
      "For Indian domestic flights, arrive at least 2 hours before departure. For international, 3 hours. Hyderabad CSMIA closes the boarding gate 25 minutes before departure (45 minutes for international). Check-in counters close 45 / 60 minutes before departure for domestic / international.",
  },
  {
    id: "security-process",
    category: "security",
    question: "What happens at the security check?",
    answer:
      "Place your boarding pass and ID on the table. All electronics > tablet size (laptops, large cameras) come out into a separate tray. Liquids bag goes in another tray. Belts, jackets, large jewellery, and shoes (if metal-rich) are removed. Walk through the metal detector while your bag goes through X-ray. A pat-down is routine if the detector flags anything.",
  },
  {
    id: "what-to-remove",
    category: "security",
    question: "What do I need to take out of my bag at security?",
    answer:
      "Take out: laptops and tablets (in their own tray), the 1-L liquid bag, large electronics (DSLR, drones), power banks, and any metal items (belts, large watches, coins). Remove jackets and outer layers. Shoes only if asked.",
  },

  // ─── Documents ─────────────────────────────────────────────────────────
  {
    id: "domestic-id",
    category: "documents",
    question: "What ID do I need for a domestic flight?",
    answer:
      "Any government-issued photo ID: Aadhaar, passport, voter ID, PAN card, driving licence, or service ID for armed forces. Children below 12 can travel on a school ID or parent's ID. DigiYatra biometric boarding is optional and replaces the boarding-pass scan.",
  },
  {
    id: "international-docs",
    category: "documents",
    question: "What documents do I need for international travel?",
    answer:
      "Passport with at least 6 months validity beyond your return date; the visa for your destination (or proof of e-visa); printed return / onward ticket; sometimes proof of accommodation. Some destinations require yellow fever vaccination cards.",
  },
  {
    id: "web-checkin",
    category: "documents",
    question: "Should I do web check-in?",
    answer:
      "Yes — domestic web check-in opens 48 hours before departure on most carriers and lets you skip the counter if you have only cabin baggage. International web check-in usually opens 24 hours before. You still need to drop checked baggage at the bag drop counter.",
  },

  // ─── Facilities ────────────────────────────────────────────────────────
  {
    id: "lounge-access",
    category: "facilities",
    question: "How do I access an airport lounge?",
    answer:
      "Lounge access is granted via Priority Pass, DragonPass, eligible credit cards (Axis Magnus, HDFC Infinia, ICICI Sapphiro, etc.), Business / First class tickets, or pay-per-entry (~₹1,800 in India). Show your boarding pass + access card / ID at the lounge entrance.",
  },
  {
    id: "wifi",
    category: "facilities",
    question: "Is there free Wi-Fi at the airport?",
    answer:
      "Yes — most Indian airports offer free Wi-Fi for 45 minutes. Connect to the SSID 'AIRPORT-FREE-WIFI' or similar; you'll receive an OTP via SMS to log in. International numbers may need to use a kiosk to obtain a printed code.",
  },
  {
    id: "wheelchair",
    category: "facilities",
    question: "How do I request a wheelchair?",
    answer:
      "Pre-book wheelchair assistance through your airline's website at least 48 hours before departure (free). On the day, head to the assistance counter near the kerb-side entrance — staff will escort you through check-in, security, and to the gate.",
  },
  {
    id: "lost-baggage",
    category: "facilities",
    question: "What if my checked baggage is lost or delayed?",
    answer:
      "Report immediately at the airline's baggage service desk in the arrivals hall — *before* leaving the airport. You'll receive a Property Irregularity Report (PIR) reference. Most bags are traced within 24–48 hours. Domestic delayed-baggage compensation is up to ₹450 per kg; international is governed by the Montreal Convention (~₹1.45 lakh / passenger maximum).",
  },
];
