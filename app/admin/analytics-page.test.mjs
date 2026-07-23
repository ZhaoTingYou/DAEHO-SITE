import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const shell = readFileSync(new URL('./_components/admin-shell.tsx', import.meta.url), 'utf8');
const page = readFileSync(new URL('./(dashboard)/analytics/page.tsx', import.meta.url), 'utf8');
const repositories = readFileSync(new URL('../../lib/cms/repositories.ts', import.meta.url), 'utf8');
const messages = readFileSync(new URL('../../lib/admin-i18n.ts', import.meta.url), 'utf8');

test('analytics report is reachable from the CMS navigation', () => {
  assert.match(shell, /href: '\/admin\/analytics'/);
});

test('analytics report uses summary and visits data without personal identifiers', () => {
  assert.match(page, /getTrafficAnalyticsSummary/);
  assert.match(page, /listTrafficAnalyticsVisits/);
  assert.match(page, /searchParams/);
  assert.match(page, /analytics\.metricVisits/);
  assert.doesNotMatch(page, /sessionId|pageViewId|ipAddress|userAgent|geolocation/);
  assert.match(repositories, /admin: true/);
  const visitType = repositories.match(/export type TrafficAnalyticsVisit = \{[\s\S]*?\n\};/)?.[0] ?? '';
  assert.doesNotMatch(visitType, /sessionId|pageViewId/);
  assert.match(repositories, /trafficAnalyticsSummarySchema\.parse/);
  assert.match(repositories, /trafficAnalyticsVisitsSchema\.parse/);
});

test('analytics report provides URL-based date, channel, and page controls', () => {
  assert.match(page, /const presetDays = \[7, 30, 90\]/);
  assert.match(page, /name="channel"/);
  assert.match(page, /page: filters\.page - 1/);
  assert.match(page, /page: filters\.page \+ 1/);
  assert.match(page, /analyticsPageCorrectionHref/);
  assert.match(page, /redirect\(/);
});

test('analytics report exposes exact daily values and accessible state', () => {
  assert.match(page, /analytics\.dailyValues/);
  assert.match(page, /scope="col"/);
  assert.match(page, /aria-current/);
  assert.match(page, /deviceLabel/);
  assert.match(page, /analytics\.errorTitle/);
  assert.match(page, /CmsBackendError/);
});

test('analytics copy describes visits and localizes every device class', () => {
  assert.match(messages, /'analytics\.metricVisits': '访问'/);
  assert.match(messages, /'analytics\.metricVisits': 'Visits'/);
  assert.match(messages, /'analytics\.metricVisits': '방문'/);
  assert.match(messages, /'analytics\.device\.desktop': '桌面设备'/);
  assert.match(messages, /'analytics\.device\.desktop': 'Desktop'/);
  assert.match(messages, /'analytics\.device\.desktop': '데스크톱'/);
  assert.match(messages, /'analytics\.errorTitle'/);
});
