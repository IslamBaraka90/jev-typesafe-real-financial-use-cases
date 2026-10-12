// The head-to-head across every decision model. Accuracy is counted only on the items every model in
// a group answered and had graded, so a model that refused or failed the hard items is not rewarded
// for it; coverage is reported beside it. Text demos and image demos are separate groups, because only
// some models take images.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { wilson } from '../../demos/lib/metrics.js';
import { MODELS, modelsFor } from '../../demos/lib/models.js';
import { repoRoot } from './dataset.js';
import { evaluateRun } from './scoreboard.js';

const percentile = (sorted, share) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))] : null);

async function sample(modelId, demoIds) {
  try {
    const file = JSON.parse(await readFile(path.join(repoRoot, 'benchmarks', 'speed', `${modelId}.json`), 'utf8'));
    return Object.entries(file.latencyMs ?? {}).filter(([demoId]) => demoIds.includes(demoId)).flatMap(([, timings]) => Object.values(timings));
  } catch {
    return [];
  }
}

/** Every model's grades on one demo, by item id: `{ modelId: Map(itemId → agree) }`. */
async function gradesByModel(demo) {
  const out = {};
  for (const model of modelsFor(demo)) {
    const run = await evaluateRun(demo, model.id);
    out[model.id] = { grades: new Map(run.grades.map((grade) => [grade.id, grade.agree])), fixtures: run.fixtures, items: run.dataset.items.length };
  }
  return out;
}

/**
 * The leaderboard for one group of demos. A model enters a group only if it has a recording for every
 * demo in it; the items compared are those every entered model has a grade for.
 */
export async function leaderboard(demos, { label }) {
  const perDemo = [];
  for (const demo of demos) perDemo.push({ demo, models: await gradesByModel(demo) });

  const entered = MODELS.filter((model) => perDemo.every(({ models }) => models[model.id]?.fixtures?.answers && Object.keys(models[model.id].fixtures.answers).length));
  const stats = Object.fromEntries(entered.map((model) => [model.id, { right: 0, graded: 0, wins: 0, answered: 0, refused: 0, items: 0, cost: 0, tokens: 0, latencies: [] }]));

  let commonItems = 0;
  for (const { models } of perDemo) {
    const common = [...(models[entered[0]?.id]?.grades.keys() ?? [])].filter((id) => entered.every((model) => models[model.id].grades.has(id)));
    commonItems += common.length;
    const shares = {};
    for (const model of entered) {
      const entry = models[model.id];
      const right = common.filter((id) => entry.grades.get(id)).length;
      const stat = stats[model.id];
      stat.right += right;
      stat.graded += common.length;
      stat.answered += Object.keys(entry.fixtures.answers ?? {}).length;
      stat.refused += Object.keys(entry.fixtures.refusals ?? {}).length;
      stat.items += entry.items;
      stat.cost += entry.fixtures.usage?.cost ?? 0;
      stat.tokens += entry.fixtures.usage?.input_tokens ?? 0;
      stat.latencies.push(...Object.values(entry.fixtures.latencyMs ?? {}));
      shares[model.id] = common.length ? right / common.length : 0;
    }
    // A demo is won by the model with the best share of the common items; a tie is shared.
    const best = Math.max(...Object.values(shares));
    if (common.length) for (const model of entered) if (shares[model.id] === best) stats[model.id].wins += 1;
  }

  const rows = [];
  for (const model of entered) {
    const stat = stats[model.id];
    let latencies = stat.latencies;
    let sampled = false;
    if (!latencies.length) {
      latencies = await sample(model.id, demos.map((demo) => demo.id));
      sampled = latencies.length > 0;
    }
    const sorted = [...latencies].sort((a, b) => a - b);
    const interval = wilson(stat.right, stat.graded);
    rows.push({
      id: model.id,
      label: model.label,
      maker: model.maker,
      accuracy: stat.graded ? stat.right / stat.graded : null,
      interval,
      right: stat.right,
      graded: stat.graded,
      wins: stat.wins,
      coverage: stat.items ? stat.answered / stat.items : null,
      refused: stat.refused,
      speed: sorted.length ? { p50: percentile(sorted, 0.5), p95: percentile(sorted, 0.95), n: sorted.length, sampled } : null,
      // OpenRouter reports what each call cost; Jev's and GPT-6 Luna's recordings kept tokens only.
      costPer1k: stat.cost && stat.answered ? (stat.cost / stat.answered) * 1000 : null,
      tokensPerItem: stat.answered ? Math.round(stat.tokens / stat.answered) : null,
    });
  }
  rows.sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0));
  return { label, demos: demos.length, commonItems, models: rows, excluded: MODELS.filter((model) => !entered.includes(model)).map((model) => ({ id: model.id, label: model.label, reason: model.unsupported ?? (demos.some((demo) => !modelsFor(demo).includes(model)) ? 'Does not take images.' : 'Not fully recorded yet.') })) };
}
