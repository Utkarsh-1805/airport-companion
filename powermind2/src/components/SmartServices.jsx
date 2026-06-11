import React, { useEffect, useState } from "react";
import { Bookmark, Check, ChevronDown, ConciergeBell, Map, Plus, ShieldCheck, ShoppingBag, SlidersHorizontal, Toilet, Utensils } from "lucide-react";
import { useJourney } from "../context/JourneyContext.jsx";
import { serviceTabs } from "../data/airportData.js";

const icons = {
  shops: ShoppingBag,
  food: Utensils,
  restrooms: Toilet,
  lounges: ConciergeBell,
  services: ShieldCheck,
};

const PAGE_SIZE = 4;

export default function SmartServices() {
  const {
    activeTab,
    setActiveTab,
    filteredPlaces,
    setSelectedPlace,
    setMapOpen,
    setRouteDestination,
    itinerary,
    addToItinerary,
  } = useJourney();

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset pagination when the user switches tabs.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeTab]);

  const visiblePlaces = filteredPlaces.slice(0, visibleCount);
  const remaining = Math.max(0, filteredPlaces.length - visibleCount);

  const isInItinerary = (id) => itinerary.some((entry) => entry.id === id);

  return (
    <aside className="panel services-panel">
      <div className="panel-head">
        <h2>Smart Services</h2>
        <SlidersHorizontal size={20} />
      </div>
      <div className="service-tabs">
        {serviceTabs.map((tab) => {
          const Icon = icons[tab.id] || ShieldCheck;
          return (
            <button key={tab.id} className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}>
              <Icon size={22} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      <div className="service-list">
        {filteredPlaces.length === 0 && (
          <p className="services-empty">No items in this category.</p>
        )}
        {visiblePlaces.map((item) => {
          const added = isInItinerary(item.id);
          const reachable = item.reachable !== false;
          return (
            <div className={`service-card ${reachable ? "" : "behind"}`} key={item.id}>
              <button
                type="button"
                className="service-card-body"
                onClick={() => {
                  // Open the detail modal only — the modal has its own
                  // "View on map" CTA. Opening both at once was confusing
                  // and stacked the map under the modal.
                  if (item.nodeId) setRouteDestination(item.nodeId);
                  setSelectedPlace(item);
                }}
              >
                <div className="service-card-text">
                  <h3>{item.name}</h3>
                  {item.description ? (
                    <p className="service-desc">{item.description}</p>
                  ) : (
                    <p>{item.location}</p>
                  )}
                  <small>
                    {item.walkMins != null ? `${item.walkMins} min walk` : "Walking time —"}
                    {item.crowd_level && ` · crowd: ${item.crowd_level}`}
                    {item.hours && ` · ${item.hours}`}
                  </small>
                </div>
                <div className="service-card-meta">
                  {!reachable && <span className="risk passed"><Bookmark size={12} /> Behind your stage</span>}
                  {reachable && item.crowd_level === "high" && <span className="risk medium">Busy</span>}
                  {reachable && item.crowd_level === "low" && <span className="risk low">Quiet</span>}
                </div>
              </button>
              <button
                type="button"
                className={`add-itinerary ${added ? "added" : ""}`}
                onClick={(event) => {
                  event.stopPropagation();
                  if (added) return;
                  addToItinerary({
                    id: item.id,
                    title: item.name,
                    subtitle: item.kind === "shop" ? item.shop?.tag?.replaceAll("_", " ") : item.type,
                    nodeId: item.nodeId,
                    source: "smart-services",
                  });
                }}
                aria-label={added ? "Already in itinerary" : reachable ? "Add to itinerary" : "Cannot add - already passed this zone"}
                title={added ? "In your itinerary" : reachable ? "Add to itinerary" : "Cannot add - behind your current stage"}
                disabled={added}
              >
                {added ? <Check size={16} /> : <Plus size={16} />}
              </button>
            </div>
          );
        })}
        {remaining > 0 && (
          <button
            type="button"
            className="show-more-btn"
            onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
            aria-label={`Show ${Math.min(PAGE_SIZE, remaining)} more ${activeTab}`}
          >
            <ChevronDown size={16} />
            <span>Show {Math.min(PAGE_SIZE, remaining)} more</span>
            <span className="show-more-count">{remaining} left</span>
          </button>
        )}
        {visibleCount > PAGE_SIZE && (
          <button
            type="button"
            className="show-less-btn"
            onClick={() => setVisibleCount(PAGE_SIZE)}
          >
            Show less
          </button>
        )}
      </div>
      <button className="map-card" onClick={() => setMapOpen(true)}>
        <Map size={18} />
        <span>View terminal map</span>
      </button>
    </aside>
  );
}
