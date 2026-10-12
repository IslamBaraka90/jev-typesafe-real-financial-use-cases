import path from 'node:path';

// Variables already set in the shell take precedence over .env.
try {
  process.loadEnvFile(path.join(import.meta.dirname, '..', '.env'));
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
}

const apiKey = process.env.TYPESAFE_API_KEY?.trim();
if (!apiKey) {
  throw new Error(
    'TYPESAFE_API_KEY is not set. Copy .env.example to .env and add a key from https://console.typesafe.ai/settings/keys',
  );
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  // Local only by default: the dashboard can start backtests that spend API credits.
  host: process.env.HOST || '127.0.0.1',
  // Passed to the TypeSafeClient constructor.
  typesafe: { apiKey },
  // OpenAI's decisions API. Optional: without a key the site still replays its recorded answers, and
  // only recording or running live against OpenAI is refused.
  openai: {
    apiKey: process.env.OPENAI_API_KEY?.trim() || null,
    model: process.env.OPENAI_DECISIONS_MODEL?.trim() || 'gpt-6-luna',
  },
  // OpenRouter, which reaches the other decision models in demos/lib/models.js. Optional, like OpenAI.
  openrouter: { apiKey: process.env.OPENROUTER_API_KEY?.trim() || null },
};
