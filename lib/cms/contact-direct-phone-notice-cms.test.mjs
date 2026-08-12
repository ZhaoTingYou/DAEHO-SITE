import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const koMessages = JSON.parse(readFileSync(new URL('../../messages/ko.json', import.meta.url), 'utf8'));
const enMessages = JSON.parse(readFileSync(new URL('../../messages/en.json', import.meta.url), 'utf8'));
const pageCatalog = JSON.parse(readFileSync(new URL('./page-catalog.json', import.meta.url), 'utf8'));
const cmsPreview = JSON.parse(readFileSync(new URL('../../data/cms-preview.json', import.meta.url), 'utf8'));

const expectedKo = {
  before: 'B2B 주문 및 기업 고객은 직통전화',
  phone: '010 4325 0369',
  after: '로도 상담하실 수 있습니다.'
};

const expectedEn = {
  before: 'B2B orders and corporate customers can also reach us directly at',
  phone: '010 4325 0369',
  after: '.'
};

test('Contact direct-phone notice has bilingual defaults', () => {
  assert.deepEqual(koMessages.contact.directPhone, expectedKo);
  assert.deepEqual(enMessages.contact.directPhone, expectedEn);
});

test('Contact CMS exposes each direct-phone notice fragment in the main group', () => {
  const contactDefinition = pageCatalog.find((page) => page.pageKey === 'contact');
  const mainPaths = contactDefinition.fields
    .filter((field) => field.groupKey === 'main')
    .map((field) => field.path);

  assert.ok(mainPaths.includes('directPhone.before'));
  assert.ok(mainPaths.includes('directPhone.phone'));
  assert.ok(mainPaths.includes('directPhone.after'));
});

test('frontend-only Contact snapshot carries the bilingual direct-phone notice', () => {
  const contactPage = cmsPreview.tables.cms_pages.find((page) => page.page_key === 'contact');
  const koContent = JSON.parse(contactPage.content_ko);
  const enContent = JSON.parse(contactPage.content_en);

  assert.deepEqual(koContent.__groups.main.directPhone, expectedKo);
  assert.deepEqual(enContent.__groups.main.directPhone, expectedEn);
});
