import React from "react";
import { Bell, Compass, HelpCircle, Home, Search, Settings, User } from "lucide-react";
import MiniMap from "./MiniMap.jsx";
import { useJourney } from "../context/JourneyContext.jsx";
import { Link, useRouter } from "../router/RouterContext.jsx";

export default function AppShell({ children }) {
  const { navigate } = useRouter();
  const { flight, setToast, largeText, elderlyMode, setMapOpen, setRouteDestination } = useJourney();

  return (
    <main
      className={`experience ${largeText ? "large-type" : ""} ${elderlyMode ? "elderly-mode" : ""}`.trim()}
    >
      <header className="topbar">
        <button className="brand" onClick={() => navigate("/home")}>
          <span>Adani Concierge</span>
          <small>{flight.number || "Local LLM Demo"} - {flight.from || "Origin"} to {flight.to || "Destination"}</small>
        </button>
        <nav className="nav-actions" aria-label="Main navigation">
          <Link to="/home"><Home size={18} /> Journey</Link>
          <Link to="/explore"><Search size={18} /> Explore</Link>
          <Link to="/faq"><HelpCircle size={18} /> FAQ</Link>
          <button onClick={() => setToast("Boarding starts at 09:45. You should reach Gate B2 by 09:28.")}>
            <Bell size={18} />
          </button>
          <Link to="/profile"><User size={18} /></Link>
          <Link to="/settings"><Settings size={18} /></Link>
          <button onClick={() => {
            setRouteDestination(`Gate_${flight.gate || "B2"}`);
            setMapOpen(true);
            setToast(`Voice command recognized: Show route to Gate ${flight.gate || "B2"}.`);
          }}>
            <Compass size={18} />
          </button>
        </nav>
      </header>
      {children}
      <MiniMap />
    </main>
  );
}
