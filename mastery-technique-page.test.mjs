import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)));

function loadTechniqueVisibilityNormalizer() {
  const sourcePath = path.join(repoRoot, 'lib/public-page-visibility-core.ts');
  const source = readFileSync(sourcePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;
  const exports = {};
  const sandbox = {exports, module: {exports}};

  vm.runInNewContext(compiled, sandbox, {filename: sourcePath});
  return sandbox.module.exports;
}

const techniquePagePath = new URL('./app/[locale]/(site)/mastery/technique/page.tsx', import.meta.url);
const techniqueCarouselPath = new URL('./components/specialty/technique-carousel-section.tsx', import.meta.url);
const techniquePageSource = readFileSync(techniquePagePath, 'utf8');
const techniqueCarouselSource = existsSync(techniqueCarouselPath)
  ? readFileSync(techniqueCarouselPath, 'utf8')
  : '';
const makingPageSource = readFileSync(new URL('./app/[locale]/(site)/mastery/making/page.tsx', import.meta.url), 'utf8');
const siteMapSource = readFileSync(new URL('./lib/site-map.ts', import.meta.url), 'utf8');
const footerSource = readFileSync(new URL('./components/site/site-footer.tsx', import.meta.url), 'utf8');
const visibilitySource = readFileSync(new URL('./lib/public-page-visibility.ts', import.meta.url), 'utf8');
const seoSource = readFileSync(new URL('./lib/seo.ts', import.meta.url), 'utf8');
const sitemapSource = readFileSync(new URL('./app/sitemap.ts', import.meta.url), 'utf8');
const imageGuidesSource = readFileSync(new URL('./lib/cms/image-guides.ts', import.meta.url), 'utf8');
const localeMessagesSource = readFileSync(new URL('./lib/locale-messages.ts', import.meta.url), 'utf8');
const pageCatalog = JSON.parse(readFileSync(new URL('./lib/cms/page-catalog.json', import.meta.url), 'utf8'));
const koMessages = JSON.parse(readFileSync(new URL('./messages/ko.json', import.meta.url), 'utf8'));
const enMessages = JSON.parse(readFileSync(new URL('./messages/en.json', import.meta.url), 'utf8'));

test('Mastery has a standalone Technique page separate from Making', () => {
  assert.equal(existsSync(techniquePagePath), true);

  assert.match(techniquePageSource, /getPageMetadata\(locale, 'techniqueRecords'\)/);
  assert.match(techniquePageSource, /specialtyPages\.techniqueRecords/);
  assert.doesNotMatch(techniquePageSource, /SpecialtyProcess/);
  assert.match(makingPageSource, /specialtyPages\.technique/);
  assert.match(makingPageSource, /SpecialtyProcess/);
});

test('Technique is enabled in public navigation before Making and Creations', () => {
  const navTechnique = siteMapSource.indexOf("id: 'technique'");
  const navMaking = siteMapSource.indexOf("id: 'making'");
  const navCollection = siteMapSource.indexOf("id: 'collection'");

  assert.match(visibilitySource, /isTechniquePageVisible = true/);
  assert.ok(navTechnique >= 0, 'the restorable Technique definition should remain');
  assert.ok(navMaking > navTechnique, 'Making should follow the gated Technique definition');
  assert.ok(navCollection > navMaking, 'Creations should follow Making');
  assert.match(siteMapSource, /isTechniquePageVisible[\s\S]*?href: '\/mastery\/technique'/);
  assert.match(siteMapSource, /href: '\/mastery\/making'/);
  assert.match(footerSource, /isTechniquePageVisible[\s\S]*?navHref\('technique', '\/mastery\/technique'\)/);
  assert.match(footerSource, /navHref\('making', '\/mastery\/making'\)/);
  assert.equal((techniquePageSource.match(/if \(!isTechniquePageVisible\) \{\s+notFound\(\);/g) ?? []).length, 2);
  assert.match(localeMessagesSource, /normalizeTechniquePageVisibility\(messages, isTechniquePageVisible\)/);
  assert.equal(koMessages.home.pillars.items.find((item) => item.title === 'MASTERY')?.href, '/mastery/technique');
  assert.equal(enMessages.home.pillars.items.find((item) => item.title === 'MASTERY')?.href, '/mastery/technique');
});

test('Technique visibility normalizer reroutes and filters CMS-overridden public links only while hidden', () => {
  const {normalizeTechniquePageVisibility} = loadTechniqueVisibilityNormalizer();
  const createMessages = () => ({
    home: {
      pillars: {
        items: [
          {title: 'MASTERY', href: '/mastery/technique'},
          {title: 'NEWS', href: '/news'}
        ]
      }
    },
    specialty: {
      branches: {
        items: [
          {title: 'TECHNIQUE', href: '/mastery/technique'},
          {title: 'CREATIONS', href: '/mastery/creations'}
        ]
      }
    }
  });
  const visibleMessages = createMessages();
  const hiddenMessages = createMessages();

  normalizeTechniquePageVisibility(visibleMessages, true);
  normalizeTechniquePageVisibility(hiddenMessages, false);

  assert.equal(visibleMessages.home.pillars.items[0].href, '/mastery/technique');
  assert.deepEqual(
    visibleMessages.specialty.branches.items.map((item) => item.href),
    ['/mastery/technique', '/mastery/creations']
  );
  assert.equal(hiddenMessages.home.pillars.items[0].href, '/mastery/making');
  assert.deepEqual(
    hiddenMessages.specialty.branches.items.map((item) => item.href),
    ['/mastery/creations']
  );
});

test('CMS common copy cannot keep stale Making labels on the new Technique nav item', () => {
  assert.match(localeMessagesSource, /normalizeMasteryNavigationCopy/);
  assert.match(localeMessagesSource, /items\.technique === items\.making/);
  assert.match(localeMessagesSource, /descriptions\.technique === descriptions\.making/);
  assert.match(localeMessagesSource, /Technique · Seven careful stages/);
});

test('Technique page keeps only Hero and carousel CMS fields while sitemap exposure remains enabled', () => {
  const techniqueDefinition = pageCatalog.find((page) => page.pageKey === 'mastery-technique');

  assert.equal(techniqueDefinition?.href, '/mastery/technique');
  assert.equal(techniqueDefinition?.sourcePath, 'specialtyPages.techniqueRecords');
  assert.deepEqual(
    techniqueDefinition.fields.map((field) => field.path),
    [
      'hero.eyebrow',
      'hero.title',
      'hero.body',
      'hero.image',
      'records.items'
    ]
  );
  assert.match(seoSource, /techniqueRecords: 'mastery-technique'/);
  assert.match(seoSource, /techniqueRecords: '\/mastery\/technique'/);
  assert.match(sitemapSource, /isTechniquePageVisible \? \['\/mastery\/technique'\] : \[\]/);
  assert.match(sitemapSource, /'\/mastery\/technique': 0\.91/);
  assert.match(imageGuidesSource, /'mastery-technique\|main\|hero\.image': 'ultrawide'/);
  assert.match(imageGuidesSource, /'mastery-technique\|main\|records\.items\.\*\.image': 'techniqueCarousel'/);
  assert.doesNotMatch(JSON.stringify(techniqueDefinition), /standards|evidence|cta|records\.eyebrow|records\.title/);
});

test('Technique copy exposes exactly three clean initial carousel items without retired content', () => {
  for (const messages of [koMessages, enMessages]) {
    const content = messages.specialtyPages.techniqueRecords;

    assert.ok(content, 'Technique carousel copy should exist');
    assert.equal(content.hero.title, 'TECHNIQUE');
    assert.deepEqual(Object.keys(content).sort(), ['hero', 'records']);
    assert.deepEqual(Object.keys(content.records), ['items']);
    assert.equal(content.records.items.length, 3);
    assert.ok(content.records.items.every((item) => item.id && item.image && item.title && item.body));
    assert.ok(
      content.records.items.every(
        (item) => JSON.stringify(Object.keys(item).sort()) === JSON.stringify(['body', 'id', 'image', 'title'])
      )
    );
  }

  assert.doesNotMatch(koMessages.specialtyPages.techniqueRecords.hero.body, /국내 유일|유일하게|확정/);
  assert.doesNotMatch(enMessages.specialtyPages.techniqueRecords.hero.body, /only maker|first in Korea/i);
});

test('Technique page keeps the complete Hero and replaces every lower section with the client carousel', () => {
  assert.equal(existsSync(techniqueCarouselPath), true, 'TechniqueCarouselSection should have its own module');
  assert.match(techniqueCarouselSource, /['"]use client['"]/);
  assert.match(techniqueCarouselSource, /export function TechniqueCarouselSection\(/);
  assert.match(
    techniquePageSource,
    /import \{TechniqueCarouselSection\} from '@\/components\/specialty\/technique-carousel-section';/
  );
  assert.match(techniquePageSource, /<section className="relative z-10 pt-28">/);
  assert.match(techniquePageSource, /aspect="aspect-\[21\/9\]"/);
  assert.match(
    techniquePageSource,
    /<TechniqueCarouselSection[\s\S]*?items=\{content\.records\.items\}[\s\S]*?\/>/
  );
  assert.doesNotMatch(techniquePageSource, /content\.(standards|evidence|cta)|<Link|TechniqueRecordsSection/);
});

test('Technique carousel uses Embla looped dragging with arrows, dots, keyboard, and no autoplay', () => {
  assert.match(techniqueCarouselSource, /from 'embla-carousel-react'/);
  assert.match(techniqueCarouselSource, /useEmblaCarousel\(\{/);
  assert.match(techniqueCarouselSource, /loop:\s*true/);
  assert.match(techniqueCarouselSource, /align:\s*'center'/);
  assert.match(techniqueCarouselSource, /scrollPrev\(\)|scrollNext\(\)|scrollTo\(index\)/);
  assert.match(techniqueCarouselSource, /onKeyDown/);
  assert.match(techniqueCarouselSource, /event\.key === 'ArrowLeft'|event\.key === 'ArrowRight'/);
  assert.doesNotMatch(techniqueCarouselSource, /autoplay|setInterval|setTimeout/);
});

test('Technique carousel renders dynamic 2:1 slides with center sizing and side previews at every breakpoint', () => {
  assert.match(techniqueCarouselSource, /items:\s*TechniqueCarouselItem\[\]/);
  assert.match(techniqueCarouselSource, /items\.map\(\(item, index\) =>/);
  assert.match(techniqueCarouselSource, /key=\{item\.id\}/);
  assert.match(techniqueCarouselSource, /aspect="aspect-\[2\/1\]"/);
  assert.match(techniqueCarouselSource, /basis-\[84vw\]/);
  assert.match(techniqueCarouselSource, /md:basis-\[84vw\]/);
  assert.match(techniqueCarouselSource, /lg:basis-\[min\(74vw,1920px\)\]/);
  assert.match(techniqueCarouselSource, /gap-3 md:gap-4 lg:gap-6/);
  assert.match(techniqueCarouselSource, /overflow-hidden/);
});

test('Technique carousel caption and controls remain accessible and contain no navigation links', () => {
  assert.match(techniqueCarouselSource, /aria-live="polite"/);
  assert.match(techniqueCarouselSource, /aria-current=\{index === selectedIndex \? 'true' : undefined\}/);
  assert.match(techniqueCarouselSource, /min-h-11 min-w-11/);
  assert.match(techniqueCarouselSource, /usePrefersReducedMotion/);
  assert.match(techniqueCarouselSource, /\{activeItem\.title\}/);
  assert.match(techniqueCarouselSource, /\{activeItem\.body\}/);
  assert.doesNotMatch(techniqueCarouselSource, /<Link|href=|autoPlay/);
});

test('Technique carousel uses localized labels from the page without exposing a visible intro heading', () => {
  assert.match(techniquePageSource, /carouselLabel=\{locale === 'ko'/);
  assert.match(techniquePageSource, /previousLabel=\{locale === 'ko'/);
  assert.match(techniquePageSource, /nextLabel=\{locale === 'ko'/);
  assert.match(techniquePageSource, /goToSlideLabel=\{locale === 'ko'/);
  assert.doesNotMatch(techniquePageSource, /content\.records\.(eyebrow|title)/);
});
