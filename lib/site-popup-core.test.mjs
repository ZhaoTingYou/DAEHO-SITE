import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createSitePopupVersion,
  createSitePopupCarouselState,
  getActiveSitePopupItems,
  getSitePopupStatus,
  isSitePopupActive,
  isSitePopupDismissed,
  normalizeSitePopupConfig,
  reduceSitePopupCarouselState,
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
  assert.deepEqual(normalizeSitePopupConfig(null), {items: []});
  assert.deepEqual(normalizeSitePopupConfig({...activeConfig, enabled: 'true'}), {
    items: [{id: 'legacy-popup', ...activeConfig, enabled: false}]
  });
  assert.deepEqual(normalizeSitePopupConfig({items: [], ...activeConfig}), {
    items: [{id: 'legacy-popup', ...activeConfig}]
  });
  assert.deepEqual(normalizeSitePopupConfig({items: [activeConfig, null]}), {
    items: [{id: 'popup-1', ...activeConfig}]
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
      item: {
        id: '',
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

test('filters a collection to announcements active at the requested time', () => {
  const scheduled = {...activeConfig, id: 'later', startsAt: '2026-09-01T00:00:00+09:00'};
  const active = {...activeConfig, id: 'active'};
  assert.deepEqual(
    getActiveSitePopupItems({items: [scheduled, active]}, Date.parse('2026-08-02T00:00:00Z')),
    [active]
  );
});

test('versions change whenever the managed announcement collection changes', () => {
  const config = {items: [{id: 'first', ...activeConfig}]};
  const version = createSitePopupVersion(config);
  assert.notEqual(createSitePopupVersion({items: [{...config.items[0], enabled: false}]}), version);
  assert.notEqual(createSitePopupVersion({items: [{...config.items[0], image: 'new.png'}]}), version);
  assert.notEqual(createSitePopupVersion({items: [...config.items, {id: 'second', ...activeConfig}]}), version);
});

test('uses separate session and persistent dismissal keys', () => {
  const version = createSitePopupVersion({items: [{id: 'first', ...activeConfig}]});
  const keys = sitePopupStorageKeys(version);
  assert.notEqual(keys.session, keys.persistent);
  assert.match(keys.session, new RegExp(version));
  assert.match(keys.persistent, new RegExp(version));
  assert.equal(isSitePopupDismissed(version, version, ''), true);
  assert.equal(isSitePopupDismissed(version, '', version), true);
  assert.equal(isSitePopupDismissed(version, 'old-version', 'old-version'), false);
});

test('carousel actions rotate, directly select, pause, resume, and record failed images', () => {
  let state = createSitePopupCarouselState();
  state = reduceSitePopupCarouselState(state, {type: 'advance', length: 3});
  assert.deepEqual(state, {activeIndex: 1, autoRotate: true, failedImages: []});
  state = reduceSitePopupCarouselState(state, {type: 'select', index: 2, length: 3});
  assert.equal(state.activeIndex, 2);
  assert.equal(state.autoRotate, false);
  state = reduceSitePopupCarouselState(state, {type: 'next', length: 3});
  assert.equal(state.activeIndex, 0);
  state = reduceSitePopupCarouselState(state, {type: 'previous', length: 3});
  assert.equal(state.activeIndex, 2);
  state = reduceSitePopupCarouselState(state, {type: 'toggle-autoplay'});
  assert.equal(state.autoRotate, true);
  state = reduceSitePopupCarouselState(state, {type: 'image-failed', key: 'first\u0000missing.png'});
  state = reduceSitePopupCarouselState(state, {type: 'image-failed', key: 'first\u0000missing.png'});
  assert.deepEqual(state.failedImages, ['first\u0000missing.png']);
});
