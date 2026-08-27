/* Tending.
 *
 * The loop is Minecraft's, minus the part that punishes you: gather what the
 * land gives, make something with it, and the place slowly becomes yours.
 *
 * There is no health, no thirst and no death, and that is a decision rather
 * than an omission. A bar that drains while she is not playing turns a gift
 * into an obligation, and the first bad week turns it into guilt. Nothing here
 * wilts, nothing scolds her for being away, and nothing can be lost.
 *
 * What replaces the pressure is TIME. A seed takes real hours to come up, so
 * the world is genuinely different tomorrow morning than it is tonight. That
 * is the reason to come back, and it costs her nothing to earn.
 *
 * Both of them tend the same homestead. When the backend is wired, what he
 * plants is there when she next looks.
 */

const SAVE = 'us.tend';
const HOUR = 3600e3;

/* What the land gives, and where. Tied to the regions of their story, so
 * gathering is also travelling. */
export const RESOURCES = {
  water: {name: 'water', from: 'lake',    colour: '#7fb4c4'},
  wood:  {name: 'wood',  from: 'lake',    colour: '#8a6a4c'},
  seed:  {name: 'seeds', from: 'riga',    colour: '#6f9455'},
  stone: {name: 'stone', from: 'jurmala', colour: '#a9a094'},
};

/* Growth. Real hours, so a seed planted tonight is up tomorrow — the whole
 * point of the mechanic. Watering skips a stage's worth of waiting rather
 * than being required, so forgetting costs patience and never the plant. */
export const STAGES = [
  {at: 0,   name: 'planted'},
  {at: 3,   name: 'sprouting'},
  {at: 10,  name: 'growing'},
  {at: 24,  name: 'in leaf'},
  {at: 44,  name: 'flowering'},
];

export const BUILDS = [
  {id: 'path',   name: 'a path',    cost: {stone: 3},           note: 'so the way to the door is worn in'},
  {id: 'fence',  name: 'a fence',   cost: {wood: 4},            note: 'a line that says this bit is ours'},
  {id: 'bench',  name: 'a bench',   cost: {wood: 6, stone: 2},  note: 'somewhere to sit and do nothing, which we were good at'},
  {id: 'well',   name: 'a well',    cost: {stone: 8},           note: 'so the water is always here'},
  {id: 'walls',  name: 'walls',     cost: {wood: 12, stone: 6}, note: 'the beginning of somewhere indoors'},
  {id: 'roof',   name: 'a roof',    cost: {wood: 16, stone: 4}, note: 'and then it is a house'},
];

const BLANK = () => ({inv: {water: 0, wood: 0, seed: 0, stone: 0},
                      plots: [], built: [], taken: {}, v: 1});

let state = load();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE) || 'null');
    if (!raw || raw.v !== 1) return BLANK();
    const b = BLANK();
    return {...b, ...raw, inv: {...b.inv, ...(raw.inv || {})}};
  } catch { return BLANK(); }
}

export function save() {
  try { localStorage.setItem(SAVE, JSON.stringify(state)); } catch {}
}

export const get = () => state;
export const inv = () => state.inv;
export const plots = () => state.plots;
export const built = () => state.built;

export function has(cost) {
  return Object.entries(cost).every(([k, n]) => (state.inv[k] || 0) >= n);
}

export function take(kind, n = 1) {
  state.inv[kind] = (state.inv[kind] || 0) + n;
  save();
}

export function build(id) {
  const b = BUILDS.find(x => x.id === id);
  if (!b || state.built.includes(id) || !has(b.cost)) return false;
  for (const [k, n] of Object.entries(b.cost)) state.inv[k] -= n;
  state.built.push(id);
  save();
  return true;
}

export function plant() {
  if ((state.inv.seed || 0) < 1) return false;
  state.inv.seed--;
  state.plots.push({at: Date.now(), water: 0});
  save();
  return true;
}

/* Watering brings a plot forward. It never has to be done — a plot left alone
 * still gets there, just slower. */
export function water(i) {
  const p = state.plots[i];
  if (!p || (state.inv.water || 0) < 1) return false;
  if (stageOf(p) >= STAGES.length - 1) return false;
  state.inv.water--;
  p.water = (p.water || 0) + 1;
  save();
  return true;
}

export function ageOf(p) {
  return (Date.now() - p.at) / HOUR + (p.water || 0) * 6;
}

export function stageOf(p) {
  const h = ageOf(p);
  let s = 0;
  for (let i = 0; i < STAGES.length; i++) if (h >= STAGES[i].at) s = i;
  return s;
}

/* When the next thing will visibly change, in words. Concrete beats a
 * progress bar: "tomorrow morning" is a reason to come back, 62% is not. */
export function nextChange(p) {
  const s = stageOf(p);
  if (s >= STAGES.length - 1) return null;
  const hrs = STAGES[s + 1].at - ageOf(p);
  if (hrs <= 1) return 'within the hour';
  if (hrs <= 5) return `in about ${Math.round(hrs)} hours`;
  if (hrs <= 20) return 'by tomorrow';
  return `in about ${Math.round(hrs / 24)} days`;
}

/* Resource nodes.
 *
 * Derived from position rather than stored, and they come back after a few
 * real hours. Regrowth is slow enough to have a rhythm and fast enough that
 * she is never stuck: the homestead only ever needs patience, not grinding.
 */
const REGROW = 5 * HOUR;

export function nodeTaken(id) {
  const t = state.taken[id];
  if (!t) return false;
  if (Date.now() - t > REGROW) { delete state.taken[id]; save(); return false; }
  return true;
}

export function takeNode(id, kind) {
  if (nodeTaken(id)) return false;
  state.taken[id] = Date.now();
  take(kind, 1);
  return true;
}

/* For the backend, when it is wired: the whole of her progress in one object,
 * small enough to send on every change without thinking about it. */
export function snapshot() { return JSON.parse(JSON.stringify(state)); }

export function restore(remote) {
  if (!remote || remote.v !== 1) return false;
  /* Whichever has more in it wins, per field. Two devices editing the same
   * homestead should never subtract from each other. */
  const merged = BLANK();
  merged.inv = {...merged.inv};
  for (const k of Object.keys(merged.inv)) {
    merged.inv[k] = Math.max(state.inv[k] || 0, remote.inv?.[k] || 0);
  }
  merged.plots = (remote.plots?.length ?? 0) > state.plots.length ? remote.plots : state.plots;
  merged.built = [...new Set([...(state.built || []), ...(remote.built || [])])];
  merged.taken = {...(remote.taken || {}), ...state.taken};
  state = merged;
  save();
  return true;
}
