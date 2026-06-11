import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { airportData, airportLocations } from "./airportData.js";

const container = document.querySelector("#scene");
const popup = document.querySelector("#popup");
const popupContent = document.querySelector("#popupContent");
const hoverTooltip = document.querySelector("#hoverTooltip");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe3edf2);
scene.fog = new THREE.Fog(0xe3edf2, 170, 280);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 800);
camera.position.set(0, 170, 150);
camera.lookAt(0, 0, 24);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxDistance = 320;
controls.minDistance = 18;
controls.maxPolarAngle = Math.PI * 0.49;
controls.target.set(0, 0, 24);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clickableObjects = [];
const hoverObjects = [];
const nodeMarkers = new Map();
const graph = airportData.navigation_graph.graph;
const cardinalNeighbours = airportData.navigation_graph.cardinal_neighbours;
const nodesById = new Map(airportData.navigation_graph.nodes.map((node) => [node.id, node]));
const locationsByNodeId = new Map(
  [...airportLocations.gates, ...airportLocations.shops, ...airportLocations.facilities].map((location) => [location.nodeId, location])
);
const pathGroup = new THREE.Group();
let pathDots = [];
let activeCurve = null;
let routeAnimation = null;
let currentNodeId = airportData.navigation_graph.start_node;
let activePathIds = [];
let cameraTween = null;
let isNight = false;
let userMarker = null;
let userArrow = null;
let playerHeading = "N"; // facing direction: 'N' | 'S' | 'E' | 'W'
let stepAnimation = null; // active grid-step tween for keyboard nav
const HEADING_ROTATION_Y = { N: 0, E: -Math.PI / 2, S: Math.PI, W: Math.PI / 2 };
const TURN_LEFT = { N: "W", W: "S", S: "E", E: "N" };
const TURN_RIGHT = { N: "E", E: "S", S: "W", W: "N" };
const HUD_DIRECTION_LABELS = { N: "North", S: "South", E: "East", W: "West" };
let sun;
let hemi;

const userStartPosition = {
  x: nodesById.get("Gate_A1").position[0],
  y: nodesById.get("Gate_A1").position[1],
  z: nodesById.get("Gate_A1").position[2]
};

const COLORS = {
  floor: 0xd7dfe5,
  terminal: 0xe3e8ec,
  glass: 0x9fd0e2,
  entry: 0x9baab7,
  checkin: 0x72a8cf,
  security: 0xd99999,
  lounge: 0x9bd5b0,
  shopZone: 0xd5c483,
  restroom: 0x88bdd0,
  elevator: 0xb8acd7,
  escalator: 0xa9b9ca,
  baggage: 0xc5a679,
  gate: 0xb8afd8,
  gateMarker: 0x2f80ed,
  shopMarker: 0xf2c94c,
  securityMarker: 0xeb5757,
  loungeMarker: 0x27ae60,
  path: 0x00b894,
  pathDim: 0x7db9c8,
  routeFloor: 0xd8f2ee,
  node: 0xf7f9fb,
  textBoard: 0x142231
};

scene.add(pathGroup);

initLights();
buildAirport();
userMarker = createUserMarker();
scene.add(userMarker);
setUserMarkerPosition(userStartPosition);
applyPlayerHeading();
bindUi();
updateHud();
popup.hidden = true;
animate();

function initLights() {
  hemi = new THREE.HemisphereLight(0xffffff, 0xaeb7bf, 2.1);
  scene.add(hemi);

  sun = new THREE.DirectionalLight(0xffffff, 2.6);
  sun.position.set(4, 55, 35);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -90;
  sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  scene.add(sun);

  airportData.terminals.forEach((terminal) => {
    const light = new THREE.PointLight(0xf5fbff, 55, 38, 1.8);
    light.position.set(terminal.position[0], 7, terminal.position[2]);
    scene.add(light);
  });
}

function buildAirport() {
  const base = makeBox("Terminal level plan", [180, 0.08, 230], [0, -0.12, 28], 0xf8fafb, {
    roughness: 0.24,
    metalness: 0.18
  });
  base.receiveShadow = true;
  registerHover(base, "Terminal level plan");
  scene.add(base);

  buildZones();
  airportData.navigation_graph.edges.forEach(buildGraphEdge);
  airportData.shops.forEach(buildShop);
  airportData.gates.forEach(buildGate);
  airportData.navigation_graph.nodes.forEach(buildNavigationNode);
  buildLocationMarkers();
  buildJetBridges();
  buildApronStrip();
}

function buildZones() {
  if (!airportData.zones) return;
  airportData.zones.forEach((zone) => {
    if (!zone.polygon || zone.polygon.length < 3) return;
    const color = new THREE.Color(zone.color || 0xe8eef3);
    const floor = makeFloorPolygon(zone.name, zone.polygon, color.getHex(), 0.04, 0.78);
    floor.userData.zoneId = zone.id;
    scene.add(floor);
    // zone label sprite at centroid
    const cx = zone.polygon.reduce((s, p) => s + p[0], 0) / zone.polygon.length;
    const cz = zone.polygon.reduce((s, p) => s + p[1], 0) / zone.polygon.length;
    const label = makeTextPlane(zone.name.toUpperCase(), 14, 1.6, "rgba(255,255,255,0.96)", "#324050", 56);
    label.position.set(cx, 0.12, cz);
    label.rotation.x = -Math.PI / 2;
    scene.add(label);
  });
}

function buildApronStrip() {
  // Apron strip south of the gates where aircraft park.
  const apron = makeBox("Aircraft apron", [120, 0.05, 16], [0, 0.02, 70], 0xc9d3dc, {
    roughness: 0.6,
    metalness: 0.04
  });
  apron.receiveShadow = true;
  registerHover(apron, "Aircraft apron");
  scene.add(apron);
  [-5, -1, 1, 5].forEach((gx) => buildAircraftSilhouette([gx * 8, 0.04, 70], 0));
}

function buildApronPlan() {
  const serviceRoads = [
    [[-72, -66], [-46, -66], [-46, -64], [-72, -64]],
    [[-20, -68], [20, -68], [20, -66], [-20, -66]],
    [[46, -66], [72, -66], [72, -64], [46, -64]]
  ];
  serviceRoads.forEach((points) => scene.add(makeFloorPolygon("Landside service road", points, 0xa9b7c2, 0.02, 0.82)));

  const aircraftPositions = [
    [-68, 8, -0.4],
    [-72, 28, -0.7],
    [-75, 50, -0.95],
    [-42, 70, -0.15],
    [42, 70, 0.15],
    [75, 50, 0.95],
    [72, 28, 0.7],
    [68, 8, 0.4],
    [-22, 54, -0.5],
    [22, 54, 0.5]
  ];
  aircraftPositions.forEach(([x, z, rotation]) => buildAircraftSilhouette([x, 0.04, z], rotation));
}

