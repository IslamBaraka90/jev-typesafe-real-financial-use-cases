// Cheques drawn as images and presented for deposit on one day. Some are good; the rest carry one
// planted defect a teller is trained to catch: the amount in words disagrees with the figures, the
// signature line is empty, the cheque is more than six months old, or it is dated in the future.

import { createRandom, addDays } from './lib/random.js';
import { personName, companyName, bankName } from './lib/names.js';
import { cheque } from './lib/draw.js';

export const SEED = 4103;
const PRESENTED_ON = '2026-09-15';
const DEFECTS = ['WORDS_FIGURES', 'UNSIGNED', 'STALE', 'POSTDATED', 'NONE'];

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function belowThousand(value) {
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  const parts = [];
  if (hundreds) parts.push(`${ONES[hundreds]} hundred`);
  if (rest >= 20) parts.push(TENS[Math.floor(rest / 10)] + (rest % 10 ? `-${ONES[rest % 10]}` : ''));
  else if (rest) parts.push(ONES[rest]);
  return parts.join(' ');
}

/** 1234.5 → "One thousand two hundred thirty-four and 50/100". */
export function amountInWords(amount) {
  const dollars = Math.floor(amount);
  const cents = Math.round((amount - dollars) * 100);
  const thousands = Math.floor(dollars / 1000);
  const words = [thousands ? `${belowThousand(thousands)} thousand` : '', belowThousand(dollars % 1000)].filter(Boolean).join(' ') || 'zero';
  return `${words[0].toUpperCase()}${words.slice(1)} and ${String(cents).padStart(2, '0')}/100`;
}

const figures = (amount) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function generate(seed = SEED) {
  const random = createRandom(seed);
  const items = [];
  const labels = [];
  const artifacts = [];
  const plan = random.shuffle(DEFECTS.flatMap((defect) => Array(6).fill(defect)));

  plan.forEach((defect, index) => {
    const id = random.id('CQ', index + 1, 3);
    const amount = random.pick([random.int(40, 900), random.int(1000, 9800)]) + random.pick([0, 0, 0.5, 0.25, 0.99, 0.1]);
    const wordsAmount = defect === 'WORDS_FIGURES' ? amount + random.pick([100, 1000, -100, 10, 900]) : amount;
    const date = defect === 'STALE' ? addDays(PRESENTED_ON, -random.int(200, 400))
      : defect === 'POSTDATED' ? addDays(PRESENTED_ON, random.int(10, 60))
        : addDays(PRESENTED_ON, -random.int(1, 60));
    const number = String(random.int(1000, 9999));
    const image = `images/cheque-check/${id}.png`;
    const payee = random.bool(0.5) ? companyName(random) : personName(random);
    artifacts.push({
      path: `web/public/${image}`,
      svg: cheque({ bank: bankName(random), number, date, payee, figures: figures(amount), words: amountInWords(Math.max(1, wordsAmount)), memo: random.pick(['Invoice 2231', 'Rent September', 'Deposit', 'Services', 'Refund']), drawer: personName(random), signed: defect !== 'UNSIGNED', signatureSeed: index + 2 }),
    });
    items.push({ id, image, number, payee, amountInFigures: figures(amount) });
    labels.push({ chequeId: id, defect });
  });

  return {
    dataset: {
      id: 'cheque-check',
      class: 'synthetic',
      generatedAt: '2026-10-11',
      seed,
      source: 'scripts/generate/cheque-check.js',
      context: {
        presentedOn: PRESENTED_ON,
        rules: [
          'The amount in words must agree with the amount in figures.',
          'The cheque must be signed by the drawer.',
          'A cheque dated more than six months before the day it is presented is stale.',
          'A cheque dated after the day it is presented is post-dated and cannot be paid yet.',
        ],
      },
      items,
    },
    labels,
    artifacts,
  };
}
