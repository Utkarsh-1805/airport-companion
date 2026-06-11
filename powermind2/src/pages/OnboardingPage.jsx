import React, { useState } from "react";
import { Accessibility, ArrowRight, Clock, Plane, ScanLine, Sparkles } from "lucide-react";
import { useJourney } from "../context/JourneyContext.jsx";
import { useRouter } from "../router/RouterContext.jsx";
import BoardingPassUpload from "../components/BoardingPassUpload.jsx";

// Fields the onboarding form drives directly. Anything not in this list
// (e.g. seat, pnr, passenger) is filled exclusively via the OCR path.
const UPPERCASE_FIELDS = new Set(["number", "from", "to", "gate", "terminal"]);

export default function OnboardingPage() {
  const { navigate } = useRouter();
  const { flight, setFlight, setToast, elderlyMode, setElderlyMode, persistFlight } = useJourney();
  const [showScanner, setShowScanner] = useState(false);

  const update = (key, value) => {
    const normalized = UPPERCASE_FIELDS.has(key) ? value.toUpperCase() : value;
    setFlight((current) => ({ ...current, [key]: normalized }));
  };

  return (
    <section className="onboarding page-enter">
      <div className="orbital-art" aria-hidden="true">
        <div className="runway-curve" />
        <div className="terminal-glass" />
      </div>
      <div className="welcome-copy">
        <span className="eyebrow"><Plane size={16} /> Privacy-first local AI</span>
        <h1>Welcome to Adani Airport Companion</h1>
        <p>Let us guide your airport flow with quiet efficiency, real-time context, and local-LLM intelligence.</p>
      </div>
      <form
        className="flight-card card-enter"
        onSubmit={(event) => {
          event.preventDefault();
          // Backfill demo defaults only when the field is still empty so the
          // user's typed values always win.
          const next = {
            ...flight,
            number: flight.number || "AI 247",
            from: flight.from || "DEL",
            to: flight.to || "DXB",
            gate: flight.gate || "B2",
            boarding: flight.boarding || "09:28",
            terminal: flight.terminal || "Terminal 2",
          };
          setFlight(next);
          persistFlight?.(next, "form");
          setToast(`Itinerary saved · ${next.number} · Gate ${next.gate} · Boarding ${next.boarding}.`);
          navigate("/home");
        }}
      >
        <div>
          <h2>Itinerary Details</h2>
          <p>Enter your flight, or scan your boarding pass to auto-fill everything.</p>
        </div>

        <button
          type="button"
          className="upload"
          onClick={() => setShowScanner((v) => !v)}
          aria-expanded={showScanner}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <ScanLine size={18} />
            {showScanner ? "Hide boarding-pass scanner" : "Scan boarding pass (OCR)"}
          </span>
          <small style={{ opacity: 0.75 }}>
            Auto-fills flight, gate, boarding time, seat, PNR — runs locally on this device.
          </small>
        </button>
        {showScanner && (
          <BoardingPassUpload onComplete={() => setShowScanner(false)} />
        )}

        <label>
          <span>Flight Number</span>
          <input value={flight.number || ""} onChange={(event) => update("number", event.target.value)} placeholder="e.g. AI 247" />
        </label>
        <div className="input-row">
          <label>
            <span>From</span>
            <input value={flight.from || ""} onChange={(event) => update("from", event.target.value)} placeholder="Origin" />
          </label>
          <label>
            <span>To</span>
            <input value={flight.to || ""} onChange={(event) => update("to", event.target.value)} placeholder="Destination" />
          </label>
        </div>
        <div className="input-row">
          <label>
            <span>Boarding Time</span>
            <input
              type="time"
              value={flight.boarding || ""}
              onChange={(event) => update("boarding", event.target.value)}
              placeholder="09:28"
            />
          </label>
          <label>
            <span>Gate</span>
            <input
              value={flight.gate || ""}
              onChange={(event) => update("gate", event.target.value)}
              placeholder="e.g. B2"
            />
          </label>
        </div>
        <label>
          <span>Terminal</span>
          <input
            value={flight.terminal || ""}
            onChange={(event) => update("terminal", event.target.value)}
            placeholder="Terminal 2"
          />
        </label>

        <label className="elderly-toggle">
          <input
            type="checkbox"
            checked={!!elderlyMode}
            onChange={(e) => setElderlyMode(e.target.checked)}
          />
          <span><Accessibility size={18} /> Easy Mode (larger text, voice on, simpler layout)</span>
        </label>
        <div className="preview-pill">
          <Clock size={15} />
          {flight.number
            ? `${flight.number} · Gate ${flight.gate || "—"} · Boarding ${flight.boarding || "—"} · ${flight.terminal || "Terminal 2"}`
            : "Status updates will appear here"}
        </div>
        <button className="primary" type="submit">
          Start Journey <ArrowRight size={22} />
        </button>
        <div className="local-note"><Sparkles size={15} /> Designed for Gemma/local inference with static airport data.</div>
      </form>
    </section>
  );
}