function buildBombayT2Footprint() {
  const publicCirculation = 0xf2d755;
  const sterileCirculation = 0xffe777;

  scene.add(
    makeFloorPolygon(
      "T2 central processor footprint",
      [
        [-50, -62],
        [50, -62],
        [58, -18],
        [42, 8],
        [22, 26],
        [0, 34],
        [-22, 26],
        [-42, 8],
        [-58, -18]
      ],
      publicCirculation,
      0.05,
      0.92
    )
  );
  scene.add(makeFloorPolygon("West diagonal pier", [[-18, 8], [-31, 18], [-74, 60], [-68, 69], [-25, 34], [-4, 24]], publicCirculation, 0.06, 0.95));
  scene.add(makeFloorPolygon("East diagonal pier", [[18, 8], [31, 18], [74, 60], [68, 69], [25, 34], [4, 24]], publicCirculation, 0.06, 0.95));
  scene.add(makeFloorPolygon("Left satellite concourse", [[-78, 42], [-63, 32], [-38, 48], [-32, 68], [-52, 75], [-76, 65]], sterileCirculation, 0.07, 0.94));
  scene.add(makeFloorPolygon("Right satellite concourse", [[78, 42], [63, 32], [38, 48], [32, 68], [52, 75], [76, 65]], sterileCirculation, 0.07, 0.94));
  scene.add(makeFloorPolygon("Central arrival hall", [[-18, 8], [18, 8], [24, 24], [0, 34], [-24, 24]], 0xe9f6dc, 0.08, 0.92));

  buildJetBridges();
}

function buildTerminal(terminal) {
  terminal.zones.forEach((zone) => {
    const color = colorForZone(zone.type);
    const zoneBox = makeBox(zone.name, [zone.size[0], 0.14, zone.size[1]], [zone.position[0], 0.12, zone.position[2]], color, {
      transparent: true,
      opacity: 0.74,
      roughness: 0.34
    });
    zoneBox.receiveShadow = true;
    registerHover(zoneBox, zone.name);
    scene.add(zoneBox);
    buildZoneDetails(zone, terminal.id);
    buildSign(zone.name.replace(" Area", ""), [zone.position[0], 1.75, zone.position[2] - zone.size[1] / 2 + 0.3], 2.9);
  });
}

function buildZoneDetails(zone, terminalId) {
  if (zone.type === "checkin") {
    buildCounterRow(zone, `${terminalId} check-in counter`, 6);
  } else if (zone.type === "security") {
    buildSecurityLanes(zone);
  } else if (zone.type === "lounge") {
    buildChairRows(zone, `${terminalId} lounge seating`, 3, 5);
  } else if (zone.type === "shop_zone") {
    buildRetailShelves(zone);
    buildFoodCourtTables(zone);
  } else if (zone.type === "restroom") {
    buildWashroomDetail(zone);
  } else if (zone.type === "elevator") {
    buildElevators(zone);
  } else if (zone.type === "escalator") {
    buildEscalator(zone);
  } else if (zone.type === "baggage") {
    buildBaggageClaim(zone);
  } else if (zone.type === "entry") {
    buildEntryGates(zone);
  }
}

function buildGraphEdge(edge) {
  const from = nodesById.get(edge.from);
  const to = nodesById.get(edge.to);
  if (!from || !to) return;

  const group = makeCorridorSegment(from.position, to.position, 1.18, COLORS.routeFloor, 0.34);
  group.userData = { type: "edge", payload: edge, hoverName: `${from.label} to ${to.label} (${edge.weight})` };
  group.children.forEach((child) => {
    child.userData = group.userData;
    clickableObjects.push(child);
    hoverObjects.push(child);
  });
  scene.add(group);
}

function buildNavigationNode(node) {
  if (node.type === "gate" || node.type === "shop") return;

  const marker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 0.16, 28),
    new THREE.MeshStandardMaterial({ color: COLORS.node, emissive: 0x113344, emissiveIntensity: 0.12 })
  );
  marker.position.set(node.position[0], 0.42, node.position[2]);
  marker.userData = { type: "node", payload: node, hoverName: node.label };
  marker.castShadow = true;
  clickableObjects.push(marker);
  hoverObjects.push(marker);
  nodeMarkers.set(node.id, marker);
  scene.add(marker);
}

function buildShop(shop) {
  const group = new THREE.Group();
  group.position.set(shop.position[0], 0, shop.position[2]);
  group.userData = { type: "shop", payload: shop, hoverName: shop.name };

  const color = new THREE.Color(shop.visual_color);
  const body = makeBox(shop.name, [5.2, 2.05, 3.35], [0, 1.18, 0], color.getHex(), {
    roughness: 0.42,
    metalness: 0.06
  });
  const glass = makeBox(`${shop.name} glass front`, [4.6, 1.18, 0.1], [0, 1.18, -1.74], COLORS.glass, {
    transparent: true,
    opacity: 0.44,
    roughness: 0.08
  });
  const awning = makeBox(`${shop.name} brand awning`, [5.6, 0.34, 0.42], [0, 2.34, -1.82], 0x172433, { roughness: 0.36 });
  const sign = makeTextPlane(shop.name, 4.9, 0.78, "#172433", "#f8fbff", 82);
  sign.position.set(0, 2.58, -1.96);
  sign.rotation.x = -0.04;
  const category = makeTextPlane(shop.category.toUpperCase(), 2.8, 0.42, "#fff7d6", "#22313f", 62);
  category.position.set(0, 0.28, -1.98);
  category.rotation.x = -Math.PI / 2;

  body.castShadow = true;
  group.add(body, glass, awning, sign, category);
  scene.add(group);
  clickableObjects.push(body, glass, awning);
  registerHover(body, shop.name);
  registerHover(glass, shop.name);
  registerHover(awning, shop.name);
  nodeMarkers.set(shop.id, body);
}

