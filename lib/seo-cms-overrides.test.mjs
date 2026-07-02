import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import test from 'node:test';

import ts from 'typescript';

async function importSeoWithStubs() {
  const sourcePath = new URL('./seo.ts', import.meta.url);
  const source = readFileSync(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  });
  const tempDir = mkdtempSync(path.join(tmpdir(), 'daeho-seo-'));
  const outputPath = path.join(tempDir, 'seo.mjs');
  const transformed = output.outputText
    .replaceAll("'@/lib/locale-messages'", "'./locale-messages.mjs'")
    .replaceAll("'@/lib/cms/repositories'", "'./repositories.mjs'")
    .replaceAll("'@/lib/image-src'", "'./image-src.mjs'")
    .replaceAll("'@/lib/next-dynamic-error'", "'./next-dynamic-error.mjs'");

  writeFileSync(outputPath, transformed, 'utf8');
  writeFileSync(
    path.join(tempDir, 'locale-messages.mjs'),
    `
export async function getLocaleMessages() {
  return {
    home: {title: 'Default home title', subtitle: 'Default home description'},
    chronicle: {hero: {title: 'Archive', subtitle: 'Archive description'}},
    legacyPages: {
      loyalty: {hero: {title: 'Loyalty', subtitle: 'Loyalty description'}},
      credibility: {hero: {title: 'Credibility', subtitle: 'Credibility description'}},
      achievement: {hero: {title: 'Achievement', subtitle: 'Achievement description'}}
    },
    specialtyPages: {
      technique: {hero: {title: 'Making', subtitle: 'Making description'}},
      collection: {
        hero: {title: 'Creations', subtitle: 'Creations description'},
        gallery: {filters: []}
      }
    },
    news: {masthead: {title: 'News'}, featured: {body: 'News description'}},
    golf: {hero: {titleLines: ['Golf'], subtitle: 'Golf description'}},
    contact: {hero: {eyebrow: 'Contact', body: 'Contact description'}},
    golfInquiry: {hero: {eyebrow: 'Golf inquiry', body: 'Golf inquiry description'}}
  };
}
`,
    'utf8'
  );
  writeFileSync(
    path.join(tempDir, 'repositories.mjs'),
    `
globalThis.__seoGetPageCalls = [];
export async function getPage(pageKey) {
  globalThis.__seoGetPageCalls.push(pageKey);
  return globalThis.__seoPages?.[pageKey] ?? null;
}
`,
    'utf8'
  );
  writeFileSync(
    path.join(tempDir, 'image-src.mjs'),
    `
export function imageSrc(value) {
  return /^https?:\\/\\//i.test(value) ? value : '/images/' + value.replace(/^\\/+/, '');
}
`,
    'utf8'
  );
  writeFileSync(
    path.join(tempDir, 'next-dynamic-error.mjs'),
    `export function isNextDynamicServerError() { return false; }\n`,
    'utf8'
  );

  try {
    return await import(pathToFileURL(outputPath).href);
  } finally {
    rmSync(tempDir, {force: true, recursive: true});
  }
}

test('page metadata prefers localized CMS SEO fields over page copy fallbacks', async () => {
  globalThis.__seoPages = {
    home: {
      seo: {
        ko: {
          title: '우승반지 제작 전문 대호',
          description: '대호는 우승반지, 임관반지, 단체 기념반지를 제작합니다.',
          ogImagePath: 'seo-home.png'
        }
      }
    }
  };

  const seo = await importSeoWithStubs();
  const metadata = await seo.getPageMetadata('ko', 'home');

  assert.equal(metadata.title, '우승반지 제작 전문 대호 | DAEHO');
  assert.equal(metadata.description, '대호는 우승반지, 임관반지, 단체 기념반지를 제작합니다.');
  assert.equal(metadata.openGraph.images[0].url, '/images/seo-home.png');
  assert.deepEqual(globalThis.__seoGetPageCalls, ['home']);
});

test('home metadata fallback carries the DAEHO Korean brand entity and core service', async () => {
  globalThis.__seoPages = {};

  const seo = await importSeoWithStubs();
  const metadata = await seo.getPageMetadata('ko', 'home');

  assert.equal(metadata.title, '주식회사 대호 | 우승반지 제작 전문 | DAEHO');
  assert.equal(
    metadata.description,
    '주식회사 대호는 1988년부터 우승반지, 임관반지, 단체 기념반지와 맞춤 주얼리를 제작해 온 한국의 상징물 제작사입니다.'
  );
  assert.equal(metadata.openGraph.siteName, '주식회사 대호');
});

test('CMS SEO helper supports collection category page keys', async () => {
  globalThis.__seoPages = {
    'mastery-creations-champion': {
      seo: {
        ko: {
          title: '우승반지 제작',
          description: '스포츠 우승반지와 챔피언십 링 제작 사례를 확인하세요.'
        }
      }
    }
  };

  const seo = await importSeoWithStubs();
  const override = await seo.getCmsPageSeoOverride('ko', 'mastery-creations-champion');

  assert.deepEqual(override, {
    title: '우승반지 제작',
    description: '스포츠 우승반지와 챔피언십 링 제작 사례를 확인하세요.',
    image: ''
  });
  assert.deepEqual(globalThis.__seoGetPageCalls, ['mastery-creations-champion']);
});
