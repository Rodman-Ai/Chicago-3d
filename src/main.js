import * as THREE from 'three';
import { CENTER_LAT, CENTER_LON, OSM_BBOX } from './config.js';
import { createScene } from './scene.js';
import { createProjection } from './geo.js';
import { fetchBuildings } from './osm.js';
import { buildCity } from './buildings.js';
import { buildGrid } from './collision.js';
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
    // 1. Fetch + parse OSM buildings
    const buildings = await fetchBuildings(OSM_BBOX, (msg, progress) => {
      setLoadingText(msg);
      setLoadingProgress(progress);
    });

    setLoadingText(`Loaded ${buildings.length.toLocaleString()} buildings.`);
    setLoadingProgress(0.48);

    // Yield to let the browser paint the progress update
    await tick();

    // 2. Build geometry and collision AABBs
    const { mesh, aabbs } = buildCity(buildings, project, (msg, progress) => {
      setLoadingText(msg);
      setLoadingProgress(progress);
    });
    scene.add(mesh);

    setLoadingText('Building collision grid...');
    setLoadingProgress(0.92);
    await tick();

    buildGrid(aabbs);

    // 3. Setup player
    setLoadingText('Starting...');
    setLoadingProgress(1.0);
    await tick();

    const player = new PlayerController(camera, canvas);

    // Short pause so "100%" is visible
    await new Promise(r => setTimeout(r, 400));
    hideLoading();

    // 4. Game loop
    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.1); // cap at 100ms (tab-switch protection)
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