function buildGate(gate) {
  const group = new THREE.Group();
  group.position.set(gate.position[0], 0, gate.position[2]);
  group.rotation.y = Math.atan2(gate.position[0], gate.position[2]) * 0.32;
  group.userData = { type: "gate", payload: gate, hoverName: `Gate ${gate.id}` };

  const bridge = makeBox(`Gate ${gate.id}`, [2.3, 1.4, 1.8], [0, 0.82, 0], COLORS.gate, {
    roughness: 0.44,
    metalness: 0.05
  });
  const counter = makeBox(`Gate ${gate.id} boarding counter`, [1.45, 0.68, 0.55], [-2.05, 0.44, -0.65], 0x8d9cad);
  const queue = makeBox(`Gate ${gate.id} queue rail`, [0.1, 0.42, 2.1], [-3, 0.34, 0.35], 0x81909b);
  const sign = makeTextPlane(`Gate ${gate.id}`, 1.8, 0.52, "#162333", "#ffffff");
  sign.position.set(0, 1.72, -0.94);

  group.add(bridge, counter, queue, sign);
  scene.add(group);
  clickableObjects.push(bridge, counter);
  registerHover(bridge, `Gate ${gate.id}`);
  registerHover(counter, `Gate ${gate.id} boarding counter`);
  nodeMarkers.set(gate.node_id, bridge);
}

function buildService(service) {
  const color = colorForZone(service.type);
  const mesh = new THREE.Mesh(
    service.type === "baggage" ? new THREE.TorusGeometry(1.4, 0.16, 12, 32) : new THREE.CylinderGeometry(0.7, 0.7, 1.1, 18),
    new THREE.MeshStandardMaterial({ color, roughness: 0.45 })
  );
  mesh.position.set(service.position[0], service.type === "baggage" ? 0.45 : 0.65, service.position[2]);
  mesh.rotation.x = service.type === "baggage" ? Math.PI / 2 : 0;
  mesh.userData = { type: "service", payload: service, hoverName: service.name };
  clickableObjects.push(mesh);
  hoverObjects.push(mesh);
  scene.add(mesh);
}

function buildLocationMarkers() {
  [...airportLocations.gates, ...airportLocations.shops, ...airportLocations.facilities].forEach(buildLocationMarker);
}

function buildLocationMarker(location) {
  const color = colorForLocation(location);
  const group = new THREE.Group();
  group.position.set(location.x, location.y + 0.08, location.z);
  group.userData = {
    type: "location",
    payload: location,
    hoverName: tooltipForLocation(location)
  };

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 1.12, 14),
    new THREE.MeshStandardMaterial({ color, roughness: 0.38 })
  );
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.56, 24, 24),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, roughness: 0.25 })
  );
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.78, 0.055, 10, 36),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72 })
  );

  stem.position.y = 0.72;
  dot.position.y = 1.42;
  halo.position.y = 0.2;
  halo.rotation.x = Math.PI / 2;
  stem.castShadow = true;
  dot.castShadow = true;
  group.add(stem, dot, halo);
  clickableObjects.push(group);
  hoverObjects.push(group, stem, dot, halo);
  nodeMarkers.set(location.nodeId, dot);
  scene.add(group);
}

function buildFlightScreens() {
  const screens = [
    { title: "Flights", rows: ["AI203 DEL B4 On Time", "UK551 GOI A5 Boarding"], position: [6, 2.1, -7] },
    { title: "Departures", rows: ["BA138 LHR B8 Scheduled", "SQ421 SIN B10 Check-in"], position: [40, 2.1, -7] },
    { title: "T1 Domestic", rows: ["6E224 A3 On Time", "QP118 A9 Security"], position: [-38, 2.1, -11] }
  ];
  screens.forEach((screen) => {
    const mesh = makeTextPlane(`${screen.title}\n${screen.rows.join("\n")}`, 5, 2.1, "#0f1c29", "#8ff0d2", 58);
    mesh.position.set(screen.position[0], screen.position[1], screen.position[2]);
    mesh.userData = { hoverName: `${screen.title} screen` };
    hoverObjects.push(mesh);
    scene.add(mesh);
  });
}

function buildCounterRow(zone, label, count) {
  const startX = zone.position[0] - zone.size[0] / 2 + 1.1;
  const spacing = (zone.size[0] - 2.2) / Math.max(1, count - 1);
  for (let i = 0; i < count; i += 1) {
    const x = startX + i * spacing;
    const counter = makeBox(label, [1.15, 0.72, 0.55], [x, 0.46, zone.position[2] - 1.25], 0x8d9cad);
    const monitor = makeBox("Check-in monitor", [0.46, 0.34, 0.08], [x, 0.96, zone.position[2] - 1.57], 0x223545);
    registerHover(counter, label);
    registerHover(monitor, "Check-in monitor");
    scene.add(counter, monitor);
  }
}

function buildSecurityLanes(zone) {
  for (let i = 0; i < 3; i += 1) {
    const x = zone.position[0] - 2.3 + i * 2.3;
    const divider = makeBox("Security lane divider", [0.1, 0.48, zone.size[1] - 1.2], [x, 0.38, zone.position[2]], 0xc47d7d);
    const scanner = makeBox("Security scanner", [1.15, 1.42, 0.38], [x + 0.82, 0.78, zone.position[2] + 1.9], 0x768995);
    registerHover(divider, "Security lane");
    registerHover(scanner, "Security scanner");
    scene.add(divider, scanner);
  }
}

function buildChairRows(zone, label, rows, seatsPerRow) {
  const startZ = zone.position[2] - zone.size[1] / 2 + 1.2;
  const startX = zone.position[0] - zone.size[0] / 2 + 1.1;
  for (let row = 0; row < rows; row += 1) {
    for (let seat = 0; seat < seatsPerRow; seat += 1) {
      const x = startX + seat * 1.85;
      const z = startZ + row * 2.1;
      const base = makeBox(label, [1.18, 0.32, 0.86], [x, 0.42, z], 0x52697b);
      const back = makeBox(`${label} back`, [1.18, 0.78, 0.14], [x, 0.82, z + 0.44], 0x405465);
      const armLeft = makeBox(`${label} arm`, [0.12, 0.48, 0.9], [x - 0.66, 0.6, z], 0x334554);
      const armRight = makeBox(`${label} arm`, [0.12, 0.48, 0.9], [x + 0.66, 0.6, z], 0x334554);
      registerHover(base, label);
      scene.add(base, back, armLeft, armRight);
    }
  }

  const table = makeBox(`${label} center charging table`, [3.6, 0.26, 1.2], [zone.position[0], 0.48, zone.position[2] + zone.size[1] / 2 - 1.2], 0xc9d7df);
  const chargingPost = makeBox("Charging post", [0.28, 1.05, 0.28], [zone.position[0], 0.9, zone.position[2] + zone.size[1] / 2 - 1.2], 0x223545);
  registerHover(table, `${label} charging table`);
  scene.add(table, chargingPost);
}

