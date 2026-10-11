// Misleading chart: column charts from investor material, some drawn honestly from zero and some
// with the axis cut so a small rise looks dramatic. The model has to read the axis, not the bars.

import { choice, noul, score } from '../lib/questions.js';
import { classJudge, classReport, itemImage, readable } from '../lib/image-demo.js';

const SIZES = ['SMALL', 'MEDIUM', 'LARGE'];

// #region demo:state
/** The bands the change is sorted into. The chart is the attached image. */
function buildState(item, context) {
  return {
    task: 'Read the attached column chart from a company presentation and say what it really shows.',
    change_bands: context.bands,
    chart_image: 'Attached. Read the value axis as well as the bars.',
  };
}
// #endregion

// #region demo:questions
const questions = {
  real_change: choice('From the first column to the last, how large is the real change in the value, read off the axis?', {
    SMALL: 'Under 10%.',
    MEDIUM: 'Between 10% and 25%.',
    LARGE: 'Over 25%.',
  }),
  axis_from_zero: noul('Does the value axis start at zero?', { yes: 'The bars are drawn from zero.', no: 'The axis is cut above zero.' }),
  misleading: score('How much does the way it is drawn exaggerate the change?', ['Not at all', 'Slightly', 'Noticeably', 'Heavily', 'Grossly']),
};
// #endregion

// #region demo:evaluate
function evaluate(answers, item) {
  const named = answers.real_change.choice;
  const act = answers.axis_from_zero.noul < 0.5;
  return { named, act, flagged: act, exaggeration: answers.misleading.score, label: `${item.id}: ${readable(named)} change · ${act ? 'cut axis' : 'axis from zero'}` };
}
// #endregion

// #region demo:report
function report(results, context = {}) {
  return classReport(results, {
    labels: context.labels,
    labelKey: 'chartId',
    classes: SIZES,
    truth: (label) => label.size,
    act: { label: 'Axis read', noun: 'axis reading', target: 'Cut axes', should: (label) => label.truncated },
    noun: 'charts',
    title: 'Real change against the change read',
  });
}
// #endregion

export default {
  id: 'misleading-chart',
  title: 'Misleading chart: the cut axis',
  domain: 'vision',
  value: 'Reads the axis of a presentation chart, gives the real size of the change and spots the axis cut to exaggerate it.',
  tags: ['image', 'charts', 'disclosure', 'investor relations'],
  dataClass: 'synthetic',
  readMinutes: 2,
  view: 'image',
  providers: ['openai'],
  itemLabel: (item) => `${item.id} · ${item.company}`,
  data: () => import('./data.json'),
  fixtures: () => import('./fixtures.openai.json'),
  labels: () => import('../../data/synthetic/misleading-chart.labels.json'),
  images: itemImage,
  buildState,
  questions,
  evaluate,
  report,
  grade: { labelId: (label) => label.chartId, judge: classJudge({ question: 'real_change', truth: (label) => label.size }) },
  explain: {
    data: 'scripts/generate/misleading-chart.js',
    state: 'demos/misleading-chart/demo.js#demo:state',
    questions: 'demos/misleading-chart/demo.js#demo:questions',
    evaluate: 'demos/misleading-chart/demo.js#demo:evaluate',
  },
};
