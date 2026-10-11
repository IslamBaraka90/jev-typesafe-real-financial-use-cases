// "Is this a good time to buy?" asked of a candlestick chart, and checked against what really came
// next. Each chart is ninety real trading days with no name or dates; the label is the return over
// the following twenty trading days, which the chart cannot show. Half the windows went on to rise
// and half to fall, so a model that always says buy is right exactly half the time.

import { createRandom } from './lib/random.js';
import { candles, MARKET_NOTE } from './lib/market.js';
import { candleChart } from './lib/draw.js';

export const SEED = 4106;
const WINDOW = 90;
const HOLD = 20;
const PER_SIDE = 24;
const SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'JPM', 'BAC', 'XOM', 'CVX', 'KO', 'PG', 'WMT', 'JNJ', 'GLD', 'SPY', 'BTC-USD', 'C', 'WFC', 'PEP'];

export function generate(seed = SEED) {
  const random = createRandom(seed);
  const picked = { ROSE: [], FELL: [] };
  const used = new Set();

  for (let attempt = 0; attempt < 5000 && (picked.ROSE.length < PER_SIDE || picked.FELL.length < PER_SIDE); attempt++) {
    const symbol = random.pick(SYMBOLS);
    const bars = candles(symbol).bars;
    const start = random.int(0, bars.length - WINDOW - HOLD - 1);
    const key = `${symbol}:${Math.floor(start / WINDOW)}`;
    const entry = bars[start + WINDOW - 1].close;
    const exit = bars[start + WINDOW - 1 + HOLD].close;
    const forward = exit / entry - 1;
    // A move under 1% either way is noise, not an outcome worth grading.
    if (Math.abs(forward) < 0.01 || used.has(key)) continue;
    const side = forward > 0 ? 'ROSE' : 'FELL';
    if (picked[side].length >= PER_SIDE) continue;
    used.add(key);
    picked[side].push({ symbol, bars: bars.slice(start, start + WINDOW), forward, side });
  }

  const windows = random.shuffle([...picked.ROSE, ...picked.FELL]);
  const items = [];
  const labels = [];
  const artifacts = [];
  windows.forEach((window, index) => {
    const id = random.id('BT', index + 1, 3);
    const image = `images/buy-timing/${id}.png`;
    artifacts.push({ path: `web/public/${image}`, svg: candleChart({ bars: window.bars, title: `Asset ${id.slice(3)} · daily candles, ${WINDOW} trading days to today` }) });
    items.push({ id, image, symbol: window.symbol, from: window.bars[0].date, to: window.bars.at(-1).date, lastClose: window.bars.at(-1).close });
    labels.push({ chartId: id, outcome: window.side, forwardReturnPercent: Number((window.forward * 100).toFixed(2)) });
  });

  return {
    dataset: {
      id: 'buy-timing',
      class: 'cached-real',
      generatedAt: '2026-10-11',
      seed,
      source: 'Yahoo Finance daily candles, cached in data/market',
      context: { window: WINDOW, holdDays: HOLD, note: MARKET_NOTE },
      items,
    },
    labels,
    artifacts,
  };
}
