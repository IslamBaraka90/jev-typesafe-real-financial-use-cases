// Till receipts drawn as images, a quarter of them clean and the rest carrying one planted arithmetic
// error: a line amount that is not quantity times price, a subtotal that is not the sum of the lines,
// or tax at the wrong rate. The model sees only the picture, so it has to read the numbers to check them.

import { createRandom } from './lib/random.js';
import { merchantName, streetAddress, cityName } from './lib/names.js';
import { round } from './lib/money.js';
import { receipt } from './lib/draw.js';

export const SEED = 4101;
export const TAX_RATE = 8;

const PRODUCTS = [
  ['Printer paper A4', 6.49], ['Ballpoint pens 10pk', 3.99], ['Sticky notes', 2.25], ['USB-C cable', 11.9], ['Desk lamp', 24.5],
  ['Coffee beans 1kg', 18.75], ['Milk 2L', 2.89], ['Bottled water 6pk', 4.2], ['Sandwich', 6.5], ['Notebook A5', 4.75],
  ['Batteries AA 8pk', 7.99], ['Stapler', 9.3], ['Envelopes 50pk', 5.6], ['Whiteboard marker', 1.85], ['Paper cups 50pk', 3.4],
];
const ISSUES = ['LINE_TOTAL', 'SUBTOTAL', 'TAX', 'NONE'];

export function generate(seed = SEED) {
  const random = createRandom(seed);
  const items = [];
  const labels = [];
  const artifacts = [];
  const plan = random.shuffle(ISSUES.flatMap((issue) => Array(9).fill(issue)));

  plan.forEach((issue, index) => {
    const id = random.id('RC', index + 1, 3);
    const lines = random.sample(PRODUCTS, random.int(3, 5)).map(([name, price]) => {
      const qty = random.int(1, 4);
      return { name, qty, price, amount: round(qty * price) };
    });
    let planted = null;
    if (issue === 'LINE_TOTAL') {
      const line = random.pick(lines);
      const wrong = round(line.amount + random.pick([1, 2, 5, 10, -1, -2]));
      planted = `${line.name}: printed ${wrong.toFixed(2)}, should be ${line.amount.toFixed(2)}`;
      line.amount = wrong;
    }
    const trueSubtotal = round(lines.reduce((sum, line) => sum + line.amount, 0));
    const subtotal = issue === 'SUBTOTAL' ? round(trueSubtotal + random.pick([3, 5, 10, -4])) : trueSubtotal;
    if (issue === 'SUBTOTAL') planted = `subtotal printed ${subtotal.toFixed(2)}, lines sum to ${trueSubtotal.toFixed(2)}`;
    const rate = issue === 'TAX' ? random.pick([10, 12, 15]) : TAX_RATE;
    if (issue === 'TAX') planted = `tax charged at ${rate}% instead of ${TAX_RATE}%`;
    const tax = round((subtotal * rate) / 100);
    const total = round(subtotal + tax);
    const merchant = merchantName(random);
    const date = random.day('2026-06-01', '2026-08-31');
    const image = `images/receipt-check/${id}.png`;

    artifacts.push({
      path: `web/public/${image}`,
      svg: receipt({
        merchant, address: `${streetAddress(random)}, ${cityName(random)}`, date, time: `${random.int(8, 20)}:${String(random.int(0, 59)).padStart(2, '0')}`,
        lines, subtotal, taxLabel: `SALES TAX ${TAX_RATE}%`, tax, total, payment: `CARD **** ${random.int(1000, 9999)}`, footer: 'Thank you for shopping with us',
      }),
    });
    items.push({ id, image, merchant, date, lineCount: lines.length, printedTotal: total });
    labels.push({ receiptId: id, issue, planted });
  });

  return {
    dataset: {
      id: 'receipt-check',
      class: 'synthetic',
      generatedAt: '2026-10-11',
      seed,
      source: 'scripts/generate/receipt-check.js',
      context: { taxRatePercent: TAX_RATE, currency: 'USD' },
      items,
    },
    labels,
    artifacts,
  };
}
