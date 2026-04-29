const SIZE = 182;
const PAD  = 10;

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

export function createMinimap(streets, project) {
  // World-space bounds from street nodes
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const { nodes } of streets) {
    for (const n of nodes) {
      const p = project(n.lat, n.lon);
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
    }
  }

  const span  = Math.max(maxX - minX, maxZ - minZ) || 1;
  const draw  = SIZE - PAD * 2;
  const scale = draw / span;
  const offX  = PAD - minX * scale;
  const offZ  = PAD - minZ * scale;

  function toMap(wx, wz) {
    return [wx * scale + offX, wz * scale + offZ];
  }

  // ── Static background ─────────────────────────────────────────────────────
  const bg    = document.createElement('canvas');
  bg.width = bg.height = SIZE;
  const bgCtx = bg.getContext('2d');

  bgCtx.fillStyle = 'rgba(10,16,26,0.90)';
  bgCtx.fillRect(0, 0, SIZE, SIZE);

  for (const { nodes, highway } of streets) {
    bgCtx.strokeStyle = highway === 'primary' || highway === 'secondary'
      ? 'rgba(160,175,200,0.65)'
      : 'rgba(110,130,155,0.45)';
    bgCtx.lineWidth = highway === 'primary' ? 2.2 : 1.2;
    bgCtx.beginPath();
    let first = true;
    for (const n of nodes) {
      const p = project(n.lat, n.lon);
      const [mx, mz] = toMap(p.x, p.z);
      first ? bgCtx.moveTo(mx, mz) : bgCtx.lineTo(mx, mz);
      first = false;
    }
    bgCtx.stroke();
  }

  // ── Live overlay canvas ───────────────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  Object.assign(canvas.style, {
    position:      'fixed',
    top:           '14px',
    right:         '14px',
    width:         SIZE + 'px',
    height:        SIZE + 'px',
    borderRadius:  '9px',
    border:        '1px solid rgba(255,255,255,0.13)',
    pointerEvents: 'none',
    zIndex:        '90',
  });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  return {
    update(playerPos, yaw) {
      ctx.clearRect(0, 0, SIZE, SIZE);

      // Clipped background
      ctx.save();
      roundRect(ctx, 0, 0, SIZE, SIZE, 9);
      ctx.clip();
      ctx.drawImage(bg, 0, 0);

      const [px, pz] = toMap(playerPos.x, playerPos.z);

      // Player arrow
      ctx.save();
      ctx.translate(px, pz);
      ctx.rotate(yaw);
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(5, 6);
      ctx.lineTo(0, 3);
      ctx.lineTo(-5, 6);
      ctx.closePath();
      ctx.fillStyle   = '#ff4c4c';
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth   = 1.2;
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.restore();
    },
  };
}
