import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  airportData,
  buildExploreItems,
  defaultFlight,
  departureStages,
  voiceResponses,
  walkMinutes,
  walkWeight,
  zoneIndex,
} from "../data/airportData.js";
import { useRealtimeWatcher } from "../hooks/useRealtimeWatcher.js";
import { amenityContent, amenityFor } from "../data/amenityContent.js";
import { SHOPS } from "../map/data/airportData.js";

const nodeById = new Map(airportData.navigation_graph.nodes.map((n) => [n.id, n]));
const exploreItems = buildExploreItems();

const JourneyContext = createContext(null);
const RAG_ENDPOINT = import.meta.env.VITE_AEROASSIST_API || "http://127.0.0.1:8000/query";
const API_BASE = RAG_ENDPOINT.replace(/\/query\/?$/, "");
const USER_ENDPOINT = `${API_BASE}/user`;

// Translate the React-side flight shape into the JSON-store shape and back.
// The store uses the same field names the FastAPI server expects so the
// backend and on-disk record stay in sync.
function flightToUserPayload(flight, source) {
  return {
    user_id: "powermind-demo",
    flight_id: flight.number || undefined,
    flight_number: flight.number || undefined,
    gate: flight.gate || undefined,
    boarding_time: flight.boarding || undefined,
    departure_time: flight.departure || undefined,
    terminal: flight.terminal || undefined,
    seat: flight.seat || undefined,
    pnr: flight.pnr || undefined,
    passenger: flight.passenger || undefined,
    origin: flight.from || undefined,
    destination: flight.to || undefined,
    status: flight.status || undefined,
    source: source || "form",
  };
}

function userPayloadToFlight(user) {
  if (!user || typeof user !== "object") return null;
  const next = {};
  if (user.flight_number || user.flight_id) next.number = user.flight_number || user.flight_id;
  if (user.gate) next.gate = user.gate;
  if (user.boarding_time) next.boarding = user.boarding_time;
  if (user.departure_time) next.departure = user.departure_time;
  if (user.terminal) next.terminal = user.terminal;
  if (user.seat) next.seat = user.seat;
  if (user.pnr) next.pnr = user.pnr;
  if (user.passenger) next.passenger = user.passenger;
  if (user.origin) next.from = user.origin;
  if (user.destination) next.to = user.destination;
  if (user.status) next.status = user.status;
  return Object.keys(next).length ? next : null;
}

// Language → BCP-47 tag used both by SpeechRecognition and SpeechSynthesis.
// We pick the most widely-deployed regional variant; on macOS / Windows the
// system voices are usually keyed by these.
const LANG_TAG = {
  English: "en-US",
  Hindi: "hi-IN",
  Tamil: "ta-IN",
  Telugu: "te-IN",
  Bengali: "bn-IN",
  Marathi: "mr-IN",
  Kannada: "kn-IN",
  Gujarati: "gu-IN",
  Malayalam: "ml-IN",
  Punjabi: "pa-IN",
  Arabic: "ar-SA",
  French: "fr-FR",
  Spanish: "es-ES",
  German: "de-DE",
};

// Localised canned strings for the most common assistant responses. This
// gives the demo *real* multilingual feel even when the local LLM (Gemma)
// is offline — the fallback answer is translated client-side. Anything not
// in the map falls back to English.
const I18N = {
  "Hindi": {
    out_of_scope: "मैं आपका एयरपोर्ट साथी हूँ — मैं केवल एयरपोर्ट से जुड़े सवालों में मदद कर सकता हूँ। पूछिए: 'सबसे पास का कॉफी कहाँ है?' या 'गेट 23 कितनी दूर है?'.",
    coffee: "पास में स्टारबक्स (पूर्वी विंग), टिम हॉर्टन्स (पश्चिमी विंग) और चाय पॉइंट (पूर्व) उपलब्ध हैं। क्या मैं रास्ता दिखाऊं?",
    restroom: "सबसे पास का रेस्टरूम सेंट्रल कॉनकोर्स में है (R-B1)। बेबी केयर और स्मोकिंग रूम पूर्वी विंग में हैं।",
    security: "तीन सिक्योरिटी काउंटर हैं — पश्चिम, सेंट्रल और पूर्व। सेंट्रल अभी सबसे व्यस्त है, पश्चिम सबसे जल्दी निकल जाएगा।",
    gate: "आपकी फ्लाइट गेट {gate} पर है। हाइलाइट किए गए रास्ते का अनुसरण करें।",
    listening: "सुन रहा हूँ... पूछिए, उदाहरण: कॉफी कहाँ है?",
    idle: "पूछिए कि कहाँ जाना है, क्या खुला है, या आपके बोर्डिंग समय में क्या फिट होगा।",
  },
  "Tamil": {
    out_of_scope: "நான் உங்கள் விமான நிலைய துணை — விமான நிலையம் தொடர்பான கேள்விகளுக்கு மட்டுமே உதவ முடியும். எடுத்துக்காட்டு: 'அருகில் உள்ள காபி எங்கே?' அல்லது 'கேட் 23 எவ்வளவு தூரம்?'.",
    coffee: "ஸ்டார்பக்ஸ் (கிழக்கு பிரிவு), டிம் ஹார்ட்டன்ஸ் (மேற்கு) மற்றும் சாய் பாயிண்ட் இங்கே உள்ளன. வழி காட்டவா?",
    restroom: "அருகில் உள்ள கழிவறை சென்ட்ரல் காரிடாரில் உள்ளது (R-B1).",
    security: "மேற்கு, மத்திய, கிழக்கு என மூன்று செக்யூரிட்டி கவுண்டர்கள். மேற்கு வரிசை இப்போது குறைவு.",
    gate: "உங்கள் கேட் {gate}. சிவப்பு பாதையை பின்தொடருங்கள்.",
    listening: "கேட்கிறேன்... 'காபி எங்கே?' என்று சொல்லுங்கள்.",
    idle: "எங்கே செல்ல வேண்டும், எது திறந்துள்ளது என்பதை கேளுங்கள்.",
  },
  "Telugu": {
    out_of_scope: "నేను మీ ఎయిర్‌పోర్ట్ సహాయకుడిని — ఎయిర్‌పోర్ట్‌కు సంబంధించిన ప్రశ్నలకు మాత్రమే సహాయం చేయగలను. ఉదా: 'దగ్గర్లో కాఫీ ఎక్కడ?' లేదా 'గేట్ 23 ఎంత దూరం?'.",
    coffee: "స్టార్‌బక్స్ (తూర్పు), టిమ్ హార్టన్స్ (పడమర), చాయ్ పాయింట్ (తూర్పు) దగ్గర్లో ఉన్నాయి.",
    restroom: "దగ్గర్లో రెస్ట్‌రూమ్ సెంట్రల్ కారిడార్‌లో ఉంది (R-B1).",
    security: "మూడు సెక్యూరిటీ లైన్లు ఉన్నాయి. ప్రస్తుతం పడమర వేగంగా ఉంది.",
    gate: "మీ గేట్ {gate}. హైలైట్ చేసిన మార్గాన్ని అనుసరించండి.",
    listening: "వింటున్నాను... 'కాఫీ ఎక్కడ?' అని అడగండి.",
    idle: "ఎక్కడికి వెళ్ళాలి, ఏది తెరిచి ఉంది అని అడగండి.",
  },
  "Arabic": {
    out_of_scope: "أنا رفيق مطارك — أساعد فقط في أسئلة المطار. مثال: 'أين أقرب قهوة؟' أو 'كم يبعد البوابة ٢٣؟'.",
    coffee: "ستاربكس (الجناح الشرقي)، تيم هورتنز (الغربي)، وشاي بوينت قريبة. هل أرشدك؟",
    restroom: "أقرب دورة مياه في الممر الأوسط.",
    security: "ثلاث نقاط تفتيش — الغرب أسرع الآن.",
    gate: "بوابتك {gate}. اتبع المسار المظلل.",
    listening: "أستمع... جرب: 'أين القهوة؟'",
    idle: "اسألني عن الوجهة أو ما هو مفتوح.",
  },
  "French": {
    out_of_scope: "Je suis votre compagnon d'aéroport — je peux uniquement aider avec les questions liées à l'aéroport. Essayez : « Où est le café le plus proche ? » ou « À quelle distance est la porte 23 ? ».",
    coffee: "Starbucks (aile est), Tim Hortons (aile ouest), Chai Point — je vous y guide ?",
    restroom: "Toilettes les plus proches : couloir central (R-B1).",
    security: "Trois points de contrôle — l'ouest est le plus rapide en ce moment.",
    gate: "Votre porte est {gate}. Suivez le chemin surligné.",
    listening: "J'écoute... essayez : « Où est le café ? »",
    idle: "Demandez où aller ou ce qui est ouvert.",
  },
  "Spanish": {
    out_of_scope: "Soy tu compañero del aeropuerto — solo puedo ayudar con preguntas del aeropuerto. Prueba: «¿Dónde está el café más cercano?» o «¿A qué distancia está la puerta 23?».",
    coffee: "Starbucks (ala este), Tim Hortons (oeste), Chai Point. ¿Te guío?",
    restroom: "El baño más cercano está en el corredor central (R-B1).",
    security: "Tres controles de seguridad — el oeste es el más rápido ahora.",
    gate: "Tu puerta es {gate}. Sigue la ruta resaltada.",
    listening: "Escuchando... prueba: «¿Dónde está el café?»",
    idle: "Pregúntame a dónde ir o qué está abierto.",
  },
  "German": {
    out_of_scope: "Ich bin Ihr Flughafen-Begleiter — ich helfe nur bei Flughafenfragen. Versuchen Sie: „Wo ist der nächste Kaffee?“ oder „Wie weit ist Gate 23?“.",
    coffee: "Starbucks (Ostflügel), Tim Hortons (West), Chai Point sind in der Nähe.",
    restroom: "Nächste Toilette: zentraler Korridor (R-B1).",
    security: "Drei Sicherheitslinien — West ist gerade am schnellsten.",
    gate: "Ihr Gate ist {gate}. Folgen Sie dem markierten Weg.",
    listening: "Höre zu... versuchen Sie: „Wo ist der Kaffee?“",
    idle: "Fragen Sie, wohin oder was offen ist.",
  },
};

