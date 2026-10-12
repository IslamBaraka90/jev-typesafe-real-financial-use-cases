// Leaf check: a crop-insurance field photo. Healthy, mildew or leaf spot — four real photographs.

import { choice, noul, score } from '../lib/questions.js';
import { classJudge, classReport, itemImage, readable } from '../lib/image-demo.js';

const CONDITIONS = ['HEALTHY', 'MILDEW', 'LEAF_SPOT'];

// #region demo:state
function buildState(item, context) {
  return {
    task: 'Record what the attached field photo shows about the plant’s health.',
    setting: context.setting,
    plant: item.subject,
    photo: 'Attached.',
  };
}
// #endregion

// #region demo:questions
const questions = {
  condition: choice('What does the leaf in the photo show?', {
    HEALTHY: 'A healthy leaf with no sign of disease.',
    MILDEW: 'Mildew: a white or grey powdery or downy growth, or the yellow patches it causes.',
    LEAF_SPOT: 'Leaf spot: distinct round or angular dead spots, often with a darker margin.',
  }),
  diseased: noul('Is the plant diseased?', { yes: 'Disease is visible.', no: 'The leaf is healthy.' }),
  severity: score('How severe is the disease on this leaf?', ['None', 'Trace', 'Moderate', 'Severe', 'Leaf lost']),
};
// #endregion

// #region demo:evaluate
function evaluate(answers, item) {
  const named = answers.condition.choice;
  const act = answers.diseased.noul >= 0.5;
  return { named, act, flagged: act, severity: answers.severity.score, label: `${item.id}: ${readable(named)}` };
}
// #endregion

// #region demo:report
function report(results, context = {}) {
  return classReport(results, {
    labels: context.labels,
    labelKey: 'photoId',
    classes: CONDITIONS,
    truth: (label) => label.condition,
    act: { label: 'Disease called', noun: 'call', target: 'Diseased leaves', should: (label) => label.condition !== 'HEALTHY' },
    noun: 'photos',
    title: 'Condition against the one named',
  });
}
// #endregion

export default {
  id: 'leaf-check',
  title: 'Leaf disease from a field photo',
  domain: 'vision',
  value: 'Looks at a real photo of a leaf and says whether it is healthy or shows mildew or leaf spot.',
  tags: ['image', 'photos', 'agriculture', 'insurance'],
  dataClass: 'cached-real',
  dataLabel: 'real photographs',
  readMinutes: 1,
  view: 'image',
  itemLabel: (item) => `${item.id} · ${item.subject}`,
  data: () => import('./data.json'),
  fixtures: () => import('./fixtures.openai.json'),
  labels: () => import('../../data/synthetic/leaf-check.labels.json'),
  images: itemImage,
  buildState,
  questions,
  evaluate,
  report,
  grade: { labelId: (label) => label.photoId, judge: classJudge({ question: 'condition', truth: (label) => label.condition }) },
  explain: {
    data: 'scripts/generate/lib/photos.js',
    state: 'demos/leaf-check/demo.js#demo:state',
    questions: 'demos/leaf-check/demo.js#demo:questions',
    evaluate: 'demos/leaf-check/demo.js#demo:evaluate',
  },
};
