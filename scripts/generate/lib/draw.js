// SVG drawings for the image demos: receipts, cheques, invoices and price charts. A generator returns
// these as strings in its `artifacts`, and the writer in scripts/generate/index.js renders each one to
// a PNG under web/public/images — the form OpenAI's decisions API accepts. Pure string building, so a
// generator stays a function of its seed.

const MONO = 'Consolas, DejaVu Sans Mono, Courier New, monospace';
const SANS = 'Segoe UI, Arial, Helvetica, sans-serif';
const INK = '#1d1d1f';
const FAINT = '#6b6b70';
const RULE = '#c9c9ce';

export const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
export const money = (value) => value.toFixed(2);

const text = (x, y, value, { size = 15, font = MONO, anchor = 'start', weight = 400, fill = INK } = {}) =>
  `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" fill="${fill}">${escape(value)}</text>`;

const svg = (width, height, body, background = '#ffffff') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${background}"/>${body}</svg>`;

/**
 * A till receipt. `lines` are `{ name, qty, price, amount }`, printed as given: a generator plants a
 * wrong amount by passing one, so the drawing never corrects anything.
 */
export function receipt({ merchant, address, date, time, lines, subtotal, taxLabel, tax, total, payment, footer }) {
  const width = 380;
  const rows = [];
  let y = 46;
  rows.push(text(width / 2, y, merchant, { size: 20, anchor: 'middle', weight: 700 }));
  y += 22;
  rows.push(text(width / 2, y, address, { size: 13, anchor: 'middle', fill: FAINT }));
  y += 20;
  rows.push(text(width / 2, y, `${date}  ${time}`, { size: 13, anchor: 'middle', fill: FAINT }));
  y += 16;
  rows.push(`<line x1="20" y1="${y}" x2="${width - 20}" y2="${y}" stroke="${RULE}" stroke-dasharray="4 3"/>`);
  y += 24;
  for (const line of lines) {
    rows.push(text(24, y, line.name.slice(0, 24)));
    rows.push(text(width - 24, y, money(line.amount), { anchor: 'end' }));
    y += 18;
    rows.push(text(36, y, `${line.qty} x ${money(line.price)}`, { size: 13, fill: FAINT }));
    y += 24;
  }
  rows.push(`<line x1="20" y1="${y - 8}" x2="${width - 20}" y2="${y - 8}" stroke="${RULE}" stroke-dasharray="4 3"/>`);
  y += 12;
  for (const [label, value, weight] of [['SUBTOTAL', subtotal, 400], [taxLabel, tax, 400], ['TOTAL', total, 700]]) {
    rows.push(text(24, y, label, { weight }));
    rows.push(text(width - 24, y, money(value), { anchor: 'end', weight }));
    y += 24;
  }
  y += 6;
  rows.push(text(width / 2, y, payment, { size: 13, anchor: 'middle', fill: FAINT }));
  y += 22;
  rows.push(text(width / 2, y, footer, { size: 13, anchor: 'middle', fill: FAINT }));
  return svg(width, y + 30, rows.join(''), '#fbfaf6');
}

/** A personal cheque. `signed` false leaves the signature line empty. */
export function cheque({ bank, number, date, payee, figures, words, memo, drawer, signed, signatureSeed = 1 }) {
  const width = 760;
  const height = 320;
  const wave = Array.from({ length: 9 }, (_, index) => {
    const x = 520 + index * 22;
    const lift = ((signatureSeed * (index + 3)) % 7) * 3;
    return `${index ? 'Q' : 'M'}${x - 11},${index ? 238 - lift : 250} ${x},${246 - (index % 2 ? 14 + lift : -6)}`;
  }).join(' ');
  const body = [
    `<rect x="8" y="8" width="${width - 16}" height="${height - 16}" rx="8" fill="#eef5ef" stroke="#9db8a2" stroke-width="2"/>`,
    text(32, 48, bank, { font: SANS, size: 18, weight: 700 }),
    text(32, 70, drawer, { font: SANS, size: 13, fill: FAINT }),
    text(width - 32, 48, `No. ${number}`, { font: SANS, size: 14, anchor: 'end' }),
    text(500, 98, 'Date', { font: SANS, size: 12, fill: FAINT }),
    text(545, 98, date, { size: 17 }),
    `<line x1="540" y1="104" x2="${width - 32}" y2="104" stroke="${FAINT}"/>`,
    text(32, 142, 'Pay to the order of', { font: SANS, size: 12, fill: FAINT }),
    text(160, 142, payee, { size: 17 }),
    `<line x1="155" y1="148" x2="560" y2="148" stroke="${FAINT}"/>`,
    `<rect x="590" y="120" width="140" height="34" rx="4" fill="#ffffff" stroke="${FAINT}"/>`,
    text(600, 144, `$ ${figures}`, { size: 17 }),
    text(32, 190, words, { size: 15 }),
    `<line x1="32" y1="196" x2="${width - 32}" y2="196" stroke="${FAINT}"/>`,
    text(width - 32, 190, 'DOLLARS', { font: SANS, size: 12, anchor: 'end', fill: FAINT }),
    text(32, 256, 'Memo', { font: SANS, size: 12, fill: FAINT }),
    text(80, 256, memo, { size: 14 }),
    `<line x1="75" y1="262" x2="360" y2="262" stroke="${FAINT}"/>`,
    signed ? `<path d="${wave}" fill="none" stroke="#1b2f6b" stroke-width="2.4" stroke-linecap="round"/>` : '',
    `<line x1="500" y1="262" x2="${width - 32}" y2="262" stroke="${FAINT}"/>`,
    text(width - 32, 280, 'Authorised signature', { font: SANS, size: 11, anchor: 'end', fill: FAINT }),
    text(32, 300, `${number}   021000089   4471${number}`, { size: 14, fill: FAINT }),
  ];
  return svg(width, height, body.join(''), '#ffffff');
}

