/**
 * Serverless proxy: conversational "what should I wear?" assistant. Runs a
 * Claude Sonnet 5 tool-use loop grounded in real weather — the model calls
 * `get_weather` (geocode + Open-Meteo + the rule engine) before advising.
 * Holds ANTHROPIC_API_KEY server-side. See docs/PLAN.md §11 (M10).
 *
 * Outside the app tsconfig (`include: ["src"]`) — not in the client bundle or
 * `pnpm typecheck`; the deploy host compiles it. It imports the pure domain/
 * data helpers (no React, no Three), which are Node-safe.
 */
import Anthropic from '@anthropic-ai/sdk';
import { searchCities } from '../src/data/geocode.js';
import { fetchForecastAt, fetchWeather } from '../src/data/weatherService.js';
import { recommendOutfit } from '../src/domain/recommendOutfit.js';
import type { WeatherState } from '../src/domain/types.js';

const MODEL = 'claude-sonnet-5';

const SYSTEM = `You are Sprout, Fitcast's friendly weather mascot. Help the user
decide what to wear, grounded in real weather. Before giving clothing advice,
call the get_weather tool to look up conditions for the relevant place. For a
future time (e.g. "Monday at 8am", "tomorrow afternoon"), pass the \`when\`
argument so you get the forecast for that hour instead of current conditions.
Keep replies warm, in-character, and concise (2-4 sentences). If the user names
an activity (a run, a commute, a hike), tailor the advice to it. Forecasts reach
about 14 days ahead; if a request is beyond that, say so and offer current
conditions as a rough guide.`;

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  de: 'German',
  fa: 'Persian (Farsi)',
  fr: 'French',
  tr: 'Turkish',
};

const TOOLS = [
  {
    name: 'get_weather',
    description:
      'Get the weather and recommended outfit for a place. Call before giving clothing advice. Omit `when` for current conditions; pass it for a future forecast.',
    input_schema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name, e.g. "London"' },
        when: {
          type: 'string',
          description:
            'Optional. Local wall-clock date-time for a future forecast, ISO 8601 without timezone, e.g. "2026-07-06T08:00". Compute it from the current date given in the system prompt (resolve "Monday", "tomorrow", etc.). Available up to ~14 days ahead. Omit for current weather.',
        },
      },
      required: ['location'],
      additionalProperties: false,
    },
  },
];

/** Shape the tool result the model sees, deriving the outfit from conditions. */
function packWeather(w: WeatherState, extra: Record<string, unknown> = {}) {
  const outfit = recommendOutfit(w);
  return {
    location: w.location.name,
    tempC: Math.round(w.tempC),
    feelsLikeC: Math.round(w.feelsLikeC),
    condition: w.condition,
    isDay: w.isDay,
    windKph: Math.round(w.windKph),
    precipMm: w.precipMm,
    uvIndex: w.uvIndex,
    recommended: outfit.garments,
    vibe: outfit.vibe,
    ...extra,
  };
}

async function runTool(name: string, input: { location: string; when?: string }) {
  if (name !== 'get_weather') return { error: 'unknown tool' };
  const [match] = await searchCities(input.location, 1);
  if (!match) return { error: `No place found for "${input.location}".` };

  if (input.when) {
    const forecast = await fetchForecastAt(match, input.when);
    if (forecast) {
      return packWeather(forecast.weather, {
        isForecast: true,
        forecastFor: forecast.resolvedTime,
      });
    }
    // Requested time is outside the ~14-day forecast window (or unparseable):
    // fall back to current conditions and flag it so the model can explain.
    return packWeather(await fetchWeather(match), {
      isForecast: false,
      requestedTimeOutOfRange: input.when,
    });
  }

  return packWeather(await fetchWeather(match), { isForecast: false });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(501).json({ error: 'ai_unconfigured' });
    return;
  }

  try {
    const { messages: incoming, defaultLocation, language } = req.body ?? {};
    if (!Array.isArray(incoming) || incoming.length === 0) {
      res.status(400).json({ error: 'missing_messages' });
      return;
    }

    let system = SYSTEM;
    system += `\nThe current date and time is ${new Date().toISOString()} (UTC). Resolve relative days like "Monday" or "tomorrow" against this, and express the \`when\` argument in the place's local wall-clock time.`;
    if (defaultLocation) {
      system += `\nThe user's current location is ${defaultLocation}; use it when they don't specify one.`;
    }
    const langName = language && LANGUAGE_NAMES[language];
    if (langName && language !== 'en') {
      system += `\nReply to the user in ${langName}, regardless of the language they write in.`;
    }

    const client = new Anthropic();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = incoming.map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    for (let guard = 0; guard < 5; guard++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system,
        tools: TOOLS,
        messages,
      });

      if (response.stop_reason === 'tool_use') {
        // Echo the assistant turn back verbatim (preserves thinking blocks).
        messages.push({ role: 'assistant', content: response.content });
        const results = [];
        for (const block of response.content) {
          if (block.type === 'tool_use') {
            const out = await runTool(block.name, block.input as { location: string });
            results.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(out),
            });
          }
        }
        messages.push({ role: 'user', content: results });
        continue;
      }

      const reply = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { text: string }).text)
        .join('\n')
        .trim();
      res.status(200).json({ reply });
      return;
    }

    res.status(200).json({ reply: 'Sorry, I got a bit tangled up — try asking again.' });
  } catch (err) {
    res.status(500).json({ error: 'chat_failed', detail: String(err) });
  }
}
