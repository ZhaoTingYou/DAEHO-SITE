import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getVisibleExternalSites,
  parseExternalSitesSubmission
} from './external-sites-core.mjs';

test('submission shares IDs, URLs, state, and order while preserving localized labels', () => {
  const result = parseExternalSitesSubmission(JSON.stringify([
    {id: 'oh', labelKo: '오에이치', labelEn: 'OH', href: 'https://oh.example', enabled: true},
    {id: 'vulcan', labelKo: '불칸', labelEn: 'VULCAN', href: '', enabled: false}
  ]));

  assert.deepEqual(result.ko[0], {
    id: 'oh',
    label: '오에이치',
    href: 'https://oh.example/',
    enabled: true
  });
  assert.deepEqual(result.en[0], {
    id: 'oh',
    label: 'OH',
    href: 'https://oh.example/',
    enabled: true
  });
  assert.deepEqual(result.ko.map((item) => item.id), result.en.map((item) => item.id));
});

test('unsafe non-empty URLs are rejected', () => {
  assert.throws(
    () => parseExternalSitesSubmission(JSON.stringify([
      {id: 'bad', labelKo: '나쁨', labelEn: 'Bad', href: 'javascript:alert(1)', enabled: true}
    ])),
    /http/i
  );
});

test('public filtering keeps only enabled HTTP(S) entries with labels', () => {
  assert.deepEqual(
    getVisibleExternalSites([
      {id: 'on', label: 'ON', href: 'https://example.com/path', enabled: true},
      {id: 'off', label: 'OFF', href: 'https://off.example', enabled: false},
      {id: 'unsafe', label: 'BAD', href: 'javascript:alert(1)', enabled: true}
    ]),
    [{id: 'on', label: 'ON', href: 'https://example.com/path', enabled: true}]
  );
});
