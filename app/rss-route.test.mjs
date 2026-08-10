import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const rssRouteSource = readFileSync(new URL('./rss.xml/route.ts', import.meta.url), 'utf8');

test('RSS route exposes Korean news feed for Naver submission', () => {
  assert.match(rssRouteSource, /export const dynamic = 'force-static'/);
  assert.match(rssRouteSource, /export const revalidate = 3600/);
  assert.match(rssRouteSource, /getNewsCardsForSite\('ko'\)/);
  assert.match(rssRouteSource, /<title>대호 뉴스 \| DAEHO<\/title>/);
  assert.match(rssRouteSource, /대호\(DAEHO\)의 우승반지 제작 사례/);
  assert.match(rssRouteSource, /absoluteUrl\('\/ko\/news'\)/);
  assert.match(rssRouteSource, /content-type': 'application\/rss\+xml; charset=utf-8'/);
  assert.match(rssRouteSource, /s-maxage=3600/);
});

test('RSS route escapes XML-sensitive text', () => {
  assert.match(rssRouteSource, /function xmlEscape/);
  assert.match(rssRouteSource, /replaceAll\('&', '&amp;'\)/);
  assert.match(rssRouteSource, /replaceAll\('<', '&lt;'\)/);
});
