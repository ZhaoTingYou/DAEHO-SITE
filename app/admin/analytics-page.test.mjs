import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const shell = readFileSync(new URL('./_components/admin-shell.tsx', import.meta.url), 'utf8');
const page = readFileSync(new URL('./(dashboard)/analytics/page.tsx', import.meta.url), 'utf8');

test('analytics report is reachable from the CMS navigation', () => {
  assert.match(shell, /href: '\/admin\/analytics'/);
});

test('analytics report uses summary and visits data without personal identifiers', () => {
  assert.match(page, /getTrafficAnalyticsSummary/);
  assert.match(page, /listTrafficAnalyticsVisits/);
  assert.match(page, /searchParams/);
  assert.match(page, /analytics\.metricVisits/);
  assert.doesNotMatch(page, /ipAddress|userAgent|geolocation/);
});

test('analytics report provides URL-based date, channel, and page controls', () => {
  assert.match(page, /const presetDays = \[7, 30, 90\]/);
  assert.match(page, /name="channel"/);
  assert.match(page, /page: filters\.page - 1/);
  assert.match(page, /page: filters\.page \+ 1/);
});
