/* The land.
 *
 * The world was a horizontal line with posts on it, which reads as a corridor
 * however nicely the posts are drawn. Ground that rises, falls and changes
 * underfoot is most of what makes somewhere feel like somewhere.
 *
 * Height is a pure function of x. Nothing is stored, so the land is the same
 * every visit, costs no memory, and any part of it can be asked about at any
 * time — which the camera, the creature and every station all need to do.
 *
 * Regions are stretches of that line with their own palette and their own
 * shape of ground. They blend into each other rather than switching, so
 * walking out of the parks and into the dunes is something she notices without
 * ever crossing a boundary.
 */

const TAU = Math.PI * 2;

/* Each region owns a stretch of the world. `roll` is how restless the ground
 * is; `soft` rounds it off. A beach is wide and calm, a forest is not. */
export const REGIONS = [
  {name: 'school',   span: 1500, sky: '#eef1f5', ground: '#dbe2e6', ink: '#4e5a66',
   roll: 26, soft: 1.1, feature: 'town'},
  {name: 'vienna',   span: 1500, sky: '#f1ebe2', ground: '#ddd2c1', ink: '#6a5b48',
   roll: 34, soft: 1.0, feature: 'town'},
  {name: 'riga',     span: 3400, sky: '#eaf0e6', ground: '#c9d9bd', ink: '#47603c',
   roll: 44, soft: 0.9, feature: 'park'},
  {name: 'jurmala',  span: 2200, sky: '#f4efe1', ground: '#ecdcb6', ink: '#8a7340',
   roll: 24, soft: 1.5, feature: 'dune'},
  {name: 'lake',     span: 3000, sky: '#e5ede8', ground: '#c1d4c1', ink: '#365443',
   roll: 70, soft: 0.7, feature: 'forest'},
  {name: 'goodbye',  span: 2400, sky: '#e9e6f0', ground: '#cdc8dd', ink: '#4c4463',
   roll: 40, soft: 1.0, feature: 'town'},
  {name: 'now',      span: 2600, sky: '#f3efe8', ground: '#e1d8c8', ink: '#675c4c',
   roll: 18, soft: 1.6, feature: 'quiet'},
];


/* Where each region starts and ends, worked out once. */
let acc = 0;
for (const r of REGIONS) { r.from = acc; acc += r.span; r.to = acc; }
export const WORLD_END = acc;

export function regionAt(x) {
  for (const r of REGIONS) if (x < r.to) return r;
  return REGIONS[REGIONS.length - 1];
}

/* How far into the crossfade between one region and the next, 0..1. The blend
 * is wide on purpose: a hard edge would read as a level boundary. */
const BLEND = 420;

function mixRegions(x) {
  const r = regionAt(x);
  const i = REGIONS.indexOf(r);
  const next = REGIONS[i + 1];
  if (!next || x < r.to - BLEND) return {a: r, b: r, t: 0};
  return {a: r, b: next, t: (x - (r.to - BLEND)) / BLEND};
}

/* Layered sines. Not noise: this has to be identical on every device and every
 * visit, and three sines at unrelated periods never visibly repeat over the
 * distance she will actually walk. */
function shape(x, roll, soft) {
  const a = Math.sin(x / 340) * roll;
  const b = Math.sin(x / 137 + 1.7) * roll * 0.42;
  const c = Math.sin(x / 61 + 3.1) * roll * 0.16 * (1 / soft);
  /* Squashing a sine through tanh flattens its peaks and steepens its
   * shoulders, which turns gentle undulation into ledges and drops — somewhere
   * to leap up to, and down from. Sines alone only ever give rolling hills. */
  const d = Math.tanh(Math.sin(x / 205 + 0.6) * 2.8) * roll * 0.85 / soft;
  return a + b + c + d;
}

/* Ground height at x. Negative is up — screen coordinates, so the whole engine
 * agrees on which way gravity points. */
export function heightAt(x) {
  const {a, b, t} = mixRegions(x);
  const ha = shape(x, a.roll, a.soft);
  const hb = shape(x, b.roll, b.soft);
  return -(ha + (hb - ha) * ease(t));
}

/* The slope underfoot, for leaning the creature and for deciding whether a
 * stretch is climbable. Sampled rather than differentiated because the sines
 * are cheap and a sampled slope matches what is actually drawn. */
export function slopeAt(x, d = 6) {
  return (heightAt(x + d) - heightAt(x - d)) / (d * 2);
}

/* The palette at x, blended across a boundary the same way the ground is. */
export function paletteAt(x) {
  const {a, b, t} = mixRegions(x);
  const e = ease(t);
  return {
    sky: mix(a.sky, b.sky, e),
    ground: mix(a.ground, b.ground, e),
    ink: mix(a.ink, b.ink, e),
    name: e > 0.5 ? b.name : a.name,
    feature: e > 0.5 ? b.feature : a.feature,
  };
}

const ease = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);

export function mix(c1, c2, t) {
  if (c1 === c2 || t <= 0) return c1;
  if (t >= 1) return c2;
  const a = hex(c1), b = hex(c2);
  return '#' + [0, 1, 2]
    .map(i => Math.round(a[i] + (b[i] - a[i]) * t).toString(16).padStart(2, '0'))
    .join('');
}

function hex(s) {
  const n = parseInt(s.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/* Scenery that belongs to the ground rather than to the story: trees, dunes,
 * rooftops. Derived from x so it never has to be stored or placed by hand. */
export function scatter(x0, x1, step, seedSalt) {
  const out = [];
  const first = Math.floor(x0 / step) * step;
  for (let x = first; x <= x1 + step; x += step) {
    const r = hash(x, seedSalt);
    out.push({x: x + r * step * 0.7, r, r2: hash(x, seedSalt + 91)});
  }
  return out;
}

function hash(i, salt) {
  let n = (Math.round(i) * 374761393 + salt * 668265263) | 0;
  n = (n ^ (n >>> 13)) * 1274126177 | 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

export {TAU};
