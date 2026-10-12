// Every decision model the lab records, in the order the site lists them. Browser-safe: the site, the
// recorder, the scorer and the tests all read this one list.
//
// `via` is how the recorder reaches the model: TypeSafe's SDK for Jev, OpenAI's SDK for GPT-6 Luna,
// and OpenRouter's decisions endpoint for the rest. `images` is whether the model reads pictures, as
// scripts/probe-models.js measured it (benchmarks/capabilities.json): it must answer from the picture
// at a few hundred tokens, not take the base64 as text. That differs from OpenRouter's own list in
// both directions. `imageHost` pins image requests to the one host that reads them: Clef is also
// served by a host that turns the picture into text.

export const MODELS = [
  { id: 'jev', label: 'Jev', maker: 'TypeSafe', via: 'typesafe', images: false },
  { id: 'openai', label: 'GPT-6 Luna', maker: 'OpenAI', via: 'openai', images: true },
  { id: 'microsoft-decision-1', label: 'Decision 1', maker: 'Microsoft', via: 'openrouter', route: 'microsoft/microsoft-decision-1', images: false },
  { id: 'drex-v1-5', label: 'Drex 1.5', maker: 'Nace AI', via: 'openrouter', route: 'nace-ai/drex-v1.5', images: false },
  { id: 'clef-omni', label: 'Clef Omni', maker: 'Cloudflare', via: 'openrouter', route: 'cloudflare/clef-omni', images: true },
  { id: 'solar-decide-flash', label: 'Solar Decide Flash', maker: 'Upstage', via: 'openrouter', route: 'upstage/solar-decide-flash', images: false },
  { id: 'pplx-decider', label: 'PPLX Decider 1.1 27B', maker: 'Perplexity', via: 'openrouter', route: 'perplexity/pplx-decider-v1.1-27b', images: true },
  { id: 'liquid-d1', label: 'D1', maker: 'Liquid', via: 'openrouter', route: 'liquid/d1', images: true },
  { id: 'clef-flash', label: 'Clef Flash', maker: 'Cloudflare', via: 'openrouter', route: 'cloudflare/clef-flash', images: true, imageHost: 'Cloudflare' },
  { id: 'clef', label: 'Clef', maker: 'Cloudflare', via: 'openrouter', route: 'cloudflare/clef', images: true, imageHost: 'Cloudflare' },
  { id: 'tev1-4b', label: 'TEV1 4B (experimental)', maker: 'Together', via: 'openrouter', route: 'togethercomputer/tev1-4b-experimental', images: false },
  { id: 'mercury-decide', label: 'Mercury Decide', maker: 'Inception', via: 'openrouter', route: 'inception/mercury-decide:free', images: true },
  { id: 'solar-decide', label: 'Solar Decide', maker: 'Upstage', via: 'openrouter', route: 'upstage/solar-decide', images: false },
  // Respan takes the state only as a string (or as a chat transcript), so it is sent as JSON text.
  { id: 'span-01', label: 'Span 01', maker: 'Respan', via: 'openrouter', route: 'respan/span-01', images: false, stateAsText: true, unsupported: 'Answers yes-or-no questions only, with the state as plain text; every demo also asks choice and score questions.' },
  { id: 'kev-4b', label: 'Kev 4B', maker: 'Jared Palmer', via: 'openrouter', route: 'jaredpalmer/kev-4b', images: false },
];

export const MODEL_BY_ID = Object.fromEntries(MODELS.map((model) => [model.id, model]));
export const MODEL_IDS = MODELS.map((model) => model.id);

/** The models a demo can be recorded on: all of them, or only those that read images if it sends any. */
export const modelsFor = (demo) => MODELS.filter((model) => !model.unsupported && (!demo?.images || model.images));

/** The model a demo is shown and scored on by default: Jev, or the first image model for an image demo. */
export const defaultModel = (demo) => modelsFor(demo)[0].id;

/** Where a model's recording of a demo lives. Jev's keeps the file name it always had. */
export const fixturesName = (modelId) => (modelId === 'jev' ? 'fixtures.json' : `fixtures.${modelId}.json`);
