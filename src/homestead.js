/* The homestead, and what the land gives.
 *
 * The place sits past the eighteen things, in the last region. That is
 * deliberate: her story runs out at the airport and then at "eighteen things",
 * and the only honest direction after those is forward. So the ground she can
 * actually change is on the far side of them.
 */

import {P} from './theme.js';
import * as tend from './tend.js';
import {CELL, FLOOR_W, ROOM_H, cellX, layout, rooms, floorsFor} from './plot.js';

const TAU = Math.PI * 2;

/* Where a resource can be picked up. Placed by region so gathering is also
 * travelling — water and wood at the lake, seeds in the parks, stone in the
 * dunes. Each is derived from its index, never stored. */
export function nodesFor(worldEnd, FEATURES) {
  /* One node per feature, at its extreme. Nothing sits on the open path any
   * more: water and stone are at the bottom of hollows she has to climb down
   * into and back out of, wood and seed on top of ledges she has to leap for.
   *
   * Far fewer than before, and each one is somewhere. Scarcity is what makes
   * a thing worth crossing a valley for. */
  const KIND_FOR = {hollow: ['water', 'stone'], ledge: ['wood', 'seed']};
  return FEATURES.map((f, i) => ({
    id: `${f.kind}${i}`,
    kind: KIND_FOR[f.kind][i % 2],
    x: f.x,
    deep: f.kind === 'hollow',
  }));
}

