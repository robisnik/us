/* Smoothness comes from three things here, and all three matter:
 *
 *   1. A fixed simulation step. Physics never sees a variable dt, so a spring
 *      behaves identically on a 60Hz phone and a 120Hz one, and a dropped
 *      frame cannot change how anything moves.
 *   2. Interpolated rendering. The renderer draws BETWEEN the last two
 *      simulated states using the leftover time. Without this, a fixed step
 *      judders whenever the display refresh and the step rate disagree.
 *   3. Nothing snaps. No rounding of positions, no velocity cut-off at a
 *      threshold — those are single-frame discontinuities and the eye reads
 *      every one of them.
 */

import {STATIONS} from './stations.js';
import {P} from './theme.js';
import * as card from './card.js';

const STEP = 1 / 120;          // fixed simulation step
const MAX_FRAME = 0.25;
const SPACING = 420;           // distance between stations
const FIRST = 300;             // he starts short of the first one, not on it
const REACH = 150;             // how close counts as "at" a station

/* What is actually out there.
 *
 * With a story it is his moments, each at the station its kind belongs to.
 * Without one it falls back to showing every station once, so the app still
 * runs and still lets him compare them. The fallback is not a placeholder for
 * the story — it is the tool he chose the set with, and it stays useful. */
let placed = STATIONS.map((st, i) => ({
  x: FIRST + i * SPACING,
  station: st,
  moment: null,
  label: `${i + 1}  ${st.name}`,
  sub: st.role,
}));

const byName = Object.fromEntries(STATIONS.map(s => [s.name, s]));

/* The opening. It is dismissed by a tap anywhere, and the tap that dismisses
 * it does nothing else — landing in the world and immediately walking because
 * the same touch was still counted would feel like a slip. */
function showIntro({title, body}) {
  const el = document.getElementById('intro');
  document.getElementById('intro-title').textContent = title || '';
  const b = document.getElementById('intro-body');
  b.innerHTML = '';
  for (const line of String(body || '').split('\n')) {
    if (!line.trim()) continue;
    const p = document.createElement('p');
    p.textContent = line.trim();
    b.append(p);
  }
  el.hidden = false;
  const go = () => {
    el.classList.add('going');
    setTimeout(() => { el.hidden = true; }, 750);
  };
  el.addEventListener('pointerup', go, {once: true});
}

async function loadStory() {
  try {
    const r = await fetch('content/story/story.json', {cache: 'no-cache'});
    if (!r.ok) return;
    const {moments, intro} = await r.json();
    if (intro) showIntro(intro);
    if (!Array.isArray(moments) || !moments.length) return;
    placed = moments.map((m, i) => ({
      x: FIRST + i * SPACING,
      station: byName[m.station] || byName.photo,
      moment: m,
      label: m.title || '',
      sub: m.when || '',
    }));
  } catch {}
}
loadStory();

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const hud = document.getElementById('hud');

let W = 0, H = 0, dpr = 1;

function resize() {
  dpr = Math.min(3, window.devicePixelRatio || 1);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', resize);
resize();

/* ---- state ------------------------------------------------------------- */

const slime = {x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, r: 34};
const cam = {x: 0, y: 0, px: 0, py: 0};

const N = 26;
const rim = Array.from({length: N}, () => ({o: 0, v: 0, po: 0}));

let pending = 0, pendingY = 0;   // drag not yet consumed by the simulation
let clock = 0;

/* ---- the blob ---------------------------------------------------------- */

const MAX_O = 0.34, MAX_RIM_V = 4;
const DRIVE = 0.00038, MAX_DRIVE = 0.34;

function stepBlob(h, ax, ay) {
  const K = 150, D = 7, VISC = 9;

  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    let push = -(Math.cos(a) * ax + Math.sin(a) * ay) * DRIVE;
    if (push > MAX_DRIVE) push = MAX_DRIVE;
    else if (push < -MAX_DRIVE) push = -MAX_DRIVE;
    const p = rim[i];
    p.v += (-K * p.o + push * K - D * p.v) * h;
  }
  for (let i = 0; i < N; i++) {
    const l = rim[(i - 1 + N) % N], r = rim[(i + 1) % N], p = rim[i];
    p.v += ((l.o + r.o) / 2 - p.o) * VISC * h;
  }
  for (const p of rim) {
    if (p.v > MAX_RIM_V) p.v = MAX_RIM_V;
    else if (p.v < -MAX_RIM_V) p.v = -MAX_RIM_V;
    p.po = p.o;
    p.o += p.v * h;
    if (p.o > MAX_O) { p.o = MAX_O; if (p.v > 0) p.v = 0; }
    else if (p.o < -MAX_O) { p.o = -MAX_O; if (p.v < 0) p.v = 0; }
  }

  /* A slow breath so he is never a plain ellipse when standing still. */
  const calm = 1 - Math.min(1, Math.hypot(slime.vx, slime.vy) / 220);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    rim[i].o += Math.sin(clock * 1.6 + a * 3) * 0.0022 * calm * h * 60;
  }
}

