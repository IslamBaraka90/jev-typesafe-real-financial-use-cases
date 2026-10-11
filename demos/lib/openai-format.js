// Translation between the question and answer shapes the demos use, which are TypeSafe's, and the
// shapes OpenAI's decisions API uses. Pure functions with no SDK in them, so the site, the recorder
// and the tests all share one copy.
//
// The two APIs ask the same three kinds of question under different names:
//
//   TypeSafe noul    {criteria: {yes, no}}          OpenAI predicate  (no options)
//   TypeSafe choice  {criteria: {VALUE: text}}      OpenAI choice     {choices: [{value, description}]}
//   TypeSafe score   {criteria: [label, ...]}       OpenAI score      {levels: [{label, description}]}
//
// Answers come back the other way and are stored in TypeSafe's shape, so every demo's evaluate,
// grade and report run unchanged on either provider.

/** A demo's questions, as the `questions` array OpenAI expects. */
export function toOpenAIQuestions(questions) {
  return Object.entries(questions).map(([name, question]) => {
    if (question.type === 'choice') {
      return {
        type: 'choice',
        name,
        instructions: question.instructions,
        choices: Object.entries(question.criteria).map(([value, description]) => ({ value, description })),
      };
    }
    if (question.type === 'score') {
      return {
        type: 'score',
        name,
        instructions: question.instructions,
        levels: question.criteria.map((label) => ({ label, description: label })),
      };
    }
    if (question.type === 'noul') {
      // A predicate has no options, so the two outcomes the demo describes go into the instructions.
      const { yes, no } = question.criteria ?? {};
      const outcomes = [yes && `True means: ${yes}`, no && `False means: ${no}`].filter(Boolean).join(' ');
      return { type: 'predicate', name, instructions: outcomes ? `${question.instructions} ${outcomes}` : question.instructions };
    }
    throw new Error(`Question "${name}" has a type OpenAI does not support: ${question.type}`);
  });
}

/**
 * The state as OpenAI's `input`: plain text when there is nothing else, otherwise one user message
 * that carries the text and each image as a base64 data URL — the only image form the API accepts.
 */
export function toOpenAIInput(state, images = []) {
  const text = typeof state === 'string' ? state : JSON.stringify(state, null, 2);
  if (!images.length) return text;
  return [
    {
      role: 'user',
      content: [{ type: 'input_text', text }, ...images.map((url) => ({ type: 'input_image', image_url: url }))],
    },
  ];
}

const round = (value) => (Number.isFinite(value) ? Number(value.toFixed(4)) : value);

/**
 * OpenAI's answers in the shape the demos read. Refusals are returned separately: an item with a
 * refused question has no complete answer set, and is stored apart rather than half-graded.
 */
export function fromOpenAIAnswers(answers) {
  const converted = {};
  const refusals = [];

  for (const answer of answers ?? []) {
    if (answer.type === 'refusal') {
      refusals.push(answer.name);
    } else if (answer.type === 'predicate') {
      converted[answer.name] = { type: 'noul', noul: round(answer.probability) };
    } else if (answer.type === 'choice') {
      converted[answer.name] = {
        type: 'choice',
        choice: answer.choice,
        confidence: round(answer.confidence),
        probabilities: Object.fromEntries((answer.probabilities ?? []).map((entry) => [entry.value, round(entry.probability)])),
      };
    } else if (answer.type === 'score') {
      converted[answer.name] = {
        type: 'score',
        score: round(answer.score),
        confidence: round(answer.confidence),
        probabilities: Object.fromEntries((answer.probabilities ?? []).map((entry) => [String(entry.value), round(entry.probability)])),
      };
    }
  }

  return { answers: converted, refusals };
}
