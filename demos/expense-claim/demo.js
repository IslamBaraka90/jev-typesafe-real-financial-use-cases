// Expense claim against its receipt: the claim arrives as text, the receipt as a photo, and the
// decision needs both. Is the amount, the date and the merchant the same on each, and is there
// anything on the bill the policy will not pay for?

import { choice, noul, score } from '../lib/questions.js';
import { classJudge, classReport, itemImage, readable } from '../lib/image-demo.js';

const PROBLEMS = ['AMOUNT_INFLATED', 'DATE_MISMATCH', 'MERCHANT_MISMATCH', 'ALCOHOL', 'NONE'];

// #region demo:state
/** The claim as the employee filed it and the policy; the receipt is the attached image. */
function buildState(item, context) {
  return {
    task: 'Approve or return this expense claim. Compare it with the attached receipt image.',
    company: context.company,
    expense_policy: context.policy,
    claim: item.claim,
    receipt_image: 'Attached. Read the merchant, date, lines and total from the picture.',
  };
}
// #endregion

// #region demo:questions
const questions = {
  problem: choice('What is the main problem with this claim when it is compared with its receipt?', {
    AMOUNT_INFLATED: 'The claimed amount is higher than the receipt total.',
    DATE_MISMATCH: 'The claim date is not the date on the receipt.',
    MERCHANT_MISMATCH: 'The merchant on the claim is not the merchant on the receipt.',
    ALCOHOL: 'The receipt includes alcohol, which the policy does not reimburse.',
    NONE: 'The claim matches the receipt and the policy.',
  }),
  approve: noul('Should this claim be approved as filed?', {
    yes: 'The claim matches its receipt and the policy.',
    no: 'The claim goes back to the employee.',
  }),
  concern: score('How concerning is this claim?', ['None', 'Clerical', 'Needs a word', 'Policy breach', 'Looks deliberate']),
};
// #endregion

// #region demo:evaluate
/** The problem named, and whether the claim is returned. */
function evaluate(answers, item) {
  const named = answers.problem.choice;
  const act = answers.approve.noul < 0.5;
  return { named, act, flagged: act, approveProbability: answers.approve.noul, concern: answers.concern.score, label: `${item.id}: ${act ? 'returned' : 'approved'} · ${readable(named)}` };
}
// #endregion

// #region demo:report
function report(results, context = {}) {
  return classReport(results, {
    labels: context.labels,
    labelKey: 'claimId',
    classes: PROBLEMS,
    truth: (label) => label.problem,
    act: { label: 'Approved or returned', target: 'Bad claims', should: (label) => label.problem !== 'NONE' },
    noun: 'claims',
    title: 'Planted problem against the one named',
  });
}
// #endregion

export default {
  id: 'expense-claim',
  title: 'Expense claim against its receipt photo',
  domain: 'vision',
  value: 'Reads the claim as text and the receipt as a picture, and returns the claims that do not match or break policy.',
  tags: ['image', 'expenses', 'policy', 'receipts'],
  dataClass: 'synthetic',
  readMinutes: 2,
  view: 'image',
  itemLabel: (item) => `${item.id} · ${item.claim.employee}`,
  data: () => import('./data.json'),
  fixtures: () => import('./fixtures.openai.json'),
  labels: () => import('../../data/synthetic/expense-claim.labels.json'),
  images: itemImage,
  buildState,
  questions,
  evaluate,
  report,
  grade: { labelId: (label) => label.claimId, judge: classJudge({ question: 'problem', truth: (label) => label.problem }) },
  explain: {
    data: 'scripts/generate/expense-claim.js',
    state: 'demos/expense-claim/demo.js#demo:state',
    questions: 'demos/expense-claim/demo.js#demo:questions',
    evaluate: 'demos/expense-claim/demo.js#demo:evaluate',
  },
};
