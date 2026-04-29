import * as THREE from 'three';

// ── Glass / curtain-wall facade ───────────────────────────────────────────────
// One tile = one window unit (4 m wide × 3.5 m tall in world space)
export function createGlassFacadeTexture() {
  const W = 512, H = 448;
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Dark aluminium spandrel frame
  ctx.fillStyle = '#1c2228';
  ctx.fillRect(0, 0, W, H);

  const SLAB = 56; // floor slab / spandrel panel height (px)
  const COL  = 30; // vertical column/mullion width (px)

  // Floor slabs (horizontal bands at top & bottom)
  ctx.fillStyle = '#252c34';
  ctx.fillRect(0, 0, W, SLAB);
  ctx.fillRect(0, H - SLAB, W, SLAB);

  // Slab edge trim — thin lighter line
  ctx.fillStyle = '#38424c';
  ctx.fillRect(0, SLAB - 3, W, 3);
  ctx.fillRect(0, H - SLAB, W, 3);

  // Side columns
  ctx.fillStyle = '#181e24';
  ctx.fillRect(0, 0, COL, H);
  ctx.fillRect(W - COL, 0, COL, H);

  // Centre mullion
  const MX = W / 2;
  ctx.fillStyle = '#181e24';
  ctx.fillRect(MX - 7, SLAB, 14, H - SLAB * 2);

  // Glass panes — blue-teal gradient with sky reflection
  const paneTop = SLAB + 4;
  const paneBot = H - SLAB - 4;
  const paneH   = paneBot - paneTop;

  function drawPane(x1, x2) {
    const grad = ctx.createLinearGradient(x1, paneTop, x2, paneBot);
    grad.addColorStop(0,    '#3c5a74');
    grad.addColorStop(0.25, '#4c6a84');
    grad.addColorStop(0.65, '#3a5870');
    grad.addColorStop(1,    '#2c4260');
    ctx.fillStyle = grad;
    ctx.fillRect(x1, paneTop, x2 - x1, paneH);

    // Sky reflection (upper-left highlight)
    const ref = ctx.createLinearGradient(x1, paneTop, x1 + (x2 - x1) * 0.6, paneTop + paneH * 0.4);
    ref.addColorStop(0, 'rgba(180,215,255,0.22)');
    ref.addColorStop(1, 'rgba(180,215,255,0)');
    ctx.fillStyle = ref;
    ctx.fillRect(x1, paneTop, x2 - x1, paneH);

    // Lower darkness (depth)
    const dark = ctx.createLinearGradient(x1, paneBot - paneH * 0.3, x1, paneBot);
    dark.addColorStop(0, 'rgba(0,0,0,0)');
    dark.addColorStop(1, 'rgba(0,0,0,0.30)');
    ctx.fillStyle = dark;
    ctx.fillRect(x1, paneTop, x2 - x1, paneH);
  }

  drawPane(COL + 1, MX - 7);
  drawPane(MX + 7, W - COL - 1);

  // Subtle horizontal window-frame rail at mid-height
  ctx.fillStyle = 'rgba(24,30,36,0.7)';
  ctx.fillRect(COL, paneTop + paneH * 0.5 - 3, W - COL * 2, 6);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1 / 4, 1 / 3.5);
  return tex;
}

// ── Concrete / pre-cast facade ────────────────────────────────────────────────
// One tile = one window module (5 m wide × 4 m tall)
export function createConcreteTexture() {
  const W = 512, H = 512;
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Concrete base — warm medium grey
  ctx.fillStyle = '#b4aca0';
  ctx.fillRect(0, 0, W, H);

  // Subtle aggregate grain
  addGrain(ctx, W, H, 5000, 0.10);

  // Horizontal score lines (board-form or precast joint marks)
  ctx.strokeStyle = 'rgba(80,72,64,0.22)';
  ctx.lineWidth = 2;
  for (let y = 40; y < H; y += 80) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Window opening with recess shadow
  const WX = 90, WY = 80, WW = W - 180, WH = H - 180;
  ctx.fillStyle = '#888078';          // recess surround
  ctx.fillRect(WX - 14, WY - 14, WW + 28, WH + 28);
  ctx.fillStyle = '#0e1318';          // dark glass
  ctx.fillRect(WX, WY, WW, WH);

  // Window frame glint
  ctx.strokeStyle = 'rgba(160,150,140,0.5)';
  ctx.lineWidth = 3;
  ctx.strokeRect(WX, WY, WW, WH);

  // Interior glow (some rooms lit)
  ctx.fillStyle = 'rgba(255,225,150,0.06)';
  ctx.fillRect(WX + 4, WY + 4, WW - 8, WH - 8);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1 / 5, 1 / 4);
  return tex;
}

