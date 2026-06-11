import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigation, RotateCcw, ScanSearch } from "lucide-react";

import NewAirportScene from "../map/scene/AirportScene.jsx";
import ItineraryCheckpoints from "./ItineraryCheckpoints.jsx";
import AiSuggestionPins from "./AiSuggestionPins.jsx";
import { useJourney } from "../context/JourneyContext.jsx";
import {
  CHECKIN_ROWS,
  DUTY_FREE,
  ESCALATORS,
  GATES,
  KIOSKS,
  LANDSIDE_AMENITIES,
  RESTROOMS,
  SECURITY,
  SHOPS,
  VEHICLE_GATES,
  airportData,
  resolveDestinationNode,
  walkMinutes,
  walkWeight,
  zoneIndex,
} from "../data/airportData.js";
import {
  NAV_BOUNDS,
  buildNavigationObstacles,
  canMoveBetween,
  findShortestRoute,
  routeDistance,
} from "../map/navigation/navUtils.js";
import MiniMap from "../map/components/MiniMap.jsx";

// Need SEATING from the new dataset — it isn't re-exported from the
// adapter facade, pull it directly here.
import { SEATING as SEATING_NEW } from "../map/data/airportData.js";

const DEFAULT_DESTINATION_ID = "G23";
const PICKUP_GATE_ID = "VG-2";

function nodeLabel(node) {
  if (!node) return "Destination";
  return node.label || node.id?.replaceAll("_", " ") || "Destination";
}

