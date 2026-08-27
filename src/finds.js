/* Things to find.
 *
 * Every one is an actual object out of his story — the charm she crocheted,
 * the bracelet from Helsinki, the Lego, the brownies. That matters more than
 * it sounds: a generic pickup is a score, and a thing she gave him is a
 * memory. Finding them is the reason the leap exists.
 *
 * They float above the ground, most of them high enough that walking past is
 * not enough. Some sit in hollows. All of them are off to one side of the
 * moment they belong to, so looking around is rewarded and rushing is not
 * punished — nothing here can be lost.
 */

import {P} from './theme.js';

const TAU = Math.PI * 2;

/* `at` is a fraction along the world; `lift` is how far above the ground it
 * floats, in pixels.
 *
 * The tether gives 150px free and 110px more against a rising pull, so 260 is
 * the ceiling and nothing sits above 230. The high ones genuinely have to be
 * stretched for; none of them is unreachable. */
export const FINDS = [
  {id: 'pancakes', name: 'cottage cheese pancakes', at: 0.20, lift: 140,
   note: 'You showed up with these out of nowhere.'},
  {id: 'kebab', name: 'the kebab', at: 0.26, lift: 70,
   note: 'Such a German story.'},
  {id: 'sweets', name: 'sweets from Sweden', at: 0.33, lift: 225,
   note: 'A week away and you still came back with these.'},
  {id: 'bracelet', name: 'the flower bracelet', at: 0.42, lift: 196,
   note: 'I brought it back from Helsinki for you.'},
  {id: 'charm', name: 'the crocheted charm', at: 0.47, lift: 196,
   note: 'You made it. It still hangs on my bag.'},
  {id: 'shell', name: 'a shell from Jūrmala', at: 0.55, lift: 58,
   note: 'A whole day of doing next to nothing.'},
  {id: 'lego', name: 'the McQueen Lego', at: 0.60, lift: 205,
   note: 'My birthday. You knew exactly what to get.'},
  {id: 'brownies', name: 'the brownies', at: 0.66, lift: 128,
   note: 'We baked them before Poland. Your family loved them too.'},
  {id: 'souvenir', name: 'a souvenir from Poland', at: 0.70, lift: 230,
   note: 'You opened them like a child on Christmas morning.'},
  {id: 'keys', name: 'the car keys', at: 0.74, lift: 170,
   note: 'You were so thrilled for me.'},
  {id: 'wine', name: 'the wine', at: 0.86, lift: 205,
   note: 'The last two nights. Sun, wine, laughing.'},
  {id: 'ticket', name: 'the boarding pass', at: 0.93, lift: 108,
   note: 'And then it was time to say goodbye.'},
];

