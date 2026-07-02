/**
 * Serverless proxy: generates in-character weather narration with Claude
 * Haiku 4.5. Holds ANTHROPIC_API_KEY server-side so it never reaches the
 * browser. Deploy on Vercel / Netlify / Cloudflare (functions). See
 * docs/PLAN.md §11 and docs/DEPLOY.md.
 *
 * Vercel-style Node handler. This file lives outside the app's tsconfig
 * (`include: ["src"]`), so it is not part of the client bundle or `pnpm
 * typecheck`; the deploy host compiles it.
 */
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-haiku-4-5';

const SYSTEM = `You are Sprout, Fitcast's upbeat weather mascot. Given the current
weather and a recommended outfit, write ONE short, warm, in-character sentence
(max ~140 characters) telling the user what to wear and why. Be playful and
specific to the conditions; never list the clothes mechanically. Then pick the
matching vibe and a single fitting emoji.`;

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  de: 'German',
  fa: 'Persian (Farsi)',
  fr: 'French',
  tr: 'Turkish',
};

function languageInstruction(code?: string): string {
  const name = code && LANGUAGE_NAMES[code];
  return name && code !== 'en'
    ? `\nWrite the "story" field in ${name}. Keep "vibe" and "emoji" as-is.`
    : '';
}

/** Structured-output schema — guarantees valid, parseable JSON. */
const SCHEMA = {
  type: 'object',
  properties: {
    story: { type: 'string' },
    vibe: {
      type: 'string',
      enum: ['cozy', 'sunny', 'rainy', 'freezing', 'stormy'],
    },
    emoji: { type: 'string' },
  },
  required: ['story', 'vibe', 'emoji'],
  additionalProperties: false,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    // No key configured — client falls back to the rule-engine story.
    res.status(501).json({ error: 'ai_unconfigured' });
    return;
  }

  try {
    const { weather, outfit, language } = req.body ?? {};
    if (!weather || !outfit) {
      res.status(400).json({ error: 'missing_weather_or_outfit' });
      return;
    }

    const userText = [
      `Location: ${weather.location?.name ?? 'unknown'}`,
      `Temperature: ${Math.round(weather.tempC)}°C (feels ${Math.round(weather.feelsLikeC)}°C)`,
      `Condition: ${weather.condition}, ${weather.isDay ? 'day' : 'night'}`,
      `Wind: ${Math.round(weather.windKph)} km/h, precip: ${weather.precipMm} mm, UV: ${weather.uvIndex}`,
      `Recommended items: ${(outfit.garments ?? []).join(', ')}`,
      `Suggested vibe: ${outfit.vibe}`,
    ].join('\n');

    const client = new Anthropic();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: SYSTEM + languageInstruction(language),
      messages: [{ role: 'user', content: userText }],
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    });

    const text = response.content.find((b) => b.type === 'text')?.text ?? '';
    const data = JSON.parse(text);
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'narration_failed', detail: String(err) });
  }
}
