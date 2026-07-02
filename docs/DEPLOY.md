# Deploying Fitcast

Fitcast is a **static single-page app** (Rsbuild → `dist/`). No server is required
today — weather comes from Open-Meteo directly in the browser.

## Build

```bash
# Requires Node 22 (see .nvmrc / engines). With nvm:
nvm use 22
pnpm install
pnpm build      # outputs static assets to dist/
pnpm preview    # serve the production build locally to smoke-test
```

## Host options (any static host works)

| Host                 | Build command | Output dir | Notes                                                                              |
| -------------------- | ------------- | ---------- | ---------------------------------------------------------------------------------- |
| **Vercel**           | `pnpm build`  | `dist`     | Framework preset: "Other". Best pick — supports the serverless proxy we add in M9. |
| **Netlify**          | `pnpm build`  | `dist`     | Also supports functions for M9.                                                    |
| **Cloudflare Pages** | `pnpm build`  | `dist`     | Functions via Workers for M9.                                                      |
| **GitHub Pages**     | `pnpm build`  | `dist`     | Static only. For a project subpath (`/repo/`), set an asset prefix — see below.    |

Set the Node version to **22** in the host's environment settings.

### GitHub Pages subpath

If hosting under `https://user.github.io/fitcast/`, assets need the subpath.
In `rsbuild.config.ts`:

```ts
export default defineConfig({
  plugins: [pluginReact()],
  output: { assetPrefix: '/fitcast/' },
});
```

## AI storytelling (optional — built in M9)

The advice card upgrades to AI-generated narration when a serverless proxy is
available; otherwise it uses the rule-engine story (always-on fallback), so the
static build works with no server.

- **Proxy:** `api/narrate.ts` — a Vercel/Netlify/Cloudflare function that calls
  **Claude Haiku 4.5** and returns `{ story, vibe, emoji }`. It's outside the
  client bundle (the `@anthropic-ai/sdk` never ships to the browser).
- **To enable:** deploy on a functions-capable host and set the env var
  **`ANTHROPIC_API_KEY`** in the host's settings. That's it — the client calls
  `/api/narrate` and shows a ✦ badge when narration is AI-written.
- **Not set / no functions:** `/api/narrate` returns nothing usable and the app
  silently falls back to the rule engine. No error surface to the user.
- **Cost:** narration is cached per weather bucket (~30 min), so real API usage
  is a handful of short Haiku calls — negligible.
