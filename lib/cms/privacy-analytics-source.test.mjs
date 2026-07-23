import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const readJson = (path) => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'));

test('Korean and English privacy policies disclose consent-gated Google Analytics', () => {
  const existingTermsDates = {ko: '2011-09-04', en: '2026-06-27'};

  for (const locale of ['ko', 'en']) {
    const legalPages = readJson(`messages/${locale}.json`).legalPages;
    const privacy = legalPages.privacy;
    const policyText = JSON.stringify(privacy);

    assert.match(policyText, /Google Analytics/);
    assert.match(policyText, /_ga/);
    assert.match(policyText, /14/);
    assert.doesNotMatch(policyText, /향후 방문 통계|uses visit statistics.*in the future/i);
    assert.match(privacy.effective, /2026-07-23/);
    assert.match(legalPages.terms.effective, new RegExp(existingTermsDates[locale]));
  }
});
