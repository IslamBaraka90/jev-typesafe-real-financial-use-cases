#!/usr/bin/env node
// Records a demo's answers from a live decision model and writes them beside the demo, which is what
// the deployed site replays. This is the only paid step in the project.
//
// Usage: node scripts/record-demo.js <slug> [--provider jev|openai] [--items L-0001,L-0002] [--force] [--dry-run]
//
// Jev's answers go to demos/<slug>/fixtures.json, as they always have; OpenAI's go to
// fixtures.openai.json beside it. Recording one never touches the other.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../src/config.js';
import { findDemo } from '../demos/index.js';
import { loadDataset, repoRoot } from '../src/services/dataset.js';
import { compactAnswers } from '../demos/lib/answers.js';
import { askModel, askOpenAI, defaultProvider, fixturesFile, loadFixtures, PROVIDERS, runDemo } from '../src/services/demo-runner.js';

const [slug, ...flags] = process.argv.slice(2);
const has = (flag) => flags.includes(flag);
const value = (flag) => {
  const found = flags.find((entry) => entry.startsWith(`${flag}=`)) ?? (flags.includes(flag) ? flags[flags.indexOf(flag) + 1] : null);
  return found?.startsWith(`${flag}=`) ? found.slice(flag.length + 1) : found;
};

if (!slug) {
  console.error('Usage: node scripts/record-demo.js <slug> [--provider jev|openai] [--items a,b] [--force] [--dry-run]');
  process.exit(1);
}

const demo = findDemo(slug);
if (!demo) {
  console.error(`No demo called "${slug}".`);
  process.exit(1);
}

const provider = value('--provider') ?? defaultProvider(demo);
if (!PROVIDERS.includes(provider)) {
  console.error(`Unknown provider "${provider}". Use one of: ${PROVIDERS.join(', ')}.`);
  process.exit(1);
}
if (demo.providers && !demo.providers.includes(provider)) {
  console.error(`${slug} runs on ${demo.providers.join(', ')} only — it sends images, which ${provider} does not accept.`);
  process.exit(1);
}
if (provider === 'jev' && !config.typesafe.apiKey) {
  console.error('TYPESAFE_API_KEY is not set. Recording needs the live API; the site itself never calls it.');
  process.exit(1);
}
if (provider === 'openai' && !config.openai.apiKey) {
  console.error('OPENAI_API_KEY is not set. Recording needs the live API; the site itself never calls it.');
  process.exit(1);
}

const dataset = await loadDataset(slug);
const existing = await loadFixtures(slug, provider);
const wanted = value('--items')?.split(',').map((id) => id.trim()).filter(Boolean) ?? null;
const force = has('--force');

const todo = dataset.items
  .filter((item) => !wanted || wanted.includes(item.id))
  .filter((item) => force || !(existing.answers?.[item.id] || existing.refusals?.[item.id]))
  .map((item) => item.id);

if (todo.length === 0) {
  console.log(`Nothing to record: ${slug} already has ${provider} answers for every item. Use --force to re-record.`);
  process.exit(0);
}

console.log(`${slug}: recording ${todo.length} of ${dataset.items.length} items on ${provider}, ${Object.keys(demo.questions).length} questions each.`);
if (has('--dry-run')) {
  console.log('Dry run, no requests sent. Items:', todo.join(', '));
  process.exit(0);
}

let ask;
if (provider === 'jev') {
  const { typesafe } = await import('../src/lib/typesafe.js');
  ask = (request) => askModel(typesafe, request);
} else {
  const { openai, openaiModel } = await import('../src/lib/openai.js');
  const client = openai();
  ask = (request) => askOpenAI(client, { ...request, model: openaiModel() });
}

const answers = { ...(existing.answers ?? {}) };
const refusals = { ...(existing.refusals ?? {}) };
let inputTokens = 0;
let outputTokens = 0;
let model = existing.model ?? null;

await runDemo(demo, {
  dataset,
  items: todo,
  ask,
  onItem: (result) => {
    if (result.answers) {
      answers[result.item.id] = compactAnswers(result.answers, demo.questions);
      delete refusals[result.item.id];
    } else if (result.refusals?.length) {
      refusals[result.item.id] = result.refusals;
      delete answers[result.item.id];
    }
    inputTokens += result.usage?.input_tokens ?? 0;
    outputTokens += result.usage?.output_tokens ?? 0;
    model = result.model ?? model;
    process.stdout.write(`\r  ${Object.keys(answers).length}/${dataset.items.length} recorded, ${Object.keys(refusals).length} refused`);
  },
});

const ordered = (map) => Object.fromEntries(dataset.items.filter((item) => map[item.id]).map((item) => [item.id, map[item.id]]));
const file = fixturesFile(slug, provider);
await mkdir(path.dirname(file), { recursive: true });

const record = {
  demo: slug,
  provider,
  model,
  recordedAt: new Date().toISOString().slice(0, 10),
  source: 'scripts/record-demo.js',
  // Usage of this recording session, kept so the cost of a run can be read off the file.
  usage: { input_tokens: (existing.usage?.input_tokens ?? 0) + inputTokens, output_tokens: (existing.usage?.output_tokens ?? 0) + outputTokens },
  answers: ordered(answers),
};
if (Object.keys(refusals).length) record.refusals = ordered(refusals);
await writeFile(file, `${JSON.stringify(record, null, 2)}\n`);

console.log(`\n${path.relative(repoRoot, file)}: ${Object.keys(record.answers).length} items, ${Object.keys(refusals).length} refused, model ${model}`);
console.log(`tokens: ${inputTokens.toLocaleString('en-US')} in, ${outputTokens.toLocaleString('en-US')} out`);
