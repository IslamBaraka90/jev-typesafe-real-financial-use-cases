// Receipt check: read a photographed till receipt and say whether its arithmetic holds — every line
// amount, the subtotal and the tax. The numbers are only in the picture.

import { choice, noul, score } from '../lib/questions.js';
import { classJudge, classReport, itemImage, readable } from '../lib/image-demo.js';

const ISSUES = ['LINE_TOTAL', 'SUBTOTAL', 'TAX', 'NONE'];

// #region demo:state
/** The task and the tax rate. The receipt itself is attached as an image, not written out. */
function buildState(item, context) {
  return {
    task: 'Check the arithmetic of the attached till receipt before it is filed as an expense.',
    receipt_image: 'Attached. Read every number from the picture.',
    expected_sales_tax_percent: context.taxRatePercent,
    currency: context.currency,
  };
}
// #endregion

// #region demo:questions
const questions = {
  issue: choice('Which arithmetic problem, if any, does the receipt in the image have?', {
    LINE_TOTAL: 'A line amount is not its quantity times its unit price.',
    SUBTOTAL: 'The subtotal is not the sum of the line amounts.',
    TAX: 'The tax is not the expected rate applied to the subtotal.',
    NONE: 'Every line, the subtotal, the tax and the total agree.',
  }),
  adds_up: noul('Does every number on the receipt follow arithmetically from the ones above it?', {
    yes: 'The receipt is internally consistent.',
    no: 'At least one printed number is wrong.',
  }),
  severity: score('How much would filing this receipt as printed misstate the expense?', ['Not at all', 'Pennies', 'A few dollars', 'Noticeably', 'Badly']),
};
// #endregion

// #region demo:evaluate
/** The problem named, and whether the receipt goes back to the employee. */
function evaluate(answers, item) {
  const named = answers.issue.choice;
  const act = named !== 'NONE' || answers.adds_up.noul < 0.5;
  return { named, act, flagged: act, addsUp: answers.adds_up.noul, severity: answers.severity.score, label: `${item.id}: ${act ? 'returned' : 'filed'} · ${readable(named)}` };
}
// #endregion

// #region demo:report
function report(results, context = {}) {
  return classReport(results, {
    labels: context.labels,
    labelKey: 'receiptId',
    classes: ISSUES,
    truth: (label) => label.issue,
    act: { label: 'Returned or filed', target: 'Wrong receipts', should: (label) => label.issue !== 'NONE' },
    noun: 'receipts',
    title: 'Planted error against the one named',
  });
}
// #endregion

export default {
  id: 'receipt-check',
  title: 'Receipt arithmetic, read from the photo',
  domain: 'vision',
  value: 'Reads a till receipt from its picture and finds the line, subtotal or tax that does not add up.',
  tags: ['image', 'receipts', 'expenses', 'ocr'],
  dataClass: 'synthetic',
  readMinutes: 2,
  view: 'image',
  providers: ['openai'],
  itemLabel: (item) => `${item.id} · ${item.merchant}`,
  data: () => import('./data.json'),
  fixtures: () => import('./fixtures.openai.json'),
  labels: () => import('../../data/synthetic/receipt-check.labels.json'),
  images: itemImage,
  buildState,
  questions,
  evaluate,
  report,
  grade: { labelId: (label) => label.receiptId, judge: classJudge({ question: 'issue', truth: (label) => label.issue }) },
  explain: {
    data: 'scripts/generate/receipt-check.js',
    state: 'demos/receipt-check/demo.js#demo:state',
    questions: 'demos/receipt-check/demo.js#demo:questions',
    evaluate: 'demos/receipt-check/demo.js#demo:evaluate',
  },
};
