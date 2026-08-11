import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import test from 'node:test';

import ts from 'typescript';

async function importCategorySeoHelper() {
  const sourcePath = new URL('./collection-category-seo.ts', import.meta.url);
  const source = readFileSync(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  });
  const tempDir = mkdtempSync(path.join(tmpdir(), 'daeho-category-seo-'));
  const outputPath = path.join(tempDir, 'collection-category-seo.mjs');

  writeFileSync(outputPath, output.outputText, 'utf8');

  try {
    return await import(pathToFileURL(outputPath).href);
  } finally {
    rmSync(tempDir, {force: true, recursive: true});
  }
}

test('collection category SEO fallback names the Korean brand and service keywords', async () => {
  const {getCollectionCategorySeoFallback} = await importCategorySeoHelper();

  assert.deepEqual(
    getCollectionCategorySeoFallback('ko', 'champion', {
      label: '우승반지',
      description: '승리의 순간을 영원의 형태로'
    }),
    {
      title: '대호 우승반지 제작',
      description:
        '대호는 1988년부터 프로스포츠 구단, 학교, 단체를 위한 커스텀 우승반지와 챔피언십 링을 디자인하고 납품해왔습니다.'
    }
  );

  assert.deepEqual(
    getCollectionCategorySeoFallback('ko', 'appointment', {
      label: '임관반지',
      description: '소속과 임명의 의미를 담은 반지'
    }),
    {
      title: '대호 임관반지 제작',
      description:
        '대호는 임관, 진급, 단체 기념의 의미를 담은 임관반지를 맞춤 디자인과 안정적인 단체 납품 기준으로 제작합니다.'
    }
  );
});

test('champion category page exposes one visible h1 and an SEO intro paragraph', () => {
  const source = readFileSync(new URL('../components/specialty/specialty-collection-gallery.tsx', import.meta.url), 'utf8');
  const finderViewSource = source.slice(
    source.indexOf('function CollectionFinderView'),
    source.indexOf('function CollectionProductGrid')
  );

  assert.match(finderViewSource, /<h1[^>]*>/);
  assert.doesNotMatch(finderViewSource, /<h2[^>]*>[\s\S]*\{activeLabel\}/);
  assert.match(finderViewSource, /\{labels\.body\}/);
});

test('champion finder view keeps heading levels contiguous from h1 to h3', () => {
  // 크롤 결과 /ko/mastery/creations/champion만 h1 다음에 카드 h3가 바로 와서
  // 헤딩 레벨이 건너뛰었다. 화면에 보이지 않는 h2로 순서를 복구한 상태를 고정한다.
  const source = readFileSync(new URL('../components/specialty/specialty-collection-gallery.tsx', import.meta.url), 'utf8');
  const finderViewSource = source.slice(
    source.indexOf('function CollectionFinderView'),
    source.indexOf('function CollectionProductGrid')
  );

  assert.match(finderViewSource, /<h2 id="collection-finder-results" className="sr-only">/);
  assert.match(finderViewSource, /<section aria-labelledby="collection-finder-results">/);
  assert.ok(
    finderViewSource.indexOf('<h2 id="collection-finder-results"') <
      finderViewSource.indexOf('<CollectionProductGrid'),
    'sr-only h2는 카드 그리드보다 앞에 와야 헤딩 순서가 유지된다.'
  );
});

test('default Korean champion intro includes the exact DAEHO championship ring phrase', () => {
  const koMessages = JSON.parse(readFileSync(new URL('../messages/ko.json', import.meta.url), 'utf8'));

  assert.match(koMessages.collectionUi.finder.body, /대호 우승반지/);
});

test('creations index source keeps a single semantic h1 for crawler structure', () => {
  const source = readFileSync(new URL('../app/[locale]/(site)/mastery/creations/page.tsx', import.meta.url), 'utf8');

  assert.equal((source.match(/<h1\b/g) ?? []).length, 1);
  assert.match(source, /<h1 className="sr-only">/);
});
