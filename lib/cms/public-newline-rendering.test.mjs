import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function sourceAt(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('public CMS textarea copy preserves manual line breaks across shared renderers', () => {
  const expectations = [
    ['components/section-intro.tsx', 'whitespace-pre-line font-body text-[15px] leading-[1.85] text-text'],
    ['components/legacy/heritage-hero.tsx', 'whitespace-pre-line text-[15px] leading-[1.8]'],
    ['components/specialty/specialty-process.tsx', 'whitespace-pre-line font-body text-[15px] leading-[1.9]'],
    ['components/specialty/specialty-detail-triplet.tsx', 'whitespace-pre-line font-body text-[15px] leading-6 text-text'],
    ['components/site/legal-document.tsx', 'whitespace-pre-line font-body text-[14px] leading-[1.9]'],
    ['components/empty-state.tsx', 'whitespace-pre-line font-body text-base leading-7 text-subtext'],
    ['components/site/site-footer.tsx', 'whitespace-pre-line font-body text-[14px] leading-6 text-subtext'],
    ['app/[locale]/(site)/news/page.tsx', 'whitespace-pre-line text-[15px] leading-[1.86] text-text'],
    ['app/[locale]/(site)/news/[slug]/page.tsx', 'whitespace-pre-line font-body text-[15px] leading-8 text-text'],
    ['app/[locale]/(site)/mastery/creations/[slug]/page.tsx', 'whitespace-pre-line font-body text-[14px] leading-7 text-text'],
    ['app/[locale]/(site)/golf/inquiry/page.tsx', 'whitespace-pre-line font-body text-body leading-[1.75] text-text'],
    ['components/golf/golf-configurator.tsx', 'whitespace-pre-line font-body text-[18px] leading-[1.3]'],
    ['components/chronicle/chronicle-timeline.tsx', 'whitespace-pre-line font-body text-[14px] leading-7 text-text'],
    ['components/specialty/specialty-collection-gallery.tsx', 'whitespace-pre-line font-body text-[12px] leading-6 text-subtext']
  ];

  for (const [relativePath, expectedClass] of expectations) {
    assert.ok(
      sourceAt(relativePath).includes(expectedClass),
      `${relativePath} should render CMS textarea copy with whitespace-pre-line`
    );
  }
});
