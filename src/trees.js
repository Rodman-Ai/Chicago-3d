import * as THREE from 'three';

const TREE_SPACING = 16;   // metres between trees along a segment
const SHRUB_PROB   = 0.38; // probability of a shrub at each candidate spot
const SHRUB_STEP   = 9;    // candidate spacing for shrubs

const HALF_W = { primary: 6, secondary: 4.5, tertiary: 3.5, residential: 2.75, unclassified: 2.75 };
const SIDEWALK_W = 2.2;

const CROWN_COLORS = [0x2d5a27, 0x3a7c32, 0x4a8e3f, 0x527835, 0x3d6e2a];
const SHRUB_COLORS = [0x3d6e35, 0x4a8a3d, 0x2e5228, 0x527830];

function halfWidth(hw) { return HALF_W[hw] ?? 3; }

function collectPositions(streets, project) {
  const trees  = [];
  const shrubs = [];

  for (const { nodes, highway } of streets) {
    const hw  = halfWidth(highway);
    const tOff = hw + SIDEWALK_W * 0.38; // inset 38 % into sidewalk from curb

    for (let i = 0; i < nodes.length - 1; i++) {
      const a = project(nodes[i].lat,     nodes[i].lon);
      const b = project(nodes[i+1].lat,   nodes[i+1].lon);
      const dx = b.x - a.x, dz = b.z - a.z;
      const len = Math.sqrt(dx*dx + dz*dz);
      if (len < TREE_SPACING * 0.5) continue;
      const nx = -dz / len, nz = dx / len;

      // Trees — one on each side of the road
      const tSteps = Math.max(1, Math.floor(len / TREE_SPACING));
      for (let s = 0; s < tSteps; s++) {
        const t  = (s + 0.5) / tSteps;
        const px = a.x + t * dx, pz = a.z + t * dz;
        trees.push({ x: px + nx * tOff,  z: pz + nz * tOff  });
        trees.push({ x: px - nx * tOff,  z: pz - nz * tOff  });
      }

      // Shrubs — random spots near the building edge
      const sOff   = hw + SIDEWALK_W * 0.85;
      const sSteps = Math.max(1, Math.floor(len / SHRUB_STEP));
      for (let s = 0; s < sSteps; s++) {
        if (Math.random() > SHRUB_PROB) continue;
        const t   = (s + 0.5) / sSteps;
        const px  = a.x + t * dx, pz = a.z + t * dz;
        const side = Math.random() < 0.5 ? 1 : -1;
        shrubs.push({ x: px + nx * side * sOff, z: pz + nz * side * sOff });
      }
    }
  }

  return { trees, shrubs };
}

export function buildTrees(streets, project) {
  const { trees, shrubs } = collectPositions(streets, project);
  const meshes  = [];
  const dummy   = new THREE.Object3D();
  const color   = new THREE.Color();

  if (trees.length > 0) {
    // Trunks
    const trunkGeo = new THREE.CylinderGeometry(0.17, 0.28, 3.0, 6);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5c3c1a });
    const trunks   = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length);

    // Crowns
    const crownGeo = new THREE.SphereGeometry(1, 8, 6);
    const crownMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const crowns   = new THREE.InstancedMesh(crownGeo, crownMat, trees.length);

    trees.forEach(({ x, z }, i) => {
      const jitter = (Math.random() - 0.5) * 0.8;

      dummy.position.set(x + jitter, 1.5, z + jitter);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);

      const radius = 1.9 + Math.random() * 0.9;
      dummy.position.set(x + jitter, 3.6 + Math.random() * 0.7, z + jitter);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      dummy.scale.set(radius, radius * (0.75 + Math.random() * 0.2), radius);
      dummy.updateMatrix();
      crowns.setMatrixAt(i, dummy.matrix);

      color.setHex(CROWN_COLORS[i % CROWN_COLORS.length]);
      crowns.setColorAt(i, color);
    });

    trunks.instanceMatrix.needsUpdate = true;
    crowns.instanceMatrix.needsUpdate = true;
    crowns.instanceColor.needsUpdate  = true;

    meshes.push(trunks, crowns);
  }

  if (shrubs.length > 0) {
    const shrubGeo = new THREE.SphereGeometry(1, 6, 4);
    const shrubMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const shrubMesh = new THREE.InstancedMesh(shrubGeo, shrubMat, shrubs.length);

    shrubs.forEach(({ x, z }, i) => {
      const r = 0.55 + Math.random() * 0.45;
      dummy.position.set(x, r * 0.7, z);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      dummy.scale.set(r, r * 0.65, r);
      dummy.updateMatrix();
      shrubMesh.setMatrixAt(i, dummy.matrix);

      color.setHex(SHRUB_COLORS[i % SHRUB_COLORS.length]);
      shrubMesh.setColorAt(i, color);
    });

    shrubMesh.instanceMatrix.needsUpdate = true;
    shrubMesh.instanceColor.needsUpdate  = true;

    meshes.push(shrubMesh);
  }

  return { meshes, positions: trees };
}
