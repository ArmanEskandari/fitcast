# Fitcast — Architecture & Build Plan

> A weather-driven web app: a full-bleed animated **3D scene** reflects current
> conditions, and a **3D mascot** dresses for the weather while a short
> storytelling card tells you what to wear.

---

## 1. Product concept

A single-screen web app that:

1. Detects/accepts a location and fetches **current weather**.
2. Renders a full-bleed **animated 3D scene** matching the conditions
   (clear day, clear night, clouds, rain, snow, thunder, fog, wind) — the
   Samsung/Google "living wallpaper" feel, but real 3D with depth and parallax.
3. Places a **3D mascot** (cute animal/character) that dresses for the weather:
   poncho + umbrella in rain, scarf + coat in cold, sunhat + shades in heat.
4. Shows a short **storytelling advice card**:
   _"It's 4°C and drizzly — grab your umbrella, Ribbit's staying dry!"_

---

## 2. Tech stack

| Layer         | Choice                                             | Why                                                                                                           |
| ------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Build/runtime | **Rsbuild + React 19 + TS** (existing)             | Already set up, Rspack is fast                                                                                |
| 3D renderer   | **three** + **@react-three/fiber**                 | Standard React ↔ Three bridge                                                                                 |
| 3D helpers    | **@react-three/drei**                              | Loaders, camera controls, `<Html>`, `<Environment>`, particles                                                |
| Post-FX       | **@react-three/postprocessing**                    | Bloom, fog, depth-of-field for the "wow"                                                                      |
| Animation     | **@react-spring/three** (+ `useFrame`)             | Smooth scene/mascot transitions                                                                               |
| State         | **zustand**                                        | Tiny global store for weather + outfit state                                                                  |
| Weather API   | **Open-Meteo** ⭐                                  | Free, **no API key**; temp, apparent-temp, wind, precip, UV, `is_day`, WMO codes; free geocoding              |
| Location      | `navigator.geolocation` + Open-Meteo geocoding     | Auto-locate with city-search fallback                                                                         |
| LLM (runtime) | **Claude Haiku 4.5** default, via provider adapter | Cheap + near-free with caching, strong short copy & structured JSON; swappable behind one interface (see §11) |
| LLM proxy     | Serverless function (Vercel / CF Workers)          | Keeps the API key off the client                                                                              |
| 3D asset gen  | **Meshy / Luma** (build-time)                      | Text-to-3D mascot + props; run offline, zero runtime cost                                                     |

**Why Open-Meteo:** since we source everything ourselves and want zero friction,
a no-API-key service removes secret management and signup. Its WMO weather codes
map cleanly onto our scene states.

---

## 3. Architecture (3 layers)

```
┌───────────────────────────────────────────────┐
│  PRESENTATION                                   │
│  • <Canvas> (R3F): Sky, Lighting, WeatherFX,    │
│    Mascot(+accessories), CameraRig, PostFX      │
│  • DOM overlay: location bar, advice card, UI   │
├───────────────────────────────────────────────┤
│  DOMAIN (pure TS, testable, no React)           │
│  • normalizeWeather(raw) → WeatherState         │
│  • recommendOutfit(WeatherState) → Outfit       │
│  • mapToScene(WeatherState) → SceneDescriptor   │
├───────────────────────────────────────────────┤
│  DATA                                            │
│  • weatherService: fetch + cache + geocode      │
└───────────────────────────────────────────────┘
```

The **domain layer stays pure** (no React, no Three), so clothing logic and
weather→scene mapping are unit-testable and independent of the visuals.

---

## 4. Core data model

```ts
type Condition =
  'clear' | 'partlyCloudy' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder';

interface WeatherState {
  tempC: number;
  feelsLikeC: number; // drives clothing more than raw temp
  condition: Condition; // from WMO code
  isDay: boolean;
  windKph: number;
  precipMm: number;
  uvIndex: number;
  location: { name: string; lat: number; lon: number };
}

type Garment =
  | 'tshirt'
  | 'longSleeve'
  | 'coat'
  | 'heavyCoat'
  | 'raincoat'
  | 'scarf'
  | 'gloves'
  | 'hat'
  | 'sunhat'
  | 'sunglasses'
  | 'umbrella'
  | 'shorts'
  | 'pants'
  | 'boots'
  | 'sneakers';

interface Outfit {
  garments: Garment[]; // → toggle matching meshes on the mascot
  story: string; // storytelling advice copy
  vibe: 'cozy' | 'sunny' | 'rainy' | 'freezing' | 'stormy';
}
```

---

## 5. Rule engines (the "brain")

