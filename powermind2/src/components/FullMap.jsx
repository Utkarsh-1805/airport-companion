import React, { useCallback, useState } from "react";
import { Check, Plus, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import AirportScene from "./AirportScene.jsx";
import { useJourney } from "../context/JourneyContext.jsx";

export default function FullMap({ onClose }) {
  const { routeDestination, setToast, itinerary, addToItinerary } = useJourney();
  const [activeRoute, setActiveRoute] = useState({ destination: routeDestination, label: null });

  const handleRouteChange = useCallback((route) => {
    setToast(route.message);
    // Best-effort: pull a friendly label from the toast message ("Foo to Bar:")
    const match = route?.message?.match(/to ([^:]+):/);
    setActiveRoute({ destination: route.destination, label: match ? match[1].trim() : route.destination });
  }, [setToast]);

  const added = activeRoute.destination && itinerary.some((entry) => entry.id === `map:${activeRoute.destination}`);

  return (
    <motion.div className="map-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.section
        className="full-map"
        initial={{ scale: 0.86, y: 80 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 70 }}
        transition={{ type: "spring", damping: 24, stiffness: 190 }}
      >
        <div className="map-toolbar">
          <div>
            <span className="eyebrow"><Sparkles size={15} /> AI path animation</span>
            <h2>Terminal 2 Navigation</h2>
          </div>
          <div className="map-toolbar-actions">
            {activeRoute.destination && (
              <button
                type="button"
                className={`add-itinerary-btn ${added ? "added" : ""}`}
                onClick={() =>
                  !added &&
                  addToItinerary({
                    id: `map:${activeRoute.destination}`,
                    title: activeRoute.label || activeRoute.destination.replaceAll("_", " "),
                    subtitle: "Saved from map",
                    nodeId: activeRoute.destination,
                    source: "map",
                  })
                }
                disabled={added}
              >
                {added ? (<><Check size={16} /> Saved</>) : (<><Plus size={16} /> Add to itinerary</>)}
              </button>
            )}
            <button onClick={onClose}>Close</button>
          </div>
        </div>
        <AirportScene initialDestination={routeDestination} onRouteChange={handleRouteChange} />
      </motion.section>
    </motion.div>
  );
}
