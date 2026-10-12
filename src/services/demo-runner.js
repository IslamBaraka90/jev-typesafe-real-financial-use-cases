// One run loop for every demo, shared by the recorder and the live route. Give it a demo definition,
// a dataset and a way to ask the model; it builds each state, collects the answers and hands back a
// record in the same shape the recorded fixtures use.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expandAnswers } from '../../demos/lib/answers.js';
import { fromOpenAIAnswers, toOpenAIInput, toOpenAIQuestions } from '../../demos/lib/openai-format.js';
import { defaultModel, fixturesName, MODEL_IDS } from '../../demos/lib/models.js';
import { unpackFixtures } from '../../demos/lib/packed.js';
import { findDemo } from '../../demos/index.js';
import { loadDataset, repoRoot } from './dataset.js';

/** The decision models a demo can be recorded against, from demos/lib/models.js. */
export const PROVIDERS = MODEL_IDS;

/** The model a demo is recorded and scored on when none is named: Jev, or the first image model. */
export const defaultProvider = (demo) => defaultModel(demo);

export const fixturesFile = (slug, provider = 'jev') => path.join(repoRoot, 'demos', slug, fixturesName(provider));

/** The context a demo's `buildState` and `report` receive: the dataset's own context plus its items. */
export function demoContext(dataset) {
  return { ...(dataset.context ?? {}), items: dataset.items };
}

/** Recorded answers with their rubrics restored, for the runtime and the tests. */
export function fixtureAnswers(fixtures, questions, itemId) {
  const answers = fixtures.answers?.[itemId];
  return answers ? expandAnswers(answers, questions) : null;
}

/** Recorded answers for a demo in the ordinary shape, or an empty set when it has none yet. */
export async function loadFixtures(slug, provider = 'jev') {
  try {
    const file = JSON.parse(await readFile(fixturesFile(slug, provider), 'utf8'));
    return file.format ? unpackFixtures(file, findDemo(slug).questions) : file;
  } catch (error) {
    if (error.code === 'ENOENT') return { demo: slug, answers: {} };
    throw error;
  }
}

/** Asks the model one item's questions. Returns the answers plus what the call cost. */
export async function askModel(typesafe, { state, questions, signal, timeout = 60_000 }) {
  const started = performance.now();
  const { data, requestId } = await typesafe.systemOne({ state, questions }, { timeout, signal }).withResponse();
  return {
    answers: data.answers,
    model: data.model,
    usage: data.usage,
    requestId,
    latencyMs: Math.round(performance.now() - started),
  };
}

/**
 * Asks OpenAI's decisions API one item's questions, translated into its shapes and back. Refused
 * questions come back in `refusals`, and an item with any refusal has no answers to grade.
 */
export async function askOpenAI(client, { state, questions, images = [], model, signal, timeout = 90_000 }) {
  const started = performance.now();
  const { data, request_id: requestId } = await client.decisions
    .create({ model, input: toOpenAIInput(state, images), questions: toOpenAIQuestions(questions) }, { timeout, signal })
    .withResponse();
  const { answers, refusals } = fromOpenAIAnswers(data.answers);
  return {
    answers: refusals.length ? null : answers,
    refusals,
    model: data.model,
    usage: data.usage,
    requestId: requestId ?? null,
    latencyMs: Math.round(performance.now() - started),
  };
}

const OPENROUTER_URL = 'https://openrouter.ai/api/alpha/decisions';
const RETRYABLE = new Set([408, 429, 500, 502, 503, 524, 529]);

/** A noul's outcomes as OpenRouter names them: `true` and `false` rather than yes and no. */
export function toOpenRouterQuestions(questions) {
  return Object.fromEntries(
    Object.entries(questions).map(([name, question]) => {
      if (question.type !== 'noul') return [name, question];
      const { yes, no } = question.criteria ?? {};
      const criteria = { ...(yes ? { true: yes } : {}), ...(no ? { false: no } : {}) };
      return [name, { type: 'noul', instructions: question.instructions, ...(yes || no ? { criteria } : {}) }];
    }),
  );
}

