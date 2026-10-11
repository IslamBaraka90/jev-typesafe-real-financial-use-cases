// What the image demos share. Each one asks a decision model to read a picture — a receipt, a cheque,
// a chart, a photograph — and name what it shows, so each is graded the same way: the class named
// against the class planted, plus one yes-or-no action (hold, reject, buy) against the right action.
// Everything specific to a demo stays in its own file; this is only the arithmetic of grading.

import { percent } from './metrics.js';

export const readable = (value) => String(value).toLowerCase().replaceAll('_', ' ');

/** The pictures a demo sends with each item: its one image, as a path under web/public. */
export const itemImage = (item) => [item.image];

/** Labels keyed by the item they belong to. */
export const labelsById = (labels = [], key) => new Map(labels.map((label) => [label[key], label]));

/** A grade for one item: did the model name the right class? */
export function classJudge({ question, truth }) {
  return (result, label) => {
    if (!label) return null;
    return { agree: result.evaluation.named === truth(label), confidence: result.answers[question]?.confidence };
  };
}

function confusion(graded, classes, truthOf, title) {
  return {
    title,
    rowLabel: 'what the picture shows',
    columnLabel: 'what the model named',
    columns: classes.map(readable),
    rows: classes.map((actual) => ({
      label: readable(actual),
      cells: classes.map((predicted) => ({
        predicted,
        count: graded.filter((result) => truthOf(result) === actual && result.evaluation.named === predicted).length,
        diagonal: actual === predicted,
      })),
    })),
  };
}

/**
 * The report every image demo returns. `truth(label)` is the planted class, `act` names the action
 * (`{ label: 'Held', should: (label) => boolean }`) and is graded against `evaluation.act`.
 */
export function classReport(results, { labels, labelKey, classes, truth, act, noun = 'pictures', title = 'Planted against named' }) {
  const byId = labelsById(labels, labelKey);
  const graded = results.filter((result) => byId.has(result.item.id));
  const truthOf = (result) => truth(byId.get(result.item.id));
  const right = graded.filter((result) => result.evaluation.named === truthOf(result));
  const shouldAct = graded.filter((result) => act.should(byId.get(result.item.id)));
  const caught = shouldAct.filter((result) => result.evaluation.act);
  const falseAlarms = graded.filter((result) => result.evaluation.act && !act.should(byId.get(result.item.id)));
  const majority = Math.max(...classes.map((name) => graded.filter((result) => truthOf(result) === name).length));
  const actRight = graded.filter((result) => result.evaluation.act === act.should(byId.get(result.item.id)));

  return {
    note: `Graded against ${graded.length} ${noun} whose answer is known. The answers never enter the model's input; it sees the picture and the task.`,
    kpis: [
      { label: 'Named correctly', value: percent(right.length / (graded.length || 1)), context: `${right.length} of ${graded.length} ${noun}`, tone: right.length === graded.length ? 'good' : 'warn' },
      { label: `${act.label} correctly`, value: percent(actRight.length / (graded.length || 1)), context: `${actRight.length} of ${graded.length}: the right ${act.noun ?? 'call'} either way`, tone: actRight.length === graded.length ? 'good' : 'warn' },
      { label: `${act.target} caught`, value: shouldAct.length ? percent(caught.length / shouldAct.length) : '–', context: `${caught.length} of ${shouldAct.length}`, tone: caught.length === shouldAct.length ? 'good' : 'warn' },
      { label: 'False alarms', value: falseAlarms.length, context: `of ${graded.length - shouldAct.length} that needed nothing`, tone: falseAlarms.length ? 'warn' : 'good' },
    ],
    metrics: { headline: { label: 'Named correctly', value: graded.length ? right.length / graded.length : 0 }, actionAccuracy: graded.length ? actRight.length / graded.length : null },
    baselines: [
      { label: 'The model', value: graded.length ? right.length / graded.length : 0, model: true },
      { label: 'Always name the commonest answer', value: graded.length ? majority / graded.length : 0 },
    ],
    matrix: confusion(graded, classes, truthOf, title),
    distribution: classes.map((name) => ({ label: readable(name), count: graded.filter((result) => result.evaluation.named === name).length })),
    distributionTitle: 'What the model named',
    checks: [
      { id: 'wrong', label: 'Named wrongly', count: graded.length - right.length, of: graded.length, items: graded.filter((result) => !right.includes(result)).map((result) => result.item.id) },
      { id: 'missed', label: `${act.target} missed`, count: shouldAct.length - caught.length, of: shouldAct.length, items: shouldAct.filter((result) => !result.evaluation.act).map((result) => result.item.id) },
    ],
  };
}
