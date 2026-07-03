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
import { fetchWeather } from '../src/data/weatherService.js';
import { recommendOutfit } from '../src/domain/recommendOutfit.js';

const MODEL = 'claude-sonnet-5';

const SYSTEM = `You are Sprout, Fitcast's friendly weather mascot. Help the user
decide what to wear, grounded in real current weather. Before giving clothing
advice, call the get_weather tool to look up conditions for the relevant place.
Keep replies warm, in-character, and concise (2-4 sentences). If the user names
an activity (a run, a commute, a hike), tailor the advice to it. Note that you
only have *current* conditions, not a future forecast, if that matters.`;

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
      'Get current weather and the recommended outfit for a place. Call before giving clothing advice.',
    input_schema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name, e.g. "London"' },
      },
      required: ['location'],
      additionalProperties: false,
    },
  },
];

async function runTool(name: string, input: { location: string }) {
  if (name !== 'get_weather') return { error: 'unknown tool' };
  const [match] = await searchCities(input.location, 1);
  if (!match) return { error: `No place found for "${input.location}".` };
  const w = await fetchWeather(match);
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
  };
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