export default function AirportScene({ initialDestination = DEFAULT_DESTINATION_ID, onRouteChange }) {
  const {
    itinerary,
    currentStage,
    departureStages,
    aiHighlights,
    visitedStopIds,
    markStopVisited,
    setCurrentStage,
    travelerPosition,
    setTravelerPosition,
  } = useJourney();

  // Set of "stop:<id>" / "stage:<id>" currently in the verifying-arrival
  // window. Declared up here so itineraryStops can read it; populated by
  // the proximity effect further down.
  const [completingIds, setCompletingIds] = useState(() => new Set());

  // Compute zone-based status for each itinerary stop. A stop is "done"
  // if its zone is behind the user's current stage; "active" for the
  // earliest non-done stop; "pending" otherwise.
  const itineraryStops = useMemo(() => {
    if (!itinerary?.length) return [];
    const stage = (departureStages || []).find((s) => s.id === currentStage) || (departureStages || [])[0];
    const stageZoneIdx = stage ? zoneIndex(stage.zone) : 0;
    const nodes = airportData.navigation_graph.nodes;
    const enriched = itinerary
      .map((entry) => {
        const node = nodes.find((n) => n.id === entry.nodeId);
        if (!node) return null;
        const stopZoneIdx = zoneIndex(node.zone);
        return {
          id: entry.id,
          label: entry.title || node.label,
          nodeId: entry.nodeId,
          position: node.position,
          zoneIdx: stopZoneIdx,
        };
      })
      .filter(Boolean);

    // Sort by zone progression so the user's "next" makes sense.
    enriched.sort((a, b) => a.zoneIdx - b.zoneIdx);

    let activeAssigned = false;
    return enriched.map((stop) => {
      let status;
      const visited = visitedStopIds?.has(stop.id);
      const completing = completingIds?.has(`stop:${stop.id}`);
      if (visited || stop.zoneIdx < stageZoneIdx) status = "done";
      else if (completing) status = "completing";
      else if (!activeAssigned) {
        status = "active";
        activeAssigned = true;
      } else status = "pending";
      return { ...stop, status };
    });
  }, [itinerary, currentStage, departureStages, visitedStopIds, completingIds]);

  const nextActiveStop = itineraryStops.find((s) => s.status === "active");

  const obstacles = useMemo(
    () =>
      buildNavigationObstacles({
        shops: SHOPS,
        dutyFree: DUTY_FREE,
        restrooms: RESTROOMS,
        kiosks: KIOSKS,
        landsideAmenities: LANDSIDE_AMENITIES,
        checkInRows: CHECKIN_ROWS,
        security: SECURITY,
        seating: SEATING_NEW,
        escalators: ESCALATORS,
      }),
    []
  );

  const pickupGate = useMemo(
    () => VEHICLE_GATES.find((g) => g.id === PICKUP_GATE_ID) || VEHICLE_GATES[0],
    []
  );

  const [destinationId, setDestinationId] = useState(initialDestination || DEFAULT_DESTINATION_ID);
  const [hoverLabel, setHoverLabel] = useState("");
  const [manualOverride, setManualOverride] = useState(false);

  // Sync incoming destination changes (e.g. user clicks a Smart Service card).
  useEffect(() => {
    if (initialDestination && initialDestination !== destinationId) {
      setDestinationId(initialDestination);
      setManualOverride(true);
    }
  }, [initialDestination]); // eslint-disable-line react-hooks/exhaustive-deps

  // If the user hasn't manually picked a destination, follow the next
  // pending itinerary stop. This makes the map "guide" the user along
  // their saved journey automatically.
  useEffect(() => {
    if (manualOverride) return;
    if (nextActiveStop && nextActiveStop.nodeId !== destinationId) {
      setDestinationId(nextActiveStop.nodeId);
    }
  }, [nextActiveStop?.nodeId, manualOverride]); // eslint-disable-line react-hooks/exhaustive-deps

  const destinationNode = useMemo(() => {
    return (
      resolveDestinationNode(destinationId) ||
      airportData.navigation_graph.nodes.find((n) => n.id === DEFAULT_DESTINATION_ID) ||
      airportData.navigation_graph.nodes[0]
    );
  }, [destinationId]);

  // Build the ordered list of waypoints the user must visit:
  //   [traveler position]
  //     → every *pending* mandatory stage anchor (security, immigration, ...)
  //     → every *non-done* user-saved stop, slotted in by zone
  //     → final destination (boarding gate / AI pick / dropdown)
  //
  // Order is *itinerary order*, not nearest-first: the user explicitly
  // asked that security come before food/shopping etc., regardless of
  // physical distance. departureStages are the canonical journey skeleton.
  const waypointChain = useMemo(() => {
    const stageNodes = airportData.navigation_graph.nodes;
    const findNode = (id) => stageNodes.find((n) => n.id === id);
    const stageIdx = (departureStages || []).findIndex((s) => s.id === currentStage);
    const upcomingStages = (departureStages || []).slice(stageIdx + 1);

    const chain = [{ position: travelerPosition, label: "You", kind: "start" }];

    // Interleave: for each upcoming stage, push the stage anchor, then
    // any pending user stops whose zone falls within that stage's zone.
    const pendingStops = itineraryStops.filter((s) => s.status !== "done");
    const usedStops = new Set();

    upcomingStages.forEach((stage) => {
      const node = findNode(stage.anchorNodeId);
      const lowerIdx = zoneIndex(stage.zone);
      // Skip the boarding stage anchor here — destinationNode already covers
      // the user's chosen gate.
      if (node && stage.id !== "boarding") {
        chain.push({
          position: node.position,
          label: stage.title,
          nodeId: stage.anchorNodeId,
          kind: "stage",
          stageId: stage.id,
        });
      }
      // Slot in user stops that belong in this stage's zone.
      pendingStops.forEach((stop) => {
        if (usedStops.has(stop.id)) return;
        if (stop.zoneIdx === lowerIdx) {
          if (destinationNode && stop.nodeId === destinationNode.id) {
            usedStops.add(stop.id);
            return;
          }
          chain.push({
            position: stop.position,
            label: stop.label,
            nodeId: stop.nodeId,
            kind: "stop",
            status: stop.status,
            stopId: stop.id,
          });
          usedStops.add(stop.id);
        }
      });
    });

    // Any stops that didn't bind to a stage zone — append at the end before
    // the final destination so they're still visited.
    pendingStops.forEach((stop) => {
      if (usedStops.has(stop.id)) return;
      if (destinationNode && stop.nodeId === destinationNode.id) return;
      chain.push({
        position: stop.position,
        label: stop.label,
        nodeId: stop.nodeId,
        kind: "stop",
        status: stop.status,
        stopId: stop.id,
      });
    });

    // Append the explicit destination only when the user actually chose
    // one (dropdown / AI pin / Smart Service click). When the itinerary
    // is empty and the user hasn't overridden, leave the chain at just
    // [traveler] so no route is drawn — the user is free to roam.
    if (destinationNode && manualOverride) {
      const alreadyInChain = chain.some((w) => w.nodeId === destinationNode.id);
      if (!alreadyInChain) {
        chain.push({
          position: destinationNode.position,
          label: destinationNode.label || destinationId,
          nodeId: destinationNode.id,
          kind: "destination",
        });
      }
    }
    return chain;
  }, [travelerPosition, itineraryStops, destinationNode, destinationId, departureStages, currentStage, manualOverride]);

  // Concatenate per-leg A* routes so the gold WayfindingPath traces the
  // full multi-stop journey rather than a straight start→end leg.
  const route = useMemo(() => {
    if (waypointChain.length < 2) return [];
    const points = [];
    for (let i = 1; i < waypointChain.length; i += 1) {
      const from = waypointChain[i - 1].position;
      const to = waypointChain[i].position;
      const leg = findShortestRoute(from, to, obstacles, NAV_BOUNDS);
      // Drop the leg's first point (it duplicates the previous leg's last)
      // except on the very first leg, which carries "You".
      const slice = i === 1 ? leg : leg.slice(1);
      // Tag the final point of each leg with the waypoint's label so the
      // wayfinding path knows where to draw a checkpoint marker.
      slice.forEach((p, idx) => {
        if (idx === slice.length - 1) {
          points.push({ ...p, label: waypointChain[i].label, kind: waypointChain[i].kind });
        } else {
          points.push(p);
        }
      });
    }
    return points;
  }, [waypointChain, obstacles]);

  const distanceUnits = useMemo(() => routeDistance(route), [route]);
  const minutes = useMemo(() => walkMinutes(distanceUnits) ?? walkMinutes(walkWeight(pickupGate.id, destinationNode?.id)), [distanceUnits, pickupGate.id, destinationNode]);

  // Notify parent (FullMap) about the new route so its toast/itinerary UI updates.
  useEffect(() => {
    if (!destinationNode || !onRouteChange) return;
    const message = `${pickupGate.name} to ${nodeLabel(destinationNode)}: ${minutes ?? "?"} min walk.`;
    onRouteChange({ destination: destinationNode.id, message, path: route.map((r) => r.position) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationNode?.id, minutes]);

  // Destinations dropdown — gates + key services from the legacy graph.
  const destinations = useMemo(() => {
    const gates = GATES.map((g) => ({ id: g.id, label: g.name, type: "Gate" }));
    const shops = SHOPS.map((s) => ({ id: s.id, label: s.name, type: s.type }));
    const restrooms = RESTROOMS.map((r) => ({ id: r.id, label: r.name, type: "restroom" }));
    const security = SECURITY.map((s) => ({ id: s.id, label: s.name, type: "security" }));
    const escalators = ESCALATORS.map((e) => ({ id: e.id, label: e.name, type: "escalator" }));
    return [...gates, ...shops, ...restrooms, ...security, ...escalators].sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, []);

  const handleSelect = useCallback((entity) => {
    if (!entity) return;
    setHoverLabel(entity.name || "");
    // Map the entity back to a node id so we can route to it.
    if (entity.kind === "gate") {
      const gate = GATES.find((g) => g.name === entity.name);
      if (gate) {
        setDestinationId(gate.id);
        return;
      }
    }
    const shop = SHOPS.find((s) => s.name === entity.name);
    if (shop) {
      setDestinationId(shop.id);
      return;
    }
    const rest = RESTROOMS.find((r) => r.name === entity.name);
    if (rest) {
      setDestinationId(rest.id);
      return;
    }
    const kiosk = KIOSKS.find((k) => k.name === entity.name);
    if (kiosk) setDestinationId(kiosk.id);
  }, []);

  const resetTraveler = useCallback(() => {
    // Reset to the *current stage's* anchor, not the road-side pickup
    // gate. So if the user is already at "security", reset puts them
    // back at the security hub rather than teleporting outside.
    const stage = (departureStages || []).find((s) => s.id === currentStage) || (departureStages || [])[0];
    const anchor = airportData.navigation_graph.nodes.find((n) => n.id === stage?.anchorNodeId);
    setTravelerPosition(anchor ? anchor.position : pickupGate.position);
    setManualOverride(false);
  }, [pickupGate.position, currentStage, departureStages, setTravelerPosition]);

  // ─── Proximity auto-completion (with "verifying" dwell) ──────────
  // Step 1: when the traveler enters a checkpoint's radius, flag it as
  // "completing" and start a short timer (visual: spinning ring).
  // Step 2: after the timer fires, mark it visited (visual: green tick).
  // If the traveler walks away before the timer fires, the timer is
  // cancelled and the checkpoint reverts to its previous status.
  const PROXIMITY_RADIUS = 9;          // world units to enter "completing"
  const COMPLETION_DELAY_MS = 1500;     // dwell time before "done"
  const completionTimers = useRef(new Map()); // id -> timeoutId

  const startCompletion = useCallback((id, onDone) => {
    if (completionTimers.current.has(id)) return;
    setCompletingIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    const timer = setTimeout(() => {
      completionTimers.current.delete(id);
      setCompletingIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      onDone();
    }, COMPLETION_DELAY_MS);
    completionTimers.current.set(id, timer);
  }, []);

  const cancelCompletion = useCallback((id) => {
    const t = completionTimers.current.get(id);
    if (t) {
      clearTimeout(t);
      completionTimers.current.delete(id);
    }
    setCompletingIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  useEffect(() => {
    const [tx, , tz] = travelerPosition;

    // ── User-saved itinerary stops ─────────────────────────────────
    itineraryStops.forEach((stop) => {
      if (stop.status === "done") return;
      const dx = stop.position[0] - tx;
      const dz = stop.position[2] - tz;
      const inRange = Math.hypot(dx, dz) <= PROXIMITY_RADIUS;
      if (inRange) {
        startCompletion(`stop:${stop.id}`, () => markStopVisited(stop.id));
      } else {
        cancelCompletion(`stop:${stop.id}`);
      }
    });

    // ── Departure stages (security, immigration, ...) ──────────────
    if (!departureStages?.length) return;
    const currentIdx = departureStages.findIndex((s) => s.id === currentStage);
    for (let i = currentIdx + 1; i < departureStages.length; i += 1) {
      const stage = departureStages[i];
      const node = airportData.navigation_graph.nodes.find((n) => n.id === stage.anchorNodeId);
      if (!node) continue;
      const dx = node.position[0] - tx;
      const dz = node.position[2] - tz;
      const inRange = Math.hypot(dx, dz) <= PROXIMITY_RADIUS;
      if (inRange) {
        startCompletion(`stage:${stage.id}`, () => setCurrentStage(stage.id));
        break; // only one stage advances per dwell
      } else {
        cancelCompletion(`stage:${stage.id}`);
      }
    }
  }, [travelerPosition, itineraryStops, departureStages, currentStage, markStopVisited, setCurrentStage, startCompletion, cancelCompletion]);

  // Cleanup all pending timers on unmount.
  useEffect(() => () => {
    completionTimers.current.forEach((t) => clearTimeout(t));
    completionTimers.current.clear();
  }, []);

  // Arrow-key wayfinding (consistent with the standalone src/ demo).
  useEffect(() => {
    const MOVE_STEP = 2.5;
    const handleKeyDown = (event) => {
      const tagName = event.target?.tagName;
      if (tagName === "INPUT" || tagName === "SELECT" || tagName === "TEXTAREA") return;
      const moves = {
        ArrowLeft: [-MOVE_STEP, 0],
        ArrowRight: [MOVE_STEP, 0],
        ArrowUp: [0, -MOVE_STEP],
        ArrowDown: [0, MOVE_STEP],
      };
      const move = moves[event.key];
      if (!move) return;
      event.preventDefault();
      setTravelerPosition((current) => {
        const next = [current[0] + move[0], current[1], current[2] + move[1]];
        // Block movement into shops, counters, security, etc.
        return canMoveBetween(current, next, obstacles, NAV_BOUNDS) ? next : current;
      });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [obstacles]);

  return (
    <div className="airport-scene-shell">
      <div className="airport-scene-controls">
        <label>
          <Navigation size={16} />
          <select
            value={destinationId}
            onChange={(e) => {
              setDestinationId(e.target.value);
              setManualOverride(true);
            }}
          >
            {destinations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label} — {d.type}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={resetTraveler} aria-label="Reset traveler">
          <RotateCcw size={17} />
        </button>
        <button type="button" aria-label="Top view" disabled title="Use orbit controls inside the map">
          <ScanSearch size={17} />
        </button>
      </div>
      <div className="airport-scene">
        <NewAirportScene
          onSelect={handleSelect}
          travelerPosition={travelerPosition}
          route={route}
        >
          <ItineraryCheckpoints stops={itineraryStops} />
          <AiSuggestionPins
            highlights={aiHighlights}
            onPick={(h) => {
              if (h?.nodeId) {
                setDestinationId(h.nodeId);
                setManualOverride(true);
              }
            }}
          />
        </NewAirportScene>
        <div className="mini-map-anchor">
          <MiniMap
            selected={destinationNode ? { kind: destinationNode.type, name: destinationNode.label, position: destinationNode.position } : null}
            userPosition={travelerPosition}
            route={route}
          />
        </div>
      </div>
      <div className="route-readout">
        <strong>
          {waypointChain.length < 2
            ? "Itinerary complete — you're free to explore the terminal."
            : waypointChain.length > 2
              ? `You → ${waypointChain.slice(1, -1).map((w) => w.label).join(" → ")} → ${waypointChain[waypointChain.length - 1].label} · ${minutes ?? "?"} min walk · ${waypointChain.length - 1} stops`
              : `You → ${nodeLabel(destinationNode)} · ${minutes ?? "?"} min walk`}
        </strong>
        {hoverLabel && <span>{hoverLabel}</span>}
      </div>
    </div>
  );
}