/**
 * The state as OpenRouter's decisions endpoint takes it. With pictures it is a list of content parts,
 * the text first; any other way of attaching an image is read as text, as a probe showed.
 */
export function toOpenRouterState(state, images = []) {
  if (!images.length) return state;
  const text = typeof state === 'string' ? state : JSON.stringify(state, null, 2);
  return [{ type: 'text', text }, ...images.map((url) => ({ type: 'image_url', image_url: { url } }))];
}

/**
 * Asks one model on OpenRouter one item's questions. Rate limits and server errors are retried with a
 * growing pause; the latency reported is that of the call that succeeded.
 */
export async function askOpenRouter({ apiKey, route, state, questions, images = [], stateAsText = false, imageHost = null, timeout = 120_000, attempts = 7 }) {
  const sent = stateAsText && !images.length && typeof state !== 'string' ? JSON.stringify(state, null, 2) : state;
  // A model served by several hosts may have only one that reads pictures; images go to that one.
  const provider = images.length && imageHost ? { provider: { only: [imageHost], allow_fallbacks: false } } : {};
  const body = JSON.stringify({ model: route, ...provider, state: toOpenRouterState(sent, images), questions: toOpenRouterQuestions(questions) });
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, Math.min(60_000, 2000 * 2 ** attempt)));
    const started = performance.now();
    let response;
    try {
      response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'Decision Lab' },
        body,
        signal: AbortSignal.timeout(timeout),
      });
    } catch (error) {
      lastError = error;
      continue;
    }
    const latencyMs = Math.round(performance.now() - started);
    const text = await response.text();
    if (!response.ok) {
      lastError = new Error(`OpenRouter ${response.status}: ${text.slice(0, 300)}`);
      lastError.status = response.status;
      if (RETRYABLE.has(response.status)) continue;
      throw lastError;
    }
    const data = JSON.parse(text);
    const usage = { input_tokens: data.usage?.input_tokens ?? 0, output_tokens: data.usage?.output_tokens ?? 0, cost: data.usage?.cost ?? 0 };
    const missing = Object.keys(questions).filter((name) => !data.answers?.[name] || data.answers[name].type === 'refusal');
    return { answers: missing.length ? null : data.answers, refusals: missing, model: data.model, provider: data.provider ?? null, usage, requestId: data.id ?? null, latencyMs };
  }
  throw lastError;
}

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };

/** An image a demo points at, under web/public, as the base64 data URL the API requires. */
export async function imageDataUrl(relativePath) {
  const file = path.join(repoRoot, 'web', 'public', relativePath);
  const type = MIME[path.extname(file).toLowerCase()];
  if (!type) throw new Error(`Unsupported image type: ${relativePath}`);
  return `data:${type};base64,${(await readFile(file)).toString('base64')}`;
}

/**
 * Runs `items` of a demo through the model. `ask` is injected so tests can stub it and the recorder
 * and the live route can share this loop unchanged.
 */
export async function runDemo(demo, { dataset, items, ask, onItem, signal, concurrency = 1 } = {}) {
  const data = dataset ?? (await loadDataset(demo.id));
  const context = demoContext(data);
  const chosen = items?.length ? data.items.filter((item) => items.includes(item.id)) : data.items;
  const results = new Array(chosen.length);
  let next = 0;

  // `concurrency` workers take the next item in turn; results keep the dataset's order.
  async function worker() {
    while (next < chosen.length && !signal?.aborted) {
      const index = next++;
      const item = chosen[index];
      const state = demo.buildState(item, context);
      // Image demos name their pictures separately from the state, so the state stays readable JSON.
      const images = demo.images ? await Promise.all(demo.images(item, context).map(imageDataUrl)) : [];
      const response = await ask({ state, questions: demo.questions, item, images });
      const result = { item, state, ...response, evaluation: response.answers ? demo.evaluate(response.answers, item, context) : null };
      results[index] = result;
      await onItem?.(result);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));

  return { dataset: data, context, results: results.filter(Boolean) };
}
