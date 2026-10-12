#!/usr/bin/env node
// Records a demo's answers from a live decision model and writes them beside the demo, which is what
// the deployed site replays. This is the only paid step in the project.
//
// Usage: node scripts/record-demo.js <slug> [--provider <model>] [--items L-0001,L-0002] [--force]
//                                           [--concurrency 4] [--dry-run]
//
// <model> is an id from demos/lib/models.js: jev (the default for text demos), openai, or one of the
// models reached through OpenRouter. Jev's answers go to demos/<slug>/fixtures.json as they always
// have, every other model's to fixtures.<model>.json beside it. Recording one never touches another.
// The run resumes where it stopped, and saves as it goes. Each item's latency and cost are kept, so the
// benchmark can compare speed as well as accuracy.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../src/config.js';
import { findDemo } from '../demos/index.js';
import { loadDataset, repoRoot } from '../src/services/dataset.js';
import { compactAnswers } from '../demos/lib/answers.js';
import { MODEL_BY_ID, modelsFor } from '../demos/lib/models.js';
import { packAnswers } from '../demos/lib/packed.js';
import { askModel, askOpenAI, askOpenRouter, defaultProvider, fixturesFile, loadFixtures, runDemo } from '../src/services/demo-runner.js';

const [slug, ...flags] = process.argv.slice(2);
const has = (flag) => flags.includes(flag);
const value = (flag) => {
  const found = flags.find((entry) => entry.startsWith(`${flag}=`)) ?? (flags.includes(flag) ? flags[flags.indexOf(flag) + 1] : null);
  return found?.startsWith(`${flag}=`) ? found.slice(flag.length + 1) : found;
};
const fail = (message) => {
  console.error(message);
  process.exit(1);
};

if (!slug) fail('Usage: node scripts/record-demo.js <slug> [--provider <model>] [--items a,b] [--force] [--concurrency n] [--dry-run]');

const demo = findDemo(slug);
if (!demo) fail(`No demo called "${slug}".`);

const provider = value('--provider') ?? defaultProvider(demo);
const model = MODEL_BY_ID[provider];
if (!model) fail(`Unknown model "${provider}". Use one of: ${Object.keys(MODEL_BY_ID).join(', ')}.`);
if (!modelsFor(demo).includes(model)) fail(`${slug} sends images, which ${model.label} does not accept.`);
const keys = { typesafe: config.typesafe.apiKey, openai: config.openai.apiKey, openrouter: config.openrouter.apiKey };
const keyNames = { typesafe: 'TYPESAFE_API_KEY', openai: 'OPENAI_API_KEY', openrouter: 'OPENROUTER_API_KEY' };
if (!keys[model.via]) fail(`${keyNames[model.via]} is not set. Recording needs the live API; the site itself never calls it.`);

const dataset = await loadDataset(slug);
const existing = await loadFixtures(slug, provider);
const wanted = value('--items')?.split(',').map((id) => id.trim()).filter(Boolean) ?? null;
const force = has('--force');
const concurrency = Number(value('--concurrency') ?? (model.via === 'openrouter' ? 4 : 1));

const todo = dataset.items
  .filter((item) => !wanted || wanted.includes(item.id))
  .filter((item) => force || !(existing.answers?.[item.id] || existing.refusals?.[item.id]))
  .map((item) => item.id);

if (todo.length === 0) {
  console.log(`Nothing to record: ${slug} already has ${provider} answers for every item. Use --force to re-record.`);
  process.exit(0);
}

console.log(`${slug}: recording ${todo.length} of ${dataset.items.length} items on ${model.label}, ${Object.keys(demo.questions).length} questions each, ${concurrency} at a time.`);
if (has('--dry-run')) {
  console.log('Dry run, no requests sent. Items:', todo.join(', '));
  process.exit(0);
}

let ask;
if (model.via === 'typesafe') {
  const { typesafe } = await import('../src/lib/typesafe.js');
  ask = (request) => askModel(typesafe, request);
} else if (model.via === 'openai') {
  const { openai, openaiModel } = await import('../src/lib/openai.js');
  const client = openai();
  ask = (request) => askOpenAI(client, { ...request, model: openaiModel() });
} else {
  ask = (request) => askOpenRouter({ ...request, apiKey: keys.openrouter, route: model.route, stateAsText: model.stateAsText, imageHost: model.imageHost });
}