function buildRetailShelves(zone) {
  const shelfCount = Math.min(6, Math.max(3, Math.floor(zone.size[0] / 5)));
  for (let i = 0; i < shelfCount; i += 1) {
    const x = zone.position[0] - zone.size[0] / 2 + 2 + i * 3.2;
    const shelf = makeBox("Retail display gondola", [2.25, 1.05, 0.72], [x, 0.66, zone.position[2] - 1.8], 0xc3b178);
    const topper = makeBox("Retail category topper", [2.35, 0.18, 0.82], [x, 1.28, zone.position[2] - 1.8], 0x273746);
    registerHover(shelf, "Retail display shelf");
    scene.add(shelf, topper);
  }
}

function buildFoodCourtTables(zone) {
  for (let i = 0; i < 5; i += 1) {
    const x = zone.position[0] - zone.size[0] / 2 + 3 + i * 3.5;
    const z = zone.position[2] + 1.95;
    const table = makeBox("Food court dining table", [1.45, 0.2, 1.15], [x, 0.64, z], 0xded4ad);
    const post = makeBox("Food court table stand", [0.2, 0.6, 0.2], [x, 0.36, z], 0x8796a3);
    const chairA = makeBox("Food court chair", [0.55, 0.42, 0.55], [x - 1.05, 0.44, z], 0x52697b);
    const chairB = makeBox("Food court chair", [0.55, 0.42, 0.55], [x + 1.05, 0.44, z], 0x52697b);
    const chairC = makeBox("Food court chair", [0.55, 0.42, 0.55], [x, 0.44, z - 0.95], 0x52697b);
    const chairD = makeBox("Food court chair", [0.55, 0.42, 0.55], [x, 0.44, z + 0.95], 0x52697b);
    registerHover(table, "Food court dining table");
    scene.add(table, post, chairA, chairB, chairC, chairD);
  }
}

function buildWashroomDetail(zone) {
  const divider = makeBox("Restroom divider", [0.12, 0.86, zone.size[1] - 1], [zone.position[0], 0.55, zone.position[2]], 0x75aabc);
  const icon = makeTextPlane("RESTROOM", 2.2, 0.48, "#172433", "#ffffff");
  icon.position.set(zone.position[0], 1.3, zone.position[2] - 2.5);
  registerHover(divider, "Restrooms");
  scene.add(divider, icon);
}

function buildElevators(zone) {
  for (let i = 0; i < 2; i += 1) {
    const shaft = makeBox("Elevator", [0.82, 1.6, 0.8], [zone.position[0] - 0.55 + i * 1.1, 0.88, zone.position[2]], 0xa8a0c8);
    registerHover(shaft, "Elevator");
    scene.add(shaft);
  }
}

function buildEscalator(zone) {
  const escalator = makeBox("Escalator", [3.1, 0.35, 0.75], [zone.position[0], 0.5, zone.position[2]], 0x93a6b9);
  escalator.rotation.z = -0.2;
  registerHover(escalator, "Escalator");
  scene.add(escalator);
}

function buildBaggageClaim(zone) {
  const belt = new THREE.Mesh(
    new THREE.TorusGeometry(1.9, 0.16, 12, 40),
    new THREE.MeshStandardMaterial({ color: COLORS.baggage, roughness: 0.5 })
  );
  belt.position.set(zone.position[0], 0.44, zone.position[2]);
  belt.rotation.x = Math.PI / 2;
  registerHover(belt, "Baggage claim carousel");
  scene.add(belt);
}

function buildEntryGates(zone) {
  for (let i = 0; i < 3; i += 1) {
    const x = zone.position[0] - 2.2 + i * 2.2;
    const gate = makeBox("Entry gate", [0.84, 1.1, 0.32], [x, 0.66, zone.position[2]], 0x8799a8);
    registerHover(gate, "Entry gate");
    scene.add(gate);
  }
}

function createUserMarker() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.32, 0.86, 5, 12),
    new THREE.MeshStandardMaterial({ color: 0x1f8cff, emissive: 0x1f8cff, emissiveIntensity: 0.22, roughness: 0.42 })
  );
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.23, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xd8b18c, roughness: 0.7 })
  );
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.045, 10, 30), new THREE.MeshBasicMaterial({ color: 0x1f8cff }));
  const label = makeTextPlane("You", 1.15, 0.36, "#12314a", "#ffffff", 86);

  // Heading arrow: a flat triangle on the floor. The triangle mesh is laid flat
  // (rotation.x = -PI/2) so the tip points in -Z (north). userArrow is the
  // wrapper group; rotate IT around Y to face N/E/S/W.
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 1.2);
  arrowShape.lineTo(0.6, -0.4);
  arrowShape.lineTo(0, -0.1);
  arrowShape.lineTo(-0.6, -0.4);
  arrowShape.closePath();
  const arrowMesh = new THREE.Mesh(
    new THREE.ShapeGeometry(arrowShape),
    new THREE.MeshBasicMaterial({ color: 0xff7a1f, transparent: true, opacity: 0.92, side: THREE.DoubleSide })
  );
  arrowMesh.rotation.x = -Math.PI / 2;
  userArrow = new THREE.Group();
  userArrow.add(arrowMesh);
  userArrow.position.y = 0.06;

  body.position.y = 0.78;
  head.position.y = 1.38;
  ring.position.y = 0.05;
  ring.rotation.x = Math.PI / 2;
  label.position.set(0, 1.85, -0.04);
  group.add(body, head, ring, label, userArrow);
  group.userData.hoverName = "You";
  hoverObjects.push(body, head, ring, label);
  return group;
}

function applyPlayerHeading() {
  if (!userArrow) return;
  userArrow.rotation.y = HEADING_ROTATION_Y[playerHeading];
}

function turnLeft() {
  playerHeading = TURN_LEFT[playerHeading];
  applyPlayerHeading();
  updateHud(`Turned left, now facing ${HUD_DIRECTION_LABELS[playerHeading]}.`);
}

function turnRight() {
  playerHeading = TURN_RIGHT[playerHeading];
  applyPlayerHeading();
  updateHud(`Turned right, now facing ${HUD_DIRECTION_LABELS[playerHeading]}.`);
}

