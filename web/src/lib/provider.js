import { useCallback, useSyncExternalStore } from 'react';
import { MODEL_BY_ID, MODELS, modelsFor } from '../../../demos/lib/models.js';

// Which decision model's recorded answers a demo page shows. Text demos are recorded on every model
// that takes them; image demos only on the models that read pictures. The choice is remembered across
// demos in this browser and can be set in the address with ?model=.

export const PROVIDERS = MODELS.filter((model) => !model.unsupported).map((model) => ({
  id: model.id,
  label: model.label,
  vendor: model.maker,
  note: `${model.maker}${model.via === 'openrouter' ? ', through OpenRouter' : model.via === 'openai' ? ', through OpenAI’s decisions API' : ', through TypeSafe’s API'}${model.images ? '; reads images' : ''}.`,
}));

export const PROVIDER_BY_ID = Object.fromEntries(PROVIDERS.map((provider) => [provider.id, provider]));

const KEY = 'decision-model';
const listeners = new Set();
// The choice made on this page view, which holds even where storage is blocked.
let picked = null;

function readChoice() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('model');
    if (PROVIDER_BY_ID[fromUrl]) return fromUrl;
    if (picked) return picked;
    const stored = window.localStorage.getItem(KEY);
    return PROVIDER_BY_ID[stored] ? stored : 'jev';
  } catch {
    return 'jev';
  }
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The models a demo has recordings for, in the order the picker shows them. */
export const providersFor = (demo) => modelsFor(demo).map((model) => PROVIDER_BY_ID[model.id]).filter(Boolean);

/**
 * The model this page shows for `demo`, and a setter. A demo with no recording on the chosen model
 * falls back to the first it has, without changing the choice for the other demos.
 */
export function useProvider(demo) {
  const chosen = useSyncExternalStore(subscribe, readChoice, () => 'jev');
  const available = providersFor(demo);
  const provider = available.some((entry) => entry.id === chosen) ? chosen : available[0].id;

  const setProvider = useCallback((id) => {
    picked = id;
    try {
      window.localStorage.setItem(KEY, id);
      const url = new URL(window.location.href);
      if (url.searchParams.has('model')) {
        url.searchParams.set('model', id);
        window.history.replaceState(window.history.state, '', url);
      }
    } catch {
      // Storage can be blocked; `picked` keeps the choice for this page view.
    }
    listeners.forEach((listener) => listener());
  }, []);

  return { provider, available, setProvider };
}

export { MODEL_BY_ID };
