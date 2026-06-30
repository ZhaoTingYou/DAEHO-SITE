import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./specialty-collection-gallery.tsx', import.meta.url), 'utf8');
const globals = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');
const koMessages = JSON.parse(readFileSync(new URL('../../messages/ko.json', import.meta.url), 'utf8'));
const enMessages = JSON.parse(readFileSync(new URL('../../messages/en.json', import.meta.url), 'utf8'));
const pageCatalog = JSON.parse(readFileSync(new URL('../../lib/cms/page-catalog.json', import.meta.url), 'utf8'));
const publicContentSource = readFileSync(new URL('../../lib/cms/public-content.ts', import.meta.url), 'utf8');
const adminCollectionsSource = readFileSync(new URL('../../app/admin/(dashboard)/collections/page.tsx', import.meta.url), 'utf8');
const collectionFormSource = readFileSync(new URL('../../app/admin/_components/collection-form.tsx', import.meta.url), 'utf8');
const bespokeViewSource = source.slice(
  source.indexOf('function BespokeCreationsView('),
  source.indexOf('const bespokeCanvasPlacements')
);
const stagePanelSource = source.slice(
  source.indexOf('function CollectionStagePanel('),
  source.indexOf('function StageImage(')
);
const stageImageSource = source.slice(
  source.indexOf('function StageImage('),
  source.indexOf('function CollectionImage(')
);

test('bespoke toolbar does not render the active category label beside the filter button', () => {
  assert.equal(
    bespokeViewSource.includes('activeLabel'),
    false,
    'BespokeCreationsView should not render or accept activeLabel in its toolbar'
  );
  assert.ok(
    bespokeViewSource.includes('href={backHref}') && bespokeViewSource.includes('{allLabel}'),
    'BespokeCreationsView should render the all categories return link'
  );
});

test('collection stage cards declare separate background and product artwork in order', () => {
  const artworkMatch = source.match(/const collectionStageArtwork = \[([\s\S]*?)\] as const;/);
  assert.ok(artworkMatch, 'collectionStageArtwork should make the stage image mapping explicit');

  const pairs = Array.from(
    artworkMatch[1].matchAll(/background: '([^']+)'[\s\S]*?product: '([^']+)'/g),
    ([, background, product]) => ({background, product})
  );

  assert.deepEqual(pairs, [
    {background: 'bg1.jpg', product: 'c1.png'},
    {background: 'bg3.jpg', product: 'c2.png'},
    {background: 'bg2.jpg', product: 'c3.png'}
  ]);
});

test('collection stage artwork is exposed through CMS content fields', () => {
  assert.ok(
    source.includes('filter.background ?? fallback.background') &&
      source.includes('filter.product ?? filter.image ?? fallback.product'),
    'stage artwork should prefer CMS background/product fields before falling back'
  );

  for (const messages of [koMessages, enMessages]) {
    const pairs = messages.specialtyPages.collection.gallery.filters.map(({background, product}) => ({background, product}));

    assert.deepEqual(pairs, [
      {background: 'bg1.jpg', product: 'c1.png'},
      {background: 'bg3.jpg', product: 'c2.png'},
      {background: 'bg2.jpg', product: 'c3.png'}
    ]);
  }

  const categoryPages = pageCatalog.filter((page) => page.pageKey.startsWith('mastery-creations-'));

  assert.equal(categoryPages.length, 3, 'each creations category should have its own CMS page entry');
  for (const page of categoryPages) {
    const fieldPaths = page.fields.map((field) => field.path);

    assert.ok(fieldPaths.includes('background'), `${page.pageKey} should expose a background image field`);
    assert.ok(fieldPaths.includes('product'), `${page.pageKey} should expose a product PNG field`);
  }
});

test('creations products are managed only through Collections admin', () => {
  const creationsPage = pageCatalog.find((page) => page.pageKey === 'mastery-creations');
  assert.ok(creationsPage, 'Creations landing page should have its own CMS page entry');
  assert.equal(
    creationsPage.fields.some((entry) => entry.groupKey === 'main' && entry.path === 'gallery.items'),
    false,
    'Creations products should not be edited from /admin/pages/mastery-creations'
  );

  const bespokePage = pageCatalog.find((page) => page.pageKey === 'mastery-creations-bespoke');
  assert.ok(bespokePage, 'Bespoke category should have its own CMS page entry');

  assert.equal(
    bespokePage.fields.some((entry) => entry.groupKey === 'bespoke' && entry.path === 'items'),
    false,
    'Bespoke product images should not be edited from /admin/pages/mastery-creations-bespoke'
  );

  assert.equal(
    source.includes('mergeBespokeItems'),
    false,
    'Bespoke view should render the Collection item pool without Page-level product overrides'
  );
  assert.equal(
    publicContentSource.includes('mergeBespokeItems'),
    false,
    'Public Creations source should not merge Page-level bespoke product overrides'
  );
});

test('collections admin list exposes product thumbnails and query filters', () => {
  assert.ok(
    adminCollectionsSource.includes('collection-search-form'),
    'Collections admin should render a dedicated search/filter form'
  );
  assert.ok(
    adminCollectionsSource.includes('name="q"') &&
      adminCollectionsSource.includes('name="category"') &&
      adminCollectionsSource.includes('name="status"'),
    'Collections admin should expose search, category, and status query controls'
  );
  assert.ok(
    adminCollectionsSource.includes('collection-thumbnail') &&
      adminCollectionsSource.includes('imageSrc(item.imagePath)'),
    'Collections admin rows should render visual product thumbnails'
  );
  assert.ok(
    adminCollectionsSource.includes("'champion'") &&
      adminCollectionsSource.includes("'appointment'") &&
      adminCollectionsSource.includes("'bespoke'"),
    'Collections admin filters should use the three public Creations categories'
  );
});

