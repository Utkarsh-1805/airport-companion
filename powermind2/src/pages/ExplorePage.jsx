import React from "react";
import { ArrowLeft, Clock, Heart, MapPin, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useJourney } from "../context/JourneyContext.jsx";
import { buildExploreItems, walkMinutes, walkWeight, zoneIndex } from "../data/airportData.js";
import { useRouter } from "../router/RouterContext.jsx";

const allItems = buildExploreItems();

export default function ExplorePage() {
  const { navigate } = useRouter();
  const { setSelectedPlace, currentStage, departureStages } = useJourney();
  const [search, setSearch] = useState("");

  const fromNode = (departureStages.find((s) => s.id === currentStage) || departureStages[0]).anchorNodeId;
  const currentZoneIdx = zoneIndex(
    (departureStages.find((s) => s.id === currentStage) || departureStages[0]).zone,
  );

  const results = useMemo(() => {
    const term = search.toLowerCase().trim();
    return allItems
      .map((item) => ({
        ...item,
        walkMins: walkMinutes(walkWeight(fromNode, item.nodeId)),
        reachable: zoneIndex(item.zone) >= currentZoneIdx,
      }))
      .filter((item) => {
        if (!term) return true;
        const haystack = [item.name, item.description, item.zone, item.type, ...(item.services || [])]
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      })
      .sort((a, b) => {
        if (a.reachable !== b.reachable) return a.reachable ? -1 : 1;
        return (a.walkMins ?? 99) - (b.walkMins ?? 99);
      });
  }, [search, fromNode, currentZoneIdx]);

  return (
    <section className="explore page-enter">
      <button className="back-link" onClick={() => navigate("/home")}><ArrowLeft size={20} /> Back to concierge</button>
      <h1>Explore Terminal 2</h1>
      <div className="search-row">
        <div className="search-box">
          <Search size={22} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search shops, food, services, gates, signature items..."
          />
        </div>
        <button><SlidersHorizontal size={18} /> Refine</button>
      </div>
      <div className="explore-grid">
        {results.map((item, index) => (
          <button
            className={`explore-card ${index === 0 ? "featured" : ""} ${item.reachable ? "" : "behind"}`}
            key={item.id}
            onClick={() => setSelectedPlace(item)}
          >
            <div
              className="visual generic"
              style={item.shop?.visual_color ? { background: `linear-gradient(135deg, ${item.shop.visual_color}, rgba(0,0,0,0.18))` } : undefined}
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              ) : null}
              {item.shop?.promotion && <span>{item.shop.promotion}</span>}
              {item.price_tier && <em className="price-tier">{item.price_tier}</em>}
            </div>
            <div className="card-body">
              <div>
                <h2>{item.name}</h2>
                <Heart size={22} />
              </div>
              <p><MapPin size={15} /> {item.zone?.replaceAll("_", " ")}</p>
              <p><Clock size={15} /> {item.walkMins != null ? `${item.walkMins} min walk` : "—"}</p>
              {!item.reachable ? (
                <span className="risk passed">Behind your stage</span>
              ) : item.crowd_level === "high" ? (
                <span className="risk medium">Busy now</span>
              ) : item.crowd_level === "low" ? (
                <span className="risk low">Quiet</span>
              ) : null}
            </div>
          </button>
        ))}
      </div>
      <div className="floating-ai">
        <Sparkles size={24} /> Showing {results.length} airport places live from the terminal map.
      </div>
    </section>
  );
}