Both are deterministic lookup/threshold functions — **no ML needed**.

**Outfit rules** — driven mainly by `feelsLikeC` bands, modified by precip/wind/UV:

- `< 0°C` → heavyCoat, scarf, gloves, hat, boots
- `0–10°C` → coat, longSleeve, pants
- `10–18°C` → longSleeve, pants
- `18–25°C` → tshirt, pants/shorts
- `> 25°C` → tshirt, shorts, sunhat, sunglasses
- `+ rain/drizzle` → raincoat + umbrella
- `+ high wind` → swap for windbreaker
- `+ high UV` → force sunhat + sunglasses

**Scene mapping** — `condition` + `isDay` + wind → a `SceneDescriptor`
(sky gradient/colors, particle system on/off + density, cloud count, lighting
intensity/color, fog density, camera sway amount).

---

## 6. 3D scene design

- **Sky:** shader-gradient dome interpolated by time-of-day (`is_day` +
  sunrise/sunset tint). Cheap and beautiful.
- **Lighting:** one directional "sun/moon" (color + angle by day/night) +
  ambient/hemisphere fill; drei `<Environment>` for reflections.
- **Weather FX (procedural — no heavy assets):**
  - Rain/drizzle → GPU-instanced streaks (density scales with `precipMm`)
  - Snow → instanced drifting flakes
  - Clouds → drei `<Cloud>` volumetric puffs (count by `condition`)
  - Fog → scene fog + reduced draw distance
  - Thunder → timed light flashes + bloom
  - Wind → global sway factor fed into mascot/foliage/particles
- **Camera rig:** gentle idle parallax (mouse/gyro) for depth — this is what
  sells "3D" over a flat image.
- **Post-FX:** subtle bloom + depth-of-field; toned down on mobile.

---

## 7. Mascot design & asset sourcing

- **Model:** one rigged low-poly character/animal with a looping idle animation.
  Accessories (coat, scarf, umbrella, hat, sunglasses, boots) are **separate
  meshes** parented to the rig — the outfit engine toggles visibility. Far
  cheaper than per-outfit models.
- **Sourcing (all free / CC0, upgrade later):**
  - Characters/props: **Quaternius**, **Kenney**, **Poly Pizza** (CC0,
    game-ready, low-poly, consistent style)
  - Or **AI-generate** a bespoke mascot with **Meshy / Luma**
  - Export as **.glb**, **Draco-compressed**, lazy-loaded via `useGLTF` +
    `<Suspense>`
- **Placeholder-first:** wire up the accessory-toggle system with a primitive
  model, then swap in the final mascot without touching logic.

---

## 8. Folder structure

```
src/
  app/                     App shell, providers, global styles
    App.tsx
    providers.tsx
  data/                    External I/O — fetch, cache, geocode
    weatherService.ts
    geocode.ts
    cache.ts
  domain/                  Pure TS — no React, no Three (fully testable)
    types.ts
    normalizeWeather.ts
    recommendOutfit.ts
    mapToScene.ts
    __tests__/
  store/                   Global state
    useAppStore.ts         (zustand)
  three/                   All R3F / WebGL
    Scene.tsx
    Sky.tsx
    Lighting.tsx
    CameraRig.tsx
    PostFX.tsx
    weather/
      Rain.tsx
      Snow.tsx
      Clouds.tsx
      Fog.tsx
      Thunder.tsx
    mascot/
      Mascot.tsx
      useAccessories.ts
  ui/                      DOM overlay (HTML/CSS, not WebGL)
    LocationBar.tsx
    AdviceCard.tsx
    Loading.tsx
  assets/                  .glb models, textures, HDRIs
  lib/                     Shared helpers (math, formatting)
```

---

## 9. Milestones

| #   | Milestone       | Deliverable                                                                    |
| --- | --------------- | ------------------------------------------------------------------------------ |
| M0  | Setup           | Install deps, folders, `<Canvas>` renders a lit test cube                      |
| M1  | Data layer      | Geolocation + city search → live `WeatherState`                                |
| M2  | Domain + tests  | `recommendOutfit` & `mapToScene` with unit tests                               |
| M3  | 3D foundation   | Sky gradient, day/night lighting, camera parallax                              |
| M4  | First scene E2E | Live weather → rain scene w/ procedural particles                              |
| M5  | Mascot system   | Model + accessory-toggle wired to `Outfit`                                     |
| M6  | All conditions  | Every `Condition`/temp band + smooth transitions                               |
| M7  | UI + story      | Location bar, storytelling advice card, loading states                         |
| M8  | Polish          | Responsive, mobile perf fallback, deploy                                       |
| M9  | AI storytelling | Serverless proxy + `LLMProvider` (Grok) → live narration, rule-engine fallback |
| M10 | AI assistant    | (Phase 2) Conversational mascot via tool use                                   |

