/* The house style.
 *
 * Every object in the game is built from the pieces in this file, which is the
 * only reason they look like they belong to each other. The first pass gave
 * each station its own palette and construction — useful for choosing, useless
 * as a game. One palette, one stroke weight, one way of standing on the
 * ground.
 *
 * The rules:
 *   - Line-led. Shapes are drawn, not shaded. One weight, round caps.
 *   - Warm neutrals, and colour only where something is alive or lit.
 *   - Everything stands on the ground and reaches roughly the same height, so
 *     a row of them reads as a set rather than as a collection.
 *   - Glow only where there is an actual light source.
 */

export const P = {
  ink:     '#4f4840',   // every line
  inkSoft: '#958c80',   // secondary line, labels
  paper:   '#faf7f0',   // anything made of paper or ceramic
  warm:    '#e9a34f',   // lit things
  glow:    '#ffc978',   // the light they give off
  sage:    '#3ba88f',   // growing things — the slime's own colour
  blush:   '#dd8b95',   // affection: petals, hearts
  shade:   'rgba(79,72,64,0.10)',
};

export const LINE = 2.4;
export const TOP = 104;        // how high a station reaches, give or take

export function line(ctx, w = LINE, color = P.ink) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

/* The standard stand: a stem from the ground with a small foot. Nearly every
 * station uses it, which is most of what makes them a family. */
export function post(ctx, x, gy, h, lean = 0) {
  line(ctx);
  ctx.beginPath();
  ctx.moveTo(x, gy);
  ctx.quadraticCurveTo(x + lean * 0.4, gy - h * 0.55, x + lean, gy - h);
  ctx.stroke();
  line(ctx, LINE * 0.9, P.inkSoft);
  ctx.beginPath();
  ctx.moveTo(x - 7, gy); ctx.lineTo(x + 7, gy);
  ctx.stroke();
}

/* A paper card: soft shadow, cream fill, drawn outline. */
export function card(ctx, x, y, w, h, r = 3) {
  ctx.fillStyle = P.shade;
  roundRect(ctx, x - w / 2 + 1.5, y + 2.5, w, h, r);
  ctx.fill();
  ctx.fillStyle = P.paper;
  roundRect(ctx, x - w / 2, y, w, h, r);
  ctx.fill();
  line(ctx, LINE * 0.75);
  roundRect(ctx, x - w / 2, y, w, h, r);
  ctx.stroke();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* One glow, used by everything that gives off light, so the light in this
 * world always behaves the same way. */
export function halo(ctx, x, y, r, a = 0.4) {
  const g = ctx.createRadialGradient(x, y, 1, x, y, r);
  g.addColorStop(0, `rgba(255,201,120,${a})`);
  g.addColorStop(1, 'rgba(255,201,120,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/* A filled shape with the same drawn outline every other shape has. */
export function shape(ctx, path, fill) {
  ctx.fillStyle = fill;
  path();
  ctx.fill();
  line(ctx, LINE * 0.8);
  path();
  ctx.stroke();
}
