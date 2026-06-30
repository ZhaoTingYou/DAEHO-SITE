import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const koMessages = JSON.parse(readFileSync(new URL('../../messages/ko.json', import.meta.url), 'utf8'));
const cmsPreview = JSON.parse(readFileSync(new URL('../../data/cms-preview.json', import.meta.url), 'utf8'));

function getPreviewTerms() {
  const row = cmsPreview.tables.cms_pages.find((entry) => entry.page_key === 'terms');
  assert.ok(row, 'cms-preview should include the terms page');
  return JSON.parse(row.content_ko);
}

function assertDaehoShopTerms(content) {
  assert.equal(content.title, '이용약관');
  assert.equal(content.effective, '시행일: 2011-09-04');
  assert.equal(content.notice, '');
  assert.equal(content.intro, '');
  assert.equal(content.sections.length, 27);
  assert.equal(content.sections[0].heading, '제1조 (목적)');
  assert.match(content.sections[0].body[0], /온라인샵/);
  assert.match(content.sections[0].body[0], /온라인 샵/);
  assert.equal(content.sections.at(-1).heading, '<부칙>');
  assert.match(content.sections.at(-1).body.join('\n'), /2011년 09월 04일/);
}

test('Korean static terms use the DAEHO Briano online shop agreement', () => {
  assertDaehoShopTerms(koMessages.legalPages.terms);
});

test('static CMS preview terms use the same DAEHO Briano online shop agreement', () => {
  assertDaehoShopTerms(getPreviewTerms());
});