function stepForward() {
  if (stepAnimation) return; // already mid-step; ignore until done
  const nextId = cardinalNeighbours[currentNodeId]?.[playerHeading];
  if (!nextId) {
    updateHud(`Wall ahead. No corridor going ${HUD_DIRECTION_LABELS[playerHeading]} from ${labelForNode(currentNodeId)}.`);
    return;
  }
  const fromPos = nodesById.get(currentNodeId).position;
  const toPos = nodesById.get(nextId).position;
  stepAnimation = {
    startedAt: performance.now(),
    duration: 320,
    from: new THREE.Vector3(fromPos[0], 0, fromPos[2]),
    to: new THREE.Vector3(toPos[0], 0, toPos[2]),
    nextId
  };
}

function stepBackward() {
  // Quick 180 + step in one button.
  playerHeading = TURN_RIGHT[TURN_RIGHT[playerHeading]];
  applyPlayerHeading();
  stepForward();
}

function jumpToNode(nodeId, opts = {}) {
  if (!nodesById.has(nodeId)) return;
  currentNodeId = nodeId;
  setUserMarkerToNode(nodeId);
  if (opts.heading) playerHeading = opts.heading;
  applyPlayerHeading();
  updateHud(opts.message);
}

function setUserMarkerPosition(position) {
  if (!userMarker) return;
  userMarker.position.set(position.x, position.y, position.z);
}

function setUserMarkerToNode(nodeId) {
  if (!userMarker || !nodesById.has(nodeId)) return;
  const position = nodesById.get(nodeId).position;
  userMarker.position.set(position[0], 0, position[2]);
}

function routeTo(startId, endId, sourceText = "Navigation request", animatePassenger = false) {
  if (startId === endId) {
    activePathIds = [startId];
    pathGroup.clear();
    pathDots = [];
    routeAnimation = null;
    highlightPathNodes(activePathIds);
    showRouteSummary(activePathIds, `${sourceText}: already at ${labelForNode(endId)}.`);
    return;
  }

  const pathIds = dijkstra(graph, startId, endId);
  if (pathIds.length < 2) {
    showRouteSummary([], `${sourceText}: no connected route from ${labelForNode(startId)} to ${labelForNode(endId)}.`);
    return;
  }

  activePathIds = pathIds;
  currentNodeId = startId;
  setUserMarkerToNode(startId);
  buildActivePath(pathIds);
  routeAnimation = animatePassenger
    ? {
        curve: activeCurve,
        startedAt: performance.now(),
        duration: Math.max(5200, totalWeight(pathIds) * 170)
      }
    : null;
  highlightPathNodes(pathIds);
  smoothCameraTo(camera.position.clone(), centerOfPath(pathIds), 900);
  showRouteSummary(pathIds, `${sourceText}: ${labelForNode(startId)} to ${labelForNode(endId)}. Distance weight ${totalWeight(pathIds)}.`);
}

function dijkstra(weightedGraph, start, end) {
  const distances = {};
  const parent = {};
  const visited = new Set();
  Object.keys(weightedGraph).forEach((node) => {
    distances[node] = Number.POSITIVE_INFINITY;
  });
  distances[start] = 0;

  while (visited.size < Object.keys(weightedGraph).length) {
    let node = null;
    let best = Number.POSITIVE_INFINITY;
    Object.keys(weightedGraph).forEach((candidate) => {
      if (!visited.has(candidate) && distances[candidate] < best) {
        best = distances[candidate];
        node = candidate;
      }
    });
    if (!node || node === end) break;
    visited.add(node);

    Object.entries(weightedGraph[node]).forEach(([neighbor, weight]) => {
      const candidateDistance = distances[node] + weight;
      if (candidateDistance < distances[neighbor]) {
        distances[neighbor] = candidateDistance;
        parent[neighbor] = node;
      }
    });
  }

  if (start !== end && !parent[end]) return [];
  const path = [end];
  let cursor = end;
  while (cursor !== start) {
    cursor = parent[cursor];
    if (!cursor) return [];
    path.push(cursor);
  }
  return path.reverse();
}

function buildActivePath(pathIds) {
  pathGroup.clear();
  pathDots = [];
  activeCurve = makeCurveFromNodeIds(pathIds);
  const points = activeCurve.getPoints(Math.max(18, pathIds.length * 22));

  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(activeCurve, Math.max(34, pathIds.length * 22), 0.48, 16, false),
    new THREE.MeshBasicMaterial({ color: COLORS.path, transparent: true, opacity: 0.78 })
  );
  const glow = new THREE.Mesh(
    new THREE.TubeGeometry(activeCurve, Math.max(34, pathIds.length * 22), 0.9, 16, false),
    new THREE.MeshBasicMaterial({ color: COLORS.path, transparent: true, opacity: 0.18, depthWrite: false })
  );
  pathGroup.add(glow);
  pathGroup.add(tube);

  points.filter((_, index) => index % 3 === 0).forEach((point, index) => {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 14, 14),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.82 })
    );
    dot.position.copy(point);
    dot.position.y = 0.82;
    dot.userData.phase = index;
    pathDots.push(dot);
    pathGroup.add(dot);
  });
}

function makeCurveFromNodeIds(pathIds) {
  const points = pathIds.map((id) => toVec3(nodesById.get(id).position, 0.62));
  return new THREE.CatmullRomCurve3(points, false, "centripetal", 0.02);
}

function bindUi() {
  window.addEventListener("resize", onResize);
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerleave", () => {
    hoverTooltip.hidden = true;
  });
  document.querySelector("#closePopup")?.addEventListener("click", () => {
    popup.hidden = true;
  });
  window.addEventListener("keydown", onKeyDown);
}

function onKeyDown(event) {
  // Ignore when the user is typing in a field.
  const tag = event.target?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || event.target?.isContentEditable) return;

  switch (event.key) {
    case "ArrowUp":
    case "w":
    case "W":
      stepForward();
      event.preventDefault();
      break;
    case "ArrowLeft":
    case "a":
    case "A":
      turnLeft();
      event.preventDefault();
      break;
    case "ArrowRight":
    case "d":
    case "D":
      turnRight();
      event.preventDefault();
      break;
    case "ArrowDown":
    case "s":
    case "S":
      stepBackward();
      event.preventDefault();
      break;
    case "Escape":
      popup.hidden = true;
      break;
    default:
      break;
  }
}

function onPointerDown(event) {
  updatePointer(event);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(clickableObjects, true)[0];
  if (!hit) return;

  const target = findInteractiveParent(hit.object);
  const { type, payload } = target.userData;
  if (type === "location") {
    showLocation(payload);
  } else if (type === "shop") {
    showShop(payload);
  } else if (type === "gate") {
    showGate(payload);
  } else if (type === "node") {
    showNode(payload);
  } else if (type === "edge") {
    showEdge(payload);
  } else if (type === "service") {
    showService(payload);
  }
}

