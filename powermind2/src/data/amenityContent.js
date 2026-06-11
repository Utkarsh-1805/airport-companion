// Curated content layer that sits on top of the geometric airport map.
// Each entry attaches menu items / products / services / price tier to a
// shop, lounge, or service node so the assistant can answer questions like
// "what's on the Starbucks menu?" or "compare KFC and Subway".
//
// Keys match SHOP / RESTROOM / hub IDs in
// `powermind2/src/map/data/airportData.js`.

export const PRICE = {
  $: "Budget (under ₹250)",
  $$: "Mid-range (₹250–600)",
  $$$: "Premium (₹600+)",
};

export const amenityContent = {
  // ─── COFFEE / TEA ─────────────────────────────────────────────────
  "A-stb": {
    cuisine: "Coffee & bakery",
    price: "$$",
    avg_wait: "4 min",
    crowd: "high",
    signature: ["Caramel Macchiato", "Iced Brown Sugar Oatmilk Shaken Espresso"],
    menu: [
      { name: "Caramel Macchiato", price: 320, tags: ["coffee", "sweet"] },
      { name: "Cappuccino", price: 280, tags: ["coffee"] },
      { name: "Cold Brew", price: 300, tags: ["coffee", "iced"] },
      { name: "Chocolate Croissant", price: 220, tags: ["bakery", "veg"] },
      { name: "Spinach & Feta Wrap", price: 380, tags: ["veg", "savoury"] },
    ],
    rewards: "Earn 1 Star per ₹100 — redeemable in app.",
  },
  "C-stb": {
    cuisine: "Coffee & bakery",
    price: "$$",
    avg_wait: "5 min",
    crowd: "medium",
    signature: ["Pike Place Brew", "Banana Walnut Loaf"],
    menu: [
      { name: "Latte", price: 280, tags: ["coffee"] },
      { name: "Iced Americano", price: 260, tags: ["coffee", "iced"] },
      { name: "Banana Walnut Loaf", price: 240, tags: ["bakery", "veg"] },
    ],
  },
  "A-chp": {
    cuisine: "Indian tea & snacks",
    price: "$",
    avg_wait: "2 min",
    crowd: "low",
    signature: ["Masala Chai", "Bun Maska"],
    menu: [
      { name: "Masala Chai", price: 90, tags: ["tea", "veg"] },
      { name: "Filter Kaapi", price: 110, tags: ["coffee", "veg"] },
      { name: "Bun Maska", price: 120, tags: ["snack", "veg"] },
      { name: "Veg Sandwich", price: 160, tags: ["snack", "veg"] },
    ],
  },
  "A-mcs": {
    cuisine: "Coffee shop",
    price: "$",
    avg_wait: "3 min",
    crowd: "low",
    signature: ["Filter Coffee", "Egg Puff"],
    menu: [
      { name: "Minerva Filter Coffee", price: 80, tags: ["coffee"] },
      { name: "Egg Puff", price: 90, tags: ["snack", "egg"] },
    ],
  },
  "A-cnf": {
    cuisine: "Bakery / Irani",
    price: "$",
    avg_wait: "3 min",
    crowd: "medium",
    signature: ["Osmania Biscuit", "Irani Chai"],
    menu: [
      { name: "Irani Chai", price: 95, tags: ["tea", "veg"] },
      { name: "Osmania Biscuit (4)", price: 140, tags: ["bakery", "veg"] },
      { name: "Veg Puff", price: 110, tags: ["snack", "veg"] },
    ],
  },
  "C-tmh": {
    cuisine: "Coffee & donuts",
    price: "$$",
    signature: ["Double Double", "Maple Glaze Donut"],
    menu: [
      { name: "Double Double Coffee", price: 240, tags: ["coffee"] },
      { name: "Maple Glaze Donut", price: 180, tags: ["bakery"] },
      { name: "Boston Cream Donut", price: 200, tags: ["bakery"] },
    ],
  },

  // ─── FAST FOOD ────────────────────────────────────────────────────
  "A-kfc": {
    cuisine: "Fried chicken",
    price: "$$",
    avg_wait: "8 min",
    crowd: "high",
    signature: ["Hot & Crispy Chicken", "Zinger Burger"],
    menu: [
      { name: "Hot & Crispy 2 pc", price: 320, tags: ["chicken", "non-veg"] },
      { name: "Zinger Burger", price: 280, tags: ["burger", "non-veg"] },
      { name: "Veg Zinger", price: 260, tags: ["burger", "veg"] },
      { name: "Popcorn Chicken", price: 180, tags: ["chicken", "non-veg"] },
    ],
  },
  "A-sub": {
    cuisine: "Subs / sandwiches",
    price: "$$",
    avg_wait: "6 min",
    crowd: "medium",
    signature: ["Chicken Teriyaki Sub", "Veggie Delite"],
    menu: [
      { name: "6\" Chicken Teriyaki", price: 290, tags: ["sub", "non-veg"] },
      { name: "6\" Veggie Delite", price: 220, tags: ["sub", "veg"] },
      { name: "Cookie", price: 80, tags: ["dessert", "veg"] },
    ],
  },
  "A-cjr": {
    cuisine: "American burgers",
    price: "$$",
    signature: ["Famous Star Burger", "Crispy Chicken Tenders"],
    menu: [
      { name: "Famous Star with Cheese", price: 340, tags: ["burger", "non-veg"] },
      { name: "Western Bacon Burger", price: 380, tags: ["burger", "non-veg"] },
      { name: "Crispy Chicken Tenders (5)", price: 260, tags: ["chicken", "non-veg"] },
    ],
  },
  "A-mcd": {
    cuisine: "Fast food",
    price: "$",
    avg_wait: "5 min",
    crowd: "high",
    signature: ["McAloo Tikki", "McSpicy Paneer"],
    menu: [
      { name: "McAloo Tikki", price: 60, tags: ["burger", "veg"] },
      { name: "McSpicy Paneer", price: 220, tags: ["burger", "veg"] },
      { name: "McSpicy Chicken", price: 230, tags: ["burger", "non-veg"] },
      { name: "Fries (M)", price: 110, tags: ["sides", "veg"] },
    ],
  },
  "A-pza": {
    cuisine: "Pizza by the slice",
    price: "$",
    signature: ["Margherita Slice", "Pepperoni Slice"],
    menu: [
      { name: "Margherita Slice", price: 160, tags: ["pizza", "veg"] },
      { name: "Pepperoni Slice", price: 200, tags: ["pizza", "non-veg"] },
      { name: "Garlic Bread", price: 140, tags: ["sides", "veg"] },
    ],
  },
  "C-bk": {
    cuisine: "Burgers",
    price: "$$",
    signature: ["Whopper", "Crispy Veg Burger"],
    menu: [
      { name: "Whopper", price: 320, tags: ["burger", "non-veg"] },
      { name: "Crispy Veg Burger", price: 180, tags: ["burger", "veg"] },
      { name: "Onion Rings", price: 130, tags: ["sides", "veg"] },
    ],
  },

  // ─── INDIAN MEALS ─────────────────────────────────────────────────
  "A-dhb": {
    cuisine: "Punjabi / North Indian",
    price: "$$",
    signature: ["Dal Makhani", "Butter Naan"],
    menu: [
      { name: "Dal Makhani", price: 380, tags: ["main", "veg"] },
      { name: "Butter Chicken Half", price: 540, tags: ["main", "non-veg"] },
      { name: "Butter Naan", price: 100, tags: ["bread", "veg"] },
      { name: "Paneer Tikka", price: 420, tags: ["starter", "veg"] },
    ],
  },
  "B-msk": {
    cuisine: "Indian street food",
    price: "$$",
    signature: ["Pav Bhaji", "Vada Pav"],
    menu: [
      { name: "Pav Bhaji", price: 280, tags: ["main", "veg"] },
      { name: "Vada Pav", price: 120, tags: ["snack", "veg"] },
      { name: "Masala Dosa", price: 240, tags: ["main", "veg"] },
    ],
  },
  "C-may": {
    cuisine: "South Indian",
    price: "$$",
    signature: ["Mysore Masala Dosa", "Filter Coffee"],
    menu: [
      { name: "Mysore Masala Dosa", price: 260, tags: ["main", "veg"] },
      { name: "Idli Vada (2+1)", price: 180, tags: ["main", "veg"] },
      { name: "Pongal", price: 200, tags: ["main", "veg"] },
    ],
  },
  "C-ulv": {
    cuisine: "Andhra / Telugu",
    price: "$$",
    signature: ["Andhra Meal", "Gongura Mutton"],
    menu: [
      { name: "Andhra Veg Meal", price: 360, tags: ["thali", "veg"] },
      { name: "Gongura Mutton", price: 540, tags: ["main", "non-veg"] },
      { name: "Pulihora", price: 180, tags: ["snack", "veg"] },
    ],
  },
  "C-mip": {
    cuisine: "Punjabi",
    price: "$$$",
    signature: ["Sarson da Saag", "Amritsari Kulcha"],
    menu: [
      { name: "Sarson da Saag with Makki Roti", price: 480, tags: ["main", "veg"] },
      { name: "Amritsari Kulcha", price: 320, tags: ["bread", "veg"] },
    ],
  },

  // ─── BAKERY / SNACKS / SWEETS ─────────────────────────────────────
  "A-mil": {
    cuisine: "Cookies & ice cream",
    price: "$$",
    signature: ["Triple Chocolate Cookie", "Belgian Waffle Cone"],
    menu: [
      { name: "Triple Chocolate Cookie", price: 180, tags: ["dessert", "veg"] },
      { name: "Single-scoop Cone", price: 220, tags: ["dessert", "veg"] },
    ],
  },
  "A-dnr": {
    cuisine: "Mediterranean",
    price: "$$",
    signature: ["Chicken Doner", "Falafel Wrap"],
    menu: [
      { name: "Chicken Doner Wrap", price: 320, tags: ["wrap", "non-veg"] },
      { name: "Falafel Wrap", price: 260, tags: ["wrap", "veg"] },
    ],
  },
  "B-hld": {
    cuisine: "Indian sweets & snacks",
    price: "$$",
    signature: ["Kaju Katli", "Samosa"],
    menu: [
      { name: "Kaju Katli (250g)", price: 480, tags: ["sweet", "veg"] },
      { name: "Samosa (2)", price: 120, tags: ["snack", "veg"] },
      { name: "Chole Bhature", price: 280, tags: ["main", "veg"] },
    ],
  },
  "B-kkb": {
    cuisine: "Hyderabadi bakery",
    price: "$$",
    signature: ["Fruit Biscuit", "Dilkush"],
    menu: [
      { name: "Fruit Biscuit (250g)", price: 280, tags: ["bakery", "veg"] },
      { name: "Osmania Biscuit (250g)", price: 240, tags: ["bakery", "veg"] },
      { name: "Plum Cake", price: 320, tags: ["bakery", "veg"] },
    ],
  },

  // ─── RETAIL ───────────────────────────────────────────────────────
  "A-df": {
    cuisine: null,
    price: "$$$",
    products: [
      "International liquor (Glenfiddich, Chivas, Johnnie Walker)",
      "Cosmetics & fragrance (Estée Lauder, Dior, Chanel)",
      "Tobacco",
      "Indian tea & spice gift packs",
    ],
    offers: "Buy 2 perfumes get 15% off; flat 10% on liquor over ₹4,000.",
    services: ["Pre-order pickup", "Tax-free shopping for international pax"],
  },
  "A-mob": {
    cuisine: null,
    price: "$$",
    products: ["Phone cases", "Travel chargers", "Power banks", "Headphones", "USB-C cables"],
    services: ["Mobile screen guard fitting", "On-the-spot device repair (basic)"],
  },
  "A-biba": {
    cuisine: null,
    price: "$$$",
    products: ["Indian ethnic wear", "Anarkali sets", "Kurtas", "Dupattas"],
    offers: "Flat 20% on bestsellers; 10% extra for Privilege members.",
  },
  "A-kma": {
    cuisine: null,
    price: "$$$",
    products: ["Ayurvedic skincare", "Hair oils", "Beauty gift sets"],
    offers: "Complimentary ubtan sample on purchases above ₹3,000.",
  },
  "A-kp": {
    cuisine: null,
    price: "$$$",
    products: ["South Sea pearls", "Pearl earrings & sets", "Polki jewellery"],
  },
  "A-cl": {
    cuisine: null,
    price: "$$",
    products: ["Indian souvenirs", "Brass figurines", "Handloom scarves"],
  },
  "A-apo": {
    cuisine: null,
    price: "$$",
    products: ["OTC medicine", "First aid", "Travel sickness tablets", "Sanitary supplies", "Masks"],
    services: ["BP check", "Glucose check", "Pharmacist consult"],
  },
  "B-pat": {
    cuisine: null,
    price: "$",
    products: ["Ayurvedic toothpaste", "Honey", "Herbal teas", "Soaps"],
  },
  "C-crc": {
    cuisine: null,
    price: "$$",
    products: ["Crocs Classic Clog", "LiteRide", "Kids Crocs"],
    offers: "Buy 1 get 1 at 30% off across selected styles.",
  },
  "C-skc": {
    cuisine: null,
    price: "$$$",
    products: ["Go Walk", "Memory Foam trainers", "Performance running"],
  },
  "C-sgh": {
    cuisine: null,
    price: "$$$",
    products: ["Ray-Ban", "Oakley", "Persol", "Polarised travel sunglasses"],
  },
  "C-sam": {
    cuisine: null,
    price: "$$$",
    products: ["Cabin trolleys", "Check-in luggage 28\"", "Backpacks", "Travel wallets"],
  },

  // ─── SERVICES / LOUNGES ───────────────────────────────────────────
  "Lounge_T2": {
    cuisine: "Buffet & lounge",
    price: "$$$",
    services: ["Hot meals buffet", "High-speed Wi-Fi", "Showers", "Quiet zones", "Newspaper rack"],
    access: "Priority Pass / DragonPass / Card programmes / pay-per-entry ₹1,800.",
  },
  "R-Avs": {
    cuisine: null,
    price: "$$$",
    services: ["Sleeping pods", "Hot showers", "Massage chairs"],
    access: "₹600 / hour, billed at exit.",
  },
  "A-hcs": {
    cuisine: null,
    price: "$$",
    services: ["10-minute massage chair", "20-minute deep tissue chair"],
  },
  "B-ode": {
    cuisine: null,
    price: "$$$",
    services: ["Express foot reflexology (15 min)", "Full body massage (45 min)", "Head & shoulders (20 min)"],
  },
  "R-Mio": {
    cuisine: null,
    price: "$$$",
    services: ["Single-occupant rest pods", "Charging points", "Reading light"],
    access: "₹450 / hour.",
  },
  "R-Med": {
    cuisine: null,
    price: "Free / on-charge for medication",
    services: ["First aid", "Wheelchair dispatch", "On-call doctor"],
    access: "Walk-in 24×7.",
  },
};

export function amenityFor(id) {
  return amenityContent[id] || null;
}

export function listFoodOptions(filter = {}) {
  const wantTag = filter.tag; // e.g. "veg", "coffee", "burger"
  const maxPrice = filter.maxPrice; // numeric ceiling
  const out = [];
  Object.entries(amenityContent).forEach(([id, c]) => {
    if (!c.menu) return;
    c.menu.forEach((item) => {
      if (wantTag && !item.tags?.includes(wantTag)) return;
      if (maxPrice && item.price > maxPrice) return;
      out.push({ id, shop: id, name: item.name, price: item.price, tags: item.tags });
    });
  });
  return out;
}
