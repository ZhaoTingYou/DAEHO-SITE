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
    .replaceAll("'@/lib/cms/static-snapshot'", "'./static-snapshot.mjs'")
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
export async function getPublicPage(pageKey, locale) {
  globalThis.__seoGetPageCalls.push([pageKey, locale]);
  const page = globalThis.__seoPages?.[pageKey];
  if (!page) return null;
  return {...page, seo: page.seo?.[locale] ?? page.seo ?? {}};
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
    path.join(tempDir, 'static-snapshot.mjs'),
    `export function isStaticCmsPreviewEnabled() { return true; }\n`,
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
  assert.deepEqual(globalThis.__seoGetPageCalls, [['home', 'ko']]);
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

  assert.equal(metadata.title, '대호 우승반지 제작·커스텀 트로피 전문 | DAEHO');
  assert.equal(
    metadata.description,
    '대호(DAEHO)는 1988년부터 우승반지를 제작해 왔으며, 현재 커스텀 트로피, 기업 행사 기념품, 스포츠 시상식 용품, 커스텀 디자인도 제작합니다.'
  );
  assert.equal(metadata.openGraph.description, metadata.description);
  assert.ok(metadata.description.length <= 160);
  assert.equal(metadata.openGraph.siteName, '대호');
  assert.equal(metadata.keywords, undefined);
});

test('default Korean metadata uses search-focused copy for priority service pages', async () => {
  globalThis.__seoPages = {};

  const seo = await importSeoWithStubs();
  const collectionMetadata = await seo.getPageMetadata('ko', 'collection');
  const techniqueMetadata = await seo.getPageMetadata('ko', 'technique');
  const achievementMetadata = await seo.getPageMetadata('ko', 'achievement');

  assert.equal(collectionMetadata.title, '대호 우승반지·커스텀 트로피·주문제작 컬렉션 | DAEHO');
  assert.match(collectionMetadata.description, /대호/);
  assert.match(collectionMetadata.description, /우승반지/);
  assert.match(collectionMetadata.description, /커스텀 트로피/);
  assert.match(collectionMetadata.description, /주문제작/);
  assert.equal(collectionMetadata.alternates.canonical, '/ko/mastery/creations');

  assert.equal(techniqueMetadata.title, '대호 | 우승반지 제작 공정과 커스텀 세공 | DAEHO');
  assert.match(techniqueMetadata.description, /대호/);
  assert.match(techniqueMetadata.description, /1988년/);
  assert.match(techniqueMetadata.description, /우승반지 제작/);

  assert.equal(achievementMetadata.title, '대호 우승반지 제작 실적과 기록 | DAEHO');
  assert.match(achievementMetadata.description, /챔피언십 링/);
  assert.match(achievementMetadata.description, /프로스포츠/);
});

test('every target keyword appears in at least one Korean page metadata fallback', async () => {
  globalThis.__seoPages = {};

  const seo = await importSeoWithStubs();
  const pageKeys = [
    'home',
    'chronicle',
    'loyalty',
    'credibility',
    'achievement',
    'technique',
    'techniqueRecords',
    'collection',
    'news',
    'golf',
    'contact',
    'golfInquiry'
  ];
  const allCopy = (
    await Promise.all(
      pageKeys.map(async (pageKey) => {
        const metadata = await seo.getPageMetadata('ko', pageKey);
        return `${metadata.title} ${metadata.description}`;
      })
    )
  ).join(' ');

  for (const keyword of ['우승반지 제작', '커스텀 트로피', '기업 행사 기념품', '스포츠 시상식 용품', '커스텀 디자인']) {
    assert.ok(allCopy.includes(keyword), `타깃 키워드 '${keyword}'를 다루는 페이지 메타데이터가 없습니다.`);
  }
});

test('Korean page metadata keeps every description within the SERP snippet budget', async () => {
  globalThis.__seoPages = {};

  const seo = await importSeoWithStubs();
  const pageKeys = ['home', 'chronicle', 'loyalty', 'credibility', 'achievement', 'technique', 'collection', 'contact'];

  for (const pageKey of pageKeys) {
    const metadata = await seo.getPageMetadata('ko', pageKey);
    assert.ok(
      metadata.description.length <= 160,
      `${pageKey} 설명이 ${metadata.description.length}자로 상한을 넘습니다.`
    );
  }
});

test('metadata description clamp includes ellipsis in the 160 character limit and prefers sentence endings', async () => {
  globalThis.__seoEnglishEnabled = false;
  globalThis.__seoPages = {};

  const seo = await importSeoWithStubs();
  const withoutSpaces = await seo.getDetailMetadata('ko', '/contact', '문의', '가'.repeat(220));
  const withSentence = await seo.getDetailMetadata(
    'ko',
    '/contact',
    '문의',
    `${'가'.repeat(110)}? ${'나'.repeat(100)}`
  );

  assert.equal(withoutSpaces.description.length, 160);
  assert.ok(withoutSpaces.description.endsWith('…'));
  assert.ok(withSentence.description.endsWith('?'));
  assert.ok(withSentence.description.length <= 160);
});

test('collection category metadata fallbacks are centralized with page metadata', async () => {
  const seo = await importSeoWithStubs();

  assert.deepEqual(
    seo.getCollectionCategorySeoFallback('ko', 'champion', {
      label: '우승반지',
      description: '승리의 순간을 영원의 형태로'
    }),
    {
      title: '대호 우승반지 제작',
      description:
        '대호는 1988년부터 프로스포츠 구단, 학교, 단체를 위한 커스텀 우승반지와 챔피언십 링을 디자인하고 납품해왔습니다.'
    }
  );
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
  assert.deepEqual(globalThis.__seoGetPageCalls, [['mastery-creations-champion', 'ko']]);
});
