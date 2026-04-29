import { GRID_CELL_SIZE } from './config.js';

let buildings = [];
let grid = null;
let gridOriginX = 0, gridOriginZ = 0;
let gridCols = 0, gridRows = 0;

export function buildGrid(inputAabbs) {
  buildings = inputAabbs; // each entry has { minX, maxX, minZ, maxZ, polygon }

  if (buildings.length === 0) return;

  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const b of buildings) {
    if (b.minX < minX) minX = b.minX; if (b.maxX > maxX) maxX = b.maxX;
    if (b.minZ < minZ) minZ = b.minZ; if (b.maxZ > maxZ) maxZ = b.maxZ;
  }

  gridOriginX = minX - GRID_CELL_SIZE;
  gridOriginZ = minZ - GRID_CELL_SIZE;
  gridCols = Math.ceil((maxX - gridOriginX) / GRID_CELL_SIZE) + 1;
  gridRows = Math.ceil((maxZ - gridOriginZ) / GRID_CELL_SIZE) + 1;

  grid = Array.from({ length: gridCols * gridRows }, () => []);

  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    const c0 = Math.max(0, Math.floor((b.minX - gridOriginX) / GRID_CELL_SIZE));
    const c1 = Math.min(gridCols - 1, Math.floor((b.maxX - gridOriginX) / GRID_CELL_SIZE));
    const r0 = Math.max(0, Math.floor((b.minZ - gridOriginZ) / GRID_CELL_SIZE));
    const r1 = Math.min(gridRows - 1, Math.floor((b.maxZ - gridOriginZ) / GRID_CELL_SIZE));
    for (let c = c0; c <= c1; c++) {
      for (let r = r0; r <= r1; r++) {
        grid[r * gridCols + c].push(i);
      }
    }
  }
}

export function resolveCollision(px, pz, radius) {
  if (!grid) return { x: px, z: pz };

  for (let iter = 0; iter < 4; iter++) {
    const col = Math.floor((px - gridOriginX) / GRID_CELL_SIZE);
    const row = Math.floor((pz - gridOriginZ) / GRID_CELL_SIZE);

    const seen = new Set();
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        const c = col + dc, r = row + dr;
        if (c < 0 || c >= gridCols || r < 0 || r >= gridRows) continue;
        for (const idx of grid[r * gridCols + c]) seen.add(idx);
      }
    }

    for (const idx of seen) {
      const b = buildings[idx];

      // AABB broad-phase reject (expanded by radius)
      if (px < b.minX - radius || px > b.maxX + radius ||
          pz < b.minZ - radius || pz > b.maxZ + radius) continue;

      const result = resolveVsPolygon(px, pz, radius, b.polygon);
      px = result.x;
      pz = result.z;
    }
  }

  return { x: px, z: pz };
}

// ── Polygon-edge narrowphase ──────────────────────────────────────────────────

function resolveVsPolygon(px, pz, radius, poly) {
  const inside = pointInPolygon(px, pz, poly);

  if (inside) {
    // Push player out through the nearest edge using centroid direction
    const { cx, cz, dist2 } = nearestEdgePoint(px, pz, poly);
    const centroid = polygonCentroid(poly);
    // Outward direction ≈ from centroid toward nearest edge point
    const ox = cx - centroid.x;
    const oz = cz - centroid.z;
    const ol = Math.sqrt(ox * ox + oz * oz) || 1;
    // Place player just outside that edge point
    px = cx + (ox / ol) * radius;
    pz = cz + (oz / ol) * radius;
    return { x: px, z: pz };
  }

  // Outside: push away from any edge closer than radius
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];

    const dx = b.x - a.x, dz = b.z - a.z;
    const len2 = dx * dx + dz * dz;
    if (len2 < 0.0001) continue;

    const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (pz - a.z) * dz) / len2));
    const cx = a.x + t * dx;
    const cz = a.z + t * dz;
    const ex = px - cx, ez = pz - cz;
    const dist2 = ex * ex + ez * ez;

    if (dist2 < radius * radius && dist2 > 0.000001) {
      const dist = Math.sqrt(dist2);
      const push = radius - dist;
      px += (ex / dist) * push;
      pz += (ez / dist) * push;
    }
  }

  return { x: px, z: pz };
}

// Ray-casting point-in-polygon test (XZ plane)
function pointInPolygon(px, pz, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, zi = poly[i].z;
    const xj = poly[j].x, zj = poly[j].z;
    if (((zi > pz) !== (zj > pz)) &&
        (px < (xj - xi) * (pz - zi) / (zj - zi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

// Closest point on any polygon edge to (px, pz)
function nearestEdgePoint(px, pz, poly) {
  let minDist2 = Infinity, bestCx = px, bestCz = pz;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const dx = b.x - a.x, dz = b.z - a.z;
    const len2 = dx * dx + dz * dz;
    if (len2 < 0.0001) continue;
    const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (pz - a.z) * dz) / len2));
    const cx = a.x + t * dx, cz = a.z + t * dz;
    const d2 = (px - cx) ** 2 + (pz - cz) ** 2;
    if (d2 < minDist2) { minDist2 = d2; bestCx = cx; bestCz = cz; }
  }
  return { cx: bestCx, cz: bestCz, dist2: minDist2 };
}

function polygonCentroid(poly) {
  let x = 0, z = 0;
  for (const p of poly) { x += p.x; z += p.z; }
  return { x: x / poly.length, z: z / poly.length };
}
