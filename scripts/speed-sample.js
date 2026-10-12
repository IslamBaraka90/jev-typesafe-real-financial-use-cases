#!/usr/bin/env node
// Times a model on a small sample when its recording kept no latencies: Jev's and GPT-6 Luna's were
// made before the recorder measured speed. Asks the first three items of every demo the model can
// run, one request at a time, and writes only the timings to benchmarks/speed/<model>.json. The
// answers are not kept, so the recorded runs the site replays stay exactly as they were.
//
// Usage: node scripts/speed-sample.js <model> [--per-demo 3]

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../src/config.js';
import { DEMOS } from '../demos/index.js';
import { MODEL_BY_ID, modelsFor } from '../demos/lib/models.js';
import { repoRoot } from '../src/services/dataset.js';
import { askModel, askOpenAI, askOpenRouter, runDemo } from '../src/services/demo-runner.js';

const [modelId, ...flags] = process.argv.slice(2);
const model = MODEL_BY_ID[modelId];
if (!model) {
  console.error(`Usage: node scripts/speed-sample.js <model> [--per-demo 3]. Models: ${Object.keys(MODEL_BY_ID).join(', ')}`);
  process.exit(1);
}
const perDemo = Number(flags[flags.indexOf('--per-demo') + 1]) || 3;

let ask;
if (model.via === 'typesafe') {
  const { typesafe } = await import('../src/lib/typesafe.js');
  ask = (request) => askModel(typesafe, request);
} else if (model.via === 'openai') {
  const { openai, openaiModel } = await import('../src/lib/openai.js');
  const client = openai();
  ask = (request) => askOpenAI(client, { ...request, model: openaiModel() });
} else {
  ask = (request) => askOpenRouter({ ...request, apiKey: config.openrouter.apiKey, route: model.route, stateAsText: model.stateAsText });
}

const latencyMs = {};
let served = null;
for (const demo of DEMOS.filter((entry) => modelsFor(entry).includes(model))) {
  const { dataset } = await import('../src/services/dataset.js').then(async ({ loadDataset }) => ({ dataset: await loadDataset(demo.id) }));
  const items = dataset.items.slice(0, perDemo).map((item) => item.id);
  await runDemo(demo, {
    dataset,
    items,
    ask: async (request) => {
      const response = await ask(request);
      served = response.model ?? served;
      latencyMs[demo.id] ??= {};
      latencyMs[demo.id][request.item.id] = response.latencyMs;
      return response;
    },
  });
  process.stdout.write(`\r  ${Object.keys(latencyMs).length} demos timed`);
}

const file = path.join(repoRoot, 'benchmarks', 'speed', `${modelId}.json`);
await mkdir(path.dirname(file), { recursive: true });
await writeFile(file, `${JSON.stringify({ model: modelId, served, sampledAt: new Date().toISOString().slice(0, 10), method: `first ${perDemo} items of each demo, one request at a time`, latencyMs }, null, 1)}\n`);
console.log(`\n${path.relative(repoRoot, file)} written`);
