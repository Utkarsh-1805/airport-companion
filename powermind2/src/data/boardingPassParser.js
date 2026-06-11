// Pulls the structured fields a passenger cares about (flight number,
// origin, destination, gate, seat, boarding time, name, PNR) out of the
// raw text Tesseract returned for a boarding-pass photo.
//
// Boarding passes vary wildly across airlines, but a few patterns are
// extremely consistent — IATA codes are always three uppercase letters,
// flight numbers are 1–3 letters + 1–4 digits, gates are short codes,
// and times follow HH:MM. We anchor on those.

const RX = {
  // "AI 203", "6E2034", "UK-961", "QR 580"
  flight: /\b([A-Z0-9]{1,3})\s*[-]?\s*(\d{1,4}[A-Z]?)\b/g,
  // Three-letter IATA airport code (origin / destination)
  iata: /\b([A-Z]{3})\b/g,
  // 24-hour or 12-hour time
  time: /\b(\d{1,2}:\d{2})(?:\s?(?:AM|PM|am|pm))?\b/g,
  // PNR / booking reference: 6 alphanumeric, often labelled
  pnr: /\b(?:PNR|REF|BOOKING|RECORD\s+LOCATOR)[:\s]*([A-Z0-9]{5,7})\b/i,
  // Standalone 6-character PNR if no label
  pnrLoose: /\b([A-Z0-9]{6})\b/,
  // Seat: 1–3 digits + 1 letter (12A, 7C, 30F)
  seat: /\b(\d{1,3}[A-Z])\b/g,
  // Gate: explicit label
  gate: /\bGATE[:\s]*([A-Z]?\s*\d{1,3}[A-Z]?)\b/i,
  // Date: 2025-11-12, 12 NOV 2025, 12/11/2025
  date: /\b(\d{1,2}[\s\-\/](?:[A-Z]{3}|\d{1,2})[\s\-\/]\d{2,4})\b/i,
  // Passenger name on most ticket stocks: "MR. SMITH/JOHN" or "SMITH/JOHN MR"
  name: /\b([A-Z][A-Z\s'\-]{1,30})\/([A-Z][A-Z\s'\-]{1,40})(?:\s+(MR|MS|MRS|MISS|DR))?\b/,
};

// Common Indian-origin airport codes — bias the IATA picker toward known
// airports when the OCR returns garbage three-letter sequences.
const KNOWN_IATA = new Set([
  "DEL", "BOM", "BLR", "MAA", "HYD", "CCU", "PNQ", "GOI", "AMD", "COK",
  "TRV", "IXC", "JAI", "LKO", "PAT", "BBI", "GAU", "SXR", "IXR", "NAG",
  "DXB", "AUH", "DOH", "SIN", "BKK", "KUL", "HKG", "LHR", "JFK", "SFO",
  "LAX", "ORD", "FRA", "CDG", "AMS", "ZRH", "MUC", "SYD", "MEL", "NRT",
  "ICN", "CMB", "KTM", "DAC", "MLE", "IST", "AYT", "MCT", "JED", "RUH",
]);

// Words that are not airport codes but match the IATA regex.
const IATA_FALSE_POSITIVES = new Set([
  "MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN",
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
  "PNR", "SEQ", "GATE", "SEAT", "TER", "ZON", "ETK", "ETD", "ECO", "EKO",
  "USD", "EUR", "INR", "GBP", "AED", "PAX", "VIA", "FRO", "AND", "MIN",
  "MAX", "BOR", "INT", "DOM", "DEP", "ARR",
]);

function uniq(arr) {
  return Array.from(new Set(arr));
}

export function parseBoardingPass(rawText) {
  if (!rawText) return {};
  const text = rawText.toUpperCase().replace(/[“”]/g, '"');
  const out = {};

  // Flight number — prefer the *first* matching pattern that has a 2-3
  // letter carrier code and a 3-4 digit number.
  const flightMatches = [...text.matchAll(RX.flight)]
    .filter((m) => /^[A-Z0-9]{1,3}$/.test(m[1]) && !IATA_FALSE_POSITIVES.has(m[1]))
    .filter((m) => /^\d{2,4}[A-Z]?$/.test(m[2]));
  if (flightMatches.length) {
    const m = flightMatches[0];
    out.number = `${m[1]} ${m[2]}`;
  }

  // IATA airport codes
  const iataAll = uniq(
    [...text.matchAll(RX.iata)]
      .map((m) => m[1])
      .filter((code) => !IATA_FALSE_POSITIVES.has(code))
  );
  // Prefer codes that are in the known list; fall back to first two seen
  const known = iataAll.filter((c) => KNOWN_IATA.has(c));
  const ordered = known.length >= 2 ? known : iataAll;
  if (ordered.length >= 2) {
    out.from = ordered[0];
    out.to = ordered[1];
  } else if (ordered.length === 1) {
    out.from = ordered[0];
  }

  // Times — pick the first two we see; the earlier one is usually
  // boarding, the later one departure. Boarding pass conventions vary,
  // so we surface both and let the UI label them.
  const times = [...text.matchAll(RX.time)].map((m) => m[1]);
  if (times.length >= 1) out.boarding = times[0];
  if (times.length >= 2) out.departure = times[1];

  // Gate
  const gateMatch = text.match(RX.gate);
  if (gateMatch) out.gate = gateMatch[1].replace(/\s+/g, "");

  // Seat (skip if the candidate looks like part of a flight number)
  const seatCandidates = [...text.matchAll(RX.seat)].map((m) => m[1]);
  const seat = seatCandidates.find((s) => !out.number?.includes(s));
  if (seat) out.seat = seat;

  // Date
  const dateMatch = text.match(RX.date);
  if (dateMatch) out.date = dateMatch[1];

  // PNR / booking ref
  const pnrLabelled = text.match(RX.pnr);
  if (pnrLabelled) out.pnr = pnrLabelled[1];

  // Passenger name
  const nameMatch = text.match(RX.name);
  if (nameMatch) {
    const last = nameMatch[1].trim();
    const first = nameMatch[2].trim().split(/\s+/)[0];
    out.passenger = `${first} ${last}`;
  }

  return out;
}
