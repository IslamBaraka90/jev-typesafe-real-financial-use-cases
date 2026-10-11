// Supplier invoices drawn as images, checked against the vendor master before payment. The classic
// payment fraud is an invoice that looks right but asks for the money to go to a new bank account; the
// rest of the planted problems are a total that is not the sum of its lines, and a bill above the
// approved purchase order.

import { createRandom, addDays } from './lib/random.js';
import { merchantName, streetAddress, cityName } from './lib/names.js';
import { round } from './lib/money.js';
import { invoice } from './lib/draw.js';

export const SEED = 4104;
const TAX_RATE = 5;
const PROBLEMS = ['BANK_CHANGED', 'TOTAL_WRONG', 'OVER_PO', 'NONE'];
const SERVICES = [['Consulting hours', 145], ['Server hosting (monthly)', 820], ['Freight, pallet', 210], ['Packaging units', 3.4], ['Maintenance visit', 380], ['Licence seat', 49], ['Cleaning service', 640], ['Printed brochures', 1.15]];
const BANKS = ['Atlas Bank', 'Union Bank', 'Summit Bank', 'Crescent Bank'];

const iban = (random) => `DE${random.int(10, 99)} ${Array.from({ length: 4 }, () => random.int(1000, 9999)).join(' ')} ${random.int(10, 99)}`;

export function generate(seed = SEED) {
  const random = createRandom(seed);
  const items = [];
  const labels = [];
  const artifacts = [];
  const plan = random.shuffle(PROBLEMS.flatMap((problem) => Array(8).fill(problem)));

  plan.forEach((problem, index) => {
    const id = random.id('IV', index + 1, 3);
    const vendor = merchantName(random);
    const onFile = { bankName: random.pick(BANKS), iban: iban(random) };
    const lines = random.sample(SERVICES, random.int(2, 4)).map(([name, price]) => {
      const qty = price < 10 ? random.int(100, 900) : random.int(1, 12);
      return { name, qty, price, amount: round(qty * price) };
    });
    const subtotal = round(lines.reduce((sum, line) => sum + line.amount, 0));
    const tax = round((subtotal * TAX_RATE) / 100);
    const total = problem === 'TOTAL_WRONG' ? round(subtotal + tax + random.pick([100, 250, 900, 1000])) : round(subtotal + tax);
    const poAmount = problem === 'OVER_PO' ? round(total * random.pick([0.7, 0.8, 0.85])) : round(total * random.pick([1, 1.05, 1.2]));
    const remit = problem === 'BANK_CHANGED' ? { bankName: random.pick(BANKS.filter((bank) => bank !== onFile.bankName)), iban: iban(random) } : onFile;
    const date = random.day('2026-08-01', '2026-09-10');
    const number = `INV-${random.int(10000, 99999)}`;
    const image = `images/invoice-bank-change/${id}.png`;
    artifacts.push({
      path: `web/public/${image}`,
      svg: invoice({ vendor, vendorAddress: `${streetAddress(random)}, ${cityName(random)}`, number, date, dueDate: addDays(date, 30), billTo: 'Copperline Group, Accounts Payable', lines, subtotal, tax, taxLabel: `VAT ${TAX_RATE}%`, total, bankName: remit.bankName, iban: remit.iban, reference: number }),
    });
    items.push({ id, image, vendor, invoiceNumber: number, vendorMaster: { name: vendor, bankName: onFile.bankName, iban: onFile.iban }, purchaseOrder: { number: `PO-${random.int(4000, 4999)}`, approvedAmount: poAmount, currency: 'USD' } });
    labels.push({ invoiceId: id, problem });
  });

  return {
    dataset: {
      id: 'invoice-bank-change',
      class: 'synthetic',
      generatedAt: '2026-10-11',
      seed,
      source: 'scripts/generate/invoice-bank-change.js',
      context: { company: 'Copperline Group', vatRatePercent: TAX_RATE, rule: 'Pay only to the bank account in the vendor master, only up to the approved purchase order, and only an invoice whose total is the sum of its lines plus VAT.' },
      items,
    },
    labels,
    artifacts,
  };
}
