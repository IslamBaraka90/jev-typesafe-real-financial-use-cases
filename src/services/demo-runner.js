// One run loop for every demo, shared by the recorder and the live route. Give it a demo definition,
// a dataset and a way to ask the model; it builds each state, collects the answers and hands back a
// record in the same shape the recorded fixtures use.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expandAnswers } from '../../demos/lib/answers.js';
import { fromOpenAIAnswers, toOpenAIInput, toOpenAIQuestions } from '../../demos/lib/openai-format.js';
import { loadDataset, repoRoot } from './dataset.js';

/** The decision models a demo can be recorded against. Jev's file keeps its original name. */
export const PROVIDERS = ['jev', 'openai'];

/** The model a demo is recorded on when none is named: Jev, unless the demo only runs elsewhere. */
export const defaultProvider = (demo) => demo?.providers?.[0] ?? 'jev';

export const fixturesFile = (slug, provider = 'jev') =>
  path.join(repoRoot, 'demos', slug, provider === 'jev' ? 'fixtures.json' : `fixtures.${provider}.json`);

/** The context a demo's `buildState` and `report` receive: the dataset's own context plus its items. */
export function demoContext(dataset) {
  return { ...(dataset.context ?? {}), items: dataset.items };
}

/** Recorded answers with their rubrics restored, for the runtime and the tests. */
export function fixtureAnswers(fixtures, questions, itemId) {
  const answers = fixtures.answers?.[itemId];
  return answers ? expandAnswers(answers, questions) : null;
}

/** Recorded answers for a demo, or an empty set when it has none yet. */
export async function loadFixtures(slug, provider = 'jev') {
  try {
    return JSON.parse(await readFile(fixturesFile(slug, provider), 'utf8'));
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
export async function runDemo(demo, { dataset, items, ask, onItem, signal } = {}) {
  const data = dataset ?? (await loadDataset(demo.id));
  const context = demoContext(data);
  const chosen = items?.length ? data.items.filter((item) => items.includes(item.id)) : data.items;
  const results = [];

  for (const item of chosen) {
    if (signal?.aborted) break;
    const state = demo.buildState(item, context);
    // Image demos name their pictures separately from the state, so the state stays readable JSON.
    const images = demo.images ? await Promise.all(demo.images(item, context).map(imageDataUrl)) : [];
    const response = await ask({ state, questions: demo.questions, item, images });
    const result = { item, state, ...response, evaluation: response.answers ? demo.evaluate(response.answers, item, context) : null };
    results.push(result);
    await onItem?.(result);
  }

  return { dataset: data, context, results };
}
