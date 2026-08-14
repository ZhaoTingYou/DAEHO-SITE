import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const fontLinks = readFileSync(new URL('./font-links.tsx', import.meta.url), 'utf8');

test('Pretendard is loaded as a unicode-range subset', () => {
  // 통짜 파일은 굵기 하나가 760KB다. 서브셋은 화면에 쓰인 글자가 든 조각만 받는다.
  assert.match(fontLinks, /pretendard-dynamic-subset\.css/);
  assert.doesNotMatch(fontLinks, /static\/pretendard\.css/);
});

test('the Pretendard version stays pinned', () => {
  // 상위 버전이 올라오면 서체가 바뀔 수 있고 CDN이 장기 캐시를 걸지 못한다.
  assert.match(fontLinks, /pretendard@v\d+\.\d+\.\d+\//);
  assert.doesNotMatch(fontLinks, /pretendard@latest/);
});

test('font stylesheets stay in the document head with preconnect', () => {
  // globals.css의 @import로 옮기면 요청이 직렬로 쌓여 첫 텍스트 렌더링이 밀린다.
  assert.match(fontLinks, /<link rel="preconnect" href="https:\/\/cdn\.jsdelivr\.net"/);
  assert.match(fontLinks, /<link rel="stylesheet" href=\{PRETENDARD_CSS\} \/>/);
  assert.match(fontLinks, /<link rel="stylesheet" href=\{GOOGLE_FONTS_CSS\} \/>/);
});