function localised(language, key, fallback, vars = {}) {
  const dict = I18N[language];
  let raw = dict?.[key] || fallback;
  Object.entries(vars).forEach(([k, v]) => {
    raw = raw.replaceAll(`{${k}}`, v);
  });
  return raw;
}

// Convert an assistant message's `actions` array into a deduped list of
// map highlights — one pin per unique nodeId — that the 3D scene can
// render so the user sees every AI suggestion on the map.
function highlightsFromActions(actions) {
  if (!Array.isArray(actions) || actions.length === 0) return [];
  const seen = new Map();
  actions.forEach((a) => {
    const nodeId = a.nodeId || a.payload?.nodeId;
    if (!nodeId) return;
    const node = nodeById.get(nodeId);
    if (!node) return;
    const label = (a.payload?.title || a.label || node.label || nodeId)
      .replace(/^[+📍]\s*/, "")
      .trim();
    if (!seen.has(nodeId)) {
      seen.set(nodeId, { id: nodeId, nodeId, label, position: node.position });
    }
  });
  return Array.from(seen.values());
}

function inferDestination(text) {
  const normalized = text.toLowerCase();
  const gateMatch = normalized.match(/\bgate\s*([ab]\d{1,2})\b/i);
  if (gateMatch) return `Gate_${gateMatch[1].toUpperCase()}`;
  if (normalized.includes("duty") || normalized.includes("tax free")) return "shop_08";
  if (normalized.includes("coffee") || normalized.includes("starbucks") || normalized.includes("cafe") || normalized.includes("chai") || normalized.includes("tea")) return "shop_01";
  if (normalized.includes("charger") || normalized.includes("adapter") || normalized.includes("power bank") || normalized.includes("electronics")) return "shop_03";
  if (normalized.includes("pharmacy") || normalized.includes("medicine")) return "shop_05";
  if (normalized.includes("restroom") || normalized.includes("washroom") || normalized.includes("toilet")) return "Restrooms_T2";
  if (normalized.includes("security")) return "Security_T2";
  if (normalized.includes("lounge") || normalized.includes("business") || normalized.includes("meeting") || normalized.includes("wifi")) return "Lounge_T2";
  return null;
}