function simulate(h) {
  clock += h;

  /* The drag is spread across the steps of this frame rather than dumped into
   * one, which is what stops a fast flick from arriving as a spike. */
  const takeX = pending * 0.35, takeY = pendingY * 0.35;
  pending -= takeX; pendingY -= takeY;

  const ax = takeX / h, ay = takeY / h;
  slime.vx += takeX * 9;
  slime.vy += takeY * 9;

  const MAX_SPEED = 1500;
  const sp = Math.hypot(slime.vx, slime.vy);
  if (sp > MAX_SPEED) { slime.vx *= MAX_SPEED / sp; slime.vy *= MAX_SPEED / sp; }

  const friction = Math.exp(-4 * h);
  slime.vx *= friction;
  slime.vy *= friction;

  slime.px = slime.x; slime.py = slime.y;
  slime.x += slime.vx * h;
  slime.y += slime.vy * h;

  stepBlob(h, ax, ay);

  cam.px = cam.x; cam.py = cam.y;
  const k = 1 - Math.exp(-7 * h);
  cam.x += (slime.x - cam.x) * k;
  cam.y += (slime.y * 0.35 - cam.y) * k;
}

/* ---- drawing ----------------------------------------------------------- */

function drawSlime(sx, sy, alpha) {
  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const o = rim[i].po + (rim[i].o - rim[i].po) * alpha;
    const rr = slime.r * (1 + o);
    pts.push([sx + Math.cos(a) * rr, sy + Math.sin(a) * rr * 0.92]);
  }

  ctx.beginPath();
  const [lx, ly] = pts[N - 1];
  ctx.moveTo((lx + pts[0][0]) / 2, (ly + pts[0][1]) / 2);
  for (let i = 0; i < N; i++) {
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[(i + 1) % N];
    ctx.quadraticCurveTo(cx, cy, (cx + nx) / 2, (cy + ny) / 2);
  }
  ctx.closePath();
  ctx.fillStyle = P.sage;
  ctx.fill();

  const dir = Math.abs(slime.vx) > 6 ? Math.sign(slime.vx) : 1;
  ctx.fillStyle = '#12241f';
  for (const off of [-9, 6]) {
    ctx.beginPath();
    ctx.arc(sx + (off + 2) * dir, sy - 6, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function render(alpha) {
  const cx = cam.px + (cam.x - cam.px) * alpha;
  const cy = cam.py + (cam.y - cam.py) * alpha;
  const sx = slime.px + (slime.x - slime.px) * alpha;
  const sy = slime.py + (slime.y - slime.py) * alpha;

  ctx.fillStyle = '#f4f4f0';
  ctx.fillRect(0, 0, W, H);

  const gy = H * 0.68 - cy;

  /* The ground: one hairline. Enough to say which way is down without the
   * grid coming back. */
  ctx.strokeStyle = '#e2dfd6';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, gy + 0.5); ctx.lineTo(W, gy + 0.5); ctx.stroke();

  let nearest = null, nearestD = Infinity;
  for (const it of placed) {
    const d = Math.abs(it.x - slime.x);
    if (d < nearestD) { nearestD = d; nearest = it; }

    const px = it.x - cx + W / 2;
    if (px < -160 || px > W + 160) continue;

    const near = Math.max(0, 1 - d / 200);
    it.station.draw(ctx, px, gy, clock, near);

    ctx.textAlign = 'center';
    ctx.font = '11px ui-monospace, Menlo, monospace';
    ctx.fillStyle = near > 0.05 ? P.ink : P.inkSoft;
    ctx.fillText(it.label, px, gy + 24);
    if (it.sub) {
      ctx.font = '10px ui-monospace, Menlo, monospace';
      ctx.fillStyle = P.inkSoft;
      ctx.globalAlpha = 0.55 + near * 0.45;
      ctx.fillText(it.sub, px, gy + 39);
      ctx.globalAlpha = 1;
    }
  }
  ctx.textAlign = 'left';

  /* World y = 0 is the ground line. The blob's centre sits one vertical radius
   * above it, so it rests on the line rather than through it. */
  drawSlime(sx - cx + W / 2, sy - cy + H * 0.68 - slime.r * 0.92, alpha);

  /* One line, and only when there is something to do. A readout that is
   * always on becomes furniture and stops being read. */
  const atOne = nearest && nearestD < REACH && nearest.moment && !card.isOpen();
  hud.textContent = atOne ? 'tap to read' : '';
  hud.style.opacity = atOne ? '1' : '0';
}

/* ---- input ------------------------------------------------------------- */

let dragging = false, pid = null, lastX = 0, lastY = 0;
let downX = 0, downY = 0;
const TAP_SLOP = 8;            // css pixels of travel still counted as a tap

canvas.addEventListener('pointerdown', e => {
  if (pid !== null) return;
  pid = e.pointerId; dragging = true;
  lastX = downX = e.clientX; lastY = downY = e.clientY;
  try { canvas.setPointerCapture(pid); } catch {}
});

canvas.addEventListener('pointermove', e => {
  if (!dragging || e.pointerId !== pid) return;
  pending += e.clientX - lastX;
  pendingY += e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
});

/* Every plausible end of a press releases: a lost pointerup is routine on a
 * phone, and a drag that never ends would push him away forever. */
const release = e => {
  if (e && e.pointerId != null && pid !== null && e.pointerId !== pid) return;

  /* A press that never really moved, while standing at something with
   * something to say, opens it. A drag is a drag and opens nothing. */
  if (dragging && e && e.clientX != null &&
      Math.hypot(e.clientX - downX, e.clientY - downY) <= TAP_SLOP) {
    const at = atStation();
    if (at) { slime.vx = slime.vy = 0; card.open(at.moment); }
  }
  dragging = false; pid = null;
};

/* The nearest thing within reach that has something behind it. */
function atStation() {
  let best = null, bestD = REACH;
  for (const it of placed) {
    if (!it.moment) continue;
    const d = Math.abs(it.x - slime.x);
    if (d < bestD) { bestD = d; best = it; }
  }
  return best;
}
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('lostpointercapture', release);
addEventListener('pointerup', release);
addEventListener('blur', () => release());
document.addEventListener('visibilitychange', () => { if (document.hidden) release(); });

/* ---- loop -------------------------------------------------------------- */

let last = 0, acc = 0;

function frame(now) {
  requestAnimationFrame(frame);
  if (!last) { last = now; return; }
  let dt = (now - last) / 1000;
  last = now;
  if (dt > MAX_FRAME) dt = MAX_FRAME;

  acc += dt;
  while (acc >= STEP) { simulate(STEP); acc -= STEP; }
  render(acc / STEP);
}
requestAnimationFrame(frame);

/* Dev handle, localhost only: jump straight to a station to compare them
 * without dragging the whole way there. */
if (['localhost', '127.0.0.1'].includes(location.hostname)) {
  window.__dev = {
    slime, cam, STATIONS,
    get placed() { return placed; },
    open: i => placed[i]?.moment && card.open(placed[i].moment),
    jump(i) {
      /* Stand him beside it, not on top of it. */
      const x = (placed[i]?.x ?? FIRST + i * SPACING) - 110;
      slime.x = slime.px = x; slime.y = slime.py = 0;
      slime.vx = slime.vy = 0;
      cam.x = cam.px = x; cam.y = cam.py = 0;
    },
  };
}
