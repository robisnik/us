/* The stations, all built from style.js so they read as one set.
 *
 * Each has a role — what it would actually hold in the finished app. The four
 * that had no job (monolith, ring, bell jar, constellation) are gone; the six
 * that did are redrawn in the house style, and the rest fill gaps a
 * long-distance app has: her voice coming back, a song, the wait, a place, a
 * ritual, and the thing you grow between you.
 *
 * draw(ctx, x, gy, t, near) — x and gy are the base on the ground, t is
 * seconds, near is 0..1 proximity.
 */

import {P, LINE, line, post, card, roundRect, halo, shape} from './theme.js';

const TAU = Math.PI * 2;

/* --- a photograph ------------------------------------------------------- */
function photo(ctx, x, gy, t, near) {
  const sway = Math.sin(t * 0.8) * 0.022 + near * 0.02;
  post(ctx, x, gy, 78);
  ctx.save();
  ctx.translate(x, gy - 78);
  ctx.rotate(sway);
  card(ctx, 0, 0, 50, 58);
  ctx.fillStyle = '#cfd9d5';
  roundRect(ctx, -20, 5, 40, 36, 1.5); ctx.fill();
  ctx.fillStyle = P.sage;
  ctx.beginPath();
  ctx.moveTo(-20, 41); ctx.lineTo(-5, 20); ctx.lineTo(8, 33);
  ctx.lineTo(14, 27); ctx.lineTo(20, 41); ctx.closePath(); ctx.fill();
  ctx.fillStyle = P.warm;
  ctx.beginPath(); ctx.arc(11, 13, 4, 0, TAU); ctx.fill();
  ctx.restore();
}

/* --- an idea we had together -------------------------------------------- */
function lantern(ctx, x, gy, t, near) {
  const swing = Math.sin(t * 1.15) * 0.05;
  const lit = 0.75 + Math.sin(t * 2.6) * 0.06 + near * 0.25;
  line(ctx);
  ctx.beginPath();
  ctx.moveTo(x, gy); ctx.lineTo(x, gy - 96);
  ctx.quadraticCurveTo(x, gy - 108, x + 18, gy - 108);
  ctx.stroke();
  line(ctx, LINE * 0.9, P.inkSoft);
  ctx.beginPath(); ctx.moveTo(x - 7, gy); ctx.lineTo(x + 7, gy); ctx.stroke();

  ctx.save();
  ctx.translate(x + 18, gy - 108);
  ctx.rotate(swing);
  line(ctx, LINE * 0.8);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 10); ctx.stroke();
  halo(ctx, 0, 26, 44, 0.45 * lit);
  shape(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 26, 11, 14, 0, 0, TAU); }, P.glow);
  line(ctx, LINE * 0.7, P.warm);
  ctx.beginPath(); ctx.moveTo(-4, 30); ctx.lineTo(0, 20); ctx.lineTo(4, 30); ctx.stroke();
  ctx.restore();
}

/* --- a gift, something to smile at -------------------------------------- */
function bloom(ctx, x, gy, t, near) {
  const bend = Math.sin(t * 0.7) * 5 + near * 3;
  const topY = gy - 92;
  line(ctx, LINE, P.sage);
  ctx.beginPath();
  ctx.moveTo(x, gy);
  ctx.quadraticCurveTo(x + bend * 0.5, gy - 48, x + bend, topY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + bend * 0.4, gy - 42);
  ctx.quadraticCurveTo(x - 15, gy - 54, x - 21, gy - 40);
  ctx.stroke();
  line(ctx, LINE * 0.9, P.inkSoft);
  ctx.beginPath(); ctx.moveTo(x - 7, gy); ctx.lineTo(x + 7, gy); ctx.stroke();

  ctx.save();
  ctx.translate(x + bend, topY);
  for (let i = 0; i < 6; i++) {
    ctx.rotate(TAU / 6);
    shape(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -13, 7, 12, 0, 0, TAU); }, P.blush);
  }
  shape(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); }, P.warm);
  ctx.restore();
}

