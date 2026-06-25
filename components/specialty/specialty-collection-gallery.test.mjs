import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./specialty-collection-gallery.tsx', import.meta.url), 'utf8');
const globals = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');
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