export function drawNode(ctx, node, x, gy, t, taken, near) {
  if (taken) {
    /* What is left behind, so she can see it will come back. */
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = P.inkSoft; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, gy - 4, 5, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }
  const bob = Math.sin(t * 1.2 + node.x * 0.01) * 2;
  const y = gy - 10 + bob;
  const c = tend.RESOURCES[node.kind].colour;

  if (near > 0.02) {
    const g = ctx.createRadialGradient(x, y, 1, x, y, 26);
    g.addColorStop(0, `rgba(255,255,255,${0.4 * near})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, 26, 0, TAU); ctx.fill();
  }

  ctx.fillStyle = c;
  if (node.kind === 'water') {
    ctx.beginPath();
    ctx.moveTo(x, y - 8); ctx.quadraticCurveTo(x + 6, y, x, y + 6);
    ctx.quadraticCurveTo(x - 6, y, x, y - 8);
    ctx.fill();
  } else if (node.kind === 'wood') {
    ctx.save(); ctx.translate(x, y); ctx.rotate(0.3);
    ctx.fillRect(-9, -3, 18, 6);
    ctx.restore();
  } else if (node.kind === 'stone') {
    ctx.beginPath(); ctx.ellipse(x, y + 2, 8, 6, 0.2, 0, TAU); ctx.fill();
  } else {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(x + (i - 1) * 5, y + (i === 1 ? -3 : 0), 2.6, 4, (i - 1) * 0.4, 0, TAU);
      ctx.fill();
    }
  }
}

/* The homestead, drawn from the grid.
 *
 * Everything here derives its position from a cell in a zone on a level
 * terrace. Nothing is offset from sloping ground, which is what made the old
 * version lean and float.
 *
 * The house is a section rather than a facade: walls and a roof make a shell,
 * and inside is a grid of rooms she can actually stand in.
 */
export function drawHome(ctx, toScreen, plot, built, t) {
  const gy = toScreen(plot.x, plot.y).y;
  const placed = layout(built);

  /* The terrace itself, so the cut into the hill is visible as a thing that
   * was done rather than as ground that happens to be flat. */
  const l = toScreen(plot.x - plot.half, plot.y).x;
  const r = toScreen(plot.x + plot.half, plot.y).x;
  ctx.fillStyle = 'rgba(120,108,88,0.10)';
  ctx.fillRect(l, gy, r - l, 4);

  if (built.includes('path')) {
    ctx.fillStyle = '#cfc6b4';
    for (let i = 0; i < 14; i++) {
      const px = l + 16 + i * ((r - l - 32) / 13);
      ctx.beginPath(); ctx.ellipse(px, gy + 2, 8, 3, 0, 0, TAU); ctx.fill();
    }
  }
  if (built.includes('fence')) {
    ctx.strokeStyle = '#8a6a4c'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    for (const end of [l, r]) {
      for (let i = 0; i < 3; i++) {
        const fx = end + (end === l ? i * 9 : -i * 9);
        ctx.beginPath(); ctx.moveTo(fx, gy); ctx.lineTo(fx, gy - 18); ctx.stroke();
      }
    }
  }

  /* What is growing, in the bed it belongs to. Plots fill the garden beds in
   * order, four to a bed, so the garden looks like a garden being worked
   * rather than plants hovering near some soil. */
  const beds = placed.filter(i => i.id === 'bed' || i.id === 'herbs');
  const plots = tend.plots();
  plots.forEach((pl, i) => {
    const bed = beds[Math.floor(i / 4)];
    if (!bed) return;
    const slot = i % 4;
    const bx = toScreen(cellX(plot.x, plot.half, bed.cell), plot.y).x;
    const bw = toScreen(cellX(plot.x, plot.half, bed.cell + 1), plot.y).x - bx;
    const px = bx + bw * (0.2 + slot * 0.2);
    const stage = tend.stageOf(pl);
    const grow = stage / (tend.STAGES.length - 1);
    const sp = tend.FLORA[i % Math.max(1, tend.FLORA.length)];
    drawPlant(ctx, sp, px, gy - 6, Math.max(0.12, grow), t,
              Math.sin(t * 0.7 + i));
  });

  for (const item of placed) {
    const x0 = toScreen(cellX(plot.x, plot.half, item.cell), plot.y).x;
    const w = item.cells * CELL * (toScreen(plot.x + CELL, plot.y).x
                                 - toScreen(plot.x, plot.y).x) / CELL;
    if (item.id === 'walls') drawShell(ctx, x0, gy, w, built, t);
    else drawYardThing(ctx, item.id, x0, gy, w, t);
  }
}

/* Things that stand in the open: a well, a woodpile, a bench. One cell each,
 * drawn from the cell's left edge so they line up with everything else. */
function drawYardThing(ctx, id, x, gy, w, t) {
  const c = x + w / 2;
  if (id === 'well') {
    ctx.fillStyle = '#a9a094';
    ctx.beginPath(); ctx.ellipse(c, gy - 7, 15, 8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5c6b74';
    ctx.beginPath(); ctx.ellipse(c, gy - 9, 9, 5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8a6a4c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(c - 12, gy - 12); ctx.lineTo(c - 12, gy - 30);
    ctx.lineTo(c + 12, gy - 30); ctx.lineTo(c + 12, gy - 12); ctx.stroke();
  } else if (id === 'woodpile') {
    ctx.fillStyle = '#8a6a4c';
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 3 - row; i++) {
        ctx.beginPath();
        ctx.ellipse(c - 14 + row * 7 + i * 14, gy - 6 - row * 11, 6, 5, 0, 0, TAU);
        ctx.fill();
      }
    }
  } else if (id === 'quarry') {
    ctx.fillStyle = '#a9a094';
    for (const [dx, dy, rr] of [[-11, -6, 9], [5, -8, 11], [-2, -18, 7]]) {
      ctx.beginPath(); ctx.ellipse(c + dx, gy + dy, rr, rr * 0.72, 0.2, 0, TAU); ctx.fill();
    }
  } else if (id === 'bench') {
    ctx.fillStyle = '#8a6a4c';
    ctx.fillRect(c - 18, gy - 16, 36, 5);
    ctx.fillRect(c - 15, gy - 12, 4, 12);
    ctx.fillRect(c + 11, gy - 12, 4, 12);
  } else if (id === 'bed' || id === 'herbs') {
    /* A garden bed: a frame of earth. What grows in it is drawn separately. */
    ctx.fillStyle = id === 'herbs' ? '#6f7d55' : '#8a7355';
    ctx.beginPath();
    ctx.roundRect(c - w / 2 + 4, gy - 9, w - 8, 11, 2);
    ctx.fill();
    ctx.strokeStyle = '#6b5740'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(c - w / 2 + 4, gy - 9, w - 8, 11, 2);
    ctx.stroke();
  }
}

/* A plant, built from its description rather than drawn.
 *
 * flora.py says how a species is shaped — stem height and bend, how many
 * leaves and where, what the flower is made of — and this assembles it at
 * whatever size and stage is needed. Six species already exist there and had
 * never once appeared on screen; adding a seventh is six lines of Python and
 * no new artwork.
 *
 * `grow` is 0..1 across the plant's life, so a sprout is the same plant as a
 * flower, smaller and without its bloom.
 */
export function drawPlant(ctx, sp, x, gy, grow, t, sway) {
  if (!sp) return;
  const [h, bend, thick] = sp.stem;
  const H = h * grow;
  const lean = (bend + sway * 4) * grow;

  ctx.strokeStyle = '#6f9455';
  ctx.lineWidth = Math.max(1, thick * (0.5 + grow * 0.5));
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, gy);
  ctx.quadraticCurveTo(x + lean * 0.4, gy - H * 0.55, x + lean, gy - H);
  ctx.stroke();

  const [n, first, spacing, len, droop] = sp.leaves;
  for (let i = 0; i < n; i++) {
    const at = first + i * spacing;
    if (at > grow) continue;
    const ly = gy - H * at;
    const lx = x + lean * at;
    const dir = i % 2 ? 1 : -1;
    const L = len * grow;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.quadraticCurveTo(lx + dir * L * 0.6, ly - L * (1 - droop) * 0.5,
                         lx + dir * L, ly + L * droop * 0.3);
    ctx.stroke();
  }

  /* The bloom only exists at the end of the plant's life. */
  if (grow < 0.92) return;
  const b = sp.bloom, bx = x + lean, by = gy - H;
  ctx.save();
  ctx.translate(bx, by);
  if (b.kind === 'petals' || b.kind === 'daisy') {
    ctx.fillStyle = b.a;
    for (let i = 0; i < b.n; i++) {
      ctx.rotate((Math.PI * 2) / b.n);
      ctx.beginPath();
      ctx.ellipse(0, -b.size * 0.9, b.size * 0.42, b.size, 0, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = b.b;
    ctx.beginPath(); ctx.arc(0, 0, b.size * 0.45, 0, TAU); ctx.fill();
  } else if (b.kind === 'puff') {
    ctx.fillStyle = b.a;
    for (let i = 0; i < b.n; i++) {
      const a = (i / b.n) * TAU;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * b.size * 0.6, Math.sin(a) * b.size * 0.6, b.size * 0.42, 0, TAU);
      ctx.fill();
    }
  } else if (b.kind === 'spike' || b.kind === 'ear') {
    for (let i = 0; i < b.n; i++) {
      ctx.fillStyle = i % 2 ? b.a : b.b;
      ctx.beginPath();
      ctx.ellipse(0, -i * b.size * 0.8, b.size * 0.5, b.size * 0.6, 0, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/* The house.
 *
 * A doll's-house section: the shell, then the rooms inside it, then a roof on
 * top. The front is open to the camera — no door to fumble with, because
 * walking into the footprint is entering.
 */
function drawShell(ctx, x, gy, w, built, t) {
  const rs = rooms(built, tend.roomCount(), tend.furniture());
  const nFloors = floorsFor(tend.roomCount());
  const scale = w / (FLOOR_W * CELL);
  const rh = ROOM_H * scale;
  const top = gy - nFloors * rh;

  /* Walls. */
  ctx.fillStyle = '#e0d5bf';
  ctx.fillRect(x, top, w, nFloors * rh);
  ctx.strokeStyle = 'rgba(79,72,64,0.45)'; ctx.lineWidth = 2;
  ctx.strokeRect(x, top, w, nFloors * rh);

  /* Room divisions, so it reads as a section and not a box. */
  ctx.strokeStyle = 'rgba(79,72,64,0.18)'; ctx.lineWidth = 1;
  for (let f = 1; f < nFloors; f++) {
    ctx.beginPath(); ctx.moveTo(x, gy - f * rh); ctx.lineTo(x + w, gy - f * rh); ctx.stroke();
  }
  for (let c = 1; c < FLOOR_W; c++) {
    ctx.beginPath();
    ctx.moveTo(x + (c * w) / FLOOR_W, top);
    ctx.lineTo(x + (c * w) / FLOOR_W, gy);
    ctx.stroke();
  }

  /* What is in each room. An empty room is left empty on purpose — it is
   * somewhere she has made and not yet filled, which is a different thing
   * from nothing. */
  for (const room of rs) {
    if (!room.holds) continue;
    const rx = x + (room.col * w) / FLOOR_W;
    const ry = gy - room.floor * rh;
    drawInRoom(ctx, room.holds, rx, ry, w / FLOOR_W, rh, t);
  }

  if (built.includes('roof')) {
    ctx.fillStyle = '#a8674f';
    ctx.beginPath();
    ctx.moveTo(x - 10, top);
    ctx.lineTo(x + w / 2, top - 34 * scale);
    ctx.lineTo(x + w + 10, top);
    ctx.closePath(); ctx.fill();
  }
}

function drawInRoom(ctx, id, x, y, w, h, t) {
  const c = x + w / 2, floor = y - 3;
  if (id === 'hearth') {
    ctx.fillStyle = '#7b6a58';
    ctx.fillRect(c - 13, floor - 20, 26, 20);
    const flick = 0.7 + Math.sin(t * 3.1) * 0.16;
    ctx.fillStyle = `rgba(233,163,79,${flick})`;
    ctx.beginPath();
    ctx.moveTo(c - 6, floor - 3);
    ctx.quadraticCurveTo(c, floor - 18, c + 6, floor - 3);
    ctx.closePath(); ctx.fill();
  } else if (id === 'window') {
    ctx.fillStyle = 'rgba(233,163,79,0.5)';
    ctx.fillRect(c - 11, y - h + 12, 22, 18);
    ctx.strokeStyle = 'rgba(79,72,64,0.5)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(c - 11, y - h + 12, 22, 18);
    ctx.beginPath();
    ctx.moveTo(c, y - h + 12); ctx.lineTo(c, y - h + 30); ctx.stroke();
  } else if (id === 'shelf') {
    ctx.fillStyle = '#8a6a4c';
    ctx.fillRect(c - 16, y - h + 18, 32, 3);
    ctx.fillRect(c - 16, y - h + 32, 32, 3);
  } else if (id === 'bed2') {
    ctx.fillStyle = '#c9b8a0';
    ctx.beginPath(); ctx.roundRect(c - 18, floor - 12, 36, 12, 2); ctx.fill();
    ctx.fillStyle = '#dd8b95';
    ctx.beginPath(); ctx.roundRect(c - 18, floor - 16, 14, 7, 2); ctx.fill();
  }
}
