"""Play the game a thousand times so she does not have to play a bad one.

The question this answers is the one that is genuinely hard to answer any other
way: given how she actually plays — a couple of short visits a day, an
occasional longer one — how many days until the roof? Until the bed? Is the
middle of the game a wall?

Balance guessed at in a renderer is balance discovered by the person you made
the gift for. This runs before that.

Run:  python3 design/simulate.py
"""
import random, statistics, sys
sys.path.insert(0, __file__.rsplit('/', 1)[0])

import economy, buildtree

# How she plays, as honestly as it can be guessed.
#
# Most days: a minute or two, twice — collect what is waiting, plant, leave.
# Some days: a proper trip out to gather. Some days: nothing at all, and that
# has to be fine.
P_SHORT_VISIT = 0.85     # chance of at least one short visit on a day
P_LONG_TRIP   = 0.35     # chance of a gathering trip
GATHER_PER_TRIP = (6, 11)  # nodes reached on a trip


def new_state():
    return {"inv": {k: 0 for k in economy.RESOURCES},
            "built": set(), "plots": [], "hours": 0.0,
            "made": {k: 0.0 for k in economy.PRODUCES},
            "log": {}}


def collect(st):
    for pid, p in economy.PRODUCES.items():
        if pid not in st["built"]:
            continue
        n = min(p["cap"], int((st["hours"] - st["made"][pid]) / p["every"]))
        if n:
            st["inv"][p["gives"]] += n
            st["made"][pid] += n * p["every"]


def try_builds(st):
    """She builds what she can, cheapest first, respecting tiers."""
    done = True
    while done:
        done = False
        for b in buildtree.as_dicts():
            if b["id"] in st["built"]:
                continue
            tier = next(t for t in buildtree.tier_order() if t["id"] == b["tier"])
            if tier["needs"]:
                need = [x["id"] for x in buildtree.as_dicts() if x["tier"] == tier["needs"]]
                if not all(n in st["built"] for n in need):
                    continue
            if all(st["inv"].get(k, 0) >= v for k, v in b["cost"].items()):
                for k, v in b["cost"].items():
                    st["inv"][k] -= v
                st["built"].add(b["id"])
                st["made"].setdefault(b["id"], st["hours"])
                if b["id"] in economy.PRODUCES:
                    st["made"][b["id"]] = st["hours"]
                st["log"].setdefault(b["id"], st["hours"] / 24)
                done = True


def harvest(st):
    for p in st["plots"]:
        h = st["hours"] - p["at"] + p["water"] * economy.WATER_GAIN
        if economy.stage_at(h) >= len(economy.STAGES) - 1:
            for k, v in economy.HARVEST_GIVES.items():
                st["inv"][k] += v
            p["at"] = st["hours"] - economy.STAGES[economy.HARVEST_RESETS_TO][0]
            p["water"] = 0


def day(st, rng):
    """One day: short visits, maybe a trip, and whatever she can build."""
    for _ in range(2 if rng.random() < P_SHORT_VISIT else 0):
        st["hours"] += rng.uniform(4, 9)
        collect(st); harvest(st)
        while st["inv"]["seed"] > 0 and len(st["plots"]) < 8:
            st["inv"]["seed"] -= 1
            st["plots"].append({"at": st["hours"], "water": 0})
        while st["inv"]["water"] > 0 and any(
                economy.stage_at(st["hours"] - p["at"] + p["water"] * economy.WATER_GAIN)
                < len(economy.STAGES) - 1 for p in st["plots"]):
            for p in st["plots"]:
                if st["inv"]["water"] <= 0:
                    break
                if economy.stage_at(st["hours"] - p["at"] + p["water"] * economy.WATER_GAIN) \
                        < len(economy.STAGES) - 1:
                    st["inv"]["water"] -= 1
                    p["water"] += 1
        try_builds(st)

    if rng.random() < P_LONG_TRIP:
        for _ in range(rng.randint(*GATHER_PER_TRIP)):
            st["inv"][rng.choice(["water", "wood", "stone", "seed"])] += 1
        try_builds(st)

    # Advance to the next day.
    st["hours"] = (int(st["hours"] / 24) + 1) * 24


def run(days=90, seed=0):
    rng = random.Random(seed)
    st = new_state()
    for _ in range(days):
        day(st, rng)
    return st


def main():
    runs = [run(seed=s) for s in range(400)]
    all_ids = [b["id"] for b in buildtree.as_dicts()]

    print(f"  {len(runs)} simulated players, 90 days each\n")
    print(f"  {'build':<10}{'reached':>9}{'median day':>13}{'slowest 10%':>13}")
    print("  " + "-" * 45)
    for bid in all_ids:
        got = [r["log"][bid] for r in runs if bid in r["log"]]
        if not got:
            print(f"  {bid:<10}{'never':>9}")
            continue
        got.sort()
        pct = len(got) / len(runs) * 100
        p90 = got[min(len(got) - 1, int(len(got) * 0.9))]
        print(f"  {bid:<10}{pct:>8.0f}%{statistics.median(got):>13.1f}{p90:>13.1f}")

    finished = [len(r["built"]) for r in runs]
    print(f"\n  finished the whole house: "
          f"{sum(1 for f in finished if f == len(all_ids)) / len(runs) * 100:.0f}%")
    print(f"  median builds in 90 days:  {statistics.median(finished):.0f} of {len(all_ids)}")


if __name__ == "__main__":
    main()
