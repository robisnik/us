# Soft survival — the plan

An idle game with no idle-game cynicism. She should want to open it because
something happened, not because a bar is draining.

---

## First: where Python goes

**Not the game loop.** The runtime is 120 simulation steps and 60 renders a
second, all of which would cross the JS↔Python bridge. Pyodide is 6–11 MB
against a 160 KB app and 2–4 seconds of cold start. It would make the one thing
he asked for — silky smooth — measurably worse.

**Python is the design layer, and it does real work there.**

    design/                    Python. The source of truth.
      economy.py               yields, costs, growth curves, storage caps
      buildtree.py             what unlocks what, and what it costs
      flora.py                 plant species: shape, colour, growth stages
      events.py                the daily events and their weights
      emit.py                  -> content/world.json

    python3 design/emit.py     regenerates the world

This is where "various graphic possibilities" actually gets cheap. A plant is
described in Python — segments, branch angles, petal counts, palette — and
emitted as data the renderer draws procedurally. Adding a new species is a few
lines in `flora.py`, not new artwork. Same for buildings and events.

Balance becomes a thing you can *simulate*: `economy.py` can run a thousand
imaginary weeks of play and tell us whether the roof takes four days or forty
before she ever sees it. That is genuinely hard to do in the runtime and
trivial in Python.

---

## The loop

**Gather** in the world (a journey) → **grow and build** at the homestead
(time) → **the place changes** → something new becomes possible.

### Why she comes back, in order of actual power

1. **He was here.** She opens it and finds something of his: a line he left, a
   plant he watered, a thing he built while she slept. For two people in
   different countries nothing else is close. This is the feature.
2. **Something grew.** Visible change since last time — a sprout is a stem, a
   stem is in flower.
3. **Something is ready.** A harvest waiting to be taken.
4. **Something new unlocked.** The next tier of the home became possible.

### Soft, and why

- Nothing decays, wilts or dies. Ever.
- Water makes a plant grow **faster**, never keeps it alive.
- Production **caps** rather than spoils: a full well simply stops filling. The
  cap is a reason to come back, not a punishment for not.
- The creature gets sleepy when unvisited and wakes happy. No mood, no guilt.

That last one is the whole difference between an idle game that nags and one
that waits.

---

## The economy

**Gathered** — costs a journey, found at the extremes of hollows and ledges.

    water · wood · stone · seed

**Grown** — costs time, produced at the homestead.

    flowers · herbs · fruit

**Produced** — once built, things make things, slowly and to a cap.

| built | makes | rate | cap |
|---|---|---|---|
| well | water | 1 / 2h | 8 |
| bed | seed | 1 / 5h | 6 |
| tree | fruit | 1 / 8h | 4 |

**Given** — flowers and fruit can be sent to him. They arrive in his copy.

---

## The build tree

Each tier needs the one before it, so the homestead becomes a place in a
recognisable order rather than a shopping list.

1. **ground** — path, fence
2. **garden** — bed, well
3. **shelter** — walls, roof · *once there is a roof, his letters arrive here*
4. **home** — window, hearth, chimney · *the window lights at her dusk*
5. **ours** — two chairs, a shelf for the twelve found things, a bed

Every built thing carries a line from him, revealed when it is finished. The
building is the delivery mechanism for the writing.

---

## The daily rhythm

- **One line from him per day.** He queues them; one surfaces each day. Cheap
  for him, and the single strongest reason to open it.
- **One small event.** The creature found something. It rained. A bird.
- Both are quiet. Neither is a notification unless he actually did something.

---

## Sessions

- **Sixty seconds** — collect what grew, water, read his line, leave.
- **Ten minutes** — travel out, gather, come back, build the next thing.

Both must feel complete. An idle game that punishes a short visit is a job.

---

## Phases

**1 — production and return.** Things produce to a cap. On opening, a quiet
summary of what happened while she was away. *This is the idle engine.*

**2 — the build tree.** Tiers, gating, and the line from him on each build.

**3 — Python design layer.** `design/*.py` → `content/world.json`; the runtime
stops hard-coding numbers and species.

**4 — flora.** Procedural plants from `flora.py`. Many species, no new art.

**5 — two players.** Supabase sync so his watering, his building and his lines
land in her copy. *The feature that makes the rest matter.*

**6 — daily events.**

---

## Rules that do not bend

1. Nothing decays, dies or scolds. Neglect reads as peace.
2. A short session is a complete session.
3. Every mechanic means something from their story, or it does not ship.
4. He can always reach her through it. That is what it is for.
