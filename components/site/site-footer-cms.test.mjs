import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function readText(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function getPreviewCommonFooter(locale) {
  const snapshot = readJson('data/cms-preview.json');
  const commonPage = snapshot.tables.cms_pages.find((page) => page.page_key === 'common');
  assert.ok(commonPage, 'common page must exist in the static CMS preview');
  const content = JSON.parse(commonPage[`content_${locale}`]);
  return content.__groups.main.footer;
}

function businessValues(footer) {
  return new Map(footer.business.items.map((item) => [item.label, item.value]));
}

const officialKoBusiness = [
  ['상담/주문 전화', '02-765-2737'],
  ['상담/주문 이메일', 'dhofficial1988@gmail.com'],
  ['CS운영시간', '10:00~18:00 | 주말, 공휴일 휴무'],
  ['상호명', '(주)대호 브리아노'],
  ['대표자명', '김충일'],
  ['사업장 주소', '03139 서울 종로구 율곡로 22나길 19-15 3층'],
  ['대표 전화', '02-765-2737'],
  ['사업자 등록번호', '101-86-47224'],
  ['통신판매업 신고번호', '2009-서울종로-0556호 [사업자정보확인]'],
  ['개인정보보호책임자', '김정희']
];

test('footer default copy contains the official DAEHO business information', () => {
  const koFooter = readJson('messages/ko.json').common.footer;
  const enFooter = readJson('messages/en.json').common.footer;
  const koValues = businessValues(koFooter);
  const enValues = businessValues(enFooter);

  for (const [label, value] of officialKoBusiness) {
    assert.equal(koValues.get(label), value);
  }

  assert.equal(koFooter.legal.rights, 'Copyright © 브리아노. All Rights Reserved.');
  assert.equal(enValues.get('Consultation/order phone'), '02-765-2737');
  assert.equal(enValues.get('Consultation/order email'), 'dhofficial1988@gmail.com');
  assert.equal(enValues.get('Business registration no.'), '101-86-47224');
  assert.equal(enFooter.legal.rights, 'Copyright © Briano. All Rights Reserved.');
});

test('footer CMS catalog and editor expose every business info item', () => {
  const koFooter = readJson('messages/ko.json').common.footer;
  const pageCatalog = readJson('lib/cms/page-catalog.json');
  const commonPage = pageCatalog.find((page) => page.pageKey === 'common');
  const editorSource = readText('app/admin/(dashboard)/footer/page.tsx');

  assert.ok(commonPage, 'common page definition must exist');

  koFooter.business.items.forEach((_, index) => {
    const labelPath = `footer.business.items.${index}.label`;
    const valuePath = `footer.business.items.${index}.value`;

    assert.ok(commonPage.fields.some((field) => field.path === labelPath), `${labelPath} must be in page-catalog`);
    assert.ok(commonPage.fields.some((field) => field.path === valuePath), `${valuePath} must be in page-catalog`);
    assert.match(editorSource, new RegExp(`['"]${labelPath}['"]`), `${labelPath} must be rendered by /admin/footer`);
    assert.match(editorSource, new RegExp(`['"]${valuePath}['"]`), `${valuePath} must be rendered by /admin/footer`);
  });
});

test('static CMS preview footer stays aligned with official business information', () => {
  const previewFooter = getPreviewCommonFooter('ko');
  const previewValues = businessValues(previewFooter);

  for (const [label, value] of officialKoBusiness) {
    assert.equal(previewValues.get(label), value);
  }

  assert.equal(previewFooter.legal.rights, 'Copyright © 브리아노. All Rights Reserved.');
});
