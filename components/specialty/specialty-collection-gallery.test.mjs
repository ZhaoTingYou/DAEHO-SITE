import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./specialty-collection-gallery.tsx', import.meta.url), 'utf8');
const globals = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');
const detailPageSource = readFileSync(
  new URL('../../app/[locale]/(site)/mastery/creations/[slug]/page.tsx', import.meta.url),
  'utf8'
);
const detailGallerySource = readFileSync(new URL('./collection-detail-gallery.tsx', import.meta.url), 'utf8');
const historyBackButtonUrl = new URL('../navigation/history-back-button.tsx', import.meta.url);
const historyBackButtonSource = existsSync(historyBackButtonUrl)
  ? readFileSync(historyBackButtonUrl, 'utf8')
  : '';
const koMessages = JSON.parse(readFileSync(new URL('../../messages/ko.json', import.meta.url), 'utf8'));
const enMessages = JSON.parse(readFileSync(new URL('../../messages/en.json', import.meta.url), 'utf8'));
const pageCatalog = JSON.parse(readFileSync(new URL('../../lib/cms/page-catalog.json', import.meta.url), 'utf8'));
const cmsPreview = JSON.parse(readFileSync(new URL('../../data/cms-preview.json', import.meta.url), 'utf8'));
const publicContentSource = readFileSync(new URL('../../lib/cms/public-content.ts', import.meta.url), 'utf8');
const adminActionsSource = readFileSync(new URL('../../app/admin/actions.ts', import.meta.url), 'utf8');
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
const mobileCollectionSource = source.slice(
  source.indexOf('type MobileCollectionActDirection'),
  source.indexOf('export function SpecialtyCollectionCategory(')
);
const galleryEntrySource = source.slice(
  source.indexOf('export function SpecialtyCollectionGallery('),
  source.indexOf('function MobileCollectionActs(')
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

test('creations subpage back arrows do not render the link sweep underline', () => {
  assert.ok(
    globals.includes('.link-sweep.no-underline::after') && globals.includes('display: none'),
    'global link sweep underline should be disabled by the no-underline modifier'
  );

  const collectionBackArrows = Array.from(
    source.matchAll(/className="([^"]*link-sweep[^"]*)"[\s\S]*?<span aria-hidden="true">←<\/span>/g),
    ([, className]) => className
  );

  assert.equal(collectionBackArrows.length, 4, 'category views should expose four back arrow links');
  for (const className of collectionBackArrows) {
    assert.ok(className.includes('no-underline'), `back arrow should opt out of underline: ${className}`);
  }

  const detailBackArrow = detailPageSource.match(
    /<HistoryBackButton[\s\S]*?className="([^"]*link-sweep[^"]*)"/
  )?.[1] ?? '';
  assert.ok(detailBackArrow.includes('no-underline'), 'detail page back arrow should opt out of underline');
});

test('collection detail back arrow returns to browser history with a localized direct-entry fallback', () => {
  assert.ok(
    detailPageSource.includes('<HistoryBackButton'),
    'collection details should render the history-aware back button'
  );
  assert.ok(
    detailPageSource.includes("fallbackHref={resolveCmsHref(locale, text.backHref, '/mastery/creations')}"),
    'direct detail visits should retain a CMS-editable localized Creations fallback'
  );
  assert.ok(historyBackButtonSource.includes("'use client'"), 'history navigation requires a client component');
  assert.ok(
    historyBackButtonSource.includes('window.history.length > 1') &&
      historyBackButtonSource.includes('router.back()'),
    'the button should return to the actual previous history entry when one exists'
  );
  assert.ok(
    historyBackButtonSource.includes('router.push(fallbackHref)'),
    'the button should use its safe fallback when no previous entry exists'
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

test('collection mobile entry renders three cinematic acts as full-section links', () => {
  assert.match(mobileCollectionSource, /type MobileCollectionActDirection/);
  assert.match(mobileCollectionSource, /function getMobileCollectionActDirection/);
  assert.match(mobileCollectionSource, /champion:[\s\S]*Victory · Legacy/);
  assert.match(mobileCollectionSource, /appointment:[\s\S]*Memory · Honor/);
  assert.match(mobileCollectionSource, /bespoke:[\s\S]*Story · Craft/);
  assert.match(mobileCollectionSource, /min-h-\[max\(84dvh,560px\)\]/);
  assert.match(mobileCollectionSource, /aria-label=\{`\$\{category\.label\} · \$\{viewLabel\}`\}/);
  assert.match(mobileCollectionSource, /<h2[\s\S]*\{category\.label\}[\s\S]*<\/h2>/);
  assert.match(mobileCollectionSource, /\{category\.description\}/);
  assert.match(mobileCollectionSource, /mobile-tap-target/);
  assert.match(mobileCollectionSource, /viewBox="0 0 20 20"/);
  assert.doesNotMatch(mobileCollectionSource, /MobileCollectionCard|mobile-collection-card|frameClassName/);
  assert.doesNotMatch(mobileCollectionSource, /line-clamp/);
});

test('collection mobile acts keep CSS fallbacks, responsive artwork, and reduced motion', () => {
  assert.match(mobileCollectionSource, /style=\{\{backgroundImage: direction\.backgroundImage\}\}/);
  assert.match(mobileCollectionSource, /category\.item \?/);
  assert.match(mobileCollectionSource, /alt=""/);
  assert.match(mobileCollectionSource, /priority=\{index === 0\}/);
  assert.match(mobileCollectionSource, /sizes="\(min-width: 1024px\) 0px, 100vw"/);
  assert.match(mobileCollectionSource, /initial=\{reducedMotion \? false : \{opacity: 0, y: 24\}\}/);
  assert.match(mobileCollectionSource, /viewport=\{\{once: true, amount: 0\.18\}\}/);
  assert.match(mobileCollectionSource, /motion-reduce:transition-none/);
  assert.match(mobileCollectionSource, /Made to be remembered\./);
  assert.match(galleryEntrySource, /className="hidden lg:grid"/);
});

test('collection detail gallery keeps reachable working previous and next controls', () => {
  assert.match(detailGallerySource, /const selectPrevious/);
  assert.match(detailGallerySource, /const selectNext/);
  assert.match(detailGallerySource, /onClick=\{selectPrevious\} className="mobile-tap-target/);
  assert.match(detailGallerySource, /onClick=\{selectNext\} className="mobile-tap-target/);
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

test('collection detail keeps only the work story beside the gallery and removes retired sections', () => {
  const retiredDetailKeys = [
    'specs',
    'material',
    'stones',
    'year',
    'madeFor',
    'placeholder',
    'detailStrip',
    'processTitle',
    'processCta',
    'processHref'
  ];

  assert.ok(
    detailPageSource.includes('{text.story}') &&
      detailPageSource.includes('{item.story || item.caption}'),
    'the work story should remain beside the collection gallery'
  );
  assert.equal(detailPageSource.includes('const specs = ['), false, 'the right column should not render work specs');
  assert.equal(detailPageSource.includes('detailStripImages'), false, 'the detail studies strip should be removed');
  assert.equal(detailPageSource.includes('text.processTitle'), false, 'the applied process section should be removed');
  assert.equal(publicContentSource.includes('normalizeCollectionDetailImages'), false, 'retired detail images should not remain in the public model');

  for (const messages of [koMessages, enMessages]) {
    for (const retiredKey of retiredDetailKeys) {
      assert.equal(
        Object.hasOwn(messages.collectionUi.detail, retiredKey),
        false,
        `collection detail copy should not retain ${retiredKey}`
      );
    }
  }

  const creationsPage = pageCatalog.find((page) => page.pageKey === 'mastery-creations');
  const detailFieldPaths = creationsPage.fields
    .filter((field) => field.groupKey === 'collectionUi' && field.path.startsWith('detail'))
    .map((field) => field.path);

  assert.equal(detailFieldPaths.includes('detail'), false, 'CMS should not expose the retired detail JSON blob');
  assert.equal(detailFieldPaths.includes('detail.processHref'), false, 'CMS should not expose the retired process link');
  assert.ok(detailFieldPaths.includes('detail.story'), 'the remaining work-story label should stay editable');

  const retiredCmsPaths = creationsPage.retiredFields
    .filter((field) => field.groupKey === 'collectionUi')
    .map((field) => field.path);
  assert.deepEqual(
    retiredCmsPaths,
    retiredDetailKeys.map((key) => `detail.${key}`),
    'CMS saves should explicitly prune every retired Collection detail value'
  );
  assert.ok(
    adminActionsSource.includes('pruneObjectPaths(nextContent, retiredPaths)'),
    'the page save flow should prune retired CMS values before persistence'
  );

  const previewRow = cmsPreview.tables.cms_pages.find((row) => row.page_key === 'mastery-creations');
  assert.ok(previewRow, 'the static CMS preview should include the Creations page');

  for (const localeField of ['content_ko', 'content_en']) {
    const previewContent = JSON.parse(previewRow[localeField]);
    const previewDetail = previewContent.__groups.collectionUi.detail;

    for (const retiredKey of retiredDetailKeys) {
      assert.equal(
        Object.hasOwn(previewDetail, retiredKey),
        false,
        `static CMS preview ${localeField} should not retain ${retiredKey}`
      );
    }
  }
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

test('collection stage CTA keeps its hover underline close to the label', () => {
  assert.ok(
    stagePanelSource.includes('collection-stage-cta link-sweep'),
    'stage CTA should expose a page-specific underline positioning hook'
  );
  assert.match(
    globals,
    /\.collection-stage-cta::after\s*\{[^}]*bottom:\s*0\.45rem;/,
    'stage CTA underline should sit close to its centered text without shrinking the tap target'
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
