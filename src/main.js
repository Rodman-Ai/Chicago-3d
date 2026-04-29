import * as THREE from 'three';
import { CENTER_LAT, CENTER_LON, OSM_BBOX, PLAYER_EYE, MILLENNIUM_PARK_LAT, MILLENNIUM_PARK_LON } from './config.js';
import { createScene } from './scene.js';
import { createProjection } from './geo.js';
import { fetchCityData } from './osm.js';
import { buildCity } from './buildings.js';
import { buildGrid } from './collision.js';
import { buildStreetLabels } from './streets.js';
import { PlayerController } from './player.js';
import {
  showLoading, hideLoading, setLoadingText,
  setLoadingProgress, showLoadingError,
} from './ui.js';

async function init() {
  showLoading();

  const canvas = document.getElementById('canvas');
  const { renderer, scene, camera } = createScene(canvas);
  const project = createProjection(CENTER_LAT, CENTER_LON);

  try {
    // 1. Fetch buildings + named streets
    const { buildings, streets } = await fetchCityData(OSM_BBOX, (msg, progress) => {
      setLoadingText(msg);
      setLoadingProgress(progress);
    });

    setLoadingText(`Loaded ${buildings.length.toLocaleString()} buildings, ${streets.length.toLocaleString()} street segments.`);
    setLoadingProgress(0.48);
    await tick();

    // 2. Build city geometry + collision AABBs
    const { mesh, aabbs } = buildCity(buildings, project, (msg, progress) => {
      setLoadingText(msg);
      setLoadingProgress(progress);
    });
    scene.add(mesh);

    // 3. Street name signs
    setLoadingText('Placing street signs...');
    setLoadingProgress(0.89);
    await tick();
    for (const sprite of buildStreetLabels(streets, project)) {
      scene.add(sprite);
    }

    // 4. Collision grid
    setLoadingText('Building collision grid...');
    setLoadingProgress(0.93);
    await tick();
    buildGrid(aabbs);

    // 5. Player — start at Millennium Park
    const park = project(MILLENNIUM_PARK_LAT, MILLENNIUM_PARK_LON);
    const startPos = new THREE.Vector3(park.x, PLAYER_EYE, park.z);

    setLoadingText('Starting...');
    setLoadingProgress(1.0);
    await tick();

    const player = new PlayerController(camera, canvas, startPos);

    await new Promise(r => setTimeout(r, 400));
    hideLoading();

    // 6. Game loop
    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.1);
      player.update(dt);
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
