import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import test from 'node:test';

import ts from 'typescript';

const structuredDataSource = readFileSync(new URL('./news-article-structured-data.tsx', import.meta.url), 'utf8');
const newsDetailPageSource = readFileSync(
  new URL('../../app/[locale]/(site)/news/[slug]/page.tsx', import.meta.url),
  'utf8'
);

async function importDateHelper() {
  const output = ts.transpileModule(structuredDataSource, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.Preserve
    }
  });
  const tempDir = mkdtempSync(path.join(tmpdir(), 'daeho-news-article-'));
  const outputPath = path.join(tempDir, 'news-article-structured-data.mjs');

  // JSX 렌더링은 이 테스트 범위가 아니라 날짜 정규화 로직만 떼어 검증한다.
  const helperOnly = output.outputText.slice(output.outputText.indexOf('export function toIsoDate'));

  writeFileSync(outputPath, helperOnly, 'utf8');

  try {
    return await import(pathToFileURL(outputPath).href);
  } finally {
    rmSync(tempDir, {force: true, recursive: true});
  }
}

test('news detail page emits Article structured data for every article', () => {
  assert.match(
    newsDetailPageSource,
    /import \{NewsArticleStructuredData\} from '@\/components\/news\/news-article-structured-data';/
  );
  assert.match(newsDetailPageSource, /<NewsArticleStructuredData detail=\{detail\} locale=\{locale\} slug=\{slug\} \/>/);
});

test('Article schema declares the fields Google requires for news results', () => {
  assert.match(structuredDataSource, /'@type': 'Article'/);
  assert.match(structuredDataSource, /headline: detail\.seoTitle \|\| detail\.card\.title/);
  assert.match(structuredDataSource, /mainEntityOfPage/);
  assert.match(structuredDataSource, /\.\.\.\(datePublished \? \{datePublished\} : \{\}\)/);
  // CMS에 수정일 필드가 없어 dateModified를 발행일로 채우면 시간이 지날수록 사실과 어긋난다.
  assert.doesNotMatch(structuredDataSource, /dateModified:/);
  assert.match(structuredDataSource, /publisher: \{/);
  assert.match(structuredDataSource, /author: \{/);
  // 사이트 전역 Organization 노드를 @id로 참조해 발행처 정보가 중복 정의되지 않게 한다.
  assert.match(structuredDataSource, /absoluteUrl\('\/#organization'\)/);
});

test('publish date normalizes to ISO 8601 across the formats CMS may store', async () => {
  const {toIsoDate} = await importDateHelper();

  assert.equal(toIsoDate('2026-07-17'), '2026-07-17');
  assert.equal(toIsoDate('2026-07-17T09:30:00Z'), '2026-07-17');
  assert.equal(toIsoDate('2026.07.17'), '2026-07-17');
  assert.equal(toIsoDate('2026/7/5'), '2026-07-05');
  assert.equal(toIsoDate('2026년 7월 17일'), '2026-07-17');
});

test('publish date is omitted rather than guessed when the value is unusable', async () => {
  const {toIsoDate} = await importDateHelper();

  assert.equal(toIsoDate(''), '');
  assert.equal(toIsoDate('   '), '');
  assert.equal(toIsoDate('상시'), '');
  assert.equal(toIsoDate('2026-13-45'), '', '존재하지 않는 날짜는 내보내지 않는다.');
  assert.equal(toIsoDate('7월 17일'), '', '연도가 없으면 추측하지 않는다.');
});
