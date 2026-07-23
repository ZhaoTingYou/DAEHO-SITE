import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import {
  getVisibleExternalSites,
  parseExternalSitesSubmission
} from './external-sites-core.mjs';
import * as externalSitesCore from './external-sites-core.mjs';

const errorCodes = {
  invalidJson: 'EXTERNAL_SITES_INVALID_JSON',
  invalidShape: 'EXTERNAL_SITES_INVALID_SHAPE',
  missingId: 'EXTERNAL_SITES_MISSING_ID',
  duplicateId: 'EXTERNAL_SITES_DUPLICATE_ID',
  invalidUrl: 'EXTERNAL_SITES_INVALID_URL'
};

function assertExternalSiteError(run, expectedCode) {
  assert.throws(run, (error) => {
    assert.equal(error?.name, 'ExternalSiteValidationError');
    assert.equal(error?.code, expectedCode);
    assert.doesNotMatch(error?.message ?? '', /javascript:|alert\(1\)/);
    return true;
  });
}

test('publishes a .mjs declaration contract for TypeScript consumers', () => {
  const declarations = readFileSync(new URL('./external-sites-core.d.mts', import.meta.url), 'utf8');

  assert.match(declarations, /export type ExternalSiteItem/);
  assert.match(declarations, /export function parseExternalSitesSubmission/);
  assert.match(declarations, /export function getVisibleExternalSites/);
  assert.match(declarations, /export function isValidExternalSiteHref/);
  assert.match(declarations, /export class ExternalSiteValidationError/);
  assert.match(declarations, /export const externalSiteValidationErrorCodes/);
  assert.match(declarations, /export function getExternalSiteValidationMessageKey/);
  assert.match(declarations, /export function mergeExternalSitesWithDefaults/);
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

test('a blank locale label falls back to the other locale', () => {
  const result = parseExternalSitesSubmission(JSON.stringify([
    {id: 'ko-blank', labelKo: '', labelEn: 'English fallback', href: '', enabled: false},
    {id: 'en-blank', labelKo: '한국어 대체', labelEn: '', href: '', enabled: false}
  ]));

  assert.equal(result.ko[0].label, 'English fallback');
  assert.equal(result.en[0].label, 'English fallback');
  assert.equal(result.ko[1].label, '한국어 대체');
  assert.equal(result.en[1].label, '한국어 대체');
});

test('malformed JSON has a stable validation code', () => {
  assertExternalSiteError(
    () => parseExternalSitesSubmission('[not-json'),
    errorCodes.invalidJson
  );
});

test('a non-array payload has a stable validation code', () => {
  assertExternalSiteError(
    () => parseExternalSitesSubmission('{"id":"not-an-array"}'),
    errorCodes.invalidShape
  );
});

test('a missing item ID has a stable validation code', () => {
  assertExternalSiteError(
    () => parseExternalSitesSubmission(JSON.stringify([
      {labelKo: '이름 없음', labelEn: 'Missing ID', href: '', enabled: false}
    ])),
    errorCodes.missingId
  );
});

test('a duplicate item ID has a stable validation code', () => {
  assertExternalSiteError(
    () => parseExternalSitesSubmission(JSON.stringify([
      {id: 'same', labelKo: '첫째', labelEn: 'First', href: '', enabled: false},
      {id: 'same', labelKo: '둘째', labelEn: 'Second', href: '', enabled: false}
    ])),
    errorCodes.duplicateId
  );
});

test('a non-HTTP(S) URL has a stable validation code without exposing the input', () => {
  assertExternalSiteError(
    () => parseExternalSitesSubmission(JSON.stringify([
      {id: 'bad', labelKo: '나쁨', labelEn: 'Bad', href: 'javascript:alert(1)', enabled: true}
    ])),
    errorCodes.invalidUrl
  );
});

test('validation codes map to stable admin translation keys', () => {
  const getMessageKey = externalSitesCore.getExternalSiteValidationMessageKey;
  assert.equal(typeof getMessageKey, 'function');

  for (const [name, code] of Object.entries(errorCodes)) {
    assert.equal(
      getMessageKey({name: 'ExternalSiteValidationError', code}),
      `externalSites.error.${name}`
    );
  }
  assert.equal(getMessageKey(new Error('unexpected')), null);
});

test('legacy external-sites content without items keeps localized disabled defaults', () => {
  const mergeDefaults = externalSitesCore.mergeExternalSitesWithDefaults;
  assert.equal(typeof mergeDefaults, 'function');

  const koDefaults = JSON.parse(
    readFileSync(new URL('../../messages/ko.json', import.meta.url), 'utf8')
  ).common.footer.externalSites;
  const enDefaults = JSON.parse(
    readFileSync(new URL('../../messages/en.json', import.meta.url), 'utf8')
  ).common.footer.externalSites;
  const legacyCmsContent = {daeho: 'Legacy DAEHO', oh: 'Legacy OH', vulcan: 'Legacy VULCAN'};

  const ko = mergeDefaults(koDefaults, legacyCmsContent);
  const en = mergeDefaults(enDefaults, legacyCmsContent);

  assert.equal(ko.daeho, 'Legacy DAEHO');
  assert.equal(en.vulcan, 'Legacy VULCAN');
  assert.deepEqual(ko.items.map(({id, label, href, enabled}) => ({id, label, href, enabled})), [
    {id: 'daeho', label: '대호', href: '', enabled: false},
    {id: 'oh', label: 'OH', href: '', enabled: false},
    {id: 'vulcan', label: 'VULCAN', href: '', enabled: false}
  ]);
  assert.deepEqual(en.items.map(({id, label, href, enabled}) => ({id, label, href, enabled})), [
    {id: 'daeho', label: 'DAEHO', href: '', enabled: false},
    {id: 'oh', label: 'OH', href: '', enabled: false},
    {id: 'vulcan', label: 'VULCAN', href: '', enabled: false}
  ]);
  assert.deepEqual(mergeDefaults(koDefaults, {...legacyCmsContent, items: []}).items, []);
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
