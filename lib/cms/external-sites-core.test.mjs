import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import {
  getVisibleExternalSites,
  parseExternalSitesSubmission
} from './external-sites-core.mjs';

test('publishes a .mjs declaration contract for TypeScript consumers', () => {
  const declarations = readFileSync(new URL('./external-sites-core.d.mts', import.meta.url), 'utf8');

  assert.match(declarations, /export type ExternalSiteItem/);
  assert.match(declarations, /export function parseExternalSitesSubmission/);
  assert.match(declarations, /export function getVisibleExternalSites/);
  assert.match(declarations, /export function isValidExternalSiteHref/);
});

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

test('public filtering returns no visible sites for an empty CMS list', () => {
  assert.deepEqual(getVisibleExternalSites([]), []);
});

test('public filtering preserves the CMS order when multiple sites are reordered', () => {
  const reordered = [
    {id: 'vulcan', label: 'VULCAN', href: 'https://vulcan.example', enabled: true},
    {id: 'daeho', label: 'DAEHO', href: 'https://daeho.example', enabled: true},
    {id: 'oh', label: 'OH', href: 'https://oh.example', enabled: true}
  ];

  assert.deepEqual(
    getVisibleExternalSites(reordered).map((item) => item.id),
    ['vulcan', 'daeho', 'oh']
  );
});
