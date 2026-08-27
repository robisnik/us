"""What she builds, in what order, and what it costs.

Tiers exist so the homestead becomes a place in a recognisable order — ground,
then garden, then shelter, then a home, then somewhere that is theirs — rather
than a shopping list sorted by price.

Each build carries a line from him, revealed when it is finished. The building
is the delivery mechanism for the writing; that is the point of the whole
mechanic and the reason it is not just a crafting menu.
"""

TIERS = [
    ("ground",  "the ground",     None),
    ("garden",  "the garden",     "ground"),
    ("shelter", "shelter",        "garden"),
    ("home",    "a home",         "shelter"),
    ("ours",    "ours",           "home"),
]

# id, tier, name, cost, and what it changes.
BUILDS = [
    ("path",   "ground",  "a path",         {"stone": 3},
     "so the way to the door gets worn in"),
    ("fence",  "ground",  "a fence",        {"wood": 4},
     "a line that says this bit is ours"),

    ("bed",    "garden",  "a garden bed",   {"wood": 5, "stone": 2},
     "somewhere for things to start"),
    ("well",   "garden",  "a well",         {"stone": 6},
     "so the water is always here"),
    ("herbs",  "garden",  "a herb patch",   {"seed": 3, "wood": 3},
     "for the cooking you keep promising to teach me"),

    ("woodpile", "garden", "a woodpile",   {"wood": 4, "stone": 1},
     "so there is always something to build with"),

    ("walls",  "shelter", "walls",          {"wood": 16, "stone": 9},
     "the beginning of somewhere indoors"),
    ("quarry", "shelter", "a quarry",       {"wood": 9, "stone": 6},
     "the slow way to build anything, which is the only way we have"),
    ("roof",   "shelter", "a roof",         {"wood": 20, "stone": 8},
     "and then it is a house"),

    ("window", "home",    "a window",       {"stone": 10, "wood": 7},
     "so there is a light on when you get back"),
    ("hearth", "home",    "a hearth",       {"stone": 16, "wood": 11},
     "somewhere to be cold next to and then not be cold"),

    ("bench",  "ours",    "a bench",        {"wood": 12, "stone": 6},
     "somewhere to sit and do nothing, which we were always good at"),
    ("shelf",  "ours",    "a shelf",        {"wood": 14, "herb": 2},
     "for everything you found on the way here"),
    ("bed2",   "ours",    "a bed",          {"wood": 18, "herb": 4, "flower": 6},
     "and that is the whole house, and you are in it"),
]

# What a build turns on, beyond being drawn.
UNLOCKS = {
    "roof":   "letters arrive here",
    "window": "the light is on at your dusk",
    "shelf":  "the things you found are kept here",
}


def as_dicts():
    out = []
    for bid, tier, name, cost, note in BUILDS:
        out.append({
            "id": bid, "tier": tier, "name": name, "cost": cost,
            "note": note, "unlocks": UNLOCKS.get(bid),
        })
    return out


def tier_order():
    return [{"id": t, "name": n, "needs": req} for t, n, req in TIERS]
