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
/* Everything the game balances on comes from content/world.json, emitted by
 * design/*.py. The runtime holds no opinions about numbers: tuning is a Python
 * edit and a re-run, and the balance can be simulated against four hundred
 * imaginary players before she ever sees it.
 *
 * The fallbacks below are only what keeps the app alive if the file fails to
 * load; they are never the real values. */
export let RESOURCES = {
  water: {name: 'water', colour: '#7fb4c4'},
  wood:  {name: 'wood',  colour: '#8a6a4c'},
  seed:  {name: 'seeds', colour: '#6f9455'},
  stone: {name: 'stone', colour: '#a9a094'},
};
export let PRODUCES = {};
export let STAGES = [{at: 0, name: 'planted'}];
export let BUILDS = [];
export let TIERS = [];
export let FLORA = [];
let WATER_GAIN = 6, REGROW_H = 5, HARVEST = {gives: {}, resetsTo: 1};

export async function loadWorld() {
  try {
    const r = await fetch('content/world.json', {cache: 'no-cache'});
    if (!r.ok) return false;
    const w = await r.json();
    RESOURCES = w.resources || RESOURCES;
    PRODUCES = w.produces || {};
    STAGES = w.stages || STAGES;
    BUILDS = w.builds || [];
    TIERS = w.tiers || [];
    FLORA = w.flora || [];
    WATER_GAIN = w.waterGain ?? 6;
    REGROW_H = w.nodeRegrow ?? 5;
    HARVEST = w.harvest || HARVEST;
    return true;
  } catch { return false; }
}

/* A tier opens only when everything in the one before it is built, so the
 * homestead becomes a place in a recognisable order rather than a shopping
 * list sorted by price. */
export function tierOpen(tierId) {
  const t = TIERS.find(x => x.id === tierId);
  if (!t || !t.needs) return true;
  const need = BUILDS.filter(b => b.tier === t.needs).map(b => b.id);
  return need.every(id => state.built.includes(id));
}

export function available() {
  return BUILDS.filter(b => tierOpen(b.tier));
}

const BLANK = () => ({inv: {water: 0, wood: 0, seed: 0, stone: 0},
                      plots: [], built: [], taken: {},
                      /* When each producer last had its output collected, and
                       * when she was last here at all. */
                      made: {}, seen: Date.now(), v: 1});

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
  if (!b || state.built.includes(id) || !has(b.cost) || !tierOpen(b.tier)) return false;
  for (const [k, n] of Object.entries(b.cost)) state.inv[k] -= n;
  state.built.push(id);
  /* A producer starts counting from the moment it exists. Without its own
   * baseline it fell back to `seen`, which whileAway() resets on every open —
   * so the clock it measured against was wiped before it was ever read, and
   * nothing was ever produced. */
  if (PRODUCES[id]) state.made[id] = Date.now();
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

/* A flowering plot can be picked. It goes back to sprouting rather than
 * dying, so the garden is never emptier for having been enjoyed. */
export function canHarvest(i) {
  const p = state.plots[i];
  return !!p && stageOf(p) >= STAGES.length - 1;
}

export function harvest(i) {
  if (!canHarvest(i)) return null;
  const p = state.plots[i];
  for (const [k, n] of Object.entries(HARVEST.gives || {})) take(k, n);
  p.at = Date.now() - (STAGES[HARVEST.resetsTo]?.at ?? 0) * HOUR;
  p.water = 0;
  save();
  return HARVEST.gives;
}

export function ageOf(p) {
  return (Date.now() - p.at) / HOUR + (p.water || 0) * WATER_GAIN;
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


export function nodeTaken(id) {
  const t = state.taken[id];
  if (!t) return false;
  if (Date.now() - t > REGROW_H * HOUR) { delete state.taken[id]; save(); return false; }
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
/* What a producer is holding right now. Derived from elapsed time rather than
 * ticked, so it is correct whether the app was open, closed, or the phone was
 * off for three days. A ticking counter would simply be wrong after a nap. */
export function waiting(id) {
  const p = PRODUCES[id];
  if (!p || !state.built.includes(id)) return 0;
  /* Its own baseline, never `seen`. */
  const since = state.made[id];
  if (!since) { state.made[id] = Date.now(); save(); return 0; }
  return Math.min(p.cap, Math.floor((Date.now() - since) / (p.every * HOUR)));
}

export function collect(id) {
  const n = waiting(id);
  if (!n) return 0;
  const p = PRODUCES[id];
  take(p.gives, n);
  /* Credit only the whole units taken, so the remainder keeps counting rather
   * than being thrown away. */
  state.made[id] = (state.made[id] || Date.now()) + n * p.every * HOUR;
  save();
  return n;
}

export function collectAll() {
  const got = {};
  for (const id of Object.keys(PRODUCES)) {
    const n = collect(id);
    if (n) got[PRODUCES[id].gives] = (got[PRODUCES[id].gives] || 0) + n;
  }
  return got;
}

/* What happened while she was away.
 *
 * Called once on opening. Everything here is additive — a summary of good
 * news, or nothing at all. There is deliberately no branch that reports a
 * loss, because there is no mechanic that can cause one. */
export function whileAway() {
  const gap = Date.now() - (state.seen || Date.now());

  const grew = [];
  for (const p of state.plots) {
    const now = stageOf(p);
    const then = stageAt(p, Date.now() - gap);
    if (now > then) grew.push({from: STAGES[then].name, to: STAGES[now].name});
  }

  const ready = {};
  for (const id of Object.keys(PRODUCES)) {
    const n = waiting(id);
    if (n) ready[PRODUCES[id].gives] = (ready[PRODUCES[id].gives] || 0) + n;
  }

  state.seen = Date.now();
  save();
  return {hours: gap / HOUR, grew, ready};
}

function stageAt(p, when) {
  const h = (when - p.at) / HOUR + (p.water || 0) * WATER_GAIN;
  let s = 0;
  for (let i = 0; i < STAGES.length; i++) if (h >= STAGES[i].at) s = i;
  return s;
}

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
