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
import {heightAt, slopeAt, paletteAt, scatter, REGIONS, WORLD_END} from './terrain.js';

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
    /* Spread across the whole world rather than in a queue. His story is
     * chronological and the regions are in the same order, so walking it is
     * walking the year — school, Vienna, the parks, the beach, the lake, the
     * airport, now. */
    const usable = WORLD_END - FIRST * 2;
    placed = moments.map((m, i) => ({
      x: FIRST + (moments.length === 1 ? 0 : (i / (moments.length - 1)) * usable),
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

/* Traversal.
 *
 * He was pinned to the ground and dragged along it, which is a scrubbing
 * gesture, not a character. Gravity, a leap and air control turn the same land
 * into something to move THROUGH. */
const GRAVITY   = 2100;
const JUMP      = 720;
const AIR_CTRL  = 0.42;     // how much a drag steers him mid-air
const COYOTE    = 0.10;     // grace after walking off an edge
const BUFFER    = 0.14;     // a leap asked for just before landing still counts
const MAX_FALL  = 1500;

let grounded = false, coyote = 0, buffered = 0, airborne = 0, lastLanding = 0;
const cam = {x: 0, y: 0, px: 0, py: 0};

const N = 26;
const rim = Array.from({length: N}, () => ({o: 0, v: 0, po: 0}));

let pending = 0;                 // drag not yet consumed by the simulation
let clock = 0;

/* ---- the blob ---------------------------------------------------------- */

const MAX_O = 0.34, MAX_RIM_V = 4;
const DRIVE = 0.00038, MAX_DRIVE = 0.34;

/* A leap. Allowed for a moment after walking off an edge, and remembered for
 * a moment if asked for just before landing — both are invisible and both are
 * the difference between a jump that feels responsive and one that feels
 * broken. */
function leap() {
  if (!grounded && coyote <= 0) { buffered = BUFFER; return false; }
  slime.vy = -JUMP;
  grounded = false;
  coyote = 0;
  airborne = 0.001;
  /* Stretch on the way up. */
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    rim[i].v += Math.sin(a) * 3.2;
  }
  return true;
}

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
  const takeX = pending * 0.35, takeY = 0;
  pending -= takeX;

  const ax = takeX / h, ay = takeY / h;

  /* Drag steers. On the ground it is most of his speed; in the air it is a
   * nudge, so a leap commits and cannot be flown. */
  slime.vx += takeX * 9 * (grounded ? 1 : AIR_CTRL);

  if (grounded) {
    /* Climbing costs a little, descending gives it back — enough to feel the
     * land, not enough to fight her. */
    slime.vx *= 1 - Math.max(0, slopeAt(slime.x) * Math.sign(slime.vx)) * 0.12;
  }

  const MAX_SPEED = 1500;
  const sp = Math.abs(slime.vx);
  if (sp > MAX_SPEED) slime.vx *= MAX_SPEED / sp;

  /* Ground drag is heavy so he settles; air drag is almost nothing so an arc
   * stays an arc. */
  slime.vx *= Math.exp(-(grounded ? 4 : 0.5) * h);

  slime.vy = Math.min(MAX_FALL, slime.vy + GRAVITY * h);

  slime.px = slime.x; slime.py = slime.y;
  slime.x = Math.max(-400, Math.min(WORLD_END + 400, slime.x + slime.vx * h));
  slime.y += slime.vy * h;

  /* Land. Screen coordinates, so larger y is lower and the ground is a
   * ceiling from below. */
  const g = heightAt(slime.x);
  coyote = Math.max(0, coyote - h);
  buffered = Math.max(0, buffered - h);

  if (slime.y >= g) {
    if (!grounded && airborne > 0.12) {
      /* Landing shoves the rim: the blob flattens on impact rather than
       * arriving as a circle. */
      lastLanding = Math.min(1, slime.vy / 900);
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        rim[i].v -= Math.sin(a) * lastLanding * 5.5;
      }
    }
    slime.y = g;
    slime.vy = 0;
    grounded = true;
    coyote = COYOTE;
    airborne = 0;
    if (buffered > 0) { leap(); buffered = 0; }
  } else {
    grounded = false;
    airborne += h;
  }

  stepBlob(h, ax, ay);

  cam.px = cam.x; cam.py = cam.y;
  const k = 1 - Math.exp(-7 * h);
  cam.x += (slime.x - cam.x) * k;
  /* The camera follows the climb more slowly than the walk, so cresting a
   * hill reveals what is beyond it rather than snapping to it. */
  cam.y += (slime.y - cam.y) * k * 0.55;
}

/* ---- drawing ----------------------------------------------------------- */

/* Light. He is the brightest thing in a pale world, and the glow is what makes
 * him read as alive rather than as a shape being moved around. It swells when
 * he is moving fast and when he is off the ground. */
