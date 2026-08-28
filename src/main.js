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
import {heightAt, slopeAt, paletteAt, scatter, REGIONS, WORLD_END, FEATURES} from './terrain.js';
import {FINDS, drawFind} from './finds.js';
import * as tend from './tend.js';
import {nodesFor, drawNode, drawHome} from './homestead.js';
import {setPlot, PLOT, onPlot} from './terrain.js';
import {ROOM_H, FLOOR_W, CELL, zoneRange, cellX, floorsFor} from './plot.js';
import * as panel from './panel.js';
import * as sky from './sky.js';

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

/* What she has found. Kept on her phone: nothing here is worth an account, and
 * a collection that resets because a request failed would be worse than one
 * that never syncs. */
const KEPT = 'us.kept';
let kept = load();
function load() {
  try { return new Set(JSON.parse(localStorage.getItem(KEPT) || '[]')); }
  catch { return new Set(); }
}
function remember() {
  try { localStorage.setItem(KEPT, JSON.stringify([...kept])); } catch {}
}

/* Placed once the world exists. They float above the ground, most of them high
 * enough that walking past is not enough. */
const findsPlaced = FINDS.map(f => {
  const x = 300 + f.at * (WORLD_END - 600);
  return {...f, x, y: heightAt(x) - f.lift};
});

let justFound = null, justFoundAt = 0;

/* Where the land gives things, and where the homestead stands. The homestead
 * sits past the last moment on purpose: her story ends at the airport and then
 * at eighteen things, and the only honest direction after those is forward. */
const nodes = nodesFor(WORLD_END, FEATURES).map(n => ({...n, y: 0}));

/* The pouch opens the same panel from anywhere. Building still happens at the
 * homestead — it is a place, and a place you can build from three regions away
 * is not one — but she can always see what she is carrying and what it is for,
 * which is the part that was missing. */
const pouchBtn = document.getElementById('pouch');
const pouchCount = document.getElementById('pouch-count');
pouchBtn.addEventListener('click', () => panel.open(null, false));
/* Past the last moment, with a gap. Her story ends at the eighteen things and
 * the homestead is what comes after it — so it must not sit among the
 * memories, which is where it was landing and why it overlapped one. */
const HOME_X = WORLD_END - 620;

/* Cut the terrace before anything asks the ground how high it is. Everything
 * at the homestead stands on this flat, which is the whole reason the house
 * and the garden no longer lean. */
setPlot(HOME_X);
let toast = null, toastAt = 0;

/* Gathering: how long she must hold, and how far along she is. */
const GATHER_TIME = 0.9;
let gather = null, holding = false;

function say(text) { toast = text; toastAt = clock; }

/* Where the house actually is, in world coordinates, or null before it exists.
 * Derived from the same grid that draws it, so the space she can stand in and
 * the space that is drawn can never disagree. */
function houseSpan() {
  if (!tend.built().includes('walls')) return null;
  const r = zoneRange('house');
  const x0 = cellX(PLOT.x, PLOT.half, r.from);
  return {x0, x1: x0 + (r.to - r.from) * CELL, floors: floorsFor(tend.roomCount(), tend.floorsBuilt())};
}

/* What happened while she was away, said once, on opening.
 *
 * Only ever good news, because there is no mechanic that can produce bad news.
 * If nothing changed it says nothing at all rather than inventing a reason to
 * speak — a summary that fires every time stops being read. */
function welcomeBack() {
  const away = tend.whileAway();
  if (away.hours < 0.5) return;

  const bits = [];
  if (away.grew.length === 1) bits.push(`something is ${away.grew[0].to}`);
  else if (away.grew.length > 1) bits.push(`${away.grew.length} things grew`);
  for (const [k, n] of Object.entries(away.ready)) {
    bits.push(`${n} ${tend.RESOURCES[k].name} waiting`);
  }
  if (!bits.length) return;

  const when = away.rained ? 'it rained while you were gone'
             : away.hours < 20 ? 'while you were gone'
             : away.hours < 44 ? 'since yesterday'
             : `in the ${Math.round(away.hours / 24)} days you were away`;
  setTimeout(() => say(`${when}: ${bits.join(', ')}`), 900);
}
/* The world is loaded before anything asks it a question. Everything before
 * this point uses fallbacks that exist only so a failed fetch cannot leave a
 * blank screen on her birthday. */
