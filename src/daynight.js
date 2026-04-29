import * as THREE from 'three';

const DAY_REAL_SECONDS = 120; // one full in-game day = 2 real minutes
const START_HOUR       = 14.5; // 2:30 PM on page load

let _elapsed = 0;

export function createDayNight(scene, sky, sun, ambient, hemi) {
  const streetLights = [];

  function addStreetLight(x, z) {
    if (streetLights.length >= 22) return;
    const pl = new THREE.PointLight(0xffdd88, 0, 72, 1.6);
    pl.position.set(x, 4.5, z);
    scene.add(pl);
    streetLights.push(pl);
  }

  function update(dt) {
    _elapsed += dt;
    const hour = (START_HOUR + (_elapsed / DAY_REAL_SECONDS) * 24) % 24;

    const isDay  = hour >= 5.5 && hour <= 18.5;
    const isDawn = hour >= 5.5 && hour < 8.5;
    const isDusk = hour > 15.5 && hour <= 18.5;

    if (isDay) {
      const t = (hour - 6) / 12; // 0→sunrise, 0.5→noon, 1→sunset
      const elev = Math.sin(t * Math.PI);

      const phi   = Math.PI * 0.5 - elev * Math.PI * 0.48;
      const theta = THREE.MathUtils.degToRad(200);
      sky.material.uniforms.sunPosition.value.setFromSphericalCoords(1, phi, theta);
      sky.material.uniforms.turbidity.value = 6;
      sky.material.uniforms.rayleigh.value  = isDawn || isDusk ? 3.8 : 1.8;

      sun.intensity = Math.max(0, elev) * 2.5;
      sun.color.setHSL(isDawn || isDusk ? 0.05 : 0.09, 0.7, 0.7);

      ambient.color.setHex(isDawn || isDusk ? 0x402020 : 0x404060);
      ambient.intensity = 0.6 + elev * 0.6;

      hemi.intensity = 0.35 + elev * 0.45;

      scene.fog.color.setHex(isDawn || isDusk ? 0xc08060 : 0xc8d8e8);

      for (const l of streetLights) l.intensity = 0;
    } else {
      // Night
      sky.material.uniforms.sunPosition.value.set(0, -1, 0);
      sky.material.uniforms.turbidity.value = 2;
      sky.material.uniforms.rayleigh.value  = 0.5;

      sun.intensity     = 0;
      ambient.color.setHex(0x0e1e30);
      ambient.intensity = 0.35;
      hemi.intensity    = 0.12;
      scene.fog.color.setHex(0x08101e);

      for (const l of streetLights) l.intensity = 2.8;
    }
  }

  return { update, addStreetLight };
}
