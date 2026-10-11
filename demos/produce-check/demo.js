// Produce check: real photographs of fruit and bread at goods-in. Fresh, rotten or mouldy, and does
// the pallet go back to the supplier? The photographs are openly licensed and credited on the page.

import { choice, noul, score } from '../lib/questions.js';
import { classJudge, classReport, itemImage, readable } from '../lib/image-demo.js';

const CONDITIONS = ['FRESH', 'ROTTEN', 'MOULDY'];

// #region demo:state
/** The inspection rule and what the photo is of. */
function buildState(item, context) {
  return {
    task: 'Inspect the attached photo of incoming stock and record its condition.',
    setting: context.setting,
    product: item.subject,
    photo: 'Attached.',
  };
}
// #endregion

// #region demo:questions
const questions = {
  condition: choice('What condition is the produce in the photo in?', {
    FRESH: 'Fresh or ripe, fit to sell.',
    ROTTEN: 'Rotten, bruised through, or blackened.',
    MOULDY: 'Visible mould on the surface.',
  }),
  reject: noul('Should this stock be rejected at goods-in?', { yes: 'Reject it.', no: 'Accept it.' }),
  spoilage: score('How far gone is it?', ['Perfect', 'Ripe', 'Past its best', 'Spoiled', 'Inedible']),
};
// #endregion

// #region demo:evaluate
function evaluate(answers, item) {
  const named = answers.condition.choice;
  const act = answers.reject.noul >= 0.5;
  return { named, act, flagged: act, rejectProbability: answers.reject.noul, spoilage: answers.spoilage.score, label: `${item.id}: ${act ? 'rejected' : 'accepted'} · ${readable(named)}` };
}
// #endregion

// #region demo:report
function report(results, context = {}) {
  return classReport(results, {
    labels: context.labels,
    labelKey: 'photoId',
    classes: CONDITIONS,
    truth: (label) => label.condition,
    act: { label: 'Accepted or rejected', target: 'Spoiled stock', should: (label) => label.condition !== 'FRESH' },
    noun: 'photos',
    title: 'Condition against the one named',
  });
}
// #endregion

export default {
  id: 'produce-check',
  title: 'Fresh or spoiled: produce at goods-in',
  domain: 'vision',
  value: 'Looks at a real photo of fruit or bread and decides whether the stock is fresh, rotten or mouldy.',
  tags: ['image', 'photos', 'quality control', 'inventory'],
  dataClass: 'cached-real',
  dataLabel: 'real photographs',
  readMinutes: 1,
  view: 'image',
  providers: ['openai'],
  itemLabel: (item) => `${item.id} · ${item.subject}`,
  data: () => import('./data.json'),
  fixtures: () => import('./fixtures.openai.json'),
  labels: () => import('../../data/synthetic/produce-check.labels.json'),
  images: itemImage,
  buildState,
  questions,
  evaluate,
  report,
  grade: { labelId: (label) => label.photoId, judge: classJudge({ question: 'condition', truth: (label) => label.condition }) },
  explain: {
    data: 'scripts/generate/lib/photos.js',
    state: 'demos/produce-check/demo.js#demo:state',
    questions: 'demos/produce-check/demo.js#demo:questions',
    evaluate: 'demos/produce-check/demo.js#demo:evaluate',
  },
};