function onPointerMove(event) {
  updatePointer(event);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(hoverObjects, true)[0];
  const hoverName = hit ? findHoverName(hit.object) : null;
  if (!hoverName) {
    hoverTooltip.hidden = true;
    return;
  }
  hoverTooltip.textContent = hoverName;
  hoverTooltip.style.left = `${event.clientX}px`;
  hoverTooltip.style.top = `${event.clientY}px`;
  hoverTooltip.hidden = false;
}

function updatePointer(event) {
  const bounds = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
}

function findInteractiveParent(object) {
  let current = object;
  while (current && !current.userData.type) {
    current = current.parent;
  }
  return current || object;
}

function findHoverName(object) {
  let current = object;
  while (current && !current.userData.hoverName) {
    current = current.parent;
  }
  return current?.userData.hoverName;
}

function showLocation(location) {
  const shop = airportData.shops.find((item) => item.id === location.nodeId);
  if (shop) {
    showShop(shop);
    return;
  }
  const gate = airportData.gates.find((item) => item.node_id === location.nodeId);
  if (gate) {
    showGate(gate);
    return;
  }

  if (location.nodeId && nodesById.has(location.nodeId)) {
    routeTo(currentNodeId, location.nodeId, `Selected ${location.id}`, true);
  }

  popup.hidden = false;
  popupContent.innerHTML = `
    <h2>${location.id}</h2>
    <dl>
      <dt>Category</dt><dd>${location.category}</dd>
      <dt>Type</dt><dd>${location.type || location.category}</dd>
      <dt>Terminal</dt><dd>${location.terminal}</dd>
      <dt>Coordinates</dt><dd>x ${location.x}, y ${location.y}, z ${location.z}</dd>
    </dl>
  `;
}

function showShop(shop) {
  routeTo(currentNodeId, shop.id, `Selected ${shop.name}`, true);
  popup.hidden = false;
  popupContent.innerHTML = `
    <h2>${shop.name}</h2>
    <dl>
      <dt>ID</dt><dd>${shop.id}</dd>
      <dt>Category</dt><dd>${shop.category}</dd>
      <dt>Tag</dt><dd>${shop.tag}</dd>
      <dt>Terminal</dt><dd>${shop.terminal}</dd>
      <dt>Position</dt><dd>[${shop.position.join(", ")}]</dd>
      <dt>Offer</dt><dd>${shop.offers}</dd>
      <dt>Rating</dt><dd>${shop.rating}</dd>
      <dt>Wait</dt><dd>${shop.wait_time}</dd>
    </dl>
  `;
}

function showGate(gate) {
  routeTo(currentNodeId, gate.node_id, `Selected Gate ${gate.id}`, true);
  popup.hidden = false;
  popupContent.innerHTML = `
    <h2>Gate ${gate.id}</h2>
    <dl>
      <dt>Node</dt><dd>${gate.node_id}</dd>
      <dt>Terminal</dt><dd>${gate.terminal}</dd>
      <dt>Position</dt><dd>[${gate.position.join(", ")}]</dd>
      <dt>Flight info</dt><dd>${gate.flight_info}</dd>
    </dl>
  `;
}

function showNode(node) {
  routeTo(currentNodeId, node.id, `Selected ${node.label}`, true);
  popup.hidden = false;
  popupContent.innerHTML = `
    <h2>${node.label}</h2>
    <dl>
      <dt>Node</dt><dd>${node.id}</dd>
      <dt>Type</dt><dd>${node.type}</dd>
      <dt>Terminal</dt><dd>${node.terminal}</dd>
      <dt>Position</dt><dd>[${node.position.join(", ")}]</dd>
    </dl>
  `;
}

function showEdge(edge) {
  popup.hidden = false;
  popupContent.innerHTML = `
    <h2>Walkable Edge</h2>
    <dl>
      <dt>From</dt><dd>${labelForNode(edge.from)}</dd>
      <dt>To</dt><dd>${labelForNode(edge.to)}</dd>
      <dt>Weight</dt><dd>${edge.weight}</dd>
      <dt>Two-way</dt><dd>${edge.bidirectional ? "Yes" : "No"}</dd>
    </dl>
  `;
}

function showService(service) {
  const nodeId = airportData.navigation_graph.nodes.find((node) => sameXZ(node.position, service.position))?.id;
  if (nodeId && nodesById.has(nodeId)) {
    routeTo(currentNodeId, nodeId, `Selected ${service.name}`, true);
  }
  popup.hidden = false;
  popupContent.innerHTML = `
    <h2>${service.name}</h2>
    <dl>
      <dt>ID</dt><dd>${service.id}</dd>
      <dt>Type</dt><dd>${service.type}</dd>
      <dt>Terminal</dt><dd>${service.terminal}</dd>
      <dt>Position</dt><dd>[${service.position.join(", ")}]</dd>
    </dl>
  `;
}

function resetView() {
  currentNodeId = airportData.navigation_graph.start_node;
  playerHeading = "N";
  stepAnimation = null;
  pathGroup.clear();
  pathDots = [];
  setUserMarkerPosition(userStartPosition);
  applyPlayerHeading();
  smoothCameraTo(new THREE.Vector3(0, 118, 92), new THREE.Vector3(0, 0, 0), 650);
  updateHud("Reset to Gate A1.");
  popup.hidden = true;
}

function setCameraMode(mode) {
  if (mode === "top") {
    smoothCameraTo(new THREE.Vector3(0, 145, 0.2), new THREE.Vector3(0, 0, 4), 800);
  } else {
    smoothCameraTo(new THREE.Vector3(0, 118, 92), new THREE.Vector3(0, 0, 0), 800);
  }
}

function smoothCameraTo(position, target, duration) {
  cameraTween = {
    startTime: performance.now(),
    duration,
    startPosition: camera.position.clone(),
    endPosition: position.clone(),
    startTarget: controls.target.clone(),
    endTarget: target.clone()
  };
}

function toggleDayNight() {
  isNight = !isNight;
  scene.background = new THREE.Color(isNight ? 0x101923 : 0xe3edf2);
  scene.fog.color = new THREE.Color(isNight ? 0x101923 : 0xe3edf2);
  hemi.intensity = isNight ? 0.7 : 2.1;
  sun.intensity = isNight ? 0.55 : 2.6;
  renderer.toneMappingExposure = isNight ? 0.82 : 1.1;
}