test('collection edit form uses a fixed category dropdown', () => {
  assert.ok(
    collectionFormSource.includes('SelectField') &&
      collectionFormSource.includes('collectionCategoryOptions') &&
      collectionFormSource.includes('name="category"'),
    'Collection category should be edited through a fixed dropdown'
  );
  assert.equal(
    collectionFormSource.includes('placeholder="champion"'),
    false,
    'Collection category should no longer be a free text field'
  );
});

test('bespoke shuffle uses the Collection item pool and repeats only when there are fewer images than slots', () => {
  assert.ok(
    source.includes('const displayItems = useMemo(() => items, [items])'),
    'Bespoke display items should come directly from Collection CMS records'
  );
  assert.ok(
    source.includes('const filteredItems = useMemo(') && source.includes('displayItems.filter'),
    'Bespoke filtering should operate on the Collection display pool'
  );
  assert.ok(
    source.includes('const canvasItems = bespokeCanvasPlacements.map((placement, index) => ({') &&
      source.includes('item: items[index % items.length]'),
    'Canvas should fill all slots, reusing items only when the pool is smaller than the placement count'
  );
});

test('collection stage product artwork uses the original transparent PNG proportions', () => {
  assert.ok(
    source.includes("{background: 'bg1.jpg', product: 'c1.png', productWidth: 1672, productHeight: 941"),
    'the first ring product should use the real c1.png dimensions'
  );
  assert.ok(
    source.includes("{background: 'bg3.jpg', product: 'c2.png', productWidth: 1672, productHeight: 941"),
    'the second product should use the real c2.png dimensions'
  );
  assert.ok(
    source.includes("{background: 'bg2.jpg', product: 'c3.png', productWidth: 1535, productHeight: 1024"),
    'the third product should use the real c3.png dimensions'
  );
  assert.ok(
    stageImageSource.includes('width={artwork.productWidth}') &&
      stageImageSource.includes('height={artwork.productHeight}'),
    'Next Image should receive the original product dimensions instead of a square placeholder ratio'
  );
});

test('collection stage cards restore category description copy with Patek-like text scale', () => {
  assert.ok(stagePanelSource.includes('description'), 'CollectionStagePanel should accept category description text');
  assert.ok(
    stagePanelSource.includes('text-[clamp(16px,1.02vw,21px)]'),
    'category description should use the small uppercase scale from the Patek reference'
  );
  assert.ok(
    stagePanelSource.includes('text-[clamp(34px,2.15vw,46px)]'),
    'category title should use a restrained Patek-like headline scale'
  );
});

test('collection stage text is left aligned and CTA uses the original link style', () => {
  assert.ok(
    stagePanelSource.includes('link-sweep inline-flex min-h-11'),
    'stage CTA should use the original text-link styling'
  );
  assert.equal(
    stagePanelSource.includes('rounded-full'),
    false,
    'stage CTA should not use the capsule button styling'
  );
  assert.equal(
    stagePanelSource.includes('text-right'),
    false,
    'stage text should remain left aligned even when positioned on the right side'
  );
});

test('collection stage panels fill the desktop viewport like the reference', () => {
  assert.ok(
    stagePanelSource.includes('min-h-[100svh]'),
    'stage panels should fill the viewport without exposing the next section'
  );
  assert.ok(
    stagePanelSource.includes('max-lg:pt-[42svh]'),
    'mobile and tablet stage text should be pushed below the product image'
  );
});

test('collection stage product artwork is separated from text on mobile and tablet', () => {
  assert.ok(
    stageImageSource.includes('max-lg:top-[12svh]') && stageImageSource.includes('max-lg:h-[30svh]'),
    'mobile and tablet product artwork should sit above the text instead of overlapping it'
  );
  assert.ok(
    source.includes("productClassName: 'collection-stage-product--c1'") &&
      globals.includes('.collection-stage-product--c1') &&
      globals.includes('flex-shrink: 0') &&
      globals.includes('max-height: none !important') &&
      globals.includes('@media (max-width: 1023px)'),
    'the first ring artwork should compensate for its left-weighted transparent canvas on desktop and mobile'
  );
});

test('collection stage product artwork uses Patek-like side proportions', () => {
  assert.ok(
    stageImageSource.includes('right-[28%]') && stageImageSource.includes('left-[24%]'),
    'product artwork should move slightly toward the text side'
  );
  assert.ok(
    stageImageSource.includes('left-[clamp(32px,4vw,96px)]') &&
      stageImageSource.includes('right-[clamp(32px,4vw,96px)]'),
    'product artwork should avoid negative desktop offsets that crop the product'
  );
  assert.ok(
    stageImageSource.includes('max-h-[88svh]') && stageImageSource.includes('max-w-full'),
    'product artwork should preserve full visibility across responsive viewports'
  );
  assert.ok(
    source.includes('productClassName?: string') &&
      stageImageSource.includes('artwork.productClassName'),
    'asset-specific positioning should stay in the artwork mapping instead of hard-coded image conditionals'
  );
});
