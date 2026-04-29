import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createRoadTexture, createSidewalkTexture } from './textures.js';

// Half-widths in metres per road class
const HALF_W = { primary: 6, secondary: 4.5, tertiary: 3.5, residential: 2.75, unclassified: 2.75 };
const SIDEWALK_W = 2.2;
const ROAD_Y     = 0.02;
const SIDEWALK_Y = 0.10;

function halfWidth(highway) { return HALF_W[highway] ?? 3; }

// Build one axis-aligned quad strip between two points.
// off0/off1 are signed lateral offsets from the road centre-line in metres.
function makeStrip(ax, az, bx, bz, nx, nz, off0, off1, y) {
  const dx = bx - ax, dz = bz - az;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.5) return null;

  const w = off1 - off0;
  const positions = new Float32Array([
    ax + nx * off0, y, az + nz * off0,
    ax + nx * off1, y, az + nz * off1,
    bx + nx * off1, y, bz + nz * off1,
    bx + nx * off0, y, bz + nz * off0,
  ]);
  // World-space UVs so repeat.set(1,1) tiles the texture every 1 m²
  const uvs = new Float32Array([0, 0,  w, 0,  w, len,  0, len]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv',       new THREE.BufferAttribute(uvs, 2));
  geo.setIndex([0, 2, 1, 0, 3, 2]);
  geo.computeVertexNormals();
  return geo;
}

export function buildRoads(streets, project) {
  const gRoad = [], gSide = [];

  for (const { nodes, highway } of streets) {
    const hw = halfWidth(highway);
    const sw = SIDEWALK_W;

    for (let i = 0; i < nodes.length - 1; i++) {
      const a = project(nodes[i].lat, nodes[i].lon);
      const b = project(nodes[i + 1].lat, nodes[i + 1].lon);
      const dx = b.x - a.x, dz = b.z - a.z;
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len < 0.5) continue;
      const nx = -dz / len, nz = dx / len;

      const road = makeStrip(a.x, a.z, b.x, b.z, nx, nz, -hw,      hw,      ROAD_Y);
      const sL   = makeStrip(a.x, a.z, b.x, b.z, nx, nz,  hw,      hw + sw, SIDEWALK_Y);
      const sR   = makeStrip(a.x, a.z, b.x, b.z, nx, nz, -(hw+sw), -hw,     SIDEWALK_Y);

      if (road) gRoad.push(road);
      if (sL)   gSide.push(sL);
      if (sR)   gSide.push(sR);
    }
  }

  const meshes = [];

  if (gRoad.length) {
    const merged = mergeGeometries(gRoad, false);
    for (const g of gRoad) g.dispose();
    meshes.push(new THREE.Mesh(merged, new THREE.MeshLambertMaterial({ map: createRoadTexture() })));
  }

  if (gSide.length) {
    const merged = mergeGeometries(gSide, false);
    for (const g of gSide) g.dispose();
    meshes.push(new THREE.Mesh(merged, new THREE.MeshLambertMaterial({ map: createSidewalkTexture() })));
  }

  return meshes;
}
