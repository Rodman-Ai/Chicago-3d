import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function buildCity(buildings, project, onProgress) {
  const geometries = [];
  const aabbs = [];

  for (let i = 0; i < buildings.length; i++) {
    const { nodes, height } = buildings[i];

    // Project lat/lon -> world XZ
    const points = nodes.map(({ lat, lon }) => project(lat, lon));

    // Compute 2D axis-aligned bounding box for collision
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }
    aabbs.push({ minX, maxX, minZ, maxZ, height });

    // Build THREE.Shape from footprint (Shape uses x/y internally; we map world x→x, world z→y)
    const shape = new THREE.Shape();
    shape.moveTo(points[0].x, points[0].z);
    for (let j = 1; j < points.length; j++) {
      shape.lineTo(points[j].x, points[j].z);
    }
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      steps: 1,
      depth: height,
      bevelEnabled: false,
    });

    // ExtrudeGeometry extrudes along local Z; rotate so buildings stand along world Y
    geo.rotateX(-Math.PI / 2);

    geometries.push(geo);

    if (i % 300 === 0 && i > 0) {
      onProgress(`Building city... (${i}/${buildings.length})`, 0.5 + 0.35 * (i / buildings.length));
    }
  }

  onProgress('Merging geometry...', 0.87);

  const merged = mergeGeometries(geometries, false);

  // Free per-building geometry memory
  for (const g of geometries) g.dispose();

  const material = new THREE.MeshLambertMaterial({
    color: 0x8a9bb5,
    side: THREE.FrontSide,
  });

  const mesh = new THREE.Mesh(merged, material);

  return { mesh, aabbs };
}