function exportGlb() {
  const exporter = new GLTFExporter();
  exporter.parse(
    scene,
    (result) => {
      const blob = result instanceof ArrayBuffer ? new Blob([result], { type: "model/gltf-binary" }) : new Blob([JSON.stringify(result)], { type: "model/gltf+json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "csmia-inspired-airport-navigation.glb";
      link.click();
      URL.revokeObjectURL(link.href);
      showRouteSummary(activePathIds, "Export complete: generated scene serialized as GLB-compatible model.");
    },
    (error) => {
      showRouteSummary(activePathIds, `Export failed: ${error.message}`);
    },
    { binary: true, trs: false, onlyVisible: true }
  );
}

function animate() {
  requestAnimationFrame(animate);
  const time = performance.now();
  updateRoutePassenger(time);
  updatePlayerStep(time);
  updatePathDots(time);
  updateCameraTween(time);
  controls.update();
  renderer.render(scene, camera);
}

function updatePlayerStep(time) {
  if (!stepAnimation) return;
  const t = Math.min((time - stepAnimation.startedAt) / stepAnimation.duration, 1);
  const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const x = stepAnimation.from.x + (stepAnimation.to.x - stepAnimation.from.x) * eased;
  const z = stepAnimation.from.z + (stepAnimation.to.z - stepAnimation.from.z) * eased;
  userMarker.position.set(x, 0, z);
  if (t >= 1) {
    currentNodeId = stepAnimation.nextId;
    stepAnimation = null;
    updateHud(`Arrived at ${labelForNode(currentNodeId)}.`);
    maybeShowOnArrival();
  }
}

function maybeShowOnArrival() {
  // Surface useful info when the player walks into a shop/gate node.
  const shop = airportData.shops.find((s) => s.node_id === currentNodeId);
  if (shop) {
    showShopInfo(shop);
    return;
  }
  const gate = airportData.gates.find((g) => g.node_id === currentNodeId);
  if (gate) {
    showGateInfo(gate);
  }
}

function showShopInfo(shop) {
  popup.hidden = false;
  popupContent.innerHTML = `
    <h2>${shop.name}</h2>
    <p>${shop.offers}</p>
    <dl>
      <dt>Category</dt><dd>${shop.category}</dd>
      <dt>Rating</dt><dd>${shop.rating}</dd>
      <dt>Wait</dt><dd>${shop.wait_time}</dd>
      <dt>Hours</dt><dd>${shop.open_hours}</dd>
    </dl>
  `;
}

function showGateInfo(gate) {
  popup.hidden = false;
  popupContent.innerHTML = `
    <h2>Gate ${gate.id}</h2>
    <p>${gate.flight_info}</p>
  `;
}

function updateHud(message) {
  let hud = document.querySelector("#hud");
  if (!hud) {
    hud = document.createElement("div");
    hud.id = "hud";
    document.body.appendChild(hud);
  }
  const node = nodesById.get(currentNodeId);
  const exits = cardinalNeighbours[currentNodeId] || {};
  const exitChips = ["N", "E", "S", "W"]
    .map((dir) => {
      const target = exits[dir];
      const isFacing = dir === playerHeading;
      const cls = `chip ${target ? "open" : "wall"} ${isFacing ? "facing" : ""}`.trim();
      const label = target ? labelForNode(target) : "wall";
      return `<span class="${cls}"><b>${dir}</b> ${label}</span>`;
    })
    .join("");
  hud.innerHTML = `
    <div class="hud-row hud-title">${node?.label || currentNodeId}</div>
    <div class="hud-row hud-meta">Facing: ${HUD_DIRECTION_LABELS[playerHeading]}</div>
    <div class="hud-row hud-exits">${exitChips}</div>
    ${message ? `<div class="hud-row hud-msg">${message}</div>` : ""}
    <div class="hud-row hud-help">↑ forward &nbsp; ← left &nbsp; → right &nbsp; ↓ back</div>
  `;
}

function updateRoutePassenger(time) {
  if (!routeAnimation) return;
  const t = Math.min((time - routeAnimation.startedAt) / routeAnimation.duration, 1);
  const eased = 1 - Math.pow(1 - t, 3);
  const position = routeAnimation.curve.getPointAt(eased);
  userMarker.position.set(position.x, 0, position.z);
  if (t >= 1) {
    routeAnimation = null;
    currentNodeId = activePathIds.at(-1);
    showRouteSummary(activePathIds, `Arrived at ${labelForNode(currentNodeId)}.`);
  }
}

function updatePathDots(time) {
  pathDots.forEach((dot) => {
    const pulse = (Math.sin(time * 0.006 - dot.userData.phase * 0.55) + 1) / 2;
    dot.scale.setScalar(0.8 + pulse * 0.65);
    dot.material.opacity = 0.36 + pulse * 0.58;
  });
}

function updateCameraTween(time) {
  if (!cameraTween) return;
  const t = Math.min((time - cameraTween.startTime) / cameraTween.duration, 1);
  const eased = 1 - Math.pow(1 - t, 3);
  camera.position.lerpVectors(cameraTween.startPosition, cameraTween.endPosition, eased);
  controls.target.lerpVectors(cameraTween.startTarget, cameraTween.endTarget, eased);
  if (t >= 1) cameraTween = null;
}

function highlightPathNodes(pathIds) {
  nodeMarkers.forEach((marker, id) => {
    if (marker.material) {
      marker.material.emissive = marker.material.emissive || new THREE.Color(0x000000);
      marker.material.emissive.set(pathIds.includes(id) ? COLORS.path : 0x000000);
      marker.material.emissiveIntensity = pathIds.includes(id) ? 0.58 : 0.08;
    }
  });
  setUserMarkerToNode(pathIds[0]);
}

function centerOfPath(pathIds) {
  const center = new THREE.Vector3();
  pathIds.forEach((id) => {
    center.add(toVec3(nodesById.get(id).position, 0));
  });
  center.divideScalar(pathIds.length);
  return center;
}

function totalWeight(pathIds) {
  let total = 0;
  for (let i = 0; i < pathIds.length - 1; i += 1) {
    total += graph[pathIds[i]][pathIds[i + 1]];
  }
  return total;
}

function labelForNode(id) {
  return nodesById.get(id)?.label || id.replaceAll("_", " ");
}

function showRouteSummary(pathIds, message) {
  popup.hidden = false;
  const steps = pathIds
    .map((id, index) => {
      if (index === 0) return `<li>Start at ${labelForNode(id)}</li>`;
      const previous = pathIds[index - 1];
      return `<li>Go to ${labelForNode(id)} (${graph[previous]?.[id] ?? 0} units)</li>`;
    })
    .join("");

  popupContent.innerHTML = `
    <h2>Route</h2>
    <p>${message}</p>
    ${steps ? `<ol>${steps}</ol>` : ""}
  `;
}

function makeBox(name, size, position, color, options = {}) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.58,
    metalness: options.metalness ?? 0.04,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
  mesh.name = name;
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true;
  return mesh;
}

function makeCorridorSegment(from, to, width, color, opacity) {
  const start = new THREE.Vector3(from[0], 0.13, from[2]);
  const end = new THREE.Vector3(to[0], 0.13, to[2]);
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const length = start.distanceTo(end);
  const angle = Math.atan2(end.x - start.x, end.z - start.z);
  const group = new THREE.Group();

  const floor = makeBox("Walkable route corridor", [width, 0.055, length], [midpoint.x, 0.15, midpoint.z], color, {
    transparent: true,
    opacity,
    roughness: 0.38
  });
  const centerLine = makeBox("Route centerline", [0.16, 0.07, length], [midpoint.x, 0.2, midpoint.z], COLORS.pathDim, {
    transparent: true,
    opacity: 0.72,
    roughness: 0.3
  });
  floor.rotation.y = angle;
  centerLine.rotation.y = angle;
  floor.receiveShadow = true;
  group.add(floor, centerLine);
  return group;
}

function makeFloorPolygon(name, points, color, y = 0.04, opacity = 1) {
  const group = new THREE.Group();
  const shape = new THREE.Shape();
  points.forEach(([x, z], index) => {
    if (index === 0) {
      shape.moveTo(x, -z);
    } else {
      shape.lineTo(x, -z);
    }
  });
  shape.closePath();

  const mesh = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.42,
      metalness: 0.02,
      transparent: opacity < 1,
      opacity,
      side: THREE.DoubleSide
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.receiveShadow = true;
  registerHover(mesh, name);

  const outlinePoints = points.map(([x, z]) => new THREE.Vector3(x, y + 0.03, z));
  outlinePoints.push(outlinePoints[0].clone());
  const outline = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(outlinePoints),
    new THREE.LineBasicMaterial({ color: 0x51616d, transparent: true, opacity: 0.5 })
  );
  group.add(mesh, outline);
  return group;
}

