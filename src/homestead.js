/* The homestead, and what the land gives.
 *
 * The place sits past the eighteen things, in the last region. That is
 * deliberate: her story runs out at the airport and then at "eighteen things",
 * and the only honest direction after those is forward. So the ground she can
 * actually change is on the far side of them.
 */

import {P} from './theme.js';
import * as tend from './tend.js';

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

/* The homestead itself. Everything she has built, plus every plot, drawn on
 * the ground she chose to make hers. */
export function drawHome(ctx, x0, gy, t) {
  const b = tend.built();

  if (b.includes('path')) {
    ctx.fillStyle = '#cfc6b4'; ctx.globalAlpha = 0.8;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.ellipse(x0 - 150 + i * 26, gy - 1, 9, 3.5, 0, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  if (b.includes('fence')) {
    ctx.strokeStyle = '#8a6a4c'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const fx = x0 + 60 + i * 22;
      ctx.beginPath(); ctx.moveTo(fx, gy); ctx.lineTo(fx, gy - 20); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(x0 + 60, gy - 14); ctx.lineTo(x0 + 60 + 8 * 22, gy - 14); ctx.stroke();
  }
  if (b.includes('walls')) {
    ctx.fillStyle = '#d8cdb8';
    ctx.fillRect(x0 - 60, gy - 62, 96, 62);
    ctx.strokeStyle = P.ink; ctx.lineWidth = 2; ctx.globalAlpha = 0.5;
    ctx.strokeRect(x0 - 60, gy - 62, 96, 62); ctx.globalAlpha = 1;
    ctx.fillStyle = '#8a6a4c';
    ctx.fillRect(x0 - 26, gy - 34, 22, 34);
  }
  if (b.includes('roof')) {
    ctx.fillStyle = '#a8674f';
    ctx.beginPath();
    ctx.moveTo(x0 - 72, gy - 60); ctx.lineTo(x0 - 12, gy - 100);
    ctx.lineTo(x0 + 48, gy - 60); ctx.closePath(); ctx.fill();
    /* A lit window, once there is somewhere for the light to be. */
    ctx.fillStyle = P.warm;
    ctx.globalAlpha = 0.55 + Math.sin(t * 1.4) * 0.08;
    ctx.fillRect(x0 + 4, gy - 48, 16, 14);
    ctx.globalAlpha = 1;
  }
  if (b.includes('well')) {
    ctx.fillStyle = '#a9a094';
    ctx.beginPath(); ctx.ellipse(x0 + 128, gy - 6, 16, 8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5c6b74';
    ctx.beginPath(); ctx.ellipse(x0 + 128, gy - 8, 10, 5, 0, 0, TAU); ctx.fill();
  }
  if (b.includes('bench')) {
    ctx.fillStyle = '#8a6a4c';
    ctx.fillRect(x0 + 176, gy - 16, 40, 5);
    ctx.fillRect(x0 + 180, gy - 12, 4, 12);
    ctx.fillRect(x0 + 208, gy - 12, 4, 12);
  }

  /* The plots. Each one is a real plant that grew in real hours. */
  tend.plots().forEach((p, i) => {
    const px = x0 + 66 + (i % 8) * 22;
    const py = gy - Math.floor(i / 8) * 16;
    const s = tend.stageOf(p);
    ctx.strokeStyle = '#6f9455'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    if (s === 0) {
      ctx.fillStyle = '#a08b6c';
      ctx.beginPath(); ctx.ellipse(px, py - 2, 5, 2.5, 0, 0, TAU); ctx.fill();
    } else {
      const h = 5 + s * 5;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - h); ctx.stroke();
      if (s >= 2) {
        ctx.beginPath();
        ctx.moveTo(px, py - h * 0.6); ctx.lineTo(px - 6, py - h * 0.85);
        ctx.moveTo(px, py - h * 0.6); ctx.lineTo(px + 6, py - h * 0.85);
        ctx.stroke();
      }
      if (s >= 4) {
        ctx.fillStyle = P.blush;
        ctx.beginPath(); ctx.arc(px, py - h - 3, 4, 0, TAU); ctx.fill();
        ctx.fillStyle = P.warm;
        ctx.beginPath(); ctx.arc(px, py - h - 3, 1.6, 0, TAU); ctx.fill();
      }
    }
  });
}
