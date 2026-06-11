export const NAV_BOUNDS = {
  minX: -170,
  maxX: 190,
  minZ: -36,
  maxZ: 105
}

const GRID_SIZE = 2.5
const CLEARANCE = 1.15
const LINE_SAMPLE_STEP = GRID_SIZE / 2

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const pointKey = (ix, iz) => `${ix},${iz}`
const roundToGrid = (value) => Math.round(value / GRID_SIZE) * GRID_SIZE
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)

function makeRect(id, position, size, padding = CLEARANCE) {
  const [x, , z] = position
  const [w, , d] = size
  return {
    id,
    minX: x - w / 2 - padding,
    maxX: x + w / 2 + padding,
    minZ: z - d / 2 - padding,
    maxZ: z + d / 2 + padding
  }
}

function pointInsideRect(point, rect) {
  return (
    point.x >= rect.minX &&
    point.x <= rect.maxX &&
    point.z >= rect.minZ &&
    point.z <= rect.maxZ
  )
}

function normalizePoint(position) {
  return {
    x: position[0],
    z: position[2]
  }
}

function toWaypoint(point, index, label) {
  return {
    id: `route-${index}`,
    label,
    position: [point.x, 0, point.z]
  }
}

export function buildNavigationObstacles({
  shops,
  dutyFree,
  restrooms,
  kiosks,
  landsideAmenities,
  checkInRows,
  security,
  seating,
  escalators
}) {
  const shopRects = [...shops, ...dutyFree, ...restrooms]
    .filter((item) => item.size)
    .map((item) => makeRect(item.id, item.position, item.size))

  const kioskRects = [...kiosks, ...landsideAmenities.filter((item) => item.kind === 'kiosk')]
    .map((item) => makeRect(item.id, item.position, [2.4, 1, 2.4]))

  const serviceRects = landsideAmenities
    .filter((item) => item.size)
    .map((item) => makeRect(item.id, item.position, item.size))

  const checkInRects = checkInRows.map((row) =>
    makeRect(row.id, row.position, [row.length, 1, 5.6])
  )

  const securityRects = security.map((station) => {
    const width = station.lanes * (1.8 + 0.3) + 1.2
    return makeRect(station.id, station.position, [width, 1, 9.4])
  })

  const seatingRects = seating.map((cluster) => {
    const width = cluster.cols * (0.55 + 0.6) + 0.6
    const depth = cluster.rows * 1.2 + 1.1
    const size = cluster.orientation === 'z' ? [depth, 1, width] : [width, 1, depth]
    return makeRect(cluster.id, cluster.position, size, 0.75)
  })

  const escalatorRects = escalators.map((item) => {
    const alongX = Math.abs(Math.sin(item.rotation)) > 0.5
    const size = alongX ? [item.length + 1, 1, 2.4] : [2.4, 1, item.length + 1]
    return makeRect(item.id, item.position, size, 0.75)
  })

  return [
    ...shopRects,
    ...kioskRects,
    ...serviceRects,
    ...checkInRects,
    ...securityRects,
    ...seatingRects,
    ...escalatorRects
  ]
}

export function isInsideBounds(position, bounds = NAV_BOUNDS) {
  const point = Array.isArray(position) ? normalizePoint(position) : position
  return (
    point.x >= bounds.minX &&
    point.x <= bounds.maxX &&
    point.z >= bounds.minZ &&
    point.z <= bounds.maxZ
  )
}

export function isWalkablePoint(point, obstacles, bounds = NAV_BOUNDS) {
  if (!isInsideBounds(point, bounds)) return false
  return !obstacles.some((rect) => pointInsideRect(point, rect))
}

export function isWalkablePosition(position, obstacles, bounds = NAV_BOUNDS) {
  return isWalkablePoint(normalizePoint(position), obstacles, bounds)
}

export function canMoveBetween(fromPosition, toPosition, obstacles, bounds = NAV_BOUNDS) {
  const from = normalizePoint(fromPosition)
  const to = normalizePoint(toPosition)
  const length = distance(from, to)
  const steps = Math.max(1, Math.ceil(length / LINE_SAMPLE_STEP))

  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const point = {
      x: from.x + (to.x - from.x) * t,
      z: from.z + (to.z - from.z) * t
    }
    if (!isWalkablePoint(point, obstacles, bounds)) return false
  }

  return true
}

