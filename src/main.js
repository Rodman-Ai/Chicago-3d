import * as THREE from 'three';
import {
  CENTER_LAT, CENTER_LON, OSM_BBOX, PLAYER_EYE,
  SPAWN_LAT, SPAWN_LON,
} from './config.js';
import { createScene }        from './scene.js';
import { createProjection }   from './geo.js';
import { fetchCityData }      from './osm.js';
import { buildCity }          from './buildings.js';
import { buildGrid }          from './collision.js';
import { buildStreetLabels }  from './streets.js';
import { buildRoads }         from './roads.js';
import { buildTrees }         from './trees.js';
import { createDayNight }     from './daynight.js';
import { createMinimap }      from './minimap.js';
import { createLandmarks }    from './landmarks.js';
import { updateAudio }        from './audio.js';
import { PlayerController }   from './player.js';
import {
  showLoading, hideLoading, setLoadingText,
  setLoadingProgress, showLoadingError,
} from './ui.js';

async function init() {
  showLoading();

  const canvas = document.getElementById('canvas');
  const { renderer, scene, camera, sun, sky, ambient, hemi } = createScene(canvas);
  const project = createProjection(CENTER_LAT, CENTER_LON);

  try {
    // 1. Fetch buildings + named streets (cache-aware)
    const { buildings, streets } = await fetchCityData(OSM_BBOX, (msg, progress) => {
      setLoadingText(msg);
      setLoadingProgress(progress);
    });

    setLoadingText(`Loaded ${buildings.length.toLocaleString()} buildings, ${streets.length.toLocaleString()} street segments.`);
    setLoadingProgress(0.48);
    await tick();

    // 2. City geometry (3 material groups, LOD for distant buildings)
    const { meshes, aabbs } = buildCity(buildings, project, (msg, progress) => {
      setLoadingText(msg);
      setLoadingProgress(progress);
    });
    for (const m of meshes) scene.add(m);

    // 3. Roads + sidewalks
    setLoadingText('Paving streets…');
    setLoadingProgress(0.86);
    await tick();
    for (const m of buildRoads(streets, project)) scene.add(m);

    // 4. Trees + shrubs (also yields positions for collision + street lights)
    setLoadingText('Planting trees…');
    setLoadingProgress(0.89);
    await tick();
    const { meshes: treeMeshes, positions: treePositions } = buildTrees(streets, project);
    for (const m of treeMeshes) scene.add(m);

    // 5. Street name signs
    setLoadingText('Placing street signs…');
    setLoadingProgress(0.91);
    await tick();
    for (const sprite of buildStreetLabels(streets, project)) scene.add(sprite);

    // 6. Collision grid — buildings + tree trunks
    setLoadingText('Building collision grid…');
    setLoadingProgress(0.93);
    await tick();

    const TRUNK_R = 0.3;
    const treeAabbs = treePositions.map(({ x, z }) => ({
      minX: x - TRUNK_R, maxX: x + TRUNK_R,
      minZ: z - TRUNK_R, maxZ: z + TRUNK_R,
      polygon: [
        { x: x - TRUNK_R, z: z - TRUNK_R },
        { x: x + TRUNK_R, z: z - TRUNK_R },
        { x: x + TRUNK_R, z: z + TRUNK_R },
        { x: x - TRUNK_R, z: z + TRUNK_R },
      ],
    }));
    buildGrid([...aabbs, ...treeAabbs]);

    // 7. Day/night cycle + street lights
    const dayNight = createDayNight(scene, sky, sun, ambient, hemi);
    const stride   = Math.max(1, Math.floor(treePositions.length / 22));
    for (let i = 0; i < treePositions.length; i += stride) {
      dayNight.addStreetLight(treePositions[i].x, treePositions[i].z);
    }

    // 8. Minimap
    const minimap = createMinimap(streets, project);

    // 9. Landmark cards
    const landmarks = createLandmarks(project);

    // 10. Player — spawn at E Randolph & N Michigan
    const spawn    = project(SPAWN_LAT, SPAWN_LON);
    const startPos = new THREE.Vector3(spawn.x, PLAYER_EYE, spawn.z);

    setLoadingText('Starting…');
    setLoadingProgress(1.0);
    await tick();

    const player = new PlayerController(camera, canvas, startPos);

    await new Promise(r => setTimeout(r, 400));
    hideLoading();

    // 11. Game loop
    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.1);

      player.update(dt);
      dayNight.update(dt);
      minimap.update(player.pos, player.yaw);
      landmarks.update(player.pos);
      updateAudio(player.isMoving, dt);

      renderer.render(scene, camera);
    }
    animate();

  } catch (err) {
    console.error(err);
    showLoadingError(`${err.message}`);
  }
}

function tick() {
  return new Promise(r => setTimeout(r, 0));
}

init();
