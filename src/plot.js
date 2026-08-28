/* The plot, its zones, and its cells.
 *
 * Every built thing occupies a whole number of cells in a named zone. Nothing
 * is placed at an arbitrary offset from anything — which is what went wrong
 * before: the house and the garden were drawn relative to a rolling ground
 * line, so they leaned, floated or half-buried themselves depending on where
 * the terrain happened to be.
 *
 * A zone owns its cells. A new garden bed goes in the next free garden cell
 * rather than wherever the drawing code felt like putting it.
 */

export const CELL = 44;

/* Left to right across the terrace: things that grow, the house, things that
 * work. Numbers are cells, and they must sum to the plot's width. */
export const ZONES = [
  {id: 'garden', name: 'the garden', cells: 4},
  {id: 'house',  name: 'the house',  cells: 5},
  {id: 'yard',   name: 'the yard',   cells: 3},
];

export const TOTAL_CELLS = ZONES.reduce((n, z) => n + z.cells, 0);

/* Which zone each build belongs in, and how many cells it takes. */
export const FOOTPRINT = {
  bed:      {zone: 'garden', cells: 1},
  herbs:    {zone: 'garden', cells: 1},
  well:     {zone: 'yard',   cells: 1},
  woodpile: {zone: 'yard',   cells: 1},
  quarry:   {zone: 'yard',   cells: 1},
  bench:    {zone: 'yard',   cells: 1},
  walls:    {zone: 'house',  cells: 5},
  roof:     {zone: 'house',  cells: 5},
  /* Things that live inside the house occupy a room, not a cell of ground. */
  hearth:   {zone: 'room'},
  window:   {zone: 'room'},
  shelf:    {zone: 'room'},
  bed2:     {zone: 'room'},
  /* Ground works: they change the terrace itself rather than stand on it. */
  path:     {zone: 'ground'},
  fence:    {zone: 'ground'},
};

/* World x of a cell's left edge. Cell 0 is the left end of the terrace. */
export function cellX(plotX, plotHalf, i) {
  const left = plotX - (TOTAL_CELLS * CELL) / 2;
  return left + i * CELL;
}

export function zoneRange(id) {
  let at = 0;
  for (const z of ZONES) {
    if (z.id === id) return {from: at, to: at + z.cells};
    at += z.cells;
  }
  return {from: 0, to: 0};
}

/* Where each built thing actually sits.
 *
 * Derived from what has been built, in build order, so two garden beds never
 * land on the same square and nothing has to be positioned by hand. */
export function layout(built) {
  const used = {garden: 0, yard: 0};
  const out = [];
  for (const id of built) {
    const f = FOOTPRINT[id];
    if (!f || f.zone === 'room' || f.zone === 'ground') continue;
    if (f.zone === 'house') {
      const r = zoneRange('house');
      out.push({id, zone: 'house', cell: r.from, cells: f.cells});
      continue;
    }
    const r = zoneRange(f.zone);
    const cell = r.from + used[f.zone];
    if (cell + f.cells > r.to) continue;          // zone full; nothing overlaps
    used[f.zone] += f.cells;
    out.push({id, zone: f.zone, cell, cells: f.cells});
  }
  return out;
}

/* The house as a section: rooms on floors, not a facade.
 *
 * A room is BUILT, not conjured. The old version derived the room count from
 * how much furniture existed, so putting in a hearth made a room appear around
 * it — which is backwards, and the sort of thing that quietly teaches a player
 * the world has no rules. You build a room; then it is somewhere to put
 * something.
 */
export const ROOM_H = 92;
export const FLOOR_W = 3;          // rooms per floor before another is needed
export const MAX_FLOORS = 3;

/* Every room that exists, in build order: left to right, then upward. */
export function rooms(built, roomCount, furniture) {
  if (!built.includes('walls')) return [];
  const n = Math.min(roomCount, FLOOR_W * MAX_FLOORS);
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({
      index: i,
      floor: Math.floor(i / FLOOR_W),
      col: i % FLOOR_W,
      holds: furniture[i] ?? null,
    });
  }
  return out;
}

/* Floors are built, not derived. Passing the built count keeps the drawing and
 * the simulation reading from the same number. */
export function floorsFor(roomCount, built = 0) {
  return Math.max(1, built || Math.ceil(Math.min(roomCount, FLOOR_W * MAX_FLOORS) / FLOOR_W));
}

/* Room capacity is what gates furniture. A hearth needs somewhere to be. */
export function freeRooms(roomCount, furnitureCount) {
  return Math.min(roomCount, FLOOR_W * MAX_FLOORS) - furnitureCount;
}

export function canAddRoom(roomCount) {
  return roomCount < FLOOR_W * MAX_FLOORS;
}
