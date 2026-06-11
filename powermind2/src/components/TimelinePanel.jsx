import React from "react";
import { Check, Clock, MapPin, Pin, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useJourney } from "../context/JourneyContext.jsx";

export default function TimelinePanel() {
  const {
    timeline,
    currentStage,
    setCurrentStage,
    removeFromItinerary,
    setRouteDestination,
    setMapOpen,
    itinerary,
    clearItinerary,
  } = useJourney();

  return (
    <motion.aside className="panel timeline-panel" layout>
      <div className="timeline-head">
        <div>
          <h2>The Itinerary</h2>
          <p>Your live path from entry to boarding. Tap any stage to set where you are now.</p>
        </div>
        {itinerary.length > 0 && (
          <button type="button" className="clear-link" onClick={clearItinerary}>Clear stops</button>
        )}
      </div>
      <div className="timeline">
        <AnimatePresence initial={false}>
          {timeline.map((item) => {
            if (item.kind === "stage") {
              const isPin = item.id === currentStage;
              return (
                <motion.div
                  className={`timeline-item stage ${item.status} ${isPin ? "pinned" : ""}`}
                  key={`stage:${item.id}`}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <button
                    type="button"
                    className="timeline-pin-target"
                    onClick={() => setCurrentStage(item.id)}
                    aria-label={`Set ${item.title} as current stage`}
                    title={isPin ? "You are here" : `Mark ${item.title} as current`}
                  >
                    <div className="dot">
                      {isPin ? <Pin size={13} /> : item.status === "done" ? <Check size={14} /> : null}
                    </div>
                  </button>
                  <div className="timeline-content">
                    <div>
                      <strong>{item.title}</strong>
                      {isPin && <span className="badge-now">You are here</span>}
                      {!isPin && item.status === "active" && <span>Current</span>}
                    </div>
                    <p>{item.detail}</p>
                    <small><Clock size={14} /> {item.timeLabel}</small>
                  </div>
                </motion.div>
              );
            }
            // Saved stop
            return (
              <motion.div
                className={`timeline-item stop ${item.status}`}
                key={`stop:${item.id}`}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 14 }}
              >
                <div className="dot stop-dot">
                  <MapPin size={11} />
                </div>
                <div className="timeline-content stop-content">
                  <button
                    type="button"
                    className="stop-row"
                    onClick={() => {
                      if (item.nodeId) {
                        setRouteDestination(item.nodeId);
                        setMapOpen(true);
                      }
                    }}
                  >
                    <div>
                      <strong>{item.title}</strong>
                      {item.subtitle && <small className="stop-subtitle">{item.subtitle}</small>}
                    </div>
                    <small className="stop-meta">
                      <Clock size={12} /> {item.timeLabel || "—"}
                    </small>
                  </button>
                  <button
                    type="button"
                    className="saved-remove inline"
                    aria-label={`Remove ${item.title}`}
                    onClick={() => removeFromItinerary(item.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}
