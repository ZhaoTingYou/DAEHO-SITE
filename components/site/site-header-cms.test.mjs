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

function valueAtPath(value, path) {
  return path.split('.').reduce((current, segment) => current?.[segment], value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

void headerSource;
void globalStyles;
