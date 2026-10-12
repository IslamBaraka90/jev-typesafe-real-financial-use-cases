// Chart trend: a sixty-day price chart with no name and no dates, and one question — up, down or
// sideways? The charts are real prices, and the answer is what the closes actually did.

import { choice, noul, score } from '../lib/questions.js';
import { classJudge, classReport, itemImage, readable } from '../lib/image-demo.js';

const TRENDS = ['UP', 'DOWN', 'SIDEWAYS'];

// #region demo:state
/** Only the task and the window length. The chart is the attached image, unnamed and undated. */
function buildState(item, context) {
  return {
    task: 'Describe the trend of the attached price chart from its first close to its last.',
    window_trading_days: context.window,
    definitions: ['up: the last close is more than 8% above the first', 'down: the last close is more than 8% below the first', 'sideways: the last close is within 3% of the first'],
    chart_image: 'Attached. A daily closing-price line with a price scale on the right.',
  };
}
// #endregion

// #region demo:questions
const questions = {
  trend: choice('Over the whole chart, which way did the price go?', {
    UP: 'The last close is clearly above the first: an uptrend.',
    DOWN: 'The last close is clearly below the first: a downtrend.',
    SIDEWAYS: 'The last close is close to the first: a range, whatever happened in between.',
  }),
  ended_higher: noul('Is the last close higher than the first close?', { yes: 'It ended higher.', no: 'It ended at or below where it started.' }),
  strength: score('How strong is the move from first close to last?', ['Flat', 'Slight', 'Clear', 'Strong', 'Extreme']),
};
// #endregion

// #region demo:evaluate
function evaluate(answers, item) {
  const named = answers.trend.choice;
  return { named, act: answers.ended_higher.noul >= 0.5, flagged: named !== 'SIDEWAYS', strength: answers.strength.score, label: `${item.id}: ${readable(named)}` };
}
// #endregion

// #region demo:report
function report(results, context = {}) {
  return classReport(results, {
    labels: context.labels,
    labelKey: 'chartId',
    classes: TRENDS,
    truth: (label) => label.trend,
    act: { label: 'Ended higher or lower', noun: 'direction', target: 'Higher endings', should: (label) => label.changePercent > 0 },
    noun: 'charts',
    title: 'Real trend against the one named',
  });
}
// #endregion

export default {
  id: 'chart-trend',
  title: 'Chart trend: up, down or sideways',
  domain: 'vision',
  value: 'Looks at an unnamed sixty-day price chart and says which way it went, graded against the real closes.',
  tags: ['image', 'charts', 'trend', 'real prices'],
  dataClass: 'cached-real',
  readMinutes: 2,
  view: 'image',
  itemLabel: (item) => `${item.id} · ${item.symbol}`,
  data: () => import('./data.json'),
  fixtures: () => import('./fixtures.openai.json'),
  labels: () => import('../../data/synthetic/chart-trend.labels.json'),
  images: itemImage,
  buildState,
  questions,
  evaluate,
  report,
  grade: { labelId: (label) => label.chartId, judge: classJudge({ question: 'trend', truth: (label) => label.trend }) },
  explain: {
    data: 'scripts/generate/chart-trend.js',
    state: 'demos/chart-trend/demo.js#demo:state',
    questions: 'demos/chart-trend/demo.js#demo:questions',
    evaluate: 'demos/chart-trend/demo.js#demo:evaluate',
  },
};
