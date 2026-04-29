import * as THREE from 'three';
import { PLAYER_SPEED, PLAYER_EYE, PLAYER_RADIUS, MOUSE_SENSITIVITY, JUMP_VEL, GRAVITY } from './config.js';
import { resolveCollision } from './collision.js';
import { showPointerLockOverlay, hidePointerLockOverlay, showTouchUI } from './ui.js';

const TOUCH_SENSITIVITY = 0.004;
const JOYSTICK_MAX_R = 55; // pixels

export class PlayerController {
  constructor(camera, domElement, startPos = null) {
    this.camera = camera;
    this.domElement = domElement;

    this.pos = startPos ? startPos.clone() : new THREE.Vector3(0, PLAYER_EYE, 10);
    this.yaw = 0;
    this.pitch = 0;
    this.keys = { w: false, a: false, s: false, d: false, shift: false };
    this.isLocked = false;
    this.isMoving = false;

    // Jump state
    this.velY       = 0;
    this.isGrounded = true;

    // Double-tap tracking (mobile jump)
    this._lastTapTime   = 0;
    this._tapTouches    = {}; // id → { startX, startY, startTime }

    // Touch state
    this._joy = { active: false, id: -1, ox: 0, oy: 0, dx: 0, dy: 0 };
    this._look = { active: false, id: -1, lx: 0, ly: 0 };

    this.isTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;

    this.camera.rotation.order = 'YXZ';

    if (this.isTouch) {
      this._initTouch();
      showTouchUI();
    } else {
      this._initPointerLock();
      this._initKeyboard();
      showPointerLockOverlay();
    }
  }