/* Each drawn small, in the house palette, at the origin. */
const ART = {
  pancakes(ctx) {
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i % 2 ? '#f0dcae' : '#e8cf9a';
      ctx.beginPath(); ctx.ellipse(0, 4 - i * 4, 11 - i, 4, 0, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = P.blush;
    ctx.beginPath(); ctx.arc(2, -6, 2.4, 0, TAU); ctx.fill();
  },
  kebab(ctx) {
    ctx.fillStyle = '#e3c48c';
    ctx.beginPath(); ctx.moveTo(-7, 6); ctx.quadraticCurveTo(0, -12, 7, 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c07a5a';
    ctx.beginPath(); ctx.ellipse(0, 1, 5, 3, 0, 0, TAU); ctx.fill();
  },
  sweets(ctx) {
    ctx.fillStyle = P.blush;
    ctx.beginPath(); ctx.ellipse(0, 0, 6, 4.5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = P.blush; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, 0); ctx.lineTo(-11, -3); ctx.moveTo(-6, 0); ctx.lineTo(-11, 3);
    ctx.moveTo(6, 0); ctx.lineTo(11, -3); ctx.moveTo(6, 0); ctx.lineTo(11, 3);
    ctx.stroke();
  },
  bracelet(ctx) {
    ctx.strokeStyle = P.sage; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      ctx.fillStyle = i % 2 ? P.blush : P.warm;
      ctx.beginPath(); ctx.arc(Math.cos(a) * 8, Math.sin(a) * 8, 2.6, 0, TAU); ctx.fill();
    }
  },
  charm(ctx) {
    ctx.strokeStyle = P.inkSoft; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(0, -5); ctx.stroke();
    ctx.fillStyle = '#d9a3b4';
    ctx.beginPath(); ctx.arc(0, 0, 6.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
    for (let i = -4; i <= 4; i += 4) {
      ctx.beginPath(); ctx.moveTo(i, -5); ctx.lineTo(i, 5); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
  shell(ctx) {
    ctx.fillStyle = '#f0e2c8';
    ctx.beginPath(); ctx.arc(0, 3, 9, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c9b08a'; ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(i * 4, 3); ctx.lineTo(i * 6, -5); ctx.stroke();
    }
  },
  lego(ctx) {
    ctx.fillStyle = '#cf5b4a';
    ctx.beginPath(); ctx.roundRect(-10, -4, 20, 9, 2); ctx.fill();
    ctx.fillStyle = '#2f3a44';
    ctx.beginPath(); ctx.arc(-5, 6, 3, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(5, 6, 3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#a8cfe0';
    ctx.beginPath(); ctx.roundRect(-4, -8, 9, 5, 1.5); ctx.fill();
  },
  brownies(ctx) {
    ctx.fillStyle = '#6b4630';
    ctx.beginPath(); ctx.roundRect(-9, -5, 18, 11, 1.5); ctx.fill();
    ctx.strokeStyle = '#4e3121'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 6); ctx.moveTo(-9, 0.5); ctx.lineTo(9, 0.5); ctx.stroke();
  },
  souvenir(ctx) {
    ctx.fillStyle = '#d8c7a8';
    ctx.beginPath(); ctx.roundRect(-8, -6, 16, 13, 2); ctx.fill();
    ctx.strokeStyle = P.blush; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 7); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
  },
  keys(ctx) {
    ctx.strokeStyle = P.inkSoft; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(-4, -3, 4.5, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(7, 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, 5); ctx.lineTo(7, 2); ctx.moveTo(6, 7); ctx.lineTo(9, 4); ctx.stroke();
  },
  wine(ctx) {
    ctx.strokeStyle = P.inkSoft; ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-6, -9); ctx.lineTo(-4, -1); ctx.quadraticCurveTo(0, 4, 4, -1); ctx.lineTo(6, -9);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 3); ctx.lineTo(0, 9); ctx.moveTo(-4, 9); ctx.lineTo(4, 9); ctx.stroke();
    ctx.fillStyle = 'rgba(160,60,80,0.55)';
    ctx.beginPath();
    ctx.moveTo(-5, -5); ctx.lineTo(-4, -1); ctx.quadraticCurveTo(0, 4, 4, -1); ctx.lineTo(5, -5);
    ctx.closePath(); ctx.fill();
  },
  ticket(ctx) {
    ctx.fillStyle = P.paper;
    ctx.beginPath(); ctx.roundRect(-11, -6, 22, 12, 2); ctx.fill();
    ctx.strokeStyle = P.inkSoft; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(-11, -6, 22, 12, 2); ctx.stroke();
    ctx.setLineDash([2, 2]);
    ctx.beginPath(); ctx.moveTo(4, -6); ctx.lineTo(4, 6); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = P.inkSoft;
    ctx.fillRect(-8, -2, 9, 1.4); ctx.fillRect(-8, 1, 6, 1.4);
  },
};

export function drawFind(ctx, find, x, y, t, taken, near) {
  if (taken) return;
  const bob = Math.sin(t * 1.4 + find.at * 40) * 4;
  const yy = y + bob;

  /* A small light so it can be spotted from a distance — the whole point is
   * that she sees something up there and wonders how to reach it. */
  const pulse = 0.5 + Math.sin(t * 2 + find.at * 30) * 0.12 + near * 0.35;
  const g = ctx.createRadialGradient(x, yy, 1, x, yy, 34);
  g.addColorStop(0, `rgba(255, 214, 140, ${0.42 * pulse})`);
  g.addColorStop(1, 'rgba(255, 214, 140, 0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, yy, 34, 0, TAU); ctx.fill();

  ctx.save();
  ctx.translate(x, yy);
  const art = ART[find.id];
  if (art) art(ctx);
  ctx.restore();
}
