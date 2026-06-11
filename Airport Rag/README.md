# CSMIA Inspired Airport Navigation Model

Clean, semi-realistic Three.js/WebGL airport model inspired by Chhatrapati Shivaji Maharaj International Airport, Mumbai. It is optimized for interactive navigation rather than ultra-heavy realism.

## Files

- `index.html` - runnable 3D scene shell.
- `src/main.js` - Three.js scene generation, Dijkstra routing, interactions, day/night mode, and GLB export.
- `src/airportData.js` - source airport metadata used by the scene.
- `data/navigation-graph.json` - assistant/Unity-ingestable weighted nodes and edges.
- `data/shop-metadata.json` - shop metadata tags for BrewHub, ReadZone, TechSpot, StyleDeck, and MediQuick.
- `data/airport-metadata.json` - compact project metadata and feature index.

## Run

This folder is now a legacy data/reference package. Its `index.html` explains
that the active map moved into `../powermind2`.

Run the current app from the React frontend instead:

```powershell
cd ..\powermind2
npm.cmd install
npm.cmd run dev
```

Then open:

```text
http://127.0.0.1:5173
```

The exported JSON files in `data/` are still used by the local assistant
backend and can be regenerated from the source data when needed.

## Demo Flow

1. The default start is `Gate A1`, shown by the single `YOU` marker. Choose a `To` node and click `Go` or `Route`.
2. Dijkstra computes the shortest weighted path and renders a clear highlighted route with written steps.
3. Use `Top View` for map-style navigation or `Free Cam` for orbit navigation.
4. Click graph nodes to move your start point, or click shops/gates to set the destination.
5. Click `Night` for dynamic lighting and `Export GLB` to serialize the generated model.
6. Click `Recommend Shops` to surface passenger-aware suggestions.

Included zones: T1 Domestic, T2 International, entry gates, security, check-in counters, waiting lounges, gates A1-A10 and B1-B10, retail and food court, restrooms, elevators, escalators, baggage claim, flight screens, and low-poly moving passengers.
