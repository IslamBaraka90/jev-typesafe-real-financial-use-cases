// The real photographs behind the photo demos: eighteen openly licensed files from Wikimedia Commons,
// downloaded once at 960px and committed under web/public/images/photos. Each keeps its author,
// licence and source page, which the page shows beside the picture.
//
// The condition on each entry is the label, set by hand from the file's own title and description on
// Commons and checked by looking at the picture. It goes to the labels file, never into a state.

const commons = (file) => `https://commons.wikimedia.org/wiki/File:${file}`;

export const PHOTOS = [
  { name: 'apple-rotten-1', subject: 'Apple', condition: 'ROTTEN', author: 'Shams948', license: 'CC0', source: commons('Rotten_Apple_02.jpg') },
  { name: 'apple-rotten-2', subject: 'Apple', condition: 'ROTTEN', author: 'Shams948', license: 'CC0', source: commons('Rotten_Apple_04.jpg') },
  { name: 'apple-fresh-1', subject: 'Apple', condition: 'FRESH', author: 'آرمین', license: 'CC0', source: commons('Beautiful_red_apple_01.jpg') },
  { name: 'apple-fresh-2', subject: 'Apple', condition: 'FRESH', author: 'Abhijit Tembhekar', license: 'CC BY 2.0', source: commons('Red_Apple.jpg') },
  { name: 'banana-black', subject: 'Banana', condition: 'ROTTEN', author: 'TwoWings', license: 'Public domain', source: commons('Black-banana.JPG') },
  { name: 'banana-ripe', subject: 'Bananas', condition: 'FRESH', author: 'MartinThoma', license: 'CC0', source: commons('Ripe-bananas.jpg') },
  { name: 'strawberries-mouldy', subject: 'Strawberries', condition: 'MOULDY', author: 'Kevin Payravi', license: 'CC BY-SA 4.0', source: commons('Moldy_Strawberries.jpg') },
  { name: 'strawberry-rotting', subject: 'Strawberry', condition: 'MOULDY', author: 'Kevin Payravi', license: 'CC BY-SA 4.0', source: commons('Rotting_strawberry_on_white_background.jpg') },
  { name: 'strawberries-fresh-1', subject: 'Strawberries', condition: 'FRESH', author: 'Artur Rutkowski', license: 'CC0', source: commons('Fresh_strawberries_(Unsplash).jpg') },
  { name: 'strawberries-fresh-2', subject: 'Strawberries', condition: 'FRESH', author: 'Lablascovegmenu', license: 'CC BY 2.0', source: commons('Fresh_Strawberries_(6888796933).jpg') },
  { name: 'bread-mouldy', subject: 'Bread', condition: 'MOULDY', author: 'Matt Wharton', license: 'CC BY-SA 2.0', source: commons('Mouldy_bread.jpg') },
  { name: 'parcel-crushed', subject: 'Parcel', condition: 'CRUSHED', author: 'Meanwell Packaging', license: 'CC BY 2.0', source: commons('Damaged_fragile_parcel_delivered_to_doorstep.jpg') },
  { name: 'parcel-worn', subject: 'Parcel', condition: 'WORN', author: 'KingaNBM', license: 'CC BY-SA 4.0', source: commons("Package_send_to_member_of_RAF_from_'mother'.JPG") },
  { name: 'box-open', subject: 'Box', condition: 'OPENED', author: 'ArnoldReinhold', license: 'CC BY-SA 3.0', source: commons('Box.agr.jpg') },
  { name: 'leaf-grape-mildew', subject: 'Grape leaf', condition: 'MILDEW', author: 'David B. Langston, University of Georgia', license: 'Public domain', source: commons('Downy_and_Powdery_mildew_on_grape_leaf.JPG') },
  { name: 'leaf-mango-mildew', subject: 'Mango leaf', condition: 'MILDEW', author: 'Scot Nelson, Wayne Nishijima', license: 'Public domain', source: commons('Mango_powdery_mildew_severe_leaf_blight_with_mycelium_1.jpg') },
  { name: 'leaf-ascochyta', subject: 'Leaf', condition: 'LEAF_SPOT', author: 'Clemson University', license: 'CC BY-SA 3.0', source: commons('Ascochyta_leaf_spot_sympton.jpg') },
  { name: 'leaf-healthy', subject: 'Calathea leaves', condition: 'HEALTHY', author: 'Saimum nazifa', license: 'CC BY-SA 4.0', source: commons('Greenary_leaf.jpg') },
];

/** One photo demo's dataset and labels from a slice of the list. */
export function photoDataset({ id, prefix, names, context, labelKey }) {
  const chosen = names.map((name) => PHOTOS.find((photo) => photo.name === name));
  const items = chosen.map((photo, index) => ({
    id: `${prefix}-${String(index + 1).padStart(2, '0')}`,
    image: `images/photos/${photo.name}.jpg`,
    subject: photo.subject,
    credit: { author: photo.author, license: photo.license, source: photo.source },
  }));
  const labels = chosen.map((photo, index) => ({ [labelKey]: items[index].id, condition: photo.condition }));
  return {
    dataset: { id, class: 'cached-real', generatedAt: '2026-10-11', source: 'Wikimedia Commons, openly licensed photographs', context, items },
    labels,
  };
}
