import React from "react";
import { ArrowLeft, ArrowRight, Check, Clock, IndianRupee, Languages, MapPin, Plus, Sparkles, Tag, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useJourney } from "../context/JourneyContext.jsx";

// Place objects come from buildExploreItems() and may carry either shop or
// service metadata. We render whatever's there gracefully.
export default function DetailModal({ place, onClose }) {
  const { setMapOpen, setRouteDestination, itinerary, addToItinerary } = useJourney();
  if (!place) return null;

  const added = itinerary.some((entry) => entry.id === place.id);
  const reachable = place.reachable !== false;
  const shop = place.shop;
  const dietary = shop?.dietary
    ? Object.entries(shop.dietary)
        .filter(([k, v]) => v === true)
        .map(([k]) => k.replaceAll("_", " "))
    : [];
  const allergens = shop?.dietary?.allergens || [];
  const amenityFlags = shop?.amenities
    ? Object.entries(shop.amenities)
        .filter(([k, v]) => v === true)
        .map(([k]) => k.replaceAll("_", " "))
    : [];

  const visitWindow = place.walkMins != null && place.est_visit
    ? `${place.walkMins} min walk + ${place.est_visit} min visit`
    : place.walkMins != null
      ? `${place.walkMins} min walk`
      : "Walking time unknown";

  return (
    <motion.div className="detail-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.section className="detail-sheet" initial={{ y: 70 }} animate={{ y: 0 }} exit={{ y: 80 }}>
        <button className="back-link" onClick={onClose}><ArrowLeft size={20} /> Back</button>
        <div className="detail-layout">
          <div
            className="detail-image generic"
            style={shop?.visual_color ? { background: `linear-gradient(135deg, ${shop.visual_color}, rgba(0,0,0,0.18))` } : undefined}
          >
            {place.image ? (
              <img
                src={place.image}
                alt={place.name}
                loading="lazy"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            ) : null}
            {shop?.promotion && <span>{shop.promotion}</span>}
            {place.price_tier && <em className="price-tier">{place.price_tier}</em>}
          </div>
          <div className="detail-copy">
            <h1>{place.name}</h1>
            <p>
              {place.description || place.offers || "Real airport data, sourced from the live terminal map."}
            </p>
            <div className="detail-facts">
              <span><MapPin size={17} /> {place.zone?.replaceAll("_", " ") || place.location}</span>
              <span><Clock size={17} /> {visitWindow}</span>
              {shop?.price_range && (
                <span><IndianRupee size={17} /> {shop.price_range} {shop.currency || ""}</span>
              )}
              {place.crowd_level && (
                <span><Users size={17} /> Crowd {place.crowd_level}</span>
              )}
              {shop?.languages_spoken?.length > 0 && (
                <span><Languages size={17} /> {shop.languages_spoken.join(", ")}</span>
              )}
            </div>

            {shop?.signature_items?.length > 0 && (
              <div className="detail-section">
                <strong><Tag size={15} /> Signature items</strong>
                <ul className="detail-list">
                  {shop.signature_items.slice(0, 5).map((it) => (
                    <li key={it.name}>
                      <span>{it.name}</span>
                      <span className="price">{(it.price_currency || shop.currency || "INR")} {it.price}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(dietary.length > 0 || allergens.length > 0) && (
              <div className="detail-tags">
                {dietary.map((d) => <span key={d} className="tag tag-good">{d}</span>)}
                {allergens.map((a) => <span key={a} className="tag tag-warn">contains {a}</span>)}
              </div>
            )}

            {amenityFlags.length > 0 && (
              <div className="detail-tags">
                {amenityFlags.map((a) => <span key={a} className="tag">{a}</span>)}
              </div>
            )}

            {shop?.promotion && (
              <div className="ai-advice">
                <strong><Sparkles size={15} /> Offer</strong>
                <p>{shop.promotion}</p>
              </div>
            )}

            {!reachable && (
              <div className="ai-advice warn">
                <strong>Behind your current stage</strong>
                <p>You have already passed this zone in your journey. Adding it would require re-clearing security.</p>
              </div>
            )}

            <div className="detail-actions">
              <button
                type="button"
                className={`secondary ${added ? "added" : ""}`}
                onClick={() =>
                  !added &&
                  addToItinerary({
                    id: place.id,
                    title: place.name,
                    subtitle: place.kind === "shop" ? shop?.tag?.replaceAll("_", " ") : place.type,
                    nodeId: place.nodeId,
                    source: "detail",
                  })
                }
                disabled={added || !reachable}
              >
                {added ? (<><Check size={18} /> In itinerary</>) : (<><Plus size={18} /> Add to itinerary</>)}
              </button>
              <button
                className="primary"
                onClick={() => {
                  if (place.nodeId) setRouteDestination(place.nodeId);
                  setMapOpen(true);
                  onClose();
                }}
              >
                View on map <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
