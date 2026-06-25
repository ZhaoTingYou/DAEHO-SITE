import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./specialty-collection-gallery.tsx', import.meta.url), 'utf8');
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
    stagePanelSource.includes('max-md:pt-[42svh]'),
    'mobile stage text should be pushed below the product image'
  );
});

test('collection stage product artwork is separated from text on mobile', () => {
  assert.ok(
    stageImageSource.includes('max-md:top-[12svh]') && stageImageSource.includes('max-md:h-[30svh]'),
    'mobile product artwork should sit above the text instead of overlapping it'
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
  assert.equal(
    stageImageSource.includes('max-w-none'),
    false,
    'product artwork should not force overflow beyond its responsive frame'
  );
});
