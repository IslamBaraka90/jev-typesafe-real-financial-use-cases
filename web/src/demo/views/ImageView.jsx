import { Record } from './fields.jsx';
import { currencyOf } from '../../lib/humanise.js';

// An image demo on the stage: the picture the model was sent, as large as the stage allows, with the
// item's other fields beside it. A real photograph carries its author and licence underneath, which
// is a condition of using it.

export function ImageView({ item, demo, context }) {
  const stage = demo?.stage ?? {};
  return (
    <div className="image-view">
      <figure className="image-view-figure">
        <img src={`/${item.image}`} alt={`${demo?.itemLabel?.(item) ?? item.id}: the image the model read`} loading="lazy" decoding="async" />
        {item.credit ? (
          <figcaption className="meta">
            Photo: {item.credit.author} · {item.credit.license} ·{' '}
            <a href={item.credit.source} target="_blank" rel="noopener noreferrer">
              source
            </a>
          </figcaption>
        ) : (
          <figcaption className="meta">The model was sent this picture; nothing printed on it was given as text.</figcaption>
        )}
      </figure>
      <Record record={item} labels={stage.labels} hide={['id', 'image', 'credit', ...(stage.hide ?? [])]} highlight={stage.highlight} currency={currencyOf(item, context)} />
    </div>
  );
}