---

## 10. Risks & mitigations

- **Asset consistency/quality** → commit to one CC0 art pack for a coherent
  style; placeholder-first so logic never blocks on art.
- **Mobile performance** (WebGL is heavy) → instanced particles, Draco
  compression, capped pixel ratio, reduced post-FX on mobile, lazy loading.
- **Abrupt scene transitions** → cross-fade sky/lighting and ramp particle
  density with `@react-spring`.

---

## 11. AI integration

AI shows up in two distinct places: **build-time** (generating assets) and
**runtime** (powering behavior). Everything runtime goes through a
**provider-agnostic adapter** so the model vendor is a swappable detail.

### Provider strategy

- **Default:** **Claude Haiku 4.5** (`claude-haiku-4-5-20251001`) — cheap, fast,
  strong at short in-character copy and reliable structured JSON. With
  weather-bucket caching, runtime token use (and cost) is negligible.
- **Swappable:** all calls go through one `LLMProvider` interface, so switching
  to **Gemini Flash** (real free tier), **Groq** (free tier, open models), or
  any other vendor is a config change, not a rewrite.
- **Note on "free tiers":** xAI **Grok has no free API tier** — the old
  $150/mo credits ended May 2025; Tier 0 bills per token from day one. Real
  free tiers today are **Gemini Flash** and **Groq** (the inference provider,
  not xAI's Grok — easy to confuse). Because we cache aggressively, the free
  vs. paid distinction barely affects our bill.
- Keep the rule engine as a **no-AI fallback** so the app always works
  offline/over quota.

```ts
interface LLMProvider {
  // Short, in-character narration for the current weather + outfit.
  narrate(input: { weather: WeatherState; outfit: Outfit }): Promise<Narration>;
  // Optional conversational / tool-use loop (phase 2).
  chat(messages: ChatMessage[], tools?: Tool[]): Promise<ChatReply>;
}

interface Narration {
  story: string; // the advice-card copy
  vibe: Outfit['vibe'];
  emoji: string;
}
```

Concrete impls: `GrokProvider`, `ClaudeProvider` — selected by env/config.

### Runtime features (ranked by value)

1. **Storytelling layer (primary).** Replace the static advice template with
   LLM-generated, in-character narration that varies by conditions, time of
   day, and location. Define the mascot **persona** in the system prompt for a
   consistent voice; force **structured JSON output** (`story`, `vibe`,
   `emoji`) so it drops straight into the UI. Cache by
   `(condition, tempBand, isDay)` to stay well inside free-tier limits.
2. **Conversational assistant (phase 2).** Let users talk to the mascot
   ("what should I wear for a run tonight?"). Use **tool use** — expose
   `weatherService` + `recommendOutfit` as tools so answers are grounded in
   real data, not hallucinated.
3. **Smart outfit layer (optional).** On top of the deterministic rule engine,
   the LLM can factor in activity/occasion/thermal preference and return a
   `Garment[]` via structured output. Rules stay the default and the fallback.

### Build-time features

- **Mascot + accessories:** text-to-3D (Meshy / Luma) → `.glb`, hand-cleaned in
  Blender. One-time, no runtime cost.
- **Textures / skyboxes / HDRIs:** image models for stylized sky gradients and
  environment maps.

### Architecture additions

```
Browser  ──►  /api/narrate (serverless proxy, holds API key)  ──►  LLM provider
   │                                                                    │
   └───────────── falls back to rule-engine copy if unavailable ◄───────┘
```

- The API key **never** ships to the client — a thin serverless proxy holds it.
- New folder: `api/` (serverless functions) + `src/ai/` (provider adapter,
  prompts, response schemas).

### Cost / safety guardrails

- Aggressive response caching keyed on weather buckets.
- Hard timeout + graceful fallback to the rule-engine story.
- Keep runtime prompts short; do heavy/creative work at build time.

---

## 12. Decisions locked

- **Render style:** true 3D via React Three Fiber
- **Assets:** sourced/generated by us (CC0-first, upgrade later)
- **Weather source:** Open-Meteo (no API key)
- **Location input:** auto geolocation + city-search fallback
- **AI:** provider-agnostic adapter, **Claude Haiku 4.5 default**
  (`claude-haiku-4-5-20251001`); Gemini Flash / Groq as free-tier swap-ins;
  rule engine remains the always-on fallback
