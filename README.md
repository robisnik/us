# Us

A small app for the two of us while we are in different countries. It installs
on her iPhone from Safari and opens like an app.

## Running it

```bash
python3 scripts/serve.py 4180
```

The dev server speaks HTTP/1.1 on purpose — registering a service worker over
HTTP/1.0 fails with an unhelpful "unknown error when fetching the script", and
without a service worker the app is not installable.

Service workers are off on localhost so a cached module never costs an hour of
confusion. Append `?sw=1` to test the real thing.

`__dev.jump(0)`–`__dev.jump(11)` in the console parks the slime beside any
station.

## Layout

| | |
|---|---|
| `game.js`      | loop, physics, camera, rendering |
| `stations.js`  | the twelve stations and what each one is for |
| `style.js`     | the house style: palette, stroke, the shared pieces |
| `story/`       | the writing |
| `photos/`      | never committed |
| `scripts/make_icons.py` | regenerates the PNG icons |

## How it moves

Three things, and all three matter:

1. **A fixed simulation step.** Physics never sees a variable `dt`, so a spring
   behaves the same on a 60Hz phone and a 120Hz one.
2. **Interpolated rendering.** The renderer draws *between* the last two
   simulated states using the leftover time.
3. **Nothing snaps.** No rounded positions, no velocity cut-off at a threshold
   — those are single-frame discontinuities and the eye reads every one.

## Installing on iOS

Safari ignores the manifest for most of the home-screen behaviour and wants its
own tags, and `apple-touch-icon` must be a PNG — an SVG silently gives you a
screenshot of the page instead of an icon. Both are handled in `index.html`.

The install itself is Share → Add to Home Screen. It needs **HTTPS**, so it
only works once deployed; `localhost` is enough for everything except that
final step.
