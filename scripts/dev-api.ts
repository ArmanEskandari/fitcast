/**
 * Local dev server for the serverless `api/` functions.
 *
 * The rsbuild dev server serves the SPA but does NOT run the Vercel-style
 * functions in `api/`. This tiny Node server runs them locally so AI features
 * work in development: it loads `.env.local`, adapts Node's req/res to the
 * `(req, res)` shape the handlers expect, and serves `/api/*`. rsbuild proxies
 * `/api` here (see rsbuild.config.ts).
 *
 * Run alongside the dev server:  pnpm dev:api   (and, separately, pnpm dev)
 */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import narrate from '../api/narrate';
import chat from '../api/chat';

// Load .env.local into process.env (no external dependency).
try {
  const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]]) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[m[1]] = value;
  }
} catch {
  console.warn('[dev-api] no .env.local found — AI endpoints will report unconfigured');
}

const routes: Record<string, (req: unknown, res: unknown) => Promise<void>> = {
  '/api/narrate': narrate as never,
  '/api/chat': chat as never,
};

const server = createServer(async (req, res) => {
  const path = (req.url ?? '').split('?')[0];
  const handler = routes[path];
  if (!handler) {
    res.statusCode = 404;
    res.end('not found');
    return;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const rawBody = Buffer.concat(chunks).toString('utf8');
  let body: unknown = {};
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    /* leave body as {} */
  }

  const vreq = { method: req.method, body };
  const vres = {
    status(code: number) {
      res.statusCode = code;
      return this;
    },
    json(obj: unknown) {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(obj));
    },
  };

  try {
    await handler(vreq, vres);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'handler_threw', detail: String(err) }));
  }
});

const PORT = Number(process.env.DEV_API_PORT ?? 5200);
server.listen(PORT, () => {
  const configured = Boolean(process.env.ANTHROPIC_API_KEY);
  console.log(`[dev-api] listening on http://localhost:${PORT}`);
  console.log(`[dev-api] ANTHROPIC_API_KEY ${configured ? 'loaded ✓' : 'MISSING ✗'}`);
});
