import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const readJson = (path) => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'));

test('Korean and English privacy policies disclose consent-gated Google and first-party anonymous session analytics', () => {
  const existingTermsDates = {ko: '2011-09-04', en: '2026-06-27'};
  const requiredDisclosures = {
    ko: [
      /Google Analytics/,
      /CMS 데이터베이스/,
      /자사 익명 세션 방문 분석/,
      /익명 세션 ID/,
      /유입 채널·소스/,
      /매체/,
      /캠페인명·콘텐츠/,
      /외부 유입 호스트/,
      /최초·최근 방문 경로/,
      /조회 페이지 제목/,
      /방문·조회 시각/,
      /페이지 조회 수/,
      /언어 및 기기 유형/,
      /IP 주소/,
      /원본 User-Agent/,
      /문의·연락처·각인 내용/,
      /최대 14개월/,
      /동의를 철회하면 Google Analytics와 회사 CMS의 추가 수집이 모두 중지/
    ],
    en: [
      /Google Analytics/,
      /CMS database/,
      /first-party anonymous session analytics/,
      /anonymous session ID/,
      /acquisition channel, source and medium/,
      /medium/,
      /campaign name and content/,
      /external referrer host/,
      /first and most recent visit paths/,
      /viewed-page titles/,
      /visit and page-view times/,
      /page-view count/,
      /language and device class/,
      /IP addresses/,
      /raw User-Agent strings/,
      /inquiry, contact, or engraving content/,
      /up to 14 months/,
      /withdrawing consent stops further Google Analytics and internal CMS collection/
    ]
  };

  for (const locale of ['ko', 'en']) {
    const legalPages = readJson(`messages/${locale}.json`).legalPages;
    const privacy = legalPages.privacy;
    const policyText = JSON.stringify(privacy);

    assert.match(policyText, /_ga/);
    assert.match(policyText, /14/);
    assert.doesNotMatch(policyText, /향후 방문 통계|uses visit statistics.*in the future/i);
    assert.match(privacy.effective, /2026-07-23/);
    assert.match(legalPages.terms.effective, new RegExp(existingTermsDates[locale]));

    for (const disclosure of requiredDisclosures[locale]) {
      assert.match(policyText, disclosure);
    }
  }
});

test('CMS legal-page SEO descriptions with DAEHO Briano names remain unchanged', () => {
  const snapshot = readJson('data/cms-preview.json');
  const pages = snapshot.tables.cms_pages;
  const descriptions = Object.fromEntries(pages.map((page) => [page.page_key, JSON.parse(page.seo_ko).description]));

  assert.equal(descriptions.terms, '대호 브리아노 온라인샵 이용약관입니다.');
  assert.equal(descriptions.privacy, '(주)대호브리아노 개인정보처리방침입니다.');
});
