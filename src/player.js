import * as THREE from 'three';
import { PLAYER_SPEED, PLAYER_EYE, PLAYER_RADIUS, MOUSE_SENSITIVITY } from './config.js';
import { resolveCollision } from './collision.js';
import { showPointerLockOverlay, hidePointerLockOverlay } from './ui.js';

export class PlayerController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.pos = new THREE.Vector3(0, PLAYER_EYE, 10); // start slightly south of origin
    this.yaw = 0;   // horizontal look angle (radians)
    this.pitch = 0; // vertical look angle (radians), clamped

    this.keys = { w: false, a: false, s: false, d: false };
    this.isLocked = false;

    // YXZ order: yaw applied first (world Y), then pitch (local X) — correct FPS look
    this.camera.rotation.order = 'YXZ';

    this._initPointerLock();
    this._initKeyboard();

    showPointerLockOverlay();
  }

  _initPointerLock() {
    this.domElement.addEventListener('click', () => {
      if (!this.isLocked) this.domElement.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
      if (this.isLocked) hidePointerLockOverlay();
      else showPointerLockOverlay();
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;
      this.yaw -= e.movementX * MOUSE_SENSITIVITY;
      this.pitch -= e.movementY * MOUSE_SENSITIVITY;
      const limit = Math.PI / 2 - 0.01;
      this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
    });
  }

  _initKeyboard() {
    const map = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd',
                  ArrowUp: 'w', ArrowLeft: 'a', ArrowDown: 's', ArrowRight: 'd' };
    document.addEventListener('keydown', (e) => {
      if (map[e.code]) { this.keys[map[e.code]] = true; e.preventDefault(); }
    });
    document.addEventListener('keyup', (e) => {
      if (map[e.code]) this.keys[map[e.code]] = false;
    });
  }

  update(dt) {
    if (!this.isLocked) return;

    // Horizontal forward/right vectors from yaw (ignore pitch for movement)
    const sinY = Math.sin(this.yaw);
    const cosY = Math.cos(this.yaw);
    const fwdX = -sinY, fwdZ = -cosY;
    const rgtX =  cosY, rgtZ = -sinY;

    let moveX = 0, moveZ = 0;
    if (this.keys.w) { moveX += fwdX; moveZ += fwdZ; }
    if (this.keys.s) { moveX -= fwdX; moveZ -= fwdZ; }
    if (this.keys.d) { moveX += rgtX; moveZ += rgtZ; }
    if (this.keys.a) { moveX -= rgtX; moveZ -= rgtZ; }

    if (moveX !== 0 || moveZ !== 0) {
      const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
      const step = PLAYER_SPEED * dt;
      let newX = this.pos.x + (moveX / len) * step;
      let newZ = this.pos.z + (moveZ / len) * step;

      const resolved = resolveCollision(newX, newZ, PLAYER_RADIUS);
      this.pos.x = resolved.x;
      this.pos.z = resolved.z;
    }

    this.camera.position.copy(this.pos);
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }
}