function drawGlow(sx, sy, speed, air) {
  const heat = Math.min(1, speed / 700) * 0.5 + air * 0.5;
  const r = slime.r * (2.6 + heat * 1.5);
  const g = ctx.createRadialGradient(sx, sy, slime.r * 0.3, sx, sy, r);
  g.addColorStop(0, `rgba(120, 214, 184, ${0.30 + heat * 0.22})`);
  g.addColorStop(0.5, `rgba(120, 214, 184, ${0.10 + heat * 0.08})`);
  g.addColorStop(1, 'rgba(120, 214, 184, 0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
}

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

  const pal = paletteAt(slime.x);

  ctx.fillStyle = pal.sky;
  ctx.fillRect(0, 0, W, H);

  /* Screen y for a world point. Everything below agrees on this one line. */
  const HORIZON = H * 0.62;
  const sy2 = wy => wy - cy + HORIZON;

  drawLand(cx, cy, W, H, pal, sy2);

  let nearest = null, nearestD = Infinity;
  for (const it of placed) {
    const d = Math.abs(it.x - slime.x);
    if (d < nearestD) { nearestD = d; nearest = it; }

    const px = it.x - cx + W / 2;
    if (px < -160 || px > W + 160) continue;
    const gy = sy2(heightAt(it.x));

    const near = Math.max(0, 1 - d / 200);
    it.station.draw(ctx, px, gy, clock, near);

    ctx.textAlign = 'center';
    ctx.font = '11px ui-monospace, Menlo, monospace';
    ctx.fillStyle = near > 0.05 ? P.ink : P.inkSoft;
    ctx.fillText(fit(it.label, Math.min(W - 24, 300)), px, gy + 24);
    if (it.sub) {
      ctx.font = '10px ui-monospace, Menlo, monospace';
      ctx.fillStyle = P.inkSoft;
      ctx.globalAlpha = 0.55 + near * 0.45;
      ctx.fillText(it.sub, px, gy + 39);
      ctx.globalAlpha = 1;
    }
  }
  ctx.textAlign = 'left';

  /* His feet are on the land; his centre is one vertical radius above it. */
  const hx = sx - cx + W / 2, hy = sy2(sy) - slime.r * 0.92;
  drawGlow(hx, hy, Math.abs(slime.vx), grounded ? 0 : Math.min(1, airborne * 3));
  drawSlime(hx, hy, alpha);
  motes(W, H, cx, cy, sy2);

  /* One line, and only when there is something to do. A readout that is
   * always on becomes furniture and stops being read. */
  const atOne = nearest && nearestD < REACH && nearest.moment && !card.isOpen();
  hud.textContent = atOne ? 'tap to read' : '';
  hud.style.opacity = atOne ? '1' : '0';
}

/* Motes.
 *
 * Slow, warm specks drifting through the air. They are the cheapest thing in
 * the whole renderer and they do more for atmosphere than anything else here:
 * a still image reads as a diagram, and a few things moving in the air read as
 * somewhere with weather.
 *
 * Positions come from a hash of the index, offset by the camera at a fraction
 * of its speed, so they have depth without being stored or updated. */
