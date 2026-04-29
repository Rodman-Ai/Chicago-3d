import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { FOV, NEAR, FAR, WORLD_SIZE } from './config.js';

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.5;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xc8d8e8, 0.0007);

  const camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, NEAR, FAR);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  scene.add(new THREE.AmbientLight(0x404060, 1.2));

  const sun = new THREE.DirectionalLight(0xfff4e0, 2.5);
  sun.position.set(300, 500, 200);
  scene.add(sun);

  scene.add(new THREE.HemisphereLight(0x87ceeb, 0x556644, 0.8));

  // Preetham sky
  const sky = new Sky();
  sky.scale.setScalar(450000);
  scene.add(sky);
  const su = sky.material.uniforms;
  su.turbidity.value = 6;
  su.rayleigh.value = 1.8;
  su.mieCoefficient.value = 0.005;
  su.mieDirectionalG.value = 0.85;
  const phi = THREE.MathUtils.degToRad(90 - 40);
  const theta = THREE.MathUtils.degToRad(200);
  su.sunPosition.value.setFromSphericalCoords(1, phi, theta);

  // Ground with pavement texture
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE),
    new THREE.MeshLambertMaterial({ map: createPavementTexture() })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  return { renderer, scene, camera };
}

function createPavementTexture() {
  const SIZE = 512;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  // Base asphalt
  ctx.fillStyle = '#383838';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Subtle noise — draw many small semi-transparent dots for asphalt grain
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * SIZE;
    const y = Math.random() * SIZE;
    const r = Math.random() * 1.5;
    const bright = Math.random() > 0.5 ? 60 : 25;
    ctx.fillStyle = `rgba(${bright},${bright},${bright},0.15)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Faint grid lines — sidewalk/pavement block seams every 2m
  // texture covers BLOCK_SIZE meters in world space
  const BLOCK_SIZE = 2; // meters per pavement slab
  const REPEATS = 8;    // slabs per texture tile
  const step = SIZE / REPEATS;
  ctx.strokeStyle = 'rgba(80,80,80,0.35)';
  ctx.lineWidth = 1.5;
  for (let i = step; i < SIZE; i += step) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, SIZE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(SIZE, i); ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  // Each texture tile = REPEATS * BLOCK_SIZE meters → repeats = world / (REPEATS*BLOCK_SIZE)
  const worldRepeats = WORLD_SIZE / (REPEATS * BLOCK_SIZE);
  tex.repeat.set(worldRepeats, worldRepeats);
  return tex;
}
