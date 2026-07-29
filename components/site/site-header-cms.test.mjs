import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const catalog = JSON.parse(
  readFileSync(new URL('../../lib/cms/page-catalog.json', import.meta.url), 'utf8')
);
const koMessages = JSON.parse(
  readFileSync(new URL('../../messages/ko.json', import.meta.url), 'utf8')
);
const enMessages = JSON.parse(
  readFileSync(new URL('../../messages/en.json', import.meta.url), 'utf8')
);
const footerAdminSource = readFileSync(
  new URL('../../app/admin/(dashboard)/footer/page.tsx', import.meta.url),
  'utf8'
);
const headerSource = readFileSync(new URL('./site-header.tsx', import.meta.url), 'utf8');
const globalStyles = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');

const headerTextPaths = [
  'navigation.brandLabel',
  'navigation.primaryLabel',
  'navigation.mobileLabel',
  'navigation.languageSwitcherLabel',
  'navigation.languageLabels.ko',
  'navigation.languageLabels.en',
  'navigation.openMenu',
  'navigation.closeMenu',
  'navigation.logoHome',
  'navigation.submenuLabel',
  'navigation.expand',
  'navigation.collapse',
  'navigation.contactCta',
  'navigation.items.home',
  'navigation.items.chronicle',
  'navigation.items.legacy',
  'navigation.items.loyalty',
  'navigation.items.credibility',
  'navigation.items.achievement',
  'navigation.items.specialty',
  'navigation.items.technique',
  'navigation.items.making',
  'navigation.items.collection',
  'navigation.items.news',
  'navigation.items.golf',
  'navigation.mega.legacy.eyebrow',
  'navigation.mega.legacy.title',
  'navigation.mega.legacy.descriptions.loyalty',
  'navigation.mega.legacy.descriptions.credibility',
  'navigation.mega.legacy.descriptions.achievement',
  'navigation.mega.specialty.eyebrow',
  'navigation.mega.specialty.title',
  'navigation.mega.specialty.descriptions.technique',
  'navigation.mega.specialty.descriptions.making',
  'navigation.mega.specialty.descriptions.collection'
];

test('every header text value has locale defaults and a CMS field', () => {
  const common = catalog.find((page) => page.pageKey === 'common');

  assert.ok(common);
  const fieldPaths = new Set(common.fields.map((field) => field.path));

  for (const path of headerTextPaths) {
    const messagePath = `common.${path}`;

    assert.equal(
      typeof valueAtPath(koMessages, messagePath),
      'string',
      `Missing Korean ${messagePath}`
    );
    assert.equal(
      typeof valueAtPath(enMessages, messagePath),
      'string',
      `Missing English ${messagePath}`
    );
    assert.ok(fieldPaths.has(path), `Missing CMS field ${path}`);
    assert.match(
      footerAdminSource,
      new RegExp(`['"]${escapeRegExp(path)}['"]`),
      `Admin navigation section is missing ${path}`
    );
  }
});

test('header renders CMS-managed brand and language labels without hard-coded defaults', () => {
  assert.doesNotMatch(headerSource, /localeShortLabels/);
  assert.doesNotMatch(headerSource, />\s*DAEHO\s*</);
  assert.match(headerSource, /navText\('brandLabel'\)/);
  assert.match(headerSource, /navText\(`languageLabels\.\$\{targetLocale\}`\)/);
});

test('Korean header styles strengthen all copy and the desktop dropdown has a full border', () => {
  assert.match(headerSource, /site-header--\$\{locale\}/);
  assert.match(headerSource, /site-header-brand/);
  assert.match(headerSource, /site-header-actions/);
  assert.match(headerSource, /site-header-mega-eyebrow/);
  assert.match(headerSource, /site-header-mega-title/);
  assert.match(headerSource, /site-header-mega-description/);
  assert.match(headerSource, /site-header-mobile-nav-label/);
  assert.match(headerSource, /site-header-mega-menu[^"]*\bborder\b/);
  assert.doesNotMatch(headerSource, /site-header-mega-menu[^"]*\bborder-t\b/);
  assert.match(
    globalStyles,
    /\.site-header--ko \.site-nav-link\s*\{[\s\S]*?font-size:\s*14px;[\s\S]*?font-weight:\s*600;/
  );
  assert.match(
    globalStyles,
    /\.site-header--ko \.site-header-mega-description\s*\{[\s\S]*?font-size:\s*15px;[\s\S]*?font-weight:\s*500;[\s\S]*?color:\s*rgba\(16,\s*29,\s*48,\s*\.82\);/
  );
  assert.match(
    globalStyles,
    /\.site-header--ko \.mobile-external-site-link\s*\{[\s\S]*?font-size:\s*14px;[\s\S]*?font-weight:\s*600;/
  );
});

function valueAtPath(value, path) {
  return path.split('.').reduce((current, segment) => current?.[segment], value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
