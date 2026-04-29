const $ = (id) => document.getElementById(id);

export function showLoading() {
  const s = $('loading-screen');
  s.style.display = 'flex';
  s.style.opacity = '1';
  s.classList.remove('fade-out');
}

export function hideLoading() {
  const s = $('loading-screen');
  s.classList.add('fade-out');
  setTimeout(() => { s.style.display = 'none'; }, 700);
}

export function setLoadingText(msg) {
  $('loading-text').textContent = msg;
}

export function setLoadingProgress(fraction) {
  $('loading-bar-inner').style.width = `${Math.round(fraction * 100)}%`;
}

export function showLoadingError(msg) {
  const el = $('loading-error');
  el.textContent = msg;
  el.style.display = 'block';
  setLoadingText('');
}

// Desktop pointer-lock overlay
export function showPointerLockOverlay() {
  $('pointer-lock-overlay').style.display = 'flex';
  $('crosshair').style.display = 'none';
}

export function hidePointerLockOverlay() {
  $('pointer-lock-overlay').style.display = 'none';
  $('crosshair').style.display = 'block';
}

// Touch / mobile UI
export function showTouchUI() {
  $('pointer-lock-overlay').style.display = 'none';
  $('crosshair').style.display = 'none';
  $('touch-hint').style.display = 'block';
  $('touch-divider').style.display = 'block';
}
