"""The economy.

Every number the game balances on lives here, in one file, in Python — because
here they can be reasoned about and simulated. Scattered through a renderer
they can only be guessed at.

Nothing in this file can take anything away from her. There is no decay term,
no spoilage, no upkeep. Production caps and then stops; that is the only
pressure the design allows itself.
"""

HOUR = 1.0

# What the land gives, and where. Gathering costs a journey, never time.
RESOURCES = {
    "water": {"name": "water", "colour": "#7fb4c4", "where": "at the bottom of hollows"},
    "wood":  {"name": "wood",  "colour": "#8a6a4c", "where": "on the ledges"},
    "seed":  {"name": "seeds", "colour": "#6f9455", "where": "on the ledges"},
    "stone": {"name": "stone", "colour": "#a9a094", "where": "at the bottom of hollows"},
    # Grown rather than gathered.
    "flower": {"name": "flowers", "colour": "#dd8b95", "where": "from the garden"},
    "herb":   {"name": "herbs",   "colour": "#7f9c68", "where": "from the garden"},
    # Made rather than found. A house is not built out of the woods; it is
    # built out of what you did to the woods.
    "plank":  {"name": "planks",  "colour": "#c49a6c", "where": "made at the bench"},
    "brick":  {"name": "bricks",  "colour": "#b08068", "where": "made at the bench"},
}

# Refining.
#
# The point of a middle step is that gathering stops being the only verb. Raw
# material comes from a journey; refined material comes from having been home.
# Late building wants refined, so the two halves of the game need each other.
#
# Deliberately generous ratios: this is a chain, not a grind.
RECIPES = {
    "plank": {"from": {"wood": 2},  "gives": 1, "needs": "workbench"},
    "brick": {"from": {"stone": 2}, "gives": 1, "needs": "workbench"},
}

# How long a node takes to come back, in hours. Slow enough to have a rhythm,
# fast enough that she is never stuck waiting on the world.
NODE_REGROW = 5 * HOUR

# What built things make while she is elsewhere.
#
# `every` is hours per unit; `cap` is where it stops. The cap is the whole
# design: it is a reason to come back, and it can never be a loss.
PRODUCES = {
    "well":     {"gives": "water", "every": 2 * HOUR, "cap": 8},
    "bed":      {"gives": "seed",  "every": 5 * HOUR, "cap": 6},
    "herbs":    {"gives": "herb",  "every": 4 * HOUR, "cap": 5},
    # The idle loop has to feed the build loop.
    #
    # Simulating it showed the real problem was structural, not numerical:
    # everything produced while she was away (water, seeds) was spent on the
    # garden, while everything the house needed (wood, stone) could only come
    # from walking out and gathering. So the late game moved only as fast as
    # she travelled, and an idle game whose idle output cannot progress the
    # main thing is just a chore with a timer on it.
    "woodpile": {"gives": "wood",  "every": 6 * HOUR, "cap": 5},
    "quarry":   {"gives": "stone", "every": 7 * HOUR, "cap": 4},
}

# Growth, in hours since planting. Watering brings a plot forward by WATER_GAIN
# but is never required: forgetting costs patience and never the plant.
STAGES = [
    (0,  "planted"),
    (3,  "sprouting"),
    (10, "growing"),
    (24, "in leaf"),
    (44, "flowering"),
]
WATER_GAIN = 6 * HOUR

# A flowering plot can be picked. It goes back to sprouting rather than dying,
# so the garden is never emptier for having been enjoyed.
HARVEST_GIVES = {"flower": 2}
HARVEST_RESETS_TO = 1


def stage_at(hours: float) -> int:
    s = 0
    for i, (at, _) in enumerate(STAGES):
        if hours >= at:
            s = i
    return s


def stage_name(i: int) -> str:
    return STAGES[i][1]
