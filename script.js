// Layout Lens — framed camera (Option A, FIXED CAPTURE VERSION)

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const dotBtn = document.getElementById('dotBtn');
const vertBtn = document.getElementById('vertBtn');
const horiBtn = document.getElementById('horiBtn');
const captureBtn = document.getElementById('captureBtn');
const switchBtn = document.getElementById('switchBtn');
const ratioBtns = Array.from(document.querySelectorAll('.ratioBtn'));
const currentRatioLabel = document.getElementById('currentRatio');

let mode = 'dot';
let dots = [];
let lines = [];
let selected = null;

let devices = [];
let currentDeviceIndex = 0;
let stream = null;

// frame rectangle state
let frame = { x: 0, y: 0, w: 0, h: 0, ratio: 1 };


// ---------------- CAMERA ----------------

async function enumerateDevices() {
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    devices = all.filter(d => d.kind === 'videoinput');
  } catch (e) { devices = []; }
}

async function startCameraPreferRear() {
  try {
    const s = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } }
    });
    attachStream(s);
    await enumerateDevices();
    return;
  } catch (e) {}

  try {
    const s2 = await navigator.mediaDevices.getUserMedia({ video: true });
    attachStream(s2);
    await enumerateDevices();
  } catch (err) {
    alert('Camera error: ' + (err.message || 'unknown'));
  }
}

function attachStream(s) {
  if (stream) stream.getTracks().forEach(t => t.stop());
  stream = s;
  video.srcObject = s;
}

async function switchCamera() {
  await enumerateDevices();
  if (!devices.length) return;

  currentDeviceIndex = (currentDeviceIndex + 1) % devices.length;
  const id = devices[currentDeviceIndex].deviceId;

  try {
    const s = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: id } }
    });
    attachStream(s);
  } catch (_) {
    await startCameraPreferRear();
  }
}


// ---------------- FRAME LOGIC ----------------

function computeFrame(ratio) {
  const W = canvas.width, H = canvas.height;
  const marginFactor = 0.92;
  let boxW, boxH;

  if (W / H > ratio) {
    boxH = H * marginFactor;
    boxW = boxH * ratio;
  } else {
    boxW = W * marginFactor;
    boxH = boxW / ratio;
  }

  const x = Math.round((W - boxW) / 2);
  const y = Math.round((H - boxH) / 2);
  frame = { x, y, w: Math.round(boxW), h: Math.round(boxH), ratio };

  currentRatioLabel.textContent =
    ratio === 1.618 ? "Golden" : (Math.round(ratio * 1000) / 1000);
}


// ---------------- DRAWING MASK & OVERLAY ----------------

function drawMaskAndBorder() {
  // mask OUTSIDE frame only
  ctx.fillStyle = 'rgba(0,0,0,0.45)';

  // top
  ctx.fillRect(0, 0, canvas.width, frame.y);
  // bottom
  ctx.fillRect(0, frame.y + frame.h, canvas.width, canvas.height - (frame.y + frame.h));
  // left
  ctx.fillRect(0, frame.y, frame.x, frame.h);
  // right
  ctx.fillRect(frame.x + frame.w, frame.y, canvas.width - (frame.x + frame.w), frame.h);

  // white border
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 3;
  ctx.strokeRect(frame.x + 1.5, frame.y + 1.5, frame.w - 3, frame.h - 3);
}