function nearestWalkable(point, obstacles, bounds) {
  const start = {
    x: clamp(roundToGrid(point.x), bounds.minX, bounds.maxX),
    z: clamp(roundToGrid(point.z), bounds.minZ, bounds.maxZ)
  }

  if (isWalkablePoint(start, obstacles, bounds)) return start

  for (let radius = 1; radius <= 18; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue
        const candidate = {
          x: clamp(start.x + dx * GRID_SIZE, bounds.minX, bounds.maxX),
          z: clamp(start.z + dz * GRID_SIZE, bounds.minZ, bounds.maxZ)
        }
        if (isWalkablePoint(candidate, obstacles, bounds)) return candidate
      }
    }
  }

  return start
}

function reconstructPath(cameFrom, current) {
  const path = [current]
  let cursor = current
  while (cameFrom.has(pointKey(cursor.ix, cursor.iz))) {
    cursor = cameFrom.get(pointKey(cursor.ix, cursor.iz))
    path.push(cursor)
  }
  return path.reverse().map((node) => ({ x: node.x, z: node.z }))
}

function simplifyPath(path, obstacles, bounds) {
  if (path.length <= 2) return path

  const simplified = [path[0]]
  let anchorIndex = 0

  while (anchorIndex < path.length - 1) {
    let nextIndex = path.length - 1
    while (
      nextIndex > anchorIndex + 1 &&
      !canMoveBetween(
        [path[anchorIndex].x, 0, path[anchorIndex].z],
        [path[nextIndex].x, 0, path[nextIndex].z],
        obstacles,
        bounds
      )
    ) {
      nextIndex--
    }
    simplified.push(path[nextIndex])
    anchorIndex = nextIndex
  }

  return simplified
}

export function findShortestRoute(fromPosition, toPosition, obstacles, bounds = NAV_BOUNDS) {
  const rawStart = normalizePoint(fromPosition)
  const rawGoal = normalizePoint(toPosition)
  const start = nearestWalkable(rawStart, obstacles, bounds)
  const goal = nearestWalkable(rawGoal, obstacles, bounds)

  const startNode = {
    ...start,
    ix: Math.round(start.x / GRID_SIZE),
    iz: Math.round(start.z / GRID_SIZE)
  }
  const goalNode = {
    ...goal,
    ix: Math.round(goal.x / GRID_SIZE),
    iz: Math.round(goal.z / GRID_SIZE)
  }

  const open = [startNode]
  const cameFrom = new Map()
  const gScore = new Map([[pointKey(startNode.ix, startNode.iz), 0]])
  const fScore = new Map([[pointKey(startNode.ix, startNode.iz), distance(startNode, goalNode)]])
  const closed = new Set()
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1]
  ]

  while (open.length) {
    open.sort((a, b) => fScore.get(pointKey(a.ix, a.iz)) - fScore.get(pointKey(b.ix, b.iz)))
    const current = open.shift()
    const currentKey = pointKey(current.ix, current.iz)

    if (current.ix === goalNode.ix && current.iz === goalNode.iz) {
      const path = simplifyPath(reconstructPath(cameFrom, current), obstacles, bounds)
      return [
        toWaypoint(rawStart, 0, 'You'),
        ...path.slice(1, -1).map((point, index) => toWaypoint(point, index + 1)),
        toWaypoint(rawGoal, path.length, 'Destination')
      ]
    }

    closed.add(currentKey)

    for (const [dx, dz] of directions) {
      const neighbor = {
        x: current.x + dx * GRID_SIZE,
        z: current.z + dz * GRID_SIZE,
        ix: current.ix + dx,
        iz: current.iz + dz
      }
      const neighborKey = pointKey(neighbor.ix, neighbor.iz)
      if (closed.has(neighborKey)) continue
      if (!canMoveBetween([current.x, 0, current.z], [neighbor.x, 0, neighbor.z], obstacles, bounds)) {
        continue
      }

      const tentativeG = gScore.get(currentKey) + distance(current, neighbor)
      if (tentativeG >= (gScore.get(neighborKey) ?? Infinity)) continue

      cameFrom.set(neighborKey, current)
      gScore.set(neighborKey, tentativeG)
      fScore.set(neighborKey, tentativeG + distance(neighbor, goalNode))
      if (!open.some((node) => node.ix === neighbor.ix && node.iz === neighbor.iz)) {
        open.push(neighbor)
      }
    }
  }

  return [
    toWaypoint(rawStart, 0, 'You'),
    toWaypoint(rawGoal, 1, 'Destination')
  ]
}

export function routeDistance(waypoints) {
  return waypoints.slice(1).reduce((total, point, index) => {
    const previous = waypoints[index]
    return total + Math.hypot(
      point.position[0] - previous.position[0],
      point.position[2] - previous.position[2]
    )
  }, 0)
}
