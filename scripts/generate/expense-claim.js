// Expense claims, each with the photographed receipt behind it. The claim is text; the receipt is an
// image. A fifth agree, and the rest carry one planted problem that only shows when the two are read
// together: a claimed amount above the receipt, a different date or merchant, or alcohol on the bill,
// which the policy does not reimburse.

import { createRandom, addDays } from './lib/random.js';
import { personName, streetAddress, cityName } from './lib/names.js';
import { round } from './lib/money.js';
import { receipt } from './lib/draw.js';

export const SEED = 4102;
const TAX_RATE = 8;

const VENUES = [
  { name: 'Cedar Grill', category: 'Client meal', menu: [['Grilled salmon', 24], ['Chicken plate', 18.5], ['Garden salad', 9.75], ['Sparkling water', 3.5], ['Espresso', 3.25]] },
  { name: 'Harbour Bistro', category: 'Client meal', menu: [['Steak frites', 29], ['Pasta of the day', 17], ['Soup', 7.5], ['Lemonade', 4], ['Cheesecake', 8]] },
  { name: 'Station Cafe', category: 'Travel meal', menu: [['Breakfast set', 12.5], ['Croissant', 3.75], ['Latte', 4.6], ['Orange juice', 4.2], ['Bagel', 4.1]] },
  { name: 'Kestrel Office Supply', category: 'Office supplies', menu: [['Printer toner', 64], ['Paper ream', 6.49], ['Folders 20pk', 8.9], ['Label tape', 12.4], ['Pens 12pk', 5.5]] },
  { name: 'Meridian Taxi Co', category: 'Local transport', menu: [['Fare', 23.4], ['Airport surcharge', 6], ['Toll', 4.5], ['Waiting time', 3.2], ['Booking fee', 2]] },
];
const DRINKS = [['House red wine', 9.5], ['Draft beer', 7], ['Gin and tonic', 11]];
const PROBLEMS = ['AMOUNT_INFLATED', 'DATE_MISMATCH', 'MERCHANT_MISMATCH', 'ALCOHOL', 'NONE'];

export function generate(seed = SEED) {
  const random = createRandom(seed);
  const items = [];
  const labels = [];
  const artifacts = [];
  const plan = random.shuffle(PROBLEMS.flatMap((problem) => Array(8).fill(problem)));

  plan.forEach((problem, index) => {
    const id = random.id('EC', index + 1, 3);
    const venue = problem === 'ALCOHOL' ? random.pick(VENUES.slice(0, 2)) : random.pick(VENUES);
    const lines = random.sample(venue.menu, random.int(2, 4)).map(([name, price]) => {
      const qty = venue.category === 'Local transport' ? 1 : random.int(1, 2);
      return { name, qty, price, amount: round(qty * price) };
    });
    if (problem === 'ALCOHOL') {
      const [name, price] = random.pick(DRINKS);
      lines.splice(random.int(0, lines.length), 0, { name, qty: 2, price, amount: round(2 * price) });
    }
    const subtotal = round(lines.reduce((sum, line) => sum + line.amount, 0));
    const tax = round((subtotal * TAX_RATE) / 100);
    const total = round(subtotal + tax);
    const date = random.day('2026-07-01', '2026-08-31');
    const image = `images/expense-claim/${id}.png`;
    artifacts.push({
      path: `web/public/${image}`,
      svg: receipt({ merchant: venue.name, address: `${streetAddress(random)}, ${cityName(random)}`, date, time: `${random.int(7, 22)}:${String(random.int(0, 59)).padStart(2, '0')}`, lines, subtotal, taxLabel: `TAX ${TAX_RATE}%`, tax, total, payment: `VISA **** ${random.int(1000, 9999)}`, footer: 'Customer copy' }),
    });

    const claim = { employee: personName(random), category: venue.category, merchant: venue.name, date, amount: total, currency: 'USD', description: `${venue.category} on ${date}` };
    if (problem === 'AMOUNT_INFLATED') claim.amount = round(total + random.pick([12, 20, 35, 48.5]));
    if (problem === 'DATE_MISMATCH') {
      claim.date = addDays(date, random.pick([-12, -7, 5, 9, 15]));
      claim.description = `${venue.category} on ${claim.date}`;
    }
    if (problem === 'MERCHANT_MISMATCH') claim.merchant = random.pick(VENUES.filter((other) => other.name !== venue.name && other.category === venue.category).map((other) => other.name).concat(['Northwind Catering', 'Lantern Restaurant']));
    items.push({ id, image, claim, receiptMerchant: venue.name, receiptTotal: total });
    labels.push({ claimId: id, problem });
  });

  return {
    dataset: {
      id: 'expense-claim',
      class: 'synthetic',
      generatedAt: '2026-10-11',
      seed,
      source: 'scripts/generate/expense-claim.js',
      context: {
        company: 'Copperline Group',
        policy: [
          'The claimed amount must equal the receipt total.',
          'The claim date must be the date printed on the receipt.',
          'The merchant on the claim must be the merchant on the receipt.',
          'Alcohol is never reimbursed; a receipt with any alcoholic drink on it is returned to the employee.',
        ],
      },
      items,
    },
    labels,
    artifacts,
  };
}
