// "Is this a good time to buy?" — the question every chart gets asked, put to a decision model with
// ninety days of real candles and checked against the twenty days that followed. Half the charts went
// on to rise, so a coin, or a model that always says buy, scores 50%. This demo exists to show that
// number honestly, not to sell a signal.

import { choice, noul, score } from '../lib/questions.js';
import { classJudge, classReport, itemImage, readable } from '../lib/image-demo.js';

const OUTCOMES = ['ROSE', 'FELL'];

// #region demo:state
/** The holding period and the chart. Nothing about what happened next. */
function buildState(item, context) {
  return {
    task: 'Judge, from the attached daily candlestick chart alone, whether today is a good time to buy for a short hold.',
    holding_period_trading_days: context.holdDays,
    chart_window_trading_days: context.window,
    chart_image: 'Attached. Unnamed and undated; the last candle is today.',
  };
}
// #endregion

// #region demo:questions
const questions = {
  next_move: choice(`Over the next 20 trading days, which is more likely for the price?`, {
    ROSE: 'It will close higher than today.',
    FELL: 'It will close lower than today.',
  }),
  buy_now: noul('Is today a good time to buy for a 20-trading-day hold?', { yes: 'Buy now.', no: 'Wait or stay out.' }),
  conviction: score('How much does the chart support the call?', ['No edge', 'Slight', 'Some', 'Clear', 'Strong']),
};
// #endregion

// #region demo:evaluate
function evaluate(answers, item) {
  const named = answers.next_move.choice;
  const act = answers.buy_now.noul >= 0.5;
  return { named, act, flagged: act, buyProbability: answers.buy_now.noul, conviction: answers.conviction.score, label: `${item.id}: ${act ? 'buy' : 'wait'} · expects ${readable(named)}` };
}
// #endregion

// #region demo:report
function report(results, context = {}) {
  return classReport(results, {
    labels: context.labels,
    labelKey: 'chartId',
    classes: OUTCOMES,
    truth: (label) => label.outcome,
    act: { label: 'Bought or waited', noun: 'call', target: 'Rises bought', should: (label) => label.outcome === 'ROSE' },
    noun: 'charts',
    title: 'What happened against what was expected',
  });
}
// #endregion

export default {
  id: 'buy-timing',
  title: 'Is this a good time to buy?',
  domain: 'vision',
  value: 'Asks the buy-or-wait question of ninety days of real candles and grades it against the next twenty days.',
  tags: ['image', 'charts', 'timing', 'real prices'],
  dataClass: 'cached-real',
  readMinutes: 3,
  view: 'image',
  providers: ['openai'],
  caveat: 'Not investment advice. Half the charts rose afterwards, so 50% is what guessing scores.',
  itemLabel: (item) => `${item.id} · ${item.symbol}`,
  data: () => import('./data.json'),
  fixtures: () => import('./fixtures.openai.json'),
  labels: () => import('../../data/synthetic/buy-timing.labels.json'),
  images: itemImage,
  buildState,
  questions,
  evaluate,
  report,
  grade: { labelId: (label) => label.chartId, judge: classJudge({ question: 'next_move', truth: (label) => label.outcome }) },
  explain: {
    data: 'scripts/generate/buy-timing.js',
    state: 'demos/buy-timing/demo.js#demo:state',
    questions: 'demos/buy-timing/demo.js#demo:questions',
    evaluate: 'demos/buy-timing/demo.js#demo:evaluate',
  },
};
