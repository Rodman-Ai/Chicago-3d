import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { FOV, NEAR, FAR, WORLD_SIZE } from './config.js';
import { createAsphaltTexture } from './textures.js';

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

  const ambient = new THREE.AmbientLight(0x404060, 1.2);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff4e0, 2.5);
  sun.position.set(300, 500, 200);
  scene.add(sun);

  const hemi = new THREE.HemisphereLight(0x87ceeb, 0x556644, 0.8);
  scene.add(hemi);

  // Preetham sky
  const sky = new Sky();
  sky.scale.setScalar(450000);
  scene.add(sky);
  const su = sky.material.uniforms;
  su.turbidity.value        = 6;
  su.rayleigh.value         = 1.8;
  su.mieCoefficient.value   = 0.005;
  su.mieDirectionalG.value  = 0.85;
  const phi   = THREE.MathUtils.degToRad(90 - 40);
  const theta = THREE.MathUtils.degToRad(200);
  su.sunPosition.value.setFromSphericalCoords(1, phi, theta);

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE),
    new THREE.MeshLambertMaterial({ map: createAsphaltTexture(WORLD_SIZE) })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  return { renderer, scene, camera, sun, sky, ambient, hemi };
}