function redraw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // mask + frame
  drawMaskAndBorder();

  // dots
  dots.forEach(d => {
    ctx.fillStyle = 'rgba(255,59,48,0.95)';
    ctx.beginPath();
    ctx.arc(d.x, d.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // lines
  lines.forEach((l, idx) => {
    const sel = (idx === selected);
    ctx.strokeStyle = sel ? '#00ffff' : 'lime';
    ctx.lineWidth = sel ? 4 : 3;

    ctx.beginPath();
    if (l.orientation === 'vertical') {
      ctx.moveTo(l.x, frame.y);
      ctx.lineTo(l.x, frame.y + frame.h);
    } else {
      ctx.moveTo(frame.x, l.y);
      ctx.lineTo(frame.x + frame.w, l.y);
    }
    ctx.stroke();
  });
}


// ---------------- CANVAS RESIZE ----------------

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  computeFrame(frame.ratio || 1);
  redraw();
}
window.addEventListener('resize', resize);


// ---------------- INPUT HANDLING ----------------

function insideFrame(x, y) {
  return x >= frame.x && x <= frame.x + frame.w &&
         y >= frame.y && y <= frame.y + frame.h;
}

canvas.addEventListener('pointerdown', e => {
  const x = e.clientX, y = e.clientY;
  if (!insideFrame(x,y)) return;

  if (mode === 'dot') {
    dots.push({ x, y });
    redraw();
    return;
  }

  if (mode === 'vertical') {
    const cx = Math.max(frame.x, Math.min(frame.x + frame.w, x));
    lines.push({ orientation: 'vertical', x: cx });
    selected = lines.length - 1;
    redraw();
    return;
  }

  if (mode === 'horizontal') {
    const cy = Math.max(frame.y, Math.min(frame.y + frame.h, y));
    lines.push({ orientation: 'horizontal', y: cy });
    selected = lines.length - 1;
    redraw();
    return;
  }
});


// ---------------- BUTTONS ----------------

function setMode(m, id) {
  mode = m;
  [dotBtn, vertBtn, horiBtn].forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

dotBtn.onclick = () => setMode('dot','dotBtn');
vertBtn.onclick = () => setMode('vertical','vertBtn');
horiBtn.onclick = () => setMode('horizontal','horiBtn');

ratioBtns.forEach(btn =>
  btn.onclick = () => {
    ratioBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const raw = btn.dataset.r;
    const ratio = raw.includes('/') ? eval(raw) : parseFloat(raw);

    computeFrame(ratio);
    redraw();
  }
);


// ---------------- CAPTURE (FIXED) ----------------

captureBtn.onclick = () => {
  const tmp = document.createElement('canvas');
  tmp.width = canvas.width;
  tmp.height = canvas.height;
  const tctx = tmp.getContext('2d');

  // 1) draw underlying camera image
  tctx.drawImage(video, 0, 0, tmp.width, tmp.height);

  // 2) mask outside the frame (NO clearRect!)
  tctx.fillStyle = 'rgba(0,0,0,0.45)';

  // top
  tctx.fillRect(0, 0, tmp.width, frame.y);
  // bottom
  tctx.fillRect(0, frame.y + frame.h, tmp.width, tmp.height - (frame.y + frame.h));
  // left
  tctx.fillRect(0, frame.y, frame.x, frame.h);
  // right
  tctx.fillRect(frame.x + frame.w, frame.y, tmp.width - (frame.x + frame.w), frame.h);

  // border
  tctx.strokeStyle = 'rgba(255,255,255,0.95)';
  tctx.lineWidth = 3;
  tctx.strokeRect(frame.x + 1.5, frame.y + 1.5, frame.w - 3, frame.h - 3);

  // 3) dots
  dots.forEach(d => {
    tctx.fillStyle = 'rgba(255,59,48,0.95)';
    tctx.beginPath();
    tctx.arc(d.x, d.y, 8, 0, Math.PI * 2);
    tctx.fill();
    tctx.strokeStyle = '#fff';
    tctx.lineWidth = 2;
    tctx.stroke();
  });

  // 4) lines
  lines.forEach(l => {
    tctx.strokeStyle = 'lime';
    tctx.lineWidth = 4;
    tctx.beginPath();
    if (l.orientation === 'vertical') {
      tctx.moveTo(l.x, frame.y);
      tctx.lineTo(l.x, frame.y + frame.h);
    } else {
      tctx.moveTo(frame.x, l.y);
      tctx.lineTo(frame.x + frame.w, l.y);
    }
    tctx.stroke();
  });

  // 5) export to PNG
  const url = tmp.toDataURL('image/png');
  const win = window.open();
  win.document.write(`<img src="${url}" style="width:100%;">`);
};


// ---------------- INIT ----------------

(async function start() {
  await startCameraPreferRear();
  await enumerateDevices();
  computeFrame(1); // default 1:1
  resize();

  // continuous loop keeps the overlay updated smoothly
  function loop() {
    redraw();
    requestAnimationFrame(loop);
  }
  loop();
})();
