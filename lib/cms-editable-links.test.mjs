import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import {appendCmsQuery, resolveCmsHref} from './cms-link-core.mjs';

const catalog = JSON.parse(
  readFileSync(new URL('./cms/page-catalog.json', import.meta.url), 'utf8')
);
const koMessages = JSON.parse(
  readFileSync(new URL('../messages/ko.json', import.meta.url), 'utf8')
);
const enMessages = JSON.parse(
  readFileSync(new URL('../messages/en.json', import.meta.url), 'utf8')
);
const localeLayoutSource = readFileSync(
  new URL('../app/[locale]/layout.tsx', import.meta.url),
  'utf8'
);
const siteHeaderSource = readFileSync(
  new URL('../components/site/site-header.tsx', import.meta.url),
  'utf8'
);

const requiredLinkFields = {
  home: [
    'currentPulse.primaryCtaHref',
    'currentPulse.primaryImageHref',
    'currentPulse.secondaryCtaHref',
    'currentPulse.secondaryImageHref',
    'signature.projects.0.href',
    'signature.projects.1.href',
    'signature.projects.2.href'
  ],
  archive: ['endNav.href'],
  'heritage-loyalty': ['copy.ctaHref'],
  'heritage-credibility': ['copy.ctaHref'],
  'heritage-achievement': ['copy.ctaHref'],
  'mastery-technique': [],
  'mastery-making': ['bespoke.href'],
  'mastery-creations': [
    'gallery.filters.[].href',
    'categoryBackHref',
    'detail.backHref',
    'detail.ctaHref'
  ],
  news: ['detail.backHref', 'detail.ctaHref'],
  golf: ['labels.inquiryHref'],
  'golf-inquiry': ['editHref'],
  common: [
    'navigation.hrefs.home',
    'navigation.hrefs.chronicle',
    'navigation.hrefs.legacy',
    'navigation.hrefs.loyalty',
    'navigation.hrefs.credibility',
    'navigation.hrefs.achievement',
    'navigation.hrefs.specialty',
    'navigation.hrefs.technique',
    'navigation.hrefs.making',
    'navigation.hrefs.collection',
    'navigation.hrefs.news',
    'navigation.hrefs.golf',
    'navigation.hrefs.golfInquiry',
    'navigation.hrefs.contact',
    'navigation.hrefs.terms',
    'navigation.hrefs.privacy',
    'footer.collectionCategoryLinks.0.href',
    'footer.collectionCategoryLinks.1.href',
    'footer.collectionCategoryLinks.2.href'
  ]
};

test('every CMS-managed jump destination has an explicit link field', () => {
  for (const [pageKey, expectedPaths] of Object.entries(requiredLinkFields)) {
    const definition = catalog.find((page) => page.pageKey === pageKey);
    assert.ok(definition, `Missing page definition: ${pageKey}`);

    const actualFields = new Map();
    for (const field of definition.fields) {
      actualFields.set(field.path, field.type);
      for (const itemField of field.itemFields ?? []) {
        actualFields.set(`${field.path}.[].${itemField.path}`, itemField.type);
      }
    }

    for (const path of expectedPaths) {
      assert.equal(actualFields.get(path), 'link', `${pageKey} is missing typed link field ${path}`);
    }
  }
});

test('Korean and English fallback content expose matching link destinations', () => {
  const messagePaths = [
    'homeUi.currentPulse.primaryCtaHref',
    'homeUi.currentPulse.primaryImageHref',
    'homeUi.currentPulse.secondaryCtaHref',
    'homeUi.currentPulse.secondaryImageHref',
    'legacyPages.loyalty.copy.ctaHref',
    'legacyPages.credibility.copy.ctaHref',
    'legacyPages.achievement.copy.ctaHref',
    'specialtyPages.technique.bespoke.href',
    'collectionUi.categoryBackHref',
    'collectionUi.detail.backHref',
    'collectionUi.detail.ctaHref',
    'newsUi.detail.backHref',
    'newsUi.detail.ctaHref',
    'golf.labels.inquiryHref',
    'golfInquiry.editHref',
    'common.navigation.hrefs.contact',
    'common.navigation.hrefs.terms',
    'common.navigation.hrefs.privacy'
  ];

  for (const path of messagePaths) {
    assert.equal(typeof valueAtPath(koMessages, path), 'string', `Missing Korean ${path}`);
    assert.equal(typeof valueAtPath(enMessages, path), 'string', `Missing English ${path}`);
  }
});

test('CMS links localize internal paths, preserve external schemes, and reject unsafe URLs', () => {
  assert.equal(resolveCmsHref('ko', '/news', '/'), '/ko/news');
  assert.equal(resolveCmsHref('en', '/', '/news'), '/en');
  assert.equal(resolveCmsHref('ko', '/en/contact', '/news'), '/en/contact');
  assert.equal(resolveCmsHref('ko', 'https://example.com/path', '/news'), 'https://example.com/path');
  assert.equal(resolveCmsHref('ko', 'mailto:hello@example.com', '/news'), 'mailto:hello@example.com');
  assert.equal(resolveCmsHref('ko', 'tel:+821012345678', '/news'), 'tel:+821012345678');
  assert.equal(
    resolveCmsHref('ko', '/contact?item={slug}', '/news', {slug: 'ring 01'}),
    '/ko/contact?item=ring%2001'
  );
  assert.equal(resolveCmsHref('ko', 'javascript:alert(1)', '/news'), '/ko/news');
  assert.equal(
    appendCmsQuery('/ko/golf/inquiry?campaign=summer#form', {head: 'ball', style: 'BASIC'}),
    '/ko/golf/inquiry?campaign=summer&head=ball&style=BASIC#form'
  );
});

test('client navigation receives CMS-merged messages and resolves editable active routes', () => {
  assert.match(localeLayoutSource, /getLocaleMessages\(locale as Locale\)/);
  assert.match(localeLayoutSource, /Promise\.all/);
  assert.match(siteHeaderSource, /navText\.raw\('hrefs'\)/);
  assert.match(siteHeaderSource, /isNavigationItemActive/);
  assert.match(siteHeaderSource, /cmsInternalPath/);
});

function valueAtPath(value, path) {
  return path.split('.').reduce((current, segment) => current?.[segment], value);
}
