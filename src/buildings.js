import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createGlassFacadeTexture, createConcreteTexture, createBrickTexture } from './textures.js';

const GLASS_MIN    = 60;
const CONCRETE_MIN = 20;

function buildingType(height) {
  if (height >= GLASS_MIN)    return 'glass';
  if (height >= CONCRETE_MIN) return 'concrete';
  return 'brick';
}

const MIN_AREA   = 5;
const LOD_DIST   = 500; // metres from world origin — beyond this, use BoxGeometry

function polygonArea(pts) {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    a += (pts[j].x + pts[i].x) * (pts[j].z - pts[i].z);
  }
  return Math.abs(a / 2);
}

export function buildCity(buildings, project, onProgress) {
  const groups = { glass: [], concrete: [], brick: [] };
  const aabbs  = [];

  for (let i = 0; i < buildings.length; i++) {
    const { nodes, height } = buildings[i];
    const points = nodes.map(({ lat, lon }) => project(lat, lon));

    if (polygonArea(points) < MIN_AREA) continue;

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
    }
    aabbs.push({ minX, maxX, minZ, maxZ, height, polygon: points });

    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;

    let geo;
    if (cx * cx + cz * cz > LOD_DIST * LOD_DIST) {
      // Far building — simple AABB box (heavily fogged at this distance)
      const sx = Math.max(maxX - minX, 2);
      const sz = Math.max(maxZ - minZ, 2);
      geo = new THREE.BoxGeometry(sx, height, sz);
      geo.translate(cx, height / 2, cz);
    } else {
      // Near building — full polygon extrusion
      const shape = new THREE.Shape();
      shape.moveTo(points[0].x, points[0].z);
      for (let j = 1; j < points.length; j++) shape.lineTo(points[j].x, points[j].z);
      shape.closePath();

      geo = new THREE.ExtrudeGeometry(shape, {
        steps: 1, depth: height, bevelEnabled: false,
      });
      geo.rotateX(-Math.PI / 2);
    }

    groups[buildingType(height)].push(geo);

    if (i % 300 === 0 && i > 0) {
      onProgress(`Building city… (${i}/${buildings.length})`, 0.5 + 0.35 * (i / buildings.length));
    }
  }

  onProgress('Applying textures…', 0.87);

  const materials = {
    glass:    new THREE.MeshLambertMaterial({ map: createGlassFacadeTexture() }),
    concrete: new THREE.MeshLambertMaterial({ map: createConcreteTexture() }),
    brick:    new THREE.MeshLambertMaterial({ map: createBrickTexture() }),
  };

  const meshes = [];
  for (const [type, geos] of Object.entries(groups)) {
    if (geos.length === 0) continue;
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    meshes.push(new THREE.Mesh(merged, materials[type]));
  }

  return { meshes, aabbs };
}