const NAV_VERBS = /\b(navigate|route|directions?|guide|take me|show me|where is|where's|how (do|can) i (get|reach)|find|nearest|closest|walk|go to|head to|map)\b/i;
const NAV_PLACES = /\b(gate|terminal|restroom|washroom|toilet|security|lounge|coffee|starbucks|cafe|chai|tea|duty[- ]?free|pharmacy|medicine|charger|adapter|power bank|electronics|shop|store|food|eat|atm|kiosk)\b/i;
const INFO_ONLY = /\b(weather|time|news|joke|story|status|delay|how are you|who are you|hello|hi |hey|thanks|thank you|bye)\b/i;

// Words that mark a question as airport-relevant. The companion is a
// scoped assistant — anything that doesn't touch one of these is refused
// politely so the model never gets to answer "what is 2+2".
const AIRPORT_TOPICS = /\b(airport|terminal|gate|boarding|flight|departure|arrival|scheduled|takeoff|landing|on[- ]?time|delay(?:ed)?|cancell?(?:ed|ation)?|baggage|luggage|carry[- ]?on|check[- ]?in|bag drop|security|immigration|customs|passport|visa|lounge|wifi|charging|charger|adapter|power bank|restroom|washroom|toilet|baby care|smoking|medical|pharmacy|medicine|atm|currency|forex|exchange|kiosk|information|info desk|duty[- ]?free|shop|store|brand|food|eat|drink|coffee|starbucks|cafe|chai|tea|breakfast|lunch|dinner|menu|offer|deal|reward|loyalty|sku|article|product|compare|comparison|map|route|navigate|directions?|where|how (do|can) i (get|reach)|how (long|much time)|nearest|closest|walk|metro|taxi|bus|coach|drop[- ]?off|pick[- ]?up|curbside|escalator|elevator|wheelchair|accessibility|lost (and|&) found|status|csmia|hyderabad|t1|t2|terminal 1|terminal 2|my (flight|gate|seat)|when (is|do))\b/i;

const GREETINGS = /^(hi|hello|hey|namaste|hola|salaam|good (morning|afternoon|evening)|thanks?|thank you|bye|goodbye)[\s!.,?]*$/i;

// Follow-up shortcuts that only count as airport-related when the previous
// turn established airport context (e.g. user just got food options and now
// asks "under 500" or "the first one"). Without this, perfectly valid
// follow-ups would be rejected by the scope guard.
const FOLLOWUP_TOKENS = /\b(under|below|less than|cheaper|fastest|nearest|closest|first|last|second|third|this|that|next|previous|same|both|more|other|else|any|all|cheapest|costliest|expensive|veg(etarian)?|non[- ]?veg|spicy|kid[s]? friendly|near (me|here)|show (me|all)|list|options?|alternatives?|recommend(ations?)?|suggest(ions?)?)\b/i;
const PRICE_TOKEN = /(?:₹|rs\.?|inr|\$)?\s*\d{2,5}/i;

function isAirportRelated(text, hasContext = false) {
  if (!text) return false;
  const trimmed = text.trim();
  if (GREETINGS.test(trimmed)) return true;
  if (AIRPORT_TOPICS.test(trimmed)) return true;
  if (NAV_VERBS.test(trimmed) && NAV_PLACES.test(trimmed)) return true;
  // Allow short follow-ups when prior assistant turn already gave airport
  // info — keeps multi-turn conversations natural.
  if (hasContext) {
    if (FOLLOWUP_TOKENS.test(trimmed)) return true;
    if (PRICE_TOKEN.test(trimmed) && trimmed.length < 50) return true;
    // single-word follow-ups like "veg?", "yes", "more", "cheaper"
    if (trimmed.split(/\s+/).length <= 4) return true;
  }
  return false;
}

const OUT_OF_SCOPE_REPLY =
  "I'm your airport companion — I can only help with airport navigation, gates, security, lounges, food, shopping, baggage, or your flight. Try: \"Where's the nearest coffee?\" or \"How long to Gate 23?\".";

function detectNavigationIntent(text) {
  if (!text) return false;
  if (INFO_ONLY.test(text) && !NAV_VERBS.test(text)) return false;
  return NAV_VERBS.test(text) || NAV_PLACES.test(text);
}

// ─── Local helpers used when the RAG endpoint is offline ─────────────────
const SHOP_NAME_INDEX = SHOPS.map((s) => ({ id: s.id, name: s.name, lower: s.name.toLowerCase(), type: s.type }));

function findShopByName(token) {
  const t = token.toLowerCase().trim();
  if (!t) return null;
  return (
    SHOP_NAME_INDEX.find((s) => s.lower === t) ||
    SHOP_NAME_INDEX.find((s) => s.lower.includes(t)) ||
    null
  );
}

function priceLabel(c) {
  if (!c?.price) return "";
  return c.price === "$" ? "₹ budget" : c.price === "$$" ? "₹₹ mid" : "₹₹₹ premium";
}

function describeShop(shop) {
  const c = amenityFor(shop.id);
  if (!c) return `${shop.name} — ${shop.type}.`;
  const lines = [`**${shop.name}** — ${c.cuisine || shop.type}${c.price ? ` · ${priceLabel(c)}` : ""}.`];
  if (c.signature?.length) lines.push(`Signature: ${c.signature.join(", ")}.`);
  if (c.menu?.length) lines.push(`Menu picks: ${c.menu.slice(0, 4).map((m) => `${m.name} (₹${m.price})`).join(" · ")}.`);
  if (c.products?.length) lines.push(`Products: ${c.products.slice(0, 5).join(", ")}.`);
  if (c.services?.length) lines.push(`Services: ${c.services.slice(0, 5).join(", ")}.`);
  if (c.offers) lines.push(`Offer: ${c.offers}`);
  if (c.avg_wait) lines.push(`Avg wait: ${c.avg_wait}.`);
  return lines.join(" ");
}

function compareShops(a, b) {
  const ca = amenityFor(a.id);
  const cb = amenityFor(b.id);
  const lines = [`Comparing **${a.name}** and **${b.name}**:`];
  lines.push(`- Cuisine: ${ca?.cuisine || a.type} vs ${cb?.cuisine || b.type}`);
  lines.push(`- Price: ${priceLabel(ca) || "?"} vs ${priceLabel(cb) || "?"}`);
  if (ca?.signature || cb?.signature) {
    lines.push(`- Signature: ${(ca?.signature || []).join(", ") || "—"} vs ${(cb?.signature || []).join(", ") || "—"}`);
  }
  if (ca?.avg_wait || cb?.avg_wait) {
    lines.push(`- Wait: ${ca?.avg_wait || "?"} vs ${cb?.avg_wait || "?"}`);
  }
  return lines.join("\n");
}

function listFoodByTag(tag) {
  const matches = [];
  Object.entries(amenityContent).forEach(([id, c]) => {
    if (!c.menu) return;
    const has = c.menu.some((m) => m.tags?.includes(tag));
    if (has) {
      const item = c.menu.find((m) => m.tags?.includes(tag));
      matches.push(`${SHOP_NAME_INDEX.find((s) => s.id === id)?.name || id}: ${item.name} (₹${item.price})`);
    }
  });
  return matches.slice(0, 6);
}

function flightSummary(flight) {
  const number = flight.number || "AI203";
  const gate = flight.gate || "23";
  const boarding = flight.boarding || "09:45";
  const status = flight.status || "On-time";
  const delay = flight.delay_minutes ? ` (${flight.delay_minutes} min delay)` : "";
  return `Flight ${number}: scheduled boarding ${boarding} at Gate ${gate}, status ${status}${delay}. From ${flight.from || "—"} to ${flight.to || "—"} from Terminal ${flight.terminal?.replace(/[^0-9]/g, "") || "2"}.`;
}

// Returns either a plain string or { content, actions: [...], topic }.
// Actions are rendered as inline buttons under the assistant bubble.
// Action types: "add_to_itinerary" | "show_on_map".
function localAssistantAnswer(text, flight, language = "English", context = {}) {
  const normalized = text.toLowerCase().trim();
  const tr = (key, fallback, vars) => localised(language, key, fallback, vars);
  const lastTopic = context.lastTopic;

  const addAction = (id, label, nodeId, subtitle) => ({
    type: "add_to_itinerary",
    id,
    label: `+ ${label}`,
    payload: { id, title: label, subtitle: subtitle || "Suggested by AI", nodeId, source: "ai" },
  });

  const mapAction = (id, label, nodeId) => ({
    type: "show_on_map",
    id: `map:${id}`,
    label: `📍 ${label}`,
    nodeId,
  });

  // For each option produce both an "add to itinerary" chip and a "show on
  // map" chip so the user can either save it or jump to the route.
  const optionsResponse = (lines, options, opts = {}) => {
    const actions = [];
    options.forEach((o) => {
      actions.push(addAction(`ai:${o.nodeId}`, o.label, o.nodeId, o.subtitle));
      actions.push(mapAction(o.nodeId, o.label, o.nodeId));
    });
    return {
      content: [
        ...lines,
        options.length > 1 ? "\nWould you like me to add any to your itinerary, or show one on the map?" : "\nAdd to your itinerary or open the map?",
      ].join("\n"),
      actions,
      topic: opts.topic || null,
    };
  };

  // ─ Numeric price filter — works on its own AND as a follow-up ───────
  const priceUnder = normalized.match(/(?:under|below|less than|<|cheaper than|max(?:imum)?|upto|up to|within)\s*₹?\s*(\d{2,5})/);
  const priceCap = priceUnder ? Number(priceUnder[1]) : null;
  if (priceCap && (lastTopic === "food" || /\b(food|eat|menu|meal|snack|drink|coffee)\b/.test(normalized))) {
    const matches = [];
    Object.entries(amenityContent).forEach(([id, c]) => {
      if (!c.menu) return;
      const idx = SHOP_NAME_INDEX.find((s) => s.id === id);
      if (!idx) return;
      const cheap = c.menu.filter((m) => m.price <= priceCap);
      if (cheap.length) {
        const pick = cheap.reduce((a, b) => (a.price < b.price ? a : b));
        matches.push({
          label: `${idx.name} — ${pick.name} (₹${pick.price})`,
          nodeId: id,
          subtitle: `${c.cuisine || idx.type} · under ₹${priceCap}`,
        });
      }
    });
    matches.sort((a, b) => a.label.localeCompare(b.label));
    if (matches.length) {
      return optionsResponse(
        [`Food picks under ₹${priceCap}:`],
        matches.slice(0, 8),
        { topic: "food" }
      );
    }
  }
  if (priceCap && (lastTopic === "shopping" || /\b(shop|store|buy|gift|souvenir|product|retail)\b/.test(normalized))) {
    const candidates = SHOPS.filter((s) => s.type === "retail").slice(0, 8).map((s) => ({
      label: s.name,
      nodeId: s.id,
      subtitle: `Retail · ${amenityContent[s.id]?.price || "$$"}`,
    }));
    return optionsResponse(
      [`Shopping options that fit a ₹${priceCap} budget — pick a store and I'll show its catalogue:`],
      candidates,
      { topic: "shopping" }
    );
  }

  // ─ South Indian, North Indian, etc. cuisine filters ────────────────
  if (/\bsouth indian\b/.test(normalized) || /\b(dosa|idli|sambar|vada|filter coffee|pongal)\b/.test(normalized)) {
    return optionsResponse(
      ["South Indian counters in Terminal 2:"],
      [
        { label: "Maiyas (Mysore Masala Dosa ₹260)", nodeId: "C-may", subtitle: "South Indian veg" },
        { label: "Ulavacharu (Andhra Veg Meal ₹360)", nodeId: "C-ulv", subtitle: "Andhra / Telugu" },
        { label: "Minerva Coffee Shop (Filter Coffee ₹80)", nodeId: "A-mcs", subtitle: "Filter coffee" },
        { label: "Cafe Niloufer (Irani Chai ₹95)", nodeId: "A-cnf", subtitle: "Irani chai & bakes" },
      ],
      { topic: "food" }
    );
  }
  if (/\bnorth indian\b/.test(normalized) || /\b(dal|naan|paneer|kulcha|saag|biryani|tandoor)\b/.test(normalized)) {
    return optionsResponse(
      ["North Indian / Punjabi options:"],
      [
        { label: "Dhaba 1986 (Dal Makhani ₹380)", nodeId: "A-dhb", subtitle: "Punjabi · East Wing" },
        { label: "Made In Punjab (Sarson da Saag ₹480)", nodeId: "C-mip", subtitle: "Premium Punjabi" },
        { label: "Haldirams (Chole Bhature ₹280)", nodeId: "B-hld", subtitle: "Indian sweets & chaat" },
        { label: "Masala Kitchen F&B (Pav Bhaji ₹280)", nodeId: "B-msk", subtitle: "Indian street food" },
      ],
      { topic: "food" }
    );
  }
  if (/\b(chinese|noodle|momo|asian)\b/.test(normalized)) {
    return optionsResponse(
      ["Pan-Asian picks:"],
      [
        { label: "Shoyu (Asian fusion)", nodeId: "C-shy", subtitle: "Pan-Asian" },
      ],
      { topic: "food" }
    );
  }

  // ─ Business-trip / gifting ────────────────────────────────────────
  if (/\b(business trip|gift|gifting|client|present)\b/.test(normalized) || (/\b(buy|shop)\b/.test(normalized) && /\b(trip|travel|business)\b/.test(normalized))) {
    return optionsResponse(
      [
        "Business-trip / gifting picks across Terminal 2:",
        "• Premium gifting: Duty Free (perfumes, liquor), Krishna Pearls, Swarovski",
        "• Apparel & accessories: Hugo Boss, Michael Kors, Louis Philippe, Lacoste",
        "• Travel essentials: Samsonite (luggage), Sunglass Hut, Mobile Shield (chargers)",
        "• Books & magazines for the flight: Relay, Carlton",
      ],
      [
        { label: "Duty Free Area", nodeId: "A-df", subtitle: "Tax-free luxury" },
        { label: "Krishna Pearls", nodeId: "A-kp", subtitle: "Pearls & jewellery" },
        { label: "Swarovski", nodeId: "C-swr", subtitle: "Crystal gifts" },
        { label: "Hugo Boss", nodeId: "B-hb", subtitle: "Apparel" },
        { label: "Michael Kors", nodeId: "B-mk", subtitle: "Accessories" },
        { label: "Samsonite", nodeId: "C-sam", subtitle: "Luggage" },
        { label: "Mobile Shield", nodeId: "A-mob", subtitle: "Travel chargers" },
        { label: "Relay", nodeId: "A-rly", subtitle: "Books & magazines" },
      ],
      { topic: "shopping" }
    );
  }

  // ─ Flight / schedule queries ────────────────────────────────────────
  if (/\b(my (flight|gate|seat))\b/.test(normalized) ||
      /\b(scheduled|departure|boarding (time|gate)|when (is|do)|how long until|status|delay(ed)?)\b/.test(normalized)) {
    return flightSummary(flight);
  }

  // ─ Comparison ───────────────────────────────────────────────────────
  const cmp = normalized.match(/\b(?:compare|vs|versus|or)\b\s+(.+)/);
  if (/\b(compare|vs\.?|versus)\b/.test(normalized)) {
    const tokens = normalized.replace(/.*compare\s+/, "").split(/\s+(?:and|vs\.?|versus|or)\s+/);
    if (tokens.length >= 2) {
      const a = findShopByName(tokens[0]);
      const b = findShopByName(tokens[1]);
      if (a && b) return compareShops(a, b);
    }
  }

  // ─ Menu / details for a specific shop ───────────────────────────────
  const menuMatch = normalized.match(/\b(?:menu|what(?:'s| is) (?:on|at)|tell me about|details? (?:about|of)|products? (?:at|in)|offers? (?:at|in))\s+([a-z0-9 &']+)/);
  if (menuMatch) {
    const shop = findShopByName(menuMatch[1]);
    if (shop) return describeShop(shop);
  }

  // ─ Food category browsing ──────────────────────────────────────────
  if (/\b(food (option|choice)|where (can|to) (eat|grab))\b/.test(normalized) || /\bhungry\b/.test(normalized)) {
    return optionsResponse(
      [
        "Food options across Terminal 2 — tap any to save:",
        "• Coffee: Starbucks, Tim Hortons, Chai Point",
        "• Indian meals: Dhaba 1986, Made In Punjab, Maiyas, Ulavacharu",
        "• Fast food: KFC, Subway, McDonald's, Burger King, Pizza House",
        "• Snacks & sweets: Karachi Bakery, Haldirams, Cafe Niloufer",
      ],
      [
        { label: "Starbucks", nodeId: "A-stb", subtitle: "Coffee · East Wing" },
        { label: "Tim Hortons", nodeId: "C-tmh", subtitle: "Coffee · West Wing" },
        { label: "Dhaba 1986", nodeId: "A-dhb", subtitle: "Punjabi · East Wing" },
        { label: "Made In Punjab", nodeId: "C-mip", subtitle: "Punjabi · West Wing" },
        { label: "Maiyas", nodeId: "C-may", subtitle: "South Indian · West Wing" },
        { label: "KFC", nodeId: "A-kfc", subtitle: "Fast food · East Wing" },
        { label: "Subway", nodeId: "A-sub", subtitle: "Subs · East Wing" },
        { label: "Karachi Bakery", nodeId: "B-kkb", subtitle: "Snacks · Central" },
      ],
      { topic: "food" }
    );
  }
  if (/\b(veg|vegetarian|jain)\b/.test(normalized) && /\b(food|eat|menu|options?)\b/.test(normalized)) {
    return optionsResponse(
      ["Vegetarian picks across Terminal 2:"],
      [
        { label: "Maiyas (Mysore Masala Dosa ₹260)", nodeId: "C-may", subtitle: "South Indian veg" },
        { label: "Made In Punjab (Saag ₹480)", nodeId: "C-mip", subtitle: "Punjabi veg" },
        { label: "Subway Veggie Delite (₹220)", nodeId: "A-sub", subtitle: "Subs · veg" },
        { label: "Haldirams Chole Bhature (₹280)", nodeId: "B-hld", subtitle: "Indian veg" },
        { label: "Pizza House Margherita (₹160)", nodeId: "A-pza", subtitle: "Pizza · veg" },
      ],
      { topic: "food" }
    );
  }
  if (/\b(burger|sandwich|wrap|sub)\b/.test(normalized)) {
    return optionsResponse(
      ["Burger / sandwich / wrap picks:"],
      [
        { label: "KFC Zinger Burger (₹280)", nodeId: "A-kfc", subtitle: "Burger · non-veg" },
        { label: "McDonald's McAloo Tikki (₹60)", nodeId: "A-mcd", subtitle: "Burger · veg" },
        { label: "Burger King Whopper (₹320)", nodeId: "C-bk", subtitle: "Burger · non-veg" },
        { label: "Subway Chicken Teriyaki (₹290)", nodeId: "A-sub", subtitle: "Sub · non-veg" },
        { label: "Doner & Gyros Wrap (₹320)", nodeId: "A-dnr", subtitle: "Wrap · non-veg" },
      ],
      { topic: "food" }
    );
  }
  if (/\b(coffee|starbucks|cafe|chai|tea|espresso)\b/.test(normalized)) {
    return tr(
      "coffee",
      "Coffee close by: Starbucks (East Wing concourse, signature Caramel Macchiato ₹320), Tim Hortons (West Wing, Double Double ₹240), and Chai Point (East, Masala Chai ₹90). Want me to route you to the quietest one?"
    );
  }
  if (/\b(duty[- ]?free|liquor|perfume|fragrance|cosmetics?)\b/.test(normalized)) {
    return describeShop({ id: "A-df", name: "Duty Free Area", type: "duty-free" });
  }

  // ─ Services / amenities ─────────────────────────────────────────────
  if (/\b(restroom|washroom|toilet)\b/.test(normalized)) {
    return tr(
      "restroom",
      "Closest restroom on your stage is in the Central concourse (R-B1) at z=+13. Baby Care and Smoking Room are in the East Wing — say which you need and I'll route."
    );
  }
  if (/\b(lounge|wifi|business)\b/.test(normalized)) {
    return "Quiet Lounge near East Wing: hot buffet, showers, quiet zones, Wi-Fi. Access via Priority Pass / DragonPass or pay-per-entry ₹1,800. Want me to route you?";
  }
  if (/\b(security)\b/.test(normalized)) {
    return tr(
      "security",
      "Three security stations span the terminal: West (5 lanes), Central (5 lanes), East (5 lanes). Central is busiest right now — try West for the shortest queue."
    );
  }
  if (/\b(pharmacy|medicine)\b/.test(normalized)) {
    return "Apollo (East Wing south) sells OTC medicine and offers BP/glucose checks. Patanjali (Central) carries Ayurvedic alternatives.";
  }
  if (/\b(charger|adapter|power bank|electronics)\b/.test(normalized)) {
    return "Mobile Shield (East Wing north retail) has cables, USB-C chargers, and rental power banks. Charging Station is also at landside if you haven't crossed security yet.";
  }
  if (/\b(gate|boarding)\b/.test(normalized)) {
    return tr("gate", `Your route is set toward Gate ${flight.gate || "23"}. Follow the highlighted path on the map and keep a few minutes spare for the boarding queue.`, { gate: flight.gate || "23" });
  }

  return "I'm your airport companion. Ask me for food options (veg / under ₹250 / fastest), shopping (duty free, fashion, electronics), services (lounge, pharmacy, charger), security, or your flight schedule.";
}

export function JourneyProvider({ children }) {
  const [flight, setFlight] = useState(() => {
    if (typeof window === "undefined") return defaultFlight;
    try {
      const cached = window.localStorage?.getItem("powermind-user");
      if (cached) {
        const parsed = JSON.parse(cached);
        const fromStore = userPayloadToFlight(parsed);
        if (fromStore) return { ...defaultFlight, ...fromStore };
      }
    } catch { /* ignore corrupt cache */ }
    return defaultFlight;
  });

  // Persist the flight record to the backend user store (writes mock_users.json
  // on disk) AND to localStorage as a same-origin cache. Called from the
  // onboarding form on submit and from the boarding-pass OCR on success so
  // the JSON file always reflects the freshest source of truth.
  const persistFlight = useCallback(async (flightData, source = "form") => {
    if (!flightData) return;
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem(
          "powermind-user",
          JSON.stringify(flightToUserPayload(flightData, source)),
        );
      } catch { /* quota / private mode — non-fatal */ }
    }
    try {
      await fetch(USER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(flightToUserPayload(flightData, source)),
      });
    } catch {
      // Server offline — localStorage already covers reload persistence.
    }
  }, []);

  // Hydrate from the on-disk user store once on mount. If the server is
  // unreachable we silently fall back to the localStorage cache loaded
  // synchronously above.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(USER_ENDPOINT);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const fromStore = userPayloadToFlight(data);
        if (fromStore) setFlight((current) => ({ ...current, ...fromStore }));
      } catch { /* ignored */ }
    })();
    return () => { cancelled = true; };
  }, []);
  const [activeTab, setActiveTab] = useState("food");
  const [voiceState, setVoiceState] = useState("idle");
  const [mode, setMode] = useState("voice");
  const [query, setQuery] = useState("");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [conversation, setConversation] = useState([
    {
      role: "assistant",
      content: "Namaste! Ask me for directions, coffee, restrooms, duty-free, or your gate. I can update the airport route while we talk.",
      source: "local",
    },
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [toast, setToast] = useState("AI is running in local-LLM demo mode with static airport data.");
  const [mapOpen, setMapOpen] = useState(false);
  const [routeDestination, setRouteDestination] = useState("Gate_B4");
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [largeText, setLargeText] = useState(false);
  // Elderly / Easy Mode bundles big text + voice on + simpler layout. Persisted.
  const [elderlyMode, setElderlyModeState] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage?.getItem("powermind-elderly") === "1";
  });
  const setElderlyMode = useCallback((on) => {
    setElderlyModeState(!!on);
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("powermind-elderly", on ? "1" : "0");
    }
    if (on) {
      setLargeText(true);
      setVoiceEnabled(true);
    }
  }, []);
  const [voiceOnly, setVoiceOnly] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [language, setLanguage] = useState("English");
  // Local-LLM model the server should use for this passenger. Persisted in
  // localStorage so a refresh keeps the user's pick.
  const [llmModel, setLlmModelState] = useState(() => {
    if (typeof window === "undefined") return "gemma2:9b";
    return window.localStorage?.getItem("powermind-llm") || "gemma2:9b";
  });
  const setLlmModel = useCallback((next) => {
    setLlmModelState(next);
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("powermind-llm", next);
    }
    // Best-effort: ask the server to set it as the new default. Per-query
    // overrides also work if the POST fails (older server).
    fetch(`${RAG_ENDPOINT.replace(/\/query\/?$/, "")}/llm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: next }),
    }).catch(() => {});
  }, []);
  const [itinerary, setItinerary] = useState([]);
  const [currentStage, setCurrentStage] = useState("entry");
  // Places the AI most-recently suggested as options. Surfaces them as
  // glowing pins on the 3D map so the user can see all candidates spatially
  // before picking one.
  const [aiHighlights, setAiHighlights] = useState([]);
  // Itinerary stop ids the traveler has physically passed near on the map.
  // Used to auto-complete checkpoints regardless of zone progression.
  const [visitedStopIds, setVisitedStopIds] = useState(() => new Set());
  // Traveler position on the 3D map. Persisted in context so opening and
  // closing the FullMap does not teleport the user back to the road.
  // Start inside the terminal at the central entrance, not at a vehicle
  // gate (VG-2 sits on the curbside road, ~outside the building).
  const [travelerPosition, setTravelerPosition] = useState(() => {
    const entrance = nodeById.get("Curbside_C") ||
      airportData.navigation_graph.nodes.find((n) => n.id === "ENT-3") ||
      airportData.navigation_graph.nodes.find((n) => n.type === "entry");
    return entrance ? entrance.position : [0, 0, 50];
  });

  const markStopVisited = useCallback((id) => {
    if (!id) return;
    setVisitedStopIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const clearVisitedStops = useCallback(() => setVisitedStopIds(new Set()), []);
  const recognitionRef = useRef(null);
  const voiceRequestRef = useRef(0);
  // Tracks the last conversation topic ("food" / "shopping" / "lounge" / etc.)
  // so follow-up questions like "under 500" know what we're filtering.
  const lastTopicRef = useRef(null);

  // ---------------------------------------------------------------------
  // Live itinerary: fixed departure stages + user-saved stops, interleaved
  // by zone order, with status (done/active/pending) computed from the
  // user's current pinned stage.
  // ---------------------------------------------------------------------
  const currentStageZoneIndex = useMemo(() => {
    const stage = departureStages.find((s) => s.id === currentStage) || departureStages[0];
    return zoneIndex(stage.zone);
  }, [currentStage]);

  const stageWalkingTimes = useMemo(() => {
    // Walking minutes between consecutive stage anchors.
    const times = {};
    for (let i = 0; i < departureStages.length - 1; i += 1) {
      const from = departureStages[i].anchorNodeId;
      const to = departureStages[i + 1].anchorNodeId;
      times[`${departureStages[i].id}->${departureStages[i + 1].id}`] = walkMinutes(walkWeight(from, to));
    }
    return times;
  }, []);

  const stagesWithStatus = useMemo(() => {
    const currentIdx = departureStages.findIndex((s) => s.id === currentStage);
    return departureStages.map((stage, idx) => ({
      ...stage,
      status: idx < currentIdx ? "done" : idx === currentIdx ? "active" : "pending",
      timeLabel: idx === 0
        ? "Start"
        : `${stageWalkingTimes[`${departureStages[idx - 1].id}->${stage.id}`] ?? 4} min walk`,
    }));
  }, [currentStage, stageWalkingTimes]);

  const timeline = useMemo(() => {
    // Interleave saved stops between fixed stages by zone order.
    // For each pair (stageN, stageN+1), append all stops whose zoneIndex
    // falls between stageN.zoneIdx and stageN+1.zoneIdx, sorted by walking
    // distance from stageN's anchor.
    const stops = itinerary
      .filter((entry) => entry.nodeId)
      .map((entry) => {
        const node = nodeById.get(entry.nodeId);
        return {
          ...entry,
          kind: "stop",
          zone: node?.zone || "airside_food",
          zoneIdx: zoneIndex(node?.zone || "airside_food"),
        };
      });

    const merged = [];
    stagesWithStatus.forEach((stage, idx) => {
      merged.push({ kind: "stage", ...stage });
      const nextStage = stagesWithStatus[idx + 1];
      const lowerIdx = zoneIndex(stage.zone);
      const upperIdx = nextStage ? zoneIndex(nextStage.zone) : Number.POSITIVE_INFINITY;
      const slot = stops
        .filter((s) => s.zoneIdx >= lowerIdx && s.zoneIdx < upperIdx)
        .sort((a, b) => walkWeight(stage.anchorNodeId, a.nodeId) - walkWeight(stage.anchorNodeId, b.nodeId));
      slot.forEach((s) => {
        const visited = visitedStopIds.has(s.id);
        const passed = visited || s.zoneIdx < currentStageZoneIndex;
        const onCurrent = !passed && s.zoneIdx === currentStageZoneIndex;
        const minsFromStage = walkMinutes(walkWeight(stage.anchorNodeId, s.nodeId));
        merged.push({
          ...s,
          status: passed ? "done" : onCurrent ? "active" : "pending",
          timeLabel: minsFromStage ? `${minsFromStage} min walk` : "",
        });
      });
    });
    return merged;
  }, [itinerary, stagesWithStatus, currentStageZoneIndex, visitedStopIds]);

  // Filter explore items by tab.
  const filteredPlaces = useMemo(() => {
    return exploreItems
      .filter((item) => item.category === activeTab)
      .map((item) => {
        const fromNode = (departureStages.find((s) => s.id === currentStage) || departureStages[0]).anchorNodeId;
        const w = walkWeight(fromNode, item.nodeId);
        const zIdx = zoneIndex(item.zone);
        const reachable = zIdx >= currentStageZoneIndex;
        return {
          ...item,
          walkMins: walkMinutes(w),
          reachable,
          // legacy field names so existing card code still works
          location: item.zone?.replaceAll("_", " "),
          type: item.kind === "shop" ? item.shop?.tag?.replaceAll("_", " ") : item.type,
        };
      })
      .sort((a, b) => {
        // Reachable first, then by walking distance.
        if (a.reachable !== b.reachable) return a.reachable ? -1 : 1;
        return (a.walkMins ?? 99) - (b.walkMins ?? 99);
      });
  }, [activeTab, currentStage, currentStageZoneIndex]);

  const aiMessage = useMemo(() => {
    const latestAssistant = [...conversation].reverse().find((message) => message.role === "assistant");
    if (isThinking) return "Checking airport context, route graph, and your boarding buffer...";
    if (latestAssistant?.content) return latestAssistant.content;
    return voiceResponses[voiceState];
  }, [conversation, isThinking, voiceState]);

  const speakText = useCallback((text) => {
    if (!voiceEnabled || typeof window === "undefined" || !window.speechSynthesis || !text) {
      setVoiceState("idle");
      return;
    }
    const synth = window.speechSynthesis;
    const langTag = LANG_TAG[language] || "en-US";

    const speakNow = () => {
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langTag;
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      const voices = synth.getVoices();
      const baseLang = langTag.split("-")[0];
      // Quality ranking: prefer "natural"/"neural" voices (Microsoft Edge
      // Online, Apple Premium / Enhanced, Google) → premium-installed →
      // any matching language → English fallback.
      const score = (v) => {
        if (!v.lang) return -1;
        let s = 0;
        if (v.lang === langTag) s += 100;
        else if (v.lang.startsWith(baseLang)) s += 60;
        else if (v.lang.startsWith("en")) s += 5;
        else return -1;
        const n = (v.name || "").toLowerCase();
        if (n.includes("natural") || n.includes("neural")) s += 40;
        if (n.includes("online")) s += 20;
        if (n.includes("premium") || n.includes("enhanced")) s += 25;
        if (n.includes("google")) s += 18;
        if (n.includes("microsoft")) s += 12;
        if (n.includes("samantha") || n.includes("aaditya") || n.includes("rishi") || n.includes("lekha") || n.includes("veena") || n.includes("ravi") || n.includes("kalpana")) s += 15;
        return s;
      };
      const ranked = voices
        .map((v) => ({ v, s: score(v) }))
        .filter((x) => x.s >= 0)
        .sort((a, b) => b.s - a.s);
      const match = ranked[0]?.v;
      if (match) utterance.voice = match;
      utterance.onstart = () => setVoiceState("speaking");
      utterance.onend = () => setVoiceState("idle");
      utterance.onerror = () => setVoiceState("idle");
      synth.speak(utterance);
    };

    // Voices may load asynchronously on first use — wait for them once.
    if (synth.getVoices().length === 0) {
      const handler = () => {
        synth.removeEventListener("voiceschanged", handler);
        speakNow();
      };
      synth.addEventListener("voiceschanged", handler);
      // Safari fires neither voiceschanged nor populates voices reliably;
      // fall back after a short delay.
      setTimeout(() => {
        synth.removeEventListener("voiceschanged", handler);
        speakNow();
      }, 250);
    } else {
      speakNow();
    }
  }, [voiceEnabled, language]);

  const submitQuestion = async (text, options = {}) => {
    const trimmed = text.trim();
    if (!trimmed) return "";
    const localIntent = detectNavigationIntent(trimmed);
    const localDestination = inferDestination(trimmed);
    setQuery(trimmed);
    setVoiceState("speaking");
    if (!options.fromVoice) setMode("chat");
    setConversation((messages) => [...messages, { role: "user", content: trimmed }]);

    // Has the assistant given an in-scope answer recently? Used to relax
    // the scope guard for short follow-up questions.
    const hasAirportContext = conversation.some(
      (m) => m.role === "assistant" && m.source !== "guard"
    );

    // Scope guard: refuse non-airport queries before they ever reach the
    // local LLM. Keeps the companion focused on its problem statement.
    if (!isAirportRelated(trimmed, hasAirportContext)) {
      const refusal = localised(language, "out_of_scope", OUT_OF_SCOPE_REPLY);
      setConversation((messages) => [
        ...messages,
        { role: "assistant", content: refusal, source: "guard" },
      ]);
      setToast("Off-topic request — companion is scoped to airport help only.");
      const voiceFlowOk = !options.speak || options.voiceRequestId === voiceRequestRef.current;
      if (voiceEnabled && voiceFlowOk) speakText(refusal);
      else setVoiceState("idle");
      return refusal;
    }

    setIsThinking(true);

    const openMapIfWanted = (shouldOpen, destination) => {
      if (destination) setRouteDestination(destination);
      // Only surface the map when we actually have somewhere to route to.
      // Otherwise the user sees an empty map for queries like "swimming pool"
      // that the assistant just admitted it can't answer.
      if (shouldOpen && destination) setMapOpen(true);
    };

    // Last 6 turns (3 user + 3 assistant pairs is plenty for follow-ups
     // without bloating the prompt). Send in chronological order.
    const history = conversation
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const response = await fetch(RAG_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "powermind-demo",
          query: trimmed,
          history,
          user_context: {
            user_id: "powermind-demo",
            flight_id: flight.number || "AI203",
            gate: flight.gate || "B4",
            boarding_time: flight.boarding || "09:45",
            status: "On-time",
            current_stage: currentStage,
            language,
            model: llmModel,
          },
        }),
      });
      if (!response.ok) throw new Error(`RAG API returned ${response.status}`);
      const data = await response.json();
      const localResult = localAssistantAnswer(trimmed, flight, language, { lastTopic: lastTopicRef.current });
      const localAnswer = typeof localResult === "string" ? localResult : localResult.content;
      const localActions = typeof localResult === "object" ? localResult.actions : null;
      const localTopic = typeof localResult === "object" ? localResult.topic : null;
      const answer = data.response || data.answer || localAnswer;
      const backendShouldNavigate = typeof data.should_navigate === "boolean" ? data.should_navigate : null;
      const backendDestination = data.destination || data.route_target || null;
      const shouldOpen = backendShouldNavigate ?? localIntent;
      const destination = backendDestination || localDestination;
      const toolCalls = Array.isArray(data.tool_calls) ? data.tool_calls : [];
      openMapIfWanted(shouldOpen, destination);
      // Always attach client-side suggested actions when the local matcher
      // recognised an option-style query. This way RAG-generated text gets
      // the same "+ save" / "📍 show on map" chips.
      const actions = Array.isArray(data.actions) ? data.actions : localActions;
      if (localTopic) lastTopicRef.current = localTopic;
      setAiHighlights(highlightsFromActions(actions));
      setConversation((messages) => [
        ...messages,
        { role: "assistant", content: answer, source: "rag", toolCalls, actions: actions || undefined },
      ]);
      const toolNote = toolCalls.length
        ? ` (called ${toolCalls.map((t) => t.name).join(", ")})`
        : "";
      setToast(
        (shouldOpen && destination
          ? "Concierge updated the route on the map."
          : "Concierge answered.") + toolNote,
      );
      const voiceFlowOk = !options.speak || options.voiceRequestId === voiceRequestRef.current;
      if (voiceEnabled && voiceFlowOk) speakText(answer);
      else setVoiceState("idle");
      return answer;
    } catch {
      const localResult = localAssistantAnswer(trimmed, flight, language, { lastTopic: lastTopicRef.current });
      const answer = typeof localResult === "string" ? localResult : localResult.content;
      const actions = typeof localResult === "object" ? localResult.actions : null;
      const topic = typeof localResult === "object" ? localResult.topic : null;
      openMapIfWanted(localIntent, localDestination);
      if (topic) lastTopicRef.current = topic;
      setAiHighlights(highlightsFromActions(actions));
      setConversation((messages) => [...messages, { role: "assistant", content: answer, source: "local", actions: actions || undefined }]);
      setToast(localIntent
        ? "RAG API offline; used local knowledge and updated the route."
        : "RAG API offline; answering from local knowledge.");
      const voiceFlowOk = !options.speak || options.voiceRequestId === voiceRequestRef.current;
      if (voiceEnabled && voiceFlowOk) speakText(answer);
      else setVoiceState("idle");
      return answer;
    } finally {
      setIsThinking(false);
    }
  };

  const addToItinerary = useCallback((item) => {
    if (!item?.id) return { ok: false, reason: "no_id" };
    const nodeId = item.nodeId || item.node_id || null;
    const node = nodeId ? nodeById.get(nodeId) : null;
    const itemZoneIdx = node ? zoneIndex(node.zone) : null;

    // Backward-flow gate: cannot add a stop in a zone the passenger has
    // already passed. They would have to re-clear security/immigration.
    if (itemZoneIdx !== null && itemZoneIdx < currentStageZoneIndex) {
      const stageLabel = (departureStages.find((s) => s.id === currentStage) || {}).title || "your current stage";
      setToast(
        `Cannot add ${item.title || item.name || item.label || item.id}: it is before ${stageLabel}. Re-clearing security would be required.`,
      );
      return { ok: false, reason: "backward_zone" };
    }

    let added = false;
    setItinerary((current) => {
      if (current.some((existing) => existing.id === item.id)) return current;
      added = true;
      return [
        ...current,
        {
          id: item.id,
          title: item.title || item.name || item.label || item.id,
          subtitle: item.subtitle || item.type || item.category || "",
          nodeId,
          source: item.source || "manual",
          addedAt: Date.now(),
        },
      ];
    });
    if (added) setToast(`Added ${item.title || item.name || item.label || item.id} to your itinerary.`);
    return { ok: true, alreadyExists: !added };
  }, [currentStage, currentStageZoneIndex]);

  const removeFromItinerary = useCallback((id) => {
    setItinerary((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const clearItinerary = useCallback(() => setItinerary([]), []);

  const stopVoice = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    voiceRequestRef.current += 1;
    setVoiceState("idle");
  }, []);

  const interruptSpeech = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    voiceRequestRef.current += 1;
    setVoiceState("idle");
  }, []);

  const startVoice = useCallback(() => {
    if (!voiceEnabled) {
      setToast("Voice is disabled in settings.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setToast("This browser does not support Web Speech recognition. Use Chrome or Edge, or type your question.");
      setMode("chat");
      return;
    }

    if (window.speechSynthesis) window.speechSynthesis.cancel();
    recognitionRef.current?.abort();

    const recognition = new SpeechRecognition();
    recognition.lang = language === "Hindi" ? "hi-IN" : language === "Tamil" ? "ta-IN" : language === "Telugu" ? "te-IN" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    let finalText = "";
    setMode("voice");
    setVoiceTranscript("");
    setVoiceState("listening");

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();
      const latest = event.results[event.results.length - 1];
      setVoiceTranscript(transcript);
      setQuery(transcript);
      if (latest?.isFinal) finalText = transcript;
    };

    recognition.onerror = (event) => {
      const message = event.error === "not-allowed"
        ? "Microphone permission was blocked. Allow mic access in the browser and try again."
        : `Voice recognition stopped: ${event.error}.`;
      setToast(message);
      setVoiceState("idle");
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      const spokenText = finalText.trim();
      if (!spokenText) {
        setVoiceState("idle");
        return;
      }
      const voiceRequestId = voiceRequestRef.current + 1;
      voiceRequestRef.current = voiceRequestId;
      setVoiceState("processing");
      submitQuestion(spokenText, { fromVoice: true, speak: true, voiceRequestId });
    };

    recognition.start();
  }, [language, submitQuestion, voiceEnabled]);

  const cycleVoice = useCallback(() => {
    if (voiceState === "speaking" || isThinking) {
      interruptSpeech();
      return;
    }
    if (voiceState === "listening" || voiceState === "processing") {
      stopVoice();
      return;
    }
    startVoice();
  }, [interruptSpeech, isThinking, startVoice, stopVoice, voiceState]);

  // Realtime watcher: polls /realtime, diffs each snapshot, surfaces changes
  // as a toast and a system-style note in the conversation so the LLM sees
  // them on the next turn ("you previously told them AI203 was On Time, but
  // it just flipped to Boarding - acknowledge that").
  const handleRealtimeChange = useCallback((diffs, snapshot) => {
    if (!diffs || !diffs.length) return;
    const headline = diffs[0];
    const more = diffs.length > 1 ? ` (+${diffs.length - 1} more)` : "";
    setToast(`Live update: ${headline}${more}`);
    setConversation((messages) => [
      ...messages,
      {
        role: "system",
        content: `Live update from airport ops:\n• ${diffs.join("\n• ")}`,
        source: "realtime",
      },
    ]);
    // Pull the user's flight forward if it just changed status / gate.
    if (snapshot && Array.isArray(snapshot.flights) && flight?.number) {
      const mine = snapshot.flights.find((f) => f.number === flight.number);
      if (mine) {
        setFlight((current) => ({
          ...current,
          gate: mine.gate || current.gate,
          status: mine.status || current.status,
          boarding: mine.boarding_time || current.boarding,
          delay_minutes: mine.delay_minutes ?? current.delay_minutes,
        }));
      }
    }
  }, [flight?.number]);

  const { snapshot: realtimeSnapshot, etag: realtimeEtag } = useRealtimeWatcher({
    onChange: handleRealtimeChange,
    enabled: true,
  });

  const value = {
    flight,
    setFlight,
    persistFlight,
    activeTab,
    setActiveTab,
    voiceState,
    setVoiceState,
    mode,
    setMode,
    query,
    setQuery,
    voiceTranscript,
    submitQuestion,
    cycleVoice,
    startVoice,
    stopVoice,
    interruptSpeech,
    aiMessage,
    conversation,
    isThinking,
    timeline,
    filteredPlaces,
    toast,
    setToast,
    closeToast: () => setToast(""),
    mapOpen,
    setMapOpen,
    routeDestination,
    setRouteDestination,
    selectedPlace,
    setSelectedPlace,
    largeText,
    setLargeText,
    voiceOnly,
    setVoiceOnly,
    voiceEnabled,
    setVoiceEnabled,
    language,
    setLanguage,
    itinerary,
    addToItinerary,
    removeFromItinerary,
    clearItinerary,
    currentStage,
    setCurrentStage,
    departureStages,
    realtimeSnapshot,
    realtimeEtag,
    aiHighlights,
    setAiHighlights,
    visitedStopIds,
    markStopVisited,
    clearVisitedStops,
    travelerPosition,
    setTravelerPosition,
    llmModel,
    setLlmModel,
    elderlyMode,
    setElderlyMode,
  };

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

export function useJourney() {
  const context = useContext(JourneyContext);
  if (!context) throw new Error("useJourney must be used inside JourneyProvider");
  return context;
}
