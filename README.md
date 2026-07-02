# Fitcast 🌦️

A weather-driven web app: enter a location and a full-screen **animated 3D
scene** reflects the current conditions while a cute **mascot dresses for the
weather** and a short **storytelling card** tells you what to wear.

- **Live weather** from [Open-Meteo](https://open-meteo.com) (no API key).
- **3D scene** (React Three Fiber): shader-gradient sky, day/night lighting with
  sun · moon · stars · meteors · birds, procedural rain (with ground ripples),
  snow, volumetric clouds, fog, thunder with lightning bolts, and wind-swayed
  foliage. Shadows track the sun/moon; scenes cross-fade smoothly.
- **Mascot** that puts on the recommended outfit — beanie, coat, scarf,
  sunglasses, sunhat, raincoat, umbrella, boots — driven by a deterministic
  rule engine.
- **Storytelling advice** — rule-based by default, upgraded to **AI narration**
  (Claude Haiku 4.5) and an **"Ask Sprout" assistant** (Claude Sonnet 5, tool
  use) when configured. Responds in **English, German, Persian, French, or
  Turkish** (persisted).
- **Polished, responsive UI**, mobile performance tiers, and **gyroscope**
  camera parallax on phones.

## Tech stack

React 19 · TypeScript · [Rsbuild](https://rsbuild.rs) (Rspack) · three /
@react-three/fiber / drei · zustand · Vitest · pnpm. AI runs through serverless
functions (`api/`) so the API key never reaches the browser.

## Prerequisites

- **Node 22+** (see `.nvmrc` / `engines`; `nvm use 22`)
- **pnpm** (`packageManager` pins the version via Corepack)

## Getting started

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

The app auto-loads a default city; use the search bar (live suggestions) or the
compass to pick your own.

## Scripts

| Script               | What it does                                      |
| -------------------- | ------------------------------------------------- |
| `pnpm dev`           | Start the Rsbuild dev server                      |
| `pnpm build`         | Production build → `dist/`                        |
| `pnpm preview`       | Serve the production build locally                |
| `pnpm test`          | Run the Vitest suite (pure domain logic)          |
| `pnpm test:watch`    | Vitest in watch mode                              |
| `pnpm typecheck`     | `tsc --noEmit`                                    |
| `pnpm lint`          | ESLint                                            |
| `pnpm lint:fix`      | ESLint with autofix                               |
| `pnpm format`        | Prettier write                                    |
| `pnpm format:check`  | Prettier check                                    |
| `pnpm dev:api`       | Local server for the `api/` AI functions (see below) |

## Enabling AI (optional)

The narration + assistant call Claude via the functions in `api/`. Without a key
the app falls back to the rule-engine advice and the assistant shows a
"needs deployment" note — everything else works.

To enable locally:

```bash
cp .env.example .env.local        # then add your key:
# ANTHROPIC_API_KEY=sk-ant-...
pnpm dev:api                      # runs api/ locally on :5200 (proxied by dev)
pnpm dev                          # in a second terminal
```

In production, deploy to a functions-capable host (Vercel / Netlify /
Cloudflare) and set `ANTHROPIC_API_KEY` — see [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Project structure

```
src/
  domain/     Pure TS: weather normalize, recommendOutfit, mapToScene (+ tests)
  data/       Open-Meteo fetch, geocoding, browser geolocation, cache
  store/      zustand: weather state + user preferences
  three/      React Three Fiber scene, mascot, scenery, weather FX
  ui/         DOM overlay: location bar, readout, advice card, assistant
  ai/         Client-side AI narration + chat (call the proxies)
  lib/        Shared helpers (animation, quality tiers)
api/          Serverless proxies: /api/narrate (Haiku), /api/chat (Sonnet)
docs/         Architecture plan (PLAN.md) and deploy guide (DEPLOY.md)
```

Imports use the `@/` alias for `src/` (e.g. `@/domain/types`).

The architecture keeps a **pure, tested domain layer** (no React, no Three)
separate from the visual and AI layers — see [`docs/PLAN.md`](docs/PLAN.md).

## Credits

- Weather & geocoding: [Open-Meteo](https://open-meteo.com), reverse geocoding by
  [BigDataCloud](https://www.bigdatacloud.com).
- Mascot model: RobotExpressive (CC0) — see `public/models/CREDITS.md`.
