// A compact way to store a recording. Thirteen more models over ten thousand items would add over a
// hundred megabytes in the ordinary format, most of it repeated key names; packed, each answer is a
// short row of numbers in the order the question defines, rounded to three places.
//
//   noul    p
//   choice  [index of the chosen option, confidence, ...probabilities in option order]
//   score   [score, confidence, ...probabilities from the lowest level up]
//
// `unpackFixtures` turns a packed file back into the ordinary shape, so nothing that reads recordings
// needs to know which kind it was given.

const round = (value) => (Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null);

/** One item's answers as a packed row, in the order of `questions`. */
export function packAnswers(answers, questions) {
  return Object.entries(questions).map(([name, question]) => {
    const answer = answers[name];
    if (!answer) return null;
    if (question.type === 'noul') return round(answer.noul);
    if (question.type === 'choice') {
      const options = Object.keys(question.criteria);
      return [options.indexOf(answer.choice), round(answer.confidence), ...options.map((option) => round(answer.probabilities?.[option] ?? 0))];
    }
    const levels = question.criteria.length;
    return [round(answer.score), round(answer.confidence), ...Array.from({ length: levels }, (_, index) => round(answer.probabilities?.[index] ?? answer.probabilities?.[String(index)] ?? 0))];
  });
}

/** A packed row back in the ordinary stored shape (the shape `expandAnswers` takes). */
export function unpackAnswers(row, questions) {
  const answers = {};
  Object.entries(questions).forEach(([name, question], index) => {
    const value = row[index];
    if (value === null || value === undefined) return;
    if (question.type === 'noul') {
      answers[name] = { type: 'noul', noul: value };
    } else if (question.type === 'choice') {
      const options = Object.keys(question.criteria);
      const [chosen, confidence, ...probabilities] = value;
      answers[name] = { type: 'choice', choice: options[chosen], confidence, probabilities: Object.fromEntries(options.map((option, at) => [option, probabilities[at]])) };
    } else {
      const [score, confidence, ...probabilities] = value;
      answers[name] = { type: 'score', score, confidence, probabilities: Object.fromEntries(probabilities.map((probability, at) => [String(at), probability])) };
    }
  });
  return answers;
}

/** A recording file in the ordinary shape, whichever way it was stored. */
export function unpackFixtures(file, questions) {
  if (file?.format !== 'packed-1') return file;
  const answers = Object.fromEntries(Object.entries(file.answers ?? {}).map(([id, row]) => [id, unpackAnswers(row, questions)]));
  return { ...file, answers };
}