tend.loadWorld().then(() => welcomeBack());

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
    /* Stop the moments well short of the homestead so the two never collide. */
    const usable = WORLD_END - FIRST - 1900;
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
 * No gravity. He moves freely in both axes, and drag steers him anywhere.
 *
 * An earlier version had gravity, a leap, coyote time and jump buffering, and
 * it felt good — but platforming and architecture pull in opposite directions.
 * A house with rooms is something to move around INSIDE, and a jump arc can
 * only ever take you up and back down again. Free movement means the world can
 * have interiors, floors, and places above and below the ground line that are
 * simply somewhere to go.
 *
 * The ground is still a floor: he cannot sink into the land, which keeps the
 * landscape readable as landscape.
 */
/* He is a slime, not a bird.
 *
 * Removing gravity left him able to drift into blank sky, which is not a
 * world — it is a void with an arbitrary lid. What holds him instead is a
 * TETHER to the ground: free movement up to REACH, and past that the land
 * pulls back harder the further he stretches, until he simply cannot go any
 * higher.
 *
 * That is the logic of the thing. He can climb a slope, get over a ledge and
 * stretch up for something above him. He cannot leave. And because the pull
 * is a curve rather than a wall, hitting the limit feels like the top of a
 * stretch instead of bumping into an invisible ceiling.
 *
 * Interiors will lift the tether — inside a building the floors are what
 * bound him, so it will be measured from the floor he stands over instead.
 */
const LIFT_FREE = 150;      // free vertical room above the ground
const LIFT_MAX  = 110;      // how much further he can force it, against the pull
const TETHER_K  = 9;        // how hard the land pulls him back past LIFT_FREE

