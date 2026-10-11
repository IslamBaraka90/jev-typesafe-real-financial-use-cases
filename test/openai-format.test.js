import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEMOS } from '../demos/index.js';
import { choice, noul, score } from '../demos/lib/questions.js';
import { fromOpenAIAnswers, toOpenAIInput, toOpenAIQuestions } from '../demos/lib/openai-format.js';

// The demos speak TypeSafe's shapes; OpenAI's decisions API speaks its own. Everything that grades a
// demo runs on the translated answers, so the translation is what these tests hold steady. The
// response below is a real one, captured from a single probe request.

const QUESTIONS = {
  totals_add_up: noul('Do the totals follow from the quantities and prices?', { yes: 'They add up.', no: 'They do not.' }),
  issue: choice('What is wrong?', { LINE_TOTAL_WRONG: 'A line total is wrong.', TAX_WRONG: 'Tax is wrong.', NONE: 'Nothing.' }),
  severity: score('How serious?', ['None', 'Minor', 'Major']),
};

const REAL_RESPONSE = [
  { type: 'predicate', name: 'totals_add_up', probability: 0 },
  {
    type: 'choice',
    name: 'issue',
    choice: 'LINE_TOTAL_WRONG',
    probabilities: [{ value: 'LINE_TOTAL_WRONG', probability: 0.88 }, { value: 'TAX_WRONG', probability: 0.04 }, { value: 'NONE', probability: 0.08 }],
    confidence: 0.82,
  },
  {
    type: 'score',
    name: 'severity',
    score: 1.57,
    probabilities: [{ value: 0, label: 'None', probability: 0.02 }, { value: 1, label: 'Minor', probability: 0.39 }, { value: 2, label: 'Major', probability: 0.59 }],
    confidence: 0.36,
  },
];

test('questions are sent in OpenAI’s shapes, under their own names', () => {
  const sent = toOpenAIQuestions(QUESTIONS);
  assert.deepEqual(sent.map((question) => [question.name, question.type]), [['totals_add_up', 'predicate'], ['issue', 'choice'], ['severity', 'score']]);

  const issue = sent.find((question) => question.name === 'issue');
  assert.deepEqual(issue.choices, [
    { value: 'LINE_TOTAL_WRONG', description: 'A line total is wrong.' },
    { value: 'TAX_WRONG', description: 'Tax is wrong.' },
    { value: 'NONE', description: 'Nothing.' },
  ]);

  const severity = sent.find((question) => question.name === 'severity');
  assert.deepEqual(severity.levels.map((level) => level.label), ['None', 'Minor', 'Major'], 'levels keep their order, lowest first');

  const predicate = sent.find((question) => question.name === 'totals_add_up');
  assert.match(predicate.instructions, /True means: They add up\. False means: They do not\./, 'a predicate carries both outcomes in its instructions');
});

test('answers come back in the shape every demo already reads', () => {
  const { answers, refusals } = fromOpenAIAnswers(REAL_RESPONSE);
  assert.deepEqual(refusals, []);
  assert.deepEqual(answers.totals_add_up, { type: 'noul', noul: 0 });
  assert.deepEqual(answers.issue, { type: 'choice', choice: 'LINE_TOTAL_WRONG', confidence: 0.82, probabilities: { LINE_TOTAL_WRONG: 0.88, TAX_WRONG: 0.04, NONE: 0.08 } });
  assert.deepEqual(answers.severity, { type: 'score', score: 1.57, confidence: 0.36, probabilities: { 0: 0.02, 1: 0.39, 2: 0.59 } });
});

test('a refusal is reported, not half-graded', () => {
  const { answers, refusals } = fromOpenAIAnswers([{ type: 'refusal', name: 'issue' }, REAL_RESPONSE[0]]);
  assert.deepEqual(refusals, ['issue']);
  assert.equal(answers.issue, undefined);
});

test('text goes as plain input, and images as base64 data URLs beside it', () => {
  assert.equal(toOpenAIInput('hello'), 'hello');
  assert.match(toOpenAIInput({ a: 1 }), /"a": 1/);

  const [message] = toOpenAIInput({ a: 1 }, ['data:image/png;base64,AAAA']);
  assert.equal(message.role, 'user');
  assert.deepEqual(message.content.map((part) => part.type), ['input_text', 'input_image']);
  assert.equal(message.content[1].image_url, 'data:image/png;base64,AAAA');
});

test('every question in all fifty demos translates', () => {
  for (const demo of DEMOS) {
    const sent = toOpenAIQuestions(demo.questions);
    assert.equal(sent.length, Object.keys(demo.questions).length, `${demo.id} lost a question`);
    for (const question of sent) {
      assert.ok(['predicate', 'choice', 'score'].includes(question.type), `${demo.id}.${question.name} has no OpenAI type`);
      assert.ok(question.instructions, `${demo.id}.${question.name} has no instructions`);
    }
  }
});