  // ── Desktop ──────────────────────────────────────────────────────────────

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
      this._clampPitch();
    });
  }

  _initKeyboard() {
    const map = {
      KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd',
      ArrowUp: 'w', ArrowLeft: 'a', ArrowDown: 's', ArrowRight: 'd',
    };
    document.addEventListener('keydown', (e) => {
      if (map[e.code]) { this.keys[map[e.code]] = true; e.preventDefault(); }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.keys.shift = true;
      if (e.code === 'Space') { e.preventDefault(); this._jump(); }
    });
    document.addEventListener('keyup', (e) => {
      if (map[e.code]) this.keys[map[e.code]] = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.keys.shift = false;
    });
  }

  // ── Touch (iOS / mobile) ─────────────────────────────────────────────────

  _initTouch() {
    const el = this.domElement;
    const half = () => window.innerWidth / 2;

    el.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        // Track for double-tap detection
        this._tapTouches[t.identifier] = { startX: t.clientX, startY: t.clientY, startTime: Date.now() };

        if (t.clientX < half() && !this._joy.active) {
          this._joy = { active: true, id: t.identifier, ox: t.clientX, oy: t.clientY, dx: 0, dy: 0 };
          this._updateJoystickDOM(t.clientX, t.clientY, 0, 0);
        } else if (t.clientX >= half() && !this._look.active) {
          this._look = { active: true, id: t.identifier, lx: t.clientX, ly: t.clientY };
        }
      }
    }, { passive: false });

    el.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        // Joystick
        if (this._joy.active && t.identifier === this._joy.id) {
          const rawX = t.clientX - this._joy.ox;
          const rawY = t.clientY - this._joy.oy;
          const len = Math.sqrt(rawX * rawX + rawY * rawY) || 1;
          const clamped = Math.min(len, JOYSTICK_MAX_R);
          this._joy.dx = (rawX / len) * (clamped / JOYSTICK_MAX_R);
          this._joy.dy = (rawY / len) * (clamped / JOYSTICK_MAX_R);
          const knobX = (rawX / len) * clamped;
          const knobY = (rawY / len) * clamped;
          this._updateJoystickDOM(this._joy.ox, this._joy.oy, knobX, knobY);
        }
        // Look
        if (this._look.active && t.identifier === this._look.id) {
          this.yaw -= (t.clientX - this._look.lx) * TOUCH_SENSITIVITY;
          this.pitch -= (t.clientY - this._look.ly) * TOUCH_SENSITIVITY;
          this._clampPitch();
          this._look.lx = t.clientX;
          this._look.ly = t.clientY;
        }
      }
    }, { passive: false });

    const onEnd = (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        // Double-tap → jump: only counts if finger barely moved and lifted quickly
        const tap = this._tapTouches[t.identifier];
        if (tap) {
          const dt  = Date.now() - tap.startTime;
          const mov = Math.hypot(t.clientX - tap.startX, t.clientY - tap.startY);
          if (dt < 220 && mov < 14) {
            const now = Date.now();
            if (now - this._lastTapTime < 320) this._jump();
            this._lastTapTime = now;
          }
          delete this._tapTouches[t.identifier];
        }

        if (this._joy.active && t.identifier === this._joy.id) {
          this._joy = { active: false, id: -1, ox: 0, oy: 0, dx: 0, dy: 0 };
          this._hideJoystickDOM();
        }
        if (this._look.active && t.identifier === this._look.id) {
          this._look = { active: false, id: -1, lx: 0, ly: 0 };
        }
      }
    };
    el.addEventListener('touchend', onEnd, { passive: false });
    el.addEventListener('touchcancel', onEnd, { passive: false });
  }

  _updateJoystickDOM(bx, by, kx, ky) {
    const base = document.getElementById('joy-base');
    const knob = document.getElementById('joy-knob');
    if (!base || !knob) return;
    base.style.display = 'block';
    knob.style.display = 'block';
    base.style.left = bx + 'px';
    base.style.top  = by + 'px';
    knob.style.left = (bx + kx) + 'px';
    knob.style.top  = (by + ky) + 'px';
  }

  _hideJoystickDOM() {
    const base = document.getElementById('joy-base');
    const knob = document.getElementById('joy-knob');
    if (base) base.style.display = 'none';
    if (knob) knob.style.display = 'none';
  }

  // ── Per-frame update ─────────────────────────────────────────────────────

  update(dt) {
    if (!this.isTouch && !this.isLocked) return;

    const sinY = Math.sin(this.yaw);
    const cosY = Math.cos(this.yaw);
    // Forward = -Z direction at yaw=0; right = +X
    const fwdX = -sinY, fwdZ = -cosY;
    const rgtX =  cosY, rgtZ = -sinY;

    let moveX = 0, moveZ = 0;

    if (this.isTouch) {
      if (this._joy.active) {
        // Joystick: screen-right = strafe, screen-up (negative dy) = forward
        moveX = fwdX * (-this._joy.dy) + rgtX * this._joy.dx;
        moveZ = fwdZ * (-this._joy.dy) + rgtZ * this._joy.dx;
      }
    } else {
      if (this.keys.w) { moveX += fwdX; moveZ += fwdZ; }
      if (this.keys.s) { moveX -= fwdX; moveZ -= fwdZ; }
      if (this.keys.d) { moveX += rgtX; moveZ += rgtZ; }
      if (this.keys.a) { moveX -= rgtX; moveZ -= rgtZ; }
    }

    this.isMoving = moveX !== 0 || moveZ !== 0;

    if (this.isMoving) {
      const len   = Math.sqrt(moveX * moveX + moveZ * moveZ);
      const speed = PLAYER_SPEED * (this.keys.shift ? 2.2 : 1.0);
      const step  = speed * dt;
      const resolved = resolveCollision(
        this.pos.x + (moveX / len) * step,
        this.pos.z + (moveZ / len) * step,
        PLAYER_RADIUS
      );
      this.pos.x = resolved.x;
      this.pos.z = resolved.z;
    }

    // Gravity + jump arc
    if (!this.isGrounded) {
      this.velY   += GRAVITY * dt;
      this.pos.y  += this.velY * dt;
      if (this.pos.y <= PLAYER_EYE) {
        this.pos.y      = PLAYER_EYE;
        this.velY       = 0;
        this.isGrounded = true;
      }
    }

    this.camera.position.copy(this.pos);
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  _jump() {
    if (this.isGrounded) {
      this.velY       = JUMP_VEL;
      this.isGrounded = false;
    }
  }

  _clampPitch() {
    const limit = Math.PI / 2 - 0.01;
    this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
  }
}