function buildJetBridges() {
  // In the new grid layout every gate column heads south, so all jet bridges
  // extend in the +Z direction (south) by a fixed length.
  airportData.gates.forEach((gate) => {
    const [x, , z] = gate.position;
    const bridgeLength = 6;
    const bridge = makeBox(`Jet bridge ${gate.id}`, [0.55, 0.36, bridgeLength], [x, 0.4, z + 4], 0xf2d755, {
      roughness: 0.48
    });
    const rotunda = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.8, 0.18, 24),
      new THREE.MeshStandardMaterial({ color: 0xb8c5cf, roughness: 0.42 })
    );
    rotunda.position.set(x, 0.36, z + 7);
    rotunda.castShadow = true;
    registerHover(bridge, `Jet bridge ${gate.id}`);
    registerHover(rotunda, `Gate ${gate.id} aircraft stand`);
    scene.add(bridge, rotunda);
  });
}

function buildAircraftSilhouette(position, rotation) {
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  group.rotation.y = rotation;

  const material = new THREE.LineBasicMaterial({ color: 0xaab4bd, transparent: true, opacity: 0.42 });
  const parts = [
    [
      [0, -5.5],
      [1.1, -3],
      [1.3, 2.8],
      [0.45, 5.8],
      [-0.45, 5.8],
      [-1.3, 2.8],
      [-1.1, -3],
      [0, -5.5]
    ],
    [
      [-7, 0],
      [7, 0]
    ],
    [
      [-3.2, -4.1],
      [3.2, -4.1]
    ]
  ];

  parts.forEach((part) => {
    const geometry = new THREE.BufferGeometry().setFromPoints(part.map(([x, z]) => new THREE.Vector3(x, 0, z)));
    group.add(new THREE.Line(geometry, material));
  });
  scene.add(group);
}

function colorForZone(type) {
  if (type === "entry") return COLORS.entry;
  if (type === "checkin") return COLORS.checkin;
  if (type === "security") return COLORS.security;
  if (type === "lounge") return COLORS.lounge;
  if (type === "shop_zone") return COLORS.shopZone;
  if (type === "restroom") return COLORS.restroom;
  if (type === "elevator") return COLORS.elevator;
  if (type === "escalator") return COLORS.escalator;
  if (type === "baggage") return COLORS.baggage;
  if (type === "gate_zone" || type === "gate") return COLORS.gate;
  if (type === "shop") return COLORS.shopZone;
  return 0xaec3d6;
}

function colorForLocation(location) {
  if (location.category === "gate") return COLORS.gateMarker;
  if (location.category === "shop") return COLORS.shopMarker;
  if (location.type === "security" || location.type === "immigration") return COLORS.securityMarker;
  if (location.type === "lounge") return COLORS.loungeMarker;
  return 0xffffff;
}

function tooltipForLocation(location) {
  const descriptor = location.type || location.category;
  const formattedType = descriptor
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return `${location.id} (${formattedType})`;
}

function sameXZ(a, b) {
  return Math.abs(a[0] - b[0]) < 0.01 && Math.abs(a[2] - b[2]) < 0.01;
}

function registerHover(object, name) {
  object.userData.hoverName = name;
  hoverObjects.push(object);
}

function buildSign(text, position, width) {
  const sign = makeTextPlane(text, width, 0.55, "#132232", "#ffffff", 62);
  sign.position.set(position[0], position[1], position[2]);
  sign.userData.hoverName = text;
  hoverObjects.push(sign);
  scene.add(sign);
}

function makeTextPlane(text, width, height, background, foreground, fontSize = 70) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = foreground;
  context.font = `700 ${fontSize}px Inter, Arial, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";

  const lines = text.split("\n");
  lines.forEach((line, index) => {
    const y = canvas.height / 2 + (index - (lines.length - 1) / 2) * (fontSize * 1.35);
    context.fillText(line, canvas.width / 2, y, canvas.width - 60);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
  );
  return mesh;
}

function toVec3(coord, yOverride) {
  return new THREE.Vector3(coord[0], yOverride ?? coord[1], coord[2]);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
