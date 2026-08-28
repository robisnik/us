"""design/*.py  ->  content/world.json

The runtime stops holding opinions about balance. Every number it uses comes
from here, so tuning is a Python edit and a re-run rather than a hunt through a
renderer.

His lines for each build live in content/story/building.md, alongside the rest
of his writing, and are merged in here. buildtree.py carries a fallback so the
game is never wordless, but anything he writes wins.

Run:  python3 design/emit.py
"""
import json, pathlib, re, sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))

import economy, buildtree, flora   # noqa: E402

LINES = ROOT / "content" / "story" / "building.md"
OUT = ROOT / "content" / "world.json"


def his_lines():
    """`## id` then the line beneath it. Same shape as the story file, because
    one format he already knows is worth more than a better one he does not."""
    if not LINES.exists():
        return {}
    out, key, buf = {}, None, []
    for line in LINES.read_text().splitlines():
        m = re.match(r"^##\s+(\S+)", line)
        if m:
            if key:
                out[key] = "\n".join(buf).strip()
            key, buf = m.group(1), []
        elif key is not None:
            buf.append(line)
    if key:
        out[key] = "\n".join(buf).strip()
    return {k: v for k, v in out.items() if v}


def main():
    lines = his_lines()
    builds = buildtree.as_dicts()
    for b in builds:
        if lines.get(b["id"]):
            b["note"] = lines[b["id"]]
            b["his"] = True

    world = {
        "resources": economy.RESOURCES,
        "produces": economy.PRODUCES,
        "stages": [{"at": at, "name": n} for at, n in economy.STAGES],
        "waterGain": economy.WATER_GAIN,
        "nodeRegrow": economy.NODE_REGROW,
        "harvest": {"gives": economy.HARVEST_GIVES, "resetsTo": economy.HARVEST_RESETS_TO},
        "recipes": economy.RECIPES,
        "roomCost": buildtree.ROOM_COST,
        "floorCost": buildtree.FLOOR_COST,
        "tiers": buildtree.tier_order(),
        "builds": builds,
        "flora": flora.as_dicts(),
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(world, indent=1, ensure_ascii=False) + "\n")

    written = sum(1 for b in builds if b.get("his"))
    print(f"  {len(world['resources'])} resources, {len(world['produces'])} producers")
    print(f"  {len(builds)} builds across {len(world['tiers'])} tiers "
          f"({written} with his own words)")
    print(f"  {len(world['recipes'])} recipes")
    print(f"  {len(world['flora'])} plant species")
    print(f"  wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
