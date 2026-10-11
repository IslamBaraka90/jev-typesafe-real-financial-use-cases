// Eleven real photographs of fruit and bread, fresh or gone off. See lib/photos.js for where they
// came from and who took them.

import { photoDataset } from './lib/photos.js';

export const SEED = 0;

export function generate() {
  return photoDataset({
    id: 'produce-check',
    prefix: 'PR',
    labelKey: 'photoId',
    names: ['apple-rotten-1', 'apple-fresh-1', 'banana-black', 'strawberries-fresh-1', 'bread-mouldy', 'apple-fresh-2', 'strawberries-mouldy', 'banana-ripe', 'apple-rotten-2', 'strawberry-rotting', 'strawberries-fresh-2'],
    context: { setting: 'Goods-in inspection at a grocery distribution centre. Anything rotten or mouldy is rejected; fresh and ripe stock is accepted.' },
  });
}
