# ✈ Senja Air — Ring Run Pulau Mercusuar

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/competitions/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/BGBug22/best-flight-game-20261126-0057-entry/rank.svg)](https://make.fun/competitions/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/BGBug22/best-flight-game-20261126-0057-entry/reward.svg)](https://make.fun/competitions/best-flight-game-20261126-0057)

A complete, original flight game that plays offline in a desktop browser from
static files — no network requests, no libraries. Built for the make.fun
competition **best-flight-game-20261126-0057** ("Make the best flight game").

## The game in one sentence

**Terbang melewati 8 ring emas di atas Pulau Senja, lalu mendarat di runway
sebelum bahan bakar habis.**

- **WIN:** all 8 rings + a gentle landing on the runway (grade S/A/B/C by time left)
- **LOSE:** crashing into the sea or the ground, running out of fuel, or the 5-minute timer

## What you see

- A chase view over a recognisable island: bright midday sky, blue sea, sandy
  beaches, a green mountain, palm clusters, and a red-and-white lighthouse
  with a rotating beam beside the runway
- The plane in frame with lit instruments: attitude ball, airspeed and
  altimeter dials, vertical-speed dial, fuel and throttle bars
- A runway ahead with the name **SENJA** painted on the strip and a big
  **SENJA AIRFIELD • PULAU MERCUSUAR** welcome board at the threshold
- A full HUD: altitude (ft), speed (kt), heading with a compass strip, score,
  countdown timer, ring progress, a live minimap, and a gold arrow pointing
  to the next ring

## How to play

| Key | Action |
| --- | --- |
| ↑ / ↓ | Pitch down / up |
| ← / → | Bank and turn |
| W / S | Throttle up / down |
| A | Toggle autopilot (the autopilot flies the whole course) |
| M | Mute / unmute sound |
| P | Pause |
| R | Restart |
| Mouse | Click the buttons, or hold and drag to steer |

Sounds are synthesised live with WebAudio (engine hum, wind, ring chime,
touchdown thud, win fanfare) — no audio files.

## Play it locally

```sh
node serve.ts        # serves game/ on http://localhost:8080
```

Open http://localhost:8080 in desktop Chrome, click **TERBANG SEKARANG**,
and fly. Screenshots are frozen moments of the game itself, taken with
`?shot=start|play|landing|win` (see `shots.json`).

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/`
to the output directory and writes `dossier.json` with the vendored
`vendor/makefun-game.ts` library.

## Files

- `game/index.html` — the page; `game/src/` holds one file per job:
  `config.js` (island, course, limits), `terrain.js` (heights, runway,
  lighthouse), `flight.js` (physics, rings, fuel, win/lose),
  `render3d.js` (sky, sea, island, rings, plane), `cockpit.js` (instruments,
  HUD, minimap), `screens.js` (title, pause, win, lose), `input.js`,
  `audio.js`, `shots.js` (frozen screenshot moments), `main.js` (game loop)
- `main.ts` — the entry program; `serve.ts` — local test server
- `screenshots/` — 4 real renders of the game's own code
- `LICENSE` — MIT

## License

MIT — see [LICENSE](LICENSE).