// ── Brick / masonry facade ────────────────────────────────────────────────────
// Running-bond pattern: 2 bricks wide × 2 rows tall
// Real brick ~230 mm × 65 mm, mortar ~10 mm → tile ≈ 0.50 m × 0.15 m
export function createBrickTexture() {
  const W = 512, H = 160;
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const MORTAR = 10;
  // 2 bricks + 3 mortar gaps across width
  const BW = (W - MORTAR * 3) / 2;  // ≈ 246 px per brick
  // 2 rows + 3 mortar gaps across height → BH ≈ 65 px
  const BH = (H - MORTAR * 3) / 2;

  const PALETTE = ['#9c3c1e','#a84428','#b04c2e','#8c3418','#a43c26','#b85030'];

  // Mortar
  ctx.fillStyle = '#cfc8bc';
  ctx.fillRect(0, 0, W, H);

  // Row 1 — two full bricks
  for (let i = 0; i < 2; i++) {
    const x = MORTAR + i * (BW + MORTAR);
    drawBrick(ctx, x, MORTAR, BW, BH, PALETTE);
  }

  // Row 2 — running bond (offset half brick)
  const row2Y = MORTAR + BH + MORTAR;
  const halfW = Math.round(BW / 2);

  // Left half-brick (right edge of previous column wraps here)
  drawBrick(ctx, 0, row2Y, halfW - MORTAR / 2, BH, PALETTE);

  // Centre full brick
  drawBrick(ctx, halfW + MORTAR / 2, row2Y, BW, BH, PALETTE);

  // Right partial brick
  const rx = halfW + MORTAR / 2 + BW + MORTAR;
  drawBrick(ctx, rx, row2Y, W - rx, BH, PALETTE);

  // Overall noise for surface texture
  addGrain(ctx, W, H, 3000, 0.07);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1 / 0.50, 1 / 0.15);
  return tex;
}

// ── Asphalt / street surface ──────────────────────────────────────────────────
export function createAsphaltTexture(worldSize) {
  const SIZE = 512;
  const canvas = makeCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, SIZE, SIZE);

  addGrain(ctx, SIZE, SIZE, 10000, 0.16);

  // Faint pavement block seams
  ctx.strokeStyle = 'rgba(90,90,90,0.28)';
  ctx.lineWidth = 1.5;
  const SEAMS = 4;
  for (let i = 1; i < SEAMS; i++) {
    const p = (i / SEAMS) * SIZE;
    ctx.beginPath(); ctx.moveTo(p, 0);    ctx.lineTo(p, SIZE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p);    ctx.lineTo(SIZE, p); ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  const rep = worldSize / 8; // one tile = 8 m
  tex.repeat.set(rep, rep);
  return tex;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function drawBrick(ctx, x, y, w, h, palette) {
  // Base color
  ctx.fillStyle = palette[Math.floor(Math.random() * palette.length)];
  ctx.fillRect(x, y, w, h);
  // Bottom shadow (depth illusion)
  const sh = ctx.createLinearGradient(x, y + h * 0.65, x, y + h);
  sh.addColorStop(0, 'rgba(0,0,0,0)');
  sh.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = sh;
  ctx.fillRect(x, y, w, h);
  // Top highlight
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(x, y, w, 4);
}

function addGrain(ctx, W, H, count, alpha) {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const bright = Math.random() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${bright},${bright},${bright},${alpha * Math.random()})`;
    ctx.beginPath();
    ctx.arc(x, y, Math.random() * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}