/* --- a letter ------------------------------------------------------------ */
function letter(ctx, x, gy, t, near) {
  const swing = Math.sin(t * 0.95) * 0.055 + near * 0.03;
  line(ctx);
  ctx.beginPath();
  ctx.moveTo(x, gy); ctx.lineTo(x, gy - 92);
  ctx.lineTo(x + 30, gy - 92);
  ctx.stroke();
  line(ctx, LINE * 0.9, P.inkSoft);
  ctx.beginPath(); ctx.moveTo(x - 7, gy); ctx.lineTo(x + 7, gy); ctx.stroke();

  ctx.save();
  ctx.translate(x + 26, gy - 90);
  ctx.rotate(swing);
  line(ctx, LINE * 0.7, P.inkSoft);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 12); ctx.stroke();
  card(ctx, 0, 12, 46, 32, 2);
  /* The flap, and a seal where it closes. */
  line(ctx, LINE * 0.7);
  ctx.beginPath();
  ctx.moveTo(-23, 12); ctx.lineTo(0, 30); ctx.lineTo(23, 12);
  ctx.stroke();
  shape(ctx, () => { ctx.beginPath(); ctx.arc(0, 30, 5, 0, TAU); }, P.blush);
  ctx.restore();
}

/* --- a place to be together --------------------------------------------- */
function fire(ctx, x, gy, t, near) {
  line(ctx, LINE * 0.9, P.inkSoft);
  ctx.beginPath(); ctx.moveTo(x - 26, gy); ctx.lineTo(x + 26, gy); ctx.stroke();

  halo(ctx, x, gy - 22, 62, 0.34 + near * 0.16);

  for (const [dx, dy, w, a] of [[-20, -6, 34, 0.18], [-8, -11, 30, -0.12], [2, -4, 30, 0.06]]) {
    ctx.save();
    ctx.translate(x + dx, gy + dy);
    ctx.rotate(a);
    shape(ctx, () => roundRect(ctx, 0, 0, w, 7, 3), '#8a6a4c');
    ctx.restore();
  }

  for (let i = 0; i < 3; i++) {
    const p = t * 2.1 + i * 2.1;
    const h = 32 + Math.sin(p) * 8 + i * 5;
    const sx = x + Math.sin(p * 1.5) * 4;
    ctx.fillStyle = [P.warm, P.glow, '#fff0c4'][i];
    ctx.beginPath();
    ctx.moveTo(sx - 9 + i * 3, gy - 7);
    ctx.quadraticCurveTo(sx - 4, gy - h * 0.6, sx, gy - h);
    ctx.quadraticCurveTo(sx + 4, gy - h * 0.6, sx + 9 - i * 3, gy - 7);
    ctx.closePath(); ctx.fill();
  }
  for (let i = 0; i < 4; i++) {
    const p = (t * 0.55 + i * 0.4) % 1;
    ctx.fillStyle = `rgba(233,163,79,${(1 - p) * 0.65})`;
    ctx.beginPath();
    ctx.arc(x + Math.sin(i * 3 + t) * 15, gy - 22 - p * 60, 1.7, 0, TAU);
    ctx.fill();
  }
}

/* --- a milestone --------------------------------------------------------- */
function cairn(ctx, x, gy, t, near) {
  /* Stacked stones rather than a crystal: hand-placed, warm, and it reads as
   * something you built rather than something the game spawned. */
  const stones = [[0, 0, 34, 16], [2, -15, 27, 14], [-2, -28, 21, 12], [1, -39, 14, 10]];
  const lean = Math.sin(t * 0.6) * 0.6;
  stones.forEach(([dx, dy, w, h], i) => {
    ctx.save();
    ctx.translate(x + dx + lean * i * 0.3, gy + dy - h / 2);
    shape(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, i * 0.05, 0, TAU); },
          i % 2 ? '#d8cfc0' : '#c6bcab');
    ctx.restore();
  });
  const lit = 0.35 + Math.sin(t * 1.5) * 0.12 + near * 0.4;
  halo(ctx, x + 1, gy - 52, 26, lit * 0.5);
  shape(ctx, () => { ctx.beginPath(); ctx.arc(x + 1, gy - 52, 5, 0, TAU); }, P.warm);
}

