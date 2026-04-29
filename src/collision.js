import { GRID_CELL_SIZE } from './config.js';

let aabbs = [];
let grid = null;
let gridOriginX = 0, gridOriginZ = 0;
let gridCols = 0, gridRows = 0;

export function buildGrid(inputAabbs) {
  aabbs = inputAabbs;

  if (aabbs.length === 0) return;

  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const b of aabbs) {
    if (b.minX < minX) minX = b.minX;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.minZ < minZ) minZ = b.minZ;
    if (b.maxZ > maxZ) maxZ = b.maxZ;
  }

  gridOriginX = minX - GRID_CELL_SIZE;
  gridOriginZ = minZ - GRID_CELL_SIZE;
  gridCols = Math.ceil((maxX - gridOriginX) / GRID_CELL_SIZE) + 1;
  gridRows = Math.ceil((maxZ - gridOriginZ) / GRID_CELL_SIZE) + 1;

  grid = Array.from({ length: gridCols * gridRows }, () => []);

  for (let i = 0; i < aabbs.length; i++) {
    const b = aabbs[i];
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

// Resolve player cylinder (radius) against all nearby building AABBs.
// Returns corrected { x, z }.
export function resolveCollision(px, pz, radius) {
  if (!grid) return { x: px, z: pz };

  for (let iter = 0; iter < 3; iter++) {
    const col = Math.floor((px - gridOriginX) / GRID_CELL_SIZE);
    const row = Math.floor((pz - gridOriginZ) / GRID_CELL_SIZE);

    // Collect candidates from 3x3 cell neighbourhood (deduplicated via Set)
    const seen = new Set();
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        const c = col + dc;
        const r = row + dr;
        if (c < 0 || c >= gridCols || r < 0 || r >= gridRows) continue;
        for (const idx of grid[r * gridCols + c]) seen.add(idx);
      }
    }

    for (const idx of seen) {
      const b = aabbs[idx];

      // Closest point on AABB to player center (XZ)
      const cx = Math.max(b.minX, Math.min(px, b.maxX));
      const cz = Math.max(b.minZ, Math.min(pz, b.maxZ));
      const dx = px - cx;
      const dz = pz - cz;
      const dist2 = dx * dx + dz * dz;

      if (dist2 < radius * radius) {
        const dist = Math.sqrt(dist2);

        if (dist < 0.0001) {
          // Player center inside AABB — push out along minimum-penetration axis
          const overlapX = Math.min(px - b.minX, b.maxX - px);
          const overlapZ = Math.min(pz - b.minZ, b.maxZ - pz);
          const midX = (b.minX + b.maxX) * 0.5;
          const midZ = (b.minZ + b.maxZ) * 0.5;
          if (overlapX < overlapZ) {
            px += px < midX ? -(overlapX + radius) : (overlapX + radius);
          } else {
            pz += pz < midZ ? -(overlapZ + radius) : (overlapZ + radius);
          }
        } else {
          const push = radius - dist;
          px += (dx / dist) * push;
          pz += (dz / dist) * push;
        }
      }
    }
  }

  return { x: px, z: pz };
}
