const loadingScreen = () => document.getElementById('loading-screen');
const loadingText = () => document.getElementById('loading-text');
const loadingBarInner = () => document.getElementById('loading-bar-inner');
const loadingError = () => document.getElementById('loading-error');
const crosshair = () => document.getElementById('crosshair');
const pointerLockOverlay = () => document.getElementById('pointer-lock-overlay');
const controlsHint = () => document.getElementById('controls-hint');

export function showLoading() {
  const s = loadingScreen();
  s.style.display = 'flex';
  s.style.opacity = '1';
  s.classList.remove('fade-out');
}

export function hideLoading() {
  const s = loadingScreen();
  s.classList.add('fade-out');
  crosshair().style.display = 'block';
  controlsHint().style.display = 'block';
  setTimeout(() => { s.style.display = 'none'; }, 700);
}

export function setLoadingText(msg) {
  loadingText().textContent = msg;
}

export function setLoadingProgress(fraction) {
  loadingBarInner().style.width = `${Math.round(fraction * 100)}%`;
}

export function showLoadingError(msg) {
  const el = loadingError();
  el.textContent = msg;
  el.style.display = 'block';
  setLoadingText('');
}

export function showPointerLockOverlay() {
  pointerLockOverlay().style.display = 'flex';
  crosshair().style.display = 'none';
}

export function hidePointerLockOverlay() {
  pointerLockOverlay().style.display = 'none';
  crosshair().style.display = 'block';
}
