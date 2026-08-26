#!/usr/bin/env python3
"""Generate the app icons.

iOS will not accept an SVG for `apple-touch-icon`, so the home-screen icon has
to be a real PNG. This writes them from scratch — zlib and struct are all a PNG
needs — so there is no dependency to install and no binary blob committed that
nobody can regenerate.

Run:  python3 scripts/make_icons.py
"""
import pathlib, struct, zlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "icons"

BG    = (244, 244, 240)
BODY  = (59, 168, 143)
EYE   = (18, 36, 31)
SHADE = (228, 227, 220)


def draw(size, pad):
    """The slime, centred, on the app's paper background."""
    px = [[BG] * size for _ in range(size)]

    cx = size / 2
    cy = size / 2 + size * 0.016
    r = (size / 2) - pad
    ry = r * 0.92

    def blend(x, y, color, a):
        if 0 <= x < size and 0 <= y < size and a > 0:
            b = px[y][x]
            px[y][x] = tuple(round(b[i] + (color[i] - b[i]) * min(1.0, a)) for i in range(3))

    def ellipse(ex, ey, erx, ery, color, feather=1.2):
        for y in range(max(0, int(ey - ery - 2)), min(size, int(ey + ery + 3))):
            for x in range(max(0, int(ex - erx - 2)), min(size, int(ex + erx + 3))):
                dx = (x + 0.5 - ex) / erx
                dy = (y + 0.5 - ey) / ery
                d = (dx * dx + dy * dy) ** 0.5
                # Anti-alias the edge: a hard cutoff looks cheap at 180px.
                a = (1.0 - d) * (erx / feather)
                blend(x, y, color, a)

    ellipse(cx, cy + ry * 0.99, r * 0.84, r * 0.15, SHADE)
    ellipse(cx, cy, r, ry, BODY)

    er = r * 0.105
    ellipse(cx - r * 0.30, cy - ry * 0.17, er, er, EYE)
    ellipse(cx + r * 0.17, cy - ry * 0.17, er, er, EYE)
    return px


def write_png(path, px):
    size = len(px)
    raw = b"".join(b"\x00" + bytes(v for p in row for v in p) for row in px)

    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)

    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(raw, 9))
           + chunk(b"IEND", b""))
    path.write_bytes(png)
    return len(png)


def main():
    OUT.mkdir(exist_ok=True)
    # 180 is what iOS actually uses for the home screen; 192 and 512 are what
    # the web manifest wants; 1024 is there if it ever needs a store listing.
    for size, pad in ((180, 10), (192, 11), (512, 28), (1024, 56)):
        n = write_png(OUT / f"icon-{size}.png", draw(size, pad))
        print(f"  icons/icon-{size}.png  {n:,} bytes")


if __name__ == "__main__":
    main()