function motes(W, H, cx, cy, sy2) {
  const t = clock;
  for (let i = 0; i < 34; i++) {
    const depth = 0.25 + (i % 5) * 0.14;
    const seed = i * 127.3;
    const span = W + 160;
    const x = (((Math.sin(seed) * 0.5 + 0.5) * span - cx * depth * 0.5) % span + span) % span - 80;
    const bob = Math.sin(t * (0.22 + (i % 4) * 0.06) + seed) * 26;
    const y = (((Math.cos(seed * 1.7) * 0.5 + 0.5) * H * 0.9 - cy * depth * 0.5) % H + H) % H + bob * 0.4;
    const r = 0.8 + (i % 3) * 0.7;
    ctx.globalAlpha = 0.10 + depth * 0.22;
    ctx.fillStyle = '#f5e3b8';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* Trims a label to the width available, so a long opening line never runs off
 * the side of a phone. Measured rather than counted: the font is proportional
 * enough that a character count is wrong by a word either way. */
const fitCache = new Map();
function fit(text, max) {
  const key = text + '|' + Math.round(max);
  if (fitCache.has(key)) return fitCache.get(key);
  let out = text;
  if (ctx.measureText(text).width > max) {
    let lo = 0, hi = text.length;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (ctx.measureText(text.slice(0, mid) + '…').width <= max) lo = mid; else hi = mid - 1;
    }
    out = text.slice(0, lo).trimEnd() + '…';
  }
  fitCache.set(key, out);
  return out;
}

/* Draws the ground across the visible width, plus whatever grows on it.
 *
 * Sampled every few pixels rather than solved: the height function is three
 * sines and sampling is both cheaper than it looks and exactly what is drawn,
 * so nothing can drift out of step with where the creature actually stands. */
function drawLand(cx, cy, W, H, pal, sy2) {
  const STEP = 6;
  const x0 = cx - W / 2 - STEP, x1 = cx + W / 2 + STEP;

  scenery(x0, x1, cx, W, pal, sy2);

  ctx.beginPath();
  ctx.moveTo(-4, H + 4);
  for (let x = x0; x <= x1; x += STEP) {
    ctx.lineTo(x - cx + W / 2, sy2(heightAt(x)));
  }
  ctx.lineTo(W + 4, H + 4);
  ctx.closePath();
  ctx.fillStyle = pal.ground;
  ctx.fill();

  /* A lit edge along the top. Without it the land is a silhouette and the
   * eye cannot read which way the ground is tilting. */
  ctx.beginPath();
  for (let x = x0; x <= x1; x += STEP) {
    const px = x - cx + W / 2, py = sy2(heightAt(x));
    x === x0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.strokeStyle = pal.ink;
  ctx.globalAlpha = 0.42;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/* What grows on the land here. Every region gets its own, derived from x so
 * it is the same on every visit and costs nothing to remember. */
function scenery(x0, x1, cx, W, pal, sy2) {
  const put = (x, y, draw) => { ctx.save(); ctx.translate(x - cx + W / 2, y); draw(); ctx.restore(); };

  if (pal.feature === 'forest') {
    for (const t of scatter(x0, x1, 78, 3)) {
      const h = 40 + t.r * 46;
      put(t.x, sy2(heightAt(t.x)), () => {
        const w = 13 + t.r2 * 6;
        ctx.fillStyle = pal.ink;
        /* Canopy first, trunk over it: a triangle drawn behind a line reads as
         * a tree; the same triangle at a whisper of alpha reads as a smudge
         * behind a pole. */
        ctx.globalAlpha = 0.34;
        for (let tier = 0; tier < 3; tier++) {
          const ty = -h * (0.34 + tier * 0.22), tw = w * (1 - tier * 0.24);
          ctx.beginPath();
          ctx.moveTo(-tw, ty);
          ctx.lineTo(0, ty - h * 0.30);
          ctx.lineTo(tw, ty);
          ctx.closePath(); ctx.fill();
        }
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = pal.ink; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -h * 0.5); ctx.stroke();
        ctx.globalAlpha = 1;
      });
    }
  } else if (pal.feature === 'town') {
    for (const t of scatter(x0, x1, 120, 7)) {
      const w = 34 + t.r * 40, h = 46 + t.r2 * 60;
      put(t.x, sy2(heightAt(t.x)), () => {
        ctx.fillStyle = pal.ink; ctx.globalAlpha = 0.26;
        ctx.fillRect(-w / 2, -h, w, h);
        if (t.r2 > 0.55) { ctx.beginPath(); ctx.moveTo(-w/2, -h); ctx.lineTo(0, -h - 16); ctx.lineTo(w/2, -h); ctx.fill(); }
        ctx.globalAlpha = 1;
      });
    }
  } else if (pal.feature === 'dune') {
    for (const t of scatter(x0, x1, 46, 11)) {
      put(t.x, sy2(heightAt(t.x)), () => {
        ctx.strokeStyle = pal.ink; ctx.globalAlpha = 0.3; ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          ctx.moveTo(i * 3 - 3, 0);
          ctx.lineTo(i * 3 - 4 - t.r2 * 3, -8 - t.r * 9);
        }
        ctx.stroke(); ctx.globalAlpha = 1;
      });
    }
  } else if (pal.feature === 'park') {
    for (const t of scatter(x0, x1, 96, 17)) {
      const h = 30 + t.r * 26;
      put(t.x, sy2(heightAt(t.x)), () => {
        ctx.strokeStyle = pal.ink; ctx.globalAlpha = 0.45; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -h); ctx.stroke();
        ctx.globalAlpha = 0.2;
        ctx.beginPath(); ctx.arc(0, -h - 8, 15 + t.r2 * 8, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      });
    }
  }
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
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  pending += dx;
  lastX = e.clientX; lastY = e.clientY;

  /* A flick upwards leaps. Steeper than it is wide, so running fast never
   * launches him by accident — the gesture has to actually mean "up". */
  const now = performance.now();
  if (dy < -7 && Math.abs(dy) > Math.abs(dx) * 1.4 && now - lastLeapAt > 220) {
    lastLeapAt = now;
    leap();
  }
});
let lastLeapAt = 0;

addEventListener('keydown', e => {
  if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w') { e.preventDefault(); leap(); }
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
