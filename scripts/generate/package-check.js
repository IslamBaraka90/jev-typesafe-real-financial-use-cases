// Three real photographs of parcels and boxes. Commons has very few openly licensed pictures of
// damaged parcels, so this demo is small on purpose; see lib/photos.js for the credits.

import { photoDataset } from './lib/photos.js';

export const SEED = 0;

export function generate() {
  return photoDataset({
    id: 'package-check',
    prefix: 'PK',
    labelKey: 'photoId',
    names: ['parcel-crushed', 'parcel-worn', 'box-open'],
    context: { setting: 'A delivery photo attached to a damaged-in-transit claim. Crushed or opened parcels support the claim; a parcel that is only scuffed with age does not.' },
  });
}
