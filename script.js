const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let dots = [];
let lines = [];
let selected = null;

let mode = "dot";
let currentStream = null;
let devices = [];
let currentDeviceIndex = 0;

// ---------- Camera Setup ----------
async function listCameras() {
  const devs = await navigator.mediaDevices.enumerateDevices();
  devices = devs.filter(d => d.kind === "videoinput");
}

async function startCamera(index = 0) {
  if (!devices.length) await listCameras();

  if (currentStream) {
    currentStream.getTracks().forEach(t => t.stop());
  }

  const deviceId = devices[index]?.deviceId;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { deviceId: deviceId ? { exact: deviceId } : undefined }
  });

  currentStream = stream;
  video.srcObject = stream;
}

async function init() {
  await listCameras();
  await startCamera(0); // Start with front cam
  resizeCanvas();
}

init();

// ---------- Canvas ----------
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.onresize = resizeCanvas;

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // dots
  dots.forEach(d => {
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(d.x, d.y, 10, 0, Math.PI * 2);
    ctx.fill();
  });

  // lines
  lines.forEach((l, i) => {
    ctx.strokeStyle = i === selected ? "#00ffff" : "lime";
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(l.x1, l.y1);
    ctx.lineTo(l.x2, l.y2);
    ctx.stroke();
  });
}

// ---------- Interaction ----------
canvas.addEventListener("pointerdown", e => {
  const x = e.clientX;
  const y = e.clientY;

  if (mode === "dot") {
    dots.push({ x, y });
    redraw();
    return;
  }

  if (mode === "vertical") {
    lines.push({
      x1: x,
      y1: 0,
      x2: x,
      y2: canvas.height
    });
    selected = lines.length - 1;
    redraw();
    return;
  }

  if (mode === "horizontal") {
    lines.push({
      x1: 0,
      y1: y,
      x2: canvas.width,
      y2: y
    });
    selected = lines.length - 1;
    redraw();
    return;
  }
});

// ---------- Buttons ----------
document.getElementById("dotBtn").onclick = () => {
  mode = "dot";
  activate("dotBtn");
};

document.getElementById("vertBtn").onclick = () => {
  mode = "vertical";
  activate("vertBtn");
};

document.getElementById("horiBtn").onclick = () => {
  mode = "horizontal";
  activate("horiBtn");
};

function activate(id) {
  ["dotBtn", "vertBtn", "horiBtn"].forEach(btn => {
    document.getElementById(btn).classList.remove("active");
  });
  document.getElementById(id).classList.add("active");
}

// ---------- SWITCH CAMERA ----------
document.getElementById("switchBtn").onclick = async () => {
  currentDeviceIndex = (currentDeviceIndex + 1) % devices.length;
  await startCamera(currentDeviceIndex);
};

// ---------- CAPTURE BUTTON ----------
document.getElementById("captureBtn").onclick = () => {
  // Create a merged canvas
  const temp = document.createElement("canvas");
  temp.width = canvas.width;
  temp.height = canvas.height;
  const tctx = temp.getContext("2d");

  // Draw video
  tctx.drawImage(video, 0, 0, temp.width, temp.height);

  // Draw dots
  dots.forEach(d => {
    tctx.fillStyle = "red";
    tctx.beginPath();
    tctx.arc(d.x, d.y, 10, 0, Math.PI * 2);
    tctx.fill();
  });

  // Draw lines
  lines.forEach((l) => {
    tctx.strokeStyle = "lime";
    tctx.lineWidth = 4;
    tctx.beginPath();
    tctx.moveTo(l.x1, l.y1);
    tctx.lineTo(l.x2, l.y2);
    tctx.stroke();
  });

  // Convert to PNG
  const url = temp.toDataURL("image/png");

  // Open the image
  const win = window.open();
  win.document.write("<img src='" + url + "' style='width:100%;' />");
};