/** A supplier invoice with its remittance block. */
export function invoice({ vendor, vendorAddress, number, date, dueDate, billTo, lines, subtotal, tax, taxLabel, total, bankName, iban, reference }) {
  const width = 720;
  const rows = [
    `<rect x="0" y="0" width="${width}" height="8" fill="#2f4b7c"/>`,
    text(40, 60, vendor, { font: SANS, size: 24, weight: 700 }),
    text(40, 84, vendorAddress, { font: SANS, size: 13, fill: FAINT }),
    text(width - 40, 60, 'INVOICE', { font: SANS, size: 24, anchor: 'end', weight: 700, fill: '#2f4b7c' }),
    text(width - 40, 84, `No. ${number}`, { font: SANS, size: 13, anchor: 'end' }),
    text(width - 40, 104, `Date ${date}   Due ${dueDate}`, { font: SANS, size: 13, anchor: 'end' }),
    text(40, 132, 'Bill to', { font: SANS, size: 12, fill: FAINT }),
    text(40, 152, billTo, { font: SANS, size: 15 }),
    `<rect x="40" y="176" width="${width - 80}" height="28" fill="#eef1f6"/>`,
    text(52, 195, 'Description', { font: SANS, size: 13, weight: 700 }),
    text(430, 195, 'Qty', { font: SANS, size: 13, anchor: 'end', weight: 700 }),
    text(540, 195, 'Unit price', { font: SANS, size: 13, anchor: 'end', weight: 700 }),
    text(width - 52, 195, 'Amount', { font: SANS, size: 13, anchor: 'end', weight: 700 }),
  ];
  let y = 228;
  for (const line of lines) {
    rows.push(text(52, y, line.name, { font: SANS, size: 14 }));
    rows.push(text(430, y, line.qty, { font: SANS, size: 14, anchor: 'end' }));
    rows.push(text(540, y, money(line.price), { font: SANS, size: 14, anchor: 'end' }));
    rows.push(text(width - 52, y, money(line.amount), { font: SANS, size: 14, anchor: 'end' }));
    y += 28;
  }
  rows.push(`<line x1="400" y1="${y - 10}" x2="${width - 40}" y2="${y - 10}" stroke="${RULE}"/>`);
  y += 14;
  for (const [label, value, weight] of [['Subtotal', subtotal, 400], [taxLabel, tax, 400], ['Total due (USD)', total, 700]]) {
    rows.push(text(540, y, label, { font: SANS, size: 14, anchor: 'end', weight }));
    rows.push(text(width - 52, y, money(value), { font: SANS, size: 14, anchor: 'end', weight }));
    y += 26;
  }
  y += 18;
  rows.push(`<rect x="40" y="${y}" width="${width - 80}" height="92" rx="6" fill="#f7f7f9" stroke="${RULE}"/>`);
  rows.push(text(56, y + 26, 'Remit payment to', { font: SANS, size: 12, fill: FAINT }));
  rows.push(text(56, y + 50, `${bankName}   IBAN ${iban}`, { font: MONO, size: 15 }));
  rows.push(text(56, y + 74, `Payment reference: ${reference}`, { font: SANS, size: 13 }));
  return svg(width, y + 122, rows.join(''));
}

