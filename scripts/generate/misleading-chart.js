// Column charts of the kind that turn up in investor decks: four quarters of a number, drawn either
// honestly from zero or with the axis cut just below the smallest bar, which makes a 4% rise look like
// a doubling. The label is the real change and how the axis was drawn, both known exactly.

import { createRandom } from './lib/random.js';
import { companyName } from './lib/names.js';
import { columnChart } from './lib/draw.js';

export const SEED = 4107;
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const SIZES = { SMALL: [0.02, 0.07], MEDIUM: [0.12, 0.22], LARGE: [0.35, 0.7] };
const METRICS = [['Revenue', '$', 1_000_000], ['Active customers', '', 10_000], ['Assets under management', '$', 50_000_000], ['Monthly payments volume', '$', 5_000_000]];

export function generate(seed = SEED) {
  const random = createRandom(seed);
  const plan = random.shuffle(Object.keys(SIZES).flatMap((size) => [true, false].flatMap((truncated) => Array(5).fill({ size, truncated }))));
  const items = [];
  const labels = [];
  const artifacts = [];

  plan.forEach(({ size, truncated }, index) => {
    const id = random.id('MC', index + 1, 3);
    const [metric, unit, scale] = random.pick(METRICS);
    const change = random.float(...SIZES[size], 3);
    const first = Math.round(scale * random.float(1, 9, 2));
    const last = Math.round(first * (1 + change));
    const values = [first, Math.round(first + (last - first) * random.float(0.2, 0.45)), Math.round(first + (last - first) * random.float(0.5, 0.85)), last];
    const axisFrom = truncated ? Math.floor((first * 0.97) / (scale / 10)) * (scale / 10) : 0;
    const company = companyName(random);
    const image = `images/misleading-chart/${id}.png`;
    artifacts.push({ path: `web/public/${image}`, svg: columnChart({ title: `${company} · ${metric}, 2026`, unit, labels: QUARTERS, values, axisFrom }) });
    items.push({ id, image, company, metric, values });
    labels.push({ chartId: id, size, truncated, misleading: truncated, changePercent: Number(((last / first - 1) * 100).toFixed(1)) });
  });

  return {
    dataset: {
      id: 'misleading-chart',
      class: 'synthetic',
      generatedAt: '2026-10-11',
      seed,
      source: 'scripts/generate/misleading-chart.js',
      context: { bands: { SMALL: 'under 10%', MEDIUM: '10% to 25%', LARGE: 'over 25%' } },
      items,
    },
    labels,
    artifacts,
  };
}
