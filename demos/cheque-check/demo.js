// Cheque check: the four things a teller looks at before taking a cheque — words against figures,
// the signature, and whether the date makes it stale or post-dated on the day it is presented.

import { choice, noul, score } from '../lib/questions.js';
import { classJudge, classReport, itemImage, readable } from '../lib/image-demo.js';

const DEFECTS = ['WORDS_FIGURES', 'UNSIGNED', 'STALE', 'POSTDATED', 'NONE'];

// #region demo:state
/** The day the cheque is presented and the bank's rules. The cheque is the attached image. */
function buildState(item, context) {
  return {
    task: 'A customer is depositing the attached cheque. Decide whether the bank can accept it today.',
    presented_on: context.presentedOn,
    rules: context.rules,
    cheque_image: 'Attached. Read the date, payee, amounts and signature from the picture.',
  };
}
// #endregion

// #region demo:questions
const questions = {
  defect: choice('What defect, if any, stops this cheque being accepted today?', {
    WORDS_FIGURES: 'The amount in words does not agree with the amount in figures.',
    UNSIGNED: 'The signature line is empty.',
    STALE: 'It is dated more than six months before the day it is presented.',
    POSTDATED: 'It is dated after the day it is presented.',
    NONE: 'The cheque is in order.',
  }),
  accept: noul('Can the bank accept this cheque for deposit today?', {
    yes: 'The cheque is in order.',
    no: 'The cheque must be refused or returned.',
  }),
  risk: score('How risky would paying this cheque as it stands be?', ['None', 'Low', 'Moderate', 'High', 'Unacceptable']),
};
// #endregion

// #region demo:evaluate
function evaluate(answers, item) {
  const named = answers.defect.choice;
  const act = answers.accept.noul < 0.5;
  return { named, act, flagged: act, acceptProbability: answers.accept.noul, risk: answers.risk.score, label: `${item.id}: ${act ? 'refused' : 'accepted'} · ${readable(named)}` };
}
// #endregion

// #region demo:report
function report(results, context = {}) {
  return classReport(results, {
    labels: context.labels,
    labelKey: 'chequeId',
    classes: DEFECTS,
    truth: (label) => label.defect,
    act: { label: 'Accepted or refused', target: 'Defective cheques', should: (label) => label.defect !== 'NONE' },
    noun: 'cheques',
    title: 'Planted defect against the one named',
  });
}
// #endregion

export default {
  id: 'cheque-check',
  title: 'Cheque deposit check',
  domain: 'vision',
  value: 'Reads a cheque from its image and refuses the ones with mismatched amounts, no signature, or a date that rules them out.',
  tags: ['image', 'cheques', 'banking', 'deposits'],
  dataClass: 'synthetic',
  readMinutes: 2,
  view: 'image',
  itemLabel: (item) => `${item.id} · ${item.payee}`,
  data: () => import('./data.json'),
  fixtures: () => import('./fixtures.openai.json'),
  labels: () => import('../../data/synthetic/cheque-check.labels.json'),
  images: itemImage,
  buildState,
  questions,
  evaluate,
  report,
  grade: { labelId: (label) => label.chequeId, judge: classJudge({ question: 'defect', truth: (label) => label.defect }) },
  explain: {
    data: 'scripts/generate/cheque-check.js',
    state: 'demos/cheque-check/demo.js#demo:state',
    questions: 'demos/cheque-check/demo.js#demo:questions',
    evaluate: 'demos/cheque-check/demo.js#demo:evaluate',
  },
};