/* --- something she leaves for me ---------------------------------------- */
function postbox(ctx, x, gy, t, near) {
  const flag = near > 0.4 ? -0.9 : -0.15 + Math.sin(t * 0.5) * 0.04;
  post(ctx, x, gy, 66);
  ctx.save();
  ctx.translate(x, gy - 66);
  shape(ctx, () => roundRect(ctx, -24, -34, 48, 34, 6), P.paper);
  line(ctx, LINE * 0.7, P.inkSoft);
  ctx.beginPath(); ctx.moveTo(-13, -12); ctx.lineTo(13, -12); ctx.stroke();
  ctx.save();
  ctx.translate(22, -28);
  ctx.rotate(flag);
  shape(ctx, () => roundRect(ctx, 0, -3, 16, 10, 2), P.blush);
  ctx.restore();
  ctx.restore();
}

/* --- a song -------------------------------------------------------------- */
function song(ctx, x, gy, t, near) {
  post(ctx, x, gy, 58);
  ctx.save();
  ctx.translate(x, gy - 58);
  shape(ctx, () => roundRect(ctx, -26, -30, 52, 30, 4), P.paper);
  shape(ctx, () => { ctx.beginPath(); ctx.arc(-9, -15, 10, 0, TAU); }, '#cfd9d5');
  shape(ctx, () => { ctx.beginPath(); ctx.arc(-9, -15, 3, 0, TAU); }, P.ink);
  line(ctx, LINE * 0.7, P.inkSoft);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(12, -15, 4 + i * 4, -0.9, 0.9);
    ctx.stroke();
  }
  ctx.restore();
  /* Notes drifting up, so it is obviously playing. */
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.4 + i * 0.34) % 1;
    ctx.globalAlpha = (1 - p) * (0.5 + near * 0.4);
    ctx.fillStyle = P.ink;
    const nx = x + 18 + Math.sin(p * 5 + i) * 8;
    const ny = gy - 92 - p * 34;
    ctx.beginPath(); ctx.ellipse(nx, ny, 3.4, 2.6, -0.4, 0, TAU); ctx.fill();
    line(ctx, 1.4);
    ctx.beginPath(); ctx.moveTo(nx + 3, ny - 1); ctx.lineTo(nx + 3, ny - 9); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/* --- how long until we are in the same place ---------------------------- */
function hourglass(ctx, x, gy, t, near) {
  post(ctx, x, gy, 52);
  ctx.save();
  ctx.translate(x, gy - 52);
  line(ctx, LINE * 0.8);
  ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(20, 0);
  ctx.moveTo(-20, -56); ctx.lineTo(20, -56); ctx.stroke();

  shape(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-16, -2); ctx.lineTo(16, -2);
    ctx.quadraticCurveTo(2, -28, 16, -54);
    ctx.lineTo(-16, -54);
    ctx.quadraticCurveTo(-2, -28, -16, -2);
    ctx.closePath();
  }, 'rgba(255,255,255,0.55)');

  const fall = (t % 2) / 2;
  ctx.fillStyle = P.warm;
  ctx.beginPath();
  ctx.moveTo(-13, -52); ctx.lineTo(13, -52);
  ctx.lineTo(1.5, -32 + fall * 4); ctx.lineTo(-1.5, -32 + fall * 4);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-9 - fall * 3, -4); ctx.lineTo(9 + fall * 3, -4);
  ctx.lineTo(0, -18); ctx.closePath(); ctx.fill();
  ctx.fillRect(-0.8, -30, 1.6, 14);
  ctx.restore();
}

