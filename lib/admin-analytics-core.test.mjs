import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_ANALYTICS_PAGE,
  addDays,
  analyticsHref,
  analyticsPageCorrectionHref,
  cappedAnalyticsTotalPages,
  formatDate,
  formatDateTime,
  formatDecimal,
  formatNumber,
  formatPercent,
  isAnalyticsPresetActive,
  normalizeAnalyticsFilters,
  nowInSeoul
} from './admin-analytics-core.mjs';

test('derives report defaults from the current Seoul date', () => {
  assert.equal(nowInSeoul(new Date('2026-07-23T14:59:59.000Z')), '2026-07-23');
  assert.equal(nowInSeoul(new Date('2026-07-23T15:00:00.000Z')), '2026-07-24');
  assert.deepEqual(normalizeAnalyticsFilters(undefined, '2026-07-24'), {
    from: '2026-06-25',
    to: '2026-07-24',
    channel: undefined,
    page: 1,
    pageSize: 25
  });
});

test('normalizes invalid, reversed, and excessive filter values', () => {
  assert.deepEqual(
    normalizeAnalyticsFilters(
      {from: '2026-02-30', to: 'not-a-date', channel: 'unknown', page: '0'},
      '2026-07-24'
    ),
    {
      from: '2026-06-25',
      to: '2026-07-24',
      channel: undefined,
      page: 1,
      pageSize: 25
    }
  );
  assert.deepEqual(
    normalizeAnalyticsFilters(
      {from: '2026-07-24', to: '2026-07-01', channel: ' GOOGLE ', page: String(MAX_ANALYTICS_PAGE + 1)},
      '2026-07-24'
    ),
    {
      from: '2026-06-25',
      to: '2026-07-24',
      channel: 'google',
      page: 1,
      pageSize: 25
    }
  );
});

test('presets always end today and are active only for the exact today-ended span', () => {
  const custom = {
    from: '2026-05-03',
    to: '2026-05-09',
    channel: 'naver',
    page: 4,
    pageSize: 25
  };
  const today = '2026-07-24';
  const presetFrom = addDays(today, -6);

  assert.equal(
    analyticsHref(custom, {from: presetFrom, to: today, page: 1}),
    '/admin/analytics?from=2026-07-18&to=2026-07-24&channel=naver'
  );
  assert.equal(isAnalyticsPresetActive({...custom, from: presetFrom, to: today}, today, 7), true);
  assert.equal(isAnalyticsPresetActive({...custom, from: '2026-05-03', to: '2026-05-09'}, today, 7), false);
  assert.equal(isAnalyticsPresetActive({...custom, from: presetFrom, to: '2026-07-23'}, today, 7), false);
});

test('analytics links and page corrections preserve active filters', () => {
  const filters = {
    from: '2026-07-01',
    to: '2026-07-24',
    channel: 'instagram',
    page: 8,
    pageSize: 25
  };

  assert.equal(
    analyticsHref(filters, {page: 7}),
    '/admin/analytics?from=2026-07-01&to=2026-07-24&channel=instagram&page=7'
  );
  assert.equal(
    analyticsPageCorrectionHref(filters, 3),
    '/admin/analytics?from=2026-07-01&to=2026-07-24&channel=instagram&page=3'
  );
  assert.equal(analyticsPageCorrectionHref({...filters, page: 3}, 3), null);
  assert.equal(
    analyticsPageCorrectionHref({...filters, page: 5}, 0),
    '/admin/analytics?from=2026-07-01&to=2026-07-24&channel=instagram'
  );
});

test('caps backend total pages for correction and pagination controls', () => {
  const filters = {
    from: '2026-07-01',
    to: '2026-07-24',
    channel: 'instagram',
    page: MAX_ANALYTICS_PAGE,
    pageSize: 25
  };

  assert.equal(cappedAnalyticsTotalPages(MAX_ANALYTICS_PAGE + 500_000), MAX_ANALYTICS_PAGE);
  assert.equal(analyticsPageCorrectionHref(filters, MAX_ANALYTICS_PAGE + 500_000), null);
  assert.equal(
    analyticsPageCorrectionHref({...filters, page: MAX_ANALYTICS_PAGE + 1}, MAX_ANALYTICS_PAGE + 500_000),
    `/admin/analytics?from=2026-07-01&to=2026-07-24&channel=instagram&page=${MAX_ANALYTICS_PAGE}`
  );
});

test('formats report values with stable locale and Seoul semantics', () => {
  assert.equal(formatNumber(12345, 'en'), '12,345');
  assert.equal(formatDecimal(1.256, 'en'), '1.26');
  assert.equal(formatPercent(0.1234, 'en'), '12.3%');
  assert.equal(formatDate('2026-07-23', 'en'), 'Jul 23, 2026');
  assert.equal(formatDateTime('2026-07-23T15:00:00Z', 'en'), 'Jul 24, 2026, 12:00 AM');
});
