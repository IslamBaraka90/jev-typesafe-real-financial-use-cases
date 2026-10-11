// Invoice bank-change check: the vendor master is text, the invoice is a picture, and the fraud is a
// remittance account on the invoice that is not the one on file. The same read also catches a total
// that does not add up and a bill above the approved purchase order.

import { choice, noul, score } from '../lib/questions.js';
import { classJudge, classReport, itemImage, readable } from '../lib/image-demo.js';

const PROBLEMS = ['BANK_CHANGED', 'TOTAL_WRONG', 'OVER_PO', 'NONE'];

// #region demo:state
/** What accounts payable already knows about the vendor and the order; the invoice is the image. */
function buildState(item, context) {
  return {
    task: 'Decide whether the attached supplier invoice can go into the next payment run.',
    company: context.company,
    payment_rule: context.rule,
    vat_rate_percent: context.vatRatePercent,
    vendor_master_record: item.vendorMaster,
    purchase_order: item.purchaseOrder,
    invoice_image: 'Attached. Read the lines, totals and remittance details from the picture.',
  };
}
// #endregion

// #region demo:questions
const questions = {
  problem: choice('What is the main problem with paying this invoice, if any?', {
    BANK_CHANGED: 'The invoice asks for payment to a bank account that is not the one in the vendor master.',
    TOTAL_WRONG: 'The total due is not the sum of the lines plus VAT.',
    OVER_PO: 'The total due is above the approved purchase order amount.',
    NONE: 'The invoice can be paid as it stands.',
  }),
  pay: noul('Should this invoice be released for payment as it stands?', {
    yes: 'Pay it to the account on file.',
    no: 'Hold it for review.',
  }),
  fraud_risk: score('How likely is it that this invoice is an attempt to redirect payment?', ['None', 'Low', 'Possible', 'Likely', 'Almost certain']),
};
// #endregion

// #region demo:evaluate
function evaluate(answers, item) {
  const named = answers.problem.choice;
  const act = answers.pay.noul < 0.5;
  return { named, act, flagged: act, payProbability: answers.pay.noul, fraudRisk: answers.fraud_risk.score, label: `${item.id}: ${act ? 'held' : 'paid'} · ${readable(named)}` };
}
// #endregion

// #region demo:report
function report(results, context = {}) {
  return classReport(results, {
    labels: context.labels,
    labelKey: 'invoiceId',
    classes: PROBLEMS,
    truth: (label) => label.problem,
    act: { label: 'Paid or held', target: 'Bad invoices', should: (label) => label.problem !== 'NONE' },
    noun: 'invoices',
    title: 'Planted problem against the one named',
  });
}
// #endregion

export default {
  id: 'invoice-bank-change',
  title: 'Invoice with changed bank details',
  domain: 'vision',
  value: 'Reads an invoice image against the vendor master and holds the one that quietly asks to be paid somewhere new.',
  tags: ['image', 'invoices', 'payment fraud', 'accounts payable'],
  dataClass: 'synthetic',
  readMinutes: 2,
  view: 'image',
  providers: ['openai'],
  itemLabel: (item) => `${item.id} · ${item.vendor}`,
  data: () => import('./data.json'),
  fixtures: () => import('./fixtures.openai.json'),
  labels: () => import('../../data/synthetic/invoice-bank-change.labels.json'),
  images: itemImage,
  buildState,
  questions,
  evaluate,
  report,
  grade: { labelId: (label) => label.invoiceId, judge: classJudge({ question: 'problem', truth: (label) => label.problem }) },
  explain: {
    data: 'scripts/generate/invoice-bank-change.js',
    state: 'demos/invoice-bank-change/demo.js#demo:state',
    questions: 'demos/invoice-bank-change/demo.js#demo:questions',
    evaluate: 'demos/invoice-bank-change/demo.js#demo:evaluate',
  },
};
