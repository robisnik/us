"""What she builds, in what order, and what it costs.

Tiers exist so the homestead becomes a place in a recognisable order — ground,
then garden, then shelter, then a home, then somewhere that is theirs — rather
than a shopping list sorted by price.

Each build carries a line from him, revealed when it is finished. The building
is the delivery mechanism for the writing; that is the point of the whole
mechanic and the reason it is not just a crafting menu.
"""

# Rule, learned from the simulator: a tier is either raw or refined, never
# both. Ground and garden are raw — she has just arrived and has only what she
# carried. Everything from shelter up is refined, because by then she has a
# workbench and refines her surplus, so raw stock sits at her working reserve
# and a large raw cost is never met.

TIERS = [
    ("ground",  "the ground",     None),
    ("garden",  "the garden",     "ground"),
    ("shelter", "shelter",        "garden"),
    ("home",    "a home",         "shelter"),
    ("ours",    "ours",           "home"),
]

# Some things depend on particular other things, not just on their tier.
#
# Once the producers are running, income outpaces every cost and the whole late
# game lands on the same afternoon — a materials gate stops working. The finale
# needs a structural one: the bed goes in after the house is furnished, because
# that is when a house becomes somewhere you sleep.
NEEDS = {
    "bed2": ["hearth", "window", "shelf"],
    "roof": ["walls"],
    "window": ["walls"],
    "hearth": ["walls"],
}

# id, tier, name, cost, and what it changes.
BUILDS = [
    ("path",   "ground",  "a path",         {"stone": 3},
     "so the way to the door gets worn in"),
    ("fence",  "ground",  "a fence",        {"wood": 4},
     "a line that says this bit is ours"),

    ("workbench", "garden", "a workbench",  {"wood": 6, "stone": 3},
     "so wood becomes something, instead of just being wood"),

    ("bed",    "garden",  "a garden bed",   {"wood": 5, "stone": 2},
     "somewhere for things to start"),
    ("well",   "garden",  "a well",         {"stone": 6},
     "so the water is always here"),
    ("herbs",  "garden",  "a herb patch",   {"seed": 3, "wood": 3},
     "for the cooking you keep promising to teach me"),

    ("woodpile", "garden", "a woodpile",   {"wood": 4, "stone": 1},
     "so there is always something to build with"),

    ("walls",  "shelter", "walls",          {"plank": 8, "stone": 6},
     "the beginning of somewhere indoors"),
    ("quarry", "shelter", "a quarry",       {"plank": 4, "brick": 3},
     "the slow way to build anything, which is the only way we have"),
    ("roof",   "shelter", "a roof",         {"plank": 10, "brick": 3},
     "and then it is a house"),

    ("window", "home",    "a window",       {"brick": 4, "plank": 3},
     "so there is a light on when you get back"),
    ("hearth", "home",    "a hearth",       {"brick": 8, "plank": 4},
     "somewhere to be cold next to and then not be cold"),

    ("bench",  "ours",    "a bench",        {"plank": 4, "brick": 1},
     "somewhere to sit and do nothing, which we were always good at"),
    ("shelf",  "ours",    "a shelf",        {"plank": 7, "herb": 3},
     "for everything you found on the way here"),
    ("bed2",   "ours",    "a bed",          {"plank": 14, "herb": 6, "flower": 10},
     "and that is the whole house, and you are in it"),
]

# What a build turns on, beyond being drawn.
# Rooms and floors are bought, not implied. Both are repeatable, which is why
# they are not in BUILDS — see ROOM and FLOOR in the runtime.
ROOM_COST = {"plank": 3, "stone": 3}
FLOOR_COST = {"plank": 6, "brick": 4}

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
            "needs": NEEDS.get(bid, []),
        })
    return out


def tier_order():
    return [{"id": t, "name": n, "needs": req} for t, n, req in TIERS]