let grounded = false;
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

  const MAX_SPEED = 1400;
  const sp = Math.hypot(slime.vx, slime.vy);
  if (sp > MAX_SPEED) { slime.vx *= MAX_SPEED / sp; slime.vy *= MAX_SPEED / sp; }

  /* Drifting rather than falling: he keeps a little of his motion, then
   * settles. The same damping on both axes, so a diagonal feels like a
   * diagonal and not like two different materials. */
  const drag = Math.exp(-3.4 * h);
  slime.vx *= drag;
  slime.vy *= drag;

  slime.px = slime.x; slime.py = slime.y;
  slime.x = Math.max(-400, Math.min(WORLD_END + 400, slime.x + slime.vx * h));
  slime.y += slime.vy * h;

  /* The land is a floor, not a surface he is stuck to. */
  const g = heightAt(slime.x);
  if (slime.y > g) {
    if (slime.vy > 260) for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      rim[i].v -= Math.sin(a) * Math.min(1, slime.vy / 900) * 4;
    }
    slime.y = g;
    slime.vy = Math.min(0, slime.vy);
    grounded = true;
  } else {
    grounded = slime.y > g - 3;
  }

  /* The tether. Nothing happens within REACH; past it the pull grows with how
   * far he has stretched, and STRETCH is where it becomes immovable. */
  /* Inside the house the floors bound her, not the ground.
   *
   * The building is the boundary in there, so the outdoor tether is skipped
   * and the ceiling is the top of the top floor plus headroom. Without this,
   * "you can go inside" is a drawing rather than a place: the tether would
   * pull her back down through her own first floor.
   */
  const span = houseSpan();
  const inHouse = !!span && slime.x > span.x0 && slime.x < span.x1;
  if (inHouse) {
    const roof = PLOT.y - span.floors * ROOM_H - 18;
    if (slime.y < roof) { slime.y = roof; slime.vy = Math.max(0, slime.vy); }
  }


  const up = g - slime.y;
  if (!inHouse && up > LIFT_FREE) {
    const over = (up - LIFT_FREE) / LIFT_MAX;
    slime.vy += over * over * TETHER_K * 60 * h;
    if (up > LIFT_FREE + LIFT_MAX) {
      slime.y = g - LIFT_FREE - LIFT_MAX;
      slime.vy = Math.max(slime.vy, 0);
    }
  }

  stepBlob(h, ax, ay);

  /* Gathering takes a moment of standing still and holding.
   *
   * Walking over something and having it appear in a bag is a pickup, not a
   * harvest — she crossed a valley to get here and it should cost more than
   * passing through. Holding still also means she cannot hoover up a hollow
   * at a run. */
  const near = nodes.find(n =>
    !tend.nodeTaken(n.id) &&
    Math.abs(n.x - slime.x) < 44 &&
    Math.abs(heightAt(n.x) - slime.y) < 66);

  if (near && holding && grounded && Math.abs(slime.vx) < 40) {
    gather = gather && gather.id === near.id
      ? {id: near.id, t: gather.t + h}
      : {id: near.id, t: h};
    if (gather.t >= GATHER_TIME) {
      if (tend.takeNode(near.id, near.kind)) {
        say(tend.RESOURCES[near.kind].name);
        for (let i = 0; i < N; i++) rim[i].v += 1.4;
      }
      gather = null;
    }
  } else if (gather) {
    /* Let go and it drains back rather than snapping to nothing, so a
     * stumble does not lose all the effort. */
    gather = {...gather, t: gather.t - h * 2};
    if (gather.t <= 0) gather = null;
  }

  /* Picking something up. Generous radius: reaching it is the challenge, not
   * touching it precisely. */
  for (const f of findsPlaced) {
    if (kept.has(f.id)) continue;
    if (Math.hypot(f.x - slime.x, f.y - slime.y) < 46) {
      kept.add(f.id);
      remember();
      justFound = f;
      justFoundAt = clock;
      /* A small kick, so it feels like it landed in him. */
      for (let i = 0; i < N; i++) rim[i].v += 1.8;
    }
  }

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

  /* The palette of this place, at the time of day where she is. */
  const base = paletteAt(slime.x);
  const now = new Date();
  const day = sky.daylight(now);
  const wx = sky.weather(now);
  const pal = {
    sky: sky.tint(base.sky, day, wx.overcast),
    ground: sky.tint(base.ground, day, wx.overcast),
    ink: sky.tint(base.ink, day, wx.overcast * 0.4),
    feature: base.feature,
    name: base.name,
  };

  ctx.fillStyle = pal.sky;
  ctx.fillRect(0, 0, W, H);

  drawBody(W, H, now, day);

  /* Screen y for a world point. Everything below agrees on this one line. */
  const HORIZON = H * 0.62;
  const sy2 = wy => wy - cy + HORIZON;

  drawLand(cx, cy, W, H, pal, sy2);

  /* The homestead, drawn behind everything she might stand in front of. */
  if (Math.abs(HOME_X - cx) < W + 500) {
    drawHome(ctx,
      (wx, wy) => ({x: wx - cx + W / 2, y: sy2(wy)}),
      PLOT, tend.built(), clock);
  }

  for (const n of nodes) {
    const px = n.x - cx + W / 2;
    if (px < -60 || px > W + 60) continue;
    const d = Math.abs(n.x - slime.x);
    drawNode(ctx, n, px, sy2(heightAt(n.x)), clock,
             tend.nodeTaken(n.id), Math.max(0, 1 - d / 200));
  }

  /* The ring that fills while she holds. Without it, holding still and
   * nothing visibly happening reads as the game ignoring her. */
  if (gather) {
    const n = nodes.find(q => q.id === gather.id);
    if (n) {
      const gx = n.x - cx + W / 2, gyy = sy2(heightAt(n.x)) - 14;
      const p = Math.max(0, Math.min(1, gather.t / GATHER_TIME));
      ctx.strokeStyle = tend.RESOURCES[n.kind].colour;
      ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(gx, gyy, 17, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  for (const f of findsPlaced) {
    const px = f.x - cx + W / 2;
    if (px < -80 || px > W + 80) continue;
    const d = Math.hypot(f.x - slime.x, f.y - slime.y);
    drawFind(ctx, f, px, sy2(f.y), clock, kept.has(f.id), Math.max(0, 1 - d / 240));
  }

  let nearest = null, nearestD = Infinity;
  for (const it of placed) {
    const d = Math.abs(it.x - slime.x);
    if (d < nearestD) { nearestD = d; nearest = it; }

    const px = it.x - cx + W / 2;
    if (px < -160 || px > W + 160) continue;
    const gy = sy2(heightAt(it.x));

    const near = Math.max(0, 1 - d / 200);
    it.station.draw(ctx, px, gy, clock, near);

    /* No label. It used to print the opening words of the memory, which gave
     * away the thing she is about to open — the station is meant to be a
     * closed envelope, not a headline. Only the date, only when she is close
     * enough to be choosing to look. */
    if (it.sub && near > 0.35) {
      ctx.textAlign = 'center';
      ctx.font = '10px ui-monospace, Menlo, monospace';
      ctx.fillStyle = P.inkSoft;
      ctx.globalAlpha = (near - 0.35) / 0.65 * 0.8;
      ctx.fillText(it.sub, px, gy + 26);
      ctx.globalAlpha = 1;
    }
  }
  ctx.textAlign = 'left';

  /* His feet are on the land; his centre is one vertical radius above it. */
  const hx = sx - cx + W / 2, hy = sy2(sy) - slime.r * 0.92;
  drawGlow(hx, hy, Math.hypot(slime.vx, slime.vy), grounded ? 0 : 0.5);
  drawSlime(hx, hy, alpha);
  motes(W, H, cx, cy, sy2);
  if (wx.strength > 0.12) rain(W, H, wx.strength, clock);

  /* One line, and only when there is something to do. A readout that is
   * always on becomes furniture and stops being read. */
  /* What she just picked up, named for a few seconds. */
  const since = clock - justFoundAt;
  if (justFound && since < 3.4) {
    const a = since < 0.3 ? since / 0.3 : since > 2.6 ? Math.max(0, (3.4 - since) / 0.8) : 1;
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.font = '13px ui-serif, Georgia, serif';
    ctx.fillStyle = P.ink;
    ctx.fillText(justFound.name, W / 2, H * 0.30);
    ctx.font = '11px ui-monospace, Menlo, monospace';
    ctx.fillStyle = P.inkSoft;
    ctx.fillText(justFound.note, W / 2, H * 0.30 + 20);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  /* The pouch only appears once she is carrying something, so the birthday
   * screen is never cluttered with an empty widget. */
  /* Everything that gives off light knows what time it is. */
  document.documentElement.style.setProperty('--night', (1 - day).toFixed(3));

  const total = Object.values(tend.inv()).reduce((a, b) => a + b, 0);
  pouchBtn.classList.toggle('on', total > 0);
  if (pouchCount.textContent !== String(total)) pouchCount.textContent = String(total);

  /* A word about what just happened, then gone. */
  const tsince = clock - toastAt;
  if (toast && tsince < 2) {
    ctx.globalAlpha = tsince < 0.2 ? tsince / 0.2 : Math.min(1, (2 - tsince) / 0.6);
    ctx.textAlign = 'center';
    ctx.font = '12px ui-monospace, Menlo, monospace';
    ctx.fillStyle = P.inkSoft;
    ctx.fillText(toast, W / 2, H * 0.38);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  /* The tally, bottom corner, quiet. */
  ctx.textAlign = 'right';
  ctx.font = '11px ui-monospace, Menlo, monospace';
  ctx.fillStyle = P.inkSoft;
  ctx.globalAlpha = 0.55;
  ctx.fillText(`${kept.size} / ${FINDS.length} found`,
               W - 14, H - 14 - (parseInt(getComputedStyle(document.documentElement)
                 .getPropertyValue('--safe-bottom')) || 0));
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';

  const busy = card.isOpen() || panel.isOpen();
  const atHome = Math.abs(slime.x - HOME_X) < 190 && !busy;
  const atOne = !atHome && nearest && nearestD < REACH && nearest.moment && !busy;
  const atNode = !busy && nodes.some(n => !tend.nodeTaken(n.id) &&
    Math.abs(n.x - slime.x) < 44 && Math.abs(heightAt(n.x) - slime.y) < 66);
  hud.textContent = atNode ? 'hold to gather'
                  : atHome ? 'tap to tend'
                  : atOne ? 'tap to read' : '';
  hud.style.opacity = (atNode || atHome || atOne) ? '1' : '0';
}

/* The sun, or the moon, where it actually is right now.
 *
 * Not decoration: it is the clock. She can tell roughly what time it is by
 * looking up, the same way she can outside. */
function drawBody(W, H, now, day) {
  const b = sky.body(now);
  if (b.y <= 0.02) return;
  const x = 40 + b.x * (W - 80);
  const y = H * 0.66 - b.y * H * 0.52;
  const r = b.moon ? 9 : 13;

  const g = ctx.createRadialGradient(x, y, 1, x, y, r * 5);
  g.addColorStop(0, b.moon ? 'rgba(214,224,246,0.28)' : `rgba(255,214,140,${0.16 + day * 0.2})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r * 5, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = b.moon ? '#dfe6f4' : '#ffd98c';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  if (b.moon) {
    /* A crescent, cut rather than drawn. */
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.arc(x + r * 0.42, y - r * 0.24, r * 0.88, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
}

/* Rain.
 *
 * Screen-space and cheap. Positions come from a hash of the index and the
 * clock, so nothing is stored and it costs one loop. */
function rain(W, H, strength, t) {
  const n = Math.round(30 + strength * 70);
  ctx.strokeStyle = 'rgba(150,175,200,0.42)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const seed = i * 71.3;
    const x = ((Math.sin(seed) * 0.5 + 0.5) * W + t * 26 + i * 13) % (W + 40) - 20;
    const y = (((Math.cos(seed * 1.9) * 0.5 + 0.5) * H) + t * (340 + (i % 5) * 60)) % (H + 40) - 20;
    ctx.moveTo(x, y);
    ctx.lineTo(x - 2.5, y + 11);
  }
  ctx.stroke();
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

  /* Deliberately almost nothing.
   *
   * There were generic houses scattered across two regions, which is exactly
   * the clip-art clutter this whole thing is supposed to avoid — a background
   * full of buildings nobody drew on purpose. What is left is sparse, thin and
   * regional: enough to say forest, park or dune, and nothing that asks to be
   * looked at. */
  if (pal.feature === 'forest') {
    for (const t of scatter(x0, x1, 210, 3)) {
      const h = 46 + t.r * 40;
      put(t.x, sy2(heightAt(t.x)), () => {
        ctx.strokeStyle = pal.ink;
        ctx.globalAlpha = 0.30;
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -h); ctx.stroke();
        for (let i = 0; i < 3; i++) {
          const y = -h * (0.45 + i * 0.2), w = 9 - i * 2;
          ctx.beginPath();
          ctx.moveTo(-w, y); ctx.lineTo(0, y - 13); ctx.lineTo(w, y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      });
    }
  } else if (pal.feature === 'park') {
    for (const t of scatter(x0, x1, 320, 17)) {
      const h = 34 + t.r * 20;
      put(t.x, sy2(heightAt(t.x)), () => {
        ctx.strokeStyle = pal.ink; ctx.globalAlpha = 0.28; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -h); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -h - 7, 11 + t.r2 * 5, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      });
    }
  } else if (pal.feature === 'dune') {
    for (const t of scatter(x0, x1, 150, 11)) {
      put(t.x, sy2(heightAt(t.x)), () => {
        ctx.strokeStyle = pal.ink; ctx.globalAlpha = 0.24; ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          ctx.moveTo(i * 3 - 3, 0);
          ctx.lineTo(i * 3 - 4 - t.r2 * 3, -7 - t.r * 7);
        }
        ctx.stroke(); ctx.globalAlpha = 1;
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
  pid = e.pointerId; dragging = true; holding = true;
  lastX = downX = e.clientX; lastY = downY = e.clientY;
  try { canvas.setPointerCapture(pid); } catch {}
});

canvas.addEventListener('pointermove', e => {
  if (!dragging || e.pointerId !== pid) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  pending += dx;
  pendingY += dy;
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
    if (Math.abs(slime.x - HOME_X) < 190) {
      slime.vx = 0;
      panel.open(null, true);
      dragging = false; pid = null;
      return;
    }
    const at = atStation();
    if (at) { slime.vx = slime.vy = 0; card.open(at.moment); }
  }
  dragging = false; holding = false; pid = null;
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
    get finds() { return findsPlaced; },
    get nodes() { return nodes; },
    tend, HOME_X, heightAt, LIFT_FREE, LIFT_MAX,
    home: () => { slime.x = HOME_X - 90; slime.y = heightAt(slime.x); slime.vx = slime.vy = 0;
                  cam.x = cam.px = slime.x; cam.y = cam.py = slime.y; },
    give: (k, n) => { tend.take(k, n); },
    get kept() { return kept; },
    toFind: i => { const f = findsPlaced[i]; slime.x = f.x; slime.y = f.y; slime.vx = slime.vy = 0;
                   cam.x = cam.px = f.x; cam.y = cam.py = f.y; },
    forget: () => { kept.clear(); remember(); },
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
