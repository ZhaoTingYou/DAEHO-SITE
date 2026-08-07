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
    .replaceAll("'@/lib/english-visibility'", "'./english-visibility.mjs'")
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
    path.join(tempDir, 'english-visibility.mjs'),
    `
export async function isEnglishEnabledForSite() {
  return globalThis.__seoEnglishEnabled === true;
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
  globalThis.__seoEnglishEnabled = false;
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
  assert.equal(metadata.description, '대호(DAEHO)는 우승반지, 임관반지, 단체 기념반지를 제작합니다.');
  assert.equal(metadata.openGraph.images[0].url, '/images/seo-home.png');
  assert.deepEqual(metadata.alternates.languages, {
    ko: '/ko',
    'x-default': '/ko'
  });
  assert.deepEqual(globalThis.__seoGetPageCalls, ['home']);
});

test('page metadata restores English alternate URLs when the CMS switch is enabled', async () => {
  globalThis.__seoEnglishEnabled = true;
  globalThis.__seoPages = {};

  const seo = await importSeoWithStubs();
  const metadata = await seo.getPageMetadata('ko', 'home');

  assert.deepEqual(metadata.alternates.languages, {
    ko: '/ko',
    en: '/en',
    'x-default': '/ko'
  });
});

test('Korean metadata normalizes brand words in title and description even when CMS copy omits them', async () => {
  globalThis.__seoPages = {
    'mastery-making': {
      seo: {
        ko: {
          title: '우승반지 제작 공정과 세공 기술',
          description: '디자인, 3D 모델링, 주조, 세팅, 폴리싱, 검수까지 맞춤 반지 제작 과정을 소개합니다.'
        }
      }
    }
  };

  const seo = await importSeoWithStubs();
  const metadata = await seo.getPageMetadata('ko', 'technique');

  assert.equal(metadata.title, '대호 | 우승반지 제작 공정과 세공 기술 | DAEHO');
  assert.match(metadata.description, /대호/);
  assert.match(metadata.description, /DAEHO/);
  assert.equal(metadata.keywords, undefined);
});

test('home metadata fallback carries the DAEHO Korean brand name and core service', async () => {
  globalThis.__seoPages = {};

  const seo = await importSeoWithStubs();
  const metadata = await seo.getPageMetadata('ko', 'home');

  assert.equal(metadata.title, '대호 우승반지·챔피언십 반지·맞춤 트로피 제작 | DAEHO');
  assert.equal(
    metadata.description,
    '대호(DAEHO)는 1988년부터 우승반지, 챔피언십 반지, 맞춤 트로피, 스포츠 행사 기념품을 구단과 학교, 단체에 맞춤 제작합니다.'
  );
  assert.equal(metadata.openGraph.description, metadata.description);
  assert.ok(metadata.description.length <= 80);
  assert.equal(metadata.openGraph.siteName, '대호');
  assert.equal(metadata.keywords, undefined);
});

test('default Korean metadata uses search-focused copy for priority service pages', async () => {
  globalThis.__seoPages = {};

  const seo = await importSeoWithStubs();
  const collectionMetadata = await seo.getPageMetadata('ko', 'collection');
  const techniqueMetadata = await seo.getPageMetadata('ko', 'technique');
  const achievementMetadata = await seo.getPageMetadata('ko', 'achievement');

  assert.equal(collectionMetadata.title, '대호 우승반지·트로피·기념품 제작 사례 | DAEHO');
  assert.match(collectionMetadata.description, /대호/);
  assert.match(collectionMetadata.description, /우승반지/);
  assert.match(collectionMetadata.description, /맞춤 트로피/);
  assert.match(collectionMetadata.description, /행사 기념품/);
  // daehogold.com과의 카니발라이제이션 방지: daeho.works 메타데이터는 임관반지 신호를 노출하지 않는다.
  assert.doesNotMatch(collectionMetadata.description, /임관반지/);
  assert.equal(collectionMetadata.alternates.canonical, '/ko/mastery/creations');

  assert.equal(techniqueMetadata.title, '대호 | 우승반지·맞춤 트로피 제작 공정 | DAEHO');
  assert.match(techniqueMetadata.description, /대호/);
  assert.match(techniqueMetadata.description, /1988년/);
  assert.match(techniqueMetadata.description, /우승반지 제작/);

  assert.equal(achievementMetadata.title, '대호 우승반지·챔피언십 반지 제작 실적 | DAEHO');
  assert.match(achievementMetadata.description, /챔피언십 반지/);
  assert.match(achievementMetadata.description, /프로스포츠/);
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
