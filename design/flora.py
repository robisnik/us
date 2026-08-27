"""What grows, described rather than drawn.

A species is a handful of numbers — how the stem bends, how many leaves and at
what angle, what the flower is made of. The renderer builds the plant from that
at whatever size it needs, so a new species is six lines here and no new
artwork anywhere.

This is the part that makes "more graphics" cheap. Adding twenty plants is
twenty entries, not twenty drawings.
"""

# stem:   (height, bend, thickness)
# leaves: (count, first, spacing, length, droop)
# bloom:  kind, petals, size, and two colours
SPECIES = [
    {"id": "poppy",   "name": "poppies",
     "stem": (44, 7, 1.8), "leaves": (2, 0.42, 0.22, 9, 0.5),
     "bloom": {"kind": "petals", "n": 5, "size": 7, "a": "#dd8b95", "b": "#e9a34f"}},

    {"id": "clover",  "name": "clover",
     "stem": (24, 3, 1.5), "leaves": (3, 0.35, 0.2, 7, 0.7),
     "bloom": {"kind": "puff", "n": 9, "size": 5, "a": "#e6dcea", "b": "#c9b6d4"}},

    {"id": "cornflower", "name": "cornflowers",
     "stem": (52, 10, 1.6), "leaves": (2, 0.5, 0.25, 11, 0.35),
     "bloom": {"kind": "petals", "n": 7, "size": 6, "a": "#8fa8d8", "b": "#6f86bd"}},

    {"id": "chamomile", "name": "chamomile",
     "stem": (36, 6, 1.4), "leaves": (3, 0.3, 0.2, 6, 0.6),
     "bloom": {"kind": "daisy", "n": 8, "size": 6, "a": "#faf7f0", "b": "#e9c14f"}},

    {"id": "wheat",   "name": "wheat",
     "stem": (56, 4, 1.6), "leaves": (2, 0.55, 0.2, 13, 0.2),
     "bloom": {"kind": "ear", "n": 6, "size": 5, "a": "#dcc189", "b": "#c2a469"}},

    {"id": "lavender", "name": "lavender",
     "stem": (48, 8, 1.4), "leaves": (2, 0.45, 0.22, 8, 0.3),
     "bloom": {"kind": "spike", "n": 7, "size": 4, "a": "#b3a2d4", "b": "#8d79b5"}},
]


def as_dicts():
    return [dict(s) for s in SPECIES]
