// Package check: the delivery photo behind a damaged-in-transit claim. Three real photographs, because
// that is how many openly licensed ones exist; the demo is small and says so.

import { choice, noul, score } from '../lib/questions.js';
import { classJudge, classReport, itemImage, readable } from '../lib/image-demo.js';

const CONDITIONS = ['INTACT', 'WORN', 'CRUSHED', 'OPENED'];

// #region demo:state
function buildState(item, context) {
  return {
    task: 'A customer has filed a damaged-in-transit claim with the attached delivery photo. Assess the parcel.',
    setting: context.setting,
    photo: 'Attached.',
  };
}
// #endregion

// #region demo:questions
const questions = {
  condition: choice('What condition is the parcel or box in?', {
    INTACT: 'Closed and undamaged.',
    WORN: 'Closed, scuffed or aged, but not broken.',
    CRUSHED: 'Crushed, dented or caved in.',
    OPENED: 'Open, torn open or with its flaps up.',
  }),
  supports_claim: noul('Does the photo support a damaged-in-transit claim?', { yes: 'Pay the claim.', no: 'Ask for more evidence.' }),
  damage: score('How badly is it damaged?', ['None', 'Cosmetic', 'Moderate', 'Severe', 'Destroyed']),
};
// #endregion

// #region demo:evaluate
function evaluate(answers, item) {
  const named = answers.condition.choice;
  const act = answers.supports_claim.noul >= 0.5;
  return { named, act, flagged: act, damage: answers.damage.score, label: `${item.id}: ${act ? 'claim supported' : 'more evidence'} · ${readable(named)}` };
}
// #endregion

// #region demo:report
function report(results, context = {}) {
  return classReport(results, {
    labels: context.labels,
    labelKey: 'photoId',
    classes: CONDITIONS,
    truth: (label) => label.condition,
    act: { label: 'Claim decided', noun: 'decision', target: 'Damaged parcels', should: (label) => ['CRUSHED', 'OPENED'].includes(label.condition) },
    noun: 'photos',
    title: 'Condition against the one named',
  });
}
// #endregion

export default {
  id: 'package-check',
  title: 'Damaged-parcel claim photo',
  domain: 'vision',
  value: 'Looks at the delivery photo behind a damage claim and says whether the parcel is crushed, opened or just worn.',
  tags: ['image', 'photos', 'claims', 'logistics'],
  dataClass: 'cached-real',
  dataLabel: 'real photographs',
  readMinutes: 1,
  view: 'image',
  itemLabel: (item) => `${item.id} · ${item.subject}`,
  data: () => import('./data.json'),
  fixtures: () => import('./fixtures.openai.json'),
  labels: () => import('../../data/synthetic/package-check.labels.json'),
  images: itemImage,
  buildState,
  questions,
  evaluate,
  report,
  grade: { labelId: (label) => label.photoId, judge: classJudge({ question: 'condition', truth: (label) => label.condition }) },
  explain: {
    data: 'scripts/generate/lib/photos.js',
    state: 'demos/package-check/demo.js#demo:state',
    questions: 'demos/package-check/demo.js#demo:questions',
    evaluate: 'demos/package-check/demo.js#demo:evaluate',
  },
};
