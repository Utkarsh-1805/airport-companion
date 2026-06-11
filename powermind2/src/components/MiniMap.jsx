import React from "react";
import { Map } from "lucide-react";
import { useJourney } from "../context/JourneyContext.jsx";

export default function MiniMap() {
  const { setMapOpen } = useJourney();
  return (
    <button className="mini-map" onClick={() => setMapOpen(true)} aria-label="Open terminal map">
      <div className="map-lines" />
      <Map size={18} />
      <span>Route to B2</span>
    </button>
  );
}
