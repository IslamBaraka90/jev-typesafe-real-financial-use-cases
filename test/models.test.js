import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { ALL_DEMOS, DEMOS, findDemo } from '../demos/index.js';
import { choice, noul, score } from '../demos/lib/questions.js';
import { defaultModel, MODEL_BY_ID, MODELS, modelsFor } from '../demos/lib/models.js';
import { packAnswers, unpackAnswers, unpackFixtures } from '../demos/lib/packed.js';
import { repoRoot } from '../src/services/dataset.js';
import { toOpenRouterQuestions, toOpenRouterState } from '../src/services/demo-runner.js';

// The registry of decision models, the packed recording format, and the request OpenRouter is sent.
// The answer below is a real one from liquid/d1, captured from a probe.

const QUESTIONS = {
  totals_add_up: noul('Do the totals follow from the quantities and prices?', { yes: 'They add up.', no: 'They do not.' }),
  issue: choice('What is wrong?', { LINE_TOTAL_WRONG: 'A line total is wrong.', TAX_WRONG: 'Tax is wrong.', NONE: 'Nothing.' }),
  severity: score('How serious?', ['None', 'Minor', 'Major']),
};

const REAL_ANSWERS = {
  totals_add_up: { type: 'noul', noul: 0.1403362512877889 },
  issue: { type: 'choice', choice: 'LINE_TOTAL_WRONG', probabilities: { LINE_TOTAL_WRONG: 0.9957788719133198, TAX_WRONG: 0.0026274805657523883, NONE: 0.0015936475209279192 }, confidence: 0.9936683078699797 },
  severity: { type: 'score', score: 0.9790096095465883, legend: { 0: 'None', 1: 'Minor', 2: 'Major' }, probabilities: { 0: 0.17863691183565195, 1: 0.6637165667821078, 2: 0.15764652138224028 }, confidence: 0.4955748501731616 },
};

test('model ids are unique, and Jev stays the default for text demos', () => {
  assert.equal(new Set(MODELS.map((model) => model.id)).size, MODELS.length);
  for (const model of MODELS) if (model.via === 'openrouter') assert.ok(model.route, `${model.id} has no OpenRouter route`);
  const text = DEMOS.find((demo) => !demo.images);
  const image = DEMOS.find((demo) => demo.images);
  assert.equal(defaultModel(text), 'jev');
  assert.ok(modelsFor(image).every((model) => model.images), 'an image demo is only offered to models that read images');
  assert.ok(!modelsFor(text).some((model) => model.unsupported), 'a model that cannot take the questions is never offered');
});

test('a packed answer unpacks to the same decision, rounded to three places', () => {
  const row = packAnswers(REAL_ANSWERS, QUESTIONS);
  assert.deepEqual(row, [0.14, [0, 0.994, 0.996, 0.003, 0.002], [0.979, 0.496, 0.179, 0.664, 0.158]]);
  const back = unpackAnswers(row, QUESTIONS);
  assert.equal(back.issue.choice, 'LINE_TOTAL_WRONG');
  assert.deepEqual(back.severity.probabilities, { 0: 0.179, 1: 0.664, 2: 0.158 });
  assert.equal(back.totals_add_up.noul, 0.14);
  assert.deepEqual(unpackFixtures({ answers: { a: 1 } }, QUESTIONS), { answers: { a: 1 } }, 'an ordinary file passes through');
});

test('OpenRouter is sent true and false outcomes, and pictures as content parts', () => {
  const sent = toOpenRouterQuestions(QUESTIONS);
  assert.deepEqual(sent.totals_add_up.criteria, { true: 'They add up.', false: 'They do not.' });
  assert.deepEqual(sent.issue, QUESTIONS.issue, 'choice and score questions go as they are');
  assert.deepEqual(toOpenRouterState({ a: 1 }), { a: 1 });
  const parts = toOpenRouterState({ a: 1 }, ['data:image/png;base64,AAAA']);
  assert.deepEqual(parts.map((part) => part.type), ['text', 'image_url']);
  assert.equal(parts[1].image_url.url, 'data:image/png;base64,AAAA');
});

test('every recording names a known model, matches its demo, and covers only items that exist', async () => {
  for (const demo of ALL_DEMOS) {
    const folder = path.join(repoRoot, 'demos', demo.id);
    const data = JSON.parse(await readFile(path.join(folder, 'data.json'), 'utf8'));
    const ids = new Set(data.items.map((item) => item.id));
    for (const name of (await readdir(folder)).filter((file) => /^fixtures\.[^.]+\.json$/.test(file))) {
      const modelId = name.slice('fixtures.'.length, -'.json'.length);
      assert.ok(MODEL_BY_ID[modelId], `${demo.id}/${name} names no known model`);
      assert.ok(modelsFor(demo).includes(MODEL_BY_ID[modelId]), `${demo.id} was recorded on ${modelId}, which it cannot run on`);
      const file = unpackFixtures(JSON.parse(await readFile(path.join(folder, name), 'utf8')), findDemo(demo.id).questions);
      for (const [id, answers] of Object.entries(file.answers)) {
        assert.ok(ids.has(id), `${demo.id}/${name} answers unknown item ${id}`);
        assert.deepEqual(Object.keys(answers).sort(), Object.keys(demo.questions).sort(), `${demo.id}/${name} ${id} does not match the questions`);
      }
    }
  }
});
