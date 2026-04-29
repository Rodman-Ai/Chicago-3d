let _ctx = null;
let _stepAccum = 0;

function _boot() {
  if (_ctx) return;
  _ctx = new (window.AudioContext || window.webkitAudioContext)();

  // Low city rumble
  const hum = _ctx.createOscillator();
  hum.type = 'sawtooth';
  hum.frequency.value = 55;

  const humLP = _ctx.createBiquadFilter();
  humLP.type = 'lowpass';
  humLP.frequency.value = 100;

  const humGain = _ctx.createGain();
  humGain.gain.value = 0.022;

  hum.connect(humLP).connect(humGain).connect(_ctx.destination);
  hum.start();

  // Wind / ambient texture
  const bufSize = _ctx.sampleRate * 2;
  const buf = _ctx.createBuffer(1, bufSize, _ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

  const wind = _ctx.createBufferSource();
  wind.buffer = buf;
  wind.loop = true;

  const windBP = _ctx.createBiquadFilter();
  windBP.type = 'bandpass';
  windBP.frequency.value = 550;
  windBP.Q.value = 0.4;

  const windGain = _ctx.createGain();
  windGain.gain.value = 0.016;

  wind.connect(windBP).connect(windGain).connect(_ctx.destination);
  wind.start();
}

// Auto-boot on first user gesture
document.addEventListener('click',      _boot, { once: true });
document.addEventListener('touchstart', _boot, { once: true });

export function updateAudio(isMoving, dt) {
  if (!_ctx) return;

  _stepAccum += dt;
  const INTERVAL = 0.54; // seconds per footstep

  if (isMoving && _stepAccum >= INTERVAL) {
    _stepAccum = 0;
    // Short concrete-tap click
    const osc = _ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 110 + Math.random() * 50;

    const g = _ctx.createGain();
    g.gain.setValueAtTime(0.20, _ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, _ctx.currentTime + 0.07);

    osc.connect(g).connect(_ctx.destination);
    osc.start();
    osc.stop(_ctx.currentTime + 0.07);
  } else if (!isMoving) {
    _stepAccum = INTERVAL * 0.55; // restart phase close to next step
  }
}