/* --- a place on the map -------------------------------------------------- */
function pin(ctx, x, gy, t, near) {
  const hover = Math.sin(t * 1.1) * 4;
  const cy = gy - 74 + hover;
  ctx.fillStyle = P.shade;
  ctx.beginPath(); ctx.ellipse(x, gy - 2, 16 - hover * 0.4, 4, 0, 0, TAU); ctx.fill();
  line(ctx, LINE * 0.8, P.inkSoft);
  ctx.setLineDash([3, 5]);
  ctx.beginPath(); ctx.moveTo(x, gy - 6); ctx.lineTo(x, cy + 24); ctx.stroke();
  ctx.setLineDash([]);
  shape(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(x, cy + 26);
    ctx.quadraticCurveTo(x - 19, cy + 2, x - 19, cy - 8);
    ctx.arc(x, cy - 8, 19, Math.PI, 0);
    ctx.quadraticCurveTo(x + 19, cy + 2, x, cy + 26);
    ctx.closePath();
  }, P.blush);
  shape(ctx, () => { ctx.beginPath(); ctx.arc(x, cy - 8, 7, 0, TAU); }, P.paper);
  if (near > 0.05) halo(ctx, x, cy - 8, 40, near * 0.3);
}

/* --- a ritual, done apart at the same time ------------------------------ */
function cups(ctx, x, gy, t, near) {
  line(ctx, LINE * 0.9, P.inkSoft);
  ctx.beginPath(); ctx.moveTo(x - 34, gy); ctx.lineTo(x + 34, gy); ctx.stroke();

  for (const [dx, tilt] of [[-17, -0.05], [17, 0.05]]) {
    ctx.save();
    ctx.translate(x + dx, gy);
    ctx.rotate(tilt);
    shape(ctx, () => roundRect(ctx, -13, -26, 26, 26, 3), P.paper);
    line(ctx, LINE * 0.7);
    ctx.beginPath(); ctx.arc(15, -15, 6, -1.2, 1.2); ctx.stroke();
    ctx.fillStyle = '#b98a5e';
    roundRect(ctx, -10, -22, 20, 6, 2); ctx.fill();
    ctx.restore();
  }
  /* Steam, only when she is close enough to notice it. */
  for (let i = 0; i < 2; i++) {
    const p = (t * 0.5 + i * 0.5) % 1;
    ctx.globalAlpha = (1 - p) * (0.25 + near * 0.45);
    line(ctx, 2, P.inkSoft);
    const sx = x - 17 + i * 34;
    ctx.beginPath();
    ctx.moveTo(sx, gy - 30 - p * 16);
    ctx.quadraticCurveTo(sx + 6, gy - 38 - p * 16, sx, gy - 46 - p * 16);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/* --- the thing we are growing ------------------------------------------- */
function sapling(ctx, x, gy, t, near) {
  const sway = Math.sin(t * 0.6) * 3;
  shape(ctx, () => roundRect(ctx, x - 22, gy - 20, 44, 20, 3), '#c98f63');
  line(ctx, LINE, P.sage);
  ctx.beginPath();
  ctx.moveTo(x, gy - 18);
  ctx.quadraticCurveTo(x + sway * 0.4, gy - 46, x + sway, gy - 72);
  ctx.stroke();
  for (const [dy, dir, len] of [[-38, -1, 18], [-52, 1, 20], [-64, -1, 15]]) {
    ctx.save();
    ctx.translate(x + sway * ((gy + dy) / gy), gy + dy);
    shape(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(dir * len * 0.5, -len * 0.6, dir * len, -len * 0.15);
      ctx.quadraticCurveTo(dir * len * 0.5, len * 0.25, 0, 0);
      ctx.closePath();
    }, P.sage);
    ctx.restore();
  }
  if (near > 0.1) halo(ctx, x + sway, gy - 72, 30, near * 0.25);
}

export const STATIONS = [
  {name: 'photo',     role: 'a photograph',        draw: photo},
  {name: 'lantern',   role: 'an idea we had',      draw: lantern},
  {name: 'bloom',     role: 'a gift',              draw: bloom},
  {name: 'letter',    role: 'a love letter',       draw: letter},
  {name: 'fire',      role: 'a place together',    draw: fire},
  {name: 'cairn',     role: 'a milestone',         draw: cairn},
  {name: 'postbox',   role: 'she leaves me one',   draw: postbox},
  {name: 'song',      role: 'a song',              draw: song},
  {name: 'hourglass', role: 'the wait',            draw: hourglass},
  {name: 'pin',       role: 'a place',             draw: pin},
  {name: 'cups',      role: 'a ritual',            draw: cups},
  {name: 'sapling',   role: 'what we are growing', draw: sapling},
];
