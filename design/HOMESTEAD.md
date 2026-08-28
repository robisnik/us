# The homestead — structure

Rebuilt around one idea that was missing: **you cannot build on a slope.**

Everything before this drew the house and the garden at fixed offsets from a
ground line that rolls, so they sat at an angle, floated, or half-buried
themselves depending on where the sine happened to be. That is not a rendering
bug to patch. It is a missing step in the world's logic.

---

## 1. The plot

The first thing anyone does with a piece of sloping land is **level a terrace**.
So that is the first build, and until it exists there is nowhere to put
anything.

- The terrain function returns a **flat height** across the plot.
- Its edges are **graded** over 140px either side, so the terrace meets the
  hillside as a slope rather than a cliff. It reads as cut into the hill,
  because that is what it is.
- The flat height is the **average** of the natural ground across the plot, so
  it neither towers over the land nor sinks into it.

Everything else in this document stands on that flat.

## 2. The grid

The plot is divided into **cells**, 44px wide, and every built thing occupies a
whole number of them. Nothing is placed at an arbitrary offset ever again.

    ┌──────────┬───────────────────┬──────────┐
    │  garden  │     the house     │   yard   │
    │  4 cells │      5 cells      │  3 cells │
    └──────────┴───────────────────┴──────────┘

- **Garden** — beds, herbs. Each bed is one cell and holds up to four plants.
- **House** — walls, floors, rooms. See below.
- **Yard** — well, woodpile, quarry, bench. Working things, outside.

A zone knows its own cells, so a new bed goes in the next free garden cell
rather than wherever the drawing code felt like putting it.

## 3. The house is a section, not a facade

The house is a **2D cut-through**, the way a doll's house is. Walls and a roof
make a shell; inside is a grid of rooms.

- **Ground floor**: 3 rooms wide to start.
- **Expansion**: a room can be added sideways (up to 5) or a **floor added
  above** (up to 3). Each costs materials and each is a real space.
- **Each room holds one thing**: hearth, bed, shelf, table, window. A room with
  nothing in it is an empty room, and looks like one.
- **She can go inside.** Free movement already allows it; the tether measures
  from the floor she is standing on rather than the ground, so a first-floor
  room is somewhere she can actually stand.
- The **front is open** to the camera — no door to fumble with. Walking into
  the footprint is entering.

## 4. Basic necessities, in the order a home actually gets them

This is the spine of the build tree. Each need is real, and each is unlocked by
the one before because that is the order they physically depend on.

| # | need | build | why it must come first |
|---|---|---|---|
| 1 | **level ground** | terrace | nothing stands on a slope |
| 2 | **water** | well | everything living needs it |
| 3 | **food** | garden bed | needs water |
| 4 | **materials** | woodpile, quarry | building needs a supply that is not a walk |
| 5 | **shelter** | walls, roof | the first thing that is a *room* |
| 6 | **warmth** | hearth | needs wood, needs walls to be worth it |
| 7 | **light** | window | needs a wall to be in |
| 8 | **rest** | bed | needs a floor and a roof |
| 9 | **keeping** | shelf | somewhere for the twelve found things |
| 10 | **company** | bench, table | the point of all of it |

Nothing in that list is arbitrary and nothing is decoration. Each answers a
question the previous one raised.

## 5. Rules

1. **Nothing is drawn at an offset from sloping ground.** If it is built, it is
   on the flat, on a cell.
2. **A zone owns its cells.** Placement is derived, never hand-tuned.
3. **A room is a space, not a picture.** If she can see it, she can be in it.
4. **Expansion is real.** Adding a room adds somewhere to stand.
