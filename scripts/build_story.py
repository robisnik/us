#!/usr/bin/env python3
"""content/story/our-story.md  ->  content/story/story.json

Deliberately forgiving. He is writing prose, not filling in a form, so the
only structural rule is that a blank line ends a moment. Everything else is a
hint he may or may not have bothered with, and the parser guesses sensibly
when he has not.

Hints, all optional, anywhere in the block:

    [photo] [letter] [gift] [milestone] [place] [song] [ritual] [together]
    [when: november 2019]
    [photo: riga-bar.jpg]
    [title: the night we met]

Run:  python3 scripts/build_story.py
"""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "content" / "story" / "our-story.md"
OUT = ROOT / "content" / "story" / "story.json"
PHOTOS = ROOT / "content" / "photos"

# A hint maps to the station that should hold it.
# Every station answers to its own name as well as to any plain-English alias.
# Missing a self-name meant [hourglass] was silently treated as prose and left
# sitting in the middle of a sentence.
KIND = {
    "photo": "photo", "letter": "letter", "gift": "bloom", "bloom": "bloom",
    "milestone": "cairn", "cairn": "cairn", "place": "pin", "pin": "pin",
    "song": "song", "ritual": "cups", "cups": "cups",
    "together": "fire", "fire": "fire", "idea": "lantern", "lantern": "lantern",
    "wait": "hourglass", "hourglass": "hourglass",
    "growing": "sapling", "sapling": "sapling",
    "postbox": "postbox",
}

UNKNOWN = []

TAG = re.compile(r"\[([a-z]+)(?:\s*:\s*([^\]]*))?\]", re.I)


def parse(text):
    # Strip the instructions block if he left it in — it starts the file and
    # ends at the first line that is not part of it.
    blocks = [b.strip() for b in re.split(r"\n\s*\n", text) if b.strip()]
    moments = []

    for block in blocks:
        kinds, when, photo, title = [], None, None, None

        def take(m):
            name = m.group(1).lower()
            val = (m.group(2) or "").strip()
            nonlocal when, photo, title
            if name == "when":
                when = val
            elif name == "title":
                title = val
            elif name == "photo" and val:
                photo = val
                kinds.append("photo")
            elif name in KIND:
                kinds.append(name)
            else:
                # Left in the prose, but never silently: a mistyped tag would
                # otherwise appear mid-sentence in the finished app.
                UNKNOWN.append(m.group(0))
                return m.group(0)
            return ""

        body = TAG.sub(take, block).strip()
        body = re.sub(r"[ \t]+\n", "\n", body)
        body = re.sub(r"\n{3,}", "\n\n", body)
        body = unwrap(body)
        if not body and not photo:
            continue

        station = KIND.get(kinds[0], "photo") if kinds else ("photo" if photo else "letter")
        moments.append({
            "station": station,
            "title": title or headline(body),
            # A title he wrote is worth showing twice; one this script derived
            # from his opening words is not — it would just be the first line
            # of the paragraph directly above itself.
            "auto_title": title is None,
            "when": when,
            "photo": resolve(photo),
            "body": body,
        })
    return moments


LIST_ITEM = re.compile(r"^\s*(?:\d+[.)]|[-*\u2022])\s")


def unwrap(body):
    """Prose in the source is hard-wrapped for readability; those line breaks
    are an artefact of the file, not of the writing, and joining them is what
    lets the app reflow to any screen. A line that begins a list item is a real
    break and is kept — otherwise eighteen things become one paragraph."""
    out = []
    for para in body.split("\n\n"):
        lines = [l for l in para.split("\n")]
        joined = []
        for line in lines:
            if joined and not LIST_ITEM.match(line) and not LIST_ITEM.match(joined[-1]):
                joined[-1] = joined[-1].rstrip() + " " + line.strip()
            else:
                joined.append(line.strip())
        out.append("\n".join(j for j in joined if j))
    return "\n\n".join(out)


def headline(body):
    """A short label for under the station. His first few words, not a summary
    written by a machine — the phrasing is the point."""
    first = body.strip().split("\n")[0]
    words = re.sub(r"\s+", " ", first).split(" ")
    short = " ".join(words[:6]).rstrip(".,;:—-")
    return short + ("…" if len(words) > 6 else "")


def resolve(name):
    if not name:
        return None
    for ext in ("", ".jpg", ".jpeg", ".png", ".webp", ".heic", ".HEIC"):
        p = PHOTOS / (name + ext)
        if p.exists():
            return f"content/photos/{p.name}"
    print(f"  note: no file yet for '{name}' — the moment keeps its frame empty")
    return f"content/photos/{name}"


def main():
    if not SRC.exists():
        sys.exit(f"nothing at {SRC.relative_to(ROOT)}")
    moments = parse(SRC.read_text())
    if not moments:
        sys.exit("no moments found — is the file still just the instructions?")

    OUT.write_text(json.dumps({"moments": moments}, indent=1, ensure_ascii=False) + "\n")

    counts = {}
    for m in moments:
        counts[m["station"]] = counts.get(m["station"], 0) + 1
    print(f"  {len(moments)} moments")
    for k, v in sorted(counts.items(), key=lambda kv: -kv[1]):
        print(f"    {v:>3}  {k}")
    if UNKNOWN:
        print(f"  !! {len(UNKNOWN)} tag(s) not recognised, left in the text: "
              + ", ".join(sorted(set(UNKNOWN))))
    missing = sum(1 for m in moments if m["photo"] and not (ROOT / m["photo"]).exists())
    if missing:
        print(f"  {missing} waiting on photo files")
    print(f"  wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
