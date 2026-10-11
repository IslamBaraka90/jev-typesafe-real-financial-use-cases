// How a demo gets its answers. By default they come from the fixture file recorded with
// `npm run record`; a demo switched to live asks the local server to call the API instead. Both
// return the same shape, so the runtime, the report and the page never know which one they have.

import { expandAnswers } from '../../../demos/lib/answers.js';

// OpenAI's recordings sit beside Jev's as fixtures.openai.json. Each is its own lazy chunk, fetched
// only when a page switches to that model.
const OPENAI_FIXTURES = import.meta.glob('../../../demos/*/fixtures.openai.json');

const datasets = new Map();
const fixtures = new Map();

const unwrap = (module) => module.default ?? module;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The demo's dataset, fetched once per session. */
export function loadDemoData(demo) {
  if (!datasets.has(demo.id)) datasets.set(demo.id, demo.data().then(unwrap));
  return datasets.get(demo.id);
}

/** The loader for one model's recording of a demo, or null when that model has none. */
function fixturesLoader(demo, provider) {
  if (provider === 'openai') return OPENAI_FIXTURES[`../../../demos/${demo.id}/fixtures.openai.json`] ?? null;
  return demo.providers && !demo.providers.includes('jev') ? null : demo.fixtures;
}

/** The demo's recorded answers on one model, fetched once per session. */
export function loadFixtures(demo, provider = 'jev') {
  const key = `${demo.id}:${provider}`;
  if (!fixtures.has(key)) {
    const load = fixturesLoader(demo, provider);
    fixtures.set(key, load ? load().then(unwrap).catch(() => ({ answers: {} })) : Promise.resolve({ answers: {} }));
  }
  return fixtures.get(key);
}

/** What the page says about where the answers came from. */
export async function answerSource(demo, provider = 'jev') {
  const file = await loadFixtures(demo, provider);
  return {
    model: file.model ?? null,
    recordedAt: file.recordedAt ?? null,
    source: file.source ?? 'Recorded answers',
    items: Object.keys(file.answers ?? {}).length,
  };
}

/** Replays one recorded answer. `pause` keeps the reading step visible while a run plays. */
export async function replayItem(demo, item, { pause = 0, provider = 'jev' } = {}) {
  const file = await loadFixtures(demo, provider);
  const answers = file.answers?.[item.id];
  if (!answers) {
    throw new Error(`No recorded answer for ${demo.id} item ${item.id}. Record it with: npm run record ${demo.id}`);
  }
  if (pause) await sleep(pause);
  return { answers: expandAnswers(answers, demo.questions), model: file.model ?? null, recordedAt: file.recordedAt ?? null, recorded: true };
}

/** Runs one item against the real API through the local server. Only ever called after a confirmation. */
export async function runItemLive(demo, item) {
  const response = await fetch(`/api/demos/${encodeURIComponent(demo.id)}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId: item.id }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message ?? `The request failed (${response.status}).`);
  return { ...body, recorded: false };
}

/** One call for the runtime. `live` is false unless the page has been switched over and confirmed. */
export function runItem(demo, item, { live = false, pause = 0, provider = 'jev' } = {}) {
  return live ? runItemLive(demo, item) : replayItem(demo, item, { pause, provider });
}
