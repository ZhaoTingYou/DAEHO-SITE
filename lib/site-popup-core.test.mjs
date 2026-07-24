import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createSitePopupVersion,
  getSitePopupStatus,
  isSitePopupActive,
  isSitePopupDismissed,
  normalizeSitePopupConfig,
  seoulDateTimeInputToIso,
  sitePopupIsoToDateTimeInput,
  sitePopupStorageKeys,
  validateSitePopupSubmission
} from './site-popup-core.mjs';

const activeConfig = {
  enabled: true,
  image: 'https://daeho-prod-media.s3.ap-northeast-2.amazonaws.com/holiday.png',
  startsAt: '2026-08-01T00:00:00+09:00',
  endsAt: '2026-08-16T00:00:00+09:00'
};

test('normalizes untrusted popup data without inventing enabled content', () => {
  assert.deepEqual(normalizeSitePopupConfig(null), {
    enabled: false,
    image: '',
    startsAt: '',
    endsAt: ''
  });
  assert.deepEqual(normalizeSitePopupConfig({...activeConfig, enabled: 'true'}), {
    ...activeConfig,
    enabled: false
  });
});

test('converts minute-precision Seoul input to canonical ISO and back', () => {
  assert.equal(seoulDateTimeInputToIso('2026-08-01T09:30'), '2026-08-01T09:30:00+09:00');
  assert.equal(sitePopupIsoToDateTimeInput('2026-08-01T09:30:00+09:00'), '2026-08-01T09:30');
  assert.equal(seoulDateTimeInputToIso('2026-02-30T09:30'), '');
  assert.equal(seoulDateTimeInputToIso('not-a-date'), '');
});

test('requires complete active configuration and ordered dates', () => {
  assert.deepEqual(
    validateSitePopupSubmission({
      enabled: true,
      image: '',
      startsAtInput: '2026-08-01T00:00',
      endsAtInput: '2026-08-16T00:00'
    }),
    {ok: false, error: 'imageRequired'}
  );
  assert.deepEqual(
    validateSitePopupSubmission({
      enabled: true,
      image: 'holiday.png',
      startsAtInput: '',
      endsAtInput: '2026-08-16T00:00'
    }),
    {ok: false, error: 'scheduleRequired'}
  );
  assert.deepEqual(
    validateSitePopupSubmission({
      enabled: false,
      image: 'holiday.png',
      startsAtInput: '2026-08-16T00:00',
      endsAtInput: '2026-08-01T00:00'
    }),
    {ok: false, error: 'endAfterStart'}
  );
  assert.deepEqual(
    validateSitePopupSubmission({
      enabled: true,
      image: 'holiday.png',
      startsAtInput: '2026-08-01T00:00',
      endsAtInput: '2026-08-16T00:00'
    }),
    {
      ok: true,
      config: {
        enabled: true,
        image: 'holiday.png',
        startsAt: '2026-08-01T00:00:00+09:00',
        endsAt: '2026-08-16T00:00:00+09:00'
      }
    }
  );
});

test('uses an inclusive start and exclusive end', () => {
  assert.equal(isSitePopupActive(activeConfig, Date.parse('2026-07-31T14:59:59Z')), false);
  assert.equal(isSitePopupActive(activeConfig, Date.parse('2026-07-31T15:00:00Z')), true);
  assert.equal(isSitePopupActive(activeConfig, Date.parse('2026-08-15T14:59:59Z')), true);
  assert.equal(isSitePopupActive(activeConfig, Date.parse('2026-08-15T15:00:00Z')), false);
  assert.equal(isSitePopupActive({...activeConfig, enabled: false}, Date.parse('2026-08-02T00:00:00Z')), false);
});

test('describes inactive, scheduled, active, and expired states', () => {
  assert.equal(getSitePopupStatus({...activeConfig, enabled: false}, Date.parse('2026-08-02T00:00:00Z')), 'inactive');
  assert.equal(getSitePopupStatus(activeConfig, Date.parse('2026-07-30T00:00:00Z')), 'scheduled');
  assert.equal(getSitePopupStatus(activeConfig, Date.parse('2026-08-02T00:00:00Z')), 'active');
  assert.equal(getSitePopupStatus(activeConfig, Date.parse('2026-08-16T00:00:00Z')), 'expired');
});

test('versions change for content or schedule but not enabled state', () => {
  const version = createSitePopupVersion(activeConfig);
  assert.equal(createSitePopupVersion({...activeConfig, enabled: false}), version);
  assert.notEqual(createSitePopupVersion({...activeConfig, image: 'new.png'}), version);
  assert.notEqual(createSitePopupVersion({...activeConfig, endsAt: '2026-08-17T00:00:00+09:00'}), version);
});

test('uses separate session and persistent dismissal keys', () => {
  const version = createSitePopupVersion(activeConfig);
  const keys = sitePopupStorageKeys(version);
  assert.notEqual(keys.session, keys.persistent);
  assert.match(keys.session, new RegExp(version));
  assert.match(keys.persistent, new RegExp(version));
  assert.equal(isSitePopupDismissed(version, version, ''), true);
  assert.equal(isSitePopupDismissed(version, '', version), true);
  assert.equal(isSitePopupDismissed(version, 'old-version', 'old-version'), false);
});
