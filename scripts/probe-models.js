#!/usr/bin/env node
// Asks every decision model on OpenRouter a set of tiny requests, one capability each, and records
// which it accepts: each question type, each shape of state, and images. Answers are checked for
// shape (a probability, a known option, a score inside the rubric), not for being right. Writes
// benchmarks/capabilities.json and prints a table. Costs well under a cent per model.
//
// Usage: node scripts/probe-models.js [model-id ...]

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../src/config.js';
import { MODELS } from '../demos/lib/models.js';
import { repoRoot } from '../src/services/dataset.js';

const URL = 'https://openrouter.ai/api/alpha/decisions';
const STATE = { task: 'Clean up inactive accounts before the quarterly report.', proposed_tool_call: 'delete_rows(table="customers", where="last_login < 2023-01-01")', context: 'The customers table has 48,210 rows and no backup was taken today.' };
const STATE_TEXT = `Task: ${STATE.task}\nProposed tool call: ${STATE.proposed_tool_call}\nContext: ${STATE.context}`;
const NOUL = { type: 'noul', instructions: 'Is this action safe to run without a human approving it first?', criteria: { true: 'Reversible or low-impact, and within the task.', false: 'Destructive, irreversible, or broader than the task.' } };
const NOUL_BARE = { type: 'noul', instructions: 'Is this action safe to run without a human approving it first?' };
const CHOICE = { type: 'choice', instructions: 'What should happen to this tool call?', criteria: { RUN: 'Run it now.', ASK_HUMAN: 'Ask a human to approve it first.', BLOCK: 'Refuse it outright.' } };
const SCORE = { type: 'score', instructions: 'How risky is this tool call?', criteria: ['Harmless', 'Low', 'Moderate', 'High', 'Severe'] };
const image = `data:image/png;base64,${(await readFile(path.join(repoRoot, 'web/public/images/cheque-check/CQ-001.png'))).toString('base64')}`;
const AMOUNT = { type: 'choice', instructions: 'What amount in figures is written on the cheque in the image?', criteria: { A859: '$859.00', A1200: '$1,200.00', A45: '$45.00', NONE: 'No cheque or amount is visible.' } };

const PROBES = [
  { id: 'noul', label: 'yes/no with criteria', state: STATE_TEXT, questions: { q: NOUL } },
  { id: 'noul-bare', label: 'yes/no, no criteria', state: STATE_TEXT, questions: { q: NOUL_BARE } },
  { id: 'choice', label: 'choice', state: STATE_TEXT, questions: { q: CHOICE } },
  { id: 'score', label: 'score', state: STATE_TEXT, questions: { q: SCORE } },
  { id: 'mixed', label: 'all three in one request', state: STATE_TEXT, questions: { safe: NOUL, action: CHOICE, risk: SCORE } },
  { id: 'state-object', label: 'state as a JSON object', state: STATE, questions: { q: NOUL } },
  { id: 'image', label: 'image (content parts)', state: [{ type: 'text', text: 'A cheque presented for deposit.' }, { type: 'image_url', image_url: { url: image } }], questions: { amount: AMOUNT }, expect: (answers) => answers.amount?.choice === 'A859' },
];

const shapeOk = (question, answer) => {
  if (!answer || answer.type === 'refusal') return false;
  if (question.type === 'noul') return Number.isFinite(answer.noul) && answer.noul >= 0 && answer.noul <= 1;
  if (question.type === 'choice') return Object.keys(question.criteria).includes(answer.choice);
  return Number.isFinite(answer.score) && answer.score >= 0 && answer.score <= question.criteria.length - 1;
};

async function probe(model, test) {
  const started = performance.now();
  const response = await fetch(URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.openrouter.apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'Decision Lab' },
    // Image requests go to the host the recorder pins them to (see `imageHost` in demos/lib/models.js).
    body: JSON.stringify({ model: model.route, ...(test.id === 'image' && model.imageHost ? { provider: { only: [model.imageHost], allow_fallbacks: false } } : {}), state: test.state, questions: test.questions }),
  });
  const latencyMs = Math.round(performance.now() - started);
  const text = await response.text();
  if (!response.ok) return { ok: false, status: response.status, latencyMs, error: (JSON.parse(text)?.error?.message ?? text).slice(0, 200) };
  const data = JSON.parse(text);
  const shaped = Object.entries(test.questions).every(([name, question]) => shapeOk(question, data.answers?.[name]));
  // A model that really sees the picture spends a few hundred tokens on it; one that takes the base64
  // as text spends tens of thousands, and any right answer it gives is a guess.
  const read = test.expect ? test.expect(data.answers ?? {}) && (data.usage?.input_tokens ?? 0) < 4000 : null;
  return { ok: shaped, status: 200, latencyMs, tokens: data.usage?.input_tokens ?? null, host: data.provider ?? null, ...(read === null ? {} : { readImage: read }), ...(shaped ? {} : { error: `answer shape: ${JSON.stringify(data.answers).slice(0, 160)}` }) };
}

if (!config.openrouter.apiKey) {
  console.error('OPENROUTER_API_KEY is not set.');
  process.exit(1);
}
const wanted = process.argv.slice(2);
const models = MODELS.filter((model) => model.via === 'openrouter' && (!wanted.length || wanted.includes(model.id)));
const results = {};
await Promise.all(
  models.map(async (model) => {
    results[model.id] = {};
    for (const test of PROBES) results[model.id][test.id] = await probe(model, test).catch((error) => ({ ok: false, error: error.message }));
  }),
);

const mark = (result) => (result.ok ? (result.readImage === false ? 'ok*' : 'ok') : `✗${result.status ?? ''}`);
console.log(`${'model'.padEnd(22)}${PROBES.map((test) => test.id.padEnd(13)).join('')}`);
for (const model of models) console.log(`${model.id.padEnd(22)}${PROBES.map((test) => mark(results[model.id][test.id]).padEnd(13)).join('')}`);
console.log('\nok* = accepted the image request but did not see the picture: it read the base64 as text, or got the amount wrong.');
for (const model of models) {
  for (const test of PROBES) {
    const result = results[model.id][test.id];
    if (!result.ok) console.log(`${model.id} · ${test.label}: ${result.error}`);
  }
}

const file = path.join(repoRoot, 'benchmarks', 'capabilities.json');
await mkdir(path.dirname(file), { recursive: true });
await writeFile(file, `${JSON.stringify({ probedAt: new Date().toISOString().slice(0, 10), probes: PROBES.map(({ id, label }) => ({ id, label })), results }, null, 1)}\n`);
console.log(`\n${path.relative(repoRoot, file)} written`);
