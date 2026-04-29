import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// [r, g, b] in 0-1 — realistic Chicago building palette
const PALETTES = [
  [0.54, 0.61, 0.72], // glass blue-grey
  [0.44, 0.52, 0.64], // deep glass
  [0.38, 0.46, 0.60], // dark glass tower
  [0.68, 0.66, 0.63], // light concrete
  [0.58, 0.56, 0.53], // medium concrete
  [0.50, 0.49, 0.47], // dark concrete
  [0.72, 0.60, 0.47], // warm brick
  [0.62, 0.51, 0.41], // dark brick
  [0.76, 0.74, 0.70], // pale limestone (Tribune Tower, etc.)
  [0.82, 0.79, 0.74], // cream stone
];

export function buildCity(buildings, project, onProgress) {
  const geometries = [];
  const aabbs = [];

  for (let i = 0; i < buildings.length; i++) {
    const { nodes, height } = buildings[i];

    const points = nodes.map(({ lat, lon }) => project(lat, lon));

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }
    aabbs.push({ minX, maxX, minZ, maxZ, height });

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
    geo.rotateX(-Math.PI / 2);

    // Assign per-vertex colors: random palette, rooftop vertices noticeably brighter
    const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    const posAttr = geo.attributes.position;
    const colorArr = new Float32Array(posAttr.count * 3);
    for (let v = 0; v < posAttr.count; v++) {
      const isRoof = posAttr.getY(v) > height * 0.95;
      const bright = isRoof ? 1.3 : 1.0;
      colorArr[v * 3]     = Math.min(palette[0] * bright, 1);
      colorArr[v * 3 + 1] = Math.min(palette[1] * bright, 1);
      colorArr[v * 3 + 2] = Math.min(palette[2] * bright, 1);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colorArr, 3));

    geometries.push(geo);

    if (i % 300 === 0 && i > 0) {
      onProgress(`Building city... (${i}/${buildings.length})`, 0.5 + 0.35 * (i / buildings.length));
    }
  }

  onProgress('Merging geometry...', 0.87);
  const merged = mergeGeometries(geometries, false);
  for (const g of geometries) g.dispose();

  const material = new THREE.MeshLambertMaterial({ vertexColors: true });

  return { mesh: new THREE.Mesh(merged, material), aabbs };
}
