// Sixty-day price charts cut from real cached prices, drawn with no name and no dates so nothing but
// the picture can be read. Each window is labelled by what the closes actually did: up more than 8%,
// down more than 8%, or inside 3% either way. Windows in between are skipped, because a chart that
// moved 5% is a judgement call, and a test needs an answer.

import { createRandom } from './lib/random.js';
import { candles, MARKET_NOTE } from './lib/market.js';
import { lineChart } from './lib/draw.js';

export const SEED = 4105;
const WINDOW = 60;
const PER_TREND = 16;
const SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'JPM', 'BAC', 'XOM', 'CVX', 'KO', 'PG', 'WMT', 'JNJ', 'GLD', 'SPY', 'BTC-USD', 'SLB'];

export function trendOf(closes) {
  const change = closes.at(-1) / closes[0] - 1;
  if (change > 0.08) return 'UP';
  if (change < -0.08) return 'DOWN';
  if (Math.abs(change) < 0.03) return 'SIDEWAYS';
  return null;
}

export function generate(seed = SEED) {
  const random = createRandom(seed);
  const picked = { UP: [], DOWN: [], SIDEWAYS: [] };
  const used = new Set();

  for (let attempt = 0; attempt < 5000 && Object.values(picked).some((list) => list.length < PER_TREND); attempt++) {
    const symbol = random.pick(SYMBOLS);
    const bars = candles(symbol).bars;
    const start = random.int(0, bars.length - WINDOW - 1);
    const key = `${symbol}:${Math.floor(start / WINDOW)}`;
    const closes = bars.slice(start, start + WINDOW).map((bar) => bar.close);
    const trend = trendOf(closes);
    if (!trend || picked[trend].length >= PER_TREND || used.has(key)) continue;
    used.add(key);
    picked[trend].push({ symbol, from: bars[start].date, to: bars[start + WINDOW - 1].date, closes, change: closes.at(-1) / closes[0] - 1, trend });
  }

  const windows = random.shuffle(Object.values(picked).flat());
  const items = [];
  const labels = [];
  const artifacts = [];
  windows.forEach((window, index) => {
    const id = random.id('CT', index + 1, 3);
    const image = `images/chart-trend/${id}.png`;
    artifacts.push({ path: `web/public/${image}`, svg: lineChart({ closes: window.closes, title: `Asset ${id.slice(3)} · daily close, ${WINDOW} trading days` }) });
    // The symbol and dates stay on the item for the page, and never enter the state.
    items.push({ id, image, symbol: window.symbol, from: window.from, to: window.to, firstClose: window.closes[0], lastClose: window.closes.at(-1) });
    labels.push({ chartId: id, trend: window.trend, changePercent: Number((window.change * 100).toFixed(2)) });
  });

  return {
    dataset: {
      id: 'chart-trend',
      class: 'cached-real',
      generatedAt: '2026-10-11',
      seed,
      source: 'Yahoo Finance daily candles, cached in data/market',
      context: { window: WINDOW, note: MARKET_NOTE },
      items,
    },
    labels,
    artifacts,
  };
}