const answers = { ...(existing.answers ?? {}) };
const refusals = { ...(existing.refusals ?? {}) };
const errors = {};
const latencyMs = { ...(existing.latencyMs ?? {}) };
const usage = { input_tokens: existing.usage?.input_tokens ?? 0, output_tokens: existing.usage?.output_tokens ?? 0, cost: existing.usage?.cost ?? 0 };
let servedBy = existing.model ?? null;
let done = 0;

const file = fixturesFile(slug, provider);
const ordered = (map) => Object.fromEntries(dataset.items.filter((item) => map[item.id] !== undefined).map((item) => [item.id, map[item.id]]));
// Models reached through OpenRouter are stored packed (demos/lib/packed.js); Jev's and OpenAI's keep
// the ordinary shape they were first committed in.
const packed = model.via === 'openrouter';

async function save() {
  await mkdir(path.dirname(file), { recursive: true });
  const record = {
    demo: slug,
    provider,
    model: servedBy,
    ...(packed ? { format: 'packed-1', questions: Object.keys(demo.questions) } : {}),
    recordedAt: new Date().toISOString().slice(0, 10),
    source: 'scripts/record-demo.js',
    // Usage across every recording session, so the cost of a run can be read off the file.
    usage: { input_tokens: usage.input_tokens, output_tokens: usage.output_tokens, cost: Number(usage.cost.toFixed(6)) },
    answers: ordered(Object.fromEntries(Object.entries(answers).map(([id, set]) => [id, packed ? packAnswers(set, demo.questions) : compactAnswers(set, demo.questions)]))),
  };
  if (Object.keys(refusals).length) record.refusals = ordered(refusals);
  if (Object.keys(latencyMs).length) record.latencyMs = ordered(latencyMs);
  await writeFile(file, `${JSON.stringify(record, null, packed ? 0 : 2)}\n`);
}

// Out of credits is not an item failing: every request after it would fail the same way, so the
// run stops, saves what it has, and exits with a code the batch loop can stop on.
const outOfCredits = new AbortController();

await runDemo(demo, {
  dataset,
  items: todo,
  concurrency,
  signal: outOfCredits.signal,
  ask: async (request) => {
    try {
      return await ask(request);
    } catch (error) {
      if (error.status === 402) outOfCredits.abort();
      // One item failing for good is recorded as an error and the run goes on; it is retried next time.
      errors[request.item.id] = error.message;
      return { answers: null, refusals: [], error: error.message };
    }
  },
  onItem: async (result) => {
    if (result.answers) {
      answers[result.item.id] = result.answers;
      delete refusals[result.item.id];
    } else if (result.refusals?.length) {
      refusals[result.item.id] = result.refusals;
      delete answers[result.item.id];
    }
    if (result.latencyMs && !result.error) latencyMs[result.item.id] = result.latencyMs;
    usage.input_tokens += result.usage?.input_tokens ?? 0;
    usage.output_tokens += result.usage?.output_tokens ?? 0;
    usage.cost += result.usage?.cost ?? 0;
    servedBy = result.model ?? servedBy;
    done += 1;
    if (done % 50 === 0) await save();
    process.stdout.write(`\r  ${Object.keys(answers).length}/${dataset.items.length} recorded, ${Object.keys(refusals).length} refused, ${Object.keys(errors).length} failed`);
  },
});

// Answers from the existing file are in stored form; anything recorded now is in API form. Both pack the same way.
await save();

console.log(`\n${path.relative(repoRoot, file)}: ${Object.keys(answers).length} items, ${Object.keys(refusals).length} refused, ${Object.keys(errors).length} failed, model ${servedBy}`);
console.log(`tokens: ${usage.input_tokens.toLocaleString('en-US')} in, cost so far $${usage.cost.toFixed(4)}`);
if (outOfCredits.signal.aborted) {
  console.log('Stopped: the account is out of credits. Add credits and run this again; it resumes here.');
  process.exit(3);
}
if (Object.keys(errors).length) {
  console.log('failures (re-run to retry):');
  for (const [id, message] of Object.entries(errors).slice(0, 5)) console.log(`  ${id}: ${message}`);
  process.exitCode = 2;
}
