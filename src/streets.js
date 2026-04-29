import * as THREE from 'three';

// One sign per unique street name, placed at the average position of all its segments.
export function buildStreetLabels(streets, project) {
  // Group projected midpoints by name
  const byName = new Map();
  for (const { name, nodes } of streets) {
    if (!name) continue;
    const mid = nodes[Math.floor(nodes.length / 2)];
    if (!mid) continue;
    const p = project(mid.lat, mid.lon);
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(p);
  }

  const sprites = [];
  for (const [name, positions] of byName) {
    const avgX = positions.reduce((s, p) => s + p.x, 0) / positions.length;
    const avgZ = positions.reduce((s, p) => s + p.z, 0) / positions.length;

    const sprite = makeSign(name);
    sprite.position.set(avgX, 8, avgZ);
    sprites.push(sprite);
  }
  return sprites;
}

// Sprite height in world metres
const SIGN_H = 10;

function makeSign(name) {
  const W = 512, H = 88;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Chicago dark-green sign background with rounded corners
  roundRect(ctx, 3, 3, W - 6, H - 6, 10);
  ctx.fillStyle = '#1a5c1a';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // White border inset
  roundRect(ctx, 9, 9, W - 18, H - 18, 6);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Street name — scale font so it fits
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = name.toUpperCase();
  let fontSize = 42;
  ctx.font = `bold ${fontSize}px -apple-system, Arial, sans-serif`;
  while (ctx.measureText(label).width > W - 40 && fontSize > 18) {
    fontSize -= 2;
    ctx.font = `bold ${fontSize}px -apple-system, Arial, sans-serif`;
  }
  ctx.fillText(label, W / 2, H / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(SIGN_H * (W / H), SIGN_H, 1);
  return sprite;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