/** Axis frame shared by the charts: horizontal grid lines with price labels on the right. */
function frame({ width, height, pad, min, max, ticks = 5, format = (value) => value.toFixed(2) }) {
  const parts = [];
  for (let index = 0; index <= ticks; index++) {
    const value = min + ((max - min) * index) / ticks;
    const y = height - pad.bottom - ((height - pad.top - pad.bottom) * index) / ticks;
    parts.push(`<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" stroke="#e4e4e8"/>`);
    parts.push(text(width - pad.right + 8, y + 4, format(value), { font: SANS, size: 12, fill: FAINT }));
  }
  return parts.join('');
}

const scaleY = (value, min, max, height, pad) => height - pad.bottom - ((value - min) / (max - min || 1)) * (height - pad.top - pad.bottom);

/** A closing-price line chart with no name and no dates: only the shape and the price scale. */
export function lineChart({ closes, title }) {
  const width = 720;
  const height = 400;
  const pad = { top: 48, right: 80, bottom: 40, left: 24 };
  const low = Math.min(...closes);
  const high = Math.max(...closes);
  const margin = (high - low) * 0.08 || 1;
  const [min, max] = [low - margin, high + margin];
  const step = (width - pad.left - pad.right) / (closes.length - 1);
  const points = closes.map((close, index) => `${(pad.left + index * step).toFixed(1)},${scaleY(close, min, max, height, pad).toFixed(1)}`).join(' ');
  const body = [
    text(pad.left, 30, title, { font: SANS, size: 16, weight: 700 }),
    frame({ width, height, pad, min, max }),
    `<polyline points="${points}" fill="none" stroke="#2a6fdb" stroke-width="2"/>`,
    text(pad.left, height - 14, `Day 1`, { font: SANS, size: 12, fill: FAINT }),
    text(width - pad.right, height - 14, `Day ${closes.length}`, { font: SANS, size: 12, anchor: 'end', fill: FAINT }),
  ];
  return svg(width, height, body.join(''));
}

/** A daily candlestick chart, again unnamed and undated. */
export function candleChart({ bars, title }) {
  const width = 760;
  const height = 420;
  const pad = { top: 48, right: 80, bottom: 40, left: 20 };
  const low = Math.min(...bars.map((bar) => bar.low));
  const high = Math.max(...bars.map((bar) => bar.high));
  const margin = (high - low) * 0.05 || 1;
  const [min, max] = [low - margin, high + margin];
  const step = (width - pad.left - pad.right) / bars.length;
  const body = bars.map((bar, index) => {
    const x = pad.left + index * step + step / 2;
    const up = bar.close >= bar.open;
    const colour = up ? '#1f8a4c' : '#c8382c';
    const top = scaleY(Math.max(bar.open, bar.close), min, max, height, pad);
    const bottom = scaleY(Math.min(bar.open, bar.close), min, max, height, pad);
    return `<line x1="${x.toFixed(1)}" y1="${scaleY(bar.high, min, max, height, pad).toFixed(1)}" x2="${x.toFixed(1)}" y2="${scaleY(bar.low, min, max, height, pad).toFixed(1)}" stroke="${colour}"/><rect x="${(x - step * 0.35).toFixed(1)}" y="${top.toFixed(1)}" width="${(step * 0.7).toFixed(1)}" height="${Math.max(1, bottom - top).toFixed(1)}" fill="${colour}"/>`;
  });
  return svg(width, height, [text(pad.left, 30, title, { font: SANS, size: 16, weight: 700 }), frame({ width, height, pad, min, max }), ...body,
    text(pad.left, height - 14, 'Oldest', { font: SANS, size: 12, fill: FAINT }),
    text(width - pad.right, height - 14, 'Latest', { font: SANS, size: 12, anchor: 'end', fill: FAINT })].join(''));
}

/** A column chart whose value axis starts at `axisFrom`, which is how a chart is made to mislead. */
export function columnChart({ title, unit, labels, values, axisFrom }) {
  const width = 640;
  const height = 400;
  const pad = { top: 56, right: 84, bottom: 44, left: 32 };
  const top = Math.max(...values) * 1.06;
  const step = (width - pad.left - pad.right) / values.length;
  const format = (value) => `${unit}${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value)}`;
  const bars = values.map((value, index) => {
    const x = pad.left + index * step + step * 0.18;
    const y = scaleY(value, axisFrom, top, height, pad);
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(step * 0.64).toFixed(1)}" height="${(height - pad.bottom - y).toFixed(1)}" rx="3" fill="#3d6fb4"/>${text(x + step * 0.32, height - pad.bottom + 22, labels[index], { font: SANS, size: 13, anchor: 'middle', fill: FAINT })}`;
  });
  return svg(width, height, [text(pad.left, 32, title, { font: SANS, size: 17, weight: 700 }), frame({ width, height, pad, min: axisFrom, max: top, format }), ...bars].join(''));
}
