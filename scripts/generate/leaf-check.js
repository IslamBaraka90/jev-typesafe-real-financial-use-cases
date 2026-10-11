// Four real photographs of leaves, one healthy and three diseased. See lib/photos.js for the credits.

import { photoDataset } from './lib/photos.js';

export const SEED = 0;

export function generate() {
  return photoDataset({
    id: 'leaf-check',
    prefix: 'LF',
    labelKey: 'photoId',
    names: ['leaf-mango-mildew', 'leaf-healthy', 'leaf-ascochyta', 'leaf-grape-mildew'],
    context: { setting: 'A crop-insurance field check. The adjuster photographs a leaf and records whether the plant shows disease, and which kind.' },
  });
}
